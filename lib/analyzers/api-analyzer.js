class APIAnalyzer {
  constructor(framework) {
    this.framework = framework;
  }

  async analyze(aiResult, files) {
    if (!aiResult || aiResult.error) {
      return this.createEmptyResult(aiResult?.error);
    }

    // Enhance AI results with additional analysis
    const enhancedResult = {
      ...aiResult,
      metadata: this.generateMetadata(aiResult, files),
      frameworkSpecific: this.addFrameworkSpecificAnalysis(aiResult),
      security: this.enhanceSecurityAnalysis(aiResult),
      performance: this.enhancePerformanceAnalysis(aiResult),
      recommendations: this.generateRecommendations(aiResult)
    };

    return enhancedResult;
  }

  createEmptyResult(error) {
    return {
      endpoints: [],
      apiGroups: {},
      securityIssues: [],
      performanceIssues: [],
      orphanedEndpoints: [],
      metadata: {
        totalEndpoints: 0,
        analysisDate: new Date().toISOString(),
        framework: this.framework,
        error: error
      },
      recommendations: [
        'Check if your project has API endpoints',
        'Ensure API files are in the expected locations',
        'Verify that the AI analysis service is working correctly'
      ]
    };
  }

  generateMetadata(result, files) {
    return {
      totalEndpoints: result.endpoints?.length || 0,
      totalFiles: files.length,
      analysisDate: new Date().toISOString(),
      framework: this.framework,
      httpMethods: this.countHttpMethods(result.endpoints),
      authenticationTypes: this.identifyAuthTypes(result.endpoints),
      avgEndpointsPerFile: files.length > 0 ? (result.endpoints?.length || 0) / files.length : 0
    };
  }

  countHttpMethods(endpoints) {
    if (!endpoints) return {};
    
    return endpoints.reduce((counts, endpoint) => {
      const method = endpoint.method?.toUpperCase() || 'UNKNOWN';
      counts[method] = (counts[method] || 0) + 1;
      return counts;
    }, {});
  }

  identifyAuthTypes(endpoints) {
    if (!endpoints) return [];
    
    const authTypes = new Set();
    
    endpoints.forEach(endpoint => {
      if (endpoint.auth?.type) {
        authTypes.add(endpoint.auth.type);
      }
    });
    
    return Array.from(authTypes);
  }

  addFrameworkSpecificAnalysis(result) {
    const frameworkAnalysis = {
      nextjs: this.analyzeNextJS(result),
      express: this.analyzeExpress(result),
      fastapi: this.analyzeFastAPI(result),
      django: this.analyzeDjango(result)
    };

    return frameworkAnalysis[this.framework] || {};
  }

  analyzeNextJS(result) {
    const analysis = {
      routeTypes: {},
      appRouterUsage: false,
      pagesRouterUsage: false
    };

    if (result.endpoints) {
      result.endpoints.forEach(endpoint => {
        // Check for App Router patterns
        if (endpoint.file?.includes('/app/') && endpoint.file?.includes('/route.')) {
          analysis.appRouterUsage = true;
        }
        
        // Check for Pages Router patterns
        if (endpoint.file?.includes('/pages/api/')) {
          analysis.pagesRouterUsage = true;
        }
      });
    }

    return analysis;
  }

  analyzeExpress(result) {
    const analysis = {
      routerUsage: 0,
      middlewarePatterns: [],
      routeOrganization: 'unknown'
    };

    if (result.endpoints) {
      result.endpoints.forEach(endpoint => {
        if (endpoint.file?.includes('/routes/')) {
          analysis.routerUsage++;
        }
        
        if (endpoint.middleware?.length > 0) {
          analysis.middlewarePatterns.push(...endpoint.middleware);
        }
      });
    }

    // Deduplicate middleware patterns
    analysis.middlewarePatterns = [...new Set(analysis.middlewarePatterns)];

    return analysis;
  }

  analyzeFastAPI(result) {
    return {
      pathOperations: result.endpoints?.length || 0,
      dependencyInjection: this.countDependencyUsage(result),
      asyncEndpoints: this.countAsyncEndpoints(result)
    };
  }

  analyzeDjango(result) {
    return {
      viewTypes: this.categorizeDjangoViews(result),
      urlPatterns: result.endpoints?.length || 0,
      classBasedViews: 0,
      functionBasedViews: 0
    };
  }

  countDependencyUsage(result) {
    // Count dependency injection patterns
    return 0; // Placeholder
  }

  countAsyncEndpoints(result) {
    // Count async endpoint patterns
    return 0; // Placeholder
  }

  categorizeDjangoViews(result) {
    return {
      class_based: 0,
      function_based: 0
    };
  }

  enhanceSecurityAnalysis(result) {
    const enhanced = {
      ...result.security,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      commonVulnerabilities: []
    };

    if (result.securityIssues) {
      result.securityIssues.forEach(issue => {
        switch (issue.severity) {
          case 'critical':
            enhanced.criticalIssues++;
            break;
          case 'high':
            enhanced.highIssues++;
            break;
          case 'medium':
            enhanced.mediumIssues++;
            break;
          case 'low':
            enhanced.lowIssues++;
            break;
        }
      });

      // Identify common vulnerability patterns
      enhanced.commonVulnerabilities = this.identifyVulnerabilityPatterns(result.securityIssues);
    }

    return enhanced;
  }

  identifyVulnerabilityPatterns(securityIssues) {
    const patterns = [];
    const issues = securityIssues.map(issue => issue.issue?.toLowerCase() || '');

    if (issues.some(issue => issue.includes('authentication'))) {
      patterns.push('Authentication Issues');
    }
    if (issues.some(issue => issue.includes('rate limit'))) {
      patterns.push('Rate Limiting');
    }
    if (issues.some(issue => issue.includes('validation'))) {
      patterns.push('Input Validation');
    }
    if (issues.some(issue => issue.includes('cors'))) {
      patterns.push('CORS Configuration');
    }

    return patterns;
  }

  enhancePerformanceAnalysis(result) {
    const enhanced = {
      ...result.performance,
      totalIssues: result.performanceIssues?.length || 0,
      categories: {
        database: 0,
        caching: 0,
        authentication: 0,
        validation: 0
      }
    };

    if (result.performanceIssues) {
      result.performanceIssues.forEach(issue => {
        const category = this.categorizePerformanceIssue(issue);
        if (enhanced.categories[category] !== undefined) {
          enhanced.categories[category]++;
        }
      });
    }

    return enhanced;
  }

  categorizePerformanceIssue(issue) {
    const issueText = issue.issue?.toLowerCase() || '';
    
    if (issueText.includes('database') || issueText.includes('query')) {
      return 'database';
    }
    if (issueText.includes('cache')) {
      return 'caching';
    }
    if (issueText.includes('auth')) {
      return 'authentication';
    }
    if (issueText.includes('validation')) {
      return 'validation';
    }
    
    return 'other';
  }

  generateRecommendations(result) {
    const recommendations = [];

    // Security recommendations
    const criticalIssues = result.securityIssues?.filter(i => i.severity === 'critical').length || 0;
    if (criticalIssues > 0) {
      recommendations.push({
        priority: 'high',
        category: 'security',
        title: 'Address Critical Security Issues',
        description: `Fix ${criticalIssues} critical security vulnerabilities immediately`
      });
    }

    // Performance recommendations
    if (result.performanceIssues?.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        title: 'Optimize API Performance',
        description: `Address ${result.performanceIssues.length} performance issues`
      });
    }

    // Orphaned endpoints
    if (result.orphanedEndpoints?.length > 0) {
      recommendations.push({
        priority: 'low',
        category: 'maintenance',
        title: 'Clean Up Orphaned Endpoints',
        description: `Remove ${result.orphanedEndpoints.length} unused endpoints`
      });
    }

    // Framework-specific recommendations
    const frameworkRecs = this.getFrameworkSpecificRecommendations(result);
    recommendations.push(...frameworkRecs);

    return recommendations;
  }

  getFrameworkSpecificRecommendations(result) {
    const generators = {
      nextjs: this.getNextJSRecommendations.bind(this),
      express: this.getExpressRecommendations.bind(this),
      fastapi: this.getFastAPIRecommendations.bind(this),
      django: this.getDjangoRecommendations.bind(this)
    };

    const generator = generators[this.framework];
    return generator ? generator(result) : [];
  }

  getNextJSRecommendations(result) {
    const recommendations = [];
    
    // Check for mixed routing patterns
    const hasAppRouter = result.endpoints?.some(e => e.file?.includes('/app/'));
    const hasPagesRouter = result.endpoints?.some(e => e.file?.includes('/pages/'));
    
    if (hasAppRouter && hasPagesRouter) {
      recommendations.push({
        priority: 'medium',
        category: 'architecture',
        title: 'Consolidate Routing Approach',
        description: 'Consider migrating to App Router for consistency'
      });
    }

    return recommendations;
  }

  getExpressRecommendations(result) {
    const recommendations = [];
    
    // Check for middleware usage
    const endpointsWithoutAuth = result.endpoints?.filter(e => !e.auth?.required).length || 0;
    const totalEndpoints = result.endpoints?.length || 0;
    
    if (totalEndpoints > 0 && endpointsWithoutAuth / totalEndpoints > 0.5) {
      recommendations.push({
        priority: 'high',
        category: 'security',
        title: 'Add Authentication Middleware',
        description: `${endpointsWithoutAuth} endpoints lack authentication`
      });
    }

    return recommendations;
  }

  getFastAPIRecommendations(result) {
    return [];
  }

  getDjangoRecommendations(result) {
    return [];
  }
}

module.exports = APIAnalyzer;