const fs = require('fs').promises;
const path = require('path');
const JSONFormatter = require('./json-formatter');
const MarkdownFormatter = require('./markdown-formatter');
const HTMLGenerator = require('./html-generator');
const MetricsVisualizer = require('./metrics-visualizer');
const Helpers = require('../utils/helpers');

class ReportBuilder {
  constructor(options = {}) {
    this.outputDir = path.resolve(options.output || './smart-ast-output');
    this.formats = options.format === 'all' 
      ? ['json', 'markdown', 'html'] 
      : [options.format];
    this.metricsVisualizer = new MetricsVisualizer(options);
  }

  async build(analysisResults, projectInfo) {
    const timestamp = new Date().toISOString();
    const reportId = `analysis-${Date.now()}`;
    
    const report = {
      id: reportId,
      timestamp,
      projectInfo,
      results: analysisResults,
      summary: this.generateSummary(analysisResults, projectInfo),
      insights: this.generateInsights(analysisResults),
      recommendations: this.generateRecommendations(analysisResults),
      metrics: this.calculateMetrics(analysisResults, projectInfo)
    };

    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });

    // Generate reports in requested formats
    const generatedFiles = [];
    
    for (const format of this.formats) {
      try {
        const file = await this[`generate${format.toUpperCase()}`](report);
        generatedFiles.push(file);
      } catch (error) {
        console.error(`Failed to generate ${format} report:`, error.message);
      }
    }

    // Generate interactive visualizations if we have deep analysis data
    if (analysisResults.deepAnalysis) {
      try {
        const vizDir = await this.metricsVisualizer.generateVisualization(analysisResults, this.outputDir);
        generatedFiles.push(vizDir);
      } catch (error) {
        console.warn('Failed to generate visualizations:', error.message);
      }
    }

    // Update index
    await this.updateIndex(report);

    return {
      reportId,
      files: generatedFiles,
      summary: report.summary,
      outputDir: this.outputDir
    };
  }

  async generateJSON(report) {
    const filename = `${report.id}.json`;
    const filepath = path.join(this.outputDir, filename);
    
    const jsonContent = JSONFormatter.format(report);
    await fs.writeFile(filepath, jsonContent);
    
    return filepath;
  }

  async generateMARKDOWN(report) {
    const filename = `${report.id}.md`;
    const filepath = path.join(this.outputDir, filename);
    
    const markdownContent = MarkdownFormatter.format(report);
    await fs.writeFile(filepath, markdownContent);
    
    return filepath;
  }

  async generateHTML(report) {
    const filename = `${report.id}.html`;
    const filepath = path.join(this.outputDir, filename);
    
    const htmlContent = await HTMLGenerator.generate(report);
    await fs.writeFile(filepath, htmlContent);
    
    return filepath;
  }

  generateSummary(results, projectInfo) {
    const summaryParts = [];
    
    // Project overview
    summaryParts.push(`Analyzed ${projectInfo.framework} project with ${projectInfo.metrics?.totalFiles || 0} files`);
    
    // API analysis
    if (results.api) {
      const apiCount = results.api.endpoints?.length || 0;
      const orphaned = results.api.orphanedEndpoints?.length || 0;
      const securityIssues = results.api.securityIssues?.length || 0;
      
      summaryParts.push(`Found ${apiCount} API endpoints`);
      if (orphaned > 0) summaryParts.push(`${orphaned} orphaned endpoints`);
      if (securityIssues > 0) summaryParts.push(`${securityIssues} security issues`);
    }
    
    // Component analysis
    if (results.components) {
      const compCount = Object.keys(results.components.components || {}).length;
      const unused = results.components.unusedComponents?.length || 0;
      const circular = results.components.circularDependencies?.length || 0;
      
      summaryParts.push(`analyzed ${compCount} components`);
      if (unused > 0) summaryParts.push(`${unused} unused components`);
      if (circular > 0) summaryParts.push(`${circular} circular dependencies`);
    }
    
    // WebSocket analysis
    if (results.websocket && results.websocket.events) {
      const clientEvents = Object.keys(results.websocket.events.client || {}).length;
      const serverEvents = Object.keys(results.websocket.events.server || {}).length;
      
      if (clientEvents + serverEvents > 0) {
        summaryParts.push(`identified ${clientEvents + serverEvents} WebSocket events`);
      }
    }
    
    // Database analysis
    if (results.database) {
      const models = results.database.models?.length || 0;
      const nPlusOne = results.database.performance?.nPlusOneQueries?.length || 0;
      
      if (models > 0) summaryParts.push(`${models} database models`);
      if (nPlusOne > 0) summaryParts.push(`${nPlusOne} N+1 query issues`);
    }
    
    // Performance analysis
    if (results.performance) {
      const largeDeps = results.performance.bundle?.largeDependencies?.length || 0;
      const heavyComps = results.performance.rendering?.heavyComponents?.length || 0;
      
      if (largeDeps > 0) summaryParts.push(`${largeDeps} large dependencies`);
      if (heavyComps > 0) summaryParts.push(`${heavyComps} performance concerns`);
    }
    
    return summaryParts.join(', ') + '.';
  }

  generateInsights(results) {
    const insights = [];
    
    // API insights
    if (results.api) {
      if (results.api.securityIssues?.length > 0) {
        insights.push(`Found ${results.api.securityIssues.length} security vulnerabilities in API endpoints`);
      }
      
      if (results.api.orphanedEndpoints?.length > 0) {
        insights.push(`${results.api.orphanedEndpoints.length} API endpoints are not being used and can be removed`);
      }
      
      const unprotectedEndpoints = results.api.endpoints?.filter(e => !e.auth?.required).length || 0;
      if (unprotectedEndpoints > results.api.endpoints?.length * 0.7) {
        insights.push(`${unprotectedEndpoints} endpoints lack authentication protection`);
      }
    }
    
    // Component insights
    if (results.components) {
      if (results.components.circularDependencies?.length > 0) {
        insights.push(`Detected ${results.components.circularDependencies.length} circular dependencies that may cause runtime issues`);
      }
      
      if (results.components.propDrilling?.length > 0) {
        const deepDrilling = results.components.propDrilling.filter(pd => pd.depth > 3);
        if (deepDrilling.length > 0) {
          insights.push(`Found ${deepDrilling.length} instances of deep prop drilling (>3 levels)`);
        }
      }
      
      if (results.components.unusedComponents?.length > 0) {
        insights.push(`${results.components.unusedComponents.length} components are defined but never used`);
      }
    }
    
    // Performance insights
    if (results.performance) {
      if (results.performance.bundle?.largeDependencies?.length > 0) {
        const totalSize = results.performance.bundle.largeDependencies.reduce((sum, dep) => {
          const sizeMatch = dep.size?.match(/(\d+(?:\.\d+)?)\s*(KB|MB)/);
          if (sizeMatch) {
            const value = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2];
            return sum + (unit === 'MB' ? value * 1024 : value);
          }
          return sum;
        }, 0);
        
        if (totalSize > 500) { // > 500KB
          insights.push(`Large dependencies contribute ${Math.round(totalSize)}KB to bundle size`);
        }
      }
      
      if (results.performance.rendering?.heavyComponents?.length > 0) {
        insights.push(`${results.performance.rendering.heavyComponents.length} components may cause performance bottlenecks`);
      }
    }
    
    // Database insights
    if (results.database) {
      if (results.database.performance?.nPlusOneQueries?.length > 0) {
        insights.push(`${results.database.performance.nPlusOneQueries.length} potential N+1 query problems detected`);
      }
      
      if (results.database.performance?.missingIndexes?.length > 0) {
        insights.push(`${results.database.performance.missingIndexes.length} database queries could benefit from indexes`);
      }
    }
    
    // Authentication insights
    if (results.auth) {
      const criticalVulns = results.auth.security?.vulnerabilities?.filter(v => v.severity === 'critical').length || 0;
      if (criticalVulns > 0) {
        insights.push(`Found ${criticalVulns} critical security vulnerabilities in authentication system`);
      }
    }
    
    return insights;
  }

  generateRecommendations(results) {
    const recommendations = [];
    
    // API recommendations
    if (results.api?.orphanedEndpoints?.length > 0) {
      recommendations.push({
        title: 'Remove Orphaned API Endpoints',
        description: `${results.api.orphanedEndpoints.length} API endpoints are not being used by any frontend code. Removing these will reduce attack surface and maintenance overhead.`,
        priority: 'medium',
        effort: 'low',
        impact: 'medium'
      });
    }
    
    if (results.api?.securityIssues?.length > 0) {
      const criticalCount = results.api.securityIssues.filter(i => i.severity === 'critical').length;
      recommendations.push({
        title: 'Fix Critical Security Issues',
        description: `Address ${results.api.securityIssues.length} security issues in API endpoints, including ${criticalCount} critical vulnerabilities.`,
        priority: criticalCount > 0 ? 'high' : 'medium',
        effort: 'medium',
        impact: 'high'
      });
    }
    
    // Component recommendations
    if (results.components?.unusedComponents?.length > 0) {
      recommendations.push({
        title: 'Remove Unused Components',
        description: `${results.components.unusedComponents.length} components are defined but never used. Removing them will reduce bundle size and maintenance overhead.`,
        priority: 'low',
        effort: 'low',
        impact: 'medium'
      });
    }
    
    if (results.components?.circularDependencies?.length > 0) {
      recommendations.push({
        title: 'Resolve Circular Dependencies',
        description: `${results.components.circularDependencies.length} circular dependencies detected. These can cause runtime errors and make code harder to maintain.`,
        priority: 'high',
        effort: 'medium',
        impact: 'high'
      });
    }
    
    // Performance recommendations
    if (results.performance?.bundle?.largeDependencies?.length > 0) {
      recommendations.push({
        title: 'Optimize Bundle Size',
        description: `${results.performance.bundle.largeDependencies.length} large dependencies detected. Consider code splitting, tree shaking, or alternative libraries.`,
        priority: 'medium',
        effort: 'medium',
        impact: 'high'
      });
    }
    
    if (results.performance?.rendering?.heavyComponents?.length > 0) {
      recommendations.push({
        title: 'Optimize Component Performance',
        description: `${results.performance.rendering.heavyComponents.length} components have performance issues. Consider memoization, virtualization, or code splitting.`,
        priority: 'medium',
        effort: 'medium',
        impact: 'high'
      });
    }
    
    // Database recommendations
    if (results.database?.performance?.nPlusOneQueries?.length > 0) {
      recommendations.push({
        title: 'Fix N+1 Query Problems',
        description: `${results.database.performance.nPlusOneQueries.length} potential N+1 queries found. Use eager loading or query optimization to improve performance.`,
        priority: 'high',
        effort: 'medium',
        impact: 'high'
      });
    }
    
    // General recommendations
    if (Object.keys(results).length === 1 && results.api) {
      recommendations.push({
        title: 'Perform Comprehensive Analysis',
        description: 'Only API analysis was performed. Consider running a full analysis to get insights into components, performance, and security.',
        priority: 'low',
        effort: 'low',
        impact: 'medium'
      });
    }
    
    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }

  calculateMetrics(results, projectInfo) {
    const metrics = {
      totalFiles: projectInfo.metrics?.totalFiles || 0,
      codeFiles: projectInfo.metrics?.codeFiles || 0,
      totalLines: projectInfo.metrics?.totalLines || 0,
      analysisTypes: Object.keys(results).length
    };
    
    // Calculate quality scores (0-100)
    let securityScore = 100;
    let performanceScore = 100;
    let maintainabilityScore = 100;
    
    // Security score
    if (results.api?.securityIssues) {
      const criticalIssues = results.api.securityIssues.filter(i => i.severity === 'critical').length;
      const highIssues = results.api.securityIssues.filter(i => i.severity === 'high').length;
      securityScore -= (criticalIssues * 20) + (highIssues * 10);
    }
    
    if (results.auth?.security?.vulnerabilities) {
      const criticalVulns = results.auth.security.vulnerabilities.filter(v => v.severity === 'critical').length;
      securityScore -= criticalVulns * 15;
    }
    
    // Performance score
    if (results.performance?.bundle?.largeDependencies?.length > 0) {
      performanceScore -= Math.min(results.performance.bundle.largeDependencies.length * 5, 30);
    }
    
    if (results.performance?.rendering?.heavyComponents?.length > 0) {
      performanceScore -= Math.min(results.performance.rendering.heavyComponents.length * 10, 40);
    }
    
    if (results.database?.performance?.nPlusOneQueries?.length > 0) {
      performanceScore -= Math.min(results.database.performance.nPlusOneQueries.length * 15, 50);
    }
    
    // Maintainability score
    if (results.components?.circularDependencies?.length > 0) {
      maintainabilityScore -= results.components.circularDependencies.length * 20;
    }
    
    if (results.components?.unusedComponents?.length > 0) {
      maintainabilityScore -= Math.min(results.components.unusedComponents.length * 5, 25);
    }
    
    if (results.api?.orphanedEndpoints?.length > 0) {
      maintainabilityScore -= Math.min(results.api.orphanedEndpoints.length * 3, 15);
    }
    
    // Ensure scores are between 0 and 100
    securityScore = Math.max(0, Math.min(100, securityScore));
    performanceScore = Math.max(0, Math.min(100, performanceScore));
    maintainabilityScore = Math.max(0, Math.min(100, maintainabilityScore));
    
    metrics.securityScore = securityScore;
    metrics.performanceScore = performanceScore;
    metrics.maintainabilityScore = maintainabilityScore;
    metrics.overallScore = Math.round((securityScore + performanceScore + maintainabilityScore) / 3);
    
    return metrics;
  }

  async updateIndex(report) {
    const indexPath = path.join(this.outputDir, 'index.json');
    
    let index = [];
    try {
      const existing = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(existing);
    } catch (e) {
      // Index doesn't exist yet
    }
    
    index.unshift({
      id: report.id,
      timestamp: report.timestamp,
      projectPath: report.projectInfo.path,
      framework: report.projectInfo.framework,
      language: report.projectInfo.language,
      summary: report.summary,
      overallScore: report.metrics.overallScore,
      analysisTypes: Object.keys(report.results)
    });
    
    // Keep only last 50 reports
    index = index.slice(0, 50);
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }
}

module.exports = ReportBuilder;