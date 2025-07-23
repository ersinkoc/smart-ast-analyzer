const ConfigManager = require('../../lib/core/config-manager');
const fs = require('fs').promises;
const path = require('path');
const Helpers = require('../../lib/utils/helpers');

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn()
  }
}));

// Mock helpers module
jest.mock('../../lib/utils/helpers');

describe('ConfigManager', () => {
  let configManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks
    Helpers.fileExists = jest.fn().mockReturnValue(false);
    Helpers.readJsonFile = jest.fn();
  });

  describe('constructor', () => {
    test('should initialize with findConfigFile when no options provided', () => {
      configManager = new ConfigManager();
      expect(configManager.configPath).toBeNull();
      expect(configManager.defaultConfig).toBeDefined();
    });

    test('should use provided config path from options', () => {
      const customPath = './custom-config.json';
      configManager = new ConfigManager({ config: customPath });
      
      expect(configManager.configPath).toBe(customPath);
    });

    test('should find existing config file', () => {
      Helpers.fileExists.mockImplementation((path) => {
        return path === '.smart-ast.json';
      });
      
      configManager = new ConfigManager();
      expect(configManager.configPath).toBe('.smart-ast.json');
    });
  });

  describe('findConfigFile', () => {
    test('should check multiple config paths', () => {
      configManager = new ConfigManager();
      
      expect(Helpers.fileExists).toHaveBeenCalledWith('.smart-ast.json');
      expect(Helpers.fileExists).toHaveBeenCalledWith('.smart-ast.config.json');
      expect(Helpers.fileExists).toHaveBeenCalledWith('smart-ast.config.js');
      expect(Helpers.fileExists).toHaveBeenCalledWith(path.join('config', 'smart-ast.json'));
    });

    test('should return first existing config file', () => {
      Helpers.fileExists.mockImplementation((path) => {
        return path === 'smart-ast.config.js';
      });
      
      configManager = new ConfigManager();
      expect(configManager.configPath).toBe('smart-ast.config.js');
    });

    test('should return null when no config file exists', () => {
      Helpers.fileExists.mockReturnValue(false);
      
      configManager = new ConfigManager();
      expect(configManager.configPath).toBeNull();
    });
  });

  describe('loadConfig', () => {
    beforeEach(() => {
      configManager = new ConfigManager();
    });

    test('should return default config when no config path', async () => {
      configManager.configPath = null;
      const config = await configManager.loadConfig();
      
      expect(config).toEqual(configManager.getDefaultConfig());
    });

    test('should load JS config file', async () => {
      const mockConfig = {
        analysis: { maxFilesPerCategory: 100 },
        ai: { timeout: 500000 }
      };
      
      configManager.configPath = 'smart-ast.config.js';
      
      // Mock require for JS config
      jest.doMock(path.resolve('smart-ast.config.js'), () => mockConfig, { virtual: true });
      
      const config = await configManager.loadConfig();
      
      expect(config.analysis.maxFilesPerCategory).toBe(100);
      expect(config.ai.timeout).toBe(500000);
      expect(config.cache).toBeDefined(); // From defaults
    });

    test('should load JSON config file', async () => {
      const userConfig = {
        analysis: { maxFilesPerCategory: 75 },
        ai: { model: 'custom' }
      };
      
      configManager.configPath = '.smart-ast.json';
      Helpers.readJsonFile.mockResolvedValue(userConfig);
      
      const config = await configManager.loadConfig();
      
      expect(Helpers.readJsonFile).toHaveBeenCalledWith('.smart-ast.json');
      expect(config.analysis.maxFilesPerCategory).toBe(75);
      expect(config.ai.model).toBe('custom');
      expect(config.analysis.excludePatterns).toBeDefined(); // From defaults
    });

    test('should handle config load errors gracefully', async () => {
      configManager.configPath = '.smart-ast.json';
      Helpers.readJsonFile.mockRejectedValue(new Error('File not found'));
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const config = await configManager.loadConfig();
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load config file:', 'File not found');
      expect(config).toEqual(configManager.getDefaultConfig());
      
      consoleSpy.mockRestore();
    });
  });

  describe('getDefaultConfig', () => {
    test('should return complete default configuration', () => {
      configManager = new ConfigManager();
      const defaultConfig = configManager.getDefaultConfig();
      
      expect(defaultConfig).toEqual({
        analysis: {
          maxFilesPerCategory: 50,
          maxFileSize: '1MB',
          excludePatterns: [
            'node_modules/**',
            '.git/**',
            'dist/**',
            'build/**',
            'coverage/**',
            '*.min.js',
            '*.bundle.js'
          ],
          includePatterns: [
            '**/*.js',
            '**/*.jsx',
            '**/*.ts',
            '**/*.tsx',
            '**/*.vue',
            '**/*.py'
          ]
        },
        ai: {
          timeout: 300000,
          maxRetries: 3,
          model: 'default'
        },
        cache: {
          enabled: true,
          ttl: 3600000,
          directory: '.smart-ast-cache'
        },
        output: {
          directory: './smart-ast-output',
          formats: ['json', 'markdown', 'html'],
          includeRawResponse: false
        }
      });
    });
  });

  describe('mergeConfigs', () => {
    test('should merge user config with defaults', () => {
      configManager = new ConfigManager();
      const defaultConfig = {
        analysis: {
          maxFilesPerCategory: 50,
          maxFileSize: '1MB',
          excludePatterns: ['node_modules/**']
        },
        ai: {
          timeout: 300000,
          model: 'default'
        }
      };
      
      const userConfig = {
        analysis: {
          maxFilesPerCategory: 100,
          newOption: true
        },
        ai: {
          timeout: 600000
        },
        customSection: {
          enabled: true
        }
      };
      
      const merged = configManager.mergeConfigs(defaultConfig, userConfig);
      
      expect(merged.analysis.maxFilesPerCategory).toBe(100); // User override
      expect(merged.analysis.maxFileSize).toBe('1MB'); // Default preserved
      expect(merged.analysis.newOption).toBe(true); // User addition
      expect(merged.analysis.excludePatterns).toEqual(['node_modules/**']); // Default preserved
      expect(merged.ai.timeout).toBe(600000); // User override
      expect(merged.ai.model).toBe('default'); // Default preserved
      expect(merged.customSection).toEqual({ enabled: true }); // User addition
    });

    test('should handle arrays by replacing not merging', () => {
      configManager = new ConfigManager();
      const defaultConfig = {
        analysis: {
          excludePatterns: ['node_modules/**', '.git/**']
        }
      };
      
      const userConfig = {
        analysis: {
          excludePatterns: ['build/**', 'dist/**']
        }
      };
      
      const merged = configManager.mergeConfigs(defaultConfig, userConfig);
      
      expect(merged.analysis.excludePatterns).toEqual(['build/**', 'dist/**']);
    });

    test('should deep clone default config', () => {
      configManager = new ConfigManager();
      const defaultConfig = {
        analysis: { nested: { value: 'test' } }
      };
      
      const merged = configManager.mergeConfigs(defaultConfig, {});
      
      merged.analysis.nested.value = 'modified';
      expect(defaultConfig.analysis.nested.value).toBe('test'); // Original unchanged
    });

    test('should handle null userConfig', () => {
      configManager = new ConfigManager();
      const defaultConfig = configManager.getDefaultConfig();
      
      const merged = configManager.mergeConfigs(defaultConfig, null);
      
      expect(merged).toEqual(defaultConfig);
    });

    test('should handle undefined userConfig', () => {
      configManager = new ConfigManager();
      const defaultConfig = configManager.getDefaultConfig();
      
      const merged = configManager.mergeConfigs(defaultConfig, undefined);
      
      expect(merged).toEqual(defaultConfig);
    });
  });

  describe('initialize', () => {
    test('should create initial config file', async () => {
      configManager = new ConfigManager();
      fs.writeFile.mockResolvedValue();
      
      const configPath = await configManager.initialize();
      
      expect(configPath).toBe('.smart-ast.json');
      expect(fs.writeFile).toHaveBeenCalledWith(
        '.smart-ast.json',
        JSON.stringify({
          ai: 'gemini',
          analysis: {
            type: 'full',
            maxFiles: 50,
            exclude: [
              'node_modules/**',
              '.git/**',
              'dist/**',
              'build/**'
            ]
          },
          output: {
            format: 'all',
            directory: './smart-ast-output'
          },
          cache: {
            enabled: true
          }
        }, null, 2)
      );
    });

    test('should handle write errors', async () => {
      configManager = new ConfigManager();
      fs.writeFile.mockRejectedValue(new Error('Permission denied'));
      
      await expect(configManager.initialize()).rejects.toThrow('Permission denied');
    });
  });

  describe('getFrameworkConfig', () => {
    test('should return Next.js specific config', () => {
      configManager = new ConfigManager();
      const config = configManager.getFrameworkConfig('nextjs');
      
      expect(config).toEqual({
        analysis: {
          includePatterns: [
            'pages/**/*.{js,jsx,ts,tsx}',
            'components/**/*.{js,jsx,ts,tsx}',
            'api/**/*.{js,ts}',
            'lib/**/*.{js,ts}'
          ]
        }
      });
    });

    test('should return React specific config', () => {
      configManager = new ConfigManager();
      const config = configManager.getFrameworkConfig('react');
      
      expect(config).toEqual({
        analysis: {
          includePatterns: [
            'src/**/*.{js,jsx,ts,tsx}',
            'components/**/*.{js,jsx,ts,tsx}'
          ]
        }
      });
    });

    test('should return Express specific config', () => {
      configManager = new ConfigManager();
      const config = configManager.getFrameworkConfig('express');
      
      expect(config).toEqual({
        analysis: {
          includePatterns: [
            'routes/**/*.js',
            'controllers/**/*.js',
            'middleware/**/*.js',
            'models/**/*.js'
          ]
        }
      });
    });

    test('should return empty object for unknown framework', () => {
      configManager = new ConfigManager();
      const config = configManager.getFrameworkConfig('unknown');
      
      expect(config).toEqual({});
    });
  });

  describe('edge cases', () => {
    test('should handle path.join in findConfigFile', () => {
      // Test that path.join is called correctly
      const joinSpy = jest.spyOn(path, 'join');
      
      configManager = new ConfigManager();
      
      expect(joinSpy).toHaveBeenCalledWith('config', 'smart-ast.json');
      
      joinSpy.mockRestore();
    });

    test('should handle circular references in config', async () => {
      configManager = new ConfigManager();
      const circularConfig = { analysis: {} };
      circularConfig.analysis.circular = circularConfig;
      
      // JSON.parse(JSON.stringify()) in mergeConfigs should handle this
      expect(() => configManager.mergeConfigs(circularConfig, {})).toThrow();
    });

    test('should handle very large config files', async () => {
      configManager = new ConfigManager({ config: '.smart-ast.json' });
      
      // Create a large config object
      const largeConfig = {
        analysis: {
          excludePatterns: Array(1000).fill('pattern')
        }
      };
      
      Helpers.readJsonFile.mockResolvedValue(largeConfig);
      
      const config = await configManager.loadConfig();
      expect(config.analysis.excludePatterns).toHaveLength(1000);
    });
  });
});