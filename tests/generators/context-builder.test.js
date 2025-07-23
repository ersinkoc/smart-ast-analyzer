const ContextBuilder = require('../../lib/generators/context-builder');

describe('ContextBuilder', () => {
  let contextBuilder;
  let mockProjectInfo;

  beforeEach(() => {
    mockProjectInfo = {
      path: '/test/project',
      type: 'web',
      language: 'JavaScript',
      framework: 'react',
      metrics: {
        totalFiles: 100
      },
      dependencies: {
        total: 50
      }
    };
    
    contextBuilder = new ContextBuilder(mockProjectInfo);
  });

  describe('constructor', () => {
    test('should initialize with project info', () => {
      expect(contextBuilder.projectInfo).toBe(mockProjectInfo);
    });
  });

  describe('buildContext', () => {
    test('should build complete context object', () => {
      const mockFiles = [
        {
          path: 'src/file1.js',
          size: 1024,
          lines: 50,
          extension: '.js',
          content: 'const test = 1;\nfunction hello() {\n  return "world";\n}\n\nexport default hello;'
        }
      ];

      const context = contextBuilder.buildContext('api', mockFiles);

      expect(context).toHaveProperty('project');
      expect(context).toHaveProperty('framework');
      expect(context).toHaveProperty('files');
      expect(context).toHaveProperty('analysis');
    });

    test('should call all context building methods', () => {
      contextBuilder.getProjectContext = jest.fn().mockReturnValue({});
      contextBuilder.getFrameworkContext = jest.fn().mockReturnValue({});
      contextBuilder.prepareFilesContext = jest.fn().mockReturnValue([]);
      contextBuilder.getAnalysisContext = jest.fn().mockReturnValue({});

      const mockFiles = [];
      contextBuilder.buildContext('components', mockFiles);

      expect(contextBuilder.getProjectContext).toHaveBeenCalled();
      expect(contextBuilder.getFrameworkContext).toHaveBeenCalled();
      expect(contextBuilder.prepareFilesContext).toHaveBeenCalledWith(mockFiles);
      expect(contextBuilder.getAnalysisContext).toHaveBeenCalledWith('components');
    });
  });

  describe('getProjectContext', () => {
    test('should return project context with all properties', () => {
      const projectContext = contextBuilder.getProjectContext();

      expect(projectContext).toEqual({
        path: '/test/project',
        type: 'web',
        language: 'JavaScript',
        framework: 'react',
        totalFiles: 100,
        dependencies: 50
      });
    });

    test('should handle missing properties gracefully', () => {
      contextBuilder.projectInfo = {
        path: '/test',
        metrics: {},
        dependencies: {}
      };

      const projectContext = contextBuilder.getProjectContext();

      expect(projectContext.path).toBe('/test');
      expect(projectContext.type).toBeUndefined();
      expect(projectContext.language).toBeUndefined();
      expect(projectContext.framework).toBeUndefined();
      expect(projectContext.totalFiles).toBeUndefined();
      expect(projectContext.dependencies).toBeUndefined();
    });
  });

  describe('getFrameworkContext', () => {
    test('should return React framework context', () => {
      const frameworkContext = contextBuilder.getFrameworkContext();

      expect(frameworkContext).toHaveProperty('components', 'Functional and class components');
      expect(frameworkContext).toHaveProperty('hooks', 'useState, useEffect, custom hooks');
      expect(frameworkContext).toHaveProperty('stateManagement', 'Context API, Redux, or third-party');
    });

    test('should return Next.js framework context', () => {
      contextBuilder.projectInfo.framework = 'nextjs';
      const frameworkContext = contextBuilder.getFrameworkContext();

      expect(frameworkContext).toHaveProperty('routing', 'File-based routing in pages/ or app/');
      expect(frameworkContext).toHaveProperty('apiRoutes', 'API routes in pages/api/ or app/api/');
      expect(frameworkContext).toHaveProperty('specialFiles');
      expect(frameworkContext.specialFiles).toContain('_app.js');
      expect(frameworkContext.specialFiles).toContain('middleware.js');
    });

    test('should return Express framework context', () => {
      contextBuilder.projectInfo.framework = 'express';
      const frameworkContext = contextBuilder.getFrameworkContext();

      expect(frameworkContext).toHaveProperty('routing', 'Router middleware and route handlers');
      expect(frameworkContext).toHaveProperty('middleware', 'Application and route-specific middleware');
      expect(frameworkContext).toHaveProperty('structure', 'MVC or service-oriented architecture');
    });

    test('should return Vue framework context', () => {
      contextBuilder.projectInfo.framework = 'vue';
      const frameworkContext = contextBuilder.getFrameworkContext();

      expect(frameworkContext).toHaveProperty('components', 'Single File Components (.vue)');
      expect(frameworkContext).toHaveProperty('reactivity', 'Composition API or Options API');
      expect(frameworkContext).toHaveProperty('routing', 'Vue Router for navigation');
    });

    test('should return empty object for unknown framework', () => {
      contextBuilder.projectInfo.framework = 'unknown';
      const frameworkContext = contextBuilder.getFrameworkContext();

      expect(frameworkContext).toEqual({});
    });
  });

  describe('prepareFilesContext', () => {
    test('should prepare files context with path from relativePath', () => {
      const files = [
        {
          relativePath: 'src/component.js',
          size: 2048,
          lines: 100,
          extension: '.js',
          content: 'import React from "react";\n\nconst Component = () => {\n  return <div>Hello</div>;\n};\n\nexport default Component;'
        }
      ];

      const filesContext = contextBuilder.prepareFilesContext(files);

      expect(filesContext).toHaveLength(1);
      expect(filesContext[0]).toHaveProperty('path', 'src/component.js');
      expect(filesContext[0]).toHaveProperty('size', 2048);
      expect(filesContext[0]).toHaveProperty('lines', 100);
      expect(filesContext[0]).toHaveProperty('extension', '.js');
      expect(filesContext[0]).toHaveProperty('preview');
    });

    test('should prepare files context with path fallback', () => {
      const files = [
        {
          path: '/absolute/path/file.js',
          size: 1024,
          lines: 50,
          extension: '.js',
          content: 'const test = true;'
        }
      ];

      const filesContext = contextBuilder.prepareFilesContext(files);

      expect(filesContext[0]).toHaveProperty('path', '/absolute/path/file.js');
    });

    test('should handle empty files array', () => {
      const filesContext = contextBuilder.prepareFilesContext([]);
      expect(filesContext).toEqual([]);
    });

    test('should prepare multiple files', () => {
      const files = [
        {
          path: 'file1.js',
          size: 100,
          lines: 10,
          extension: '.js',
          content: 'test1'
        },
        {
          path: 'file2.js',
          size: 200,
          lines: 20,
          extension: '.js',
          content: 'test2'
        }
      ];

      const filesContext = contextBuilder.prepareFilesContext(files);

      expect(filesContext).toHaveLength(2);
      expect(filesContext[0].path).toBe('file1.js');
      expect(filesContext[1].path).toBe('file2.js');
    });
  });

  describe('getFilePreview', () => {
    test('should return first 5 lines of content', () => {
      const content = 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8';
      const preview = contextBuilder.getFilePreview(content);

      expect(preview).toBe('line1\nline2\nline3\nline4\nline5');
    });

    test('should handle content with fewer than 5 lines', () => {
      const content = 'line1\nline2\nline3';
      const preview = contextBuilder.getFilePreview(content);

      expect(preview).toBe('line1\nline2\nline3');
    });

    test('should handle empty content', () => {
      const preview = contextBuilder.getFilePreview('');
      expect(preview).toBe('');
    });

    test('should handle single line content', () => {
      const content = 'single line of code';
      const preview = contextBuilder.getFilePreview(content);

      expect(preview).toBe('single line of code');
    });
  });

  describe('getAnalysisContext', () => {
    test('should return API analysis context', () => {
      const context = contextBuilder.getAnalysisContext('api');

      expect(context).toHaveProperty('focus', 'REST endpoints, GraphQL schemas, RPC methods');
      expect(context).toHaveProperty('concerns', 'Authentication, validation, error handling, performance');
      expect(context).toHaveProperty('patterns', 'Route definitions, middleware chains, response formats');
    });

    test('should return components analysis context', () => {
      const context = contextBuilder.getAnalysisContext('components');

      expect(context).toHaveProperty('focus', 'Component composition, data flow, state management');
      expect(context).toHaveProperty('concerns', 'Props, events, lifecycle, performance, accessibility');
      expect(context).toHaveProperty('patterns', 'Component trees, data passing, event handling');
    });

    test('should return websocket analysis context', () => {
      const context = contextBuilder.getAnalysisContext('websocket');

      expect(context).toHaveProperty('focus', 'Real-time communication, event handling, room management');
      expect(context).toHaveProperty('concerns', 'Connection management, event flow, error handling');
      expect(context).toHaveProperty('patterns', 'Event emitters, listeners, room joins/leaves');
    });

    test('should return auth analysis context', () => {
      const context = contextBuilder.getAnalysisContext('auth');

      expect(context).toHaveProperty('focus', 'Authentication flows, authorization checks, security');
      expect(context).toHaveProperty('concerns', 'Token management, session handling, permissions');
      expect(context).toHaveProperty('patterns', 'Login/logout, protected routes, role checks');
    });

    test('should return database analysis context', () => {
      const context = contextBuilder.getAnalysisContext('database');

      expect(context).toHaveProperty('focus', 'Database queries, model relationships, transactions');
      expect(context).toHaveProperty('concerns', 'Query optimization, data integrity, migrations');
      expect(context).toHaveProperty('patterns', 'CRUD operations, joins, indexing');
    });

    test('should return performance analysis context', () => {
      const context = contextBuilder.getAnalysisContext('performance');

      expect(context).toHaveProperty('focus', 'Bottlenecks, optimization opportunities, monitoring');
      expect(context).toHaveProperty('concerns', 'Bundle size, render performance, memory usage');
      expect(context).toHaveProperty('patterns', 'Code splitting, lazy loading, memoization');
    });

    test('should return empty object for unknown analysis type', () => {
      const context = contextBuilder.getAnalysisContext('unknown');
      expect(context).toEqual({});
    });
  });

  describe('integration tests', () => {
    test('should build complete context for API analysis', () => {
      const files = [
        {
          relativePath: 'routes/users.js',
          size: 3000,
          lines: 150,
          extension: '.js',
          content: 'const express = require("express");\nconst router = express.Router();\n\nrouter.get("/", async (req, res) => {\n  // Get all users\n});\n\nmodule.exports = router;'
        }
      ];

      const context = contextBuilder.buildContext('api', files);

      expect(context.project.framework).toBe('react');
      expect(context.framework).toHaveProperty('components');
      expect(context.files).toHaveLength(1);
      expect(context.files[0].path).toBe('routes/users.js');
      expect(context.files[0].preview).toContain('express');
      expect(context.analysis.focus).toContain('REST endpoints');
    });

    test('should build context with no framework info', () => {
      contextBuilder.projectInfo.framework = null;
      const context = contextBuilder.buildContext('components', []);

      expect(context.framework).toEqual({});
    });
  });
});