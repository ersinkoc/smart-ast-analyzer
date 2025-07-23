const fs = require('fs').promises;
const path = require('path');

class ComplexityAnalyzer {
  constructor(framework, options = {}) {
    this.framework = framework;
    this.options = options;
    this.complexityThresholds = this.loadComplexityThresholds();
    this.debtPatterns = this.loadTechnicalDebtPatterns();
  }

  async analyze(aiResult, files, projectInfo) {
    if (!aiResult || aiResult.error) {
      return this.createEmptyResult(aiResult?.error);
    }

    const analysis = {
      ...aiResult,
      metadata: this.generateMetadata(files, projectInfo),
      codeMetrics: await this.calculateCodeMetrics(files),
      technicalDebt: await this.assessTechnicalDebt(files),
      maintainabilityIndex: this.calculateMaintainabilityIndex(files),
      codeSmells: await this.detectCodeSmells(files),
      refactoringOpportunities: this.identifyRefactoringOpportunities(files),
      complexityTrends: this.analyzeComplexityTrends(files),
      qualityGates: this.evaluateQualityGates(files),
      recommendations: this.generateComplexityRecommendations(files)
    };

    return analysis;
  }

  createEmptyResult(error) {
    return {
      codeMetrics: { cyclomaticComplexity: 0, cognitiveComplexity: 0, linesOfCode: 0 },
      technicalDebt: { totalDebt: 0, debtRatio: 0, issues: [] },
      maintainabilityIndex: 0,
      codeSmells: [],
      refactoringOpportunities: [],
      complexityTrends: { trend: 'unknown', severity: 'low' },
      qualityGates: { passed: 0, failed: 0, status: 'unknown' },
      metadata: {
        analysisDate: new Date().toISOString(),
        framework: this.framework,
        error: error
      },
      recommendations: [
        'Complexity analysis could not be performed',
        'Check if your project has analyzable code files',
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
      languageBreakdown: this.analyzeLanguageDistribution(files),
      analysisScope: this.determineAnalysisScope(files),
      complexityDistribution: this.getComplexityDistribution(files)
    };
  }

  calculateProjectSize(files) {
    const totalLines = files.reduce((sum, file) => sum + (file.lines || this.countLines(file.content)), 0);
    const totalSize = files.reduce((sum, file) => sum + (file.size || file.content.length), 0);
    
    return {
      lines: totalLines,
      bytes: totalSize,
      files: files.length,
      avgLinesPerFile: files.length > 0 ? Math.round(totalLines / files.length) : 0,
      sizeCategory: this.categorizeProjectSize(totalLines)
    };
  }

  countLines(content) {
    return content.split('\n').filter(line => line.trim() !== '').length;
  }

  categorizeProjectSize(lines) {
    if (lines < 1000) return 'small';
    if (lines < 10000) return 'medium';
    if (lines < 50000) return 'large';
    return 'enterprise';
  }

  analyzeLanguageDistribution(files) {
    const distribution = {};
    
    files.forEach(file => {
      const extension = path.extname(file.path).toLowerCase();
      if (!distribution[extension]) {
        distribution[extension] = { count: 0, lines: 0, size: 0 };
      }
      
      distribution[extension].count++;
      distribution[extension].lines += file.lines || this.countLines(file.content);
      distribution[extension].size += file.size || file.content.length;
    });

    // Calculate percentages
    const totalFiles = files.length;
    Object.keys(distribution).forEach(ext => {
      distribution[ext].percentage = Math.round((distribution[ext].count / totalFiles) * 100);
    });

    return distribution;
  }

  determineAnalysisScope(files) {
    const scopes = {
      frontend: files.filter(f => this.isFrontendFile(f.path)).length,
      backend: files.filter(f => this.isBackendFile(f.path)).length,
      test: files.filter(f => this.isTestFile(f.path)).length,
      config: files.filter(f => this.isConfigFile(f.path)).length
    };

    const primary = Object.entries(scopes).reduce((a, b) => scopes[a[0]] > scopes[b[0]] ? a : b)[0];
    
    return {
      primary,
      distribution: scopes,
      isFullstack: scopes.frontend > 0 && scopes.backend > 0
    };
  }

  isFrontendFile(filePath) {
    return /\.(jsx?|tsx?|vue|html|css|scss|less)$/i.test(filePath) || 
           filePath.includes('component') || filePath.includes('client');
  }

  isBackendFile(filePath) {
    return filePath.includes('server') || filePath.includes('api') || 
           filePath.includes('route') || filePath.includes('controller') ||
           filePath.includes('service') || filePath.includes('model');
  }

  isTestFile(filePath) {
    return /\.(test|spec)\./i.test(filePath) || filePath.includes('__tests__');
  }

  isConfigFile(filePath) {
    return /\.(config|json|yml|yaml|toml)$/i.test(filePath) || 
           ['package.json', 'webpack.config.js', '.babelrc'].some(name => filePath.includes(name));
  }

  getComplexityDistribution(files) {
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    
    files.forEach(file => {
      const complexity = this.calculateFileComplexity(file);
      if (complexity < 10) distribution.low++;
      else if (complexity < 20) distribution.medium++;
      else if (complexity < 30) distribution.high++;
      else distribution.critical++;
    });

    return distribution;
  }

  async calculateCodeMetrics(files) {
    const metrics = {
      cyclomaticComplexity: 0,
      cognitiveComplexity: 0,
      linesOfCode: 0,
      commentLines: 0,
      duplicatedLines: 0,
      codeToCommentRatio: 0,
      averageMethodLength: 0,
      classComplexity: [],
      functionComplexity: [],
      fileComplexity: [],
      maintainabilityMetrics: {}
    };

    for (const file of files) {
      const fileMetrics = await this.analyzeFileMetrics(file);
      
      metrics.cyclomaticComplexity += fileMetrics.cyclomaticComplexity;
      metrics.cognitiveComplexity += fileMetrics.cognitiveComplexity;
      metrics.linesOfCode += fileMetrics.linesOfCode;
      metrics.commentLines += fileMetrics.commentLines;
      metrics.duplicatedLines += fileMetrics.duplicatedLines;
      
      metrics.fileComplexity.push({
        file: file.path,
        complexity: fileMetrics.cyclomaticComplexity,
        cognitiveComplexity: fileMetrics.cognitiveComplexity,
        maintainabilityIndex: fileMetrics.maintainabilityIndex
      });

      metrics.functionComplexity.push(...fileMetrics.functions);
      metrics.classComplexity.push(...fileMetrics.classes);
    }

    // Calculate derived metrics
    metrics.codeToCommentRatio = metrics.commentLines > 0 ? 
      Math.round((metrics.linesOfCode / metrics.commentLines) * 100) / 100 : 0;
    
    metrics.averageMethodLength = metrics.functionComplexity.length > 0 ?
      Math.round(metrics.functionComplexity.reduce((sum, fn) => sum + fn.lines, 0) / metrics.functionComplexity.length) : 0;

    metrics.maintainabilityMetrics = this.calculateProjectMaintainability(metrics);

    return metrics;
  }

  async analyzeFileMetrics(file) {
    const content = file.content;
    const lines = content.split('\n');
    
    const metrics = {
      cyclomaticComplexity: this.calculateCyclomaticComplexity(content),
      cognitiveComplexity: this.calculateCognitiveComplexity(content),
      linesOfCode: this.countCodeLines(lines),
      commentLines: this.countCommentLines(lines),
      duplicatedLines: 0, // Would need more sophisticated analysis
      maintainabilityIndex: 0,
      functions: this.analyzeFunctions(content, file.path),
      classes: this.analyzeClasses(content, file.path),
      nesting: this.calculateNestingLevel(content),
      cohesion: this.calculateCohesion(content),
      coupling: this.calculateCoupling(content)
    };

    metrics.maintainabilityIndex = this.calculateFileMaintainabilityIndex(metrics);
    
    return metrics;
  }

  calculateCyclomaticComplexity(content) {
    // Simplified cyclomatic complexity calculation
    const complexityPatterns = [
      /\bif\s*\(/g,
      /\belse\b/g,
      /\bwhile\s*\(/g,
      /\bfor\s*\(/g,
      /\bswitch\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\b\?\s*:/g,  // ternary operator
      /&&/g,
      /\|\|/g
    ];

    let complexity = 1; // Base complexity
    
    complexityPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  calculateCognitiveComplexity(content) {
    // Simplified cognitive complexity - considers nesting weight
    let complexity = 0;
    let nestingLevel = 0;
    const lines = content.split('\n');

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Increase nesting level
      if (/\{$/.test(trimmedLine)) {
        nestingLevel++;
      }
      
      // Decrease nesting level
      if (/^\s*\}/.test(trimmedLine)) {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }

      // Add complexity for control structures with nesting weight
      const controlStructures = [
        /\bif\s*\(/, /\belse\b/, /\bwhile\s*\(/, /\bfor\s*\(/,
        /\bswitch\s*\(/, /\bcatch\s*\(/
      ];

      controlStructures.forEach(pattern => {
        if (pattern.test(trimmedLine)) {
          complexity += 1 + nestingLevel;
        }
      });

      // Logical operators add complexity
      if (/&&|\|\|/.test(trimmedLine)) {
        complexity += 1;
      }
    });

    return complexity;
  }

  countCodeLines(lines) {
    return lines.filter(line => {
      const trimmed = line.trim();
      return trimmed !== '' && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*');
    }).length;
  }

  countCommentLines(lines) {
    return lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
    }).length;
  }

  analyzeFunctions(content, filePath) {
    const functions = [];
    // Enhanced regex to match various function patterns including class methods
    const functionRegex = /(?:function\s+(\w+)\s*(\([^)]*\))|(\w+)\s*[=:]\s*(?:function\s*(\([^)]*\))|(\([^)]*\)\s*=>))|(\w+)\s*(\([^)]*\))\s*\{)/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1] || match[3] || match[6] || 'anonymous';
      const parameters = match[2] || match[4] || match[5] || match[7] || '()';
      const startIndex = match.index;
      
      // Extract function body (simplified)
      const functionBody = this.extractFunctionBody(content, startIndex);
      
      functions.push({
        name: functionName,
        file: filePath,
        complexity: this.calculateCyclomaticComplexity(functionBody),
        cognitiveComplexity: this.calculateCognitiveComplexity(functionBody),
        lines: functionBody.split('\n').length,
        parameters: this.countParameters(parameters),
        startLine: content.substring(0, startIndex).split('\n').length
      });
    }

    return functions;
  }

  extractFunctionBody(content, startIndex) {
    // Simplified function body extraction
    let braceCount = 0;
    let inFunction = false;
    let body = '';
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{') {
        braceCount++;
        inFunction = true;
      }
      
      if (inFunction) {
        body += char;
      }
      
      if (char === '}') {
        braceCount--;
        if (braceCount === 0 && inFunction) {
          break;
        }
      }
    }
    
    return body;
  }

