const fs = require('fs').promises;
const path = require('path');
const ASTAnalyzer = require('./ast-analyzer');
const DeepAnalysisEngine = require('./deep-analysis-engine');

class BaseAnalyzer {
  constructor(options = {}) {
    this.options = options;
    this.astAnalyzer = new ASTAnalyzer(options);
    this.deepAnalyzer = new DeepAnalysisEngine(options);
  }

  async analyzeFiles(files) {
    console.log(`🚀 Starting comprehensive analysis of ${files.length} files...`);
    
    // Basic AST analysis first
    const results = {
      endpoints: [],
      components: {},
      security: {
        issues: [],
        recommendations: []
      },
      performance: {
        issues: [],
        recommendations: []
      }
    };

    // Process each file with AST analysis
    for (const file of files) {
      try {
        const content = file.content || await fs.readFile(file.path, 'utf-8');
        await this.analyzeFile(file, content, results);
      } catch (error) {
        console.warn(`Failed to analyze ${file.path}:`, error.message);
      }
    }

    // Now run deep analysis
    console.log(`🔬 Running deep analysis on ${files.length} files...`);
    try {
      const deepAnalysis = await this.deepAnalyzer.analyzeProject(files);
      
      // Merge deep analysis results
      results.deepAnalysis = deepAnalysis;
      results.complexity = deepAnalysis.complexity;
      results.dependencies = deepAnalysis.dependencies;
      results.security = {
        ...results.security,
        ...deepAnalysis.security,
        issues: [...results.security.issues, ...deepAnalysis.security.vulnerabilities]
      };
      results.performance = {
        ...results.performance,
        ...deepAnalysis.performance,
        issues: [...results.performance.issues, ...deepAnalysis.performance.bottlenecks]
      };
      results.codeQuality = deepAnalysis.quality;
      results.architecturalPatterns = deepAnalysis.patterns;
      results.summary = deepAnalysis.summary;
      results.recommendations = deepAnalysis.recommendations;
      
      console.log(`✅ Deep analysis complete! Found ${deepAnalysis.security.vulnerabilities.length} security issues, ${deepAnalysis.performance.bottlenecks.length} performance bottlenecks`);
    } catch (error) {
      console.warn(`Deep analysis failed:`, error.message);
    }

    return results;
  }

  async analyzeFile(file, content, results) {
    const lines = content.split('\n');
    const filePath = file.relativePath || file.path;

    // Use AST analyzer for JavaScript/TypeScript files
    const ext = path.extname(filePath);
    if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
      try {
        const astAnalysis = await this.astAnalyzer.analyzeFile(filePath, content);
        
        // Process AST results
        this.processASTResults(astAnalysis, filePath, results);
      } catch (error) {
        console.warn(`AST analysis failed for ${filePath}, falling back to regex:`, error.message);
        // Fall back to regex-based analysis
        this.detectEndpoints(content, lines, filePath, results);
        this.detectComponents(content, lines, filePath, results);
      }
    } else {
      // Use regex for non-JS files
      this.detectEndpoints(content, lines, filePath, results);
      this.detectComponents(content, lines, filePath, results);
    }

