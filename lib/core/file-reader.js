const fs = require('fs').promises;
const path = require('path');
const Helpers = require('../utils/helpers');

class FileReader {
  constructor(options = {}) {
    this.maxFileSize = options.maxFileSize || 1024 * 1024; // 1MB
    this.encoding = options.encoding || 'utf-8';
    this.excludePatterns = options.exclude || [];
  }

  async readFiles(filePaths) {
    const filesWithContent = [];
    
    for (const filePath of filePaths) {
      try {
        const stats = await fs.stat(filePath);
        
        if (stats.size > this.maxFileSize) {
          console.warn(`Skipping large file: ${filePath} (${Helpers.formatBytes(stats.size)})`);
          continue;
        }
        
        const content = await fs.readFile(filePath, this.encoding);
        
        filesWithContent.push({
          path: filePath,
          relativePath: path.relative(process.cwd(), filePath),
          content: content,
          size: stats.size,
          lines: content.split('\n').length,
          extension: Helpers.getFileExtension(filePath),
          lastModified: stats.mtime
        });
      } catch (error) {
        console.warn(`Failed to read file ${filePath}:`, error.message);
      }
    }
    
    return filesWithContent;
  }

  async readFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, this.encoding);
      
      return {
        path: filePath,
        relativePath: path.relative(process.cwd(), filePath),
        content: content,
        size: stats.size,
        lines: content.split('\n').length,
        extension: Helpers.getFileExtension(filePath),
        lastModified: stats.mtime
      };
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  async readPackageJson(projectPath) {
    const packagePath = path.join(projectPath, 'package.json');
    return await Helpers.readJsonFile(packagePath);
  }

  async readConfigFile(configPath) {
    if (await Helpers.fileExists(configPath)) {
      return await Helpers.readJsonFile(configPath);
    }
    return null;
  }

  shouldExcludeFile(filePath) {
    const normalizedPath = Helpers.normalizePath(filePath);
    
    // Default exclusions
    const defaultExclusions = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      '.nuxt',
      'vendor'
    ];
    
    const allExclusions = [...defaultExclusions, ...this.excludePatterns];
    
    return allExclusions.some(pattern => {
      if (pattern.includes('*')) {
        // Simple glob pattern matching
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(normalizedPath);
      }
      return normalizedPath.includes(pattern);
    });
  }
}

module.exports = FileReader;