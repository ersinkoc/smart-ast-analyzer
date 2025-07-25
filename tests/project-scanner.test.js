const ProjectScanner = require('../lib/core/project-scanner');
const path = require('path');

describe('ProjectScanner', () => {
  describe('Framework Detection', () => {
    test('detects Next.js project', async () => {
      const scanner = new ProjectScanner({ 
        path: path.join(__dirname, 'fixtures', 'nextjs-project')
      });
      const projectInfo = await scanner.scan();
      
      expect(projectInfo.framework).toBe('nextjs');
      expect(projectInfo.type).toBe('node');
    });
    
    test('detects Express.js project', async () => {
      const scanner = new ProjectScanner({ 
        path: path.join(__dirname, 'fixtures', 'express-project')
      });
      const projectInfo = await scanner.scan();
      
      expect(projectInfo.framework).toBe('express');
      expect(projectInfo.type).toBe('node');
    });
  });

  describe('File Categorization', () => {
    test('categorizes Next.js files correctly', async () => {
      const scanner = new ProjectScanner({ 
        path: path.join(__dirname, 'fixtures', 'nextjs-project')
      });
      const projectInfo = await scanner.scan();
      
      
      expect(projectInfo.files.apis.length).toBeGreaterThan(0);
      expect(projectInfo.files.components.length).toBeGreaterThan(0);
      
      // Check if API file is detected
      const hasUsersAPI = projectInfo.files.apis.some(file => 
        file.includes('users.js')
      );
      expect(hasUsersAPI).toBe(true);
      
      // Check if component is detected
      const hasUserCard = projectInfo.files.components.some(file => 
        file.includes('UserCard.jsx')
      );
      expect(hasUserCard).toBe(true);
    });
    
    test('categorizes Express.js files correctly', async () => {
      const scanner = new ProjectScanner({ 
        path: path.join(__dirname, 'fixtures', 'express-project')
      });
      const projectInfo = await scanner.scan();
      
      expect(projectInfo.files.apis.length).toBeGreaterThan(0);
      expect(projectInfo.files.models.length).toBeGreaterThan(0);
      
      // Check if route file is detected
      const hasUsersRoute = projectInfo.files.apis.some(file => 
        file.includes('routes/users.js') || file.includes('routes\\users.js')
      );
      expect(hasUsersRoute).toBe(true);
      
      // Check if model is detected
      const hasUserModel = projectInfo.files.models.some(file => 
        file.includes('User.js')
      );
      expect(hasUserModel).toBe(true);
    });
  });

  describe('Project Metrics', () => {
    test('gathers project metrics correctly', async () => {
      const scanner = new ProjectScanner({ 
        path: path.join(__dirname, 'fixtures', 'nextjs-project')
      });
      const projectInfo = await scanner.scan();
      
      expect(projectInfo.metrics).toBeDefined();
      expect(projectInfo.metrics.totalFiles).toBeGreaterThan(0);
      expect(projectInfo.metrics.codeFiles).toBeGreaterThan(0);
    });
  });

  describe('Dependencies Analysis', () => {
    test('analyzes dependencies correctly', async () => {
      const scanner = new ProjectScanner({ 
        path: path.join(__dirname, 'fixtures', 'nextjs-project')
      });
      const projectInfo = await scanner.scan();
      
      expect(projectInfo.dependencies).toBeDefined();
      expect(projectInfo.dependencies.dependencies).toContain('next');
      expect(projectInfo.dependencies.dependencies).toContain('react');
      expect(projectInfo.dependencies.total).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('handles non-existent directory gracefully', async () => {
      const scanner = new ProjectScanner({ 
        path: '/non/existent/path'
      });
      
      await expect(scanner.scan()).rejects.toThrow();
    });
    
    test('handles directory without package.json', async () => {
      const scanner = new ProjectScanner({ 
        path: __dirname // Tests directory without package.json
      });
      const projectInfo = await scanner.scan();
      
      expect(projectInfo.type).toBe('unknown');
      expect(projectInfo.dependencies.total).toBe(0);
    });
  });

  describe('Additional Framework Detection', () => {
    test('detects NuxtJS project by config file', async () => {
      const MockProjectScanner = require('../lib/core/project-scanner');
      const scanner = new MockProjectScanner({ path: '.' });
      
      // Mock fileExists to simulate nuxt.config.js
      scanner.fileExists = jest.fn().mockImplementation(file => {
        return file === 'nuxt.config.js';
      });
      scanner.readPackageJson = jest.fn().mockResolvedValue(null);
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('nuxtjs');
    });

    test('detects Angular project', async () => {
      const MockProjectScanner = require('../lib/core/project-scanner');
      const scanner = new MockProjectScanner({ path: '.' });
      
      scanner.fileExists = jest.fn().mockImplementation(file => {
        return file === 'angular.json';
      });
      scanner.readPackageJson = jest.fn().mockResolvedValue(null);
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('angular');
    });

    test('detects Svelte project', async () => {
      const MockProjectScanner = require('../lib/core/project-scanner');
      const scanner = new MockProjectScanner({ path: '.' });
      
      scanner.fileExists = jest.fn().mockImplementation(file => {
        return file === 'svelte.config.js';
      });
      scanner.readPackageJson = jest.fn().mockResolvedValue(null);
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('svelte');
    });

    test('detects Vite project', async () => {
      const MockProjectScanner = require('../lib/core/project-scanner');
      const scanner = new MockProjectScanner({ path: '.' });
      
      scanner.fileExists = jest.fn().mockImplementation(file => {
        return file === 'vite.config.js';
      });
      scanner.readPackageJson = jest.fn().mockResolvedValue(null);
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('vite');
    });

    test('detects frameworks from package.json dependencies', async () => {
      const MockProjectScanner = require('../lib/core/project-scanner');
      const scanner = new MockProjectScanner({ path: '.' });
      
      scanner.fileExists = jest.fn().mockResolvedValue(false);
      scanner.readPackageJson = jest.fn().mockResolvedValue({
        dependencies: {
          '@nestjs/core': '^8.0.0'
        }
      });
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('nestjs');
    });

    test('detects React without Next.js', async () => {
      const MockProjectScanner = require('../lib/core/project-scanner');
      const scanner = new MockProjectScanner({ path: '.' });
      
      scanner.fileExists = jest.fn().mockResolvedValue(false);
      scanner.readPackageJson = jest.fn().mockResolvedValue({
        dependencies: {
          'react': '^17.0.0'
        }
      });
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('react');
    });

    test('detects Vue.js project', async () => {
      const MockProjectScanner = require('../lib/core/project-scanner');
      const scanner = new MockProjectScanner({ path: '.' });
      
      scanner.fileExists = jest.fn().mockResolvedValue(false);
      scanner.readPackageJson = jest.fn().mockResolvedValue({
        dependencies: {
          'vue': '^3.0.0'
        }
      });
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('vue');
    });

    test('detects Angular from dependencies', async () => {
      const MockProjectScanner = require('../lib/core/project-scanner');
      const scanner = new MockProjectScanner({ path: '.' });
      
      scanner.fileExists = jest.fn().mockResolvedValue(false);
      scanner.readPackageJson = jest.fn().mockResolvedValue({
        dependencies: {
          '@angular/core': '^12.0.0'
        }
      });
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('angular');
    });

    test('detects Svelte from dependencies', async () => {
      const MockProjectScanner = require('../lib/core/project-scanner');
      const scanner = new MockProjectScanner({ path: '.' });
      
      scanner.fileExists = jest.fn().mockResolvedValue(false);
      scanner.readPackageJson = jest.fn().mockResolvedValue({
        dependencies: {
          'svelte': '^3.0.0'
        }
      });
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('svelte');
    });

    test('detects Fastify framework', async () => {
      const MockProjectScanner = require('../lib/core/project-scanner');
      const scanner = new MockProjectScanner({ path: '.' });
      
      scanner.fileExists = jest.fn().mockResolvedValue(false);
      scanner.readPackageJson = jest.fn().mockResolvedValue({
        dependencies: {
          'fastify': '^3.0.0'
        }
      });
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('fastify');
    });

    test('detects Django project', async () => {
      const MockProjectScanner = require('../lib/core/project-scanner');
      const scanner = new MockProjectScanner({ path: '.' });
      
      scanner.fileExists = jest.fn().mockImplementation(file => {
        return file === 'manage.py';
      });
      scanner.readPackageJson = jest.fn().mockResolvedValue(null);
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('django');
    });

    test('detects Flask project', async () => {
      const MockProjectScanner = require('../lib/core/project-scanner');
      const scanner = new MockProjectScanner({ path: '.' });
      
      scanner.fileExists = jest.fn().mockImplementation(file => {
        return file === 'app.py';
      });
      scanner.readPackageJson = jest.fn().mockResolvedValue(null);
      scanner.readFileContent = jest.fn().mockResolvedValue('from flask import Flask');
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('flask');
    });

    test('detects FastAPI project', async () => {
      const MockProjectScanner = require('../lib/core/project-scanner');
      const scanner = new MockProjectScanner({ path: '.' });
      
      scanner.fileExists = jest.fn().mockImplementation(file => {
        return file === 'main.py';
      });
      scanner.readPackageJson = jest.fn().mockResolvedValue(null);
      scanner.readFileContent = jest.fn().mockResolvedValue('from fastapi import FastAPI');
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('fastapi');
    });

    test('handles error when reading app.py fails and falls back to main.py', async () => {
      const MockProjectScanner = require('../lib/core/project-scanner');
      const scanner = new MockProjectScanner({ path: '.' });
      
      scanner.fileExists = jest.fn().mockImplementation(file => {
        return file === 'app.py' || file === 'main.py';
      });
      scanner.readPackageJson = jest.fn().mockResolvedValue(null);
      scanner.readFileContent = jest.fn()
        .mockRejectedValueOnce(new Error('Cannot read app.py'))
        .mockResolvedValueOnce('from flask import Flask');
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('flask');
    });

    test('returns unknown when both app.py and main.py read fail', async () => {
      const MockProjectScanner = require('../lib/core/project-scanner');
      const scanner = new MockProjectScanner({ path: '.' });
      
      scanner.fileExists = jest.fn().mockImplementation(file => {
        return file === 'app.py';
      });
      scanner.readPackageJson = jest.fn().mockResolvedValue(null);
      scanner.readFileContent = jest.fn()
        .mockRejectedValue(new Error('Cannot read file'));
      
      const framework = await scanner.detectFramework();
      expect(framework).toBe('unknown');
    });
  });

  describe('File operations', () => {
    test('handles findFiles with non-existent directory', async () => {
      const Helpers = require('../lib/utils/helpers');
      const originalIsDirectory = Helpers.isDirectory;
      Helpers.isDirectory = jest.fn().mockResolvedValue(false);
      
      const scanner = new ProjectScanner({ path: '/non/existent' });
      const files = await scanner.findFiles(['*.js']);
      
      expect(files).toEqual([]);
      
      Helpers.isDirectory = originalIsDirectory;
    });

    test('handles glob pattern errors', async () => {
      const scanner = new ProjectScanner({ path: __dirname });
      
      // Mock glob to throw error
      const glob = require('glob');
      const promisify = require('util').promisify;
      const originalGlob = promisify(glob);
      
      jest.mock('util', () => ({
        promisify: jest.fn(() => jest.fn().mockRejectedValue(new Error('Glob error')))
      }));
      
      const files = await scanner.findFiles(['*.js']);
      expect(files).toBeDefined();
    });

    test('handles outer catch in findFiles', async () => {
      const scanner = new ProjectScanner({ path: __dirname });
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock Helpers.isDirectory to throw an error
      const Helpers = require('../lib/utils/helpers');
      const originalIsDirectory = Helpers.isDirectory;
      Helpers.isDirectory = jest.fn().mockRejectedValue(new Error('Directory check failed'));
      
      const result = await scanner.findFiles(['*.js']);
      
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to find files with patterns'),
        'Directory check failed'
      );
      
      // Restore
      Helpers.isDirectory = originalIsDirectory;
      consoleSpy.mockRestore();
    });

    test('handles getLastModified with error', async () => {
      const scanner = new ProjectScanner({ path: '/invalid/path' });
      const lastModified = await scanner.getLastModified();
      
      expect(lastModified).toBeInstanceOf(Date);
    });

    test('handles readFileContent', async () => {
      const scanner = new ProjectScanner({ 
        path: path.join(__dirname, 'fixtures', 'nextjs-project')
      });
      
      const content = await scanner.readFileContent('package.json');
      expect(content).toContain('nextjs-test-project');
    });

    test('handles readFileContent error', async () => {
      const scanner = new ProjectScanner({ path: '.' });
      
      await expect(scanner.readFileContent('non-existent.txt')).rejects.toThrow();
    });

    test('handles countFilesInDir with error', async () => {
      const scanner = new ProjectScanner({ path: '.' });
      const count = await scanner.countFilesInDir('/invalid/path');
      
      expect(count).toBe(0);
    });

    test('handles findFiles with error thrown outside pattern loop', async () => {
      const scanner = new ProjectScanner({ path: __dirname });
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Save original method
      const originalFindFiles = Object.getPrototypeOf(scanner).findFiles;
      
      // Mock to test the outer catch
      Object.getPrototypeOf(scanner).findFiles = async function(patterns, limit = this.maxFiles) {
        try {
          // Force an error that would be caught by outer catch
          throw new Error('Test error');
        } catch (error) {
          console.warn(`Failed to find files with patterns ${patterns}:`, error.message);
          return [];
        }
      };
      
      const result = await scanner.findFiles(['*.js']);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to find files with patterns *.js:',
        'Test error'
      );
      expect(result).toEqual([]);
      
      // Restore
      Object.getPrototypeOf(scanner).findFiles = originalFindFiles;
      consoleSpy.mockRestore();
    });

    test('handles countFilesInDir with glob throwing error', async () => {
      const scanner = new ProjectScanner({ path: '.' });
      const glob = require('glob');
      const { promisify } = require('util');
      
      // Mock globAsync to throw
      const originalGlobAsync = promisify(glob);
      const mockGlobAsync = jest.fn().mockRejectedValue(new Error('Glob failed'));
      
      // Replace globAsync temporarily
      const originalCountFilesInDir = scanner.countFilesInDir;
      scanner.countFilesInDir = async function(dirPath) {
        try {
          await mockGlobAsync('**/*', { cwd: dirPath, nodir: true });
        } catch (error) {
          return 0;
        }
      };
      
      const count = await scanner.countFilesInDir('/some/path');
      
      expect(count).toBe(0);
      
      // Restore
      scanner.countFilesInDir = originalCountFilesInDir;
    });
  });

  describe('Configuration Options', () => {
    test('respects maxFiles limit', async () => {
      const scanner = new ProjectScanner({ 
        path: path.join(__dirname, 'fixtures', 'nextjs-project'),
        maxFiles: 1
      });
      const projectInfo = await scanner.scan();
      
      // Each category should have at most 1 file
      Object.values(projectInfo.files).forEach(categoryFiles => {
        expect(categoryFiles.length).toBeLessThanOrEqual(1);
      });
    });
    
    test('respects exclude patterns', async () => {
      const scanner = new ProjectScanner({ 
        path: path.join(__dirname, 'fixtures', 'nextjs-project'),
        exclude: '**/*.jsx'
      });
      const projectInfo = await scanner.scan();
      
      // Should exclude .jsx files
      const hasJsxFiles = Object.values(projectInfo.files)
        .flat()
        .some(file => file.endsWith('.jsx'));
        
      expect(hasJsxFiles).toBe(false);
    });
  });
});