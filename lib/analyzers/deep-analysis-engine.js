const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const path = require('path');
const fs = require('fs').promises;

class DeepAnalysisEngine {
  constructor(options = {}) {
    this.options = options;
    this.analysisResults = {
      complexity: {},
      dependencies: {},
      security: {},
      performance: {},
      quality: {},
      patterns: {},
      architecture: {}
    };
  }

  async analyzeProject(files) {
    console.log(`🔬 Starting deep analysis of ${files.length} files...`);
    
    const analyses = await Promise.all([
      this.analyzeComplexity(files),
      this.analyzeDependencies(files),
      this.analyzeSecurityVulnerabilities(files),
      this.analyzePerformanceBottlenecks(files),
      this.analyzeCodeQuality(files),
      this.analyzeArchitecturalPatterns(files),
      this.analyzeDatabaseUsage(files)
    ]);

    // Merge all analyses
    const [complexity, dependencies, security, performance, quality, patterns, database] = analyses;
    
    return {
      complexity,
      dependencies,
      security,
      performance,
      quality,
      patterns,
      database,
      summary: this.generateSummary(analyses),
      recommendations: this.generateRecommendations(analyses)
    };
  }

  async analyzeComplexity(files) {
    const complexity = {
      cyclomatic: {},
      cognitive: {},
      nesting: {},
      functions: [],
      classes: [],
      overall: { score: 0, rating: 'unknown' }
    };

    for (const file of files) {
      if (!this.isJavaScriptFile(file.path)) continue;
      
      try {
        const ast = await this.parseFile(file.content);
        const fileComplexity = this.calculateFileComplexity(ast, file.path);
        
        complexity.cyclomatic[file.path] = fileComplexity.cyclomatic;
        complexity.cognitive[file.path] = fileComplexity.cognitive;
        complexity.nesting[file.path] = fileComplexity.maxNesting;
        complexity.functions.push(...fileComplexity.functions);
        complexity.classes.push(...fileComplexity.classes);
      } catch (error) {
        console.warn(`Complexity analysis failed for ${file.path}:`, error.message);
      }
    }

    complexity.overall = this.calculateOverallComplexity(complexity);
    return complexity;
  }

  calculateFileComplexity(ast, filePath) {
    const result = {
      cyclomatic: 0,
      cognitive: 0,
      maxNesting: 0,
      functions: [],
      classes: []
    };

    const self = this;
    
    traverse(ast, {
      Function(path) {
        const complexity = self.calculateFunctionComplexity(path);
        result.functions.push({
          name: self.getFunctionName(path),
          file: filePath,
          line: path.node.loc?.start.line || 1,
          cyclomatic: complexity.cyclomatic,
          cognitive: complexity.cognitive,
          nesting: complexity.maxNesting,
          params: path.node.params.length,
          lines: self.calculateLinesOfCode(path),
          warnings: self.generateComplexityWarnings(complexity)
        });
        
        result.cyclomatic += complexity.cyclomatic;
        result.cognitive += complexity.cognitive;
        result.maxNesting = Math.max(result.maxNesting, complexity.maxNesting);
      },

      ClassDeclaration(path) {
        const classComplexity = self.calculateClassComplexity(path);
        result.classes.push({
          name: path.node.id.name,
          file: filePath,
          line: path.node.loc?.start.line || 1,
          methods: classComplexity.methods,
          properties: classComplexity.properties,
          complexity: classComplexity.totalComplexity,
          cohesion: self.calculateCohesion(path),
          warnings: classComplexity.warnings
        });
      }
    });

    return result;
  }

  calculateFunctionComplexity(path) {
    let cyclomatic = 1; // Base complexity
    let cognitive = 0;
    let maxNesting = 0;
    let currentNesting = 0;

    path.traverse({
      enter(innerPath) {
        // Cyclomatic complexity
        if (t.isIfStatement(innerPath.node) ||
            t.isWhileStatement(innerPath.node) ||
            t.isForStatement(innerPath.node) ||
            t.isForInStatement(innerPath.node) ||
            t.isForOfStatement(innerPath.node) ||
            t.isSwitchCase(innerPath.node) ||
            t.isCatchClause(innerPath.node) ||
            t.isConditionalExpression(innerPath.node) ||
            t.isLogicalExpression(innerPath.node)) {
          cyclomatic++;
        }

        // Cognitive complexity
        if (t.isIfStatement(innerPath.node) ||
            t.isSwitchStatement(innerPath.node) ||
            t.isWhileStatement(innerPath.node) ||
            t.isForStatement(innerPath.node) ||
            t.isForInStatement(innerPath.node) ||
            t.isForOfStatement(innerPath.node) ||
            t.isCatchClause(innerPath.node)) {
          cognitive += (1 + currentNesting);
          currentNesting++;
        }

        maxNesting = Math.max(maxNesting, currentNesting);
      },

      exit(innerPath) {
        if (t.isIfStatement(innerPath.node) ||
            t.isSwitchStatement(innerPath.node) ||
            t.isWhileStatement(innerPath.node) ||
            t.isForStatement(innerPath.node) ||
            t.isForInStatement(innerPath.node) ||
            t.isForOfStatement(innerPath.node) ||
            t.isCatchClause(innerPath.node)) {
          currentNesting--;
        }
      }
    });

    return { cyclomatic, cognitive, maxNesting };
  }

