const AIEnhancer = require('../../lib/core/ai-enhancer');
const AIExecutor = require('../../lib/core/ai-executor');

// Mock AIExecutor
jest.mock('../../lib/core/ai-executor');

describe('AIEnhancer', () => {
  let aiEnhancer;
  let mockExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecutor = {
      execute: jest.fn()
    };
    AIExecutor.mockImplementation(() => mockExecutor);
  });

  describe('constructor', () => {
    it('should initialize with default mock type', () => {
      aiEnhancer = new AIEnhancer();
      expect(aiEnhancer.aiType).toBe('mock');
      expect(AIExecutor).toHaveBeenCalledWith('mock', {});
    });

    it('should initialize with custom type and options', () => {
      const options = { model: 'gpt-4' };
      aiEnhancer = new AIEnhancer('openai', options);
      expect(aiEnhancer.aiType).toBe('openai');
      expect(AIExecutor).toHaveBeenCalledWith('openai', options);
    });
  });

  describe('enhance', () => {
    it('should return original results for mock type', async () => {
      aiEnhancer = new AIEnhancer('mock');
      const analysisResults = { api: { endpoints: [] } };
      const result = await aiEnhancer.enhance(analysisResults, {});
      expect(result).toBe(analysisResults);
    });

    it('should enhance results with security insights for endpoints', async () => {
      aiEnhancer = new AIEnhancer('openai');
      const analysisResults = {
        api: {
          endpoints: [
            { method: 'GET', path: '/users' },
            { method: 'POST', path: '/login' }
          ]
        }
      };
      const projectInfo = { framework: 'express' };
      
      mockExecutor.execute.mockResolvedValueOnce(['Use HTTPS', 'Add rate limiting', 'Validate inputs']);
      mockExecutor.execute.mockResolvedValueOnce(['Implement service layer', 'Add error boundaries', 'Use DI']);

      const result = await aiEnhancer.enhance(analysisResults, projectInfo);
      
      expect(result.api.aiSecurityInsights).toEqual(['Use HTTPS', 'Add rate limiting', 'Validate inputs']);
      expect(result.aiArchitectureInsights).toEqual(['Implement service layer', 'Add error boundaries', 'Use DI']);
    });

    it('should enhance results with performance insights for components', async () => {
      aiEnhancer = new AIEnhancer('openai');
      const analysisResults = {
        component: {
          components: {
            'Button': { type: 'functional' },
            'Header': { type: 'class' }
          }
        }
      };
      const projectInfo = { framework: 'react' };
      
      mockExecutor.execute.mockResolvedValueOnce(['Use React.memo', 'Lazy load', 'Optimize renders']);
      mockExecutor.execute.mockResolvedValueOnce(['Add state management', 'Split components', 'Use hooks']);

      const result = await aiEnhancer.enhance(analysisResults, projectInfo);
      
      expect(result.component.aiPerformanceInsights).toEqual(['Use React.memo', 'Lazy load', 'Optimize renders']);
      expect(result.aiArchitectureInsights).toEqual(['Add state management', 'Split components', 'Use hooks']);
    });

    it('should handle AI executor errors gracefully', async () => {
      aiEnhancer = new AIEnhancer('openai');
      const analysisResults = {
        api: { endpoints: [{ method: 'GET', path: '/test' }] }
      };
      
      mockExecutor.execute.mockRejectedValue(new Error('AI service unavailable'));
      
      const result = await aiEnhancer.enhance(analysisResults, {});
      
      // Should add default architecture insights even if security fails
      const expected = {
        ...analysisResults,
        aiArchitectureInsights: ['Implement service layer', 'Add error boundaries', 'Use dependency injection']
      };
      expect(result).toEqual(expected);
    });

    it('should handle general enhancement errors and return original results', async () => {
      aiEnhancer = new AIEnhancer('openai');
      const analysisResults = {
        api: { endpoints: [{ method: 'GET', path: '/test' }] }
      };
      
      // Mock console.warn to verify it's called
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Force an error by making mergeEnhancements throw
      aiEnhancer.mergeEnhancements = jest.fn().mockImplementation(() => {
        throw new Error('Merge failed');
      });
      
      const result = await aiEnhancer.enhance(analysisResults, {});
      
      expect(consoleSpy).toHaveBeenCalledWith('AI enhancement failed, returning original results:', 'Merge failed');
      expect(result).toBe(analysisResults);
      
      consoleSpy.mockRestore();
    });

    it('should handle all enhancements together', async () => {
      aiEnhancer = new AIEnhancer('openai');
      const analysisResults = {
        api: {
          endpoints: [{ method: 'GET', path: '/api/users' }]
        },
        component: {
          components: { 'UserList': { type: 'functional' } }
        }
      };
      const projectInfo = { framework: 'nextjs' };
      
      mockExecutor.execute
        .mockResolvedValueOnce(['Enable CORS', 'Add JWT', 'Sanitize inputs'])
        .mockResolvedValueOnce(['Memoize components', 'Use SSR', 'Optimize images'])
        .mockResolvedValueOnce(['Use microservices', 'Add caching', 'Implement CI/CD']);

      const result = await aiEnhancer.enhance(analysisResults, projectInfo);
      
      expect(result.api.aiSecurityInsights).toEqual(['Enable CORS', 'Add JWT', 'Sanitize inputs']);
      expect(result.component.aiPerformanceInsights).toEqual(['Memoize components', 'Use SSR', 'Optimize images']);
      expect(result.aiArchitectureInsights).toEqual(['Use microservices', 'Add caching', 'Implement CI/CD']);
    });
  });

  describe('getSecurityInsights', () => {
    beforeEach(() => {
      aiEnhancer = new AIEnhancer('openai');
    });

    it('should return security recommendations for endpoints', async () => {
      const endpoints = [
        { method: 'POST', path: '/api/auth' },
        { method: 'GET', path: '/api/users/:id' }
      ];
      
      mockExecutor.execute.mockResolvedValue(['Use OAuth2', 'Implement CSRF protection', 'Add input validation']);
      
      const result = await aiEnhancer.getSecurityInsights(endpoints);
      expect(result).toEqual(['Use OAuth2', 'Implement CSRF protection', 'Add input validation']);
    });

    it('should handle object response with recommendations property', async () => {
      const endpoints = [{ method: 'GET', path: '/api/data' }];
      
      mockExecutor.execute.mockResolvedValue({
        recommendations: ['Enable SSL', 'Add API keys', 'Log access']
      });
      
      const result = await aiEnhancer.getSecurityInsights(endpoints);
      expect(result).toEqual(['Enable SSL', 'Add API keys', 'Log access']);
    });

    it('should return default recommendations when object has no recommendations property', async () => {
      const endpoints = [{ method: 'GET', path: '/api/data' }];
      
      mockExecutor.execute.mockResolvedValue({
        someOtherProperty: 'value'
      });
      
      const result = await aiEnhancer.getSecurityInsights(endpoints);
      expect(result).toEqual(['Enable rate limiting', 'Add authentication', 'Validate inputs']);
    });

    it('should limit to 3 recommendations', async () => {
      const endpoints = [{ method: 'GET', path: '/api/test' }];
      
      mockExecutor.execute.mockResolvedValue(['Rec1', 'Rec2', 'Rec3', 'Rec4', 'Rec5']);
      
      const result = await aiEnhancer.getSecurityInsights(endpoints);
      expect(result).toEqual(['Rec1', 'Rec2', 'Rec3']);
    });

    it('should return default recommendations on error', async () => {
      const endpoints = [{ method: 'GET', path: '/api/fail' }];
      
      mockExecutor.execute.mockRejectedValue(new Error('AI error'));
      
      const result = await aiEnhancer.getSecurityInsights(endpoints);
      expect(result).toEqual(['Enable rate limiting', 'Add authentication', 'Validate inputs']);
    });

    it('should handle many endpoints by limiting to 10', async () => {
      const endpoints = Array(20).fill(null).map((_, i) => ({
        method: 'GET',
        path: `/api/endpoint${i}`
      }));
      
      mockExecutor.execute.mockResolvedValue(['Security tip 1', 'Security tip 2', 'Security tip 3']);
      
      const result = await aiEnhancer.getSecurityInsights(endpoints);
      
      const promptCall = mockExecutor.execute.mock.calls[0][0];
      const endpointCount = (promptCall.match(/GET \/api\/endpoint/g) || []).length;
      expect(endpointCount).toBe(10);
    });
  });

  describe('getPerformanceInsights', () => {
    beforeEach(() => {
      aiEnhancer = new AIEnhancer('openai');
    });

    it('should return performance recommendations for components', async () => {
      const components = {
        'UserCard': { type: 'functional' },
        'Dashboard': { type: 'class' }
      };
      
      mockExecutor.execute.mockResolvedValue(['Use virtualization', 'Implement code splitting', 'Optimize bundles']);
      
      const result = await aiEnhancer.getPerformanceInsights(components);
      expect(result).toEqual(['Use virtualization', 'Implement code splitting', 'Optimize bundles']);
    });

    it('should handle object response with recommendations property', async () => {
      const components = { 'App': { type: 'functional' } };
      
      mockExecutor.execute.mockResolvedValue({
        recommendations: ['Use Suspense', 'Add error boundaries', 'Optimize state']
      });
      
      const result = await aiEnhancer.getPerformanceInsights(components);
      expect(result).toEqual(['Use Suspense', 'Add error boundaries', 'Optimize state']);
    });

    it('should return default recommendations when object has no recommendations property', async () => {
      const components = { 'App': { type: 'functional' } };
      
      mockExecutor.execute.mockResolvedValue({
        someOtherProperty: 'value'
      });
      
      const result = await aiEnhancer.getPerformanceInsights(components);
      expect(result).toEqual(['Use React.memo', 'Implement lazy loading', 'Optimize re-renders']);
    });

    it('should return default recommendations on error', async () => {
      const components = { 'ErrorComponent': { type: 'class' } };
      
      mockExecutor.execute.mockRejectedValue(new Error('AI error'));
      
      const result = await aiEnhancer.getPerformanceInsights(components);
      expect(result).toEqual(['Use React.memo', 'Implement lazy loading', 'Optimize re-renders']);
    });

    it('should handle many components by limiting to 10', async () => {
      const components = {};
      for (let i = 0; i < 20; i++) {
        components[`Component${i}`] = { type: 'functional' };
      }
      
      mockExecutor.execute.mockResolvedValue(['Perf tip 1', 'Perf tip 2', 'Perf tip 3']);
      
      await aiEnhancer.getPerformanceInsights(components);
      
      const promptCall = mockExecutor.execute.mock.calls[0][0];
      const componentCount = (promptCall.match(/Component\d+/g) || []).length;
      expect(componentCount).toBe(10);
    });
  });

  describe('getArchitectureInsights', () => {
    beforeEach(() => {
      aiEnhancer = new AIEnhancer('openai');
    });

    it('should return architecture recommendations', async () => {
      const projectInfo = { framework: 'express' };
      const analysisResults = {
        api: { endpoints: Array(5).fill({ method: 'GET', path: '/test' }) },
        component: { components: { 'Comp1': {}, 'Comp2': {} } }
      };
      
      mockExecutor.execute.mockResolvedValue(['Use clean architecture', 'Add monitoring', 'Implement DDD']);
      
      const result = await aiEnhancer.getArchitectureInsights(projectInfo, analysisResults);
      expect(result).toEqual(['Use clean architecture', 'Add monitoring', 'Implement DDD']);
    });

    it('should handle object response with recommendations property', async () => {
      const projectInfo = { framework: 'nextjs' };
      const analysisResults = {};
      
      mockExecutor.execute.mockResolvedValue({
        recommendations: ['Use SSG', 'Add middleware', 'Optimize builds']
      });
      
      const result = await aiEnhancer.getArchitectureInsights(projectInfo, analysisResults);
      expect(result).toEqual(['Use SSG', 'Add middleware', 'Optimize builds']);
    });

    it('should return default recommendations when object has no recommendations property', async () => {
      const projectInfo = { framework: 'nextjs' };
      const analysisResults = {};
      
      mockExecutor.execute.mockResolvedValue({
        someOtherProperty: 'value'
      });
      
      const result = await aiEnhancer.getArchitectureInsights(projectInfo, analysisResults);
      expect(result).toEqual(['Implement service layer', 'Add error boundaries', 'Use dependency injection']);
    });

    it('should handle missing api and component data', async () => {
      const projectInfo = { framework: 'react' };
      const analysisResults = {};
      
      mockExecutor.execute.mockResolvedValue(['Add routing', 'Use context', 'Split code']);
      
      const result = await aiEnhancer.getArchitectureInsights(projectInfo, analysisResults);
      expect(result).toEqual(['Add routing', 'Use context', 'Split code']);
      
      const promptCall = mockExecutor.execute.mock.calls[0][0];
      expect(promptCall).toContain('0 endpoints and 0 components');
    });

    it('should return default recommendations on error', async () => {
      const projectInfo = { framework: 'vue' };
      const analysisResults = {};
      
      mockExecutor.execute.mockRejectedValue(new Error('AI error'));
      
      const result = await aiEnhancer.getArchitectureInsights(projectInfo, analysisResults);
      expect(result).toEqual(['Implement service layer', 'Add error boundaries', 'Use dependency injection']);
    });
  });

  describe('mergeEnhancements', () => {
    beforeEach(() => {
      aiEnhancer = new AIEnhancer('openai');
    });

    it('should merge all enhancements into results', () => {
      const results = {
        api: { endpoints: [] },
        component: { components: {} }
      };
      const enhancements = {
        security: ['Security 1', 'Security 2'],
        performance: ['Perf 1', 'Perf 2'],
        architecture: ['Arch 1', 'Arch 2']
      };
      
      const merged = aiEnhancer.mergeEnhancements(results, enhancements);
      
      expect(merged.api.aiSecurityInsights).toEqual(['Security 1', 'Security 2']);
      expect(merged.component.aiPerformanceInsights).toEqual(['Perf 1', 'Perf 2']);
      expect(merged.aiArchitectureInsights).toEqual(['Arch 1', 'Arch 2']);
    });

    it('should handle missing api section', () => {
      const results = {
        component: { components: {} }
      };
      const enhancements = {
        security: ['Security 1'],
        performance: ['Perf 1'],
        architecture: ['Arch 1']
      };
      
      const merged = aiEnhancer.mergeEnhancements(results, enhancements);
      
      expect(merged.api).toBeUndefined();
      expect(merged.component.aiPerformanceInsights).toEqual(['Perf 1']);
      expect(merged.aiArchitectureInsights).toEqual(['Arch 1']);
    });

    it('should handle missing component section', () => {
      const results = {
        api: { endpoints: [] }
      };
      const enhancements = {
        security: ['Security 1'],
        performance: ['Perf 1'],
        architecture: ['Arch 1']
      };
      
      const merged = aiEnhancer.mergeEnhancements(results, enhancements);
      
      expect(merged.api.aiSecurityInsights).toEqual(['Security 1']);
      expect(merged.component).toBeUndefined();
      expect(merged.aiArchitectureInsights).toEqual(['Arch 1']);
    });

    it('should handle empty enhancements', () => {
      const results = {
        api: { endpoints: [] },
        component: { components: {} }
      };
      const enhancements = {};
      
      const merged = aiEnhancer.mergeEnhancements(results, enhancements);
      
      expect(merged.api.aiSecurityInsights).toBeUndefined();
      expect(merged.component.aiPerformanceInsights).toBeUndefined();
      expect(merged.aiArchitectureInsights).toBeUndefined();
    });
  });
});