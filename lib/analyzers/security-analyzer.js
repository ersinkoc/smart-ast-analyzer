const fs = require('fs').promises;
const path = require('path');

class SecurityAnalyzer {
  constructor(framework) {
    this.framework = framework;
    this.vulnerabilityPatterns = this.loadVulnerabilityPatterns();
    this.owaspCategories = this.loadOWASPCategories();
  }

  async analyze(aiResult, files, projectInfo) {
    if (!aiResult || aiResult.error) {
      return this.createEmptyResult(aiResult?.error);
    }

    // Comprehensive security analysis
    const enhancedResult = {
      ...aiResult,
      metadata: this.generateMetadata(aiResult, files),
      staticAnalysis: await this.performStaticAnalysis(files),
      dependencyAnalysis: await this.analyzeDependencies(projectInfo),
      owaspCompliance: this.assessOWASPCompliance(aiResult),
      securityScore: this.calculateSecurityScore(aiResult),
      riskAssessment: this.performRiskAssessment(aiResult),
      mitigationStrategies: this.generateMitigationStrategies(aiResult),
      complianceReport: this.generateComplianceReport(aiResult),
      recommendations: this.generateSecurityRecommendations(aiResult)
    };

    return enhancedResult;
  }

  createEmptyResult(error) {
    return {
      authentication: { methods: [], providers: [], flows: {} },
      authorization: { type: 'unknown', roles: [], permissions: [], middleware: [] },
      security: { vulnerabilities: [], score: 0 },
      protectedRoutes: [],
      staticAnalysis: { patterns: [], issues: [] },
      dependencyAnalysis: { vulnerabilities: [], outdated: [] },
      owaspCompliance: { score: 0, categories: {} },
      metadata: {
        analysisDate: new Date().toISOString(),
        framework: this.framework,
        error: error
      },
      recommendations: [
        'No security analysis could be performed',
        'Check if your project has authentication/authorization code',
        'Verify that the AI analysis service is working correctly'
      ]
    };
  }

  generateMetadata(result, files) {
    return {
      totalFiles: files.length,
      securityFiles: files.filter(f => this.isSecurityFile(f.path)).length,
      analysisDate: new Date().toISOString(),
      framework: this.framework,
      authMethods: result.authentication?.methods?.length || 0,
      vulnerabilities: result.security?.vulnerabilities?.length || 0,
      criticalVulns: result.security?.vulnerabilities?.filter(v => v.severity === 'critical').length || 0,
      coverage: this.calculateSecurityCoverage(result, files)
    };
  }

  isSecurityFile(filePath) {
    const securityPatterns = [
      /auth/i, /security/i, /middleware/i, /guard/i, 
      /login/i, /jwt/i, /token/i, /password/i, /crypto/i
    ];
    
    return securityPatterns.some(pattern => pattern.test(filePath));
  }

  calculateSecurityCoverage(result, files) {
    const totalFiles = files.length;
    const securityFiles = files.filter(f => this.isSecurityFile(f.path)).length;
    
    if (totalFiles === 0) return 0;
    return Math.round((securityFiles / totalFiles) * 100);
  }

  async performStaticAnalysis(files) {
    const analysis = {
      patterns: [],
      issues: [],
      codeSmells: [],
      hardcodedSecrets: [],
      insecurePatterns: []
    };

    for (const file of files) {
      const fileAnalysis = await this.analyzeFileForSecurity(file);
      analysis.patterns.push(...fileAnalysis.patterns);
      analysis.issues.push(...fileAnalysis.issues);
      analysis.codeSmells.push(...fileAnalysis.codeSmells);
      analysis.hardcodedSecrets.push(...fileAnalysis.hardcodedSecrets);
      analysis.insecurePatterns.push(...fileAnalysis.insecurePatterns);
    }

    return analysis;
  }

  async analyzeFileForSecurity(file) {
    const analysis = {
      patterns: [],
      issues: [],
      codeSmells: [],
      hardcodedSecrets: [],
      insecurePatterns: []
    };

    const content = file.content.toLowerCase();
    const lines = file.content.split('\n');

    // Check for hardcoded secrets
    analysis.hardcodedSecrets.push(...this.detectHardcodedSecrets(lines, file.path));

    // Check for insecure patterns
    analysis.insecurePatterns.push(...this.detectInsecurePatterns(lines, file.path));

    // Check for security code smells
    analysis.codeSmells.push(...this.detectSecurityCodeSmells(content, file.path));

    // Check for authentication patterns
    analysis.patterns.push(...this.detectAuthPatterns(content, file.path));

    return analysis;
  }