  async analyzeDependencies(files) {
    const dependencies = {
      imports: new Map(),
      exports: new Map(),
      graph: {},
      cycles: [],
      unused: [],
      external: new Set(),
      internal: new Set()
    };

    // First pass: collect all imports/exports
    for (const file of files) {
      if (!this.isJavaScriptFile(file.path)) continue;
      
      try {
        const ast = await this.parseFile(file.content);
        const fileDeps = this.extractDependencies(ast, file.path);
        
        dependencies.imports.set(file.path, fileDeps.imports);
        dependencies.exports.set(file.path, fileDeps.exports);
        
        fileDeps.imports.forEach(imp => {
          if (imp.source.startsWith('.')) {
            dependencies.internal.add(imp.source);
          } else {
            dependencies.external.add(imp.source);
          }
        });
      } catch (error) {
        console.warn(`Dependency analysis failed for ${file.path}:`, error.message);
      }
    }

    // Build dependency graph
    dependencies.graph = this.buildDependencyGraph(dependencies.imports);
    
    // Detect circular dependencies
    dependencies.cycles = this.detectCircularDependencies(dependencies.graph);
    
    // Find unused dependencies
    dependencies.unused = this.findUnusedDependencies(dependencies.imports, dependencies.exports);

    return dependencies;
  }

  async analyzeSecurityVulnerabilities(files) {
    const security = {
      vulnerabilities: [],
      riskyPatterns: [],
      missingValidation: [],
      authIssues: [],
      dataExposure: [],
      score: 0
    };

    for (const file of files) {
      if (!this.isJavaScriptFile(file.path)) continue;
      
      try {
        const ast = await this.parseFile(file.content);
        const fileVulns = this.scanSecurityVulnerabilities(ast, file.path, file.content);
        
        security.vulnerabilities.push(...fileVulns.vulnerabilities);
        security.riskyPatterns.push(...fileVulns.riskyPatterns);
        security.missingValidation.push(...fileVulns.missingValidation);
        security.authIssues.push(...fileVulns.authIssues);
        security.dataExposure.push(...fileVulns.dataExposure);
      } catch (error) {
        console.warn(`Security analysis failed for ${file.path}:`, error.message);
      }
    }

    security.score = this.calculateSecurityScore(security);
    return security;
  }

