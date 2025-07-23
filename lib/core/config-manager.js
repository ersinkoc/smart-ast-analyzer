const fs = require('fs').promises;
const path = require('path');
const Helpers = require('../utils/helpers');

class ConfigManager {
  constructor(options = {}) {
    this.configPath = options.config || this.findConfigFile();
    this.defaultConfig = this.getDefaultConfig();
  }

  findConfigFile() {
    const possiblePaths = [
      '.smart-ast.json',
      '.smart-ast.config.json',
      'smart-ast.config.js',
      path.join('config', 'smart-ast.json')
    ];
    
    for (const configPath of possiblePaths) {
      if (Helpers.fileExists(configPath)) {
        return configPath;
      }
    }
    
    return null;
  }

  async loadConfig() {
    let userConfig = {};
    
    if (this.configPath) {
      try {
        if (this.configPath.endsWith('.js')) {
          userConfig = require(path.resolve(this.configPath));
        } else {
          userConfig = await Helpers.readJsonFile(this.configPath);
        }
      } catch (error) {
        console.warn('Failed to load config file:', error.message);
      }
    }
    
    return this.mergeConfigs(this.defaultConfig, userConfig);
  }

  getDefaultConfig() {
    return {
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
    };
  }

  mergeConfigs(defaultConfig, userConfig) {
    const merged = JSON.parse(JSON.stringify(defaultConfig));
    
    // Handle null/undefined userConfig
    if (!userConfig || typeof userConfig !== 'object') {
      return merged;
    }
    
    for (const [key, value] of Object.entries(userConfig)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = { ...merged[key], ...value };
      } else {
        merged[key] = value;
      }
    }
    
    return merged;
  }

  async initialize() {
    const configContent = {
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
    };
    
    const configPath = '.smart-ast.json';
    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2));
    
    return configPath;
  }

  getFrameworkConfig(framework) {
    const frameworkConfigs = {
      nextjs: {
        analysis: {
          includePatterns: [
            'pages/**/*.{js,jsx,ts,tsx}',
            'components/**/*.{js,jsx,ts,tsx}',
            'api/**/*.{js,ts}',
            'lib/**/*.{js,ts}'
          ]
        }
      },
      react: {
        analysis: {
          includePatterns: [
            'src/**/*.{js,jsx,ts,tsx}',
            'components/**/*.{js,jsx,ts,tsx}'
          ]
        }
      },
      express: {
        analysis: {
          includePatterns: [
            'routes/**/*.js',
            'controllers/**/*.js',
            'middleware/**/*.js',
            'models/**/*.js'
          ]
        }
      }
    };
    
    return frameworkConfigs[framework] || {};
  }
}

module.exports = ConfigManager;