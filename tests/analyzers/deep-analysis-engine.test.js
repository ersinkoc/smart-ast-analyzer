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
});