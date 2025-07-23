const fs = require('fs').promises;
const path = require('path');

class SecurityReportGenerator {
  constructor(options = {}) {
    this.outputDir = options.output || './security-reports';
    this.format = options.format || 'html';
  }

  async generateSecurityReport(securityResults, projectInfo) {
    const report = {
      id: `security-${Date.now()}`,
      timestamp: new Date().toISOString(),
      projectInfo,
      securityResults,
      summary: this.generateExecutiveSummary(securityResults),
      riskMatrix: this.generateRiskMatrix(securityResults),
      complianceStatus: this.generateComplianceStatus(securityResults),
      actionPlan: this.generateActionPlan(securityResults)
    };

    await fs.mkdir(this.outputDir, { recursive: true });

    const reportFiles = [];

    if (this.format === 'html' || this.format === 'all') {
      const htmlFile = await this.generateHTMLReport(report);
      reportFiles.push(htmlFile);
    }

    if (this.format === 'json' || this.format === 'all') {
      const jsonFile = await this.generateJSONReport(report);
      reportFiles.push(jsonFile);
    }

    if (this.format === 'pdf' || this.format === 'all') {
      const pdfFile = await this.generatePDFReport(report);
      reportFiles.push(pdfFile);
    }

    return {
      reportId: report.id,
      files: reportFiles,
      summary: report.summary
    };
  }

  generateExecutiveSummary(results) {
    const summary = {
      overallRisk: this.calculateOverallRisk(results),
      totalVulnerabilities: 0,
      criticalIssues: 0,
      securityScore: 0,
      complianceScore: 0,
      keyFindings: [],
      immediateActions: []
    };

    if (results.vulnerabilities) {
      summary.totalVulnerabilities = results.vulnerabilities.length;
      summary.criticalIssues = results.vulnerabilities.filter(v => v.severity === 'critical').length;
    }

    if (results.securityScore) {
      summary.securityScore = results.securityScore;
    }

    if (results.complianceReport?.overallCompliance) {
      summary.complianceScore = results.complianceReport.overallCompliance;
    }

    // Generate key findings
    summary.keyFindings = this.extractKeyFindings(results);
    summary.immediateActions = this.extractImmediateActions(results);

    return summary;
  }

  calculateOverallRisk(results) {
    const scores = [];

    if (results.securityScore) scores.push(results.securityScore);
    if (results.dependencyAnalysis?.securityScore) scores.push(results.dependencyAnalysis.securityScore);
    if (results.staticAnalysis?.riskScore) scores.push(results.staticAnalysis.riskScore);

    if (scores.length === 0) return 'unknown';

    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (avgScore >= 80) return 'low';
    if (avgScore >= 60) return 'medium';
    if (avgScore >= 40) return 'high';
    return 'critical';
  }

  extractKeyFindings(results) {
    const findings = [];

    // Authentication findings
    if (results.authentication?.methods?.length === 0) {
      findings.push('No authentication mechanisms detected');
    } else if (results.authentication?.methods && !results.authentication.methods.includes('mfa')) {
      findings.push('Multi-factor authentication not implemented');
    }

    // Authorization findings
    if (!results.authorization?.type || results.authorization.type === 'unknown') {
      findings.push('Authorization mechanism unclear or missing');
    }

    // Vulnerability findings
    const criticalVulns = results.vulnerabilities?.filter(v => v.severity === 'critical') || [];
    if (criticalVulns.length > 0) {
      findings.push(`${criticalVulns.length} critical vulnerabilities identified`);
    }

    // Dependency findings
    if (results.dependencyAnalysis?.vulnerabilities?.length > 0) {
      findings.push(`${results.dependencyAnalysis.vulnerabilities.length} vulnerable dependencies found`);
    }

    // Static analysis findings
    if (results.staticAnalysis?.hardcodedSecrets?.length > 0) {
      findings.push(`${results.staticAnalysis.hardcodedSecrets.length} hardcoded secrets detected`);
    }

    // OWASP compliance findings
    if (results.owaspCompliance?.violations?.length > 0) {
      findings.push(`OWASP Top 10 violations detected: ${results.owaspCompliance.violations.join(', ')}`);
    }

    return findings.slice(0, 10); // Top 10 findings
  }

