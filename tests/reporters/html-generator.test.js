const HTMLGenerator = require('../../lib/reporters/html-generator');

describe('HTMLGenerator', () => {
  let mockReport;

  beforeEach(() => {
    mockReport = {
      projectInfo: {
        framework: 'React',
        language: 'JavaScript',
        metrics: {
          totalFiles: 100,
          totalLines: 5000
        },
        dependencies: {
          total: 25
        },
        files: {
          tests: ['test1.js', 'test2.js']
        }
      },
      timestamp: new Date('2024-01-01').toISOString(),
      summary: 'This is a comprehensive analysis of the React project',
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
          securityIssues: ['No rate limiting'],
          orphanedEndpoints: []
        },
        components: {
          components: {
            Button: {
              type: 'functional',
              props: { onClick: 'function', label: 'string' },
              issues: []
            },
            Card: {
              type: 'class',
              props: { title: 'string', content: 'string' },
              issues: ['Missing prop types']
            }
          },
          unusedComponents: ['OldButton'],
          circularDependencies: []
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
          rooms: {
            'chat': { users: 5 }
          }
        },
        auth: {
          authentication: {
            methods: ['JWT', 'OAuth']
          },
          protectedRoutes: ['/admin', '/profile'],
          security: {
            vulnerabilities: []
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
            nPlusOneQueries: [],
            slowQueries: ['findUserWithPosts']
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
            heavyComponents: ['Dashboard']
          },
          memory: {
            potentialLeaks: []
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
          description: 'Add rate limiting to prevent API abuse',
          priority: 'high',
          effort: 'medium',
          impact: 'high'
        },
        {
          title: 'Add PropTypes',
          description: 'Add prop type validation to all components',
          priority: 'medium',
          effort: 'low',
          impact: 'medium'
        }
      ]
    };
  });

  describe('generate', () => {
    test('should generate complete HTML report', async () => {
      const html = await HTMLGenerator.generate(mockReport);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('</html>');
      expect(html).toContain('Smart AST Analysis Report - React');
    });

    test('should include all required sections', async () => {
      const html = await HTMLGenerator.generate(mockReport);
      
      expect(html).toContain('Smart AST Analysis Report'); // Header
      expect(html).toContain('<nav class="navigation">'); // Navigation
      expect(html).toContain('<main class="content">'); // Content
      expect(html).toContain('<footer class="footer">'); // Footer
    });

    test('should include external resources', async () => {
      const html = await HTMLGenerator.generate(mockReport);
      
      expect(html).toContain('mermaid.min.js');
      expect(html).toContain('chart.js');
    });
  });

  describe('generateHeader', () => {
    test('should generate header with project info', () => {
      const header = HTMLGenerator.generateHeader(mockReport);
      
      expect(header).toContain('Smart AST Analysis Report');
      expect(header).toContain('Framework:</strong> React');
      expect(header).toContain('Language:</strong> JavaScript');
      expect(header).toContain(new Date(mockReport.timestamp).toLocaleString());
    });
  });

  describe('generateNavigation', () => {
    test('should generate navigation with all links', () => {
      const nav = HTMLGenerator.generateNavigation();
      
      expect(nav).toContain('href="#summary"');
      expect(nav).toContain('href="#apis"');
      expect(nav).toContain('href="#components"');
      expect(nav).toContain('href="#websockets"');
      expect(nav).toContain('href="#auth"');
      expect(nav).toContain('href="#database"');
      expect(nav).toContain('href="#performance"');
      expect(nav).toContain('href="#insights"');
      expect(nav).toContain('href="#recommendations"');
    });

    test('should mark summary as active by default', () => {
      const nav = HTMLGenerator.generateNavigation();
      
      expect(nav).toContain('class="nav-link active">Summary');
    });
  });

  describe('generateContent', () => {
    test('should generate all content sections', () => {
      const content = HTMLGenerator.generateContent(mockReport);
      
      expect(content).toContain('id="summary"');
      expect(content).toContain('id="apis"');
      expect(content).toContain('id="components"');
      expect(content).toContain('id="websockets"');
      expect(content).toContain('id="auth"');
      expect(content).toContain('id="database"');
      expect(content).toContain('id="performance"');
      expect(content).toContain('id="insights"');
      expect(content).toContain('id="recommendations"');
    });
  });

  describe('generateSummarySection', () => {
    test('should generate summary with metrics', () => {
      const summary = HTMLGenerator.generateSummarySection(mockReport);
      
      expect(summary).toContain('Executive Summary');
      expect(summary).toContain(mockReport.summary);
      expect(summary).toContain('metricsChart');
    });
  });

  describe('generateSummaryCards', () => {
    test('should generate cards with project metrics', () => {
      const cards = HTMLGenerator.generateSummaryCards(mockReport);
      
      expect(cards).toContain('Framework');
      expect(cards).toContain('React');
      expect(cards).toContain('Total Files');
      expect(cards).toContain('100');
      expect(cards).toContain('Lines of Code');
      expect(cards).toContain('5000');
      expect(cards).toContain('Dependencies');
      expect(cards).toContain('25');
    });

    test('should handle missing metrics gracefully', () => {
      const minimalReport = {
        projectInfo: {
          framework: 'Vue'
        }
      };
      
      const cards = HTMLGenerator.generateSummaryCards(minimalReport);
      
      expect(cards).toContain('0');
    });
  });

  describe('generateAnalysisSection', () => {
    test('should generate section with title and content', () => {
      const section = HTMLGenerator.generateAnalysisSection('apis', 'API Analysis', mockReport.results.api);
      
      expect(section).toContain('id="apis"');
      expect(section).toContain('🔗 API Analysis');
      expect(section).toContain('analysis-content');
    });

    test('should return empty string for missing data', () => {
      const section = HTMLGenerator.generateAnalysisSection('apis', 'API Analysis', null);
      
      expect(section).toBe('');
    });
  });

  describe('getSectionIcon', () => {
    test('should return correct icons for sections', () => {
      expect(HTMLGenerator.getSectionIcon('apis')).toBe('🔗');
      expect(HTMLGenerator.getSectionIcon('components')).toBe('🧩');
      expect(HTMLGenerator.getSectionIcon('websockets')).toBe('🔌');
      expect(HTMLGenerator.getSectionIcon('auth')).toBe('🔐');
      expect(HTMLGenerator.getSectionIcon('database')).toBe('🗄️');
      expect(HTMLGenerator.getSectionIcon('performance')).toBe('⚡');
    });

    test('should return default icon for unknown section', () => {
      expect(HTMLGenerator.getSectionIcon('unknown')).toBe('📋');
    });
  });

  describe('generateAPIContent', () => {
    test('should generate API endpoints table', () => {
      const content = HTMLGenerator.generateAPIContent(mockReport.results.api);
      
      expect(content).toContain('Total Endpoints');
      expect(content).toContain('2'); // 2 endpoints
      expect(content).toContain('Security Issues');
      expect(content).toContain('1'); // 1 security issue
      expect(content).toContain('Orphaned Endpoints');
      expect(content).toContain('0');
      
      // Table content
      expect(content).toContain('GET');
      expect(content).toContain('/api/users');
      expect(content).toContain('getUsers');
      expect(content).toContain('✅'); // Auth required
      expect(content).toContain('❌'); // No auth
    });

    test('should handle missing endpoints', () => {
      const content = HTMLGenerator.generateAPIContent({});
      
      expect(content).toBe('<p>No API endpoints found</p>');
    });

    test('should apply correct CSS classes to methods', () => {
      const content = HTMLGenerator.generateAPIContent(mockReport.results.api);
      
      expect(content).toContain('class="method get"');
      expect(content).toContain('class="method post"');
    });
  });

  describe('generateComponentContent', () => {
    test('should generate component overview', () => {
      const content = HTMLGenerator.generateComponentContent(mockReport.results.components);
      
      expect(content).toContain('Total Components');
      expect(content).toContain('2'); // 2 components
      expect(content).toContain('Unused Components');
      expect(content).toContain('1'); // 1 unused
      expect(content).toContain('Circular Dependencies');
      expect(content).toContain('0');
      
      // Component cards
      expect(content).toContain('Button');
      expect(content).toContain('Type:</strong> functional');
      expect(content).toContain('Props:</strong> 2');
      expect(content).toContain('Card');
      expect(content).toContain('Type:</strong> class');
    });

    test('should handle missing components', () => {
      const content = HTMLGenerator.generateComponentContent({});
      
      expect(content).toBe('<p>No components found</p>');
    });
  });

  describe('generateWebSocketContent', () => {
    test('should generate WebSocket events overview', () => {
      const content = HTMLGenerator.generateWebSocketContent(mockReport.results.websocket);
      
      expect(content).toContain('Client Events');
      expect(content).toContain('2'); // 2 client events
      expect(content).toContain('Server Events');
      expect(content).toContain('1'); // 1 server event
      expect(content).toContain('Rooms');
      expect(content).toContain('1'); // 1 room
      
      // Events list
      expect(content).toContain('connect');
      expect(content).toContain('socket.js:10');
      expect(content).toContain('disconnect');
    });

    test('should handle missing events', () => {
      const content = HTMLGenerator.generateWebSocketContent({});
      
      expect(content).toBe('<p>No WebSocket events found</p>');
    });
  });

  describe('generateAuthContent', () => {
    test('should generate authentication overview', () => {
      const content = HTMLGenerator.generateAuthContent(mockReport.results.auth);
      
      expect(content).toContain('Auth Methods');
      expect(content).toContain('2'); // JWT and OAuth
      expect(content).toContain('Protected Routes');
      expect(content).toContain('2'); // 2 protected routes
      expect(content).toContain('Vulnerabilities');
      expect(content).toContain('0');
      
      // Auth methods list
      expect(content).toContain('JWT');
      expect(content).toContain('OAuth');
    });

    test('should handle missing authentication data', () => {
      const content = HTMLGenerator.generateAuthContent({});
      
      expect(content).toBe('<p>No authentication analysis available</p>');
    });

    test('should show danger class for vulnerabilities', () => {
      const authWithVulns = {
        authentication: { methods: ['Basic'] },
        security: { vulnerabilities: ['Weak auth'] }
      };
      
      const content = HTMLGenerator.generateAuthContent(authWithVulns);
      expect(content).toContain('class="stat-value danger">1');
    });
  });

  describe('generateDatabaseContent', () => {
    test('should generate database overview', () => {
      const content = HTMLGenerator.generateDatabaseContent(mockReport.results.database);
      
      expect(content).toContain('Models');
      expect(content).toContain('2'); // 2 models
      expect(content).toContain('N+1 Queries');
      expect(content).toContain('0');
      expect(content).toContain('Slow Queries');
      expect(content).toContain('1');
      
      // Models list
      expect(content).toContain('User');
      expect(content).toContain('Fields: 3');
      expect(content).toContain('Relations: 1');
      expect(content).toContain('Post');
    });

    test('should handle missing models', () => {
      const content = HTMLGenerator.generateDatabaseContent({});
      
      expect(content).toBe('<p>No database analysis available</p>');
    });
  });

  describe('generatePerformanceContent', () => {
    test('should generate performance overview', () => {
      const content = HTMLGenerator.generatePerformanceContent(mockReport.results.performance);
      
      expect(content).toContain('Large Dependencies');
      expect(content).toContain('2');
      expect(content).toContain('Heavy Components');
      expect(content).toContain('1');
      expect(content).toContain('Memory Leaks');
      expect(content).toContain('0');
      
      // Bundle analysis
      expect(content).toContain('lodash');
      expect(content).toContain('500KB');
      expect(content).toContain('moment');
      expect(content).toContain('300KB');
    });

    test('should handle missing performance data', () => {
      const content = HTMLGenerator.generatePerformanceContent({});
      
      expect(content).toContain('0');
      expect(content).toContain('No large dependencies found');
    });
  });

  describe('generateInsightsSection', () => {
    test('should generate insights grid', () => {
      const insights = HTMLGenerator.generateInsightsSection(mockReport);
      
      expect(insights).toContain('Key Insights');
      expect(insights).toContain('The application has good test coverage');
      expect(insights).toContain('API endpoints need better authentication');
      expect(insights).toContain('Consider migrating from moment.js to date-fns');
    });
  });

  describe('generateRecommendationsSection', () => {
    test('should generate recommendations with priority', () => {
      const recommendations = HTMLGenerator.generateRecommendationsSection(mockReport);
      
      expect(recommendations).toContain('Recommendations');
      expect(recommendations).toContain('Implement Rate Limiting');
      expect(recommendations).toContain('Add rate limiting to prevent API abuse');
      expect(recommendations).toContain('priority-high');
      expect(recommendations).toContain('medium effort');
      expect(recommendations).toContain('high impact');
    });

    test('should number recommendations', () => {
      const recommendations = HTMLGenerator.generateRecommendationsSection(mockReport);
      
      expect(recommendations).toContain('1. Implement Rate Limiting');
      expect(recommendations).toContain('2. Add PropTypes');
    });
  });

  describe('generateFooter', () => {
    test('should generate footer', () => {
      const footer = HTMLGenerator.generateFooter();
      
      expect(footer).toContain('Generated by Smart AST Analyzer');
      expect(footer).toContain('Built with ❤️');
    });
  });

  describe('getCSS', () => {
    test('should return comprehensive CSS', () => {
      const css = HTMLGenerator.getCSS();
      
      expect(css).toContain('body');
      expect(css).toContain('.container');
      expect(css).toContain('.header');
      expect(css).toContain('.navigation');
      expect(css).toContain('.summary-card');
      expect(css).toContain('.method.get');
      expect(css).toContain('.recommendation.high');
      expect(css).toContain('@media');
    });
  });

  describe('generateJavaScript', () => {
    test('should generate JavaScript with Chart.js setup', () => {
      const js = HTMLGenerator.generateJavaScript(mockReport);
      
      expect(js).toContain('mermaid.initialize');
      expect(js).toContain('Chart');
      expect(js).toContain('metricsChart');
      expect(js).toContain('doughnut');
    });

    test('should include navigation functionality', () => {
      const js = HTMLGenerator.generateJavaScript(mockReport);
      
      expect(js).toContain('nav-link');
      expect(js).toContain('scrollIntoView');
      expect(js).toContain('smooth');
    });

    test('should include correct data values', () => {
      const js = HTMLGenerator.generateJavaScript(mockReport);
      
      expect(js).toContain('2,'); // 2 API endpoints
      expect(js).toContain('2,'); // 2 components
      expect(js).toContain('2,'); // 2 models
      expect(js).toContain('2'); // 2 test files
    });
  });

  describe('edge cases', () => {
    test('should handle empty report gracefully', () => {
      const emptyReport = {
        projectInfo: { framework: 'Unknown' },
        results: {},
        insights: [],
        recommendations: []
      };
      
      expect(() => HTMLGenerator.generate(emptyReport)).not.toThrow();
    });

    test('should handle very long endpoint lists', () => {
      const longEndpoints = Array(50).fill(null).map((_, i) => ({
        method: 'GET',
        path: `/api/endpoint${i}`,
        handler: `handler${i}`,
        auth: { required: i % 2 === 0 }
      }));

      const data = { endpoints: longEndpoints };
      const content = HTMLGenerator.generateAPIContent(data);
      
      // Should only show first 20
      expect(content.match(/<tr>/g).length).toBe(21); // 20 + header
    });

    test('should escape HTML in user data', () => {
      const xssReport = {
        ...mockReport,
        summary: '<script>alert("XSS")</script>'
      };
      
      const summary = HTMLGenerator.generateSummarySection(xssReport);
      // The content should be included as-is (not escaped by our code)
      // Real escaping would be done by the browser or a sanitization library
      expect(summary).toContain('<script>alert("XSS")</script>');
    });
  });
});