  scanSecurityVulnerabilities(ast, filePath, content) {
    const vulnerabilities = [];
    const riskyPatterns = [];
    const missingValidation = [];
    const authIssues = [];
    const dataExposure = [];

    traverse(ast, {
      CallExpression(path) {
        const callee = path.node.callee;
        
        // Check for dangerous functions
        if (t.isIdentifier(callee)) {
          // eval() usage
          if (callee.name === 'eval') {
            vulnerabilities.push({
              type: 'dangerous-eval',
              severity: 'critical',
              message: 'Use of eval() can lead to code injection',
              file: filePath,
              line: path.node.loc?.start.line,
              suggestion: 'Use JSON.parse() or safer alternatives'
            });
          }

          // setTimeout/setInterval with string
          if (['setTimeout', 'setInterval'].includes(callee.name)) {
            const firstArg = path.node.arguments[0];
            if (firstArg && (t.isStringLiteral(firstArg) || t.isIdentifier(firstArg))) {
              vulnerabilities.push({
                type: 'string-execution',
                severity: 'high',
                message: `${callee.name}() with string argument acts like eval()`,
                file: filePath,
                line: path.node.loc?.start.line,
                suggestion: 'Use function references instead of strings'
              });
            }
          }
        }

        // Check for SQL injection patterns
        if (t.isMemberExpression(callee)) {
          if (callee.property.name === 'query' || callee.property.name === 'execute') {
            const arg = path.node.arguments[0];
            if (t.isTemplateLiteral(arg) || 
                (t.isBinaryExpression(arg) && arg.operator === '+')) {
              vulnerabilities.push({
                type: 'sql-injection',
                severity: 'critical',
                message: 'Potential SQL injection vulnerability',
                file: filePath,
                line: path.node.loc?.start.line,
                suggestion: 'Use parameterized queries'
              });
            }
          }
        }
      },

      AssignmentExpression(path) {
        // Check for innerHTML assignments
        if (t.isMemberExpression(path.node.left) &&
            path.node.left.property.name === 'innerHTML') {
          vulnerabilities.push({
            type: 'xss-innerHTML',
            severity: 'medium',
            message: 'innerHTML assignment can lead to XSS',
            file: filePath,
            line: path.node.loc?.start.line,
            suggestion: 'Use textContent or sanitize HTML'
          });
        }
      },

      MemberExpression(path) {
        // Check for process.env access without validation
        if (t.isIdentifier(path.node.object, { name: 'process' }) &&
            t.isIdentifier(path.node.property, { name: 'env' })) {
          missingValidation.push({
            type: 'env-validation',
            severity: 'low',
            message: 'Environment variable used without validation',
            file: filePath,
            line: path.node.loc?.start.line,
            suggestion: 'Validate environment variables'
          });
        }
      }
    });

    // Check for hardcoded secrets in content
    const secretPatterns = [
      { regex: /password\s*[=:]\s*["']([^"']{8,})["']/gi, type: 'hardcoded-password' },
      { regex: /api[_-]?key\s*[=:]\s*["']([^"']{20,})["']/gi, type: 'hardcoded-api-key' },
      { regex: /secret\s*[=:]\s*["']([^"']{16,})["']/gi, type: 'hardcoded-secret' }
    ];

    secretPatterns.forEach(({ regex, type }) => {
      let match;
      while ((match = regex.exec(content))) {
        dataExposure.push({
          type,
          severity: 'high',
          message: `Hardcoded ${type.replace('hardcoded-', '')} found`,
          file: filePath,
          suggestion: 'Use environment variables or secure storage'
        });
      }
    });

    return { vulnerabilities, riskyPatterns, missingValidation, authIssues, dataExposure };
  }

  async analyzePerformanceBottlenecks(files) {
    const performance = {
      bottlenecks: [],
      antiPatterns: [],
      optimizations: [],
      metrics: {}
    };

    for (const file of files) {
      if (!this.isJavaScriptFile(file.path)) continue;
      
      try {
        const ast = await this.parseFile(file.content);
        const filePerf = this.scanPerformanceIssues(ast, file.path);
        
        performance.bottlenecks.push(...filePerf.bottlenecks);
        performance.antiPatterns.push(...filePerf.antiPatterns);
        performance.optimizations.push(...filePerf.optimizations);
      } catch (error) {
        console.warn(`Performance analysis failed for ${file.path}:`, error.message);
      }
    }

    return performance;
  }

