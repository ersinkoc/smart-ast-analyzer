const MarkdownFormatter = require('../../lib/reporters/markdown-formatter');

// Mock package.json
jest.mock('../../package.json', () => ({
  version: '1.0.0'
}));

describe('MarkdownFormatter', () => {
  let mockReport;

  beforeEach(() => {
    mockReport = {
      timestamp: '2024-01-01T00:00:00.000Z',
      projectInfo: {
        path: '/path/to/project',
        framework: 'React',
        language: 'JavaScript',
        type: 'Web Application',
        metrics: {
          totalFiles: 100,
          totalLines: 5000
        },
        dependencies: {
          total: 25
        }
      },
      summary: 'This is a comprehensive analysis of the React project with various findings and recommendations.',
      results: {
        api: {
          endpoints: [
            {
              method: 'GET',
              path: '/api/users',
              handler: 'getUsers',
              auth: { required: true },
              issues: []
            },
            {
              method: 'POST',
              path: '/api/users',
              handler: 'createUser',
              auth: { required: false },
              issues: ['No authentication']
            }
          ],
          securityIssues: [
            {
              severity: 'high',
              issue: 'No rate limiting',
              endpoint: '/api/users'
            }
          ],
          orphanedEndpoints: ['/api/old-endpoint']
        },
        components: {
          components: {
            Button: {
              file: 'components/Button.js',
              type: 'functional',
              props: { onClick: 'function', label: 'string' },
              issues: []
            },
            Card: {
              file: 'components/Card.js',
              type: 'class',
              props: { title: 'string', content: 'string' },
              issues: ['Missing prop types']
            }
          },
          unusedComponents: ['OldButton'],
          circularDependencies: [['ComponentA', 'ComponentB', 'ComponentA']]
        },
        websocket: {
          events: {
            client: {
              'connect': { file: 'socket.js', line: 10 },
              'disconnect': { file: 'socket.js', line: 20 }
            },
            server: {
              'message': { file: 'server.js', line: 30 }
            }
          },
          issues: {
            security: ['No authentication for WebSocket connections']
          }
        },
        auth: {
          authentication: {
            methods: ['JWT', 'OAuth']
          },
          authorization: {
            type: 'RBAC'
          },
          protectedRoutes: ['/admin', '/profile'],
          security: {
            vulnerabilities: [
              {
                severity: 'medium',
                description: 'Weak password requirements'
              }
            ]
          }
        },
        database: {
          models: [
            {
              name: 'User',
              fields: ['id', 'name', 'email'],
              relationships: ['posts']
            },
            {
              name: 'Post',
              fields: ['id', 'title', 'content'],
              relationships: ['user']
            }
          ],
          performance: {
            nPlusOneQueries: [
              { description: 'User.getPosts() causes N+1 query' }
            ]
          }
        },
        performance: {
          bundle: {
            largeDependencies: [
              { name: 'lodash', size: '500KB' },
              { name: 'moment', size: '300KB' }
            ]
          },
          rendering: {
            heavyComponents: [
              { name: 'Dashboard', issues: ['Too many re-renders', 'Large state'] }
            ]
          },
          optimization: {
            immediate: ['Use React.memo for pure components', 'Implement code splitting']
          }
        }
      },
      insights: [
        'The application has good test coverage',
        'API endpoints need better authentication',
        'Consider migrating from moment.js to date-fns'
      ],
      recommendations: [
        {
          title: 'Implement Rate Limiting',
          description: 'Add rate limiting to prevent API abuse and ensure service stability.',
          priority: 'high',
          effort: 'medium',
          impact: 'high'
        },
        {
          title: 'Add PropTypes',
          description: 'Add prop type validation to all React components for better type safety.',
          priority: 'medium',
          effort: 'low',
          impact: 'medium'
        }
      ],
      metrics: {
        totalFiles: 100,
        codeQuality: 85,
        securityScore: 70,
        performanceScore: 75,
        maintainability: 80
      }
    };
  });

  describe('format', () => {
    test('should generate complete markdown report', () => {
      const markdown = MarkdownFormatter.format(mockReport);
      
      expect(markdown).toContain('# Smart AST Analysis Report');
      expect(markdown).toContain('**Generated:**');
      expect(markdown).toContain('**Project:** /path/to/project');
      expect(markdown).toContain('**Framework:** React');
      expect(markdown).toContain('**Language:** JavaScript');
    });

    test('should include executive summary', () => {
      const markdown = MarkdownFormatter.format(mockReport);
      
      expect(markdown).toContain('## Executive Summary');
      expect(markdown).toContain(mockReport.summary);
    });

    test('should include project overview', () => {
      const markdown = MarkdownFormatter.format(mockReport);
      
      expect(markdown).toContain('## Project Overview');
      expect(markdown).toContain('- **Type:** Web Application');
      expect(markdown).toContain('- **Total Files:** 100');
      expect(markdown).toContain('- **Total Lines:** 5000');
      expect(markdown).toContain('- **Dependencies:** 25');
    });

    test('should include all sections', () => {
      const markdown = MarkdownFormatter.format(mockReport);
      
      expect(markdown).toContain('## Analysis Results');
      expect(markdown).toContain('## Key Insights');
      expect(markdown).toContain('## Recommendations');
      expect(markdown).toContain('## Metrics Summary');
    });

    test('should include footer with version', () => {
      const markdown = MarkdownFormatter.format(mockReport);
      
      expect(markdown).toContain('*Generated by Smart AST Analyzer v1.0.0*');
    });

    test('should handle missing metrics gracefully', () => {
      const reportWithoutMetrics = {
        ...mockReport,
        projectInfo: {
          ...mockReport.projectInfo,
          metrics: undefined
        }
      };
      
      const markdown = MarkdownFormatter.format(reportWithoutMetrics);
      
      expect(markdown).toContain('- **Total Files:** Unknown');
      expect(markdown).toContain('- **Total Lines:** Unknown');
    });
  });

  describe('formatAnalysisResults', () => {
    test('should format all result types', () => {
      const results = MarkdownFormatter.formatAnalysisResults(mockReport.results);
      
      expect(results).toContain('### API Endpoints');
      expect(results).toContain('### Component Architecture');
      expect(results).toContain('### WebSocket Events');
      expect(results).toContain('### Authentication & Authorization');
      expect(results).toContain('### Database Analysis');
      expect(results).toContain('### Performance Analysis');
    });

    test('should handle empty results', () => {
      const results = MarkdownFormatter.formatAnalysisResults({});
      
      expect(results).toBe('');
    });
  });

  describe('formatAPIResults', () => {
    test('should format API endpoints table', () => {
      const apiResults = MarkdownFormatter.formatAPIResults(mockReport.results.api);
      
      expect(apiResults).toContain('### API Endpoints');
      expect(apiResults).toContain('**Total Endpoints:** 2');
      expect(apiResults).toContain('| Method | Path | Handler | Auth Required | Issues |');
      expect(apiResults).toContain('| GET | `/api/users` | getUsers | Yes | 0 |');
      expect(apiResults).toContain('| POST | `/api/users` | createUser | No | 1 |');
    });

    test('should include security issues', () => {
      const apiResults = MarkdownFormatter.formatAPIResults(mockReport.results.api);
      
      expect(apiResults).toContain('#### Security Issues');
      expect(apiResults).toContain('- **HIGH**: No rate limiting (/api/users)');
    });

    test('should include orphaned endpoints', () => {
      const apiResults = MarkdownFormatter.formatAPIResults(mockReport.results.api);
      
      expect(apiResults).toContain('#### Orphaned Endpoints');
      expect(apiResults).toContain('- `/api/old-endpoint`');
    });

    test('should handle missing endpoints', () => {
      const apiResults = MarkdownFormatter.formatAPIResults({});
      
      expect(apiResults).toBe('');
    });

    test('should limit endpoints to 20', () => {
      const manyEndpoints = Array(30).fill(null).map((_, i) => ({
        method: 'GET',
        path: `/api/endpoint${i}`,
        handler: `handler${i}`,
        auth: { required: false }
      }));
      
      const apiResults = MarkdownFormatter.formatAPIResults({ endpoints: manyEndpoints });
      const matches = apiResults.match(/\| GET \|/g);
      
      expect(matches).toHaveLength(20);
    });
  });

  describe('formatComponentResults', () => {
    test('should format component summary', () => {
      const componentResults = MarkdownFormatter.formatComponentResults(mockReport.results.components);
      
      expect(componentResults).toContain('### Component Architecture');
      expect(componentResults).toContain('**Total Components:** 2');
      expect(componentResults).toContain('**Button**');
      expect(componentResults).toContain('- File: `components/Button.js`');
      expect(componentResults).toContain('- Type: functional');
      expect(componentResults).toContain('- Props: 2');
    });

    test('should include unused components', () => {
      const componentResults = MarkdownFormatter.formatComponentResults(mockReport.results.components);
      
      expect(componentResults).toContain('#### Unused Components');
      expect(componentResults).toContain('- `OldButton`');
    });

    test('should include circular dependencies', () => {
      const componentResults = MarkdownFormatter.formatComponentResults(mockReport.results.components);
      
      expect(componentResults).toContain('#### Circular Dependencies');
      expect(componentResults).toContain('- ComponentA → ComponentB → ComponentA');
    });

    test('should handle missing components', () => {
      const componentResults = MarkdownFormatter.formatComponentResults({});
      
      expect(componentResults).toBe('');
    });
  });

  describe('formatWebSocketResults', () => {
    test('should format WebSocket events', () => {
      const wsResults = MarkdownFormatter.formatWebSocketResults(mockReport.results.websocket);
      
      expect(wsResults).toContain('### WebSocket Events');
      expect(wsResults).toContain('**Client Events:** 2');
      expect(wsResults).toContain('**Server Events:** 1');
      expect(wsResults).toContain('- **connect**: socket.js (Line 10)');
      expect(wsResults).toContain('- **disconnect**: socket.js (Line 20)');
    });

    test('should include security issues', () => {
      const wsResults = MarkdownFormatter.formatWebSocketResults(mockReport.results.websocket);
      
      expect(wsResults).toContain('#### Security Issues');
      expect(wsResults).toContain('- No authentication for WebSocket connections');
    });

    test('should handle missing events', () => {
      const wsResults = MarkdownFormatter.formatWebSocketResults({});
      
      expect(wsResults).toBe('');
    });
  });

  describe('formatAuthResults', () => {
    test('should format authentication details', () => {
      const authResults = MarkdownFormatter.formatAuthResults(mockReport.results.auth);
      
      expect(authResults).toContain('### Authentication & Authorization');
      expect(authResults).toContain('**Auth Methods:** JWT, OAuth');
      expect(authResults).toContain('**Authorization Type:** RBAC');
      expect(authResults).toContain('**Protected Routes:** 2');
    });

    test('should include security vulnerabilities', () => {
      const authResults = MarkdownFormatter.formatAuthResults(mockReport.results.auth);
      
      expect(authResults).toContain('#### Security Analysis');
      expect(authResults).toContain('- **MEDIUM**: Weak password requirements');
    });

    test('should handle missing authentication', () => {
      const authResults = MarkdownFormatter.formatAuthResults({});
      
      expect(authResults).toBe('');
    });

    test('should handle no vulnerabilities', () => {
      const authWithoutVulns = {
        authentication: { methods: ['JWT'] },
        security: {}
      };
      
      const authResults = MarkdownFormatter.formatAuthResults(authWithoutVulns);
      
      expect(authResults).toContain('No vulnerabilities found');
    });
  });

  describe('formatDatabaseResults', () => {
    test('should format database analysis', () => {
      const dbResults = MarkdownFormatter.formatDatabaseResults(mockReport.results.database);
      
      expect(dbResults).toContain('### Database Analysis');
      expect(dbResults).toContain('**Models:** 2');
      expect(dbResults).toContain('**Query Performance Issues:** 1');
      expect(dbResults).toContain('- **User**: 3 fields, 1 relationships');
      expect(dbResults).toContain('- **Post**: 3 fields, 1 relationships');
    });

    test('should include performance issues', () => {
      const dbResults = MarkdownFormatter.formatDatabaseResults(mockReport.results.database);
      
      expect(dbResults).toContain('#### Performance Issues');
      expect(dbResults).toContain('- User.getPosts() causes N+1 query');
    });

    test('should handle missing models', () => {
      const dbResults = MarkdownFormatter.formatDatabaseResults({});
      
      expect(dbResults).toBe('');
    });
  });

  describe('formatPerformanceResults', () => {
    test('should format performance analysis', () => {
      const perfResults = MarkdownFormatter.formatPerformanceResults(mockReport.results.performance);
      
      expect(perfResults).toContain('### Performance Analysis');
      expect(perfResults).toContain('#### Bundle Analysis');
      expect(perfResults).toContain('**Large Dependencies:**');
      expect(perfResults).toContain('- lodash: 500KB');
      expect(perfResults).toContain('- moment: 300KB');
    });

    test('should include rendering performance', () => {
      const perfResults = MarkdownFormatter.formatPerformanceResults(mockReport.results.performance);
      
      expect(perfResults).toContain('#### Rendering Performance');
      expect(perfResults).toContain('**Heavy Components:**');
      expect(perfResults).toContain('- Dashboard: Too many re-renders, Large state');
    });

    test('should include optimization opportunities', () => {
      const perfResults = MarkdownFormatter.formatPerformanceResults(mockReport.results.performance);
      
      expect(perfResults).toContain('#### Optimization Opportunities');
      expect(perfResults).toContain('**Immediate:**');
      expect(perfResults).toContain('- Use React.memo for pure components');
      expect(perfResults).toContain('- Implement code splitting');
    });

    test('should handle empty performance data', () => {
      const perfResults = MarkdownFormatter.formatPerformanceResults({});
      
      expect(perfResults).toContain('### Performance Analysis');
      expect(perfResults).not.toContain('**Large Dependencies:**');
    });
  });

  describe('formatRecommendations', () => {
    test('should format recommendations with numbering', () => {
      const recommendations = MarkdownFormatter.formatRecommendations(mockReport.recommendations);
      
      expect(recommendations).toContain('### 1. Implement Rate Limiting');
      expect(recommendations).toContain('### 2. Add PropTypes');
      expect(recommendations).toContain('**Priority:** high');
      expect(recommendations).toContain('**Effort:** medium');
      expect(recommendations).toContain('**Impact:** high');
    });

    test('should include descriptions', () => {
      const recommendations = MarkdownFormatter.formatRecommendations(mockReport.recommendations);
      
      expect(recommendations).toContain('Add rate limiting to prevent API abuse');
      expect(recommendations).toContain('Add prop type validation to all React components');
    });

    test('should handle empty recommendations', () => {
      const recommendations = MarkdownFormatter.formatRecommendations([]);
      
      expect(recommendations).toBe('');
    });
  });

  describe('formatMetrics', () => {
    test('should format metrics table', () => {
      const metrics = MarkdownFormatter.formatMetrics(mockReport.metrics);
      
      expect(metrics).toContain('| Metric | Value |');
      expect(metrics).toContain('| Total Files Analyzed | 100 |');
      expect(metrics).toContain('| Code Quality Score | 85 |');
      expect(metrics).toContain('| Security Score | 70 |');
      expect(metrics).toContain('| Performance Score | 75 |');
      expect(metrics).toContain('| Maintainability | 80 |');
    });

    test('should handle missing metrics', () => {
      const metrics = MarkdownFormatter.formatMetrics({});
      
      expect(metrics).toContain('| Total Files Analyzed | 0 |');
      expect(metrics).toContain('| Code Quality Score | N/A |');
      expect(metrics).toContain('| Security Score | N/A |');
    });
  });

  describe('edge cases', () => {
    test('should handle report with minimal data', () => {
      const minimalReport = {
        timestamp: new Date().toISOString(),
        projectInfo: {
          path: '/minimal',
          framework: 'Unknown',
          language: 'Unknown'
        },
        summary: 'Minimal analysis',
        results: {},
        insights: [],
        recommendations: [],
        metrics: {}
      };
      
      const markdown = MarkdownFormatter.format(minimalReport);
      
      expect(markdown).toContain('# Smart AST Analysis Report');
      expect(markdown).toContain('Minimal analysis');
    });

    test('should handle special characters in markdown', () => {
      const reportWithSpecialChars = {
        ...mockReport,
        summary: 'This has **bold** and *italic* and `code` text'
      };
      
      const markdown = MarkdownFormatter.format(reportWithSpecialChars);
      
      expect(markdown).toContain('This has **bold** and *italic* and `code` text');
    });

    test('should handle unknown result types gracefully', () => {
      const resultsWithUnknown = {
        ...mockReport.results,
        unknownType: { data: 'some data' }
      };
      
      const formatted = MarkdownFormatter.formatAnalysisResults(resultsWithUnknown);
      
      // Should not throw error and should format known types
      expect(formatted).toContain('### API Endpoints');
    });
  });
});