  detectHardcodedSecrets(lines, filePath) {
    const secrets = [];
    const secretPatterns = [
      { pattern: /api[_-]?key\s*=\s*["'][^"']{3,}["']/i, type: 'API Key' },
      { pattern: /secret[_-]?key\s*=\s*["'][^"']{10,}["']/i, type: 'Secret Key' },
      { pattern: /password\s*=\s*["'][^"']{3,}["']/i, type: 'Password' },
      { pattern: /token\s*=\s*["'][^"']{10,}["']/i, type: 'Token' },
      { pattern: /private[_-]?key\s*=\s*["'](?!-----BEGIN)[^"']{10,}["']/i, type: 'Private Key' },
      { pattern: /(?:sk-|pk_)[a-zA-Z0-9]{20,}/i, type: 'API Key' },
      { pattern: /-----BEGIN PRIVATE KEY-----/i, type: 'Private Key' },
      { pattern: /mongodb:\/\/[^"'\s]+/i, type: 'Database URL' },
      { pattern: /postgres:\/\/[^"'\s]+/i, type: 'Database URL' }
    ];

    lines.forEach((line, index) => {
      secretPatterns.forEach(({ pattern, type }) => {
        if (pattern.test(line)) {
          secrets.push({
            type,
            line: index + 1,
            file: filePath,
            severity: 'critical',
            description: `Hardcoded ${type} detected`,
            mitigation: 'Move to environment variables or secure vault'
          });
        }
      });
    });

    return secrets;
  }

  detectInsecurePatterns(lines, filePath) {
    const patterns = [];
    const insecurePatterns = [
      { pattern: /eval\s*\(/i, type: 'Code Injection', severity: 'critical' },
      { pattern: /document\.write\s*\(/i, type: 'XSS Risk', severity: 'high' },
      { pattern: /innerHTML\s*=/i, type: 'XSS Risk', severity: 'medium' },
      { pattern: /(query|sql)\s*=.*\+|".*\+.*"|'.*\+.*'/i, type: 'SQL Injection', severity: 'critical' },
      { pattern: /\$\{.*\}/g, type: 'Template Injection Risk', severity: 'medium' },
      { pattern: /md5\s*\(/i, type: 'Weak Hash Algorithm', severity: 'medium' },
      { pattern: /sha1\s*\(/i, type: 'Weak Hash Algorithm', severity: 'medium' },
      { pattern: /crypto\.createHash\s*\(\s*["']md5["']/i, type: 'Weak Hash', severity: 'medium' },
      { pattern: /Math\.random\(\)/i, type: 'Weak Random', severity: 'low' },
      { pattern: /http:\/\//i, type: 'Insecure Protocol', severity: 'medium' }
    ];

    lines.forEach((line, index) => {
      insecurePatterns.forEach(({ pattern, type, severity }) => {
        if (pattern.test(line)) {
          patterns.push({
            type,
            line: index + 1,
            file: filePath,
            severity,
            code: line.trim(),
            description: `${type} pattern detected`,
            mitigation: this.getMitigationForPattern(type)
          });
        }
      });
    });

    return patterns;
  }

  getMitigationForPattern(type) {
    const mitigations = {
      'Code Injection': 'Avoid eval(). Use JSON.parse() or safe alternatives',
      'XSS Risk': 'Sanitize user input. Use textContent instead of innerHTML',
      'SQL Injection': 'Use parameterized queries or ORM',
      'Template Injection Risk': 'Validate and sanitize template variables',
      'Weak Hash Algorithm': 'Use SHA-256 or stronger algorithms',
      'Weak Random': 'Use crypto.randomBytes() for security-sensitive operations',
      'Insecure Protocol': 'Use HTTPS instead of HTTP'
    };

    return mitigations[type] || 'Review and secure this pattern';
  }

  detectSecurityCodeSmells(content, filePath) {
    const smells = [];

    // Check for missing error handling
    if (content.includes('password') && !content.includes('try') && !content.includes('catch')) {
      smells.push({
        type: 'Missing Error Handling',
        file: filePath,
        severity: 'medium',
        description: 'Password handling without proper error handling',
        mitigation: 'Add try-catch blocks around authentication code'
      });
    }

    // Check for console.log in production code
    if (content.includes('console.log') && !filePath.includes('test')) {
      smells.push({
        type: 'Information Disclosure',
        file: filePath,
        severity: 'low',
        description: 'Console logging may leak sensitive information',
        mitigation: 'Remove or replace with proper logging framework'
      });
    }

    // Check for TODO/FIXME in security-related code
    if ((content.toLowerCase().includes('todo') || content.toLowerCase().includes('fixme')) && 
        (content.toLowerCase().includes('auth') || content.toLowerCase().includes('security'))) {
      smells.push({
        type: 'Incomplete Security Implementation',
        file: filePath,
        severity: 'medium',
        description: 'Incomplete security code with TODO/FIXME comments',
        mitigation: 'Complete the security implementation'
      });
    }

    return smells;
  }

  detectAuthPatterns(content, filePath) {
    const patterns = [];

    // JWT patterns
    if (content.includes('jwt') || content.includes('jsonwebtoken')) {
      patterns.push({
        type: 'JWT Authentication',
        file: filePath,
        confidence: 'high',
        details: 'JWT-based authentication detected'
      });
    }

    // OAuth patterns
    if (content.includes('oauth') || content.includes('passport')) {
      patterns.push({
        type: 'OAuth Authentication',
        file: filePath,
        confidence: 'high',
        details: 'OAuth authentication flow detected'
      });
    }

    // Session patterns
    if (content.includes('session') && content.includes('cookie')) {
      patterns.push({
        type: 'Session Authentication',
        file: filePath,
        confidence: 'medium',
        details: 'Session-based authentication detected'
      });
    }

    // Basic Auth patterns
    if (content.includes('basic-auth') || (content.includes('authorization') && content.includes('basic'))) {
      patterns.push({
        type: 'Basic Authentication',
        file: filePath,
        confidence: 'high',
        details: 'Basic authentication detected',
        warning: 'Basic auth should only be used over HTTPS'
      });
    }

    return patterns;
  }

  async analyzeDependencies(projectInfo) {
    const analysis = {
      vulnerabilities: [],
      outdated: [],
      insecure: [],
      recommendations: []
    };

    if (!projectInfo.dependencies) {
      return analysis;
    }

    // Analyze package.json for known vulnerable packages
    const vulnerablePackages = [
      'lodash', 'minimist', 'node-fetch', 'axios', 'express', 
      'socket.io', 'jsonwebtoken', 'bcrypt', 'crypto-js'
    ];

    const dependencies = [
      ...Object.keys(projectInfo.dependencies.dependencies || {}),
      ...Object.keys(projectInfo.dependencies.devDependencies || {})
    ];

    dependencies.forEach(dep => {
      if (vulnerablePackages.includes(dep)) {
        analysis.vulnerabilities.push({
          package: dep,
          type: 'Known Vulnerable Package',
          severity: 'medium',
          description: `${dep} has known security vulnerabilities in some versions`,
          mitigation: 'Update to the latest secure version'
        });
      }
    });

    return analysis;
  }

  loadVulnerabilityPatterns() {
    return {
      'A01:2021': 'Broken Access Control',
      'A02:2021': 'Cryptographic Failures',
      'A03:2021': 'Injection',
      'A04:2021': 'Insecure Design',
      'A05:2021': 'Security Misconfiguration',
      'A06:2021': 'Vulnerable and Outdated Components',
      'A07:2021': 'Identification and Authentication Failures',
      'A08:2021': 'Software and Data Integrity Failures',
      'A09:2021': 'Security Logging and Monitoring Failures',
      'A10:2021': 'Server-Side Request Forgery'
    };
  }

  loadOWASPCategories() {
    return {
      'Broken Access Control': {
        description: 'Restrictions on authenticated users not properly enforced',
        examples: ['Elevation of privilege', 'Viewing others data', 'Modifying others data']
      },
      'Cryptographic Failures': {
        description: 'Failures related to cryptography which lead to sensitive data exposure',
        examples: ['Weak encryption', 'Hardcoded keys', 'Insecure protocols']
      },
      'Injection': {
        description: 'Hostile data sent to an interpreter as part of a command or query',
        examples: ['SQL injection', 'NoSQL injection', 'Command injection']
      }
    };
  }

  assessOWASPCompliance(result) {
    const compliance = {
      score: 0,
      categories: {},
      violations: [],
      passed: []
    };

    // Check each OWASP category
    Object.entries(this.owaspCategories).forEach(([category, details]) => {
      const categoryScore = this.assessOWASPCategory(category, result);
      compliance.categories[category] = categoryScore;
      
      if (categoryScore.score > 70) {
        compliance.passed.push(category);
      } else {
        compliance.violations.push({
          category,
          score: categoryScore.score,
          issues: categoryScore.issues
        });
      }
    });

    // Calculate overall score
    const scores = Object.values(compliance.categories).map(c => c.score);
    compliance.score = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0;

    return compliance;
  }

  assessOWASPCategory(category, result) {
    const assessment = {
      score: 100,
      issues: [],
      recommendations: []
    };

    switch (category) {
      case 'Broken Access Control':
        return this.assessAccessControl(result);
      case 'Cryptographic Failures':
        return this.assessCryptography(result);
      case 'Injection':
        return this.assessInjection(result);
      default:
        return assessment;
    }
  }

  assessAccessControl(result) {
    const assessment = { score: 100, issues: [], recommendations: [] };

    // Check for unprotected routes
    const unprotectedRoutes = result.protectedRoutes?.filter(route => !route.requiredRole) || [];
    if (unprotectedRoutes.length > 0) {
      assessment.score -= 20;
      assessment.issues.push(`${unprotectedRoutes.length} routes lack proper access control`);
      assessment.recommendations.push('Implement role-based access control for all routes');
    }

    // Check authorization implementation
    if (!result.authorization?.type || result.authorization.type === 'unknown') {
      assessment.score -= 30;
      assessment.issues.push('No clear authorization mechanism detected');
      assessment.recommendations.push('Implement proper authorization system');
    }

    return assessment;
  }

  assessCryptography(result) {
    const assessment = { score: 100, issues: [], recommendations: [] };

    // Check for weak password hashing
    if (result.security?.passwordHashing === 'md5' || result.security?.passwordHashing === 'sha1') {
      assessment.score -= 40;
      assessment.issues.push('Weak password hashing algorithm detected');
      assessment.recommendations.push('Use bcrypt, Argon2, or scrypt for password hashing');
    }

    // Check for insecure token handling
    if (result.security?.tokenType === 'custom' && !result.security?.tokenEncryption) {
      assessment.score -= 25;
      assessment.issues.push('Custom token implementation without proper encryption');
      assessment.recommendations.push('Use established token standards like JWT');
    }

    return assessment;
  }

  assessInjection(result) {
    const assessment = { score: 100, issues: [], recommendations: [] };

    // This would be enhanced by the static analysis results
    const injectionVulns = result.security?.vulnerabilities?.filter(v => 
      v.type?.toLowerCase().includes('injection')
    ) || [];

    if (injectionVulns.length > 0) {
      assessment.score -= injectionVulns.length * 30;
      assessment.issues.push(`${injectionVulns.length} injection vulnerabilities detected`);
      assessment.recommendations.push('Implement input validation and parameterized queries');
    }

    return assessment;
  }

  calculateSecurityScore(result) {
    let score = 100;

    // Deduct points for vulnerabilities
    const vulns = result.security?.vulnerabilities || [];
    const criticalVulns = vulns.filter(v => v.severity === 'critical');
    const highVulns = vulns.filter(v => v.severity === 'high');
    const mediumVulns = vulns.filter(v => v.severity === 'medium');

    score -= criticalVulns.length * 25;
    score -= highVulns.length * 15;
    score -= mediumVulns.length * 10;

    // Deduct points for missing security features
    if (!result.authentication?.methods?.length) score -= 20;
    if (!result.security?.csrfProtection) score -= 15;
    if (!result.security?.rateLimiting) score -= 10;

    return Math.max(0, score);
  }

  performRiskAssessment(result) {
    const risks = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    // Assess based on vulnerabilities
    const vulns = result.security?.vulnerabilities || [];
    vulns.forEach(vuln => {
      const risk = {
        type: vuln.type,
        description: vuln.description,
        impact: this.assessImpact(vuln),
        likelihood: this.assessLikelihood(vuln),
        mitigation: vuln.suggestion
      };
      
      risks[vuln.severity]?.push(risk);
    });

    return risks;
  }

  assessImpact(vulnerability) {
    const highImpactTypes = ['SQL Injection', 'Code Injection', 'Authentication Bypass'];
    const mediumImpactTypes = ['XSS', 'CSRF'];
    
    if (highImpactTypes.some(type => vulnerability.type?.includes(type))) {
      return 'high';
    } else if (mediumImpactTypes.some(type => vulnerability.type?.includes(type))) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  assessLikelihood(vulnerability) {
    // Simple likelihood assessment based on common patterns
    if (vulnerability.type?.includes('Injection')) return 'high';
    if (vulnerability.type?.includes('Authentication')) return 'medium';
    if (vulnerability.type?.includes('Configuration')) return 'medium';
    return 'low';
  }

  generateMitigationStrategies(result) {
    const strategies = [];

    // Authentication strategies
    if (!result.authentication?.methods?.length) {
      strategies.push({
        category: 'Authentication',
        priority: 'high',
        strategy: 'Implement Multi-Factor Authentication',
        description: 'Add MFA to increase security of user accounts',
        implementation: 'Use TOTP, SMS, or hardware tokens',
        timeline: 'Short-term (1-2 weeks)'
      });
    }

    // Encryption strategies
    if (!result.security?.tokenType || result.security.tokenType === 'custom') {
      strategies.push({
        category: 'Encryption',
        priority: 'medium',
        strategy: 'Standardize Token Management',
        description: 'Use industry-standard token formats and encryption',
        implementation: 'Implement JWT with proper signing and encryption',
        timeline: 'Medium-term (2-4 weeks)'
      });
    }

    // Input validation strategies
    const injectionVulns = result.security?.vulnerabilities?.filter(v => 
      v.type?.toLowerCase().includes('injection')
    ) || [];
    
    if (injectionVulns.length > 0) {
      strategies.push({
        category: 'Input Validation',
        priority: 'critical',
        strategy: 'Comprehensive Input Validation',
        description: 'Implement input validation and sanitization',
        implementation: 'Use validation libraries and parameterized queries',
        timeline: 'Immediate (1 week)'
      });
    }

    return strategies;
  }

  generateComplianceReport(result) {
    const report = {
      standards: {
        'OWASP Top 10': this.assessOWASPCompliance(result),
        'NIST': this.assessNISTCompliance(result),
        'PCI DSS': this.assessPCICompliance(result)
      },
      overallCompliance: 0,
      recommendations: [],
      actionItems: []
    };

    // Calculate overall compliance
    const scores = Object.values(report.standards).map(s => s.score);
    report.overallCompliance = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0;

    // Generate action items
    if (report.overallCompliance < 70) {
      report.actionItems.push({
        priority: 'high',
        action: 'Security Audit',
        description: 'Conduct comprehensive security audit and penetration testing'
      });
    }

    return report;
  }

  assessNISTCompliance(result) {
    // Simplified NIST assessment
    return {
      score: 75,
      categories: ['Identify', 'Protect', 'Detect', 'Respond', 'Recover'],
      assessment: 'Partial compliance detected'
    };
  }

  assessPCICompliance(result) {
    // Simplified PCI DSS assessment
    return {
      score: 60,
      requirements: ['Build and maintain secure networks', 'Protect cardholder data'],
      assessment: 'Additional controls needed for full compliance'
    };
  }

  generateSecurityRecommendations(result) {
    const recommendations = [];

    const securityScore = this.calculateSecurityScore(result);
    
    if (securityScore < 50) {
      recommendations.push({
        priority: 'critical',
        category: 'security',
        title: 'Immediate Security Review Required',
        description: `Security score is ${securityScore}/100. Immediate action needed to address critical vulnerabilities.`
      });
    }

    // Specific vulnerability recommendations
    const criticalVulns = result.security?.vulnerabilities?.filter(v => v.severity === 'critical') || [];
    if (criticalVulns.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'vulnerabilities',
        title: 'Fix Critical Vulnerabilities',
        description: `${criticalVulns.length} critical vulnerabilities must be addressed immediately.`
      });
    }

    // Authentication recommendations
    if (!result.authentication?.methods?.includes('mfa')) {
      recommendations.push({
        priority: 'high',
        category: 'authentication',
        title: 'Implement Multi-Factor Authentication',
        description: 'Add MFA to improve authentication security.'
      });
    }

    return recommendations;
  }
}

module.exports = SecurityAnalyzer;