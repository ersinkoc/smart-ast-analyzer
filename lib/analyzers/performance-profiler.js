const fs = require('fs').promises;
const path = require('path');

class PerformanceProfiler {
  constructor(framework, options = {}) {
    this.framework = framework;
    this.options = options;
    this.performancePatterns = this.loadPerformancePatterns();
    this.bundleAnalyzer = new BundleAnalyzer();
    this.runtimeAnalyzer = new RuntimeAnalyzer();
    this.memoryAnalyzer = new MemoryAnalyzer();
  }

  async profile(aiResult, files, projectInfo) {
    if (!aiResult || aiResult.error) {
      return this.createEmptyResult(aiResult?.error);
    }

    const profile = {
      ...aiResult,
      metadata: this.generateMetadata(files, projectInfo),
      bundleAnalysis: await this.bundleAnalyzer.analyze(files, projectInfo),
      runtimeAnalysis: await this.runtimeAnalyzer.analyze(files, this.framework),
      memoryAnalysis: await this.memoryAnalyzer.analyze(files, this.framework),
      performanceMetrics: this.calculatePerformanceMetrics(aiResult, files),
      bottlenecks: this.identifyBottlenecks(aiResult, files),
      optimizationOpportunities: this.findOptimizationOpportunities(aiResult, files),
      performanceScore: this.calculatePerformanceScore(aiResult),
      recommendations: this.generatePerformanceRecommendations(aiResult, files)
    };

    return profile;
  }

  createEmptyResult(error) {
    return {
      bundle: { estimatedSize: 'unknown', largeDependencies: [], codeSplitting: [] },
      rendering: { heavyComponents: [], unnecessaryRenders: [] },
      api: { slowEndpoints: [], overfetching: [] },
      memory: { potentialLeaks: [] },
      optimization: { immediate: [], shortTerm: [], longTerm: [] },
      metrics: { complexity: 'unknown', maintainability: 'unknown', performance: 'unknown' },
      performanceScore: 0,
      metadata: {
        analysisDate: new Date().toISOString(),
        framework: this.framework,
        error: error
      },
      recommendations: [
        'Performance analysis could not be performed',
        'Check if your project has performance-critical files',
        'Verify that the analysis service is working correctly'
      ]
    };
  }

  generateMetadata(files, projectInfo) {
    return {
      totalFiles: files.length,
      analysisDate: new Date().toISOString(),
      framework: this.framework,
      projectSize: this.calculateProjectSize(files),
      complexity: this.estimateComplexity(files),
      dependencies: projectInfo.dependencies?.total || 0,
      analysisScope: this.determineAnalysisScope(files)
    };
  }

  calculateProjectSize(files) {
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    const totalLines = files.reduce((sum, file) => sum + (file.lines || 0), 0);
    
    return {
      bytes: totalSize,
      lines: totalLines,
      files: files.length,
      avgFileSize: files.length > 0 ? Math.round(totalSize / files.length) : 0,
      avgLinesPerFile: files.length > 0 ? Math.round(totalLines / files.length) : 0
    };
  }

