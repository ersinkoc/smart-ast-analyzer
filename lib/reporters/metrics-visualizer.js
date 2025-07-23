const fs = require('fs').promises;
const path = require('path');

class MetricsVisualizer {
  constructor(options = {}) {
    this.options = options;
  }

  async generateVisualization(analysisResults, outputPath) {
    console.log('📊 Generating code metrics visualizations...');
    
    const visualizations = {
      complexity: this.generateComplexityCharts(analysisResults),
      dependencies: this.generateDependencyGraph(analysisResults),
      security: this.generateSecurityDashboard(analysisResults),
      performance: this.generatePerformanceMetrics(analysisResults)
    };

    // Create interactive HTML dashboard
    const dashboard = await this.createInteractiveDashboard(visualizations, analysisResults);
    
    // Write visualization files
    const vizDir = path.join(outputPath, 'visualizations');
    await fs.mkdir(vizDir, { recursive: true });
    
    await Promise.all([
      this.writeFile(path.join(vizDir, 'dashboard.html'), dashboard),
      this.writeFile(path.join(vizDir, 'complexity-data.json'), JSON.stringify(visualizations.complexity, null, 2)),
      this.writeFile(path.join(vizDir, 'dependency-data.json'), JSON.stringify(visualizations.dependencies, null, 2)),
      this.writeFile(path.join(vizDir, 'metrics.js'), this.generateMetricsJS(visualizations))
    ]);

    console.log(`✅ Visualizations generated in ${vizDir}`);
    return vizDir;
  }

  generateComplexityCharts(results) {
    const complexity = results.deepAnalysis?.complexity || {};
    
    return {
      // Complexity distribution chart
      distribution: {
        type: 'bar',
        title: 'Cyclomatic Complexity Distribution',
        data: this.generateComplexityDistribution(complexity.functions || []),
        options: {
          responsive: true,
          plugins: {
            title: { display: true, text: 'Function Complexity Distribution' },
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Number of Functions' } },
            x: { title: { display: true, text: 'Complexity Range' } }
          }
        }
      },
      
      // Top complex functions
      topFunctions: {
        type: 'horizontalBar',
        title: 'Most Complex Functions',
        data: this.generateTopComplexFunctions(complexity.functions || []),
        options: {
          responsive: true,
          plugins: {
            title: { display: true, text: 'Top 10 Most Complex Functions' }
          },
          scales: {
            x: { beginAtZero: true, title: { display: true, text: 'Complexity Score' } }
          }
        }
      },
      
      // Complexity heatmap data
      heatmap: this.generateComplexityHeatmap(complexity),
      
      // Trends over file types
      byFileType: this.generateComplexityByFileType(complexity.functions || [])
    };
  }

  generateDependencyGraph(results) {
    const deps = results.deepAnalysis?.dependencies || {};
    
    return {
      // Circular dependencies visualization
      circles: {
        type: 'network',
        title: 'Circular Dependencies',
        nodes: this.extractNodesFromCycles(deps.cycles || []),
        edges: this.extractEdgesFromCycles(deps.cycles || [])
      },
      
      // Dependency tree
      tree: {
        type: 'tree',
        title: 'Dependency Hierarchy',
        data: this.buildDependencyTree(deps.graph || {})
      },
      
      // External vs Internal dependencies pie chart
      breakdown: {
        type: 'doughnut',
        title: 'Dependency Breakdown',
        data: {
          labels: ['External', 'Internal'],
          datasets: [{
            data: [
              deps.external?.size || 0,
              deps.internal?.size || 0
            ],
            backgroundColor: ['#4299e1', '#48bb78']
          }]
        }
      }
    };
  }

