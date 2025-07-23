const FileReader = require('../lib/core/file-reader');
const path = require('path');
const fs = require('fs').promises;

describe('FileReader', () => {
  let tempFiles = [];

  afterEach(async () => {
    // Clean up temp files
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    tempFiles = [];
  });

  describe('File Reading', () => {
    test('reads files successfully', async () => {
      const fileReader = new FileReader();
      const testFile = path.join(__dirname, 'fixtures', 'nextjs-project', 'package.json');
      
      const result = await fileReader.readFile(testFile);
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.path).toBe(testFile);
      expect(result.size).toBeGreaterThan(0);
      expect(result.lines).toBeGreaterThan(0);
      expect(result.extension).toBe('.json');
    });

    test('reads multiple files', async () => {
      const fileReader = new FileReader();
      const testFiles = [
        path.join(__dirname, 'fixtures', 'nextjs-project', 'package.json'),
        path.join(__dirname, 'fixtures', 'nextjs-project', 'pages', 'api', 'users.js')
      ];
      
      const results = await fileReader.readFiles(testFiles);
      
      expect(results).toHaveLength(2);
      expect(results[0].content).toBeDefined();
      expect(results[1].content).toBeDefined();
    });

    test('handles non-existent files gracefully', async () => {
      const fileReader = new FileReader();
      const nonExistentFile = path.join(__dirname, 'non-existent-file.js');
      
      const results = await fileReader.readFiles([nonExistentFile]);
      
      expect(results).toHaveLength(0);
    });

    test('skips large files', async () => {
      const fileReader = new FileReader({ maxFileSize: 100 }); // 100 bytes limit
      
      // Create a large temp file
      const tempFile = path.join(__dirname, 'large-temp-file.js');
      tempFiles.push(tempFile);
      
      const largeContent = 'x'.repeat(200); // 200 bytes
      await fs.writeFile(tempFile, largeContent);
      
      const results = await fileReader.readFiles([tempFile]);
      
      expect(results).toHaveLength(0); // Should skip large file
    });
  });

  describe('Package.json Reading', () => {
    test('reads package.json correctly', async () => {
      const fileReader = new FileReader();
      const projectPath = path.join(__dirname, 'fixtures', 'nextjs-project');
      
      const packageJson = await fileReader.readPackageJson(projectPath);
      
      expect(packageJson).toBeDefined();
      expect(packageJson.name).toBe('nextjs-test-project');
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.dependencies.next).toBeDefined();
    });

    test('handles missing package.json', async () => {
      const fileReader = new FileReader();
      const projectPath = path.join(__dirname, 'non-existent');
      
      const packageJson = await fileReader.readPackageJson(projectPath);
      
      expect(packageJson).toBeNull();
    });
  });

  describe('File Filtering', () => {
    test('excludes files based on patterns', async () => {
      const fileReader = new FileReader({
        exclude: ['**/*.json']
      });
      
      const shouldExclude = fileReader.shouldExcludeFile('/project/package.json');
      const shouldInclude = fileReader.shouldExcludeFile('/project/index.js');
      
      expect(shouldExclude).toBe(true);
      expect(shouldInclude).toBe(false);
    });

    test('excludes default patterns', async () => {
      const fileReader = new FileReader();
      
      expect(fileReader.shouldExcludeFile('/project/node_modules/lib.js')).toBe(true);
      expect(fileReader.shouldExcludeFile('/project/.git/config')).toBe(true);
      expect(fileReader.shouldExcludeFile('/project/dist/bundle.js')).toBe(true);
      expect(fileReader.shouldExcludeFile('/project/src/index.js')).toBe(false);
    });
  });

  describe('File Metadata', () => {
    test('extracts correct metadata', async () => {
      const fileReader = new FileReader();
      const testFile = path.join(__dirname, 'fixtures', 'nextjs-project', 'components', 'UserCard.jsx');
      
      const result = await fileReader.readFile(testFile);
      
      expect(result.extension).toBe('.jsx');
      expect(result.lines).toBeGreaterThan(10); // Should have multiple lines
      expect(result.relativePath).toBeTruthy();
      expect(result.lastModified instanceof Date || Object.prototype.toString.call(result.lastModified) === '[object Date]').toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('handles file read errors gracefully', async () => {
      const fileReader = new FileReader();
      const restrictedFile = '/root/restricted-file.js';
      
      await expect(fileReader.readFile(restrictedFile)).rejects.toThrow();
    });

    test('continues processing other files when one fails', async () => {
      const fileReader = new FileReader();
      const validFile = path.join(__dirname, 'fixtures', 'nextjs-project', 'package.json');
      const invalidFile = '/non/existent/file.js';
      
      const results = await fileReader.readFiles([validFile, invalidFile]);
      
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe(validFile);
    });
  });
});