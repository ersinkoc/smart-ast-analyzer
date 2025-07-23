const APIAnalyzer = require('../../lib/analyzers/api-analyzer');

describe('APIAnalyzer', () => {
  let analyzer;
  let mockFiles;
  let mockAIResult;

  beforeEach(() => {
    analyzer = new APIAnalyzer('nextjs');
    mockFiles = [
      { path: '/api/users.js', content: 'users api', relativePath: 'api/users.js' },
      { path: '/api/auth.js', content: 'auth api', relativePath: 'api/auth.js' }
    ];
    
    mockAIResult = {
      endpoints: [
        {
          method: 'GET',
          path: '/api/users',
          file: '/api/users.js',
          handler: 'getUsers'
        }
      ],
      apiGroups: {
        users: {
          baseUrl: '/api/users',
          endpoints: ['/api/users'],
          purpose: 'User management'
        }
      },
      securityIssues: [],
      performanceIssues: []
    };
  });

  describe('constructor', () => {
    test('initializes with framework', () => {
      expect(analyzer.framework).toBe('nextjs');
    });
  });

  describe('analyze', () => {
    test('returns enhanced result for valid AI result', async () => {
      const result = await analyzer.analyze(mockAIResult, mockFiles);
      
      expect(result).toBeDefined();
      expect(result.endpoints).toEqual(mockAIResult.endpoints);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalEndpoints).toBe(1);
      expect(result.metadata.totalFiles).toBe(2);
      expect(result.metadata.framework).toBe('nextjs');
      expect(result.frameworkSpecific).toBeDefined();
      expect(result.security).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('returns empty result when AI result has error', async () => {
      const errorResult = { error: 'AI analysis failed' };
      const result = await analyzer.analyze(errorResult, mockFiles);
      
      expect(result.endpoints).toEqual([]);
      expect(result.apiGroups).toEqual({});
      expect(result.metadata.error).toBe('AI analysis failed');
      expect(result.metadata.totalEndpoints).toBe(0);
      expect(result.recommendations).toContain('Check if your project has API endpoints');
    });

    test('returns empty result when AI result is null', async () => {
      const result = await analyzer.analyze(null, mockFiles);
      
      expect(result.endpoints).toEqual([]);
      expect(result.metadata.totalEndpoints).toBe(0);
      expect(result.recommendations).toContain('Ensure API files are in the expected locations');
    });

    test('returns empty result when AI result is undefined', async () => {
      const result = await analyzer.analyze(undefined, mockFiles);
      
      expect(result.endpoints).toEqual([]);
      expect(result.recommendations).toContain('Verify that the AI analysis service is working correctly');
    });
  });

  describe('createEmptyResult', () => {
    test('creates empty result without error', () => {
      const result = analyzer.createEmptyResult();
      
      expect(result.endpoints).toEqual([]);
      expect(result.apiGroups).toEqual({});
      expect(result.securityIssues).toEqual([]);
      expect(result.performanceIssues).toEqual([]);
      expect(result.orphanedEndpoints).toEqual([]);
      expect(result.metadata.totalEndpoints).toBe(0);
      expect(result.metadata.framework).toBe('nextjs');
      expect(result.metadata.error).toBeUndefined();
      expect(result.recommendations).toHaveLength(3);
    });

    test('creates empty result with error message', () => {
      const errorMessage = 'Custom error';
      const result = analyzer.createEmptyResult(errorMessage);
      
      expect(result.metadata.error).toBe(errorMessage);
    });
  });

  describe('generateMetadata', () => {
    test('generates metadata with endpoints', () => {
      const metadata = analyzer.generateMetadata(mockAIResult, mockFiles);
      
      expect(metadata.totalEndpoints).toBe(1);
      expect(metadata.totalFiles).toBe(2);
      expect(metadata.framework).toBe('nextjs');
      expect(metadata.analysisDate).toBeDefined();
      expect(new Date(metadata.analysisDate)).toBeInstanceOf(Date);
    });

    test('handles result without endpoints', () => {
      const resultWithoutEndpoints = { ...mockAIResult };
      delete resultWithoutEndpoints.endpoints;
      
      const metadata = analyzer.generateMetadata(resultWithoutEndpoints, mockFiles);
      expect(metadata.totalEndpoints).toBe(0);
    });

    test('handles empty files array (avgEndpointsPerFile = 0 branch)', () => {
      const emptyFiles = [];
      const metadata = analyzer.generateMetadata(mockAIResult, emptyFiles);
      
      expect(metadata.totalFiles).toBe(0);
      expect(metadata.avgEndpointsPerFile).toBe(0);
    });
  });

  describe('countHttpMethods', () => {
    test('handles endpoints with undefined method', () => {
      const endpointsWithoutMethod = [
        { path: '/api/test1' },
        { method: 'GET', path: '/api/test2' },
        { method: null, path: '/api/test3' }
      ];
      
      const methods = analyzer.countHttpMethods(endpointsWithoutMethod);
      
      expect(methods.UNKNOWN).toBe(2);
      expect(methods.GET).toBe(1);
    });
  });

  describe('identifyAuthTypes', () => {
    test('identifies auth types when present', () => {
      const endpointsWithAuth = [
        {
          method: 'GET',
          path: '/api/users',
          auth: { type: 'bearer', required: true }
        },
        {
          method: 'POST', 
          path: '/api/admin',
          auth: { type: 'basic', required: true }
        },
        {
          method: 'GET',
          path: '/api/public'
          // no auth property
        }
      ];
      
      const authTypes = analyzer.identifyAuthTypes(endpointsWithAuth);
      
      expect(authTypes).toContain('bearer');
      expect(authTypes).toContain('basic');
      expect(authTypes).toHaveLength(2);
    });
    
    test('handles endpoints without auth property', () => {
      const endpointsWithoutAuth = [
        { method: 'GET', path: '/api/test1' },
        { method: 'POST', path: '/api/test2' }
      ];
      
      const authTypes = analyzer.identifyAuthTypes(endpointsWithoutAuth);
      
      expect(authTypes).toEqual([]);
    });
  });

  describe('addFrameworkSpecificAnalysis', () => {
    test('adds Next.js specific analysis', () => {
      const nextjsResult = {
        ...mockAIResult,
        endpoints: [{
          ...mockAIResult.endpoints[0],
          file: '/pages/api/users.js'
        }]
      };
      
      const frameworkAnalysis = analyzer.addFrameworkSpecificAnalysis(nextjsResult);
      
      expect(frameworkAnalysis).toBeDefined();
      expect(frameworkAnalysis.routeTypes).toBeDefined();
      expect(frameworkAnalysis.pagesRouterUsage).toBe(true);
      expect(frameworkAnalysis.appRouterUsage).toBe(false);
    });

    test('detects App Router usage', () => {
      const appRouterResult = {
        ...mockAIResult,
        endpoints: [{
          ...mockAIResult.endpoints[0],
          file: '/app/api/users/route.js'
        }]
      };
      
      const frameworkAnalysis = analyzer.addFrameworkSpecificAnalysis(appRouterResult);
      
      expect(frameworkAnalysis.appRouterUsage).toBe(true);
      expect(frameworkAnalysis.pagesRouterUsage).toBe(false);
    });
    
    test('handles result without endpoints in Next.js analysis', () => {
      const resultWithoutEndpoints = { ...mockAIResult };
      delete resultWithoutEndpoints.endpoints;
      
      const frameworkAnalysis = analyzer.addFrameworkSpecificAnalysis(resultWithoutEndpoints);
      
      expect(frameworkAnalysis.appRouterUsage).toBe(false);
      expect(frameworkAnalysis.pagesRouterUsage).toBe(false);
    });
    
    test('handles result without endpoints in Express analysis', () => {
      const expressAnalyzer = new APIAnalyzer('express');
      const resultWithoutEndpoints = { ...mockAIResult };
      delete resultWithoutEndpoints.endpoints;
      
      const frameworkAnalysis = expressAnalyzer.addFrameworkSpecificAnalysis(resultWithoutEndpoints);
      
      expect(frameworkAnalysis.routerUsage).toBe(0);
      expect(frameworkAnalysis.middlewarePatterns).toEqual([]);
    });

    test('adds Express specific analysis', () => {
      const expressAnalyzer = new APIAnalyzer('express');
      const expressResult = {
        ...mockAIResult,
        endpoints: [{
          ...mockAIResult.endpoints[0],
          file: '/routes/users.js',
          middleware: ['auth', 'validation']
        }]
      };
      
      const frameworkAnalysis = expressAnalyzer.addFrameworkSpecificAnalysis(expressResult);
      
      expect(frameworkAnalysis.routerUsage).toBe(1);
      expect(frameworkAnalysis.middlewarePatterns).toContain('auth');
      expect(frameworkAnalysis.middlewarePatterns).toContain('validation');
    });

    test('returns empty object for unknown framework', () => {
      const unknownAnalyzer = new APIAnalyzer('unknown');
      const frameworkAnalysis = unknownAnalyzer.addFrameworkSpecificAnalysis(mockAIResult);
      
      expect(frameworkAnalysis).toEqual({});
    });
  });

  describe('enhanceSecurityAnalysis', () => {
    test('enhances security analysis with issue counts', () => {
      const secureResult = {
        ...mockAIResult,
        securityIssues: [
          { severity: 'critical', issue: 'SQL injection vulnerability' },
          { severity: 'high', issue: 'Missing authentication' },
          { severity: 'medium', issue: 'Weak CORS policy' },
          { severity: 'low', issue: 'Missing rate limiting' }
        ]
      };
      
      const security = analyzer.enhanceSecurityAnalysis(secureResult);
      
      expect(security).toBeDefined();
      expect(security.criticalIssues).toBe(1);
      expect(security.highIssues).toBe(1);
      expect(security.mediumIssues).toBe(1);
      expect(security.lowIssues).toBe(1);
      expect(security.commonVulnerabilities).toContain('Authentication Issues');
      expect(security.commonVulnerabilities).toContain('Rate Limiting');
    });

    test('handles results without security issues', () => {
      const security = analyzer.enhanceSecurityAnalysis(mockAIResult);
      
      expect(security.criticalIssues).toBe(0);
      expect(security.highIssues).toBe(0);
      expect(security.mediumIssues).toBe(0);
      expect(security.lowIssues).toBe(0);
      expect(security.commonVulnerabilities).toEqual([]);
    });

    test('identifies vulnerability patterns', () => {
      const resultWithPatterns = {
        ...mockAIResult,
        securityIssues: [
          { issue: 'CORS configuration issue' },
          { issue: 'Input validation missing' }
        ]
      };
      
      const security = analyzer.enhanceSecurityAnalysis(resultWithPatterns);
      expect(security.commonVulnerabilities).toContain('CORS Configuration');
      expect(security.commonVulnerabilities).toContain('Input Validation');
    });
    
    test('handles result without securityIssues property', () => {
      const resultWithoutSecurityIssues = { ...mockAIResult };
      delete resultWithoutSecurityIssues.securityIssues;
      
      const security = analyzer.enhanceSecurityAnalysis(resultWithoutSecurityIssues);
      
      expect(security.criticalIssues).toBe(0);
      expect(security.commonVulnerabilities).toEqual([]);
    });
  });

  describe('enhancePerformanceAnalysis', () => {
    test('analyzes performance metrics', () => {
      const perfResult = {
        ...mockAIResult,
        performanceIssues: [
          { issue: 'Database query optimization needed' },
          { issue: 'Cache hit rate low' },
          { issue: 'Authentication middleware slow' }
        ]
      };
      
      const performance = analyzer.enhancePerformanceAnalysis(perfResult);
      
      expect(performance).toBeDefined();
      expect(performance.totalIssues).toBe(3);
      expect(performance.categories.database).toBe(1);
      expect(performance.categories.caching).toBe(1);
      expect(performance.categories.authentication).toBe(1);
    });

    test('handles results without performance issues', () => {
      const performance = analyzer.enhancePerformanceAnalysis(mockAIResult);
      expect(performance.totalIssues).toBe(0);
      expect(performance.categories.database).toBe(0);
    });
    
    test('handles result without performanceIssues property', () => {
      const resultWithoutPerformanceIssues = { ...mockAIResult };
      delete resultWithoutPerformanceIssues.performanceIssues;
      
      const performance = analyzer.enhancePerformanceAnalysis(resultWithoutPerformanceIssues);
      
      expect(performance.totalIssues).toBe(0);
      expect(performance.categories.database).toBe(0);
    });
    
    test('handles performance issue with undefined category', () => {
      const perfResult = {
        ...mockAIResult,
        performanceIssues: [
          { issue: 'Some unknown performance issue' }
        ]
      };
      
      const performance = analyzer.enhancePerformanceAnalysis(perfResult);
      
      expect(performance.totalIssues).toBe(1);
      // The category should be 'other', which isn't in the predefined categories
      expect(performance.categories.database).toBe(0);
      expect(performance.categories.caching).toBe(0);
      expect(performance.categories.authentication).toBe(0);
      expect(performance.categories.validation).toBe(0);
    });

    test('categorizes performance issues correctly', () => {
      const issue1 = analyzer.categorizePerformanceIssue({ issue: 'Slow database query' });
      expect(issue1).toBe('database');
      
      const issue2 = analyzer.categorizePerformanceIssue({ issue: 'Cache miss' });
      expect(issue2).toBe('caching');
      
      const issue3 = analyzer.categorizePerformanceIssue({ issue: 'Unknown performance issue' });
      expect(issue3).toBe('other');
      
      const issue4 = analyzer.categorizePerformanceIssue({ issue: 'Input validation is slow' });
      expect(issue4).toBe('validation');
      
      const issue5 = analyzer.categorizePerformanceIssue({ issue: 'Authentication process taking too long' });
      expect(issue5).toBe('authentication');
      
      // Test undefined/null issue
      const issue6 = analyzer.categorizePerformanceIssue({ issue: null });
      expect(issue6).toBe('other');
      
      const issue7 = analyzer.categorizePerformanceIssue({});
      expect(issue7).toBe('other');
    });
  });

  describe('generateRecommendations', () => {
    test('generates basic recommendations', () => {
      const recommendations = analyzer.generateRecommendations(mockAIResult);
      
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('includes security recommendations for critical issues', () => {
      const unsecureResult = {
        ...mockAIResult,
        securityIssues: [
          { severity: 'critical', issue: 'SQL injection vulnerability' }
        ]
      };
      
      const recommendations = analyzer.generateRecommendations(unsecureResult);
      
      const securityRec = recommendations.find(rec => rec.category === 'security');
      expect(securityRec).toBeDefined();
      expect(securityRec.priority).toBe('high');
      expect(securityRec.title).toContain('Critical Security Issues');
    });

    test('includes performance recommendations', () => {
      const slowResult = {
        ...mockAIResult,
        performanceIssues: [
          { endpoint: '/api/users', issue: 'Slow query' }
        ]
      };
      
      const recommendations = analyzer.generateRecommendations(slowResult);
      
      const perfRec = recommendations.find(rec => rec.category === 'performance');
      expect(perfRec).toBeDefined();
      expect(perfRec.priority).toBe('medium');
      expect(perfRec.title).toContain('API Performance');
    });

    test('includes maintenance recommendations for orphaned endpoints', () => {
      const resultWithOrphans = {
        ...mockAIResult,
        orphanedEndpoints: ['/api/old-endpoint']
      };
      
      const recommendations = analyzer.generateRecommendations(resultWithOrphans);
      
      const maintenanceRec = recommendations.find(rec => rec.category === 'maintenance');
      expect(maintenanceRec).toBeDefined();
      expect(maintenanceRec.priority).toBe('low');
    });

    test('includes framework-specific recommendations', () => {
      const expressAnalyzer = new APIAnalyzer('express');
      const expressResult = {
        ...mockAIResult,
        endpoints: [
          { auth: { required: false } },
          { auth: { required: false } },
          { auth: { required: true } }
        ]
      };
      
      const recommendations = expressAnalyzer.generateRecommendations(expressResult);
      
      const authRec = recommendations.find(rec => rec.title?.includes('Authentication Middleware'));
      expect(authRec).toBeDefined();
    });
    
    test('handles NextJS mixed routing patterns recommendation', () => {
      const nextjsResult = {
        ...mockAIResult,
        endpoints: [
          { file: '/app/api/users/route.js', method: 'GET' },
          { file: '/pages/api/auth.js', method: 'POST' }
        ]
      };
      
      const recommendations = analyzer.generateRecommendations(nextjsResult);
      
      const routingRec = recommendations.find(rec => rec.title?.includes('Consolidate Routing Approach'));
      expect(routingRec).toBeDefined();
      expect(routingRec.priority).toBe('medium');
      expect(routingRec.category).toBe('architecture');
    });
  });

  describe('getFrameworkSpecificRecommendations', () => {
    test('calls FastAPI recommendations', () => {
      const fastapiAnalyzer = new APIAnalyzer('fastapi');
      const recommendations = fastapiAnalyzer.getFrameworkSpecificRecommendations(mockAIResult);
      
      expect(recommendations).toEqual([]);
    });
    
    test('calls Django recommendations', () => {
      const djangoAnalyzer = new APIAnalyzer('django');
      const recommendations = djangoAnalyzer.getFrameworkSpecificRecommendations(mockAIResult);
      
      expect(recommendations).toEqual([]);
    });
    
    test('returns empty array for unknown framework', () => {
      const unknownAnalyzer = new APIAnalyzer('unknown-framework');
      const recommendations = unknownAnalyzer.getFrameworkSpecificRecommendations(mockAIResult);
      
      expect(recommendations).toEqual([]);
    });
  });
  
  describe('identifyVulnerabilityPatterns', () => {
    test('handles security issues with missing issue property', () => {
      const securityIssuesWithMissingProps = [
        { severity: 'high' }, // no issue property
        { issue: null, severity: 'medium' }, // null issue
        { issue: 'rate limit exceeded', severity: 'low' }
      ];
      
      const patterns = analyzer.identifyVulnerabilityPatterns(securityIssuesWithMissingProps);
      
      expect(patterns).toContain('Rate Limiting');
      expect(patterns).toHaveLength(1);
    });
  });
  
  describe('analyzeFastAPI and analyzeDjango', () => {
    test('analyzeFastAPI handles missing endpoints', () => {
      const fastapiAnalyzer = new APIAnalyzer('fastapi');
      const resultWithoutEndpoints = { ...mockAIResult };
      delete resultWithoutEndpoints.endpoints;
      
      const analysis = fastapiAnalyzer.analyzeFastAPI(resultWithoutEndpoints);
      
      expect(analysis.pathOperations).toBe(0);
      expect(analysis.dependencyInjection).toBe(0);
      expect(analysis.asyncEndpoints).toBe(0);
    });
    
    test('analyzeDjango handles missing endpoints', () => {
      const djangoAnalyzer = new APIAnalyzer('django');
      const resultWithoutEndpoints = { ...mockAIResult };
      delete resultWithoutEndpoints.endpoints;
      
      const analysis = djangoAnalyzer.analyzeDjango(resultWithoutEndpoints);
      
      expect(analysis.urlPatterns).toBe(0);
      expect(analysis.classBasedViews).toBe(0);
      expect(analysis.functionBasedViews).toBe(0);
    });
  });
  
  describe('getExpressRecommendations edge cases', () => {
    test('handles missing endpoints in Express recommendations', () => {
      const expressAnalyzer = new APIAnalyzer('express');
      const resultWithoutEndpoints = { ...mockAIResult };
      delete resultWithoutEndpoints.endpoints;
      
      const recommendations = expressAnalyzer.getExpressRecommendations(resultWithoutEndpoints);
      
      expect(recommendations).toEqual([]);
    });
  });

  describe('different frameworks', () => {
    test('works with Express framework', () => {
      const expressAnalyzer = new APIAnalyzer('express');
      expect(expressAnalyzer.framework).toBe('express');
    });

    test('works with Django framework', () => {
      const djangoAnalyzer = new APIAnalyzer('django');
      expect(djangoAnalyzer.framework).toBe('django');
    });

    test('works with FastAPI framework', () => {
      const fastapiAnalyzer = new APIAnalyzer('fastapi');
      expect(fastapiAnalyzer.framework).toBe('fastapi');
    });
  });
});