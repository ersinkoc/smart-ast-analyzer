const fs = require('fs').promises;
const path = require('path');

class HTMLGenerator {
  static async generate(report) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart AST Analysis Report - ${report.projectInfo.framework}</title>
    <style>
        ${this.getCSS()}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        ${this.generateHeader(report)}
        ${this.generateNavigation()}
        ${this.generateContent(report)}
        ${this.generateFooter()}
    </div>
    
    <script>
        ${this.generateJavaScript(report)}
    </script>
</body>
</html>
    `;
    
    return html.trim();
  }

  static generateHeader(report) {
    return `
    <header class="header">
        <h1>🔍 Smart AST Analysis Report</h1>
        <div class="metadata">
            <div class="meta-item">
                <strong>Framework:</strong> ${report.projectInfo.framework}
            </div>
            <div class="meta-item">
                <strong>Generated:</strong> ${new Date(report.timestamp).toLocaleString()}
            </div>
            <div class="meta-item">
                <strong>Language:</strong> ${report.projectInfo.language}
            </div>
        </div>
    </header>
    `;
  }

  static generateNavigation() {
    return `
    <nav class="navigation">
        <ul>
            <li><a href="#summary" class="nav-link active">Summary</a></li>
            <li><a href="#apis" class="nav-link">API Analysis</a></li>
            <li><a href="#components" class="nav-link">Components</a></li>
            <li><a href="#websockets" class="nav-link">WebSockets</a></li>
            <li><a href="#auth" class="nav-link">Auth</a></li>
            <li><a href="#database" class="nav-link">Database</a></li>
            <li><a href="#performance" class="nav-link">Performance</a></li>
            <li><a href="#insights" class="nav-link">Insights</a></li>
            <li><a href="#recommendations" class="nav-link">Recommendations</a></li>
        </ul>
    </nav>
    `;
  }

  static generateContent(report) {
    return `
    <main class="content">
        ${this.generateSummarySection(report)}
        ${this.generateAnalysisSection('apis', 'API Analysis', report.results.api)}
        ${this.generateAnalysisSection('components', 'Component Architecture', report.results.components)}
        ${this.generateAnalysisSection('websockets', 'WebSocket Events', report.results.websocket)}
        ${this.generateAnalysisSection('auth', 'Authentication & Authorization', report.results.auth)}
        ${this.generateAnalysisSection('database', 'Database Analysis', report.results.database)}
        ${this.generateAnalysisSection('performance', 'Performance Analysis', report.results.performance)}
        ${this.generateInsightsSection(report)}
        ${this.generateRecommendationsSection(report)}
    </main>
    `;
  }

  static generateSummarySection(report) {
    return `
    <section id="summary" class="section">
        <h2>📊 Executive Summary</h2>
        <div class="summary-grid">
            ${this.generateSummaryCards(report)}
        </div>
        <div class="summary-text">
            <p>${report.summary}</p>
        </div>
        <div class="metrics-chart">
            <canvas id="metricsChart" width="400" height="200"></canvas>
        </div>
    </section>
    `;
  }

  static generateSummaryCards(report) {
    const cards = [
      {
        title: 'Framework',
        value: report.projectInfo.framework,
        icon: '🏗️',
        class: 'framework'
      },
      {
        title: 'Total Files',
        value: report.projectInfo.metrics?.totalFiles || 0,
        icon: '📁',
        class: 'files'
      },
      {
        title: 'Lines of Code',
        value: report.projectInfo.metrics?.totalLines || 0,
        icon: '📝',
        class: 'lines'
      },
      {
        title: 'Dependencies',
        value: report.projectInfo.dependencies?.total || 0,
        icon: '📦',
        class: 'deps'
      }
    ];

    return cards.map(card => `
      <div class="summary-card ${card.class}">
          <div class="card-icon">${card.icon}</div>
          <div class="card-content">
              <h3>${card.title}</h3>
              <div class="card-value">${card.value}</div>
          </div>
      </div>
    `).join('');
  }

  static generateAnalysisSection(id, title, data) {
    if (!data) return '';

    return `
    <section id="${id}" class="section">
        <h2>${this.getSectionIcon(id)} ${title}</h2>
        <div class="analysis-content">
            ${this.generateAnalysisContent(id, data)}
        </div>
    </section>
    `;
  }

  static getSectionIcon(section) {
    const icons = {
      apis: '🔗',
      components: '🧩',
      websockets: '🔌',
      auth: '🔐',
      database: '🗄️',
      performance: '⚡'
    };
    return icons[section] || '📋';
  }

  static generateAnalysisContent(type, data) {
    const generators = {
      apis: this.generateAPIContent.bind(this),
      components: this.generateComponentContent.bind(this),
      websockets: this.generateWebSocketContent.bind(this),
      auth: this.generateAuthContent.bind(this),
      database: this.generateDatabaseContent.bind(this),
      performance: this.generatePerformanceContent.bind(this)
    };

    const generator = generators[type];
    return generator ? generator(data) : '<p>No data available</p>';
  }

  static generateAPIContent(data) {
    if (!data.endpoints) return '<p>No API endpoints found</p>';

    return `
    <div class="api-overview">
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Total Endpoints</h4>
                <div class="stat-value">${data.endpoints.length}</div>
            </div>
            <div class="stat-card">
                <h4>Security Issues</h4>
                <div class="stat-value ${data.securityIssues?.length > 0 ? 'warning' : 'good'}">${data.securityIssues?.length || 0}</div>
            </div>
            <div class="stat-card">
                <h4>Orphaned Endpoints</h4>
                <div class="stat-value ${data.orphanedEndpoints?.length > 0 ? 'warning' : 'good'}">${data.orphanedEndpoints?.length || 0}</div>
            </div>
        </div>
        
