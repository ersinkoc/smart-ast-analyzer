#!/usr/bin/env node

/**
 * Advanced Example: Security Audit
 * 
 * This example demonstrates the comprehensive security analysis
 * capabilities including vulnerability detection, hardcoded secrets
 * scanning, and security scoring.
 */

const path = require('path');
const SmartASTAnalyzer = require('../lib/core/smart-ast-analyzer');

async function runSecurityAudit() {
  console.log('🛡️ Smart AST Analyzer - Security Audit Example\n');
  
  // Configuration optimized for security analysis
  const config = {
    ai: 'mock',
    verbose: true,
    output: path.join(__dirname, '../smart-ast-output'),
    
    // Focus on security scanning
    analysis: {
      type: 'security',
      deepAnalysis: true,
      security: {
        scanSecrets: true,
        checkVulnerabilities: true,
        checkXSS: true,
        checkSQLInjection: true,
        checkAuthentication: true,
        checkCSRF: true,
        validateInputs: true
      }
    }
  };
  
  try {
    const analyzer = new SmartASTAnalyzer(config);
    
    // For demonstration, we'll create some sample code with security issues
    const testProject = await createSecurityTestProject();
    
    console.log('🔍 Running comprehensive security audit...\n');
    console.log('📂 Analyzing test project with intentional security issues');
    console.log('🎯 Focus: Vulnerability detection and security best practices\n');
    
    // Run security-focused analysis
    const results = await analyzer.analyzeProject(testProject);
    
    // Display detailed security analysis
    displaySecurityFindings(results);
    
    // Show security recommendations
    displaySecurityRecommendations(results);
    
    // Display security score breakdown
    displaySecurityScore(results);
    
    console.log('\n📚 SECURITY LEARNING RESOURCES:');
    console.log('──────────────────────────────');
    console.log('🔗 OWASP Top 10: https://owasp.org/www-project-top-ten/');
    console.log('🔗 Node.js Security: https://nodejs.org/en/docs/guides/security/');
    console.log('🔗 Express Security: https://expressjs.com/en/advanced/best-practice-security.html');
    
    console.log('\n✅ Security audit complete!');
    
  } catch (error) {
    console.error('❌ Security audit failed:', error.message);
    process.exit(1);
  }
}

async function createSecurityTestProject() {
  // This would create sample files with security issues for demonstration
  // In a real scenario, you'd point to your actual project directory
  return path.join(__dirname, '..');
}

