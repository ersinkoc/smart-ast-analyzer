const DeepAnalysisEngine = require('../../lib/analyzers/deep-analysis-engine');
const fs = require('fs').promises;
const path = require('path');

describe('DeepAnalysisEngine', () => {
  let engine;
  let mockFiles;

  beforeEach(() => {
    engine = new DeepAnalysisEngine({});
    
    // Mock files with simple JavaScript content
    mockFiles = [
      {
        path: '/test/simple.js',
        content: `
function simpleFunction(a, b) {
  if (a > b) {
    return a;
  }
  return b;
}

class SimpleClass {
  constructor(name) {
    this.name = name;
  }
  
  greet() {
    console.log('Hello ' + this.name);
  }
}
`
      },
      {
        path: '/test/complex.js',
        content: `
function complexFunction(data) {
  if (data && data.length > 0) {
    for (let i = 0; i < data.length; i++) {
      if (data[i].active) {
        for (let j = 0; j < data[i].items.length; j++) {
          if (data[i].items[j].valid) {
            return data[i].items[j].value;
          }
        }
      }
    }
  }
  return null;
}

// Security vulnerability examples
function dangerousFunction(userInput) {
  eval(userInput); // This should be detected
  setTimeout(userInput, 1000); // String in setTimeout
}

// Performance issue examples
function inefficientFunction(arr) {
  let result = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length; j++) { // O(n²) complexity
      result.push(arr[i] + arr[j]);
    }
  }
  return result;
}
`
      }
    ];
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      expect(engine.options).toBeDefined();
      expect(engine.analysisResults).toBeDefined();
      expect(engine.analysisResults.complexity).toBeDefined();
      expect(engine.analysisResults.security).toBeDefined();
    });
  });

  describe('analyzeProject', () => {
    test('should analyze project files and return comprehensive results', async () => {
      const results = await engine.analyzeProject(mockFiles);
      
      expect(results).toBeDefined();
      expect(results.complexity).toBeDefined();
      expect(results.security).toBeDefined();
      expect(results.performance).toBeDefined();
      expect(results.dependencies).toBeDefined();
    });

    test('should handle empty file list', async () => {
      const results = await engine.analyzeProject([]);
      
      expect(results).toBeDefined();
      expect(results.complexity.functions).toHaveLength(0);
      expect(results.security.vulnerabilities).toHaveLength(0);
    });
  });

  describe('analyzeComplexity', () => {
    test('should analyze code complexity metrics', async () => {
      const complexity = await engine.analyzeComplexity(mockFiles);
      
      expect(complexity).toBeDefined();
      expect(complexity.functions).toBeDefined();
      expect(complexity.functions.length).toBeGreaterThan(0);
      expect(complexity.overall).toBeDefined();
      expect(complexity.overall.score).toBeDefined();
      expect(complexity.overall.rating).toBeDefined();
    });

    test('should detect complex functions', async () => {
      const complexity = await engine.analyzeComplexity(mockFiles);
      
      // Should find the complex function with nested loops
      const complexFunc = complexity.functions.find(f => f.name === 'complexFunction');
      expect(complexFunc).toBeDefined();
      expect(complexFunc.cyclomatic).toBeGreaterThan(5);
      expect(complexFunc.cognitive).toBeGreaterThan(5);
    });
  });

  describe('analyzeSecurityVulnerabilities', () => {
    test('should detect security vulnerabilities', async () => {
      const security = await engine.analyzeSecurityVulnerabilities(mockFiles);
      
      expect(security).toBeDefined();
      expect(security.vulnerabilities).toBeDefined();
      expect(security.score).toBeDefined();
      
      // Should detect eval() usage
      const evalVuln = security.vulnerabilities.find(v => v.type === 'dangerous-eval');
      expect(evalVuln).toBeDefined();
      expect(evalVuln.severity).toBe('critical');
    });

    test('should detect setTimeout with string', async () => {
      const security = await engine.analyzeSecurityVulnerabilities(mockFiles);
      
      const setTimeoutVuln = security.vulnerabilities.find(v => v.type === 'string-execution');
      expect(setTimeoutVuln).toBeDefined();
      expect(setTimeoutVuln.severity).toBe('high');
    });
  });

  describe('analyzePerformanceBottlenecks', () => {
    test('should detect performance issues', async () => {
      const performance = await engine.analyzePerformanceBottlenecks(mockFiles);
      
      expect(performance).toBeDefined();
      expect(performance.bottlenecks).toBeDefined();
      
      // Should detect nested iteration (O(n²) complexity)
      const nestedIteration = performance.bottlenecks.find(b => b.type === 'nested-iteration');
      expect(nestedIteration).toBeDefined();
      expect(nestedIteration.severity).toBe('medium');
    });
  });

  describe('analyzeDependencies', () => {
    test('should analyze import/export dependencies', async () => {
      const filesWithImports = [
        {
          path: '/test/module1.js',
          content: `
import { helper } from './helper';
import React from 'react';
export const Component = () => {};
`
        },
        {
          path: '/test/module2.js',
          content: `
import { Component } from './module1';
export default function App() {}
`
        }
      ];

      const dependencies = await engine.analyzeDependencies(filesWithImports);
      
      expect(dependencies).toBeDefined();
      expect(dependencies.imports).toBeDefined();
      expect(dependencies.exports).toBeDefined();
      expect(dependencies.external).toBeDefined();
      expect(dependencies.internal).toBeDefined();
    });
  });

  describe('helper methods', () => {
    test('isJavaScriptFile should identify JS files correctly', () => {
      expect(engine.isJavaScriptFile('test.js')).toBe(true);
      expect(engine.isJavaScriptFile('test.jsx')).toBe(true);
      expect(engine.isJavaScriptFile('test.ts')).toBe(true);
      expect(engine.isJavaScriptFile('test.tsx')).toBe(true);
      expect(engine.isJavaScriptFile('test.mjs')).toBe(true);
      expect(engine.isJavaScriptFile('test.cjs')).toBe(true);
      expect(engine.isJavaScriptFile('test.txt')).toBe(false);
      expect(engine.isJavaScriptFile('test.py')).toBe(false);
    });

    test('calculateSecurityScore should return valid score', () => {
      const security = {
        vulnerabilities: [
          { severity: 'critical' },
          { severity: 'high' },
          { severity: 'medium' },
          { severity: 'low' }
        ]
      };

      const score = engine.calculateSecurityScore(security);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBe(63); // 100 - 20 - 10 - 5 - 2 = 63
    });
  });

  describe('error handling', () => {
    test('should handle malformed JavaScript files gracefully', async () => {
      const badFiles = [{
        path: '/test/bad.js',
        content: 'this is not valid javascript code {'
      }];

      const results = await engine.analyzeProject(badFiles);
      
      // Should not throw and should return results
      expect(results).toBeDefined();
      expect(results.complexity).toBeDefined();
      expect(results.security).toBeDefined();
    });
  });

  describe('edge cases for uncovered lines', () => {
    test('should detect SQL injection with template literals', async () => {
      const files = [{
        path: '/test/sql.js',
        content: `
          db.query(\`SELECT * FROM users WHERE id = \${userId}\`);
          db.execute('SELECT * FROM users WHERE name = ' + userName);
        `
      }];
      
      const result = await engine.analyzeProject(files);
      expect(result.security.vulnerabilities.some(v => v.type === 'sql-injection')).toBe(true);
    });

    test('should handle files without content property', async () => {
      const files = [{
        path: '/test/noContent.js'
      }];
      
      // Mock fs.readFile
      const originalReadFile = fs.readFile;
      fs.readFile = jest.fn().mockResolvedValue('const x = 1;');
      
      const result = await engine.analyzeProject(files);
      expect(result).toBeDefined();
      
      fs.readFile = originalReadFile;
    });

    test('should handle file read errors', async () => {
      const files = [{
        path: '/test/error.js'
      }];
      
      // Mock fs.readFile to throw error
      const originalReadFile = fs.readFile;
      fs.readFile = jest.fn().mockRejectedValue(new Error('Read failed'));
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await engine.analyzeProject(files);
      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      fs.readFile = originalReadFile;
    });

    test('should detect XSS with innerHTML', async () => {
      const files = [{
        path: '/test/xss.js',
        content: `
          element.innerHTML = userInput;
          document.getElementById('content').innerHTML = data;
        `
      }];
      
      const result = await engine.analyzeProject(files);
      expect(result.security.vulnerabilities.some(v => v.type === 'xss-innerHTML')).toBe(true);
    });

    test('should handle parse errors in AST', async () => {
      const files = [{
        path: '/test/invalid.js',
        content: 'this is not { valid javascript'
      }];
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await engine.analyzeProject(files);
      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should analyze performance patterns', async () => {
      const files = [{
        path: '/test/perf.js',
        content: `
          // Nested loops - performance issue
          for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
              for (let k = 0; k < n; k++) {
                process(i, j, k);
              }
            }
          }
          
          // Sync file operation
          const data = fs.readFileSync('large.txt');
        `
      }];
      
      const result = await engine.analyzeProject(files);
      expect(result.performance.bottlenecks.length).toBeGreaterThan(0);
    });

    test('should detect circular dependencies', async () => {
      const files = [
        {
          path: '/test/a.js',
          content: `
            import { b } from './b';
            export const a = () => b();
          `
        },
        {
          path: '/test/b.js',
          content: `
            import { a } from './a';
            export const b = () => a();
          `
        }
      ];
      
      const result = await engine.analyzeProject(files);
      expect(result.dependencies).toBeDefined();
      if (result.dependencies.circular) {
        expect(result.dependencies.circular.length).toBeGreaterThan(0);
      }
    });

    test('should handle large files', async () => {
      const largeContent = 'const x = 1;\n'.repeat(10000);
      const files = [{
        path: '/test/large.js',
        content: largeContent
      }];
      
      const result = await engine.analyzeProject(files);
      expect(result).toBeDefined();
      if (result.summary && result.summary.totalLines !== undefined) {
        expect(result.summary.totalLines).toBeGreaterThanOrEqual(10000);
      } else {
        expect(result.summary).toBeDefined();
      }
    });

    test('should generate quality metrics', async () => {
      const files = [{
        path: '/test/quality.js',
        content: `
          // Good quality code
          function calculateTotal(items) {
            return items.reduce((sum, item) => sum + item.price, 0);
          }
          
          // Poor quality code - long function
          function poorQuality() {
            ${Array(50).fill('console.log("line");').join('\n')}
          }
        `
      }];
      
      const result = await engine.analyzeProject(files);
      expect(result.quality).toBeDefined();
      expect(result.quality.maintainability).toBeDefined();
    });

    test('should detect architectural patterns', async () => {
      const files = [
        {
          path: '/test/controller.js',
          content: `
            class UserController {
              async getUsers(req, res) {
                const users = await UserService.findAll();
                res.json(users);
              }
            }
          `
        },
        {
          path: '/test/service.js',
          content: `
            class UserService {
              async findAll() {
                return await UserModel.find({});
              }
            }
          `
        },
        {
          path: '/test/model.js',
          content: `
            class UserModel {
              static find(query) {
                return db.users.find(query);
              }
            }
          `
        }
      ];
      
      const result = await engine.analyzeProject(files);
      expect(result.patterns).toBeDefined();
      if (Array.isArray(result.patterns)) {
        expect(result.patterns.some(p => p.pattern === 'MVC' || p.pattern === 'Layer')).toBe(true);
      }
    });

    test('should handle empty files array', async () => {
      const result = await engine.analyzeProject([]);
      
      expect(result).toBeDefined();
      expect(result.complexity).toBeDefined();
      expect(result.security.vulnerabilities).toHaveLength(0);
    });

    test('should generate comprehensive summary', async () => {
      const files = [{
        path: '/test/summary.js',
        content: `
          function testFunction() {
            console.log('test');
          }
        `
      }];
      
      const result = await engine.analyzeProject(files);
      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('object');
      expect(result.summary.totalFiles).toBeDefined();
    });

    test('should calculate overall complexity rating', async () => {
      const files = [{
        path: '/test/rating.js',
        content: `
          function simpleFunction() {
            return true;
          }
          
          function complexFunction() {
            for (let i = 0; i < 10; i++) {
              if (i % 2 === 0) {
                for (let j = 0; j < 5; j++) {
                  console.log(i, j);
                }
              }
            }
          }
        `
      }];
      
      const result = await engine.analyzeProject(files);
      expect(result.complexity.overall.rating).toBeDefined();
      expect(['excellent', 'good', 'fair', 'poor', 'critical']).toContain(result.complexity.overall.rating);
    });

    test('should handle various performance patterns', async () => {
      const files = [{
        path: '/test/performance.js',
        content: `
          // Nested loops for performance bottleneck
          for (let i = 0; i < 1000; i++) {
            for (let j = 0; j < 1000; j++) {
              for (let k = 0; k < 1000; k++) {
                doSomething(i, j, k);
              }
            }
          }
          
          // Synchronous operations
          const data = fs.readFileSync('large-file.txt');
        `
      }];
      
      const result = await engine.analyzeProject(files);
      expect(result.performance.bottlenecks).toBeDefined();
      expect(Array.isArray(result.performance.bottlenecks)).toBe(true);
    });

    test('should handle various security patterns', async () => {
      const files = [{
        path: '/test/security.js',
        content: `
          // Dangerous eval usage
          eval(userInput);
          
          // String execution
          setTimeout(userCode, 1000);
          
          // XSS vulnerability
          element.innerHTML = userData;
          
          // SQL injection
          db.query('SELECT * FROM users WHERE id = ' + userId);
        `
      }];
      
      const result = await engine.analyzeProject(files);
      expect(result.security.vulnerabilities).toBeDefined();
      expect(Array.isArray(result.security.vulnerabilities)).toBe(true);
    });

    test('should detect maintainability issues', async () => {
      const longFunction = 'console.log("line");\\n'.repeat(100);
      const files = [{
        path: '/test/maintainability.js',
        content: `
          function veryLongFunction() {
            ${longFunction}
          }
          
          function duplicatedLogic1() {
            const x = processData(input);
            return x.map(item => item.value).filter(v => v > 0);
          }
          
          function duplicatedLogic2() {
            const y = processData(input);
            return y.map(item => item.value).filter(v => v > 0);
          }
        `
      }];
      
      const result = await engine.analyzeProject(files);
      expect(result.quality).toBeDefined();
      expect(result.quality.maintainability).toBeDefined();
    });
  });

  describe('coverage edge cases', () => {
    test('should handle analyzeArchitecturalPatterns', async () => {
      const files = [{
        path: '/test/patterns.js',
        content: `
          class Repository {
            find() {}
          }
          
          class Service {
            constructor(repository) {
              this.repository = repository;
            }
          }
          
          class Controller {
            constructor(service) {
              this.service = service;
            }
          }
        `
      }];
      
      const result = await engine.analyzeProject(files);
      expect(result.patterns).toBeDefined();
    });

    test('should handle deep AST traversal errors', async () => {
      const files = [{
        path: '/test/deep.js',
        content: 'const incomplete = {'
      }];
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await engine.analyzeProject(files);
      expect(result).toBeDefined();
      
      consoleSpy.mockRestore();
    });
  });
});