    // Always check for security and performance issues
    this.detectSecurityIssues(content, lines, filePath, results);
    this.detectPerformanceIssues(content, lines, filePath, results);
  }

  processASTResults(astAnalysis, filePath, results) {
    // Process API endpoints
    astAnalysis.apiEndpoints.forEach(endpoint => {
      results.endpoints.push({
        ...endpoint,
        file: filePath,
        handler: 'analyzed'
      });
    });

    // Process components
    astAnalysis.components.forEach(component => {
      results.components[component.name] = {
        file: filePath,
        line: component.line || 1,
        type: component.type,
        props: component.params || [],
        hooks: component.hooks || [],
        methods: component.methods || []
      };
    });

    // Add hooks to components
    astAnalysis.hooks.forEach(hook => {
      if (!results.hooks) results.hooks = [];
      results.hooks.push({
        name: hook.name,
        file: filePath,
        line: hook.line || 1
      });
    });

    // Add functions and classes for better analysis
    if (!results.functions) results.functions = [];
    if (!results.classes) results.classes = [];
    
    results.functions.push(...astAnalysis.functions.map(f => ({
      ...f,
      file: filePath
    })));
    
    results.classes.push(...astAnalysis.classes.map(c => ({
      ...c,
      file: filePath
    })));

    // Add imports/exports for dependency analysis
    if (!results.imports) results.imports = [];
    if (!results.exports) results.exports = [];
    
    results.imports.push(...astAnalysis.imports.map(i => ({
      ...i,
      file: filePath
    })));
    
    results.exports.push(...astAnalysis.exports.map(e => ({
      ...e,
      file: filePath
    })));
  }

  detectEndpoints(content, lines, filePath, results) {
    // Express routes
    const routePatterns = [
      /app\.(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"]+)['"`]/g,
      /router\.(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"]+)['"`]/g,
      /route\(['"`]([^'"]+)['"`]\)\.(get|post|put|delete|patch)/g,
      /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]([^'"]+)['"`]\)/g // Decorators
    ];

    lines.forEach((line, index) => {
      for (const pattern of routePatterns) {
        const matches = [...line.matchAll(pattern)];
        for (const match of matches) {
          const method = match[1].toUpperCase();
          const path = match[2] || match[1];
          
          results.endpoints.push({
            method,
            path,
            file: filePath,
            line: index + 1,
            handler: this.extractHandlerName(line) || 'anonymous',
            middleware: this.extractMiddleware(line)
          });
        }
      }
    });

    // Next.js API routes (both pages/api and app/api)
    if (filePath.includes('/api/') || filePath.includes('\\api\\')) {
      const methods = this.extractNextJSMethods(content);
      const apiPath = this.getNextJSApiPath(filePath);
      
      methods.forEach(method => {
        results.endpoints.push({
          method: method.toUpperCase(),
          path: apiPath,
          file: filePath,
          line: 1,
          handler: `${method}Handler`,
          framework: 'nextjs'
        });
      });
    }
  }

  detectComponents(content, lines, filePath, results) {
    // React components
    const componentPatterns = [
      /(?:export\s+)?(?:default\s+)?(?:function|const)\s+([A-Z][a-zA-Z0-9]*)\s*[=(:]/g,
      /class\s+([A-Z][a-zA-Z0-9]*)\s+extends\s+(?:React\.)?Component/g,
      /export\s+default\s+([A-Z][a-zA-Z0-9]*)/g
    ];

    lines.forEach((line, index) => {
      for (const pattern of componentPatterns) {
        const matches = [...line.matchAll(pattern)];
        for (const match of matches) {
          const componentName = match[1];
          if (componentName && componentName[0] === componentName[0].toUpperCase()) {
            results.components[componentName] = {
              file: filePath,
              line: index + 1,
              type: line.includes('class') ? 'class' : 'function',
              props: this.extractProps(content, componentName),
              hooks: this.extractHooks(content, componentName)
            };
          }
        }
      }
    });
  }

  detectSecurityIssues(content, lines, filePath, results) {
    const securityPatterns = [
      { pattern: /eval\s*\(/, issue: 'Dangerous eval() usage', severity: 'high' },
      { pattern: /innerHTML\s*=/, issue: 'Potential XSS via innerHTML', severity: 'medium' },
      { pattern: /crypto\.createHash\(['"]md5['"]/, issue: 'Weak MD5 hashing', severity: 'medium' },
      { pattern: /process\.env\.\w+/, issue: 'Environment variable usage - ensure proper validation', severity: 'low' },
      { pattern: /disable.*csrf/i, issue: 'CSRF protection disabled', severity: 'high' }
    ];

    lines.forEach((line, index) => {
      for (const { pattern, issue, severity } of securityPatterns) {
        if (pattern.test(line)) {
          results.security.issues.push({
            issue,
            severity,
            file: filePath,
            line: index + 1,
            code: line.trim()
          });
        }
      }
    });
  }

  detectPerformanceIssues(content, lines, filePath, results) {
    const perfPatterns = [
      { pattern: /\.\s*map\s*\([^)]+\)\s*\.\s*map\s*\(/, issue: 'Chained map operations', suggestion: 'Consider using a single map with combined logic' },
      { pattern: /JSON\.parse\s*\(\s*JSON\.stringify/, issue: 'Inefficient deep cloning', suggestion: 'Use a proper deep clone library' },
      { pattern: /for\s*\([^)]+in\s+/, issue: 'for...in loop usage', suggestion: 'Consider using for...of or array methods' },
      { pattern: /querySelector.*inside.*loop/i, issue: 'DOM queries inside loops', suggestion: 'Cache DOM queries outside loops' }
    ];

    lines.forEach((line, index) => {
      for (const { pattern, issue, suggestion } of perfPatterns) {
        if (pattern.test(line)) {
          results.performance.issues.push({
            issue,
            suggestion,
            file: filePath,
            line: index + 1,
            code: line.trim()
          });
        }
      }
    });
  }

  // Helper methods
  extractHandlerName(line) {
    const match = line.match(/,\s*(?:async\s+)?(?:function\s+)?(\w+)\s*[(\[{]/);
    return match ? match[1] : null;
  }

  extractMiddleware(line) {
    const middlewareMatch = line.match(/,\s*\[([^\]]+)\]/);
    if (middlewareMatch) {
      return middlewareMatch[1].split(',').map(m => m.trim());
    }
    return [];
  }

  extractNextJSMethods(content) {
    const methods = [];
    const patterns = [
      /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)/g,
      /export\s+const\s+(GET|POST|PUT|DELETE|PATCH)\s*=/g
    ];

    for (const pattern of patterns) {
      const matches = [...content.matchAll(pattern)];
      matches.forEach(match => methods.push(match[1]));
    }

    return methods.length > 0 ? methods : ['GET'];
  }

  getNextJSApiPath(filePath) {
    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    const apiIndex = parts.findIndex(p => p === 'api');
    
    if (apiIndex !== -1) {
      const pathParts = parts.slice(apiIndex + 1);
      const cleanPath = pathParts
        .map(p => p.replace(/\.(js|ts|jsx|tsx)$/, ''))
        .map(p => p === 'index' ? '' : p)
        .filter(Boolean)
        .map(p => p.replace(/\[([^\]]+)\]/, ':$1'));
      
      return '/api/' + (cleanPath.length > 0 ? cleanPath.join('/') : '');
    }
    
    return '/api/unknown';
  }

  extractProps(content, componentName) {
    const propsMatch = content.match(new RegExp(`${componentName}.*?\\(\\s*{([^}]+)}\\s*\\)`));
    if (propsMatch) {
      return propsMatch[1].split(',').map(p => p.trim()).filter(Boolean);
    }
    return [];
  }

  extractHooks(content, componentName) {
    const hooks = [];
    const hookPattern = /use[A-Z]\w*/g;
    const componentMatch = content.match(new RegExp(`${componentName}[\\s\\S]*?^}`, 'm'));
    
    if (componentMatch) {
      const matches = [...componentMatch[0].matchAll(hookPattern)];
      matches.forEach(match => {
        if (!hooks.includes(match[0])) {
          hooks.push(match[0]);
        }
      });
    }
    
    return hooks;
  }
}

module.exports = BaseAnalyzer;