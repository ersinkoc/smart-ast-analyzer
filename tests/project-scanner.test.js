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