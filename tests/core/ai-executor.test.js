const AIExecutor = require('../../lib/core/ai-executor');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const Helpers = require('../../lib/utils/helpers');

// Mock dependencies
jest.mock('child_process');
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn().mockReturnValue({ catch: jest.fn() }),
    readdir: jest.fn()
  }
}));
jest.mock('../../lib/utils/helpers');

describe('AIExecutor', () => {
  let executor;
  let mockExecCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup fs.unlink to return a promise with catch method
    fs.unlink.mockReturnValue({ catch: jest.fn() });
    
    // Mock exec to work with promisify
    mockExecCallback = jest.fn();
    exec.mockImplementation((command, options, callback) => {
      // Support promisified version
      if (!callback && typeof options === 'function') {
        callback = options;
        options = {};
      }
      
      // Call the callback based on the command
      if (command.includes('--version')) {
        if (command.includes('gemini') || command.includes('claude')) {
          callback(null, { stdout: 'v1.0.0', stderr: '' });
        } else {
          callback(new Error('Command not found'));
        }
      } else {
        // Default successful execution
        callback(null, { 
          stdout: JSON.stringify({ result: 'success' }), 
          stderr: '' 
        });
      }
      
      return mockExecCallback;
    });

    // Mock Helpers
    Helpers.delay = jest.fn().mockResolvedValue();
    Helpers.truncateText = jest.fn(text => text ? text.substring(0, 100) : '');
    
    executor = new AIExecutor();
  });

  describe('constructor', () => {
    test('should initialize with default values', () => {
      expect(executor.aiType).toBe('gemini');
      expect(executor.maxRetries).toBe(3);
      expect(executor.timeout).toBe(300000);
      expect(executor.tempDir).toContain('.smart-ast-temp');
    });

    test('should initialize with custom options', () => {
      const customExecutor = new AIExecutor('claude', {
        maxRetries: 5,
        timeout: 600000
      });
      
      expect(customExecutor.aiType).toBe('claude');
      expect(customExecutor.maxRetries).toBe(5);
      expect(customExecutor.timeout).toBe(600000);
    });

    test('should convert aiType to lowercase', () => {
      const upperExecutor = new AIExecutor('CLAUDE');
      expect(upperExecutor.aiType).toBe('claude');
    });
  });

  describe('execute', () => {
    test('should execute gemini method for gemini type', async () => {
      executor.executeGemini = jest.fn().mockResolvedValue({ success: true });
      
      const result = await executor.execute('test prompt');
      
      expect(executor.executeGemini).toHaveBeenCalledWith('test prompt', {});
      expect(result).toEqual({ success: true });
    });

    test('should execute claude method for claude type', async () => {
      executor = new AIExecutor('claude');
      executor.executeClaude = jest.fn().mockResolvedValue({ success: true });
      
      const result = await executor.execute('test prompt');
      
      expect(executor.executeClaude).toHaveBeenCalledWith('test prompt', {});
      expect(result).toEqual({ success: true });
    });

    test('should retry on failure', async () => {
      const error = new Error('Temporary failure');
      executor.executeGemini = jest.fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ success: true });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await executor.execute('test prompt');
      
      expect(executor.executeGemini).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(Helpers.delay).toHaveBeenCalledWith(1000);
      expect(Helpers.delay).toHaveBeenCalledWith(2000);
      expect(result).toEqual({ success: true });
      
      consoleSpy.mockRestore();
    });

    test('should return mock analysis after max retries', async () => {
      const error = new Error('Persistent failure');
      executor.executeGemini = jest.fn().mockRejectedValue(error);
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await executor.execute('test prompt');
      
      expect(result).toBeDefined();
      expect(result.endpoints).toBeDefined();
      expect(executor.executeGemini).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledTimes(3);
      
      consoleSpy.mockRestore();
    });
  });

  describe('executeGemini', () => {
    test('should check for Gemini CLI availability', async () => {
      await executor.executeGemini('test prompt', {});
      
      expect(exec).toHaveBeenCalledWith(
        'gemini --version',
        { timeout: 5000 },
        expect.any(Function)
      );
    });

    test('should throw error when Gemini CLI not found', async () => {
      exec.mockImplementation((command, options, callback) => {
        if (!callback && typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes('--version')) {
          callback(new Error('Command not found'));
        }
      });

      await expect(executor.executeGemini('test prompt', {}))
        .rejects.toThrow('Gemini CLI not found. Please install it first or use --ai mock for testing.');
    });

    test('should create prompt file and execute command', async () => {
      const mockPromptFile = path.join(executor.tempDir, 'test-prompt.txt');
      executor.createPromptFile = jest.fn().mockResolvedValue(mockPromptFile);
      executor.parseResponse = jest.fn().mockReturnValue({ parsed: true });

      const result = await executor.executeGemini('test prompt', {});
      
      expect(executor.createPromptFile).toHaveBeenCalledWith('test prompt', {});
      expect(exec).toHaveBeenCalledWith(
        `gemini -y -f "${mockPromptFile}"`,
        {
          timeout: executor.timeout,
          maxBuffer: 10485760,
          cwd: process.cwd()
        },
        expect.any(Function)
      );
      expect(executor.parseResponse).toHaveBeenCalled();
      expect(result).toEqual({ parsed: true });
    });

    test('should handle stderr warnings', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      exec.mockImplementation((command, options, callback) => {
        if (!callback && typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes('--version')) {
          callback(null, { stdout: 'v1.0.0', stderr: '' });
        } else {
          callback(null, { 
            stdout: JSON.stringify({ result: 'success' }), 
            stderr: 'Warning: some warning' 
          });
        }
      });

      executor.createPromptFile = jest.fn().mockResolvedValue('test.txt');
      executor.parseResponse = jest.fn().mockReturnValue({ success: true });

      await executor.executeGemini('test prompt', {});
      
      expect(consoleSpy).toHaveBeenCalledWith('Gemini warning:', 'Warning: some warning');
      
      consoleSpy.mockRestore();
    });

    test('should clean up prompt file after execution', async () => {
      const mockPromptFile = 'test-prompt.txt';
      executor.createPromptFile = jest.fn().mockResolvedValue(mockPromptFile);
      executor.parseResponse = jest.fn().mockReturnValue({ parsed: true });

      await executor.executeGemini('test prompt', {});
      
      expect(fs.unlink).toHaveBeenCalledWith(mockPromptFile);
    });

    test('should clean up prompt file even on error', async () => {
      const mockPromptFile = 'test-prompt.txt';
      executor.createPromptFile = jest.fn().mockResolvedValue(mockPromptFile);
      
      exec.mockImplementation((command, options, callback) => {
        if (!callback && typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes('--version')) {
          callback(null, { stdout: 'v1.0.0', stderr: '' });
        } else {
          callback(new Error('Execution failed'));
        }
      });

      await expect(executor.executeGemini('test prompt', {}))
        .rejects.toThrow('Execution failed');
      
      expect(fs.unlink).toHaveBeenCalledWith(mockPromptFile);
    });
  });

  describe('executeClaude', () => {
    test('should check for Claude CLI availability', async () => {
      await executor.executeClaude('test prompt', {});
      
      expect(exec).toHaveBeenCalledWith(
        'claude --version',
        { timeout: 5000 },
        expect.any(Function)
      );
    });

    test('should throw error when Claude CLI not found', async () => {
      exec.mockImplementation((command, options, callback) => {
        if (!callback && typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes('--version')) {
          callback(new Error('Command not found'));
        }
      });

      await expect(executor.executeClaude('test prompt', {}))
        .rejects.toThrow('Claude CLI not found. Please install it first or use --ai mock for testing.');
    });

    test('should create prompt file and execute command', async () => {
      const mockPromptFile = path.join(executor.tempDir, 'test-prompt.txt');
      executor.createPromptFile = jest.fn().mockResolvedValue(mockPromptFile);
      executor.parseResponse = jest.fn().mockReturnValue({ parsed: true });

      const result = await executor.executeClaude('test prompt', {});
      
      expect(executor.createPromptFile).toHaveBeenCalledWith('test prompt', {});
      expect(exec).toHaveBeenCalledWith(
        `claude "${mockPromptFile}"`,
        {
          timeout: executor.timeout,
          maxBuffer: 10485760,
          cwd: process.cwd()
        },
        expect.any(Function)
      );
      expect(executor.parseResponse).toHaveBeenCalled();
      expect(result).toEqual({ parsed: true });
    });

    test('should handle stderr warnings', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      exec.mockImplementation((command, options, callback) => {
        if (!callback && typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes('--version')) {
          callback(null, { stdout: 'v1.0.0', stderr: '' });
        } else {
          callback(null, { 
            stdout: JSON.stringify({ result: 'success' }), 
            stderr: 'Warning: some claude warning' 
          });
        }
      });

      executor.createPromptFile = jest.fn().mockResolvedValue('test.txt');
      executor.parseResponse = jest.fn().mockReturnValue({ success: true });

      await executor.executeClaude('test prompt', {});
      
      expect(consoleSpy).toHaveBeenCalledWith('Claude warning:', 'Warning: some claude warning');
      
      consoleSpy.mockRestore();
    });
  });

  describe('createPromptFile', () => {
    test('should create temp directory and write prompt file', async () => {
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      const result = await executor.createPromptFile('test prompt', {});
      
      expect(fs.mkdir).toHaveBeenCalledWith(executor.tempDir, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalled();
      expect(result).toContain('.smart-ast-temp');
      expect(result).toMatch(/prompt-\d+-\w+\.txt$/);
    });

    test('should build full prompt with context', async () => {
      executor.buildFullPrompt = jest.fn().mockReturnValue('full prompt');
      
      await executor.createPromptFile('base prompt', { test: true });
      
      expect(executor.buildFullPrompt).toHaveBeenCalledWith('base prompt', { test: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        'full prompt'
      );
    });
  });

  describe('buildFullPrompt', () => {
    test('should build basic prompt without context', () => {
      const result = executor.buildFullPrompt('test prompt', {});
      
      expect(result).toContain('test prompt');
      expect(result).toContain('=== RESPONSE REQUIREMENTS ===');
      expect(result).toContain('Respond with valid JSON only');
    });

    test('should include file contents when provided', () => {
      const context = {
        files: [
          { 
            relativePath: 'src/file1.js',
            content: 'const test = "content1";'
          },
          {
            path: 'file2.js',
            content: 'const test = "content2";'
          }
        ]
      };
      
      const result = executor.buildFullPrompt('test prompt', context);
      
      expect(result).toContain('=== FILE CONTENTS ===');
      expect(result).toContain('--- File: src/file1.js ---');
      expect(result).toContain('const test = "content1";');
      expect(result).toContain('--- File: file2.js ---');
      expect(result).toContain('const test = "content2";');
      expect(Helpers.truncateText).toHaveBeenCalledTimes(2);
    });

    test('should include additional context when provided', () => {
      const context = {
        additionalContext: 'This is additional context'
      };
      
      const result = executor.buildFullPrompt('test prompt', context);
      
      expect(result).toContain('=== ADDITIONAL CONTEXT ===');
      expect(result).toContain('This is additional context');
    });

    test('should handle empty files array', () => {
      const context = {
        files: []
      };
      
      const result = executor.buildFullPrompt('test prompt', context);
      
      expect(result).not.toContain('=== FILE CONTENTS ===');
    });
  });

  describe('parseResponse', () => {
    test('should parse valid JSON response', () => {
      const jsonResponse = JSON.stringify({ result: 'success', data: [1, 2, 3] });
      
      const result = executor.parseResponse(jsonResponse);
      
      expect(result).toEqual([1, 2, 3]); // parseResponse extracts arrays first
    });

    test('should extract JSON from response with extra text', () => {
      const response = 'Here is the JSON: {"result": "success"} Some extra text';
      
      const result = executor.parseResponse(response);
      
      expect(result).toEqual({ result: 'success' });
    });

    test('should remove markdown code blocks', () => {
      const response = '```json\n{"result": "success"}\n```';
      
      const result = executor.parseResponse(response);
      
      expect(result).toEqual({ result: 'success' });
    });

    test('should handle whitespace', () => {
      const response = '   \n  {"result": "success"}  \n  ';
      
      const result = executor.parseResponse(response);
      
      expect(result).toEqual({ result: 'success' });
    });

    test('should return error object for invalid JSON', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const response = 'This is not JSON';
      
      const result = executor.parseResponse(response);
      
      expect(result).toHaveProperty('recommendations');
      expect(result.recommendations).toContain('Optimize code structure');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should return error object for non-object response', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const response = '"just a string"';
      
      const result = executor.parseResponse(response);
      
      expect(result).toHaveProperty('recommendations');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should return error object for null response', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const response = 'null';
      
      const result = executor.parseResponse(response);
      
      expect(result).toHaveProperty('recommendations');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should truncate very long raw responses in error', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const longResponse = 'x'.repeat(2000);
      
      const result = executor.parseResponse(longResponse);
      
      expect(result).toHaveProperty('recommendations');
      
      consoleSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    test('should clean up temp directory files', async () => {
      fs.readdir.mockResolvedValue(['file1.txt', 'file2.txt']);
      fs.unlink.mockResolvedValue();
      
      await executor.cleanup();
      
      expect(fs.readdir).toHaveBeenCalledWith(executor.tempDir);
      expect(fs.unlink).toHaveBeenCalledWith(path.join(executor.tempDir, 'file1.txt'));
      expect(fs.unlink).toHaveBeenCalledWith(path.join(executor.tempDir, 'file2.txt'));
    });

    test('should handle readdir errors gracefully', async () => {
      fs.readdir.mockRejectedValue(new Error('Directory not found'));
      
      await expect(executor.cleanup()).resolves.not.toThrow();
    });

    test('should handle unlink errors gracefully', async () => {
      fs.readdir.mockResolvedValue(['file1.txt']);
      fs.unlink.mockRejectedValue(new Error('File not found'));
      
      await expect(executor.cleanup()).resolves.not.toThrow();
    });

    test('should handle empty directory', async () => {
      fs.readdir.mockResolvedValue([]);
      
      await executor.cleanup();
      
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });


});