  generateSecurityDashboard(results) {
    const security = results.deepAnalysis?.security || {};
    const vulnerabilities = security.vulnerabilities || [];
    
    return {
      // Vulnerability severity breakdown
      severityChart: {
        type: 'pie',
        title: 'Security Vulnerabilities by Severity',
        data: {
          labels: ['Critical', 'High', 'Medium', 'Low'],
          datasets: [{
            data: [
              vulnerabilities.filter(v => v.severity === 'critical').length,
              vulnerabilities.filter(v => v.severity === 'high').length,
              vulnerabilities.filter(v => v.severity === 'medium').length,
              vulnerabilities.filter(v => v.severity === 'low').length
            ],
            backgroundColor: ['#f56565', '#ed8936', '#f6e05e', '#68d391']
          }]
        }
      },
      
      // Security score gauge
      scoreGauge: {
        type: 'gauge',
        title: 'Security Score',
        value: security.score || 0,
        max: 100,
        ranges: [
          { from: 0, to: 30, color: '#f56565' },
          { from: 30, to: 60, color: '#ed8936' },
          { from: 60, to: 80, color: '#f6e05e' },
          { from: 80, to: 100, color: '#48bb78' }
        ]
      },
      
      // Vulnerability types
      typeBreakdown: this.generateVulnerabilityTypeChart(vulnerabilities)
    };
  }

  generatePerformanceMetrics(results) {
    const performance = results.deepAnalysis?.performance || {};
    const bottlenecks = performance.bottlenecks || [];
    
    return {
      // Performance issues by type
      issueTypes: {
        type: 'bar',
        title: 'Performance Issues by Type',
        data: this.generatePerformanceIssueChart(bottlenecks)
      },
      
      // Performance score timeline (if available)
      timeline: {
        type: 'line',
        title: 'Performance Metrics Over Time',
        data: this.generatePerformanceTimeline()
      }
    };
  }

  async createInteractiveDashboard(visualizations, results) {
    const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Metrics Dashboard - Smart AST Analyzer</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/vis-network/standalone/umd/vis-network.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8fafc;
        }
        