function displaySecurityFindings(results) {
  console.log('🔍 SECURITY VULNERABILITY FINDINGS');
  console.log('═══════════════════════════════════\n');
  
  const security = results.deepAnalysis?.security || results.security;
  if (!security) {
    console.log('❌ No security analysis data available\n');
    return;
  }
  
  const vulnerabilities = security.vulnerabilities || [];
  
  if (vulnerabilities.length === 0) {
    console.log('✅ No security vulnerabilities detected!\n');
    return;
  }
  
  console.log(`🚨 Total vulnerabilities found: ${vulnerabilities.length}\n`);
  
  // Group vulnerabilities by type and severity
  const groupedVulns = groupVulnerabilities(vulnerabilities);
  
  // Display by severity (Critical → High → Medium → Low)
  const severityOrder = ['critical', 'high', 'medium', 'low'];
  const severityEmojis = {
    critical: '🚨',
    high: '⚠️',
    medium: '📋',
    low: '📝'
  };
  
  severityOrder.forEach(severity => {
    const vulns = groupedVulns[severity];
    if (!vulns || vulns.length === 0) return;
    
    console.log(`${severityEmojis[severity]} ${severity.toUpperCase()} SEVERITY (${vulns.length}):`);
    console.log('─'.repeat(40));
    
    vulns.forEach((vuln, index) => {
      console.log(`${index + 1}. ${vuln.message}`);
      console.log(`   🎯 Type: ${vuln.type}`);
      console.log(`   📍 Location: ${vuln.file}${vuln.line ? `:${vuln.line}` : ''}`);
      
      if (vuln.suggestion) {
        console.log(`   💡 Fix: ${vuln.suggestion}`);
      }
      
      // Add specific examples for common vulnerability types
      if (vuln.type === 'dangerous-eval') {
        console.log('   📖 Learn: eval() executes arbitrary code and can lead to code injection');
        console.log('   🔧 Solution: Use JSON.parse() or safer alternatives');
      } else if (vuln.type === 'sql-injection') {
        console.log('   📖 Learn: Dynamic SQL queries can allow attackers to modify queries');
        console.log('   🔧 Solution: Use parameterized queries or ORM with sanitization');
      } else if (vuln.type === 'xss-innerHTML') {
        console.log('   📖 Learn: innerHTML can execute malicious scripts from user input');
        console.log('   🔧 Solution: Use textContent or sanitize HTML with DOMPurify');
      }
      
      console.log('');
    });
    
    console.log('');
  });
  
  // Show vulnerability types summary
  const typesSummary = vulnerabilities.reduce((acc, vuln) => {
    acc[vuln.type] = (acc[vuln.type] || 0) + 1;
    return acc;
  }, {});
  
  console.log('📊 VULNERABILITY TYPES SUMMARY:');
  console.log('─────────────────────────────────');
  Object.entries(typesSummary)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`   ${type.replace(/-/g, ' ').toUpperCase()}: ${count}`);
    });
  
  console.log('');
}

function displaySecurityRecommendations(results) {
  console.log('🎯 SECURITY RECOMMENDATIONS');
  console.log('═══════════════════════════\n');
  
  const security = results.deepAnalysis?.security || results.security;
  const vulnerabilities = security?.vulnerabilities || [];
  
  // Generate specific recommendations based on findings
  const recommendations = generateSecurityRecommendations(vulnerabilities);
  
  if (recommendations.length === 0) {
    console.log('✅ Great! No critical security improvements needed.\n');
    return;
  }
  
  console.log('Priority recommendations to improve security:\n');
  
  recommendations.forEach((rec, index) => {
    const priorityEmoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
    console.log(`${index + 1}. ${priorityEmoji} ${rec.title}`);
    console.log(`   📝 ${rec.description}`);
    console.log(`   ⏱️ Effort: ${rec.effort} | 📈 Impact: ${rec.impact}`);
    
    if (rec.steps?.length > 0) {
      console.log('   🔧 Implementation steps:');
      rec.steps.forEach(step => console.log(`      • ${step}`));
    }
    
    if (rec.resources?.length > 0) {
      console.log('   📚 Resources:');
      rec.resources.forEach(resource => console.log(`      🔗 ${resource}`));
    }
    
    console.log('');
  });
}

