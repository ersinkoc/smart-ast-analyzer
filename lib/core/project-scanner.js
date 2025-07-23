const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');
const { promisify } = require('util');
const Helpers = require('../utils/helpers');

const globAsync = promisify(glob);

class ProjectScanner {
  constructor(options = {}) {
    this.basePath = path.resolve(options.path || process.cwd());
    this.includePatterns = options.include ? options.include.split(',') : null;
    this.excludePatterns = options.exclude ? options.exclude.split(',') : [];
    this.maxFiles = parseInt(options.maxFiles) || 50;
  }

  async scan() {
    // Check if the directory exists first
    if (!await Helpers.isDirectory(this.basePath)) {
      throw new Error(`Directory does not exist: ${this.basePath}`);
    }
    
    
    const projectInfo = {
      path: this.basePath,
      type: await this.detectProjectType(),
      framework: await this.detectFramework(),
      language: await this.detectLanguage(),
      structure: await this.analyzeStructure(),
      dependencies: await this.analyzeDependencies(),
      files: await this.categorizeFiles(),
      metrics: await this.gatherMetrics()
    };

    return projectInfo;
  }

  async detectProjectType() {
    const indicators = {
      'package.json': 'node',
      'requirements.txt': 'python',
      'pom.xml': 'java',
      'build.gradle': 'java',
      'go.mod': 'go',
      'Cargo.toml': 'rust',
      'composer.json': 'php',
      'Gemfile': 'ruby'
    };
    
    for (const [file, type] of Object.entries(indicators)) {
      if (await this.fileExists(file)) {
        return type;
      }
    }
    
    return 'unknown';
  }

  async detectFramework() {
    const packageJson = await this.readPackageJson();
    
    // Check for specific framework files first
    if (await this.fileExists('next.config.js') || await this.fileExists('next.config.ts')) {
      return 'nextjs';
    }
    if (await this.fileExists('nuxt.config.js') || await this.fileExists('nuxt.config.ts')) {
      return 'nuxtjs';
    }
    if (await this.fileExists('angular.json')) {
      return 'angular';
    }
    if (await this.fileExists('svelte.config.js')) {
      return 'svelte';
    }
    if (await this.fileExists('vite.config.js') || await this.fileExists('vite.config.ts')) {
      return 'vite';
    }
    
    // Check package.json dependencies
    if (packageJson?.dependencies || packageJson?.devDependencies) {
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (allDeps.next) return 'nextjs';
      if (allDeps.nuxt) return 'nuxtjs';
      if (allDeps.express) return 'express';
      if (allDeps['@nestjs/core']) return 'nestjs';
      if (allDeps.react && !allDeps.next) return 'react';
      if (allDeps.vue) return 'vue';
      if (allDeps['@angular/core']) return 'angular';
      if (allDeps.svelte) return 'svelte';
      if (allDeps.fastify) return 'fastify';
    }
    
    // Check for Python frameworks
    if (await this.fileExists('manage.py')) return 'django';
    if (await this.fileExists('app.py') || await this.fileExists('main.py')) {
      const content = await this.readFileContent('app.py').catch(() => 
        this.readFileContent('main.py').catch(() => ''));
      if (content.includes('flask')) return 'flask';
      if (content.includes('fastapi')) return 'fastapi';
    }
    
    return 'unknown';
  }

  async detectLanguage() {
    const files = await this.findFiles(['**/*.{js,ts,jsx,tsx,py,java,go,rs,php,rb}'], 10);
    const languageCount = {};
    
    files.forEach(file => {
      const ext = Helpers.getFileExtension(file);
      const langMap = {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.py': 'python',
        '.java': 'java',
        '.go': 'go',
        '.rs': 'rust',
        '.php': 'php',
        '.rb': 'ruby'
      };
      
      const lang = langMap[ext];
      if (lang) {
        languageCount[lang] = (languageCount[lang] || 0) + 1;
      }
    });
    
    // Return the most common language
    return Object.keys(languageCount).reduce((a, b) => 
      languageCount[a] > languageCount[b] ? a : b, 'unknown');
  }

  async analyzeStructure() {
    const structure = {};
    
    try {
      const items = await fs.readdir(this.basePath, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isDirectory() && !this.shouldExcludeDir(item.name)) {
          const dirPath = path.join(this.basePath, item.name);
          const fileCount = await this.countFilesInDir(dirPath);
          structure[item.name] = {
            type: 'directory',
            fileCount: fileCount
          };
        }
      }
    } catch (error) {
      console.warn('Failed to analyze structure:', error.message);
    }
    