  extractImmediateActions(results) {
    const actions = [];

    // Critical vulnerabilities
    const criticalVulns = results.vulnerabilities?.filter(v => v.severity === 'critical') || [];
    criticalVulns.forEach(vuln => {
      actions.push(`Fix ${vuln.type} vulnerability in ${vuln.location?.file || 'unknown location'}`);
    });

    // Hardcoded secrets
    if (results.staticAnalysis?.hardcodedSecrets?.length > 0) {
      actions.push('Remove all hardcoded secrets and use environment variables');
    }

    // Critical dependency vulnerabilities
    const criticalDepVulns = results.dependencyAnalysis?.vulnerabilities?.filter(v => v.severity === 'critical') || [];
    criticalDepVulns.forEach(vuln => {
      actions.push(`Update ${vuln.package} to fix critical vulnerability`);
    });

    return actions.slice(0, 5); // Top 5 immediate actions
  }

  generateRiskMatrix(results) {
    const matrix = {
      critical: { high: [], medium: [], low: [] },
      high: { high: [], medium: [], low: [] },
      medium: { high: [], medium: [], low: [] },
      low: { high: [], medium: [], low: [] }
    };

    if (results.vulnerabilities) {
      results.vulnerabilities.forEach(vuln => {
        const impact = this.assessImpact(vuln);
        const likelihood = vuln.likelihood || this.assessLikelihood(vuln);
        
        matrix[vuln.severity]?.[likelihood]?.push({
          type: vuln.type,
          description: vuln.description,
          location: vuln.location
        });
      });
    }

    return matrix;
  }

