const PromptGenerator = require('../lib/generators/prompt-generator');

describe('PromptGenerator', () => {
  let mockProjectInfo;
  let promptGenerator;

  beforeEach(() => {
    mockProjectInfo = {
      framework: 'nextjs',
      language: 'javascript',
      type: 'node',
      metrics: {
        totalFiles: 50,
        totalLines: 2000
      },
      dependencies: {
        total: 15
      }
    };
    
    promptGenerator = new PromptGenerator(mockProjectInfo);
  });

  describe('API Analysis Prompt', () => {
    test('generates valid API analysis prompt', () => {
      const mockFiles = [
        { path: '/api/users.js', content: 'API content', relativePath: 'api/users.js' },
        { path: '/api/auth.js', content: 'Auth content', relativePath: 'api/auth.js' }
      ];

      const prompt = promptGenerator.generateAPIAnalysisPrompt(mockFiles);

      expect(prompt).toContain('nextjs');
      expect(prompt).toContain('javascript');
      expect(prompt).toContain('API endpoints');
      expect(prompt).toContain('AUTHENTICATION');
      expect(prompt).toContain('JSON only');
      expect(prompt).toContain('endpoints');
    });

    test('includes framework-specific information', () => {
      const mockFiles = [{ path: '/api/test.js', content: 'test', relativePath: 'api/test.js' }];
      
      const prompt = promptGenerator.generateAPIAnalysisPrompt(mockFiles);
      
      expect(prompt).toContain(mockProjectInfo.framework);
      expect(prompt).toContain(mockProjectInfo.language);
      expect(prompt).toContain(mockProjectInfo.type);
    });
  });

  describe('Component Analysis Prompt', () => {
    test('generates valid component analysis prompt', () => {
      const mockFiles = [
        { path: '/components/Button.jsx', content: 'Button component', relativePath: 'components/Button.jsx' },
        { path: '/components/Modal.jsx', content: 'Modal component', relativePath: 'components/Modal.jsx' }
      ];

      const prompt = promptGenerator.generateComponentAnalysisPrompt(mockFiles);

      expect(prompt).toContain('component structure');
      expect(prompt).toContain('relationships');
      expect(prompt).toContain('state management');
      expect(prompt).toContain('props');
      expect(prompt).toContain('JSON only');
      expect(prompt).toContain('ComponentName');
    });

    test('includes file count information', () => {
      const mockFiles = new Array(10).fill(null).map((_, i) => ({
        path: `/components/Component${i}.jsx`,
        content: 'component content',
        relativePath: `components/Component${i}.jsx`
      }));

      const prompt = promptGenerator.generateComponentAnalysisPrompt(mockFiles);

      expect(prompt).toContain('10');
    });
  });

  describe('WebSocket Analysis Prompt', () => {
    test('generates valid websocket analysis prompt', () => {
      const mockFiles = [
        { path: '/socket/events.js', content: 'socket events', relativePath: 'socket/events.js' }
      ];

      const prompt = promptGenerator.generateWebSocketAnalysisPrompt(mockFiles);

      expect(prompt).toContain('WebSocket');
      expect(prompt).toContain('real-time');
      expect(prompt).toContain('events');
      expect(prompt).toContain('connection');
      expect(prompt).toContain('JSON only');
    });
  });

  describe('Authentication Analysis Prompt', () => {
    test('generates valid auth analysis prompt', () => {
      const mockFiles = [
        { path: '/auth/middleware.js', content: 'auth middleware', relativePath: 'auth/middleware.js' }
      ];

      const prompt = promptGenerator.generateAuthAnalysisPrompt(mockFiles);

      expect(prompt).toContain('authentication');
      expect(prompt).toContain('authorization');
      expect(prompt).toContain('security');
      expect(prompt).toContain('JWT');
      expect(prompt).toContain('JSON only');
    });
  });

  describe('Database Analysis Prompt', () => {
    test('generates valid database analysis prompt', () => {
      const mockFiles = [
        { path: '/models/User.js', content: 'User model', relativePath: 'models/User.js' }
      ];

      const prompt = promptGenerator.generateDatabaseAnalysisPrompt(mockFiles);

      expect(prompt).toContain('database');
      expect(prompt).toContain('queries');
      expect(prompt).toContain('models');
      expect(prompt).toContain('N+1');
      expect(prompt).toContain('JSON only');
    });
  });

  describe('Performance Analysis Prompt', () => {
    test('generates valid performance analysis prompt', () => {
      const mockFiles = [
        { path: '/components/App.jsx', content: 'App component', relativePath: 'components/App.jsx' }
      ];

      const prompt = promptGenerator.generatePerformanceAnalysisPrompt(mockFiles);

      expect(prompt).toContain('performance');
      expect(prompt).toContain('bottlenecks');
      expect(prompt).toContain('BUNDLE SIZE');
      expect(prompt).toContain('optimization');
      expect(prompt).toContain('JSON only');
    });
  });

  describe('Framework-Specific Prompts', () => {
    test('adapts prompt for different frameworks', () => {
      const expressProjectInfo = {
        ...mockProjectInfo,
        framework: 'express'
      };
      
      const expressPromptGenerator = new PromptGenerator(expressProjectInfo);
      const mockFiles = [{ path: '/routes/api.js', content: 'express routes', relativePath: 'routes/api.js' }];
      
      const prompt = expressPromptGenerator.generateAPIAnalysisPrompt(mockFiles);
      
      expect(prompt).toContain('express');
      expect(prompt).not.toContain('nextjs');
    });

    test('handles unknown frameworks gracefully', () => {
      const unknownProjectInfo = {
        ...mockProjectInfo,
        framework: 'unknown'
      };
      
      const unknownPromptGenerator = new PromptGenerator(unknownProjectInfo);
      const mockFiles = [{ path: '/api/test.js', content: 'test', relativePath: 'api/test.js' }];
      
      const prompt = unknownPromptGenerator.generateAPIAnalysisPrompt(mockFiles);
      
      expect(prompt).toBeDefined();
      expect(prompt).toContain('unknown');
    });
  });

  describe('Prompt Validation', () => {
    test('all prompts contain JSON requirement', () => {
      const mockFiles = [{ path: '/test.js', content: 'test', relativePath: 'test.js' }];
      
      const apiPrompt = promptGenerator.generateAPIAnalysisPrompt(mockFiles);
      const componentPrompt = promptGenerator.generateComponentAnalysisPrompt(mockFiles);
      const wsPrompt = promptGenerator.generateWebSocketAnalysisPrompt(mockFiles);
      const authPrompt = promptGenerator.generateAuthAnalysisPrompt(mockFiles);
      const dbPrompt = promptGenerator.generateDatabaseAnalysisPrompt(mockFiles);
      const perfPrompt = promptGenerator.generatePerformanceAnalysisPrompt(mockFiles);
      
      const prompts = [apiPrompt, componentPrompt, wsPrompt, authPrompt, dbPrompt, perfPrompt];
      
      prompts.forEach(prompt => {
        expect(prompt).toContain('JSON only');
      });
    });

    test('all prompts contain project information', () => {
      const mockFiles = [{ path: '/test.js', content: 'test', relativePath: 'test.js' }];
      
      const prompts = [
        promptGenerator.generateAPIAnalysisPrompt(mockFiles),
        promptGenerator.generateComponentAnalysisPrompt(mockFiles),
        promptGenerator.generateWebSocketAnalysisPrompt(mockFiles)
      ];
      
      prompts.forEach(prompt => {
        expect(prompt).toContain(mockProjectInfo.framework);
        expect(prompt).toContain(mockProjectInfo.language);
      });
    });
  });

  describe('Edge Cases and Branch Coverage', () => {
    test('handles missing metrics gracefully in API analysis prompt', () => {
      const projectInfoWithoutMetrics = {
        framework: 'react',
        language: 'javascript',
        type: 'client'
        // Note: no metrics property
      };
      
      const promptGeneratorWithoutMetrics = new PromptGenerator(projectInfoWithoutMetrics);
      const mockFiles = [{ path: '/api/test.js', content: 'test', relativePath: 'api/test.js' }];
      
      const prompt = promptGeneratorWithoutMetrics.generateAPIAnalysisPrompt(mockFiles);
      
      expect(prompt).toContain('Unknown');
      expect(prompt).toContain('react');
      expect(prompt).toContain('javascript');
      expect(prompt).not.toContain('undefined');
      expect(prompt).not.toContain('null');
    });

    test('handles metrics with undefined totalFiles in API analysis prompt', () => {
      const projectInfoWithEmptyMetrics = {
        framework: 'vue',
        language: 'javascript',
        type: 'client',
        metrics: {
          // Note: no totalFiles property
        }
      };
      
      const promptGeneratorWithEmptyMetrics = new PromptGenerator(projectInfoWithEmptyMetrics);
      const mockFiles = [{ path: '/api/test.js', content: 'test', relativePath: 'api/test.js' }];
      
      const prompt = promptGeneratorWithEmptyMetrics.generateAPIAnalysisPrompt(mockFiles);
      
      expect(prompt).toContain('Unknown');
      expect(prompt).toContain('vue');
      expect(prompt).not.toContain('undefined');
    });
  });
});