    return structure;
  }

  async analyzeDependencies() {
    const packageJson = await this.readPackageJson();
    
    if (!packageJson) {
      return { dependencies: [], devDependencies: [], total: 0 };
    }
    
    const deps = Object.keys(packageJson.dependencies || {});
    const devDeps = Object.keys(packageJson.devDependencies || {});
    
    return {
      dependencies: deps,
      devDependencies: devDeps,
      total: deps.length + devDeps.length
    };
  }

  async categorizeFiles() {
    const categories = {
      // API-related files
      apis: await this.findFiles([
        '**/api/**/*.{js,ts,jsx,tsx}',
        '**/routes/**/*.{js,ts}',
        '**/controllers/**/*.{js,ts}',
        '**/endpoints/**/*.{js,ts}',
        '**/graphql/**/*.{js,ts}',
        '**/*Controller.{js,ts}',
        '**/*Route.{js,ts}',
        '**/*Api.{js,ts}',
        '**/views.py',
        '**/urls.py'
      ]),
      
      // Component files
      components: await this.findFiles([
        '**/components/**/*.{jsx,tsx,js,ts}',
        '**/src/**/*.{jsx,tsx}',
        '**/pages/**/*.{jsx,tsx}',
        '**/views/**/*.{vue,jsx,tsx}',
        '**/*.component.{ts,js}',
        '**/*.{jsx,tsx,vue}'
      ]),
      
      // Service/Business logic
      services: await this.findFiles([
        '**/services/**/*.{js,ts}',
        '**/lib/**/*.{js,ts}',
        '**/utils/**/*.{js,ts}',
        '**/helpers/**/*.{js,ts}',
        '**/business/**/*.{js,ts}',
        '**/*Service.{js,ts}',
        '**/*Utils.{js,ts}'
      ]),
      
      // Database/Models
      models: await this.findFiles([
        '**/models/**/*.{js,ts}',
        '**/entities/**/*.{js,ts}',
        '**/schemas/**/*.{js,ts}',
        '**/db/**/*.{js,ts}',
        '**/*Model.{js,ts}',
        '**/*Schema.{js,ts}',
        '**/*.model.{js,ts}',
        '**/models.py'
      ]),
      
      // WebSocket files
      websockets: await this.findFiles([
        '**/socket/**/*.{js,ts}',
        '**/ws/**/*.{js,ts}',
        '**/realtime/**/*.{js,ts}',
        '**/*socket*.{js,ts}',
        '**/*Socket*.{js,ts}',
        '**/io/**/*.{js,ts}'
      ]),
      
      // Authentication files
      auth: await this.findFiles([
        '**/auth/**/*.{js,ts}',
        '**/authentication/**/*.{js,ts}',
        '**/middleware/auth*.{js,ts}',
        '**/*Auth*.{js,ts}',
        '**/guards/**/*.{js,ts}'
      ]),
      
      // Configuration files
      configs: await this.findFiles([
        '**/config/**/*.{js,ts,json}',
        '**/*.config.{js,ts}',
        '.env*',
        '**/settings/**/*.{js,ts}'
      ]),
      
      // Test files
      tests: await this.findFiles([
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        '**/tests/**/*.{js,ts,jsx,tsx}',
        '**/__tests__/**/*.{js,ts,jsx,tsx}'
      ])
    };

    // Remove duplicates and limit files per category
    for (const [key, files] of Object.entries(categories)) {
      categories[key] = [...new Set(files)].slice(0, this.maxFiles);
    }

    return categories;
  }

  async findFiles(patterns, limit = this.maxFiles) {
    try {
      // Check if directory exists first
      if (!await Helpers.isDirectory(this.basePath)) {
        console.warn(`Directory does not exist: ${this.basePath}`);
        return [];
      }
      
      const allFiles = [];
      
      for (const pattern of patterns) {
        try {
          const files = await globAsync(pattern, {
            cwd: this.basePath,
            ignore: this.getIgnorePatterns(),
            absolute: false,
            nodir: true,
            windowsPathsNoEscape: true
          });
          
          // Convert to absolute paths
          const absoluteFiles = files.map(file => path.resolve(this.basePath, file));
          allFiles.push(...absoluteFiles);
        } catch (patternError) {
          console.warn(`Failed to process pattern ${pattern}:`, patternError.message);
        }
      }
      
      // Remove duplicates and apply limit
      const uniqueFiles = [...new Set(allFiles)];
      return uniqueFiles.slice(0, limit);
    } catch (error) {
      console.warn(`Failed to find files with patterns ${patterns}:`, error.message);
      return [];
    }
  }

  getIgnorePatterns() {
    const defaultIgnore = [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.next/**',
      '.nuxt/**',
      'vendor/**',
      '*.min.js',
      '*.bundle.js'
    ];
    
    return [...defaultIgnore, ...this.excludePatterns];
  }

  async gatherMetrics() {
    try {
      const allFiles = await this.findFiles(['**/*'], 1000);
      const codeFiles = allFiles.filter(f => Helpers.isCodeFile(f));
      
      let totalLines = 0;
      for (const file of codeFiles.slice(0, 100)) { // Sample first 100 files
        try {
          const content = await fs.readFile(file, 'utf-8');
          totalLines += content.split('\n').length;
        } catch (error) {
          // Skip files that can't be read
        }
      }
      
      return {
        totalFiles: allFiles.length,
        codeFiles: codeFiles.length,
        totalLines: totalLines,
        lastModified: await this.getLastModified()
      };
    } catch (error) {
      return {
        totalFiles: 0,
        codeFiles: 0,
        totalLines: 0,
        lastModified: new Date()
      };
    }
  }

  async getLastModified() {
    try {
      const stats = await fs.stat(this.basePath);
      return stats.mtime;
    } catch (error) {
      return new Date();
    }
  }

  async fileExists(relativePath) {
    return await Helpers.fileExists(path.join(this.basePath, relativePath));
  }

  async readPackageJson() {
    return await Helpers.readJsonFile(path.join(this.basePath, 'package.json'));
  }

  async readFileContent(relativePath) {
    const filePath = path.join(this.basePath, relativePath);
    return await fs.readFile(filePath, 'utf-8');
  }

  shouldExcludeDir(dirName) {
    const excludeDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt'];
    return excludeDirs.includes(dirName) || dirName.startsWith('.');
  }

  async countFilesInDir(dirPath) {
    try {
      const files = await globAsync('**/*', { cwd: dirPath, nodir: true });
      return files.length;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = ProjectScanner;