  countParameters(functionSignature) {
    const paramMatch = functionSignature.match(/\(([^)]*)\)/);
    if (!paramMatch || !paramMatch[1].trim()) return 0;
    
    return paramMatch[1].split(',').filter(param => param.trim() !== '').length;
  }

  analyzeClasses(content, filePath) {
    const classes = [];
    const classRegex = /class\s+(\w+)/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const startIndex = match.index;
      
      // Extract class body (simplified)
      const classBody = this.extractClassBody(content, startIndex);
      const methods = this.analyzeFunctions(classBody, filePath);
      
      classes.push({
        name: className,
        file: filePath,
        methods: methods.length,
        complexity: methods.reduce((sum, method) => sum + method.complexity, 0),
        lines: classBody.split('\n').length,
        cohesion: this.calculateClassCohesion(classBody),
        responsibilities: this.countClassResponsibilities(classBody)
      });
    }

    return classes;
  }

  extractClassBody(content, startIndex) {
    // Similar to extractFunctionBody but for classes
    return this.extractFunctionBody(content, startIndex);
  }

  calculateClassCohesion(classBody) {
    // Simplified cohesion calculation - ratio of methods using instance variables
    const methods = (classBody.match(/\w+\s*\([^)]*\)\s*\{/g) || []).length;
    const thisReferences = (classBody.match(/this\.\w+/g) || []).length;
    
    return methods > 0 ? Math.min(100, Math.round((thisReferences / methods) * 10)) : 0;
  }

  countClassResponsibilities(classBody) {
    // Count different types of operations as responsibilities
    const responsibilities = [
      /get\w+\(/g,    // getters
      /set\w+\(/g,    // setters
      /validate\w*/g, // validation
      /save|update|delete/g, // persistence
      /render|draw|display/g, // presentation
      /calculate|compute/g    // computation
    ];

    const responsibilityCount = responsibilities.reduce((count, pattern) => {
      const matches = classBody.match(pattern);
      return count + (matches ? 1 : 0);
    }, 0);
    
    // Ensure classes with methods have at least 1 responsibility
    const methodCount = (classBody.match(/\w+\s*\([^)]*\)\s*\{/g) || []).length;
    return Math.max(responsibilityCount, methodCount > 0 ? 1 : 0);
  }

  calculateNestingLevel(content) {
    const lines = content.split('\n');
    let maxNesting = 0;
    let currentNesting = 0;

    lines.forEach(line => {
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      
      currentNesting += openBraces - closeBraces;
      maxNesting = Math.max(maxNesting, currentNesting);
    });

    return maxNesting;
  }

  calculateCohesion(content) {
    // Simplified cohesion metric
    const variables = (content.match(/\b(?:var|let|const)\s+(\w+)/g) || []).length;
    const variableUsages = (content.match(/\b\w+\b/g) || []).length;
    
    return variables > 0 ? Math.min(100, Math.round((variableUsages / variables) / 10)) : 0;
  }

  calculateCoupling(content) {
    // Count imports and external references
    const imports = (content.match(/(?:import|require)\s*\([^)]+\)|from\s+['"][^'"]+['"]/g) || []).length;
    const externalCalls = (content.match(/\w+\.\w+\(/g) || []).length;
    
    return imports + Math.floor(externalCalls / 5); // Normalize external calls
  }

  calculateFileMaintainabilityIndex(metrics) {
    // Microsoft's Maintainability Index formula (simplified)
    const MI = Math.max(0, 
      171 - 
      5.2 * Math.log(metrics.cyclomaticComplexity) - 
      0.23 * metrics.cyclomaticComplexity - 
      16.2 * Math.log(metrics.linesOfCode) +
      50 * Math.sin(Math.sqrt(2.4 * (metrics.commentLines / Math.max(1, metrics.linesOfCode))))
    );
    
    return Math.round(MI);
  }

  calculateProjectMaintainability(metrics) {
    const avgComplexity = metrics.fileComplexity.length > 0 ?
      metrics.fileComplexity.reduce((sum, file) => sum + file.complexity, 0) / metrics.fileComplexity.length : 0;

    const avgMaintainability = metrics.fileComplexity.length > 0 ?
      metrics.fileComplexity.reduce((sum, file) => sum + file.maintainabilityIndex, 0) / metrics.fileComplexity.length : 0;

    return {
      averageComplexity: Math.round(avgComplexity),
      averageMaintainabilityIndex: Math.round(avgMaintainability),
      complexityTrend: this.assessComplexityTrend(avgComplexity),
      maintainabilityLevel: this.categorializeMaintainability(avgMaintainability),
      riskLevel: this.assessMaintenanceRisk(avgComplexity, avgMaintainability)
    };
  }

  assessComplexityTrend(complexity) {
    if (complexity < 10) return 'low';
    if (complexity < 20) return 'moderate';
    if (complexity < 30) return 'high';
    return 'critical';
  }

  categorializeMaintainability(maintainabilityIndex) {
    if (maintainabilityIndex >= 85) return 'excellent';
    if (maintainabilityIndex >= 70) return 'good';
    if (maintainabilityIndex >= 50) return 'fair';
    if (maintainabilityIndex >= 25) return 'poor';
    return 'critical';
  }

  assessMaintenanceRisk(complexity, maintainability) {
    if (complexity > 30 || maintainability < 25) return 'critical';
    if (complexity > 20 || maintainability < 50) return 'high';
    if (complexity > 10 || maintainability < 70) return 'medium';
    return 'low';
  }

  async assessTechnicalDebt(files) {
    const debt = {
      totalDebt: 0,
      debtRatio: 0,
      categories: {
        codeSmells: { count: 0, debt: 0 },
        duplicatedCode: { count: 0, debt: 0 },
        complexCode: { count: 0, debt: 0 },
        documentationDebt: { count: 0, debt: 0 },
        testDebt: { count: 0, debt: 0 },
        architecturalDebt: { count: 0, debt: 0 }
      },
      issues: [],
      prioritizedTasks: [],
      estimatedRemediationEffort: 0
    };

    for (const file of files) {
      const fileDebt = await this.assessFileDebt(file);
      
      debt.totalDebt += fileDebt.totalDebt;
      debt.issues.push(...fileDebt.issues);
      
      // Aggregate category debts
      Object.keys(debt.categories).forEach(category => {
        if (fileDebt.categories[category]) {
          debt.categories[category].count += fileDebt.categories[category].count;
          debt.categories[category].debt += fileDebt.categories[category].debt;
        }
      });
    }

    // Calculate debt ratio (debt time / total development time estimate), capped at 100%
    const totalLOC = files.reduce((sum, file) => sum + this.countLines(file.content), 0);
    const estimatedDevTime = totalLOC * 0.5; // 0.5 minutes per line estimate
    const rawRatio = estimatedDevTime > 0 ? (debt.totalDebt / estimatedDevTime) * 100 : 0;
    debt.debtRatio = Math.min(100, Math.round(rawRatio));

    debt.prioritizedTasks = this.prioritizeTechnicalDebtTasks(debt.issues);
    debt.estimatedRemediationEffort = this.estimateRemediationEffort(debt.issues);

    return debt;
  }

  async assessFileDebt(file) {
    const content = file.content;
    const lines = content.split('\n');
    
    const fileDebt = {
      totalDebt: 0,
      categories: {
        codeSmells: { count: 0, debt: 0 },
        duplicatedCode: { count: 0, debt: 0 },
        complexCode: { count: 0, debt: 0 },
        documentationDebt: { count: 0, debt: 0 },
        testDebt: { count: 0, debt: 0 },
        architecturalDebt: { count: 0, debt: 0 }
      },
      issues: []
    };

    // Code smells detection
    const codeSmells = await this.detectCodeSmellsInFile(file) || [];
    fileDebt.categories.codeSmells.count = codeSmells.length;
    fileDebt.categories.codeSmells.debt = codeSmells.length * 30; // 30 minutes per smell
    if (codeSmells.length > 0) {
      fileDebt.issues.push(...codeSmells);
    }

    // Complex code detection
    const complexity = this.calculateFileComplexity(file);
    if (complexity > 20) {
      const complexDebt = (complexity - 20) * 15; // 15 minutes per complexity point above threshold
      fileDebt.categories.complexCode.count = 1;
      fileDebt.categories.complexCode.debt = complexDebt;
      fileDebt.issues.push({
        type: 'Complex Code',
        file: file.path,
        severity: complexity > 30 ? 'high' : 'medium',
        description: `High cyclomatic complexity: ${complexity}`,
        effort: complexDebt,
        recommendation: 'Break down complex functions and reduce nesting'
      });
    }

    // Documentation debt
    const commentRatio = this.countCommentLines(lines) / lines.length;
    if (commentRatio < 0.1) { // Less than 10% comments
      const docDebt = 60; // 1 hour for documentation
      fileDebt.categories.documentationDebt.count = 1;
      fileDebt.categories.documentationDebt.debt = docDebt;
      fileDebt.issues.push({
        type: 'Documentation Debt',
        file: file.path,
        severity: 'low',
        description: 'Insufficient code documentation',
        effort: docDebt,
        recommendation: 'Add comprehensive comments and documentation'
      });
    }

    // TODO/FIXME/HACK detection
    const todoDebt = this.detectTodoDebt(lines, file.path);
    if (todoDebt.length > 0) {
      fileDebt.categories.architecturalDebt.count = todoDebt.length;
      fileDebt.categories.architecturalDebt.debt = todoDebt.length * 45; // 45 minutes per TODO
      fileDebt.issues.push(...todoDebt);
    }

    fileDebt.totalDebt = Object.values(fileDebt.categories).reduce((sum, cat) => sum + cat.debt, 0);

    return fileDebt;
  }

  calculateFileComplexity(file) {
    return this.calculateCyclomaticComplexity(file.content);
  }

  async detectCodeSmellsInFile(file) {
    return await this.detectCodeSmells([file]); // Reuse existing method
  }

  detectTodoDebt(lines, filePath) {
    const todoDebt = [];
    const patterns = [
      { regex: /todo[\s:]/i, type: 'TODO', severity: 'medium', effort: 45 },
      { regex: /fixme[\s:]/i, type: 'FIXME', severity: 'high', effort: 60 },
      { regex: /hack[\s:]/i, type: 'HACK', severity: 'high', effort: 90 },
      { regex: /xxx[\s:]/i, type: 'XXX', severity: 'medium', effort: 30 }
    ];

    lines.forEach((line, index) => {
      patterns.forEach(pattern => {
        if (pattern.regex.test(line)) {
          todoDebt.push({
            type: pattern.type,
            file: filePath,
            line: index + 1,
            severity: pattern.severity,
            description: `${pattern.type} comment indicates incomplete work`,
            content: line.trim(),
            effort: pattern.effort,
            recommendation: `Complete or remove ${pattern.type} item`
          });
        }
      });
    });

    return todoDebt;
  }

  prioritizeTechnicalDebtTasks(issues) {
    return issues
      .sort((a, b) => {
        // Priority: severity weight + effort impact
        const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        const scoreA = severityWeight[a.severity] * 10 + (a.effort || 30);
        const scoreB = severityWeight[b.severity] * 10 + (b.effort || 30);
        return scoreB - scoreA;
      })
      .slice(0, 10) // Top 10 priority items
      .map((issue, index) => ({
        priority: index + 1,
        ...issue,
        estimatedROI: this.calculateDebtROI(issue)
      }));
  }

  calculateDebtROI(issue) {
    // Simple ROI calculation: impact / effort
    const impactScore = { critical: 100, high: 75, medium: 50, low: 25 };
    const impact = impactScore[issue.severity] || 25;
    const effort = issue.effort || 30;
    
    return Math.round((impact / effort) * 100) / 100;
  }

  estimateRemediationEffort(issues) {
    return issues.reduce((total, issue) => total + (issue.effort || 30), 0);
  }

  calculateMaintainabilityIndex(files) {
    if (files.length === 0) return 0;
    
    const fileIndices = files.map(file => {
      const complexity = this.calculateCyclomaticComplexity(file.content);
      const loc = this.countLines(file.content);
      const commentRatio = this.countCommentLines(file.content.split('\n')) / loc;
      
      return this.calculateFileMaintainabilityIndex({
        cyclomaticComplexity: complexity,
        linesOfCode: loc,
        commentLines: Math.round(loc * commentRatio)
      });
    });

    return Math.round(fileIndices.reduce((sum, index) => sum + index, 0) / fileIndices.length);
  }

  async detectCodeSmells(files) {
    const allSmells = [];

    for (const file of files) {
      const content = file.content;
      const lines = content.split('\n');

      // Long method smell
      const functions = this.analyzeFunctions(content, file.path);
      const longMethods = functions.filter(fn => fn.lines > 50);
      longMethods.forEach(method => {
        allSmells.push({
          type: 'Long Method',
          file: file.path,
          function: method.name,
          severity: 'medium',
          description: `Method ${method.name} has ${method.lines} lines`,
          recommendation: 'Break down into smaller, focused methods',
          effort: method.lines * 2 // 2 minutes per line to refactor
        });
      });

      // God class smell
      const classes = this.analyzeClasses(content, file.path);
      const godClasses = classes.filter(cls => cls.methods > 20 || cls.lines > 500);
      godClasses.forEach(cls => {
        allSmells.push({
          type: 'God Class',
          file: file.path,
          class: cls.name,
          severity: 'high',
          description: `Class ${cls.name} has ${cls.methods} methods and ${cls.lines} lines`,
          recommendation: 'Split into multiple classes with single responsibilities',
          effort: cls.methods * 15 // 15 minutes per method to refactor
        });
      });

      // Deep nesting smell
      const maxNesting = this.calculateNestingLevel(content);
      if (maxNesting > 4) {
        allSmells.push({
          type: 'Deep Nesting',
          file: file.path,
          severity: maxNesting > 6 ? 'high' : 'medium',
          description: `Maximum nesting level: ${maxNesting}`,
          recommendation: 'Reduce nesting using early returns and guard clauses',
          effort: maxNesting * 20
        });
      }

      // Large parameter list smell
      const longParamMethods = functions.filter(fn => fn.parameters > 5);
      longParamMethods.forEach(method => {
        allSmells.push({
          type: 'Long Parameter List',
          file: file.path,
          function: method.name,
          severity: 'medium',
          description: `Method ${method.name} has ${method.parameters} parameters`,
          recommendation: 'Use parameter objects or dependency injection',
          effort: 45
        });
      });

      // Duplicate code smell (simplified detection)
      const duplicateLines = this.detectDuplicateCode(lines, file.path);
      if (duplicateLines.length > 0) {
        allSmells.push({
          type: 'Duplicate Code',
          file: file.path,
          severity: 'medium',
          description: `${duplicateLines.length} potentially duplicated code blocks`,
          recommendation: 'Extract common code into shared functions',
          effort: duplicateLines.length * 30
        });
      }
    }

    return allSmells;
  }

  detectDuplicateCode(lines, filePath) {
    // Simplified duplicate detection - look for repeated line patterns
    const duplicates = [];
    const lineGroups = {};

    lines.forEach((line, index) => {
      const normalizedLine = line.trim().replace(/\s+/g, ' ');
      if (normalizedLine.length > 20) { // Only check substantial lines
        if (!lineGroups[normalizedLine]) {
          lineGroups[normalizedLine] = [];
        }
        lineGroups[normalizedLine].push(index + 1);
      }
    });

    Object.entries(lineGroups).forEach(([line, occurrences]) => {
      if (occurrences.length > 1) {
        duplicates.push({
          line,
          occurrences,
          count: occurrences.length
        });
      }
    });

    return duplicates;
  }

  identifyRefactoringOpportunities(files) {
    const opportunities = [];

    files.forEach(file => {
      const content = file.content;
      const complexity = this.calculateCyclomaticComplexity(content);
      
      // Extract method opportunities
      if (complexity > 8) {
        opportunities.push({
          type: 'Extract Method',
          file: file.path,
          priority: 'high',
          description: 'High complexity suggests opportunities for method extraction',
          benefits: ['Improved readability', 'Better testability', 'Reduced complexity'],
          effort: 'medium',
          impact: 'high'
        });
      }

      // Replace conditional with polymorphism
      const switchStatements = (content.match(/switch\s*\([^)]+\)/g) || []).length;
      if (switchStatements > 2) {
        opportunities.push({
          type: 'Replace Conditional with Polymorphism',
          file: file.path,
          priority: 'medium',
          description: `${switchStatements} switch statements could be replaced with polymorphism`,
          benefits: ['Better extensibility', 'Reduced coupling', 'Easier maintenance'],
          effort: 'high',
          impact: 'high'
        });
      }

      // Introduce parameter object
      const functions = this.analyzeFunctions(content, file.path);
      const longParamFunctions = functions.filter(fn => fn.parameters > 4);
      if (longParamFunctions.length > 0) {
        opportunities.push({
          type: 'Introduce Parameter Object',
          file: file.path,
          priority: 'medium',
          description: `${longParamFunctions.length} functions with long parameter lists`,
          benefits: ['Cleaner interfaces', 'Better parameter grouping', 'Easier to extend'],
          effort: 'medium',
          impact: 'medium'
        });
      }
    });

    return opportunities.slice(0, 20); // Top 20 opportunities
  }

  analyzeComplexityTrends(files) {
    // Simplified trend analysis based on file characteristics
    const complexityMetrics = files.map(file => this.calculateCyclomaticComplexity(file.content));
    const avgComplexity = complexityMetrics.reduce((a, b) => a + b, 0) / complexityMetrics.length;
    
    const trend = {
      average: Math.round(avgComplexity),
      distribution: this.getComplexityDistribution(files),
      trend: this.assessTrendDirection(avgComplexity),
      hotspots: this.identifyComplexityHotspots(files),
      recommendations: this.generateTrendRecommendations(avgComplexity)
    };

    return trend;
  }

  assessTrendDirection(avgComplexity) {
    // Simple heuristic based on complexity level
    if (avgComplexity > 25) return 'deteriorating';
    if (avgComplexity > 15) return 'stable_high';
    if (avgComplexity > 10) return 'stable_medium';
    return 'stable_low';
  }

  identifyComplexityHotspots(files) {
    return files
      .map(file => ({
        file: file.path,
        complexity: this.calculateCyclomaticComplexity(file.content),
        lines: this.countLines(file.content)
      }))
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 10) // Top 10 most complex files
      .map(hotspot => ({
        ...hotspot,
        severity: hotspot.complexity > 30 ? 'critical' : hotspot.complexity > 20 ? 'high' : 'medium',
        recommendation: this.getHotspotRecommendation(hotspot.complexity)
      }));
  }

  getHotspotRecommendation(complexity) {
    if (complexity > 30) return 'Immediate refactoring required - break into smaller components';
    if (complexity > 20) return 'Schedule refactoring - extract methods and reduce nesting';
    return 'Monitor and consider refactoring opportunities';
  }

  generateTrendRecommendations(avgComplexity) {
    const recommendations = [];

    if (avgComplexity > 25) {
      recommendations.push('Implement code complexity gates in CI/CD pipeline');
      recommendations.push('Schedule regular refactoring sessions');
      recommendations.push('Conduct architecture review');
    } else if (avgComplexity > 15) {
      recommendations.push('Monitor complexity metrics regularly');
      recommendations.push('Establish complexity thresholds for new code');
    } else {
      recommendations.push('Maintain current practices');
      recommendations.push('Consider sharing best practices with other teams');
    }

    return recommendations;
  }

  evaluateQualityGates(files) {
    const gates = [
      {
        name: 'Cyclomatic Complexity',
        threshold: 15,
        actual: files.reduce((sum, file) => sum + this.calculateCyclomaticComplexity(file.content), 0) / files.length,
        unit: 'average'
      },
      {
        name: 'Code Coverage',
        threshold: 80,
        actual: 65, // Would need actual test coverage data
        unit: 'percentage'
      },
      {
        name: 'Technical Debt Ratio',
        threshold: 5,
        actual: 8, // Would be calculated from actual debt assessment
        unit: 'percentage'
      },
      {
        name: 'Maintainability Index',
        threshold: 70,
        actual: this.calculateMaintainabilityIndex(files),
        unit: 'index'
      }
    ];

    const results = gates.map(gate => ({
      ...gate,
      status: gate.actual >= gate.threshold ? 'pass' : 'fail',
      gap: gate.threshold - gate.actual
    }));

    const passed = results.filter(gate => gate.status === 'pass').length;
    const failed = results.filter(gate => gate.status === 'fail').length;

    return {
      gates: results,
      passed,
      failed,
      status: failed === 0 ? 'pass' : 'fail',
      overallScore: Math.round((passed / gates.length) * 100)
    };
  }

  generateComplexityRecommendations(files) {
    const recommendations = [];
    const avgComplexity = files.reduce((sum, file) => 
      sum + this.calculateCyclomaticComplexity(file.content), 0) / files.length;

    // Complexity-based recommendations
    if (avgComplexity > 20) {
      recommendations.push({
        priority: 'high',
        category: 'complexity',
        title: 'Reduce Code Complexity',
        description: `Average cyclomatic complexity is ${Math.round(avgComplexity)}, well above recommended threshold of 10.`,
        actions: [
          'Break down complex functions into smaller methods',
          'Reduce nesting levels using early returns',
          'Apply single responsibility principle'
        ],
        impact: 'High - improves maintainability and reduces bugs'
      });
    }

    // Technical debt recommendations
    recommendations.push({
      priority: 'medium',
      category: 'technical_debt',
      title: 'Address Technical Debt',
      description: 'Regular technical debt management prevents code degradation.',
      actions: [
        'Schedule regular refactoring sessions',
        'Prioritize high-impact debt items',
        'Implement automated code quality checks'
      ],
      impact: 'Medium - prevents future maintenance costs'
    });

    // Code quality recommendations
    const maintainabilityIndex = this.calculateMaintainabilityIndex(files);
    if (maintainabilityIndex < 70) {
      recommendations.push({
        priority: 'medium',
        category: 'maintainability',
        title: 'Improve Code Maintainability',
        description: `Maintainability index is ${maintainabilityIndex}, below recommended threshold of 70.`,
        actions: [
          'Increase code documentation',
          'Improve test coverage',
          'Reduce code duplication'
        ],
        impact: 'Medium - reduces long-term maintenance effort'
      });
    }

    return recommendations;
  }

  loadComplexityThresholds() {
    return {
      cyclomaticComplexity: {
        low: 10,
        medium: 20,
        high: 30
      },
      cognitiveComplexity: {
        low: 15,
        medium: 25,
        high: 40
      },
      maintainabilityIndex: {
        excellent: 85,
        good: 70,
        fair: 50,
        poor: 25
      },
      nestingLevel: {
        acceptable: 4,
        concerning: 6,
        critical: 8
      }
    };
  }

  loadTechnicalDebtPatterns() {
    return {
      codeSmells: [
        'Long Method', 'Large Class', 'Long Parameter List', 
        'Duplicate Code', 'Dead Code', 'Speculative Generality'
      ],
      antiPatterns: [
        'God Object', 'Spaghetti Code', 'Copy and Paste Programming',
        'Magic Numbers', 'Shotgun Surgery'
      ],
      architecturalDebt: [
        'Circular Dependencies', 'Tight Coupling', 'Missing Abstraction',
        'Inappropriate Intimacy', 'Feature Envy'
      ]
    };
  }
}

module.exports = ComplexityAnalyzer;