        .dashboard {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .chart-container {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .chart-title {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 15px;
            color: #2d3748;
        }
        
        .chart-canvas {
            position: relative;
            height: 300px;
        }
        
        .dependency-network {
            height: 400px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
        }
        
        .stats-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: #4299e1;
        }
        
        .stat-label {
            color: #718096;
            font-size: 0.9rem;
        }
        
        .tabs {
            display: flex;
            margin-bottom: 20px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .tab {
            flex: 1;
            padding: 15px 20px;
            background: #f7fafc;
            border: none;
            cursor: pointer;
            transition: background 0.3s;
        }
        
        .tab.active {
            background: #4299e1;
            color: white;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>📊 Code Metrics Dashboard</h1>
            <p>Interactive visualization of your project's analysis results</p>
            <p><small>Generated on ${new Date().toISOString()}</small></p>
        </div>
        
        <div class="stats-summary">
            <div class="stat-card">
                <div class="stat-value">${results.deepAnalysis?.complexity?.overall?.score || 'N/A'}</div>
                <div class="stat-label">Complexity Score</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${results.deepAnalysis?.security?.score || 'N/A'}/100</div>
                <div class="stat-label">Security Score</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${results.deepAnalysis?.dependencies?.cycles?.length || 0}</div>
                <div class="stat-label">Circular Dependencies</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${results.deepAnalysis?.performance?.bottlenecks?.length || 0}</div>
                <div class="stat-label">Performance Issues</div>
            </div>
        </div>
        
        <div class="tabs">
            <button class="tab active" onclick="showTab('complexity')">Complexity</button>
            <button class="tab" onclick="showTab('security')">Security</button>
            <button class="tab" onclick="showTab('dependencies')">Dependencies</button>
            <button class="tab" onclick="showTab('performance')">Performance</button>
        </div>
        
        <div id="complexity" class="tab-content active">
            <div class="metrics-grid">
                <div class="chart-container">
                    <div class="chart-title">Complexity Distribution</div>
                    <div class="chart-canvas">
                        <canvas id="complexityDistChart"></canvas>
                    </div>
                </div>
                <div class="chart-container">
                    <div class="chart-title">Top Complex Functions</div>
                    <div class="chart-canvas">
                        <canvas id="topFunctionsChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="security" class="tab-content">
            <div class="metrics-grid">
                <div class="chart-container">
                    <div class="chart-title">Vulnerability Severity</div>
                    <div class="chart-canvas">
                        <canvas id="securityChart"></canvas>
                    </div>
                </div>
                <div class="chart-container">
                    <div class="chart-title">Security Score</div>
                    <div class="chart-canvas">
                        <canvas id="securityGauge"></canvas>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="dependencies" class="tab-content">
            <div class="metrics-grid">
                <div class="chart-container">
                    <div class="chart-title">Dependency Network</div>
                    <div id="dependencyNetwork" class="dependency-network"></div>
                </div>
                <div class="chart-container">
                    <div class="chart-title">External vs Internal</div>
                    <div class="chart-canvas">
                        <canvas id="dependencyBreakdown"></canvas>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="performance" class="tab-content">
            <div class="metrics-grid">
                <div class="chart-container">
                    <div class="chart-title">Performance Issues</div>
                    <div class="chart-canvas">
                        <canvas id="performanceChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Chart data
        const chartData = ${JSON.stringify(visualizations)};
        
        // Initialize charts
        document.addEventListener('DOMContentLoaded', function() {
            initializeComplexityCharts();
            initializeSecurityCharts();
            initializeDependencyCharts();
            initializePerformanceCharts();
        });
        
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
        }
        
        function initializeComplexityCharts() {
            // Complexity distribution
            const distCtx = document.getElementById('complexityDistChart')?.getContext('2d');
            if (distCtx && chartData.complexity?.distribution) {
                new Chart(distCtx, chartData.complexity.distribution);
            }
            
            // Top functions
            const topCtx = document.getElementById('topFunctionsChart')?.getContext('2d');
            if (topCtx && chartData.complexity?.topFunctions) {
                new Chart(topCtx, chartData.complexity.topFunctions);
            }
        }
        
        function initializeSecurityCharts() {
            // Security severity
            const secCtx = document.getElementById('securityChart')?.getContext('2d');
            if (secCtx && chartData.security?.severityChart) {
                new Chart(secCtx, chartData.security.severityChart);
            }
        }
        
        function initializeDependencyCharts() {
            // Dependency breakdown
            const depCtx = document.getElementById('dependencyBreakdown')?.getContext('2d');
            if (depCtx && chartData.dependencies?.breakdown) {
                new Chart(depCtx, chartData.dependencies.breakdown);
            }
            
            // Dependency network (if vis.js is available)
            if (typeof vis !== 'undefined' && chartData.dependencies?.circles) {
                const container = document.getElementById('dependencyNetwork');
                const data = {
                    nodes: new vis.DataSet(chartData.dependencies.circles.nodes),
                    edges: new vis.DataSet(chartData.dependencies.circles.edges)
                };
                const options = {
                    physics: { stabilization: false },
                    edges: { arrows: { to: true } }
                };
                new vis.Network(container, data, options);
            }
        }
        
        function initializePerformanceCharts() {
            // Performance issues
            const perfCtx = document.getElementById('performanceChart')?.getContext('2d');
            if (perfCtx && chartData.performance?.issueTypes) {
                new Chart(perfCtx, chartData.performance.issueTypes);
            }
        }
        
        console.log('📊 Metrics Dashboard loaded successfully!');
    </script>
</body>
</html>`;
    
    return template;
  }

  // Helper methods for data processing
  generateComplexityDistribution(functions) {
    const ranges = ['1-5', '6-10', '11-15', '16-20', '21+'];
    const counts = [0, 0, 0, 0, 0];
    
    functions.forEach(func => {
      const complexity = func.cyclomatic;
      if (complexity <= 5) counts[0]++;
      else if (complexity <= 10) counts[1]++;
      else if (complexity <= 15) counts[2]++;
      else if (complexity <= 20) counts[3]++;
      else counts[4]++;
    });
    
    return {
      labels: ranges,
      datasets: [{
        label: 'Functions',
        data: counts,
        backgroundColor: ['#48bb78', '#68d391', '#f6e05e', '#ed8936', '#f56565']
      }]
    };
  }

  generateTopComplexFunctions(functions) {
    const top10 = functions
      .sort((a, b) => (b.cyclomatic + b.cognitive) - (a.cyclomatic + a.cognitive))
      .slice(0, 10);
    
    return {
      labels: top10.map(f => f.name),
      datasets: [{
        label: 'Complexity Score',
        data: top10.map(f => f.cyclomatic + f.cognitive),
        backgroundColor: '#4299e1'
      }]
    };
  }

  generateComplexityHeatmap(complexity) {
    // Generate heatmap data for file complexity
    const files = Object.keys(complexity.cyclomatic || {});
    return files.map(file => ({
      file: file.split('/').pop(),
      complexity: complexity.cyclomatic[file] || 0
    }));
  }

  generateComplexityByFileType(functions) {
    const types = {};
    functions.forEach(func => {
      const ext = func.file?.split('.').pop() || 'unknown';
      if (!types[ext]) types[ext] = [];
      types[ext].push(func.cyclomatic);
    });
    
    return Object.entries(types).map(([type, complexities]) => ({
      type,
      average: complexities.reduce((a, b) => a + b, 0) / complexities.length
    }));
  }

  extractNodesFromCycles(cycles) {
    const nodes = new Set();
    cycles.forEach(cycle => {
      cycle.forEach(node => nodes.add(node));
    });
    
    return Array.from(nodes).map((node, id) => ({
      id,
      label: node.split('/').pop(),
      title: node
    }));
  }

  extractEdgesFromCycles(cycles) {
    const edges = [];
    cycles.forEach(cycle => {
      for (let i = 0; i < cycle.length; i++) {
        const from = cycle[i];
        const to = cycle[(i + 1) % cycle.length];
        edges.push({ from, to });
      }
    });
    
    return edges;
  }

  buildDependencyTree(graph) {
    // Simplified tree structure
    return Object.keys(graph).map(file => ({
      name: file.split('/').pop(),
      children: (graph[file] || []).map(dep => ({ name: dep.split('/').pop() }))
    }));
  }

  generateVulnerabilityTypeChart(vulnerabilities) {
    const types = {};
    vulnerabilities.forEach(vuln => {
      const type = vuln.type || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });
    
    return {
      type: 'bar',
      data: {
        labels: Object.keys(types),
        datasets: [{
          label: 'Count',
          data: Object.values(types),
          backgroundColor: '#f56565'
        }]
      }
    };
  }

  generatePerformanceIssueChart(bottlenecks) {
    const types = {};
    bottlenecks.forEach(issue => {
      const type = issue.type || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });
    
    return {
      labels: Object.keys(types),
      datasets: [{
        label: 'Issues',
        data: Object.values(types),
        backgroundColor: '#ed8936'
      }]
    };
  }

  generatePerformanceTimeline() {
    // Placeholder for performance timeline data
    return {
      labels: ['Initial', 'Current'],
      datasets: [{
        label: 'Performance Score',
        data: [85, 90],
        borderColor: '#4299e1',
        fill: false
      }]
    };
  }

  generateMetricsJS(visualizations) {
    return `
// Metrics JavaScript Module
const MetricsData = ${JSON.stringify(visualizations, null, 2)};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MetricsData;
}

console.log('📊 Metrics data loaded:', Object.keys(MetricsData));
    `;
  }

  async writeFile(filePath, content) {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      console.warn(`Failed to write ${filePath}:`, error.message);
    }
  }
}

module.exports = MetricsVisualizer;