const ReportBuilder = require('../../lib/reporters/report-builder');
const fs = require('fs').promises;
const path = require('path');
const JSONFormatter = require('../../lib/reporters/json-formatter');
const MarkdownFormatter = require('../../lib/reporters/markdown-formatter');
const HTMLGenerator = require('../../lib/reporters/html-generator');
const MetricsVisualizer = require('../../lib/reporters/metrics-visualizer');

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn()
  }
}));

jest.mock('../../lib/reporters/json-formatter');
jest.mock('../../lib/reporters/markdown-formatter');
jest.mock('../../lib/reporters/html-generator');
jest.mock('../../lib/reporters/metrics-visualizer');

describe('ReportBuilder', () => {
  let builder;
  let mockAnalysisResults;
  let mockProjectInfo;

  beforeEach(() => {
    jest.clearAllMocks();
    
    builder = new ReportBuilder();
    
    mockProjectInfo = {
      path: '/path/to/project',
      framework: 'React',
      language: 'JavaScript',
      metrics: {
        totalFiles: 100,
        codeFiles: 80,
        totalLines: 5000
      }
    };
    
    mockAnalysisResults = {
      api: {
        endpoints: [
          { method: 'GET', path: '/api/users', auth: { required: true } },
          { method: 'POST', path: '/api/users', auth: { required: false } }
        ],
        orphanedEndpoints: ['/api/old-endpoint'],
        securityIssues: [
          { severity: 'critical', issue: 'SQL Injection' },
          { severity: 'high', issue: 'Missing auth' }
        ]
      },
      components: {
        components: {
          Button: { type: 'functional' },
          Card: { type: 'class' }
        },
        unusedComponents: ['OldButton'],
        circularDependencies: [['A', 'B', 'A']],
        propDrilling: [
          { component: 'App', depth: 5 }
        ]
      },
      websocket: {
        events: {
          client: { connect: {}, disconnect: {} },
          server: { message: {} }
        }
      },
      database: {
        models: [{ name: 'User' }, { name: 'Post' }],
        performance: {
          nPlusOneQueries: [{ query: 'User.getPosts' }],
          missingIndexes: [{ table: 'posts', column: 'user_id' }]
        }
      },
      performance: {
        bundle: {
          largeDependencies: [
            { name: 'lodash', size: '500KB' },
            { name: 'moment', size: '1.2MB' }
          ]
        },
        rendering: {
          heavyComponents: [{ name: 'Dashboard' }]
        }
      },
      auth: {
        security: {
          vulnerabilities: [
            { severity: 'critical', description: 'Weak password' }
          ]
        }
      }
    };

    // Mock formatter outputs
    JSONFormatter.format.mockReturnValue('{"formatted":"json"}');
    MarkdownFormatter.format.mockReturnValue('# Formatted Markdown');
    HTMLGenerator.generate.mockResolvedValue('<html>Formatted HTML</html>');
  });

  describe('constructor', () => {
    test('should use default output directory', () => {
      expect(builder.outputDir).toMatch(/smart-ast-output$/);
    });

    test('should use custom output directory', () => {
      const customBuilder = new ReportBuilder({ output: './custom-output' });
      expect(customBuilder.outputDir).toMatch(/custom-output$/);
    });

    test('should default to single format', () => {
      expect(builder.formats).toEqual([undefined]);
    });

    test('should handle "all" format option', () => {
      const allBuilder = new ReportBuilder({ format: 'all' });
      expect(allBuilder.formats).toEqual(['json', 'markdown', 'html']);
    });

    test('should use specified format', () => {
      const mdBuilder = new ReportBuilder({ format: 'markdown' });
      expect(mdBuilder.formats).toEqual(['markdown']);
    });
  });

  describe('build', () => {
    test('should create output directory', async () => {
      await builder.build(mockAnalysisResults, mockProjectInfo);
      
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('smart-ast-output'),
        { recursive: true }
      );
    });

    test('should generate report with all required fields', async () => {
      const result = await builder.build(mockAnalysisResults, mockProjectInfo);
      
      expect(result).toHaveProperty('reportId');
      expect(result.reportId).toMatch(/^analysis-\d+$/);
      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('outputDir');
    });

    test('should generate files for all requested formats', async () => {
      const allBuilder = new ReportBuilder({ format: 'all' });
      const result = await allBuilder.build(mockAnalysisResults, mockProjectInfo);
      
      expect(result.files).toHaveLength(3);
      expect(fs.writeFile).toHaveBeenCalledTimes(4); // 3 reports + 1 index
    });

    test('should handle format generation errors gracefully', async () => {
      HTMLGenerator.generate.mockRejectedValue(new Error('HTML generation failed'));
      const allBuilder = new ReportBuilder({ format: 'all' });
      
      const result = await allBuilder.build(mockAnalysisResults, mockProjectInfo);
      
      expect(result.files).toHaveLength(2); // Only JSON and Markdown succeed
    });

    test('should update index after report generation', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found')); // No existing index
      
      await builder.build(mockAnalysisResults, mockProjectInfo);
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('index.json'),
        expect.stringContaining('"analysis-')
      );
    });

    test('should handle visualization generation errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Add deepAnalysis to trigger visualization
      const analysisWithDeep = {
        ...mockAnalysisResults,
        deepAnalysis: {
          complexity: { functions: [] },
          security: { vulnerabilities: [] }
        }
      };
      
      // Mock the metricsVisualizer instance to throw an error
      builder.metricsVisualizer = {
        generateVisualization: jest.fn().mockRejectedValue(new Error('Viz generation failed'))
      };
      
      const result = await builder.build(analysisWithDeep, mockProjectInfo);
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to generate visualizations:', 'Viz generation failed');
      expect(result.files).toBeDefined(); // Should still generate other reports
      
      consoleSpy.mockRestore();
    });

    test('should generate visualizations when deepAnalysis exists', async () => {
      const analysisWithDeep = {
        ...mockAnalysisResults,
        deepAnalysis: {
          complexity: { functions: [] },
          security: { vulnerabilities: [] }
        }
      };
      
      // Mock the metricsVisualizer instance to succeed
      const mockVizDir = '/path/to/viz';
      builder.metricsVisualizer = {
        generateVisualization: jest.fn().mockResolvedValue(mockVizDir)
      };
      
      const result = await builder.build(analysisWithDeep, mockProjectInfo);
      
      expect(result.files).toContain(mockVizDir);
    });
  });

  describe('generateJSON', () => {
    test('should generate JSON file', async () => {
      const report = {
        id: 'test-123',
        timestamp: new Date().toISOString()
      };
      
      const filepath = await builder.generateJSON(report);
      
      expect(JSONFormatter.format).toHaveBeenCalledWith(report);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-123.json'),
        '{"formatted":"json"}'
      );
      expect(filepath).toContain('test-123.json');
    });
  });

  describe('generateMARKDOWN', () => {
    test('should generate Markdown file', async () => {
      const report = {
        id: 'test-456',
        timestamp: new Date().toISOString()
      };
      
      const filepath = await builder.generateMARKDOWN(report);
      
      expect(MarkdownFormatter.format).toHaveBeenCalledWith(report);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-456.md'),
        '# Formatted Markdown'
      );
      expect(filepath).toContain('test-456.md');
    });
  });

  describe('generateHTML', () => {
    test('should generate HTML file', async () => {
      const report = {
        id: 'test-789',
        timestamp: new Date().toISOString()
      };
      
      const filepath = await builder.generateHTML(report);
      
      expect(HTMLGenerator.generate).toHaveBeenCalledWith(report);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-789.html'),
        '<html>Formatted HTML</html>'
      );
      expect(filepath).toContain('test-789.html');
    });
  });

  describe('generateSummary', () => {
    test('should generate comprehensive summary', () => {
      const summary = builder.generateSummary(mockAnalysisResults, mockProjectInfo);
      
      expect(summary).toContain('Analyzed React project with 100 files');
      expect(summary).toContain('Found 2 API endpoints');
      expect(summary).toContain('1 orphaned endpoints');
      expect(summary).toContain('2 security issues');
      expect(summary).toContain('analyzed 2 components');
      expect(summary).toContain('1 unused components');
      expect(summary).toContain('1 circular dependencies');
      expect(summary).toContain('identified 3 WebSocket events');
      expect(summary).toContain('2 database models');
      expect(summary).toContain('1 N+1 query issues');
      expect(summary).toContain('2 large dependencies');
      expect(summary).toContain('1 performance concerns');
    });

    test('should handle missing analysis sections', () => {
      const minimalResults = { api: { endpoints: [] } };
      const summary = builder.generateSummary(minimalResults, mockProjectInfo);
      
      expect(summary).toContain('Analyzed React project');
      expect(summary).toContain('Found 0 API endpoints');
      expect(summary.endsWith('.')).toBe(true);
    });

    test('should handle empty results gracefully', () => {
      const summary = builder.generateSummary({}, mockProjectInfo);
      
      expect(summary).toContain('Analyzed React project');
      expect(summary.endsWith('.')).toBe(true);
    });
  });

  describe('generateInsights', () => {
    test('should generate API security insights', () => {
      const insights = builder.generateInsights(mockAnalysisResults);
      
      expect(insights).toContain('Found 2 security vulnerabilities in API endpoints');
      expect(insights).toContain('1 API endpoints are not being used and can be removed');
    });

    test('should detect unprotected endpoints', () => {
      const results = {
        api: {
          endpoints: Array(10).fill({ auth: { required: false } })
        }
      };
      
      const insights = builder.generateInsights(results);
      
      expect(insights).toContain('10 endpoints lack authentication protection');
    });

    test('should generate component insights', () => {
      const insights = builder.generateInsights(mockAnalysisResults);
      
      expect(insights).toContain('Detected 1 circular dependencies that may cause runtime issues');
      expect(insights).toContain('Found 1 instances of deep prop drilling (>3 levels)');
      expect(insights).toContain('1 components are defined but never used');
    });

    test('should generate performance insights', () => {
      const insights = builder.generateInsights(mockAnalysisResults);
      
      expect(insights.some(i => i.includes('Large dependencies contribute') && i.includes('KB to bundle size'))).toBe(true);
      expect(insights).toContain('1 components may cause performance bottlenecks');
    });

    test('should generate database insights', () => {
      const insights = builder.generateInsights(mockAnalysisResults);
      
      expect(insights).toContain('1 potential N+1 query problems detected');
      expect(insights).toContain('1 database queries could benefit from indexes');
    });

    test('should generate auth insights', () => {
      const insights = builder.generateInsights(mockAnalysisResults);
      
      expect(insights).toContain('Found 1 critical security vulnerabilities in authentication system');
    });

    test('should handle empty results', () => {
      const insights = builder.generateInsights({});
      
      expect(insights).toEqual([]);
    });
  });

  describe('generateRecommendations', () => {
    test('should generate API recommendations', () => {
      const recommendations = builder.generateRecommendations(mockAnalysisResults);
      
      const orphanedRec = recommendations.find(r => r.title === 'Remove Orphaned API Endpoints');
      expect(orphanedRec).toBeDefined();
      expect(orphanedRec.priority).toBe('medium');
      
      const securityRec = recommendations.find(r => r.title === 'Fix Critical Security Issues');
      expect(securityRec).toBeDefined();
      expect(securityRec.priority).toBe('high');
    });

    test('should generate component recommendations', () => {
      const recommendations = builder.generateRecommendations(mockAnalysisResults);
      
      const unusedRec = recommendations.find(r => r.title === 'Remove Unused Components');
      expect(unusedRec).toBeDefined();
      expect(unusedRec.priority).toBe('low');
      
      const circularRec = recommendations.find(r => r.title === 'Resolve Circular Dependencies');
      expect(circularRec).toBeDefined();
      expect(circularRec.priority).toBe('high');
    });

    test('should generate performance recommendations', () => {
      const recommendations = builder.generateRecommendations(mockAnalysisResults);
      
      const bundleRec = recommendations.find(r => r.title === 'Optimize Bundle Size');
      expect(bundleRec).toBeDefined();
      
      const componentRec = recommendations.find(r => r.title === 'Optimize Component Performance');
      expect(componentRec).toBeDefined();
    });

    test('should generate database recommendations', () => {
      const recommendations = builder.generateRecommendations(mockAnalysisResults);
      
      const nPlusOneRec = recommendations.find(r => r.title === 'Fix N+1 Query Problems');
      expect(nPlusOneRec).toBeDefined();
      expect(nPlusOneRec.priority).toBe('high');
    });

    test('should recommend comprehensive analysis for limited results', () => {
      const limitedResults = { api: {} };
      const recommendations = builder.generateRecommendations(limitedResults);
      
      const comprehensiveRec = recommendations.find(r => r.title === 'Perform Comprehensive Analysis');
      expect(comprehensiveRec).toBeDefined();
    });

    test('should limit recommendations to 10', () => {
      const manyIssues = {
        api: {
          orphanedEndpoints: Array(20).fill('/endpoint'),
          securityIssues: Array(20).fill({ severity: 'critical' })
        },
        components: {
          unusedComponents: Array(20).fill('Component'),
          circularDependencies: Array(20).fill(['A', 'B', 'A'])
        },
        performance: {
          bundle: { largeDependencies: Array(10).fill({ name: 'lib', size: '1MB' }) },
          rendering: { heavyComponents: Array(10).fill({ name: 'Component' }) }
        },
        database: {
          performance: { nPlusOneQueries: Array(10).fill({ query: 'test' }) }
        }
      };
      
      const recommendations = builder.generateRecommendations(manyIssues);
      
      expect(recommendations.length).toBeLessThanOrEqual(10);
    });
  });

  describe('calculateMetrics', () => {
    test('should calculate basic metrics', () => {
      const metrics = builder.calculateMetrics(mockAnalysisResults, mockProjectInfo);
      
      expect(metrics.totalFiles).toBe(100);
      expect(metrics.codeFiles).toBe(80);
      expect(metrics.totalLines).toBe(5000);
      expect(metrics.analysisTypes).toBe(6); // 6 analysis types
    });

    test('should calculate security score', () => {
      const metrics = builder.calculateMetrics(mockAnalysisResults, mockProjectInfo);
      
      expect(metrics.securityScore).toBeLessThan(100);
      expect(metrics.securityScore).toBeGreaterThan(0);
    });

    test('should calculate performance score', () => {
      const metrics = builder.calculateMetrics(mockAnalysisResults, mockProjectInfo);
      
      expect(metrics.performanceScore).toBeLessThan(100);
      expect(metrics.performanceScore).toBeGreaterThan(0);
    });

    test('should calculate maintainability score', () => {
      const metrics = builder.calculateMetrics(mockAnalysisResults, mockProjectInfo);
      
      expect(metrics.maintainabilityScore).toBeLessThan(100);
      expect(metrics.maintainabilityScore).toBeGreaterThan(0);
    });

    test('should calculate overall score', () => {
      const metrics = builder.calculateMetrics(mockAnalysisResults, mockProjectInfo);
      
      expect(metrics.overallScore).toBeDefined();
      expect(metrics.overallScore).toBeLessThanOrEqual(100);
      expect(metrics.overallScore).toBeGreaterThanOrEqual(0);
    });

    test('should handle perfect scores', () => {
      const perfectResults = {};
      const metrics = builder.calculateMetrics(perfectResults, mockProjectInfo);
      
      expect(metrics.securityScore).toBe(100);
      expect(metrics.performanceScore).toBe(100);
      expect(metrics.maintainabilityScore).toBe(100);
      expect(metrics.overallScore).toBe(100);
    });

    test('should cap scores at 0 and 100', () => {
      const terribleResults = {
        api: {
          securityIssues: Array(20).fill({ severity: 'critical' })
        },
        components: {
          circularDependencies: Array(10).fill(['A', 'B', 'A'])
        }
      };
      
      const metrics = builder.calculateMetrics(terribleResults, mockProjectInfo);
      
      expect(metrics.securityScore).toBe(0);
      expect(metrics.maintainabilityScore).toBe(0);
    });
  });

  describe('updateIndex', () => {
    test('should create new index if none exists', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));
      
      const report = {
        id: 'test-123',
        timestamp: new Date().toISOString(),
        projectInfo: mockProjectInfo,
        summary: 'Test summary',
        metrics: { overallScore: 85 },
        results: mockAnalysisResults
      };
      
      await builder.updateIndex(report);
      
      const writeCall = fs.writeFile.mock.calls.find(call => 
        call[0].includes('index.json')
      );
      
      expect(writeCall).toBeDefined();
      const indexData = JSON.parse(writeCall[1]);
      expect(indexData).toHaveLength(1);
      expect(indexData[0].id).toBe('test-123');
    });

    test('should append to existing index', async () => {
      const existingIndex = [
        { id: 'old-report', timestamp: '2023-01-01' }
      ];
      
      fs.readFile.mockResolvedValue(JSON.stringify(existingIndex));
      
      const report = {
        id: 'new-report',
        timestamp: new Date().toISOString(),
        projectInfo: mockProjectInfo,
        summary: 'New summary',
        metrics: { overallScore: 90 },
        results: mockAnalysisResults
      };
      
      await builder.updateIndex(report);
      
      const writeCall = fs.writeFile.mock.calls.find(call => 
        call[0].includes('index.json')
      );
      
      const indexData = JSON.parse(writeCall[1]);
      expect(indexData).toHaveLength(2);
      expect(indexData[0].id).toBe('new-report'); // Most recent first
      expect(indexData[1].id).toBe('old-report');
    });

    test('should limit index to 50 entries', async () => {
      const existingIndex = Array(50).fill(null).map((_, i) => ({
        id: `report-${i}`,
        timestamp: new Date(2023, 0, i + 1).toISOString()
      }));
      
      fs.readFile.mockResolvedValue(JSON.stringify(existingIndex));
      
      const report = {
        id: 'newest-report',
        timestamp: new Date().toISOString(),
        projectInfo: mockProjectInfo,
        summary: 'Newest summary',
        metrics: { overallScore: 95 },
        results: mockAnalysisResults
      };
      
      await builder.updateIndex(report);
      
      const writeCall = fs.writeFile.mock.calls.find(call => 
        call[0].includes('index.json')
      );
      
      const indexData = JSON.parse(writeCall[1]);
      expect(indexData).toHaveLength(50);
      expect(indexData[0].id).toBe('newest-report');
      expect(indexData[49].id).toBe('report-48'); // Last old entry kept
    });
  });

  describe('edge cases', () => {
    test('should handle malformed size strings in bundle analysis', () => {
      const results = {
        performance: {
          bundle: {
            largeDependencies: [
              { name: 'bad-dep', size: 'invalid' },
              { name: 'good-dep', size: '600KB' }
            ]
          }
        }
      };
      
      const insights = builder.generateInsights(results);
      
      // Should not crash and should handle good dependencies
      const sizeInsight = insights.find(i => i.includes('bundle size'));
      expect(sizeInsight).toBeDefined();
      expect(sizeInsight).toContain('600KB');
    });

    test('should handle empty project info', () => {
      const emptyProjectInfo = {};
      
      const summary = builder.generateSummary(mockAnalysisResults, emptyProjectInfo);
      expect(summary).toContain('Analyzed undefined project with 0 files');
      
      const metrics = builder.calculateMetrics(mockAnalysisResults, emptyProjectInfo);
      expect(metrics.totalFiles).toBe(0);
    });

    test('should handle report generation with minimal data', async () => {
      const minimalBuilder = new ReportBuilder({ format: 'json' });
      const minimalResults = {};
      const minimalProjectInfo = { framework: 'Unknown' };
      
      const result = await minimalBuilder.build(minimalResults, minimalProjectInfo);
      
      expect(result).toHaveProperty('reportId');
      expect(result.files).toHaveLength(1); // At least JSON should succeed
    });
  });
});