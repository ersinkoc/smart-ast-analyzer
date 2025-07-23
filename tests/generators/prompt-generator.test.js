
const PromptGenerator = require('../../lib/generators/prompt-generator');
const ConfigManager = require('../../lib/core/config-manager');
const path = require('path');

// Mock ConfigManager
jest.mock('../../lib/core/config-manager');

describe('PromptGenerator', () => {
  let promptGenerator;
  let mockProjectInfo;

  beforeEach(() => {
    mockProjectInfo = {
      framework: 'express',
      language: 'javascript',
      type: 'api',
      metrics: { totalFiles: 25 }
    };

    promptGenerator = new PromptGenerator(mockProjectInfo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with project info and templates', () => {
      expect(promptGenerator.projectInfo).toEqual(mockProjectInfo);
      expect(promptGenerator.templates).toBeDefined();
      expect(promptGenerator.contextBuilder).toBeDefined();
    });
  });

  describe('generateAPIAnalysisPrompt', () => {
    test('should generate a valid API analysis prompt', () => {
      const files = [{ path: 'routes/api.js', content: '...file content...' }];
      const prompt = promptGenerator.generateAPIAnalysisPrompt(files);
      
      expect(prompt).toContain('express project');
      expect(prompt).toContain('API endpoints');
      expect(prompt).toContain('Framework: express');
      expect(prompt).toContain('JSON only');
    });
  });
});
