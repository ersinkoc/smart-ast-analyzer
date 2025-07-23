const Cache = require('../../lib/utils/cache');
const fs = require('fs').promises;
const path = require('path');

// Mock fs
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn()
  }
}));

describe('Cache', () => {
  let cache;
  const mockCacheDir = '.smart-ast-cache';

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new Cache(true, { directory: mockCacheDir, ttl: 1000 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with default values', () => {
      const defaultCache = new Cache();
      expect(defaultCache.enabled).toBe(true);
      expect(defaultCache.cacheDir).toBe('.smart-ast-cache');
      expect(defaultCache.ttl).toBe(3600000);
    });

    test('initializes with custom options', () => {
      const customCache = new Cache(false, { directory: 'custom-cache', ttl: 5000 });
      expect(customCache.enabled).toBe(false);
      expect(customCache.cacheDir).toBe('custom-cache');
      expect(customCache.ttl).toBe(5000);
    });

    test('calls ensureCacheDir during initialization', async () => {
      const mkdirSpy = fs.mkdir.mockResolvedValue();
      new Cache(true, { directory: 'test-cache' });
      
      // Allow async operation to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mkdirSpy).toHaveBeenCalledWith('test-cache', { recursive: true });
    });
  });

  describe('ensureCacheDir', () => {
    test('creates cache directory when enabled', async () => {
      const mkdirSpy = fs.mkdir.mockResolvedValue();
      
      await cache.ensureCacheDir();
      
      expect(mkdirSpy).toHaveBeenCalledWith(mockCacheDir, { recursive: true });
    });

    test('does nothing when cache is disabled', async () => {
      jest.clearAllMocks(); // Clear any calls from constructor
      const disabledCache = new Cache(false);
      const mkdirSpy = fs.mkdir.mockResolvedValue();
      
      await disabledCache.ensureCacheDir();
      
      // Should only have been called from constructor if at all
      expect(mkdirSpy).toHaveBeenCalledTimes(0);
    });

    test('disables cache on directory creation failure', async () => {
      const mkdirSpy = fs.mkdir.mockRejectedValue(new Error('Permission denied'));
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      expect(cache.enabled).toBe(true);
      await cache.ensureCacheDir();
      
      expect(cache.enabled).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to create cache directory:', 'Permission denied');
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('generateKey', () => {
    test('generates a key when enabled', () => {
      const files = ['file1.js', 'file2.js'];
      const key = cache.generateKey('api', files);
      
      expect(key).toBeDefined();
      expect(key).toMatch(/^api-[a-f0-9]{32}$/);
    });

    test('returns null when disabled', () => {
      const disabledCache = new Cache(false);
      const key = disabledCache.generateKey('api', ['file1.js']);
      
      expect(key).toBeNull();
    });

    test('generates different keys for different inputs', () => {
      const key1 = cache.generateKey('api', ['file1.js']);
      const key2 = cache.generateKey('api', ['file2.js']);
      const key3 = cache.generateKey('components', ['file1.js']);
      
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });
  });

  describe('get', () => {
    test('returns cached data when valid', async () => {
      const mockData = { result: 'cached data' };
      const cacheFile = path.join(mockCacheDir, 'test-key.json');
      
      fs.stat.mockResolvedValue({ 
        mtime: { getTime: () => Date.now() - 500 } // 500ms ago, within TTL
      });
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));
      
      const result = await cache.get('test-key');
      
      expect(fs.stat).toHaveBeenCalledWith(cacheFile);
      expect(fs.readFile).toHaveBeenCalledWith(cacheFile, 'utf-8');
      expect(result).toEqual(mockData);
    });

    test('returns null when cache is disabled', async () => {
      const disabledCache = new Cache(false);
      const result = await disabledCache.get('test-key');
      
      expect(result).toBeNull();
      expect(fs.stat).not.toHaveBeenCalled();
    });

    test('returns null when key is not provided', async () => {
      const result = await cache.get(null);
      
      expect(result).toBeNull();
      expect(fs.stat).not.toHaveBeenCalled();
    });

    test('removes expired cache and returns null', async () => {
      const cacheFile = path.join(mockCacheDir, 'expired-key.json');
      
      fs.stat.mockResolvedValue({ 
        mtime: { getTime: () => Date.now() - 2000 } // 2s ago, beyond TTL of 1s
      });
      fs.unlink.mockResolvedValue();
      
      const result = await cache.get('expired-key');
      
      expect(fs.stat).toHaveBeenCalledWith(cacheFile);
      expect(fs.unlink).toHaveBeenCalledWith(cacheFile);
      expect(result).toBeNull();
    });

    test('returns null on file read error', async () => {
      fs.stat.mockRejectedValue(new Error('File not found'));
      
      const result = await cache.get('missing-key');
      
      expect(result).toBeNull();
    });

    test('handles JSON parse error gracefully', async () => {
      const cacheFile = path.join(mockCacheDir, 'invalid-json.json');
      
      fs.stat.mockResolvedValue({ 
        mtime: { getTime: () => Date.now() - 500 }
      });
      fs.readFile.mockResolvedValue('invalid json content');
      
      const result = await cache.get('invalid-json');
      
      expect(result).toBeNull();
    });

    test('handles unlink error gracefully when removing expired cache', async () => {
      const cacheFile = path.join(mockCacheDir, 'expired-key.json');
      
      fs.stat.mockResolvedValue({ 
        mtime: { getTime: () => Date.now() - 2000 }
      });
      fs.unlink.mockRejectedValue(new Error('Cannot delete file'));
      
      const result = await cache.get('expired-key');
      
      expect(result).toBeNull();
      expect(fs.unlink).toHaveBeenCalledWith(cacheFile);
    });
  });

  describe('set', () => {
    test('writes data to cache when enabled', async () => {
      const mockData = { result: 'data to cache' };
      const cacheFile = path.join(mockCacheDir, 'test-key.json');
      
      fs.writeFile.mockResolvedValue();
      
      await cache.set('test-key', mockData);
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        cacheFile, 
        JSON.stringify(mockData, null, 2)
      );
    });

    test('does nothing when cache is disabled', async () => {
      const disabledCache = new Cache(false);
      
      await disabledCache.set('test-key', { data: 'test' });
      
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    test('does nothing when key is not provided', async () => {
      await cache.set(null, { data: 'test' });
      
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    test('handles write error gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      fs.writeFile.mockRejectedValue(new Error('Disk full'));
      
      await cache.set('test-key', { data: 'test' });
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to write cache:', 'Disk full');
      consoleWarnSpy.mockRestore();
    });
  });

  describe('clear', () => {
    test('removes all cache files when enabled', async () => {
      const mockFiles = ['file1.json', 'file2.json', 'not-cache.txt'];
      
      fs.readdir.mockResolvedValue(mockFiles);
      fs.unlink.mockResolvedValue();
      
      await cache.clear();
      
      expect(fs.readdir).toHaveBeenCalledWith(mockCacheDir);
      expect(fs.unlink).toHaveBeenCalledTimes(2); // Only .json files
      expect(fs.unlink).toHaveBeenCalledWith(path.join(mockCacheDir, 'file1.json'));
      expect(fs.unlink).toHaveBeenCalledWith(path.join(mockCacheDir, 'file2.json'));
      expect(fs.unlink).not.toHaveBeenCalledWith(path.join(mockCacheDir, 'not-cache.txt'));
    });

    test('does nothing when cache is disabled', async () => {
      const disabledCache = new Cache(false);
      
      await disabledCache.clear();
      
      expect(fs.readdir).not.toHaveBeenCalled();
    });

    test('handles readdir error gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      fs.readdir.mockRejectedValue(new Error('Directory not found'));
      
      await cache.clear();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to clear cache:', 'Directory not found');
      consoleWarnSpy.mockRestore();
    });

    test('handles individual file deletion errors gracefully', async () => {
      const mockFiles = ['file1.json', 'file2.json'];
      
      fs.readdir.mockResolvedValue(mockFiles);
      fs.unlink.mockRejectedValue(new Error('File in use'));
      
      // Should not throw error even if individual files can't be deleted
      await cache.clear();
      
      expect(fs.unlink).toHaveBeenCalledTimes(2);
    });

    test('filters out non-json files correctly', async () => {
      const mockFiles = ['cache1.json', 'cache2.JSON', 'config.txt', 'data.xml', 'result.json'];
      
      fs.readdir.mockResolvedValue(mockFiles);
      fs.unlink.mockResolvedValue();
      
      await cache.clear();
      
      // Should only delete .json files (case sensitive)
      expect(fs.unlink).toHaveBeenCalledTimes(2);
      expect(fs.unlink).toHaveBeenCalledWith(path.join(mockCacheDir, 'cache1.json'));
      expect(fs.unlink).toHaveBeenCalledWith(path.join(mockCacheDir, 'result.json'));
    });
  });

  describe('integration scenarios', () => {
    test('complete cache lifecycle', async () => {
      const testData = { analysis: 'complete', timestamp: Date.now() };
      const key = cache.generateKey('test', ['file1.js']);
      
      // Set up successful operations
      fs.writeFile.mockResolvedValue();
      fs.stat.mockResolvedValue({ 
        mtime: { getTime: () => Date.now() - 100 }
      });
      fs.readFile.mockResolvedValue(JSON.stringify(testData));
      
      // Set data
      await cache.set(key, testData);
      expect(fs.writeFile).toHaveBeenCalled();
      
      // Get data
      const retrieved = await cache.get(key);
      expect(retrieved).toEqual(testData);
      
      // Clear cache
      fs.readdir.mockResolvedValue([`${key}.json`]);
      fs.unlink.mockResolvedValue();
      
      await cache.clear();
      expect(fs.unlink).toHaveBeenCalled();
    });
  });
});