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
    test('should execute mock method for mock type', async () => {
      executor = new AIExecutor('mock');
      executor.executeMock = jest.fn().mockResolvedValue({ success: true });
      
      const result = await executor.execute('test prompt', { type: 'api' });
      
      expect(executor.executeMock).toHaveBeenCalledWith('test prompt', { type: 'api' });
      expect(result).toEqual({ success: true });
    });

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

    test('should throw specific error when Claude execution fails', async () => {
      executor.createPromptFile = jest.fn().mockResolvedValue('test.txt');
      
      exec.mockImplementation((command, options, callback) => {
        if (!callback && typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes('--version')) {
          callback(null, { stdout: 'v1.0.0', stderr: '' });
        } else {
          callback(new Error('Claude process failed'));
        }
      });

      await expect(executor.executeClaude('test prompt', {}))
        .rejects.toThrow('Claude execution failed: Claude process failed');
    });

    test('should cleanup prompt file even when Claude execution fails', async () => {
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

      await expect(executor.executeClaude('test prompt', {}))
        .rejects.toThrow('Claude execution failed: Execution failed');
      
      expect(fs.unlink).toHaveBeenCalledWith(mockPromptFile);
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

  describe('executeMock', () => {
    test('should return mock data with delay', async () => {
      const result = await executor.executeMock('test prompt', {});
      
      expect(Helpers.delay).toHaveBeenCalledWith(100);
      expect(result).toHaveProperty('endpoints');
      expect(result.endpoints).toBeInstanceOf(Array);
    });

    test('should call analyzeRealFiles when files are provided', async () => {
      executor.analyzeRealFiles = jest.fn().mockResolvedValue({ test: 'result' });
      const context = {
        files: [{ path: 'file1.js', content: 'code' }],
        type: 'api'
      };
      
      const result = await executor.executeMock('test prompt', context);
      
      expect(executor.analyzeRealFiles).toHaveBeenCalledWith(['file1.js'], 'api');
      expect(result).toEqual({ test: 'result' });
    });

    test('should return appropriate mock data for different analysis types', async () => {
      const types = ['api', 'component', 'websocket', 'auth', 'database', 'performance'];
      
      for (const type of types) {
        const result = await executor.executeMock('test prompt', { type });
        expect(result).toBeDefined();
      }
    });

    test('should extract file paths when files have only path property', async () => {
      executor.analyzeRealFiles = jest.fn().mockResolvedValue({ test: 'result' });
      const context = {
        files: [{ path: 'file1.js' }, { path: 'file2.js' }],
        type: 'api'
      };
      
      const result = await executor.executeMock('test prompt', context);
      
      expect(executor.analyzeRealFiles).toHaveBeenCalledWith(['file1.js', 'file2.js'], 'api');
    });

    test('should extract file paths when files are strings', async () => {
      executor.analyzeRealFiles = jest.fn().mockResolvedValue({ test: 'result' });
      const context = {
        files: ['file1.js', 'file2.js'],
        type: 'api'
      };
      
      const result = await executor.executeMock('test prompt', context);
      
      expect(executor.analyzeRealFiles).toHaveBeenCalledWith(['file1.js', 'file2.js'], 'api');
    });
  });

  describe('createPromptContent', () => {
    test('should call buildFullPrompt', async () => {
      executor.buildFullPrompt = jest.fn().mockReturnValue('full prompt');
      
      const result = await executor.createPromptContent('base prompt', { test: true });
      
      expect(executor.buildFullPrompt).toHaveBeenCalledWith('base prompt', { test: true });
      expect(result).toBe('full prompt');
    });
  });

  describe('createShortPrompt', () => {
    test('should create short prompt for Claude Code', () => {
      const context = { type: 'api' };
      const fileRefs = 'file1.js, file2.js';
      
      const result = executor.createShortPrompt('base', context, fileRefs);
      
      expect(result).toContain('Analyze the api structure');
      expect(result).toContain('file1.js, file2.js');
      expect(result).toContain('JSON object with endpoints array');
    });
  });

  describe('executeCommand', () => {
    const { spawn } = require('child_process');
    const EventEmitter = require('events');
    
    beforeEach(() => {
      jest.resetModules();
      jest.mock('child_process');
    });

    test('should execute command and return parsed response', async () => {
      const mockChild = new EventEmitter();
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();
      mockChild.kill = jest.fn();
      
      spawn.mockReturnValue(mockChild);
      executor.parseResponse = jest.fn().mockReturnValue({ success: true });
      
      const promise = executor.executeCommand('test-command', ['arg1', 'arg2']);
      
      mockChild.stdout.emit('data', '{"result": "success"}');
      mockChild.emit('close', 0);
      
      const result = await promise;
      
      expect(spawn).toHaveBeenCalledWith(
        process.platform === 'win32' ? 'test-command.cmd' : 'test-command',
        ['arg1', 'arg2'],
        expect.objectContaining({
          cwd: process.cwd(),
          shell: process.platform === 'win32'
        })
      );
      expect(result).toEqual({ success: true });
    });

    test('should handle Windows platform specifically', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32'
      });

      const mockChild = new EventEmitter();
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();
      mockChild.kill = jest.fn();
      
      spawn.mockReturnValue(mockChild);
      executor.parseResponse = jest.fn().mockReturnValue({ success: true });
      
      const promise = executor.executeCommand('test-command', ['arg1']);
      
      mockChild.stdout.emit('data', '{"result": "success"}');
      mockChild.emit('close', 0);
      
      await promise;
      
      expect(spawn).toHaveBeenCalledWith(
        'test-command.cmd',
        ['arg1'],
        expect.objectContaining({
          shell: true
        })
      );
      
      Object.defineProperty(process, 'platform', {
        value: originalPlatform
      });
    });

    test('should handle command timeout', async () => {
      jest.useFakeTimers();
      
      const mockChild = new EventEmitter();
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();
      mockChild.kill = jest.fn();
      
      spawn.mockReturnValue(mockChild);
      executor.timeout = 5000; // 5 second timeout
      
      const promise = executor.executeCommand('test-command', []);
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(5001);
      
      await expect(promise).rejects.toThrow('Command timed out');
      expect(mockChild.kill).toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    test('should handle command errors', async () => {
      const mockChild = new EventEmitter();
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();
      
      spawn.mockReturnValue(mockChild);
      
      const promise = executor.executeCommand('test-command', []);
      
      mockChild.emit('error', new Error('Command failed'));
      
      await expect(promise).rejects.toThrow('Command failed');
    });

    test('should handle non-zero exit codes', async () => {
      const mockChild = new EventEmitter();
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();
      
      spawn.mockReturnValue(mockChild);
      
      const promise = executor.executeCommand('test-command', []);
      
      mockChild.stderr.emit('data', 'Error output');
      mockChild.emit('close', 1);
      
      await expect(promise).rejects.toThrow('Command failed with code 1: Error output');
    });

    test('should warn on stderr but succeed on code 0', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockChild = new EventEmitter();
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();
      
      spawn.mockReturnValue(mockChild);
      executor.parseResponse = jest.fn().mockReturnValue({ success: true });
      
      const promise = executor.executeCommand('test-command', []);
      
      mockChild.stdout.emit('data', '{"result": "success"}');
      mockChild.stderr.emit('data', 'Warning message');
      mockChild.emit('close', 0);
      
      await promise;
      
      expect(consoleSpy).toHaveBeenCalledWith('test-command warning:', 'Warning message');
      
      consoleSpy.mockRestore();
    });
  });

  describe('createAnalysisFile', () => {
    test('should create analysis file with context', async () => {
      const context = {
        type: 'api',
        files: [
          { relativePath: 'src/file1.js', content: 'const test = 1;' },
          { path: 'file2.js', content: 'export default test;' }
        ]
      };
      
      const result = await executor.createAnalysisFile(context);
      
      expect(fs.mkdir).toHaveBeenCalledWith(executor.tempDir, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalled();
      
      const writeCall = fs.writeFile.mock.calls[0];
      expect(writeCall[1]).toContain('Analysis Type: api');
      expect(writeCall[1]).toContain('Total Files: 2');
      expect(writeCall[1]).toContain('=== FILE: src/file1.js ===');
      expect(writeCall[1]).toContain('const test = 1;');
    });

    test('should handle files without content', async () => {
      const context = {
        files: [{ path: 'file1.js' }]
      };
      
      await executor.createAnalysisFile(context);
      
      const writeCall = fs.writeFile.mock.calls[0];
      expect(writeCall[1]).toContain('No content available');
    });

    test('should handle context without type', async () => {
      const context = {
        files: []
      };
      
      await executor.createAnalysisFile(context);
      
      const writeCall = fs.writeFile.mock.calls[0];
      expect(writeCall[1]).toContain('Analysis Type: api');
    });

    test('should handle context without files property', async () => {
      const context = {};
      
      await executor.createAnalysisFile(context);
      
      const writeCall = fs.writeFile.mock.calls[0];
      expect(writeCall[1]).toContain('Total Files: 0');
    });

    test('should handle files as plain strings', async () => {
      const context = {
        files: ['file1.js', 'file2.js']
      };
      
      await executor.createAnalysisFile(context);
      
      const writeCall = fs.writeFile.mock.calls[0];
      expect(writeCall[1]).toContain('=== FILE: file1.js ===');
      expect(writeCall[1]).toContain('No content available');
    });
  });

  describe('cleanupTempFile', () => {
    test('should unlink file', async () => {
      await executor.cleanupTempFile('/path/to/file.txt');
      
      expect(fs.unlink).toHaveBeenCalledWith('/path/to/file.txt');
    });

    test('should ignore unlink errors', async () => {
      fs.unlink.mockRejectedValue(new Error('File not found'));
      
      await expect(executor.cleanupTempFile('/path/to/file.txt')).resolves.not.toThrow();
    });
  });

  describe('analyzeRealFiles', () => {
    beforeEach(() => {
      fs.readFile = jest.fn();
    });

    test('should analyze API endpoints in files', async () => {
      const files = ['api/routes.js'];
      fs.readFile.mockResolvedValue(`
        app.get('/api/users', handler);
        router.post("/api/login", loginHandler);
      `);
      
      const result = await executor.analyzeRealFiles(files, 'api');
      
      expect(result.endpoints).toHaveLength(2);
      expect(result.endpoints[0]).toMatchObject({
        method: 'GET',
        path: '/api/users'
      });
      expect(result.endpoints[1]).toMatchObject({
        method: 'POST',
        path: '/api/login'
      });
    });

    test('should analyze React components', async () => {
      const files = ['components/Button.jsx'];
      fs.readFile.mockResolvedValue(`
        function Button() {}
        const Card = () => {};
        class Modal extends React.Component {}
      `);
      
      const result = await executor.analyzeRealFiles(files, 'component');
      
      expect(Object.keys(result.components)).toContain('Button');
      expect(Object.keys(result.components)).toContain('Card');
      expect(Object.keys(result.components)).toContain('Modal');
      expect(result.components.Modal.type).toBe('class');
    });

    test('should handle file read errors', async () => {
      const files = ['nonexistent.js'];
      fs.readFile.mockRejectedValue(new Error('File not found'));
      
      const result = await executor.analyzeRealFiles(files, 'api');
      
      expect(result.endpoints).toEqual([]);
    });

    test('should limit to 10 files', async () => {
      const files = Array(20).fill('file.js');
      fs.readFile.mockResolvedValue('content');
      
      await executor.analyzeRealFiles(files, 'api');
      
      expect(fs.readFile).toHaveBeenCalledTimes(10);
    });

    test('should add recommendations when no endpoints found', async () => {
      const files = ['file.js'];
      fs.readFile.mockResolvedValue('no endpoints here');
      
      const result = await executor.analyzeRealFiles(files, 'api');
      
      expect(result.recommendations).toContain('No API endpoints found. Check if your API files are in the correct location.');
    });

    test('should return default structure for unknown analysis type', async () => {
      const result = await executor.analyzeRealFiles([], 'unknown');
      
      expect(result).toHaveProperty('endpoints');
      expect(result).toHaveProperty('apiGroups');
    });

    test('should analyze TSX components', async () => {
      const files = ['components/Button.tsx'];
      fs.readFile.mockResolvedValue(`
        export function Button() {}
        const Card = () => {};
        export class Modal extends React.Component {}
      `);
      
      const result = await executor.analyzeRealFiles(files, 'component');
      
      expect(Object.keys(result.components)).toContain('Button');
      expect(Object.keys(result.components)).toContain('Card');
      expect(Object.keys(result.components)).toContain('Modal');
    });

    test('should add API recommendations when endpoints are found', async () => {
      const files = ['api/routes.js'];
      fs.readFile.mockResolvedValue(`
        app.get('/api/users', handler);
      `);
      
      const result = await executor.analyzeRealFiles(files, 'api');
      
      expect(result.recommendations).toContain('Consider adding API documentation');
      expect(result.recommendations).toContain('Implement rate limiting for public endpoints');
    });

    test('should handle empty files array', async () => {
      const result = await executor.analyzeRealFiles(null, 'api');
      
      expect(result).toBeDefined();
      expect(result.endpoints).toEqual([]);
    });

    test('should return results for specific analysis type', async () => {
      const result = await executor.analyzeRealFiles([], 'component');
      
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('unusedComponents');
      expect(result).toHaveProperty('recommendations');
    });
  });

  describe('parseResponse edge cases', () => {
    test('should handle response starting with "Loaded cached credentials."', () => {
      const response = 'Loaded cached credentials.\n{"result": "success"}';
      
      const result = executor.parseResponse(response);
      
      expect(result).toEqual({ result: 'success' });
    });

    test('should extract array from mixed content', () => {
      const response = 'Some text [{"id": 1}, {"id": 2}] more text';
      
      const result = executor.parseResponse(response);
      
      expect(result).toEqual([{id: 1}, {id: 2}]);
    });

    test('should handle very long error responses', () => {
      const longResponse = 'x'.repeat(1000);
      
      const result = executor.parseResponse(longResponse);
      
      expect(result.recommendations).toBeDefined();
    });
  });

});