  assessImpact(vulnerability) {
    // Simple impact assessment based on vulnerability type
    const highImpactTypes = ['sql injection', 'code injection', 'authentication bypass'];
    const mediumImpactTypes = ['xss', 'csrf', 'information disclosure'];
    
    const vulnType = vulnerability.type?.toLowerCase() || '';
    
    if (highImpactTypes.some(type => vulnType.includes(type))) {
      return 'high';
    } else if (mediumImpactTypes.some(type => vulnType.includes(type))) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  assessLikelihood(vulnerability) {
    // Simple likelihood assessment
    if (vulnerability.type?.toLowerCase().includes('injection')) return 'high';
    if (vulnerability.location?.file?.includes('public') || 
        vulnerability.location?.file?.includes('api')) return 'medium';
    return 'low';
  }

  generateComplianceStatus(results) {
    const status = {
      overall: 'unknown',
      standards: {},
      gaps: [],
      recommendations: []
    };

    if (results.owaspCompliance) {
      status.standards.owasp = {
        score: results.owaspCompliance.score,
        status: results.owaspCompliance.score >= 70 ? 'compliant' : 'non-compliant',
        violations: results.owaspCompliance.violations
      };
    }

    if (results.complianceReport) {
      Object.entries(results.complianceReport.standards).forEach(([standard, data]) => {
        status.standards[standard] = {
          score: data.score,
          status: data.score >= 70 ? 'compliant' : 'non-compliant'
        };
      });
    }

    // Calculate overall compliance
    const scores = Object.values(status.standards).map(s => s.score);
    if (scores.length > 0) {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      status.overall = avgScore >= 70 ? 'compliant' : 'non-compliant';
    }

    return status;
  }

  generateActionPlan(results) {
    const plan = {
      immediate: [], // 0-1 week
      shortTerm: [], // 1-4 weeks  
      mediumTerm: [], // 1-3 months
      longTerm: [] // 3+ months
    };

    // Categorize recommendations by timeline
    if (results.recommendations) {
      results.recommendations.forEach(rec => {
        const timeline = rec.implementation?.timeline || this.inferTimeline(rec);
        
        switch (timeline) {
          case 'immediate':
            plan.immediate.push(rec);
            break;
          case 'short_term':
            plan.shortTerm.push(rec);
            break;
          case 'medium_term':
            plan.mediumTerm.push(rec);
            break;
          case 'long_term':
            plan.longTerm.push(rec);
            break;
        }
      });
    }

    // Add critical vulnerability fixes to immediate
    const criticalVulns = results.vulnerabilities?.filter(v => v.severity === 'critical') || [];
    criticalVulns.forEach(vuln => {
      plan.immediate.push({
        priority: 'critical',
        title: `Fix ${vuln.type}`,
        description: vuln.mitigation || `Address critical ${vuln.type} vulnerability`,
        effort: 'high',
        impact: 'high'
      });
    });

    return plan;
  }

  inferTimeline(recommendation) {
    if (recommendation.priority === 'critical') return 'immediate';
    if (recommendation.priority === 'high') return 'short_term';
    if (recommendation.priority === 'medium') return 'medium_term';
    return 'long_term';
  }

  async generateHTMLReport(report) {
    const filename = `${report.id}.html`;
    const filepath = path.join(this.outputDir, filename);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Analysis Report - ${report.projectInfo.framework}</title>
    <style>
        ${this.getSecurityReportCSS()}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
</head>
<body>
    <div class="container">
        ${this.generateHTMLHeader(report)}
        ${this.generateHTMLExecutiveSummary(report)}
        ${this.generateHTMLVulnerabilitySection(report)}
        ${this.generateHTMLComplianceSection(report)}
        ${this.generateHTMLRiskMatrix(report)}
        ${this.generateHTMLActionPlan(report)}
        ${this.generateHTMLAppendix(report)}
    </div>
    
    <script>
        ${this.generateSecurityChartJS(report)}
    </script>
</body>
</html>
    `;

    await fs.writeFile(filepath, html.trim());
    return filepath;
  }

  generateHTMLHeader(report) {
    return `
    <header class="security-header">
        <div class="header-content">
            <h1>🔒 Security Analysis Report</h1>
            <div class="header-meta">
                <div class="meta-item">
                    <strong>Project:</strong> ${report.projectInfo.framework}
                </div>
                <div class="meta-item">
                    <strong>Generated:</strong> ${new Date(report.timestamp).toLocaleString()}
                </div>
                <div class="meta-item risk-badge ${report.summary.overallRisk}">
                    <strong>Risk Level:</strong> ${report.summary.overallRisk.toUpperCase()}
                </div>
            </div>
        </div>
    </header>
    `;
  }

  generateHTMLExecutiveSummary(report) {
    return `
    <section class="executive-summary">
        <h2>📊 Executive Summary</h2>
        
        <div class="summary-metrics">
            <div class="metric-card critical">
                <h3>Critical Issues</h3>
                <div class="metric-value">${report.summary.criticalIssues}</div>
            </div>
            <div class="metric-card vulnerabilities">
                <h3>Total Vulnerabilities</h3>
                <div class="metric-value">${report.summary.totalVulnerabilities}</div>
            </div>
            <div class="metric-card security-score">
                <h3>Security Score</h3>
                <div class="metric-value">${report.summary.securityScore}/100</div>
            </div>
            <div class="metric-card compliance">
                <h3>Compliance Score</h3>
                <div class="metric-value">${report.summary.complianceScore}/100</div>
            </div>
        </div>

        <div class="key-findings">
            <h3>🔍 Key Findings</h3>
            <ul>
                ${report.summary.keyFindings.map(finding => `<li>${finding}</li>`).join('')}
            </ul>
        </div>

        <div class="immediate-actions">
            <h3>⚡ Immediate Actions Required</h3>
            <ol>
                ${report.summary.immediateActions.map(action => `<li>${action}</li>`).join('')}
            </ol>
        </div>
    </section>
    `;
  }

  generateHTMLVulnerabilitySection(report) {
    if (!report.securityResults.vulnerabilities?.length) {
      return '<section><h2>🔒 Vulnerabilities</h2><p>No vulnerabilities detected.</p></section>';
    }

    const vulns = report.securityResults.vulnerabilities;
    const severityGroups = this.groupBySeverity(vulns);

    return `
    <section class="vulnerabilities-section">
        <h2>🔒 Security Vulnerabilities</h2>
        
        <div class="vulnerability-summary">
            <canvas id="vulnerabilitySeverityChart" width="400" height="200"></canvas>
        </div>

        ${Object.entries(severityGroups).map(([severity, vulnList]) => `
            <div class="severity-group ${severity}">
                <h3>${severity.toUpperCase()} Severity (${vulnList.length})</h3>
                <div class="vulnerabilities-list">
                    ${vulnList.map(vuln => this.generateVulnerabilityCard(vuln)).join('')}
                </div>
            </div>
        `).join('')}
    </section>
    `;
  }

  generateVulnerabilityCard(vuln) {
    return `
    <div class="vulnerability-card ${vuln.severity}">
        <div class="vuln-header">
            <h4>${vuln.type || 'Unknown Vulnerability'}</h4>
            <span class="severity-badge ${vuln.severity}">${vuln.severity}</span>
        </div>
        <div class="vuln-content">
            <p><strong>Description:</strong> ${vuln.description || 'No description available'}</p>
            ${vuln.location ? `<p><strong>Location:</strong> ${vuln.location.file}:${vuln.location.line}</p>` : ''}
            ${vuln.owasp_category ? `<p><strong>OWASP Category:</strong> ${vuln.owasp_category}</p>` : ''}
            ${vuln.cvss_score ? `<p><strong>CVSS Score:</strong> ${vuln.cvss_score}</p>` : ''}
        </div>
        <div class="vuln-mitigation">
            <p><strong>Mitigation:</strong> ${vuln.mitigation || 'No mitigation provided'}</p>
        </div>
    </div>
    `;
  }

  generateHTMLComplianceSection(report) {
    const compliance = report.complianceStatus || { overall: 'unknown', standards: {} };
    const overall = compliance.overall || 'unknown';
    
    return `
    <section class="compliance-section">
        <h2>📋 Compliance Status</h2>
        
        <div class="compliance-overview">
            <div class="compliance-score ${overall}">
                <h3>Overall Compliance: ${overall.toUpperCase()}</h3>
            </div>
        </div>

        <div class="standards-grid">
            ${Object.entries(compliance.standards || {}).map(([standard, data]) => `
                <div class="standard-card ${data.status || 'unknown'}">
                    <h4>${standard.toUpperCase()}</h4>
                    <div class="standard-score">${data.score || 0}/100</div>
                    <div class="standard-status">${data.status || 'unknown'}</div>
                </div>
            `).join('')}
        </div>
    </section>
    `;
  }

  generateHTMLRiskMatrix(report) {
    return `
    <section class="risk-matrix-section">
        <h2>📊 Risk Matrix</h2>
        <div class="risk-matrix">
            ${this.generateRiskMatrixHTML(report.riskMatrix)}
        </div>
    </section>
    `;
  }

  generateRiskMatrixHTML(matrix) {
    return `
    <table class="risk-matrix-table">
        <thead>
            <tr>
                <th>Severity / Likelihood</th>
                <th>High</th>
                <th>Medium</th>
                <th>Low</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(matrix).map(([severity, likelihoods]) => `
                <tr>
                    <td class="severity-label ${severity}">${severity.toUpperCase()}</td>
                    ${Object.entries(likelihoods).map(([likelihood, risks]) => `
                        <td class="risk-cell ${severity}-${likelihood}">
                            ${risks.length > 0 ? `<span class="risk-count">${risks.length}</span>` : ''}
                        </td>
                    `).join('')}
                </tr>
            `).join('')}
        </tbody>
    </table>
    `;
  }

  generateHTMLActionPlan(report) {
    return `
    <section class="action-plan-section">
        <h2>📅 Action Plan</h2>
        
        <div class="timeline-container">
            ${Object.entries(report.actionPlan).map(([timeline, actions]) => `
                <div class="timeline-group">
                    <h3>${this.formatTimelineName(timeline)} (${actions.length} actions)</h3>
                    <div class="actions-list">
                        ${actions.map(action => `
                            <div class="action-item ${action.priority}">
                                <h4>${action.title}</h4>
                                <p>${action.description}</p>
                                ${action.effort ? `<span class="effort-badge">${action.effort} effort</span>` : ''}
                                ${action.impact ? `<span class="impact-badge">${action.impact} impact</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    </section>
    `;
  }

  formatTimelineName(timeline) {
    const names = {
      immediate: '🚨 Immediate (0-1 week)',
      shortTerm: '⏰ Short Term (1-4 weeks)',
      mediumTerm: '📅 Medium Term (1-3 months)',
      longTerm: '🎯 Long Term (3+ months)'
    };
    return names[timeline] || timeline;
  }

  generateHTMLAppendix(report) {
    return `
    <section class="appendix-section">
        <h2>📚 Appendix</h2>
        
        <div class="methodology">
            <h3>Analysis Methodology</h3>
            <p>This security analysis was performed using automated static analysis, dependency scanning, and AI-powered code review following OWASP guidelines.</p>
        </div>

        <div class="references">
            <h3>References</h3>
            <ul>
                <li><a href="https://owasp.org/Top10/">OWASP Top 10 2021</a></li>
                <li><a href="https://cwe.mitre.org/">Common Weakness Enumeration</a></li>
                <li><a href="https://nvd.nist.gov/">National Vulnerability Database</a></li>
                <li><a href="https://github.com/advisories">GitHub Security Advisories</a></li>
            </ul>
        </div>

        <div class="disclaimer">
            <h3>Disclaimer</h3>
            <p>This automated analysis provides security insights but should be supplemented with manual security testing and professional security auditing for comprehensive coverage.</p>
        </div>
    </section>
    `;
  }

  groupBySeverity(vulnerabilities) {
    const groups = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    vulnerabilities.forEach(vuln => {
      const severity = vuln.severity || 'low';
      if (groups[severity]) {
        groups[severity].push(vuln);
      }
    });

    return groups;
  }

  async generateJSONReport(report) {
    const filename = `${report.id}.json`;
    const filepath = path.join(this.outputDir, filename);

    await fs.writeFile(filepath, JSON.stringify(report));
    return filepath;
  }

  async generatePDFReport(report) {
    // PDF generation would require a library like Puppeteer or PDFKit
    // For now, return a placeholder
    const filename = `${report.id}.pdf`;
    const filepath = path.join(this.outputDir, filename);
    
    // Placeholder - in a real implementation, convert HTML to PDF
    await fs.writeFile(filepath, 'PDF report generation not implemented yet');
    return filepath;
  }

  getSecurityReportCSS() {
    return `
      /* Security Report Styles */
      * { margin: 0; padding: 0; box-sizing: border-box; }
      
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

      .security-header {
        background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
        color: white;
        padding: 2rem;
        text-align: center;
      }

      .header-meta {
        display: flex;
        justify-content: center;
        gap: 2rem;
        margin-top: 1rem;
        flex-wrap: wrap;
      }

      .meta-item {
        background: rgba(255,255,255,0.1);
        padding: 0.5rem 1rem;
        border-radius: 20px;
      }

      .risk-badge {
        font-weight: bold;
      }

      .risk-badge.critical { background: #dc2626; }
      .risk-badge.high { background: #ea580c; }
      .risk-badge.medium { background: #ca8a04; }
      .risk-badge.low { background: #16a34a; }

      .executive-summary {
        padding: 2rem;
        border-bottom: 1px solid #e5e7eb;
      }

      .summary-metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
      }

      .metric-card {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        padding: 1.5rem;
        border-radius: 12px;
        text-align: center;
      }

      .metric-card.critical {
        background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
      }

      .metric-value {
        font-size: 2.5rem;
        font-weight: bold;
        margin-top: 0.5rem;
      }

      .vulnerabilities-section {
        padding: 2rem;
      }

      .severity-group {
        margin-bottom: 2rem;
      }

      .vulnerability-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        border-left: 4px solid #6b7280;
      }

      .vulnerability-card.critical { border-left-color: #dc2626; }
      .vulnerability-card.high { border-left-color: #ea580c; }
      .vulnerability-card.medium { border-left-color: #ca8a04; }
      .vulnerability-card.low { border-left-color: #16a34a; }

      .vuln-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .severity-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: bold;
        color: white;
      }

      .severity-badge.critical { background: #dc2626; }
      .severity-badge.high { background: #ea580c; }
      .severity-badge.medium { background: #ca8a04; }
      .severity-badge.low { background: #16a34a; }

      .compliance-section {
        padding: 2rem;
        background: #f9fafb;
      }

      .standards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      }

      .standard-card {
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        text-align: center;
        border: 2px solid #e5e7eb;
      }

      .standard-card.compliant { border-color: #16a34a; }
      .standard-card.non-compliant { border-color: #dc2626; }

      .risk-matrix-section {
        padding: 2rem;
      }

      .risk-matrix-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
      }

      .risk-matrix-table th,
      .risk-matrix-table td {
        border: 1px solid #e5e7eb;
        padding: 1rem;
        text-align: center;
      }

      .risk-matrix-table th {
        background: #f3f4f6;
        font-weight: bold;
      }

      .severity-label {
        font-weight: bold;
        text-transform: uppercase;
      }

      .risk-cell {
        position: relative;
        min-height: 60px;
      }

      .risk-count {
        display: inline-block;
        background: #dc2626;
        color: white;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        line-height: 30px;
        font-weight: bold;
      }

      .action-plan-section {
        padding: 2rem;
        background: #f9fafb;
      }

      .timeline-group {
        margin-bottom: 2rem;
      }

      .action-item {
        background: white;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        border-left: 4px solid #6b7280;
      }

      .action-item.critical { border-left-color: #dc2626; }
      .action-item.high { border-left-color: #ea580c; }
      .action-item.medium { border-left-color: #ca8a04; }
      .action-item.low { border-left-color: #16a34a; }

      .effort-badge,
      .impact-badge {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.8rem;
        margin-right: 0.5rem;
      }

      .effort-badge { background: #e0e7ff; color: #3730a3; }
      .impact-badge { background: #fef3c7; color: #92400e; }

      .appendix-section {
        padding: 2rem;
        border-top: 1px solid #e5e7eb;
      }

      @media (max-width: 768px) {
        .header-meta { flex-direction: column; }
        .summary-metrics { grid-template-columns: 1fr; }
        .standards-grid { grid-template-columns: 1fr; }
      }
    `;
  }

  generateSecurityChartJS(report) {
    return `
    // Vulnerability Severity Chart
    const ctx = document.getElementById('vulnerabilitySeverityChart');
    if (ctx && ${JSON.stringify(report.securityResults.vulnerabilities || [])}.length > 0) {
      const vulnerabilities = ${JSON.stringify(report.securityResults.vulnerabilities || [])};
      const severityCounts = vulnerabilities.reduce((counts, vuln) => {
        counts[vuln.severity] = (counts[vuln.severity] || 0) + 1;
        return counts;
      }, {});

      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(severityCounts),
          datasets: [{
            data: Object.values(severityCounts),
            backgroundColor: [
              '#dc2626', // critical
              '#ea580c', // high
              '#ca8a04', // medium
              '#16a34a'  // low
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom'
            },
            title: {
              display: true,
              text: 'Vulnerabilities by Severity'
            }
          }
        }
      });
    }

    console.log('Security report loaded successfully!');
    `;
  }
}

module.exports = SecurityReportGenerator;