function displaySecurityScore(results) {
  console.log('📊 SECURITY SCORE ANALYSIS');
  console.log('═══════════════════════════\n');
  
  const security = results.deepAnalysis?.security || results.security;
  if (!security) {
    console.log('❌ No security scoring data available\n');
    return;
  }
  
  const score = security.score || 0;
  const vulnerabilities = security.vulnerabilities || [];
  
  // Calculate score breakdown
  const critical = vulnerabilities.filter(v => v.severity === 'critical').length;
  const high = vulnerabilities.filter(v => v.severity === 'high').length;
  const medium = vulnerabilities.filter(v => v.severity === 'medium').length;
  const low = vulnerabilities.filter(v => v.severity === 'low').length;
  
  // Display score with interpretation
  let scoreEmoji = '🟢';
  let scoreText = 'Excellent';
  
  if (score < 30) {
    scoreEmoji = '🔴';
    scoreText = 'Critical - Immediate action required';
  } else if (score < 60) {
    scoreEmoji = '🟡';
    scoreText = 'Poor - Significant improvements needed';
  } else if (score < 80) {
    scoreEmoji = '🟠';
    scoreText = 'Fair - Some improvements recommended';
  } else if (score < 90) {
    scoreEmoji = '🔵';
    scoreText = 'Good - Minor improvements possible';
  }
  
  console.log(`${scoreEmoji} Overall Security Score: ${score}/100`);
  console.log(`📋 Assessment: ${scoreText}\n`);
  
  console.log('🔢 VULNERABILITY IMPACT ON SCORE:');
  console.log('──────────────────────────────────');
  console.log(`🚨 Critical vulnerabilities: ${critical} (-20 points each)`);
  console.log(`⚠️ High vulnerabilities: ${high} (-10 points each)`);
  console.log(`📋 Medium vulnerabilities: ${medium} (-5 points each)`);
  console.log(`📝 Low vulnerabilities: ${low} (-2 points each)\n`);
  
  // Score improvement suggestions
  const pointsLost = (critical * 20) + (high * 10) + (medium * 5) + (low * 2);
  if (pointsLost > 0) {
    console.log(`📈 Potential score improvement: +${pointsLost} points`);
    console.log(`🎯 Target score after fixes: ${Math.min(100, score + pointsLost)}/100\n`);
  }
}

function groupVulnerabilities(vulnerabilities) {
  return vulnerabilities.reduce((acc, vuln) => {
    const severity = vuln.severity || 'unknown';
    if (!acc[severity]) acc[severity] = [];
    acc[severity].push(vuln);
    return acc;
  }, {});
}

function generateSecurityRecommendations(vulnerabilities) {
  const recommendations = [];
  
  const critical = vulnerabilities.filter(v => v.severity === 'critical');
  const high = vulnerabilities.filter(v => v.severity === 'high');
  const medium = vulnerabilities.filter(v => v.severity === 'medium');
  
  if (critical.length > 0) {
    recommendations.push({
      priority: 'high',
      title: `Fix ${critical.length} Critical Security Vulnerabilities`,
      description: 'Critical vulnerabilities can be easily exploited and pose immediate risk.',
      effort: 'High',
      impact: 'High',
      steps: [
        'Audit all usage of eval(), setTimeout with strings, and dynamic code execution',
        'Implement input validation and sanitization',
        'Review and fix SQL injection vulnerabilities',
        'Test fixes with security scanning tools'
      ],
      resources: [
        'OWASP Code Review Guide',
        'Node.js Security Best Practices'
      ]
    });
  }
  
  if (high.length > 0) {
    recommendations.push({
      priority: 'medium',
      title: `Address ${high.length} High-Priority Security Issues`,
      description: 'High-priority issues should be fixed to prevent potential security breaches.',
      effort: 'Medium',
      impact: 'High',
      steps: [
        'Review authentication and authorization mechanisms',
        'Implement CSRF protection where needed',
        'Sanitize all user inputs before processing',
        'Add security headers to HTTP responses'
      ],
      resources: [
        'Express Security Best Practices',
        'OWASP Authentication Cheat Sheet'
      ]
    });
  }
  
  if (vulnerabilities.length > 10) {
    recommendations.push({
      priority: 'medium',
      title: 'Implement Security Monitoring',
      description: 'With multiple security issues found, implement ongoing monitoring.',
      effort: 'Medium',
      impact: 'Medium',
      steps: [
        'Set up automated security scanning in CI/CD',
        'Implement logging for security events',
        'Regular security audits and penetration testing',
        'Keep dependencies updated with security patches'
      ],
      resources: [
        'npm audit for dependency vulnerabilities',
        'Snyk or similar security monitoring tools'
      ]
    });
  }
  
  return recommendations;
}

// Run the example
if (require.main === module) {
  runSecurityAudit().catch(error => {
    console.error('Failed to run security audit:', error);
    process.exit(1);
  });
}

module.exports = { runSecurityAudit };