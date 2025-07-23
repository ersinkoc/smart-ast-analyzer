const path = require('path');
const fs = require('fs').promises;

class Helpers {
  static async fileExists(filepath) {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  static async isDirectory(filepath) {
    try {
      const stats = await fs.stat(filepath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  static async readJsonFile(filepath) {
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  static normalizePath(filepath) {
    return path.normalize(filepath).replace(/\\/g, '/');
  }

  static getFileExtension(filepath) {
    return path.extname(filepath).toLowerCase();
  }

  static isCodeFile(filepath) {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.vue', '.py', '.java', '.go', '.rs', '.php'
    ];
    return codeExtensions.includes(this.getFileExtension(filepath));
  }

  static formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static debounce(func, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  static async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static sanitizePath(filepath) {
    // Remove dangerous path components and normalize
    let sanitized = filepath
      .replace(/\.\.\//g, '/') // Replace ../ with /
      .replace(/\.\./g, '')    // Remove remaining .. 
      .replace(/[<>:"|?*]/g, ''); // Remove dangerous characters
    
    // Only add leading / if it was removed by ../ replacement and looks like absolute path
    if (filepath.startsWith('../') && !sanitized.startsWith('/') && !sanitized.match(/^[a-zA-Z]:/)) {
      sanitized = '/' + sanitized;
    }
    
    // Clean up double slashes
    sanitized = sanitized.replace(/\/+/g, '/');
    
    return sanitized;
  }

  static truncateText(text, maxLength = 1000) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  static extractCodeBlocks(text) {
    const codeBlockRegex = /```[\s\S]*?```/g;
    return text.match(codeBlockRegex) || [];
  }
}

module.exports = Helpers;