        <div class="endpoints-table">
            <table>
                <thead>
                    <tr>
                        <th>Method</th>
                        <th>Path</th>
                        <th>Handler</th>
                        <th>Auth</th>
                        <th>Issues</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.endpoints.slice(0, 20).map(endpoint => `
                        <tr>
                            <td><span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span></td>
                            <td><code>${endpoint.path}</code></td>
                            <td>${endpoint.handler}</td>
                            <td>${endpoint.auth?.required ? '✅' : '❌'}</td>
                            <td>${endpoint.issues?.length || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
    `;
  }

  static generateComponentContent(data) {
    if (!data.components) return '<p>No components found</p>';

    const componentCount = Object.keys(data.components).length;

    return `
    <div class="component-overview">
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Total Components</h4>
                <div class="stat-value">${componentCount}</div>
            </div>
            <div class="stat-card">
                <h4>Unused Components</h4>
                <div class="stat-value ${data.unusedComponents?.length > 0 ? 'warning' : 'good'}">${data.unusedComponents?.length || 0}</div>
            </div>
            <div class="stat-card">
                <h4>Circular Dependencies</h4>
                <div class="stat-value ${data.circularDependencies?.length > 0 ? 'danger' : 'good'}">${data.circularDependencies?.length || 0}</div>
            </div>
        </div>
        
        <div class="component-grid">
            ${Object.entries(data.components).slice(0, 12).map(([name, comp]) => `
                <div class="component-card">
                    <h4>${name}</h4>
                    <div class="component-info">
                        <div class="info-item">
                            <strong>Type:</strong> ${comp.type}
                        </div>
                        <div class="info-item">
                            <strong>Props:</strong> ${Object.keys(comp.props || {}).length}
                        </div>
                        <div class="info-item">
                            <strong>Issues:</strong> ${comp.issues?.length || 0}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    `;
  }

  static generateWebSocketContent(data) {
    if (!data.events) return '<p>No WebSocket events found</p>';

    const clientEvents = Object.keys(data.events.client || {}).length;
    const serverEvents = Object.keys(data.events.server || {}).length;

    return `
    <div class="websocket-overview">
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Client Events</h4>
                <div class="stat-value">${clientEvents}</div>
            </div>
            <div class="stat-card">
                <h4>Server Events</h4>
                <div class="stat-value">${serverEvents}</div>
            </div>
            <div class="stat-card">
                <h4>Rooms</h4>
                <div class="stat-value">${Object.keys(data.rooms || {}).length}</div>
            </div>
        </div>
        
        <div class="events-list">
            <h4>Client Events</h4>
            <ul>
                ${Object.entries(data.events.client || {}).slice(0, 10).map(([name, event]) => `
                    <li>
                        <strong>${name}</strong> - ${event.file}:${event.line}
                    </li>
                `).join('')}
            </ul>
        </div>
    </div>
    `;
  }

  static generateAuthContent(data) {
    if (!data.authentication) return '<p>No authentication analysis available</p>';

    return `
    <div class="auth-overview">
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Auth Methods</h4>
                <div class="stat-value">${data.authentication.methods?.length || 0}</div>
            </div>
            <div class="stat-card">
                <h4>Protected Routes</h4>
                <div class="stat-value">${data.protectedRoutes?.length || 0}</div>
            </div>
            <div class="stat-card">
                <h4>Vulnerabilities</h4>
                <div class="stat-value ${data.security?.vulnerabilities?.length > 0 ? 'danger' : 'good'}">${data.security?.vulnerabilities?.length || 0}</div>
            </div>
        </div>
        
        <div class="auth-methods">
            <h4>Authentication Methods</h4>
            <ul>
                ${data.authentication.methods?.map(method => `<li>${method}</li>`).join('') || '<li>No methods detected</li>'}
            </ul>
        </div>
    </div>
    `;
  }

  static generateDatabaseContent(data) {
    if (!data.models) return '<p>No database analysis available</p>';

    return `
    <div class="database-overview">
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Models</h4>
                <div class="stat-value">${data.models.length}</div>
            </div>
            <div class="stat-card">
                <h4>N+1 Queries</h4>
                <div class="stat-value ${data.performance?.nPlusOneQueries?.length > 0 ? 'warning' : 'good'}">${data.performance?.nPlusOneQueries?.length || 0}</div>
            </div>
            <div class="stat-card">
                <h4>Slow Queries</h4>
                <div class="stat-value ${data.performance?.slowQueries?.length > 0 ? 'warning' : 'good'}">${data.performance?.slowQueries?.length || 0}</div>
            </div>
        </div>
        
        <div class="models-list">
            <h4>Database Models</h4>
            <div class="models-grid">
                ${data.models.slice(0, 8).map(model => `
                    <div class="model-card">
                        <h5>${model.name}</h5>
                        <div class="model-info">
                            <div>Fields: ${model.fields?.length || 0}</div>
                            <div>Relations: ${model.relationships?.length || 0}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
    `;
  }

  static generatePerformanceContent(data) {
    return `
    <div class="performance-overview">
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Large Dependencies</h4>
                <div class="stat-value ${data.bundle?.largeDependencies?.length > 0 ? 'warning' : 'good'}">${data.bundle?.largeDependencies?.length || 0}</div>
            </div>
            <div class="stat-card">
                <h4>Heavy Components</h4>
                <div class="stat-value ${data.rendering?.heavyComponents?.length > 0 ? 'warning' : 'good'}">${data.rendering?.heavyComponents?.length || 0}</div>
            </div>
            <div class="stat-card">
                <h4>Memory Leaks</h4>
                <div class="stat-value ${data.memory?.potentialLeaks?.length > 0 ? 'danger' : 'good'}">${data.memory?.potentialLeaks?.length || 0}</div>
            </div>
        </div>
        
        <div class="performance-metrics">
            <div class="metric-item">
                <h4>Bundle Analysis</h4>
                <div class="metric-content">
                    ${data.bundle?.largeDependencies?.slice(0, 5).map(dep => `
                        <div class="dependency-item">
                            <strong>${dep.name}</strong>: ${dep.size}
                        </div>
                    `).join('') || '<div>No large dependencies found</div>'}
                </div>
            </div>
        </div>
    </div>
    `;
  }

  static generateInsightsSection(report) {
    return `
    <section id="insights" class="section">
        <h2>💡 Key Insights</h2>
        <div class="insights-grid">
            ${report.insights.map(insight => `
                <div class="insight-card">
                    <div class="insight-icon">🔍</div>
                    <p>${insight}</p>
                </div>
            `).join('')}
        </div>
    </section>
    `;
  }

  static generateRecommendationsSection(report) {
    return `
    <section id="recommendations" class="section">
        <h2>🎯 Recommendations</h2>
        <div class="recommendations">
            ${report.recommendations.map((rec, i) => `
                <div class="recommendation ${rec.priority}">
                    <div class="rec-header">
                        <h3>${i + 1}. ${rec.title}</h3>
                        <div class="rec-badges">
                            <span class="badge priority-${rec.priority}">${rec.priority}</span>
                            <span class="badge effort">${rec.effort} effort</span>
                            <span class="badge impact">${rec.impact} impact</span>
                        </div>
                    </div>
                    <p>${rec.description}</p>
                </div>
            `).join('')}
        </div>
    </section>
    `;
  }

  static generateFooter() {
    return `
    <footer class="footer">
        <p>Generated by Smart AST Analyzer • Built with ❤️ for developers</p>
    </footer>
    `;
  }

  static getCSS() {
    return `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        background: #f8fafc;
    }

    .container {
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        min-height: 100vh;
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }

    .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 2rem;
        text-align: center;
    }

    .header h1 {
        font-size: 2.5rem;
        margin-bottom: 1rem;
    }

    .metadata {
        display: flex;
        justify-content: center;
        gap: 2rem;
        flex-wrap: wrap;
    }

    .meta-item {
        background: rgba(255,255,255,0.1);
        padding: 0.5rem 1rem;
        border-radius: 20px;
        backdrop-filter: blur(10px);
    }

    .navigation {
        background: #2d3748;
        padding: 0;
        position: sticky;
        top: 0;
        z-index: 100;
    }

    .navigation ul {
        display: flex;
        list-style: none;
        overflow-x: auto;
    }

    .nav-link {
        display: block;
        padding: 1rem 1.5rem;
        color: #e2e8f0;
        text-decoration: none;
        white-space: nowrap;
        transition: background 0.3s;
    }

    .nav-link:hover,
    .nav-link.active {
        background: #4a5568;
        color: white;
    }

    .content {
        padding: 2rem;
    }

    .section {
        margin-bottom: 3rem;
        scroll-margin-top: 80px;
    }

    .section h2 {
        font-size: 2rem;
        margin-bottom: 1.5rem;
        border-bottom: 3px solid #667eea;
        padding-bottom: 0.5rem;
    }

    .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .summary-card {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        padding: 1.5rem;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 1rem;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }

    .card-icon {
        font-size: 2.5rem;
    }

    .card-value {
        font-size: 1.8rem;
        font-weight: bold;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
    }

    .stat-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1.5rem;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .stat-value {
        font-size: 2rem;
        font-weight: bold;
        margin-top: 0.5rem;
    }

    .stat-value.good { color: #48bb78; }
    .stat-value.warning { color: #ed8936; }
    .stat-value.danger { color: #f56565; }

    .endpoints-table table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .endpoints-table th,
    .endpoints-table td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
    }

    .endpoints-table th {
        background: #f7fafc;
        font-weight: 600;
    }

    .method {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        color: white;
        font-size: 0.8rem;
        font-weight: bold;
    }

    .method.get { background: #48bb78; }
    .method.post { background: #4299e1; }
    .method.put { background: #ed8936; }
    .method.delete { background: #f56565; }

    .component-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
    }

    .component-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .insights-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .insight-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1.5rem;
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .insight-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
    }

    .recommendation {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .recommendation.high {
        border-left: 4px solid #f56565;
    }

    .recommendation.medium {
        border-left: 4px solid #ed8936;
    }

    .recommendation.low {
        border-left: 4px solid #48bb78;
    }

    .rec-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
    }

    .rec-badges {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .badge {
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
    }

    .priority-high { background: #fed7d7; color: #c53030; }
    .priority-medium { background: #feebc8; color: #c05621; }
    .priority-low { background: #c6f6d5; color: #2f855a; }

    .footer {
        background: #2d3748;
        color: white;
        text-align: center;
        padding: 2rem;
    }

    @media (max-width: 768px) {
        .container {
            margin: 0;
        }

        .content {
            padding: 1rem;
        }

        .metadata {
            flex-direction: column;
            align-items: center;
        }

        .rec-header {
            flex-direction: column;
            gap: 1rem;
        }
    }
    `;
  }

  static generateJavaScript(report) {
    return `
    // Initialize Mermaid
    mermaid.initialize({ startOnLoad: true });

    // Chart.js setup
    const ctx = document.getElementById('metricsChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['APIs', 'Components', 'Models', 'Tests'],
                datasets: [{
                    data: [
                        ${report.results.api?.endpoints?.length || 0},
                        ${Object.keys(report.results.components?.components || {}).length},
                        ${report.results.database?.models?.length || 0},
                        ${report.projectInfo.files?.tests?.length || 0}
                    ],
                    backgroundColor: [
                        '#4299e1',
                        '#48bb78',
                        '#ed8936',
                        '#9f7aea'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update active state
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Scroll to section
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Highlight code blocks
    document.querySelectorAll('code').forEach(block => {
        block.style.background = '#f7fafc';
        block.style.padding = '0.25rem 0.5rem';
        block.style.borderRadius = '4px';
        block.style.fontSize = '0.9em';
    });

    console.log('Smart AST Analyzer Report loaded successfully!');
    `;
  }
}

module.exports = HTMLGenerator;