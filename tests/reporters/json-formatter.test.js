const JSONFormatter = require('../../lib/reporters/json-formatter');

describe('JSONFormatter', () => {
  let mockReport;

  beforeEach(() => {
    mockReport = {
      id: 'test-report-123',
      timestamp: '2024-01-01T00:00:00.000Z',
      projectInfo: {
        path: '/path/to/project',
        framework: 'React',
        language: 'JavaScript'
      },
      metrics: {
        files: 100,
        lines: 5000,
        components: 50,
        endpoints: 20
      },
      summary: 'This is a comprehensive analysis of the React project',
      insights: [
        'Insight 1',
        'Insight 2',
        'Insight 3',
        'Insight 4',
        'Insight 5',
        'Insight 6' // Should be limited to 5 in summary
      ],
      recommendations: [
        {
          title: 'Recommendation 1',
          priority: 'high',
          impact: 'high',
          description: 'Description 1'
        },
        {
          title: 'Recommendation 2',
          priority: 'medium',
          impact: 'medium',
          description: 'Description 2'
        },
        {
          title: 'Recommendation 3',
          priority: 'low',
          impact: 'low',
          description: 'Description 3'
        },
        {
          title: 'Recommendation 4',
          priority: 'low',
          impact: 'low',
          description: 'Description 4'
        }
      ],
      results: {
        api: {
          endpoints: [
            { method: 'GET', path: '/api/users' },
            { method: 'POST', path: '/api/users' }
          ],
          securityIssues: ['No rate limiting', 'Missing authentication'],
          performanceIssues: ['Slow query']
        },
        components: {
          components: {
            Button: { type: 'functional' },
            Card: { type: 'class' }
          },
          unusedComponents: ['OldButton'],
          issues: ['Missing prop types']
        },
        websocket: {
          events: {
            client: {
              'connect': { file: 'socket.js' },
              'disconnect': { file: 'socket.js' }
            },
            server: {
              'message': { file: 'server.js' }
            }
          }
        },
        auth: {
          authentication: {
            methods: ['JWT', 'OAuth']
          },
          protectedRoutes: ['/admin', '/profile'],
          vulnerabilities: ['Weak password policy']
        },
        database: {
          models: [
            { name: 'User' },
            { name: 'Post' }
          ],
          performance: {
            nPlusOneQueries: ['getUserWithPosts']
          }
        },
        performance: {
          bundle: {
            largeDependencies: [
              { name: 'lodash', size: '500KB' }
            ]
          },
          rendering: {
            heavyComponents: ['Dashboard']
          }
        }
      }
    };
  });

  describe('format', () => {
    test('should format complete report as JSON', () => {
      const result = JSONFormatter.format(mockReport);
      
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(mockReport);
    });

    test('should format with 2-space indentation', () => {
      const result = JSONFormatter.format(mockReport);
      
      expect(result).toContain('  '); // Has indentation
      expect(result).toContain('{\n  "id"');
    });

    test('should handle null values', () => {
      const reportWithNull = { ...mockReport, nullValue: null };
      const result = JSONFormatter.format(reportWithNull);
      
      expect(result).toContain('"nullValue": null');
    });
  });

  describe('formatSummary', () => {
    test('should create summary with essential fields', () => {
      const result = JSONFormatter.formatSummary(mockReport);
      const parsed = JSON.parse(result);
      
      expect(parsed.id).toBe('test-report-123');
      expect(parsed.timestamp).toBe('2024-01-01T00:00:00.000Z');
      expect(parsed.project).toEqual({
        path: '/path/to/project',
        framework: 'React',
        language: 'JavaScript'
      });
      expect(parsed.metrics).toEqual(mockReport.metrics);
      expect(parsed.summary).toBe(mockReport.summary);
    });

    test('should limit insights to 5', () => {
      const result = JSONFormatter.formatSummary(mockReport);
      const parsed = JSON.parse(result);
      
      expect(parsed.keyInsights).toHaveLength(5);
      expect(parsed.keyInsights).not.toContain('Insight 6');
    });

    test('should limit recommendations to 3 with minimal fields', () => {
      const result = JSONFormatter.formatSummary(mockReport);
      const parsed = JSON.parse(result);
      
      expect(parsed.topRecommendations).toHaveLength(3);
      expect(parsed.topRecommendations[0]).toEqual({
        title: 'Recommendation 1',
        priority: 'high',
        impact: 'high'
      });
      expect(parsed.topRecommendations[0].description).toBeUndefined();
    });

    test('should handle empty insights and recommendations', () => {
      const minimalReport = {
        ...mockReport,
        insights: [],
        recommendations: []
      };
      
      const result = JSONFormatter.formatSummary(minimalReport);
      const parsed = JSON.parse(result);
      
      expect(parsed.keyInsights).toEqual([]);
      expect(parsed.topRecommendations).toEqual([]);
    });
  });

  describe('formatForAPI', () => {
    test('should create API-friendly format', () => {
      const result = JSONFormatter.formatForAPI(mockReport);
      
      expect(result.meta).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    test('should include meta information', () => {
      const result = JSONFormatter.formatForAPI(mockReport);
      
      expect(result.meta.id).toBe('test-report-123');
      expect(result.meta.timestamp).toBe('2024-01-01T00:00:00.000Z');
      expect(result.meta.framework).toBe('React');
      expect(result.meta.analysisTypes).toEqual(['api', 'components', 'websocket', 'auth', 'database', 'performance']);
    });

    test('should format summary section', () => {
      const result = JSONFormatter.formatForAPI(mockReport);
      
      expect(result.summary.description).toBe(mockReport.summary);
      expect(result.summary.insights).toEqual(mockReport.insights);
      expect(result.summary.recommendations).toHaveLength(4);
      expect(result.summary.recommendations[0]).toEqual({
        title: 'Recommendation 1',
        priority: 'high',
        description: 'Description 1'
      });
    });

    test('should flatten results', () => {
      const result = JSONFormatter.formatForAPI(mockReport);
      
      expect(result.results).toBeDefined();
      expect(typeof result.results).toBe('object');
      expect(result.results.api).toBeDefined();
      expect(result.results.components).toBeDefined();
    });
  });

  describe('flattenResults', () => {
    test('should flatten all result types', () => {
      const flattened = JSONFormatter.flattenResults(mockReport.results);
      
      expect(Object.keys(flattened)).toEqual(['api', 'components', 'websocket', 'auth', 'database', 'performance']);
    });

    test('should include count, issues, and summary for each type', () => {
      const flattened = JSONFormatter.flattenResults(mockReport.results);
      
      Object.values(flattened).forEach(result => {
        expect(result).toHaveProperty('count');
        expect(result).toHaveProperty('issues');
        expect(result).toHaveProperty('summary');
      });
    });

    test('should handle empty results object', () => {
      const flattened = JSONFormatter.flattenResults({});
      
      expect(flattened).toEqual({});
    });
  });

  describe('getResultCount', () => {
    test('should count API endpoints', () => {
      const count = JSONFormatter.getResultCount('api', mockReport.results.api);
      expect(count).toBe(2);
    });

    test('should count components', () => {
      const count = JSONFormatter.getResultCount('components', mockReport.results.components);
      expect(count).toBe(2);
    });

    test('should count WebSocket events (client + server)', () => {
      const count = JSONFormatter.getResultCount('websocket', mockReport.results.websocket);
      expect(count).toBe(3); // 2 client + 1 server
    });

    test('should count auth protected routes', () => {
      const count = JSONFormatter.getResultCount('auth', mockReport.results.auth);
      expect(count).toBe(2);
    });

    test('should count database models', () => {
      const count = JSONFormatter.getResultCount('database', mockReport.results.database);
      expect(count).toBe(2);
    });

    test('should count performance issues (dependencies + components)', () => {
      const count = JSONFormatter.getResultCount('performance', mockReport.results.performance);
      expect(count).toBe(2); // 1 large dep + 1 heavy component
    });

    test('should return 0 for unknown type', () => {
      const count = JSONFormatter.getResultCount('unknown', {});
      expect(count).toBe(0);
    });

    test('should handle missing data gracefully', () => {
      expect(JSONFormatter.getResultCount('api', {})).toBe(0);
      expect(JSONFormatter.getResultCount('components', {})).toBe(0);
      expect(JSONFormatter.getResultCount('websocket', {})).toBe(0);
    });
  });

  describe('extractIssues', () => {
    test('should extract security issues', () => {
      const issues = JSONFormatter.extractIssues(mockReport.results.api);
      
      expect(issues).toContain('No rate limiting');
      expect(issues).toContain('Missing authentication');
    });

    test('should extract performance issues', () => {
      const issues = JSONFormatter.extractIssues(mockReport.results.api);
      
      expect(issues).toContain('Slow query');
    });

    test('should extract general issues', () => {
      const issues = JSONFormatter.extractIssues(mockReport.results.components);
      
      expect(issues).toContain('Missing prop types');
    });

    test('should extract vulnerabilities', () => {
      const issues = JSONFormatter.extractIssues(mockReport.results.auth);
      
      expect(issues).toContain('Weak password policy');
    });

    test('should limit to 10 issues', () => {
      const dataWithManyIssues = {
        securityIssues: Array(5).fill('Security issue'),
        performanceIssues: Array(5).fill('Performance issue'),
        issues: Array(5).fill('General issue'),
        vulnerabilities: Array(5).fill('Vulnerability')
      };
      
      const issues = JSONFormatter.extractIssues(dataWithManyIssues);
      
      expect(issues).toHaveLength(10);
    });

    test('should return empty array for no issues', () => {
      const issues = JSONFormatter.extractIssues({});
      
      expect(issues).toEqual([]);
    });
  });

  describe('createTypeSummary', () => {
    test('should create API summary', () => {
      const summary = JSONFormatter.createTypeSummary('api', mockReport.results.api);
      
      expect(summary).toBe('Found 2 endpoints, 2 security issues');
    });

    test('should create components summary', () => {
      const summary = JSONFormatter.createTypeSummary('components', mockReport.results.components);
      
      expect(summary).toBe('Analyzed 2 components, 1 unused');
    });

    test('should create WebSocket summary', () => {
      const summary = JSONFormatter.createTypeSummary('websocket', mockReport.results.websocket);
      
      expect(summary).toBe('2 client events, 1 server events');
    });

    test('should create auth summary', () => {
      const summary = JSONFormatter.createTypeSummary('auth', mockReport.results.auth);
      
      expect(summary).toBe('2 auth methods, 2 protected routes');
    });

    test('should create database summary', () => {
      const summary = JSONFormatter.createTypeSummary('database', mockReport.results.database);
      
      expect(summary).toBe('2 models, 1 N+1 queries');
    });

    test('should create performance summary', () => {
      const summary = JSONFormatter.createTypeSummary('performance', mockReport.results.performance);
      
      expect(summary).toBe('1 large dependencies, 1 heavy components');
    });

    test('should return default summary for unknown type', () => {
      const summary = JSONFormatter.createTypeSummary('unknown', {});
      
      expect(summary).toBe('Analysis completed');
    });

    test('should handle missing data in summaries', () => {
      const summary = JSONFormatter.createTypeSummary('api', {});
      
      expect(summary).toBe('Found 0 endpoints, 0 security issues');
    });
  });

  describe('edge cases', () => {
    test('should handle circular references', () => {
      const circular = { ...mockReport };
      circular.self = circular;
      
      expect(() => JSONFormatter.format(circular)).toThrow();
    });

    test('should handle undefined values', () => {
      const reportWithUndefined = {
        ...mockReport,
        undefinedValue: undefined
      };
      
      const result = JSONFormatter.format(reportWithUndefined);
      expect(result).not.toContain('undefinedValue');
    });

    test('should handle Date objects', () => {
      const reportWithDate = {
        ...mockReport,
        dateValue: new Date('2024-01-01')
      };
      
      const result = JSONFormatter.format(reportWithDate);
      expect(result).toContain('"2024-01-01T00:00:00.000Z"');
    });
  });
});