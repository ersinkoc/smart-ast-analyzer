class JSONFormatter {
  static format(report) {
    return JSON.stringify(report, null, 2);
  }

  static formatSummary(report) {
    const summary = {
      id: report.id,
      timestamp: report.timestamp,
      project: {
        path: report.projectInfo.path,
        framework: report.projectInfo.framework,
        language: report.projectInfo.language
      },
      metrics: report.metrics,
      summary: report.summary,
      keyInsights: report.insights.slice(0, 5),
      topRecommendations: report.recommendations.slice(0, 3).map(rec => ({
        title: rec.title,
        priority: rec.priority,
        impact: rec.impact
      }))
    };

    return JSON.stringify(summary, null, 2);
  }

  static formatForAPI(report) {
    // Format for API consumption - flattened structure
    return {
      meta: {
        id: report.id,
        timestamp: report.timestamp,
        framework: report.projectInfo.framework,
        analysisTypes: Object.keys(report.results)
      },
      summary: {
        description: report.summary,
        insights: report.insights,
        recommendations: report.recommendations.map(r => ({
          title: r.title,
          priority: r.priority,
          description: r.description
        }))
      },
      results: this.flattenResults(report.results),
      metrics: report.metrics
    };
  }

  static flattenResults(results) {
    const flattened = {};
    
    for (const [type, data] of Object.entries(results)) {
      flattened[type] = {
        count: this.getResultCount(type, data),
        issues: this.extractIssues(data),
        summary: this.createTypeSummary(type, data)
      };
    }
    
    return flattened;
  }

  static getResultCount(type, data) {
    const counters = {
      api: data.endpoints?.length || 0,
      components: Object.keys(data.components || {}).length,
      websocket: Object.keys(data.events?.client || {}).length + Object.keys(data.events?.server || {}).length,
      auth: data.protectedRoutes?.length || 0,
      database: data.models?.length || 0,
      performance: (data.bundle?.largeDependencies?.length || 0) + (data.rendering?.heavyComponents?.length || 0)
    };
    
    return counters[type] || 0;
  }

  static extractIssues(data) {
    const issues = [];
    
    if (data.securityIssues) issues.push(...data.securityIssues);
    if (data.performanceIssues) issues.push(...data.performanceIssues);
    if (data.issues) issues.push(...data.issues);
    if (data.vulnerabilities) issues.push(...data.vulnerabilities);
    
    return issues.slice(0, 10); // Limit to top 10 issues
  }

  static createTypeSummary(type, data) {
    const summaries = {
      api: `Found ${data.endpoints?.length || 0} endpoints, ${data.securityIssues?.length || 0} security issues`,
      components: `Analyzed ${Object.keys(data.components || {}).length} components, ${data.unusedComponents?.length || 0} unused`,
      websocket: `${Object.keys(data.events?.client || {}).length} client events, ${Object.keys(data.events?.server || {}).length} server events`,
      auth: `${data.authentication?.methods?.length || 0} auth methods, ${data.protectedRoutes?.length || 0} protected routes`,
      database: `${data.models?.length || 0} models, ${data.performance?.nPlusOneQueries?.length || 0} N+1 queries`,
      performance: `${data.bundle?.largeDependencies?.length || 0} large dependencies, ${data.rendering?.heavyComponents?.length || 0} heavy components`
    };
    
    return summaries[type] || 'Analysis completed';
  }
}

module.exports = JSONFormatter;