  scanPerformanceIssues(ast, filePath) {
    const bottlenecks = [];
    const antiPatterns = [];
    const optimizations = [];

    traverse(ast, {
      ForStatement(path) {
        // Check if this for loop is nested inside another loop
        let parentPath = path.parentPath;
        let inLoop = false;
        while (parentPath) {
          if (t.isForStatement(parentPath.node) || t.isWhileStatement(parentPath.node) ||
              t.isForInStatement(parentPath.node) || t.isForOfStatement(parentPath.node) ||
              (t.isCallExpression(parentPath.node) && 
               t.isMemberExpression(parentPath.node.callee) &&
               ['forEach', 'map', 'filter'].includes(parentPath.node.callee.property.name))) {
            inLoop = true;
            break;
          }
          parentPath = parentPath.parentPath;
        }

        if (inLoop) {
          bottlenecks.push({
            type: 'nested-iteration',
            severity: 'medium',
            message: 'Nested iteration detected (O(n²) complexity)',
            file: filePath,
            line: path.node.loc?.start.line,
            suggestion: 'Consider using more efficient algorithms or caching'
          });
        }
      },

      CallExpression(path) {
        const callee = path.node.callee;

        // Check for inefficient array operations
        if (t.isMemberExpression(callee)) {
          if (callee.property.name === 'forEach') {
            // Check if inside another loop
            let parentPath = path.parentPath;
            let inLoop = false;
            while (parentPath) {
              if (t.isForStatement(parentPath.node) || t.isWhileStatement(parentPath.node) ||
                  (t.isCallExpression(parentPath.node) && 
                   t.isMemberExpression(parentPath.node.callee) &&
                   ['forEach', 'map', 'filter'].includes(parentPath.node.callee.property.name))) {
                inLoop = true;
                break;
              }
              parentPath = parentPath.parentPath;
            }

            if (inLoop) {
              bottlenecks.push({
                type: 'nested-iteration',
                severity: 'medium',
                message: 'Nested iteration detected (O(n²) complexity)',
                file: filePath,
                line: path.node.loc?.start.line,
                suggestion: 'Consider using more efficient algorithms or caching'
              });
            }
          }

          // Check for DOM queries in loops
          if (['querySelector', 'getElementById', 'getElementsByClassName'].includes(callee.property.name)) {
            let parentPath = path.parentPath;
            let inLoop = false;
            while (parentPath) {
              if (t.isForStatement(parentPath.node) || t.isWhileStatement(parentPath.node)) {
                inLoop = true;
                break;
              }
              parentPath = parentPath.parentPath;
            }

            if (inLoop) {
              bottlenecks.push({
                type: 'dom-query-in-loop',
                severity: 'high',
                message: 'DOM query inside loop',
                file: filePath,
                line: path.node.loc?.start.line,
                suggestion: 'Cache DOM queries outside the loop'
              });
            }
          }
        }

        // Check for JSON.parse(JSON.stringify()) pattern
        if (t.isMemberExpression(callee) && callee.property.name === 'parse' &&
            t.isIdentifier(callee.object, { name: 'JSON' })) {
          const arg = path.node.arguments[0];
          if (t.isCallExpression(arg) &&
              t.isMemberExpression(arg.callee) &&
              arg.callee.property.name === 'stringify') {
            antiPatterns.push({
              type: 'inefficient-cloning',
              severity: 'medium',
              message: 'Inefficient deep cloning with JSON.parse(JSON.stringify())',
              file: filePath,
              line: path.node.loc?.start.line,
              suggestion: 'Use structuredClone() or a proper deep clone library'
            });
          }
        }
      },

      // Check for memory leaks
      VariableDeclaration(path) {
        path.node.declarations.forEach(declarator => {
          if (t.isArrayExpression(declarator.init)) {
            // Large array initialization
            if (declarator.init.elements.length > 1000) {
              bottlenecks.push({
                type: 'large-array-init',
                severity: 'low',
                message: 'Large array initialization may impact memory',
                file: filePath,
                line: path.node.loc?.start.line,
                suggestion: 'Consider lazy loading or chunking'
              });
            }
          }
        });
      }
    });

    return { bottlenecks, antiPatterns, optimizations };
  }