  estimateComplexity(files) {
    let complexityScore = 0;
    
    files.forEach(file => {
      const content = file.content.toLowerCase();
      
      // Count complexity indicators
      const indicators = {
        loops: (content.match(/for\s*\(|while\s*\(|\.map\s*\(|\.forEach\s*\(/g) || []).length,
        conditionals: (content.match(/if\s*\(|switch\s*\(|\?\s*:/g) || []).length,
        functions: (content.match(/function\s+\w+|=>\s*\{|async\s+/g) || []).length,
        classes: (content.match(/class\s+\w+|\.prototype\./g) || []).length,
        promises: (content.match(/\.then\s*\(|await\s+|Promise\./g) || []).length,
        callbacks: (content.match(/callback|cb\s*\(|\)\s*=>/g) || []).length
      };
      
      complexityScore += indicators.loops * 3;
      complexityScore += indicators.conditionals * 2;
      complexityScore += indicators.functions * 2;
      complexityScore += indicators.classes * 4;
      complexityScore += indicators.promises * 3;
      complexityScore += indicators.callbacks * 3;
    });
    
    if (complexityScore < 15) return 'low';
    if (complexityScore < 25) return 'medium';
    return 'high';
  }

  determineAnalysisScope(files) {
    const scopes = {
      frontend: files.filter(f => 
        f.path.includes('component') || 
        f.path.includes('src') || 
        f.extension === '.jsx' || 
        f.extension === '.tsx'
      ).length,
      backend: files.filter(f => 
        f.path.includes('api') || 
        f.path.includes('server') || 
        f.path.includes('route')
      ).length,
      fullstack: 0
    };
    
    scopes.fullstack = scopes.frontend > 0 && scopes.backend > 0;
    
    if (scopes.fullstack) return 'fullstack';
    if (scopes.frontend > scopes.backend) return 'frontend';
    if (scopes.backend > 0) return 'backend';
    return 'unknown';
  }

  calculatePerformanceMetrics(aiResult, files) {
    const metrics = {
      loadTime: this.estimateLoadTime(files),
      bundleSize: this.estimateBundleSize(files),
      renderTime: this.estimateRenderTime(aiResult),
      apiResponseTime: this.estimateAPIResponseTime(aiResult),
      memoryUsage: this.estimateMemoryUsage(files),
      cacheEfficiency: this.assessCacheEfficiency(files),
      optimizationLevel: this.assessOptimizationLevel(aiResult)
    };
    
    return metrics;
  }

  estimateLoadTime(files) {
    // Simplified load time estimation based on file sizes and count
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    const jsFiles = files.filter(f => f.extension === '.js' || f.extension === '.jsx').length;
    const cssFiles = files.filter(f => f.extension === '.css' || f.extension === '.scss').length;
    
    // Rough estimation: 1KB = 10ms load time
    const baseLoadTime = Math.round(totalSize / 100); // Convert bytes to approximate ms
    const additionalTime = jsFiles * 50 + cssFiles * 30; // Overhead per file
    
    const estimatedTime = baseLoadTime + additionalTime;
    
    return {
      estimated: `${estimatedTime}ms`,
      category: estimatedTime < 1000 ? 'fast' : estimatedTime < 3000 ? 'moderate' : 'slow',
      factors: {
        totalSize: `${Math.round(totalSize / 1024)}KB`,
        jsFiles: jsFiles,
        cssFiles: cssFiles
      }
    };
  }

  estimateBundleSize(files) {
    const jsFiles = files.filter(f => ['.js', '.jsx', '.ts', '.tsx'].includes(f.extension));
    const totalJSSize = jsFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    
    // Estimate minified size (roughly 70% of original)
    const estimatedMinified = Math.round(totalJSSize * 0.7);
    
    // Estimate gzipped size (roughly 30% of minified)
    const estimatedGzipped = Math.round(estimatedMinified * 0.3);
    
    return {
      raw: `${Math.round(totalJSSize / 1024)}KB`,
      minified: `${Math.round(estimatedMinified / 1024)}KB`,
      gzipped: `${Math.round(estimatedGzipped / 1024)}KB`,
      category: estimatedGzipped < 50000 ? 'small' : estimatedGzipped < 200000 ? 'medium' : 'large'
    };
  }

  estimateRenderTime(aiResult) {
    // Estimate based on component complexity
    const components = aiResult.rendering?.heavyComponents || [];
    const renderTime = components.length * 16; // Assume 16ms per complex component
    
    return {
      estimated: `${renderTime}ms`,
      category: renderTime < 16 ? 'fast' : renderTime < 50 ? 'moderate' : 'slow',
      heavyComponents: components.length
    };
  }

  estimateAPIResponseTime(aiResult) {
    const slowEndpoints = aiResult.api?.slowEndpoints || [];
    const avgResponseTime = slowEndpoints.length > 0 ? 200 + (slowEndpoints.length * 50) : 100;
    
    return {
      estimated: `${avgResponseTime}ms`,
      category: avgResponseTime < 200 ? 'fast' : avgResponseTime < 500 ? 'moderate' : 'slow',
      slowEndpoints: slowEndpoints.length
    };
  }

  estimateMemoryUsage(files) {
    // Rough memory usage estimation
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    const estimatedMemory = totalSize * 2; // Assume 2x file size in memory
    
    return {
      estimated: `${Math.round(estimatedMemory / 1024)}KB`,
      category: estimatedMemory < 1024000 ? 'low' : estimatedMemory < 5120000 ? 'moderate' : 'high',
      factors: ['File parsing', 'DOM manipulation', 'Event listeners']
    };
  }

  assessCacheEfficiency(files) {
    // Look for caching patterns
    let cacheScore = 30; // Start with lower score to represent poor caching by default
    
    files.forEach(file => {
      const content = file.content.toLowerCase();
      
      if (content.includes('cache') || content.includes('memoiz')) cacheScore += 15;
      if (content.includes('usememo') || content.includes('usecallback')) cacheScore += 20;
      if (content.includes('react.memo')) cacheScore += 15;
      if (content.includes('service worker') || content.includes('sw.js')) cacheScore += 30;
    });
    
    return {
      score: Math.min(100, cacheScore),
      level: cacheScore < 50 ? 'poor' : cacheScore < 75 ? 'moderate' : 'good',
      recommendations: cacheScore < 75 ? ['Implement component memoization', 'Add service worker caching'] : []
    };
  }

  assessOptimizationLevel(aiResult) {
    let score = 0;
    let total = 0;
    
    // Check various optimization indicators
    if (aiResult.bundle?.codeSplitting?.length > 0) {
      score += 20;
      total += 20;
    } else {
      total += 20;
    }
    
    if (aiResult.rendering?.unnecessaryRenders?.length === 0) {
      score += 15;
    }
    total += 15;
    
    if (aiResult.memory?.potentialLeaks?.length === 0) {
      score += 15;
    }
    total += 15;
    
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    
    return {
      score: percentage,
      level: percentage < 40 ? 'poor' : percentage < 70 ? 'moderate' : 'good',
      optimizations: {
        codeSplitting: aiResult.bundle?.codeSplitting?.length > 0,
        memoization: aiResult.rendering?.unnecessaryRenders?.length === 0,
        memoryManagement: aiResult.memory?.potentialLeaks?.length === 0
      }
    };
  }

  identifyBottlenecks(aiResult, files) {
    const bottlenecks = [];
    
    // Bundle size bottlenecks
    if (aiResult.bundle?.largeDependencies?.length > 0) {
      bottlenecks.push({
        type: 'Bundle Size',
        severity: 'high',
        description: `${aiResult.bundle.largeDependencies.length} large dependencies affecting load time`,
        impact: 'Load Performance',
        location: 'Dependencies',
        solution: 'Code splitting and tree shaking'
      });
    }
    
    // Rendering bottlenecks
    const heavyComponents = aiResult.rendering?.heavyComponents || [];
    if (heavyComponents.length > 0) {
      bottlenecks.push({
        type: 'Rendering Performance',
        severity: 'medium',
        description: `${heavyComponents.length} components causing render performance issues`,
        impact: 'User Experience',
        location: heavyComponents.map(c => c.name).join(', '),
        solution: 'Component memoization and virtualization'
      });
    }
    
    // API bottlenecks
    const slowEndpoints = aiResult.api?.slowEndpoints || [];
    if (slowEndpoints.length > 0) {
      bottlenecks.push({
        type: 'API Performance',
        severity: 'high',
        description: `${slowEndpoints.length} slow API endpoints`,
        impact: 'Data Loading',
        location: slowEndpoints.map(e => e.endpoint).join(', '),
        solution: 'Query optimization and caching'
      });
    }
    
    // Memory bottlenecks
    const memoryLeaks = aiResult.memory?.potentialLeaks || [];
    if (memoryLeaks.length > 0) {
      bottlenecks.push({
        type: 'Memory Usage',
        severity: 'medium',
        description: `${memoryLeaks.length} potential memory leaks detected`,
        impact: 'Long-term Performance',
        location: memoryLeaks.map(l => l.file).join(', '),
        solution: 'Proper cleanup and event listener removal'
      });
    }
    
    return bottlenecks;
  }

  findOptimizationOpportunities(aiResult, files) {
    const opportunities = {
      immediate: [],
      shortTerm: [],
      longTerm: []
    };
    
    // Immediate optimizations
    const unusedCode = this.findUnusedCode(files);
    if (unusedCode.length > 0) {
      opportunities.immediate.push({
        type: 'Dead Code Elimination',
        description: `Remove ${unusedCode.length} unused functions/components`,
        impact: 'Bundle Size Reduction',
        effort: 'low',
        files: unusedCode
      });
    }
    
    // Short-term optimizations
    if (aiResult.bundle?.codeSplitting?.length === 0) {
      opportunities.shortTerm.push({
        type: 'Code Splitting',
        description: 'Implement route-based and component-based code splitting',
        impact: 'Faster Initial Load',
        effort: 'medium',
        examples: ['React.lazy()', 'Dynamic imports', 'Webpack chunks']
      });
    }
    
    const unmemoizedComponents = this.findUnmemoizedComponents(aiResult);
    if (unmemoizedComponents.length > 0) {
      opportunities.shortTerm.push({
        type: 'Component Memoization',
        description: `Add memoization to ${unmemoizedComponents.length} components`,
        impact: 'Render Performance',
        effort: 'medium',
        components: unmemoizedComponents
      });
    }
    
    // Long-term optimizations
    opportunities.longTerm.push({
      type: 'Service Worker Implementation',
      description: 'Add service worker for caching and offline functionality',
      impact: 'Load Performance & User Experience',
      effort: 'high',
      benefits: ['Asset caching', 'API response caching', 'Offline functionality']
    });
    
    if (this.framework === 'react' || this.framework === 'nextjs') {
      opportunities.longTerm.push({
        type: 'Server-Side Rendering Optimization',
        description: 'Optimize SSR/SSG for better initial load performance',
        impact: 'First Contentful Paint',
        effort: 'high',
        techniques: ['Static generation', 'Incremental regeneration', 'Edge caching']
      });
    }
    
    return opportunities;
  }

  findUnusedCode(files) {
    const unused = [];
    
    files.forEach(file => {
      const content = file.content;
      
      // Find all function declarations using a more comprehensive regex
      const functionDeclarations = [];
      const functionMatches = content.match(/\bfunction\s+(\w+)/g);
      
      if (functionMatches) {
        functionMatches.forEach((match, matchIndex) => {
          const functionNameMatch = match.match(/function\s+(\w+)/);
          if (functionNameMatch) {
            const functionName = functionNameMatch[1];
            
            // Count function calls (but exclude the declaration itself)
            const callRegex = new RegExp(`\\b${functionName}\\s*\\(`, 'g');
            const allMatches = content.match(callRegex) || [];
            
            // Subtract 1 to exclude the declaration itself (function unused() contains "unused(")
            const actualCalls = allMatches.length - (content.includes(`function ${functionName}(`) ? 1 : 0);
            
            if (actualCalls === 0) {
              unused.push({
                type: 'function',
                name: functionName,
                file: file.path,
                line: matchIndex + 1 // Approximate line number
              });
            }
          }
        });
      }
    });
    
    return unused.slice(0, 10);
  }

  findUnmemoizedComponents(aiResult) {
    const unmemoized = [];
    
    if (aiResult.rendering?.heavyComponents) {
      aiResult.rendering.heavyComponents.forEach(comp => {
        if (!comp.performance?.memoized) {
          unmemoized.push(comp.name);
        }
      });
    }
    
    return unmemoized;
  }

  calculatePerformanceScore(aiResult) {
    let score = 100;
    
    // Deduct for bundle issues
    const largeDeps = aiResult.bundle?.largeDependencies?.length || 0;
    score -= largeDeps * 5;
    
    // Deduct for rendering issues
    const heavyComponents = aiResult.rendering?.heavyComponents?.length || 0;
    score -= heavyComponents * 10;
    
    // Deduct for API issues
    const slowEndpoints = aiResult.api?.slowEndpoints?.length || 0;
    score -= slowEndpoints * 15;
    
    // Deduct for memory issues
    const memoryLeaks = aiResult.memory?.potentialLeaks?.length || 0;
    score -= memoryLeaks * 8;
    
    // Add points for optimizations
    if (aiResult.bundle?.codeSplitting?.length > 0) score += 10;
    if (aiResult.optimization?.immediate?.length === 0) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  generatePerformanceRecommendations(aiResult, files) {
    const recommendations = [];
    
    const performanceScore = this.calculatePerformanceScore(aiResult);
    
    // Overall performance recommendations
    if (performanceScore < 50) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        title: 'Critical Performance Issues Detected',
        description: `Performance score is ${performanceScore}/100. Immediate optimization needed.`,
        actions: ['Bundle size optimization', 'Component performance audit', 'API response optimization']
      });
    }
    
    // Bundle size recommendations
    const largeDeps = aiResult.bundle?.largeDependencies || [];
    if (largeDeps.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'bundle',
        title: 'Optimize Bundle Size',
        description: `${largeDeps.length} large dependencies detected. Consider alternatives or code splitting.`,
        packages: largeDeps.map(dep => dep.name)
      });
    }
    
    // Rendering recommendations
    const heavyComponents = aiResult.rendering?.heavyComponents || [];
    if (heavyComponents.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'rendering',
        title: 'Optimize Component Performance',
        description: `${heavyComponents.length} components need performance optimization.`,
        techniques: ['React.memo', 'useMemo', 'useCallback', 'Component splitting']
      });
    }
    
    // Code splitting recommendations
    if (!aiResult.bundle?.codeSplitting?.length) {
      recommendations.push({
        priority: 'medium',
        category: 'optimization',
        title: 'Implement Code Splitting',
        description: 'Break down the bundle into smaller chunks for faster loading.',
        implementation: this.framework === 'react' ? 'Use React.lazy() and Suspense' : 'Dynamic imports'
      });
    }
    
    // Memory optimization recommendations
    const memoryLeaks = aiResult.memory?.potentialLeaks || [];
    if (memoryLeaks.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'memory',
        title: 'Fix Memory Leaks',
        description: `${memoryLeaks.length} potential memory leaks detected.`,
        solutions: ['Cleanup event listeners', 'Cancel async operations', 'Clear intervals/timeouts']
      });
    }
    
    return recommendations;
  }

