const MetricsVisualizer = require('../../lib/reporters/metrics-visualizer');
const fs = require('fs').promises;
const path = require('path');

jest.mock('fs').promises;

describe('MetricsVisualizer', () => {
  let visualizer;
  let mockMkdir;
  let mockWriteFile;

  beforeEach(() => {
    jest.clearAllMocks();
    visualizer = new MetricsVisualizer();
    
    mockMkdir = jest.fn().mockResolvedValue(undefined);
    mockWriteFile = jest.fn().mockResolvedValue(undefined);
    
    fs.mkdir = mockMkdir;
    fs.writeFile = mockWriteFile;
    
    console.log = jest.fn();
    console.warn = jest.fn();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(visualizer.options).toEqual({});
    });

    it('should initialize with custom options', () => {
      const options = { theme: 'dark' };
      visualizer = new MetricsVisualizer(options);
      expect(visualizer.options).toEqual(options);
    });
  });

  describe('generateVisualization', () => {
    it('should generate all visualization files', async () => {
      const analysisResults = {
        deepAnalysis: {
          complexity: {
            functions: [
              { name: 'test1', cyclomatic: 5, cognitive: 3, file: 'test.js' },
              { name: 'test2', cyclomatic: 10, cognitive: 8, file: 'test2.js' }
            ],
            overall: { score: 15 },
            cyclomatic: { 'file1.js': 5, 'file2.js': 10 }
          },
          dependencies: {
            cycles: [['module1', 'module2', 'module1']],
            graph: { 'file1.js': ['file2.js'] },
            external: new Set(['lodash']),
            internal: new Set(['./utils'])
          },
          security: {
            score: 85,
            vulnerabilities: [
              { severity: 'high', type: 'sql-injection' },
              { severity: 'medium', type: 'xss' }
            ]
          },
          performance: {
            bottlenecks: [
              { type: 'loop-complexity' },
              { type: 'memory-leak' }
            ]
          }
        }
      };

      const outputPath = '/test/output';
      const result = await visualizer.generateVisualization(analysisResults, outputPath);

      expect(mockMkdir).toHaveBeenCalledWith(
        path.join(outputPath, 'visualizations'),
        { recursive: true }
      );

      expect(mockWriteFile).toHaveBeenCalledTimes(4);
      expect(result).toBe(path.join(outputPath, 'visualizations'));
    });

    it('should handle missing deep analysis data', async () => {
      const analysisResults = {};
      const outputPath = '/test/output';

      await visualizer.generateVisualization(analysisResults, outputPath);

      expect(mockMkdir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalledTimes(4);
    });

    it('should handle file write errors gracefully', async () => {
      mockWriteFile.mockRejectedValueOnce(new Error('Write failed'));
      
      const analysisResults = { deepAnalysis: {} };
      const outputPath = '/test/output';

      await visualizer.generateVisualization(analysisResults, outputPath);

      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('generateComplexityCharts', () => {
    it('should generate complexity distribution data', () => {
      const results = {
        deepAnalysis: {
          complexity: {
            functions: [
              { cyclomatic: 3, cognitive: 2 },
              { cyclomatic: 8, cognitive: 5 },
              { cyclomatic: 15, cognitive: 10 },
              { cyclomatic: 22, cognitive: 15 }
            ]
          }
        }
      };

      const charts = visualizer.generateComplexityCharts(results);

      expect(charts.distribution.type).toBe('bar');
      expect(charts.distribution.data.labels).toEqual(['1-5', '6-10', '11-15', '16-20', '21+']);
      expect(charts.distribution.data.datasets[0].data).toEqual([1, 1, 1, 0, 1]);
    });

    it('should handle empty functions array', () => {
      const results = { deepAnalysis: { complexity: {} } };
      const charts = visualizer.generateComplexityCharts(results);

      expect(charts.distribution.data.datasets[0].data).toEqual([0, 0, 0, 0, 0]);
      expect(charts.topFunctions.data.labels).toEqual([]);
    });

    it('should generate top complex functions', () => {
      const results = {
        deepAnalysis: {
          complexity: {
            functions: Array(15).fill(null).map((_, i) => ({
              name: `func${i}`,
              cyclomatic: i + 1,
              cognitive: i
            }))
          }
        }
      };

      const charts = visualizer.generateComplexityCharts(results);
      
      expect(charts.topFunctions.type).toBe('horizontalBar');
      expect(charts.topFunctions.data.labels.length).toBe(10);
      expect(charts.topFunctions.data.labels[0]).toBe('func14');
    });
  });

  describe('generateDependencyGraph', () => {
    it('should generate circular dependencies visualization', () => {
      const results = {
        deepAnalysis: {
          dependencies: {
            cycles: [['mod1', 'mod2', 'mod3', 'mod1']],
            graph: { 'file1': ['file2'] },
            external: new Set(['express']),
            internal: new Set(['./utils', './helpers'])
          }
        }
      };

      const graph = visualizer.generateDependencyGraph(results);

      expect(graph.circles.type).toBe('network');
      expect(graph.circles.nodes.length).toBe(3);
      expect(graph.circles.edges.length).toBe(4);
      expect(graph.breakdown.data.datasets[0].data).toEqual([1, 2]);
    });

    it('should handle empty dependencies', () => {
      const results = { deepAnalysis: { dependencies: {} } };
      const graph = visualizer.generateDependencyGraph(results);

      expect(graph.circles.nodes).toEqual([]);
      expect(graph.breakdown.data.datasets[0].data).toEqual([0, 0]);
    });
  });

  describe('generateSecurityDashboard', () => {
    it('should generate security visualizations', () => {
      const results = {
        deepAnalysis: {
          security: {
            score: 75,
            vulnerabilities: [
              { severity: 'critical' },
              { severity: 'high' },
              { severity: 'high' },
              { severity: 'medium' },
              { severity: 'low' }
            ]
          }
        }
      };

      const dashboard = visualizer.generateSecurityDashboard(results);

      expect(dashboard.severityChart.type).toBe('pie');
      expect(dashboard.severityChart.data.datasets[0].data).toEqual([1, 2, 1, 1]);
      expect(dashboard.scoreGauge.value).toBe(75);
    });

    it('should handle missing security data', () => {
      const results = { deepAnalysis: {} };
      const dashboard = visualizer.generateSecurityDashboard(results);

      expect(dashboard.severityChart.data.datasets[0].data).toEqual([0, 0, 0, 0]);
      expect(dashboard.scoreGauge.value).toBe(0);
    });
  });

  describe('generatePerformanceMetrics', () => {
    it('should generate performance visualizations', () => {
      const results = {
        deepAnalysis: {
          performance: {
            bottlenecks: [
              { type: 'memory-leak' },
              { type: 'memory-leak' },
              { type: 'slow-query' }
            ]
          }
        }
      };

      const metrics = visualizer.generatePerformanceMetrics(results);

      expect(metrics.issueTypes.type).toBe('bar');
      expect(metrics.issueTypes.data.labels).toContain('memory-leak');
      expect(metrics.issueTypes.data.labels).toContain('slow-query');
    });

    it('should handle missing performance data', () => {
      const results = { deepAnalysis: {} };
      const metrics = visualizer.generatePerformanceMetrics(results);

      expect(metrics.issueTypes.data.labels).toEqual([]);
    });
  });

  describe('createInteractiveDashboard', () => {
    it('should create HTML dashboard with visualizations', async () => {
      const visualizations = {
        complexity: { distribution: {}, topFunctions: {} },
        dependencies: { circles: {}, breakdown: {} },
        security: { severityChart: {} },
        performance: { issueTypes: {} }
      };
      const results = {
        deepAnalysis: {
          complexity: { overall: { score: 20 } },
          security: { score: 90 },
          dependencies: { cycles: [] },
          performance: { bottlenecks: [] }
        }
      };

      const html = await visualizer.createInteractiveDashboard(visualizations, results);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Code Metrics Dashboard');
      expect(html).toContain('chartData = {');
      expect(html).toContain('complexity');
      expect(html).toContain('security');
    });

    it('should handle missing analysis data in dashboard', async () => {
      const visualizations = {};
      const results = {};

      const html = await visualizer.createInteractiveDashboard(visualizations, results);

      expect(html).toContain('N/A');
    });
  });

  describe('Helper methods', () => {
    describe('generateComplexityDistribution', () => {
      it('should categorize functions by complexity ranges', () => {
        const functions = [
          { cyclomatic: 3 },
          { cyclomatic: 7 },
          { cyclomatic: 12 },
          { cyclomatic: 18 },
          { cyclomatic: 25 }
        ];

        const distribution = visualizer.generateComplexityDistribution(functions);

        expect(distribution.datasets[0].data).toEqual([1, 1, 1, 1, 1]);
      });
    });

    describe('generateTopComplexFunctions', () => {
      it('should sort and limit to top 10 functions', () => {
        const functions = Array(20).fill(null).map((_, i) => ({
          name: `func${i}`,
          cyclomatic: i,
          cognitive: i * 2
        }));

        const topFunctions = visualizer.generateTopComplexFunctions(functions);

        expect(topFunctions.labels.length).toBe(10);
        expect(topFunctions.labels[0]).toBe('func19');
        expect(topFunctions.datasets[0].data[0]).toBe(57); // 19 + 38
      });
    });

    describe('generateComplexityHeatmap', () => {
      it('should create heatmap data from complexity metrics', () => {
        const complexity = {
          cyclomatic: {
            'src/file1.js': 10,
            'src/file2.js': 20
          }
        };

        const heatmap = visualizer.generateComplexityHeatmap(complexity);

        expect(heatmap).toEqual([
          { file: 'file1.js', complexity: 10 },
          { file: 'file2.js', complexity: 20 }
        ]);
      });

      it('should handle missing cyclomatic data', () => {
        const complexity = {};
        const heatmap = visualizer.generateComplexityHeatmap(complexity);

        expect(heatmap).toEqual([]);
      });
    });

    describe('generateComplexityByFileType', () => {
      it('should calculate average complexity by file type', () => {
        const functions = [
          { file: 'test.js', cyclomatic: 5 },
          { file: 'test2.js', cyclomatic: 10 },
          { file: 'style.css', cyclomatic: 2 }
        ];

        const byType = visualizer.generateComplexityByFileType(functions);

        expect(byType).toContainEqual({ type: 'js', average: 7.5 });
        expect(byType).toContainEqual({ type: 'css', average: 2 });
      });

      it('should handle functions without file property', () => {
        const functions = [
          { cyclomatic: 5 },
          { file: 'test.js', cyclomatic: 10 }
        ];

        const byType = visualizer.generateComplexityByFileType(functions);

        expect(byType).toContainEqual({ type: 'unknown', average: 5 });
        expect(byType).toContainEqual({ type: 'js', average: 10 });
      });
    });

    describe('extractNodesFromCycles', () => {
      it('should extract unique nodes from cycles', () => {
        const cycles = [
          ['a', 'b', 'c', 'a'],
          ['b', 'd', 'b']
        ];

        const nodes = visualizer.extractNodesFromCycles(cycles);

        expect(nodes.length).toBe(4);
        expect(nodes.map(n => n.label)).toContain('a');
        expect(nodes.map(n => n.label)).toContain('d');
      });
    });

    describe('extractEdgesFromCycles', () => {
      it('should create edges from cycle paths', () => {
        const cycles = [['a', 'b', 'c']];

        const edges = visualizer.extractEdgesFromCycles(cycles);

        expect(edges).toEqual([
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
          { from: 'c', to: 'a' }
        ]);
      });
    });

    describe('buildDependencyTree', () => {
      it('should build tree structure from dependency graph', () => {
        const graph = {
          'src/main.js': ['src/utils.js', 'src/helpers.js'],
          'src/utils.js': ['src/config.js']
        };

        const tree = visualizer.buildDependencyTree(graph);

        expect(tree[0].name).toBe('main.js');
        expect(tree[0].children.length).toBe(2);
        expect(tree[1].name).toBe('utils.js');
      });

      it('should handle empty dependencies', () => {
        const graph = { 'file.js': null };
        const tree = visualizer.buildDependencyTree(graph);

        expect(tree[0].children).toEqual([]);
      });
    });

    describe('generateVulnerabilityTypeChart', () => {
      it('should count vulnerabilities by type', () => {
        const vulnerabilities = [
          { type: 'xss' },
          { type: 'xss' },
          { type: 'sql-injection' },
          {}
        ];

        const chart = visualizer.generateVulnerabilityTypeChart(vulnerabilities);

        expect(chart.data.labels).toContain('xss');
        expect(chart.data.labels).toContain('unknown');
        expect(chart.data.datasets[0].data).toContain(2);
      });
    });

    describe('generatePerformanceIssueChart', () => {
      it('should count performance issues by type', () => {
        const bottlenecks = [
          { type: 'memory' },
          { type: 'memory' },
          { type: 'cpu' },
          {}
        ];

        const chart = visualizer.generatePerformanceIssueChart(bottlenecks);

        expect(chart.labels).toContain('memory');
        expect(chart.labels).toContain('unknown');
        expect(chart.datasets[0].data).toContain(2);
      });
    });

    describe('generatePerformanceTimeline', () => {
      it('should generate timeline data', () => {
        const timeline = visualizer.generatePerformanceTimeline();

        expect(timeline.labels).toEqual(['Initial', 'Current']);
        expect(timeline.datasets[0].data).toEqual([85, 90]);
      });
    });

    describe('generateMetricsJS', () => {
      it('should generate JavaScript module with metrics data', () => {
        const visualizations = { test: 'data' };
        const js = visualizer.generateMetricsJS(visualizations);

        expect(js).toContain('MetricsData = {\n  "test": "data"\n}');
        expect(js).toContain('module.exports = MetricsData');
      });
    });

    describe('writeFile', () => {
      it('should write file successfully', async () => {
        await visualizer.writeFile('/test/file.txt', 'content');

        expect(mockWriteFile).toHaveBeenCalledWith(
          '/test/file.txt',
          'content',
          'utf-8'
        );
      });

      it('should handle write errors', async () => {
        mockWriteFile.mockRejectedValueOnce(new Error('Write failed'));

        await visualizer.writeFile('/test/file.txt', 'content');

        expect(console.warn).toHaveBeenCalledWith(
          'Failed to write /test/file.txt:',
          'Write failed'
        );
      });
    });
  });
});