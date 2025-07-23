class ComponentAnalyzer {
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
      architecture: this.analyzeArchitecture(aiResult),
      performance: this.enhancePerformanceAnalysis(aiResult),
      recommendations: this.generateRecommendations(aiResult)
    };

    return enhancedResult;
  }

  createEmptyResult(error) {
    return {
      components: {},
      componentTree: {},
      dataFlow: [],
      unusedComponents: [],
      circularDependencies: [],
      propDrilling: [],
      metadata: {
        totalComponents: 0,
        analysisDate: new Date().toISOString(),
        framework: this.framework,
        error: error
      },
      recommendations: [
        'Check if your project has components',
        'Ensure component files are in the expected locations',
        'Verify that the AI analysis service is working correctly'
      ]
    };
  }

  generateMetadata(result, files) {
    const components = result.components || {};
    
    return {
      totalComponents: Object.keys(components).length,
      totalFiles: files.length,
      analysisDate: new Date().toISOString(),
      framework: this.framework,
      componentTypes: this.countComponentTypes(components),
      stateManagementPatterns: this.identifyStatePatterns(components),
      averagePropsPerComponent: this.calculateAverageProps(components),
      componentComplexity: this.assessComplexity(components)
    };
  }

  countComponentTypes(components) {
    const types = {};
    
    Object.values(components).forEach(comp => {
      const type = comp.type || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });
    
    return types;
  }

  identifyStatePatterns(components) {
    const patterns = new Set();
    
    Object.values(components).forEach(comp => {
      if (comp.state) {
        if (comp.state.local?.length > 0) patterns.add('local');
        if (comp.state.global?.length > 0) patterns.add('global');
        if (comp.state.server?.length > 0) patterns.add('server');
      }
    });
    
    return Array.from(patterns);
  }

  calculateAverageProps(components) {
    const componentArray = Object.values(components);
    if (componentArray.length === 0) return 0;
    
    const totalProps = componentArray.reduce((sum, comp) => {
      return sum + Object.keys(comp.props || {}).length;
    }, 0);
    
    return Math.round((totalProps / componentArray.length) * 10) / 10;
  }

  assessComplexity(components) {
    const complexity = {
      simple: 0,
      moderate: 0,
      complex: 0
    };
    
    Object.values(components).forEach(comp => {
      const score = this.calculateComplexityScore(comp);
      
      if (score <= 10) {
        complexity.simple++;
      } else if (score <= 25) {
        complexity.moderate++;
      } else {
        complexity.complex++;
      }
    });
    
    return complexity;
  }

  calculateComplexityScore(component) {
    let score = 0;
    
    // Props complexity
    score += Object.keys(component.props || {}).length;
    
    // State complexity
    if (component.state) {
      score += (component.state.local?.length || 0) * 2;
      score += (component.state.global?.length || 0) * 3;
      score += (component.state.server?.length || 0) * 2;
    }
    
    // Dependencies
    if (component.dependencies) {
      score += (component.dependencies.components?.length || 0);
      score += (component.dependencies.hooks?.length || 0);
    }
    
    // API calls
    score += (component.apiCalls?.length || 0) * 3;
    
    // Children complexity
    score += (component.children?.length || 0);
    
    return score;
  }

  addFrameworkSpecificAnalysis(result) {
    const frameworkAnalysis = {
      react: this.analyzeReact(result),
      vue: this.analyzeVue(result),
      angular: this.analyzeAngular(result),
      svelte: this.analyzeSvelte(result)
    };

    return frameworkAnalysis[this.framework] || {};
  }

  analyzeReact(result) {
    const analysis = {
      hookUsage: {},
      classComponents: 0,
      functionalComponents: 0,
      contextUsage: 0,
      memoizationPatterns: []
    };

    Object.values(result.components || {}).forEach(comp => {
      if (comp.type === 'class') {
        analysis.classComponents++;
      } else if (comp.type === 'functional') {
        analysis.functionalComponents++;
      }
      
      // Count hook usage
      if (comp.dependencies?.hooks) {
        comp.dependencies.hooks.forEach(hook => {
          analysis.hookUsage[hook] = (analysis.hookUsage[hook] || 0) + 1;
        });
      }
      
      // Check context usage
      if (comp.state?.global?.some(state => state.includes('context'))) {
        analysis.contextUsage++;
      }
      
      // Check memoization
      if (comp.performance?.memoized) {
        analysis.memoizationPatterns.push(comp.file);
      }
    });

    return analysis;
  }

  analyzeVue(result) {
    const analysis = {
      compositionAPI: 0,
      optionsAPI: 0,
      singleFileComponents: 0,
      composableUsage: {}
    };

    Object.values(result.components || {}).forEach(comp => {
      // Detect API style based on patterns
      if (comp.dependencies?.hooks?.some(h => h.startsWith('use'))) {
        analysis.compositionAPI++;
      } else {
        analysis.optionsAPI++;
      }
      
      // Count SFCs
      if (comp.file?.endsWith('.vue')) {
        analysis.singleFileComponents++;
      }
    });

    return analysis;
  }

  analyzeAngular(result) {
    return {
      components: 0,
      services: 0,
      pipes: 0,
      directives: 0
    };
  }

  analyzeSvelte(result) {
    return {
      components: Object.keys(result.components || {}).length,
      stores: 0,
      actions: 0
    };
  }

  analyzeArchitecture(result) {
    const architecture = {
      depth: this.calculateTreeDepth(result.componentTree),
      breadth: this.calculateTreeBreadth(result.componentTree),
      patterns: this.identifyArchitecturalPatterns(result),
      coupling: this.assessCoupling(result),
      cohesion: this.assessCohesion(result)
    };

    return architecture;
  }

  calculateTreeDepth(componentTree) {
    if (!componentTree || typeof componentTree !== 'object') return 0;
    
    let maxDepth = 0;
    
    function traverse(node, depth) {
      maxDepth = Math.max(maxDepth, depth);
      
      if (node && typeof node === 'object') {
        Object.values(node).forEach(child => {
          if (typeof child === 'object') {
            traverse(child, depth + 1);
          }
        });
      }
    }
    
    traverse(componentTree, 1);
    return maxDepth;
  }

  calculateTreeBreadth(componentTree) {
    if (!componentTree || typeof componentTree !== 'object') return 0;
    
    const rootKeys = Object.keys(componentTree);
    return rootKeys.length;
  }

  identifyArchitecturalPatterns(result) {
    const patterns = [];
    
    // Check for container/presentational pattern
    const components = result.components || {};
    const containers = Object.values(components).filter(c => 
      c.apiCalls?.length > 0 && c.children?.length > 0
    );
    
    if (containers.length > 0) {
      patterns.push('Container/Presentational');
    }
    
    // Check for compound components
    const compoundComponents = Object.entries(components).filter(([name, comp]) =>
      comp.children?.some(child => child.startsWith(name))
    );
    
    if (compoundComponents.length > 0) {
      patterns.push('Compound Components');
    }
    
    // Check for render props
    const renderPropsComponents = Object.values(components).filter(c =>
      Object.keys(c.props || {}).some(prop => prop.includes('render') || prop.includes('children'))
    );
    
    if (renderPropsComponents.length > 0) {
      patterns.push('Render Props');
    }
    
    return patterns;
  }

  assessCoupling(result) {
    const components = result.components || {};
    const totalComponents = Object.keys(components).length;
    
    if (totalComponents === 0) return 'unknown';
    
    let totalDependencies = 0;
    
    Object.values(components).forEach(comp => {
      totalDependencies += (comp.dependencies?.components?.length || 0);
    });
    
    const averageCoupling = totalDependencies / totalComponents;
    
    if (averageCoupling < 2) return 'low';
    if (averageCoupling < 5) return 'medium';
    return 'high';
  }

  assessCohesion(result) {
    // Simple cohesion assessment based on single responsibility
    const components = result.components || {};
    
    let highCohesionCount = 0;
    
    Object.values(components).forEach(comp => {
      const responsibilities = this.countResponsibilities(comp);
      
      if (responsibilities <= 2) {
        highCohesionCount++;
      }
    });
    
    const totalComponents = Object.keys(components).length;
    const cohesionRatio = totalComponents > 0 ? highCohesionCount / totalComponents : 0;
    
    if (cohesionRatio > 0.8) return 'high';
    if (cohesionRatio > 0.5) return 'medium';
    return 'low';
  }

  countResponsibilities(component) {
    let responsibilities = 0;
    
    // Data fetching
    if (component.apiCalls?.length > 0) responsibilities++;
    
    // State management
    if (component.state?.local?.length > 0 || component.state?.global?.length > 0) {
      responsibilities++;
    }
    
    // UI rendering (always present)
    responsibilities++;
    
    // Event handling
    if (component.events?.emitted?.length > 0 || component.events?.handled?.length > 0) {
      responsibilities++;
    }
    
    return responsibilities;
  }

  enhancePerformanceAnalysis(result) {
    const components = result.components || {};
    const analysis = {
      totalIssues: 0,
      categories: {
        rerendering: 0,
        heavyOperations: 0,
        memoryLeaks: 0,
        bundleSize: 0
      },
      optimizationOpportunities: []
    };

    Object.entries(components).forEach(([name, comp]) => {
      // Check for re-rendering issues
      if (comp.performance?.rerendersRisk === 'high') {
        analysis.categories.rerendering++;
        analysis.optimizationOpportunities.push({
          component: name,
          type: 'memoization',
          description: 'Consider using React.memo or useMemo'
        });
      }
      
      // Check for heavy operations
      if (comp.performance?.heavyOperations?.length > 0) {
        analysis.categories.heavyOperations++;
        analysis.optimizationOpportunities.push({
          component: name,
          type: 'computation',
          description: 'Move heavy computations to web workers or optimize algorithms'
        });
      }
      
      // Check for potential memory leaks
      if (comp.apiCalls?.some(call => call.trigger === 'useEffect')) {
        analysis.categories.memoryLeaks++;
      }
    });

    analysis.totalIssues = Object.values(analysis.categories).reduce((sum, count) => sum + count, 0);

    return analysis;
  }

  generateRecommendations(result) {
    const recommendations = [];

    // Unused components
    if (result.unusedComponents?.length > 0) {
      recommendations.push({
        priority: 'low',
        category: 'maintenance',
        title: 'Remove Unused Components',
        description: `Clean up ${result.unusedComponents.length} unused components to reduce bundle size`
      });
    }

    // Circular dependencies
    if (result.circularDependencies?.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'architecture',
        title: 'Fix Circular Dependencies',
        description: `Resolve ${result.circularDependencies.length} circular dependencies that can cause runtime issues`
      });
    }

    // Prop drilling
    const deepPropDrilling = result.propDrilling?.filter(pd => pd.depth > 3) || [];
    if (deepPropDrilling.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'architecture',
        title: 'Address Prop Drilling',
        description: `Consider context or state management for ${deepPropDrilling.length} deep prop chains`
      });
    }

    // Performance issues
    const components = result.components || {};
    const highRerenderRisk = Object.values(components).filter(c => 
      c.performance?.rerendersRisk === 'high'
    ).length;
    
    if (highRerenderRisk > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        title: 'Optimize Component Rendering',
        description: `${highRerenderRisk} components have high re-render risk. Consider memoization.`
      });
    }

    return recommendations;
  }
}

module.exports = ComponentAnalyzer;