  // Helper methods
  isJavaScriptFile(filePath) {
    const ext = path.extname(filePath);
    return ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext);
  }

  async parseFile(content) {
    return parser.parse(content, {
      sourceType: 'module',
      plugins: [
        'jsx', 'typescript', 'decorators-legacy', 'classProperties',
        'dynamicImport', 'exportDefaultFrom', 'exportNamespaceFrom',
        'asyncGenerators', 'functionBind', 'functionSent',
        'objectRestSpread', 'optionalCatchBinding',
        'optionalChaining', 'nullishCoalescingOperator'
      ]
    });
  }

  getFunctionName(path) {
    if (path.node.id) return path.node.id.name;
    if (t.isVariableDeclarator(path.parent)) return path.parent.id.name;
    if (t.isProperty(path.parent)) return path.parent.key.name;
    return 'anonymous';
  }

  calculateLinesOfCode(path) {
    const start = path.node.loc?.start.line || 0;
    const end = path.node.loc?.end.line || 0;
    return end - start + 1;
  }

  generateComplexityWarnings(complexity) {
    const warnings = [];
    if (complexity.cyclomatic > 10) {
      warnings.push('High cyclomatic complexity - consider refactoring');
    }
    if (complexity.cognitive > 15) {
      warnings.push('High cognitive complexity - difficult to understand');
    }
    if (complexity.maxNesting > 4) {
      warnings.push('Deep nesting detected - consider extracting functions');
    }
    return warnings;
  }

  calculateOverallComplexity(complexity) {
    const totalFunctions = complexity.functions.length;
    if (totalFunctions === 0) return { score: 0, rating: 'unknown' };

    const avgCyclomatic = complexity.functions.reduce((sum, f) => sum + f.cyclomatic, 0) / totalFunctions;
    const avgCognitive = complexity.functions.reduce((sum, f) => sum + f.cognitive, 0) / totalFunctions;
    
    const score = (avgCyclomatic + avgCognitive) / 2;
    let rating;
    
    if (score <= 5) rating = 'excellent';
    else if (score <= 10) rating = 'good';
    else if (score <= 15) rating = 'moderate';
    else if (score <= 25) rating = 'complex';
    else rating = 'very-complex';

    return { score: Math.round(score), rating, totalFunctions };
  }

  calculateSecurityScore(security) {
    const critical = security.vulnerabilities.filter(v => v.severity === 'critical').length;
    const high = security.vulnerabilities.filter(v => v.severity === 'high').length;
    const medium = security.vulnerabilities.filter(v => v.severity === 'medium').length;
    const low = security.vulnerabilities.filter(v => v.severity === 'low').length;

    // Score out of 100, deduct points for vulnerabilities
    let score = 100;
    score -= critical * 20;
    score -= high * 10;
    score -= medium * 5;
    score -= low * 2;

    return Math.max(0, score);
  }

  generateSummary(analyses) {
    return {
      totalFiles: this.analysisResults.totalFiles || 0,
      complexityRating: analyses[0].overall.rating,
      securityScore: analyses[2].score,
      vulnerabilitiesFound: analyses[2].vulnerabilities.length,
      performanceIssues: analyses[3].bottlenecks.length,
      circularDependencies: analyses[1].cycles.length
    };
  }

  async analyzeCodeQuality(files) {
    const quality = {
      maintainability: {},
      readability: {},
      testability: {},
      documentation: {},
      metrics: {}
    };

    for (const file of files) {
      if (!this.isJavaScriptFile(file.path)) continue;
      
      try {
        const ast = await this.parseFile(file.content);
        const fileQuality = this.assessCodeQuality(ast, file.path, file.content);
        
        Object.keys(fileQuality).forEach(key => {
          if (!quality[key]) quality[key] = {};
          quality[key][file.path] = fileQuality[key];
        });
      } catch (error) {
        console.warn(`Code quality analysis failed for ${file.path}:`, error.message);
      }
    }

    return quality;
  }

  async analyzeArchitecturalPatterns(files) {
    const patterns = {
      designPatterns: [],
      antiPatterns: [],
      architecturalSmells: [],
      suggestions: []
    };

    // Analyze for common design patterns and anti-patterns
    for (const file of files) {
      if (!this.isJavaScriptFile(file.path)) continue;
      
      try {
        const ast = await this.parseFile(file.content);
        const filePatterns = this.detectArchitecturalPatterns(ast, file.path);
        
        patterns.designPatterns.push(...filePatterns.designPatterns);
        patterns.antiPatterns.push(...filePatterns.antiPatterns);
        patterns.architecturalSmells.push(...filePatterns.architecturalSmells);
      } catch (error) {
        console.warn(`Pattern analysis failed for ${file.path}:`, error.message);
      }
    }

    return patterns;
  }

  async analyzeDatabaseUsage(files) {
    const database = {
      queries: [],
      models: [],
      connections: [],
      migrations: [],
      issues: []
    };

    for (const file of files) {
      if (!this.isJavaScriptFile(file.path)) continue;
      
      try {
        const ast = await this.parseFile(file.content);
        const dbUsage = this.analyzeDbPatterns(ast, file.path, file.content);
        
        database.queries.push(...dbUsage.queries);
        database.models.push(...dbUsage.models);
        database.connections.push(...dbUsage.connections);
        database.issues.push(...dbUsage.issues);
      } catch (error) {
        console.warn(`Database analysis failed for ${file.path}:`, error.message);
      }
    }

    return database;
  }

  extractDependencies(ast, filePath) {
    const imports = [];
    const exports = [];

    traverse(ast, {
      ImportDeclaration(path) {
        imports.push({
          source: path.node.source.value,
          specifiers: path.node.specifiers.map(spec => ({
            type: spec.type,
            local: spec.local.name,
            imported: spec.imported?.name
          })),
          line: path.node.loc?.start.line
        });
      },

      ExportNamedDeclaration(path) {
        if (path.node.source) {
          exports.push({
            type: 'reexport',
            source: path.node.source.value,
            specifiers: path.node.specifiers?.map(spec => spec.exported.name) || [],
            line: path.node.loc?.start.line
          });
        } else {
          exports.push({
            type: 'named',
            name: path.node.declaration?.id?.name || 'anonymous',
            line: path.node.loc?.start.line
          });
        }
      },

      ExportDefaultDeclaration(path) {
        exports.push({
          type: 'default',
          name: path.node.declaration?.id?.name || 'default',
          line: path.node.loc?.start.line
        });
      }
    });

    return { imports, exports };
  }

  buildDependencyGraph(importsMap) {
    const graph = {};
    
    for (const [file, imports] of importsMap) {
      graph[file] = imports
        .filter(imp => imp.source.startsWith('.'))
        .map(imp => imp.source);
    }

    return graph;
  }

  detectCircularDependencies(graph) {
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const dfs = (node, path = []) => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        cycles.push(path.slice(cycleStart).concat([node]));
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);

      const dependencies = graph[node] || [];
      for (const dep of dependencies) {
        dfs(dep, [...path, node]);
      }

      recursionStack.delete(node);
    };

    for (const node in graph) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  findUnusedDependencies(importsMap, exportsMap) {
    // This is a simplified implementation
    // In reality, you'd need to track actual usage
    return [];
  }

  calculateClassComplexity(path) {
    const methods = [];
    const properties = [];
    let totalComplexity = 0;
    const warnings = [];

    const self = this;

    path.traverse({
      ClassMethod(methodPath) {
        const complexity = self.calculateFunctionComplexity(methodPath);
        methods.push({
          name: methodPath.node.key.name,
          complexity: complexity.cyclomatic,
          line: methodPath.node.loc?.start.line
        });
        totalComplexity += complexity.cyclomatic;
      },

      ClassProperty(propPath) {
        properties.push({
          name: propPath.node.key.name,
          line: propPath.node.loc?.start.line
        });
      }
    });

    if (methods.length > 20) {
      warnings.push('Large class with many methods - consider splitting');
    }

    return { methods, properties, totalComplexity, warnings };
  }

  calculateCohesion(path) {
    // Simplified LCOM metric
    return 0.5; // Placeholder
  }

  assessCodeQuality(ast, filePath, content) {
    // Placeholder for code quality assessment
    return {
      maintainability: 0.7,
      readability: 0.8,
      testability: 0.6
    };
  }

  detectArchitecturalPatterns(ast, filePath) {
    // Placeholder for pattern detection
    return {
      designPatterns: [],
      antiPatterns: [],
      architecturalSmells: []
    };
  }

  analyzeDbPatterns(ast, filePath, content) {
    const queries = [];
    const models = [];
    const connections = [];
    const issues = [];

    traverse(ast, {
      CallExpression(path) {
        const callee = path.node.callee;
        
        // Check for SQL queries
        if (t.isMemberExpression(callee)) {
          if (['query', 'execute', 'run'].includes(callee.property.name)) {
            const arg = path.node.arguments[0];
            if (t.isStringLiteral(arg) || t.isTemplateLiteral(arg)) {
              queries.push({
                type: 'sql',
                query: t.isStringLiteral(arg) ? arg.value : 'template',
                file: filePath,
                line: path.node.loc?.start.line
              });
            }
          }
        }
      },

      // Check for ORM model definitions
      ClassDeclaration(path) {
        if (path.node.superClass && 
            (path.node.superClass.name === 'Model' ||
             (t.isMemberExpression(path.node.superClass) && 
              path.node.superClass.property.name === 'Model'))) {
          models.push({
            name: path.node.id.name,
            file: filePath,
            line: path.node.loc?.start.line
          });
        }
      }
    });

    return { queries, models, connections, issues };
  }

  generateRecommendations(analyses) {
    const recommendations = [];
    const [complexity, dependencies, security, performance] = analyses;

    // Complexity recommendations
    if (complexity.overall.rating === 'very-complex') {
      recommendations.push('🔴 Critical: Refactor complex functions to improve maintainability');
    }

    // Security recommendations
    if (security.vulnerabilities.length > 0) {
      recommendations.push(`🔴 Security: Fix ${security.vulnerabilities.length} security vulnerabilities`);
    }

    // Performance recommendations
    if (performance.bottlenecks.length > 0) {
      recommendations.push(`⚡ Performance: Address ${performance.bottlenecks.length} performance bottlenecks`);
    }

    // Dependency recommendations
    if (dependencies.cycles.length > 0) {
      recommendations.push(`🔄 Architecture: Resolve ${dependencies.cycles.length} circular dependencies`);
    }

    return recommendations;
  }
}

module.exports = DeepAnalysisEngine;