  loadPerformancePatterns() {
    return {
      antiPatterns: [
        'document.write',
        'eval(',
        'with(',
        'innerHTML +=',
        'sync XMLHttpRequest',
        'blocking CSS',
        'render-blocking JavaScript'
      ],
      optimizationPatterns: [
        'React.memo',
        'useMemo',
        'useCallback',
        'lazy loading',
        'code splitting',
        'service worker',
        'intersection observer'
      ]
    };
  }
}

// Helper classes for specific analysis types
class BundleAnalyzer {
  async analyze(files, projectInfo) {
    const jsFiles = files.filter(f => ['.js', '.jsx', '.ts', '.tsx'].includes(f.extension));
    const totalSize = jsFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    
    return {
      totalSize: `${Math.round(totalSize / 1024)}KB`,
      fileCount: jsFiles.length,
      largeDependencies: this.findLargeDependencies(projectInfo),
      codeSplitting: this.assessCodeSplitting(files),
      treeShakingt: this.assessTreeShaking(files)
    };
  }
  
  findLargeDependencies(projectInfo) {
    const knownLarge = ['react', 'vue', 'angular', 'lodash', 'moment', 'd3', 'three'];
    const dependencies = Object.keys(projectInfo.dependencies?.dependencies || {});
    
    return dependencies
      .filter(dep => knownLarge.includes(dep))
      .map(dep => ({
        name: dep,
        estimatedSize: this.estimatePackageSize(dep),
        alternatives: this.suggestAlternatives(dep)
      }));
  }
  
