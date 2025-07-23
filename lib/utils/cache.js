const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class Cache {
  constructor(enabled = true, options = {}) {
    this.enabled = enabled;
    this.cacheDir = options.directory || '.smart-ast-cache';
    this.ttl = options.ttl || 3600000; // 1 hour default
    this.ensureCacheDir();
  }

  async ensureCacheDir() {
    if (!this.enabled) return;
    
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create cache directory:', error.message);
      this.enabled = false;
    }
  }

  generateKey(type, files) {
    if (!this.enabled) return null;
    
    const content = files.map(f => `${f}:${Date.now()}`).join('|');
    const hash = crypto.createHash('md5').update(`${type}:${content}`).digest('hex');
    return `${type}-${hash}`;
  }

  async get(key) {
    if (!this.enabled || !key) return null;
    
    try {
      const cacheFile = path.join(this.cacheDir, `${key}.json`);
      const stats = await fs.stat(cacheFile);
      
      // Check if cache is expired
      if (Date.now() - stats.mtime.getTime() > this.ttl) {
        await fs.unlink(cacheFile).catch(() => {});
        return null;
      }
      
      const content = await fs.readFile(cacheFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  async set(key, data) {
    if (!this.enabled || !key) return;
    
    try {
      const cacheFile = path.join(this.cacheDir, `${key}.json`);
      await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('Failed to write cache:', error.message);
    }
  }

  async clear() {
    if (!this.enabled) return;
    
    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files
          .filter(f => f.endsWith('.json'))
          .map(f => fs.unlink(path.join(this.cacheDir, f)).catch(() => {}))
      );
    } catch (error) {
      console.warn('Failed to clear cache:', error.message);
    }
  }
}

module.exports = Cache;