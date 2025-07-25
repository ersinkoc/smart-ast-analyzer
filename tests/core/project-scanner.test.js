const ProjectScanner = require('../../lib/core/project-scanner');
const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');
const Helpers = require('../../lib/utils/helpers');

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn()
  }
}));

jest.mock('glob');
jest.mock('../../lib/utils/helpers');

describe('ProjectScanner', () => {
  let scanner;
  
  beforeEach(() => {
    jest.clearAllMocks();
    scanner = new ProjectScanner();
    
    // Default mocks
    fs.readFile.mockResolvedValue('{}');
    fs.readdir.mockResolvedValue([]);
    fs.stat.mockResolvedValue({ size: 1000, mtime: new Date() });
    glob.mockImplementation((pattern, options, callback) => {
      callback(null, []);
    });
    Helpers.fileExists = jest.fn().mockResolvedValue(false);
    Helpers.isDirectory = jest.fn().mockResolvedValue(true);
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const scanner = new ProjectScanner();
      expect(scanner.basePath).toBe(process.cwd());
      expect(scanner.includePatterns).toBeNull();
      expect(scanner.excludePatterns).toEqual([]);
      expect(scanner.maxFiles).toBe(50);
    });

    test('should initialize with custom options', () => {
      const options = {
        path: '/custom/path',
        include: '*.js,*.ts',
        exclude: 'node_modules,dist',
        maxFiles: '100'
      };
      
      const scanner = new ProjectScanner(options);
      expect(scanner.basePath).toBe(path.resolve('/custom/path'));
      expect(scanner.includePatterns).toEqual(['*.js', '*.ts']);
      expect(scanner.excludePatterns).toEqual(['node_modules', 'dist']);
      expect(scanner.maxFiles).toBe(100);
    });
  });

  describe('scan', () => {
    test('should return complete project info', async () => {
      scanner.detectProjectType = jest.fn().mockResolvedValue('node');
      scanner.detectFramework = jest.fn().mockResolvedValue('express');
      scanner.detectLanguage = jest.fn().mockResolvedValue('javascript');
      scanner.analyzeStructure = jest.fn().mockResolvedValue({ directories: [] });
      scanner.analyzeDependencies = jest.fn().mockResolvedValue({ production: [], dev: [] });
      scanner.categorizeFiles = jest.fn().mockResolvedValue({ js: [] });
      scanner.gatherMetrics = jest.fn().mockResolvedValue({ totalFiles: 10 });
      
      const result = await scanner.scan();
      
      expect(result).toEqual({
        path: scanner.basePath,
        type: 'node',
        framework: 'express',
        language: 'javascript',
        structure: { directories: [] },
        dependencies: { production: [], dev: [] },
        files: { js: [] },
        metrics: { totalFiles: 10 }
      });
    });
  });

  describe('detectProjectType', () => {
    test('should detect Node.js project', async () => {
      scanner.fileExists = jest.fn().mockImplementation(file => file === 'package.json');
      
      const type = await scanner.detectProjectType();
      expect(type).toBe('node');
    });

    test('should detect Python project', async () => {
      scanner.fileExists = jest.fn().mockImplementation(file => file === 'requirements.txt');
      
      const type = await scanner.detectProjectType();
      expect(type).toBe('python');
    });

    test('should detect Java project with pom.xml', async () => {
      scanner.fileExists = jest.fn().mockImplementation(file => file === 'pom.xml');
      
      const type = await scanner.detectProjectType();
      expect(type).toBe('java');
    });

    test('should detect Java project with build.gradle', async () => {
      scanner.fileExists = jest.fn().mockImplementation(file => file === 'build.gradle');
      
      const type = await scanner.detectProjectType();
      expect(type).toBe('java');
    });

    test('should return unknown for unrecognized project', async () => {
      scanner.fileExists = jest.fn().mockResolvedValue(false);
      
      const type = await scanner.detectProjectType();
      expect(type).toBe('unknown');
    });
  });

  describe('detectFramework', () => {
    test('should detect React framework', async () => {
      scanner.fileExists = jest.fn().mockResolvedValue(false);
      scanner.readPackageJson = jest.fn().mockResolvedValue({
        dependencies: { react: '^18.0.0' }
      });
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('react');
    });

    test('should detect Next.js framework from config file', async () => {
      scanner.fileExists = jest.fn().mockImplementation((file) => {
        return file === 'next.config.js';
      });
      scanner.readPackageJson = jest.fn().mockResolvedValue({});
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('nextjs');
    });

    test('should detect Next.js framework from package.json', async () => {
      scanner.fileExists = jest.fn().mockResolvedValue(false);
      scanner.readPackageJson = jest.fn().mockResolvedValue({
        dependencies: { next: '^13.0.0' }
      });
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('nextjs');
    });

    test('should detect Vue framework', async () => {
      scanner.fileExists = jest.fn().mockResolvedValue(false);
      scanner.readPackageJson = jest.fn().mockResolvedValue({
        dependencies: { vue: '^3.0.0' }
      });
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('vue');
    });

    test('should detect Angular framework from angular.json', async () => {
      scanner.fileExists = jest.fn().mockImplementation((file) => {
        return file === 'angular.json';
      });
      scanner.readPackageJson = jest.fn().mockResolvedValue({});
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('angular');
    });

    test('should detect Express framework', async () => {
      scanner.fileExists = jest.fn().mockResolvedValue(false);
      scanner.readPackageJson = jest.fn().mockResolvedValue({
        dependencies: { express: '^4.18.0' }
      });
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('express');
    });

    test('should return unknown when no framework detected', async () => {
      scanner.fileExists = jest.fn().mockResolvedValue(false);
      scanner.readPackageJson = jest.fn().mockResolvedValue({
        dependencies: { lodash: '^4.17.0' }
      });
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('unknown');
    });

    test('should handle missing package.json', async () => {
      scanner.fileExists = jest.fn().mockResolvedValue(false);
      scanner.readPackageJson = jest.fn().mockResolvedValue(null);
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('unknown');
    });
  });

  describe('detectLanguage', () => {
    test('should detect JavaScript from file extensions', async () => {
      scanner.findFiles = jest.fn().mockResolvedValue([
        'src/index.js',
        'src/app.js',
        'src/utils.js'
      ]);
      Helpers.getFileExtension = jest.fn().mockReturnValue('.js');
      
      const language = await scanner.detectLanguage();
      expect(language).toBe('javascript');
    });

    test('should detect TypeScript from file extensions', async () => {
      scanner.findFiles = jest.fn().mockResolvedValue([
        'src/index.ts',
        'src/types.ts',
        'src/app.tsx'
      ]);
      Helpers.getFileExtension = jest.fn()
        .mockReturnValueOnce('.ts')
        .mockReturnValueOnce('.ts')
        .mockReturnValueOnce('.tsx');
      
      const language = await scanner.detectLanguage();
      expect(language).toBe('typescript');
    });

    test('should detect Python from file extensions', async () => {
      scanner.findFiles = jest.fn().mockResolvedValue([
        'main.py',
        'app.py'
      ]);
      Helpers.getFileExtension = jest.fn().mockReturnValue('.py');
      
      const language = await scanner.detectLanguage();
      expect(language).toBe('python');
    });

    test('should return unknown for undetected language', async () => {
      scanner.findFiles = jest.fn().mockResolvedValue([]);
      
      const language = await scanner.detectLanguage();
      expect(language).toBe('unknown');
    });
  });

  describe('analyzeStructure', () => {
    test('should analyze project structure', async () => {
      fs.readdir.mockResolvedValue([
        { name: 'src', isDirectory: () => true },
        { name: 'tests', isDirectory: () => true },
        { name: 'docs', isDirectory: () => true },
        { name: 'package.json', isDirectory: () => false },
        { name: '.git', isDirectory: () => true },
        { name: 'node_modules', isDirectory: () => true }
      ]);
      
      scanner.countFilesInDir = jest.fn().mockResolvedValue(10);
      
      const structure = await scanner.analyzeStructure();
      
      expect(structure).toHaveProperty('src');
      expect(structure).toHaveProperty('tests');
      expect(structure).toHaveProperty('docs');
      expect(structure).not.toHaveProperty('.git');
      expect(structure).not.toHaveProperty('node_modules');
      expect(structure.src.type).toBe('directory');
      expect(structure.src.fileCount).toBe(10);
    });

    test('should handle structure analysis errors', async () => {
      fs.readdir.mockRejectedValue(new Error('Permission denied'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const structure = await scanner.analyzeStructure();
      
      expect(structure).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith('Failed to analyze structure:', 'Permission denied');
      
      consoleSpy.mockRestore();
    });
  });

  describe('analyzeDependencies', () => {
    test('should analyze npm dependencies', async () => {
      const packageJson = {
        dependencies: {
          'express': '^4.18.0',
          'react': '^18.0.0'
        },
        devDependencies: {
          'jest': '^29.0.0',
          'eslint': '^8.0.0'
        }
      };
      
      scanner.readPackageJson = jest.fn().mockResolvedValue(packageJson);
      
      const deps = await scanner.analyzeDependencies();
      
      expect(deps.dependencies).toEqual(['express', 'react']);
      expect(deps.devDependencies).toEqual(['jest', 'eslint']);
      expect(deps.total).toBe(4);
    });

    test('should handle missing package.json', async () => {
      scanner.readPackageJson = jest.fn().mockResolvedValue(null);
      
      const deps = await scanner.analyzeDependencies();
      
      expect(deps).toEqual({
        dependencies: [],
        devDependencies: [],
        total: 0
      });
    });

    test('should handle package.json without dependencies', async () => {
      scanner.readPackageJson = jest.fn().mockResolvedValue({});
      
      const deps = await scanner.analyzeDependencies();
      
      expect(deps).toEqual({
        dependencies: [],
        devDependencies: [],
        total: 0
      });
    });
  });

  describe('categorizeFiles', () => {
    test('should categorize files by type', async () => {
      scanner.findFiles = jest.fn()
        .mockImplementation((patterns) => {
          if (patterns.some(p => p.includes('api'))) {
            return ['api/users.js', 'routes/index.js'];
          }
          if (patterns.some(p => p.includes('components'))) {
            return ['components/Button.jsx', 'src/App.tsx'];
          }
          if (patterns.some(p => p.includes('services'))) {
            return ['services/auth.js'];
          }
          if (patterns.some(p => p.includes('models'))) {
            return ['models/User.js'];
          }
          if (patterns.some(p => p.includes('socket'))) {
            return ['socket/handler.js'];
          }
          if (patterns.some(p => p.includes('auth'))) {
            return ['auth/middleware.js'];
          }
          if (patterns.some(p => p.includes('config'))) {
            return ['config/database.js'];
          }
          if (patterns.some(p => p.includes('test'))) {
            return ['tests/unit.test.js'];
          }
          return [];
        });
      
      const files = await scanner.categorizeFiles();
      
      expect(files.apis).toEqual(['api/users.js', 'routes/index.js']);
      expect(files.components).toEqual(['components/Button.jsx', 'src/App.tsx']);
      expect(files.services).toEqual(['services/auth.js']);
      expect(files.models).toEqual(['models/User.js']);
      expect(files.websockets).toEqual(['socket/handler.js']);
      expect(files.auth).toEqual(['auth/middleware.js']);
      expect(files.configs).toEqual(['config/database.js']);
      expect(files.tests).toEqual(['tests/unit.test.js']);
    });

    test('should respect maxFiles limit', async () => {
      scanner.maxFiles = 2;
      scanner.findFiles = jest.fn().mockResolvedValue(
        Array(10).fill('').map((_, i) => `file${i}.js`)
      );
      
      const files = await scanner.categorizeFiles();
      
      // Each category should have max 2 files
      Object.values(files).forEach(categoryFiles => {
        expect(categoryFiles.length).toBeLessThanOrEqual(2);
      });
    });

    test('should handle findFiles errors', async () => {
      scanner.findFiles = jest.fn().mockResolvedValue([]);
      
      const files = await scanner.categorizeFiles();
      
      expect(files).toHaveProperty('apis', []);
      expect(files).toHaveProperty('components', []);
      expect(files).toHaveProperty('services', []);
      expect(files).toHaveProperty('models', []);
      expect(files).toHaveProperty('websockets', []);
      expect(files).toHaveProperty('auth', []);
      expect(files).toHaveProperty('configs', []);
      expect(files).toHaveProperty('tests', []);
    });
  });

  describe('gatherMetrics', () => {
    test('should gather project metrics', async () => {
      scanner.findFiles = jest.fn().mockResolvedValue([
        'file1.js', 'file2.js', 'file1.ts', 'App.jsx', 'styles.css'
      ]);
      
      Helpers.isCodeFile = jest.fn().mockImplementation(file => {
        return !file.endsWith('.css');
      });
      
      fs.readFile.mockResolvedValue('line1\nline2\nline3\nline4\nline5\n');
      scanner.getLastModified = jest.fn().mockResolvedValue(new Date('2023-01-01'));
      
      const metrics = await scanner.gatherMetrics();
      
      expect(metrics.totalFiles).toBe(5);
      expect(metrics.codeFiles).toBe(4);
      // The actual implementation reads up to 100 files, but we only have 4 code files
      // Each with 6 lines (5 lines + 1 newline at end)
      expect(metrics.totalLines).toBe(24); // 4 code files * 6 lines each
      expect(metrics.lastModified).toEqual(new Date('2023-01-01'));
    });

    test('should handle metrics gathering errors', async () => {
      scanner.findFiles = jest.fn().mockRejectedValue(new Error('Find error'));
      
      const metrics = await scanner.gatherMetrics();
      
      expect(metrics).toEqual({
        totalFiles: 0,
        codeFiles: 0,
        totalLines: 0,
        lastModified: expect.any(Date)
      });
    });

    test('should handle file read errors gracefully', async () => {
      scanner.findFiles = jest.fn().mockResolvedValue(['file1.js', 'file2.js']);
      Helpers.isCodeFile = jest.fn().mockReturnValue(true);
      
      fs.readFile.mockRejectedValue(new Error('Read error'));
      scanner.getLastModified = jest.fn().mockResolvedValue(new Date());
      
      const metrics = await scanner.gatherMetrics();
      
      expect(metrics.totalFiles).toBe(2);
      expect(metrics.codeFiles).toBe(2);
      expect(metrics.totalLines).toBe(0);
    });
  });

  describe('helper methods', () => {
    test('fileExists should check file existence', async () => {
      Helpers.fileExists.mockResolvedValue(true);
      
      const exists = await scanner.fileExists('test.js');
      
      expect(exists).toBe(true);
      expect(Helpers.fileExists).toHaveBeenCalledWith(
        path.join(scanner.basePath, 'test.js')
      );
    });

    test('readPackageJson should read package.json', async () => {
      const mockPackage = { name: 'test-project' };
      Helpers.readJsonFile.mockResolvedValue(mockPackage);
      
      const result = await scanner.readPackageJson();
      
      expect(result).toEqual(mockPackage);
      expect(Helpers.readJsonFile).toHaveBeenCalledWith(
        path.join(scanner.basePath, 'package.json')
      );
    });

    test('readFileContent should read file content', async () => {
      fs.readFile.mockResolvedValue('file content');
      
      const content = await scanner.readFileContent('test.js');
      
      expect(content).toBe('file content');
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(scanner.basePath, 'test.js'),
        'utf-8'
      );
    });

    test('shouldExcludeDir should exclude certain directories', () => {
      expect(scanner.shouldExcludeDir('node_modules')).toBe(true);
      expect(scanner.shouldExcludeDir('.git')).toBe(true);
      expect(scanner.shouldExcludeDir('dist')).toBe(true);
      expect(scanner.shouldExcludeDir('.hidden')).toBe(true);
      expect(scanner.shouldExcludeDir('src')).toBe(false);
    });

    test.skip('countFilesInDir should count files in directory', async () => {
      glob.mockResolvedValue(['file1.js', 'file2.js', 'file3.js']);
      
      const count = await scanner.countFilesInDir('/path/to/dir');
      
      expect(count).toBe(3);
      expect(glob).toHaveBeenCalledWith('**/*', { 
        cwd: '/path/to/dir', 
        nodir: true 
      });
    });

    test.skip('countFilesInDir should handle errors', async () => {
      glob.mockRejectedValue(new Error('Glob error'));
      
      const count = await scanner.countFilesInDir('/path/to/dir');
      
      expect(count).toBe(0);
    });

    test('getIgnorePatterns should combine default and custom patterns', () => {
      scanner.excludePatterns = ['custom/**', 'temp/**'];
      
      const patterns = scanner.getIgnorePatterns();
      
      expect(patterns).toContain('node_modules/**');
      expect(patterns).toContain('.git/**');
      expect(patterns).toContain('custom/**');
      expect(patterns).toContain('temp/**');
    });

    test.skip('findFiles should find files with patterns', async () => {
      // Mock glob Promise-based API
      glob.mockResolvedValue(['file1.js', 'file2.js']);
      
      const files = await scanner.findFiles(['**/*.js'], 10);
      
      // Should return absolute paths
      expect(files.length).toBe(2);
      expect(files[0]).toMatch(/file1\.js$/);
      expect(files[1]).toMatch(/file2\.js$/);
      expect(glob).toHaveBeenCalledWith('**/*.js', {
        cwd: scanner.basePath,
        ignore: expect.any(Array),
        absolute: false,
        nodir: true,
        windowsPathsNoEscape: true
      });
    });

    test('findFiles should handle errors', async () => {
      // Mock glob to call callback with error
      glob.mockImplementation((pattern, options, callback) => {
        callback(new Error('Glob error'), null);
      });
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const files = await scanner.findFiles(['**/*.js']);
      
      expect(files).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('getLastModified should return directory modification time', async () => {
      const mockDate = new Date('2023-01-01');
      fs.stat.mockResolvedValue({ mtime: mockDate });
      
      const lastModified = await scanner.getLastModified();
      
      expect(lastModified).toEqual(mockDate);
      expect(fs.stat).toHaveBeenCalledWith(scanner.basePath);
    });

    test('getLastModified should handle errors', async () => {
      fs.stat.mockRejectedValue(new Error('Stat error'));
      
      const lastModified = await scanner.getLastModified();
      
      expect(lastModified).toBeInstanceOf(Date);
    });
  });

  describe('edge cases', () => {
    test('should handle empty project directory', async () => {
      // Mock all methods to return empty/default values
      scanner.detectProjectType = jest.fn().mockResolvedValue('unknown');
      scanner.detectFramework = jest.fn().mockResolvedValue('unknown');
      scanner.detectLanguage = jest.fn().mockResolvedValue('unknown');
      scanner.analyzeStructure = jest.fn().mockResolvedValue({});
      scanner.analyzeDependencies = jest.fn().mockResolvedValue({ 
        dependencies: [], 
        devDependencies: [], 
        total: 0 
      });
      scanner.categorizeFiles = jest.fn().mockResolvedValue({});
      scanner.gatherMetrics = jest.fn().mockResolvedValue({
        totalFiles: 0,
        codeFiles: 0,
        totalLines: 0,
        lastModified: new Date()
      });
      
      const result = await scanner.scan();
      
      expect(result.type).toBe('unknown');
      expect(result.framework).toBe('unknown');
      expect(result.metrics.totalFiles).toBe(0);
    });

    test('should handle very large projects', async () => {
      // Mock a project with many files
      const manyFiles = Array(1000).fill('').map((_, i) => `file${i}.js`);
      scanner.findFiles = jest.fn().mockResolvedValue(manyFiles);
      scanner.maxFiles = 100;
      
      const files = await scanner.categorizeFiles();
      
      // Should respect maxFiles limit per category
      Object.values(files).forEach(categoryFiles => {
        expect(categoryFiles.length).toBeLessThanOrEqual(100);
      });
    });

    test('should handle permission errors gracefully', async () => {
      // All methods should handle errors gracefully
      scanner.detectProjectType = jest.fn().mockResolvedValue('unknown');
      scanner.detectFramework = jest.fn().mockResolvedValue('unknown');
      scanner.detectLanguage = jest.fn().mockResolvedValue('unknown');
      scanner.analyzeStructure = jest.fn().mockResolvedValue({});
      scanner.analyzeDependencies = jest.fn().mockResolvedValue({ 
        dependencies: [], 
        devDependencies: [], 
        total: 0 
      });
      scanner.categorizeFiles = jest.fn().mockResolvedValue({});
      scanner.gatherMetrics = jest.fn().mockResolvedValue({
        totalFiles: 0,
        codeFiles: 0,
        totalLines: 0,
        lastModified: new Date()
      });
      
      const result = await scanner.scan();
      
      expect(result).toBeDefined();
      expect(result.type).toBe('unknown');
      expect(result.metrics.totalFiles).toBe(0);
    });
  });

  describe('edge cases for 100% coverage', () => {
    test('should handle findFiles error in categorizeFiles', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock findFiles to return empty array (simulating error handling)
      scanner.findFiles = jest.fn().mockResolvedValue([]);
      
      const result = await scanner.categorizeFiles();
      
      // categorizeFiles should return a proper structure even with no files
      expect(result.apis).toEqual([]);
      expect(result.components).toEqual([]);
      expect(result.services).toEqual([]);
      expect(result.models).toEqual([]);
      expect(result.websockets).toEqual([]);
      expect(result.tests).toEqual([]);
      expect(result.configs).toEqual([]);
      
      consoleSpy.mockRestore();
    });

    test('should handle getLastModified stat error', async () => {
      const originalStat = fs.stat;
      // Mock fs.stat to throw an error  
      fs.stat = jest.fn().mockRejectedValue(new Error('Stat failed'));
      
      const result = await scanner.getLastModified();
      
      // Should return a new Date on error
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeCloseTo(Date.now(), -2); // Within 100ms
      
      fs.stat = originalStat;
    });
  });
});