  estimatePackageSize(packageName) {
    const sizes = {
      'react': '42KB',
      'vue': '32KB',
      'angular': '130KB',
      'lodash': '70KB',
      'moment': '67KB',
      'd3': '250KB',
      'three': '580KB'
    };
    return sizes[packageName] || 'Unknown';
  }
  
  suggestAlternatives(packageName) {
    const alternatives = {
      'lodash': ['Native ES6 methods', 'lodash-es'],
      'moment': ['date-fns', 'dayjs'],
      'three': ['babylonjs (if compatible)']
    };
    return alternatives[packageName] || [];
  }
  
  assessCodeSplitting(files) {
    const splittingIndicators = [];
    
    files.forEach(file => {
      const content = file.content;
      
      // Check for React.lazy
      if (content.includes('React.lazy')) {
        splittingIndicators.push({
          file: file.path,
          type: 'React.lazy'
        });
      }
      
      // Check for dynamic imports (excluding React.lazy import)
      const dynamicImportRegex = /import\s*\(/g;
      const lazyImportRegex = /React\.lazy\s*\(\s*\(\s*\)\s*=>\s*import\s*\(/g;
      const dynamicImports = (content.match(dynamicImportRegex) || []).length;
      const lazyImports = (content.match(lazyImportRegex) || []).length;
      
      if (dynamicImports > lazyImports) {
        splittingIndicators.push({
          file: file.path,
          type: 'Dynamic import'
        });
      }
      
      // Check for loadable components
      if (content.includes('loadable')) {
        splittingIndicators.push({
          file: file.path,
          type: 'Loadable components'
        });
      }
    });
    
    return splittingIndicators;
  }
  
  detectSplittingType(content) {
    if (content.includes('React.lazy')) return 'React.lazy';
    if (content.includes('import(')) return 'Dynamic import';
    if (content.includes('loadable')) return 'Loadable components';
    return 'Unknown';
  }
  
  assessTreeShaking(files) {
    // Simple tree shaking assessment
    const moduleImports = files.filter(file =>
      file.content.includes('import {') ||
      file.content.includes('from ')
    ).length;
    
    const wildcardImports = files.filter(file =>
      file.content.includes('import *')
    ).length;
    
    return {
      moduleImports,
      wildcardImports,
      efficiency: wildcardImports === 0 ? 'good' : 'needs improvement'
    };
  }
}

class RuntimeAnalyzer {
  async analyze(files, framework) {
    return {
      renderingPatterns: this.analyzeRenderingPatterns(files, framework),
      eventHandlers: this.analyzeEventHandlers(files),
      asyncOperations: this.analyzeAsyncOperations(files),
      domManipulation: this.analyzeDOMManipulation(files)
    };
  }
  
  analyzeRenderingPatterns(files, framework) {
    const patterns = {
      react: this.analyzeReactRendering(files),
      vue: this.analyzeVueRendering(files),
      angular: this.analyzeAngularRendering(files)
    };
    
    return patterns[framework] || {};
  }
  
  analyzeReactRendering(files) {
    const reactFiles = files.filter(f => 
      f.extension === '.jsx' || f.extension === '.tsx' ||
      f.content.includes('import React')
    );
    
    return {
      components: reactFiles.length,
      memoizedComponents: reactFiles.filter(f => f.content.includes('React.memo')).length,
      hooksUsage: reactFiles.filter(f => f.content.includes('use')).length,
      unnecessaryRenders: this.findUnnecessaryRenders(reactFiles)
    };
  }
  
  findUnnecessaryRenders(files) {
    const issues = [];
    
    files.forEach(file => {
      const lines = file.content.split('\n');
      lines.forEach((line, index) => {
        // Look for potential unnecessary render triggers
        if (line.includes('setState') && line.includes('prevState')) {
          issues.push({
            file: file.path,
            line: index + 1,
            issue: 'Potential unnecessary state update',
            suggestion: 'Check if state actually changes'
          });
        }
      });
    });
    
    return issues;
  }
  
  analyzeVueRendering(files) {
    // Vue-specific rendering analysis
    return {};
  }
  
  analyzeAngularRendering(files) {
    // Angular-specific rendering analysis
    return {};
  }
  
  analyzeEventHandlers(files) {
    let handlerCount = 0;
    let cleanupCount = 0;
    
    files.forEach(file => {
      handlerCount += (file.content.match(/addEventListener|onClick|onSubmit/g) || []).length;
      cleanupCount += (file.content.match(/removeEventListener|cleanup|unmount/g) || []).length;
    });
    
    return {
      totalHandlers: handlerCount,
      withCleanup: cleanupCount,
      cleanupRatio: handlerCount > 0 ? Math.round((cleanupCount / handlerCount) * 100) : 0
    };
  }
  
  analyzeAsyncOperations(files) {
    let promiseCount = 0;
    let errorHandlingCount = 0;
    
    files.forEach(file => {
      promiseCount += (file.content.match(/async|await|\.then\(|Promise\./g) || []).length;
      errorHandlingCount += (file.content.match(/catch\(|try\s*\{|\\.catch\(/g) || []).length;
    });
    
    return {
      totalAsync: promiseCount,
      withErrorHandling: errorHandlingCount,
      errorHandlingRatio: promiseCount > 0 ? Math.round((errorHandlingCount / promiseCount) * 100) : 0
    };
  }
  
  analyzeDOMManipulation(files) {
    let manipulationCount = 0;
    let directManipulation = 0;
    
    files.forEach(file => {
      manipulationCount += (file.content.match(/querySelector|getElementById|innerHTML|appendChild/g) || []).length;
      directManipulation += (file.content.match(/document\.|window\./g) || []).length;
    });
    
    return {
      totalManipulation: manipulationCount,
      directManipulation: directManipulation,
      recommendation: directManipulation > 0 ? 'Consider using framework patterns instead of direct DOM manipulation' : null
    };
  }
}

class MemoryAnalyzer {
  async analyze(files, framework) {
    return {
      potentialLeaks: this.findPotentialLeaks(files),
      memoryPatterns: this.analyzeMemoryPatterns(files),
      garbageCollection: this.analyzeGCPatterns(files),
      recommendations: this.generateMemoryRecommendations(files)
    };
  }
  
  findPotentialLeaks(files) {
    const leaks = [];
    
    files.forEach(file => {
      const lines = file.content.split('\n');
      
      lines.forEach((line, index) => {
        // Look for common memory leak patterns
        if (line.includes('setInterval') && !file.content.includes('clearInterval')) {
          leaks.push({
            type: 'interval',
            file: file.path,
            line: index + 1,
            description: 'setInterval without clearInterval',
            solution: 'Add clearInterval in cleanup'
          });
        }
        
        if (line.includes('setTimeout') && !file.content.includes('clearTimeout')) {
          leaks.push({
            type: 'timeout',
            file: file.path,
            line: index + 1,
            description: 'setTimeout without clearTimeout in cleanup',
            solution: 'Clear timeout in component cleanup'
          });
        }
        
        if (line.includes('addEventListener') && !file.content.includes('removeEventListener')) {
          leaks.push({
            type: 'event',
            file: file.path,
            line: index + 1,
            description: 'Event listener without cleanup',
            solution: 'Remove event listeners in cleanup'
          });
        }
      });
    });
    
    return leaks;
  }
  
  analyzeMemoryPatterns(files) {
    return {
      closures: this.countClosures(files),
      circularReferences: this.findCircularReferences(files),
      largeObjects: this.findLargeObjects(files)
    };
  }
  
  countClosures(files) {
    let closureCount = 0;
    
    files.forEach(file => {
      const content = file.content;
      
      // Count nested functions (function within function)
      const nestedFunctions = (content.match(/function[^{]*{[^}]*function/g) || []).length;
      
      // Count nested arrow functions (=> within =>)
      const nestedArrows = (content.match(/=>[^}]*=>/g) || []).length;
      
      // Count returns of functions/arrows
      const returnedFunctions = (content.match(/return\s+(function|\(\)\s*=>|.*=>)/g) || []).length;
      
      closureCount += nestedFunctions + nestedArrows + returnedFunctions;
    });
    
    return {
      count: closureCount,
      risk: closureCount > 20 ? 'high' : closureCount > 10 ? 'medium' : 'low'
    };
  }
  
  findCircularReferences(files) {
    // Simplified circular reference detection
    const references = [];
    
    files.forEach(file => {
      if (file.content.includes('this.') && file.content.includes('parent')) {
        references.push({
          file: file.path,
          type: 'parent-child reference',
          risk: 'medium'
        });
      }
    });
    
    return references;
  }
  
  findLargeObjects(files) {
    const largeObjects = [];
    
    files.forEach(file => {
      const lines = file.content.split('\n');
      
      lines.forEach((line, index) => {
        if (line.includes('new Array(') || line.includes('Array.from')) {
          const sizeMatch = line.match(/\d+/);
          if (sizeMatch && parseInt(sizeMatch[0]) > 1000) {
            largeObjects.push({
              file: file.path,
              line: index + 1,
              type: 'large array',
              size: sizeMatch[0]
            });
          }
        }
      });
    });
    
    return largeObjects;
  }
  
  analyzeGCPatterns(files) {
    return {
      explicitCleanup: files.filter(f => 
        f.content.includes('cleanup') || 
        f.content.includes('dispose') ||
        f.content.includes('destroy')
      ).length,
      recommendation: 'Implement explicit cleanup in component lifecycle methods'
    };
  }
  
  generateMemoryRecommendations(files) {
    const recommendations = [];
    
    const leaks = this.findPotentialLeaks(files);
    if (leaks.length > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Fix Memory Leaks',
        description: `${leaks.length} potential memory leaks detected`,
        actions: ['Add proper cleanup', 'Remove event listeners', 'Clear intervals/timeouts']
      });
    }
    
    const patterns = this.analyzeMemoryPatterns(files);
    if (patterns.closures.risk === 'high') {
      recommendations.push({
        priority: 'medium',
        title: 'Optimize Closure Usage',
        description: 'High number of closures may impact memory usage',
        actions: ['Review closure necessity', 'Use WeakMap for private data']
      });
    }
    
    return recommendations;
  }
}

module.exports = PerformanceProfiler;