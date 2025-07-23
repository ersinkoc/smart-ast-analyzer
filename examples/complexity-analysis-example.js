#!/usr/bin/env node

/**
 * Advanced Example: Code Complexity Analysis
 * 
 * This example demonstrates the deep complexity analysis capabilities
 * of Smart AST Analyzer, including cyclomatic complexity, cognitive
 * complexity, and dependency graph analysis.
 */

const path = require('path');
const SmartASTAnalyzer = require('../lib/core/smart-ast-analyzer');

async function runComplexityAnalysis() {
  console.log('🔬 Smart AST Analyzer - Complexity Analysis Example\n');
  
  // Configuration optimized for complexity analysis
  const config = {
    ai: 'mock', // Use built-in analysis engine
    verbose: true,
    output: path.join(__dirname, '../smart-ast-output'),
    
    // Focus on complexity metrics
    analysis: {
      type: 'full',
      deepAnalysis: true,
      complexity: {
        maxCyclomatic: 10,    // Flag functions with cyclomatic complexity > 10
        maxCognitive: 15,     // Flag functions with cognitive complexity > 15  
        maxNesting: 4,        // Flag functions with nesting depth > 4
        checkHooks: true,     // Analyze React hooks complexity
        checkComponents: true // Analyze component complexity
      }
    }
  };
  
  try {
    // Create analyzer instance
    const analyzer = new SmartASTAnalyzer(config);
    
    // Target directory - analyze the Smart AST Analyzer itself!
    const projectPath = path.join(__dirname, '..');
    
    console.log(`📂 Analyzing project: ${projectPath}`);
    console.log('🎯 Analysis focus: Code complexity and dependency analysis\n');
    
    // Run comprehensive analysis
    const results = await analyzer.analyzeProject(projectPath);
    
    // Display complexity insights
    displayComplexityResults(results);
    
    // Display dependency analysis
    displayDependencyResults(results);
    
    // Display security findings
    displaySecurityResults(results);
    
    console.log('\n✅ Analysis complete! Check the generated reports:');
    console.log(`   📄 HTML Report: ${path.join(config.output, 'analysis-*.html')}`);
    console.log(`   📋 Markdown: ${path.join(config.output, 'analysis-*.md')}`);
    console.log(`   📊 JSON Data: ${path.join(config.output, 'analysis-*.json')}`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function displayComplexityResults(results) {
  console.log('📊 CODE COMPLEXITY ANALYSIS');
  console.log('═══════════════════════════\n');
  
  const complexity = results.deepAnalysis?.complexity;
  if (!complexity) {
    console.log('❌ No complexity data available\n');
    return;
  }
  
  // Overall complexity rating
  const overall = complexity.overall;
  console.log(`🎯 Overall Complexity: ${overall.rating.toUpperCase()} (Score: ${overall.score})`);
  console.log(`📁 Total Functions Analyzed: ${overall.totalFunctions || 0}\n`);
  
  // Most complex functions
  const complexFunctions = complexity.functions
    ?.filter(f => f.cyclomatic > 8 || f.cognitive > 12)
    .sort((a, b) => (b.cyclomatic + b.cognitive) - (a.cyclomatic + a.cognitive))
    .slice(0, 10);
    
  if (complexFunctions?.length > 0) {
    console.log('🔥 MOST COMPLEX FUNCTIONS:');
    console.log('────────────────────────────');
    
    complexFunctions.forEach((func, index) => {
      const complexity = func.cyclomatic + func.cognitive;
      const emoji = complexity > 25 ? '🚨' : complexity > 15 ? '⚠️' : '📊';
      
      console.log(`${index + 1}. ${emoji} ${func.name}`);
      console.log(`   📍 ${func.file}:${func.line}`);
      console.log(`   🔢 Cyclomatic: ${func.cyclomatic}, Cognitive: ${func.cognitive}, Nesting: ${func.nesting}`);
      console.log(`   ⏱️ Lines: ${func.lines}, Parameters: ${func.params}`);
      
      if (func.warnings?.length > 0) {
        console.log(`   ⚠️ Warnings: ${func.warnings.join(', ')}`);
      }
      console.log('');
    });
  } else {
    console.log('✅ No highly complex functions found!\n');
  }
  
  // Class complexity
  const complexClasses = complexity.classes
    ?.filter(c => c.complexity > 20)
    .sort((a, b) => b.complexity - a.complexity)
    .slice(0, 5);
    
  if (complexClasses?.length > 0) {
    console.log('🏗️ COMPLEX CLASSES:');
    console.log('──────────────────');
    
    complexClasses.forEach((cls, index) => {
      console.log(`${index + 1}. ${cls.name} (Complexity: ${cls.complexity})`);
      console.log(`   📍 ${cls.file}:${cls.line}`);
      console.log(`   🔧 Methods: ${cls.methods?.length || 0}, Properties: ${cls.properties?.length || 0}`);
      console.log(`   🤝 Cohesion: ${(cls.cohesion * 100).toFixed(1)}%`);
      if (cls.warnings?.length > 0) {
        console.log(`   ⚠️ ${cls.warnings.join(', ')}`);
      }
      console.log('');
    });
  }
}

function displayDependencyResults(results) {
  console.log('🕸️ DEPENDENCY ANALYSIS');
  console.log('════════════════════════\n');
  
  const deps = results.deepAnalysis?.dependencies;
  if (!deps) {
    console.log('❌ No dependency data available\n');
    return;
  }
  
  // Circular dependencies
  if (deps.cycles?.length > 0) {
    console.log('🔄 CIRCULAR DEPENDENCIES FOUND:');
    console.log('─────────────────────────────────');
    
    deps.cycles.forEach((cycle, index) => {
      console.log(`${index + 1}. ${cycle.join(' → ')}`);
    });
    console.log('');
  } else {
    console.log('✅ No circular dependencies found!\n');
  }
  
  // External vs Internal dependencies
  console.log('📦 DEPENDENCY BREAKDOWN:');
  console.log('───────────────────────');
  console.log(`🌐 External dependencies: ${deps.external?.size || 0}`);
  console.log(`🏠 Internal dependencies: ${deps.internal?.size || 0}`);
  
  if (deps.external?.size > 0) {
    console.log('\n📋 External Dependencies:');
    Array.from(deps.external).slice(0, 10).forEach(dep => {
      console.log(`   📦 ${dep}`);
    });
  }
  
  console.log('');
}

function displaySecurityResults(results) {
  console.log('🛡️ SECURITY ANALYSIS');
  console.log('═══════════════════\n');
  
  const security = results.deepAnalysis?.security;
  if (!security) {
    console.log('❌ No security data available\n');
    return;
  }
  
  console.log(`🎯 Security Score: ${security.score}/100`);
  
  if (security.vulnerabilities?.length > 0) {
    console.log(`\n🚨 VULNERABILITIES FOUND: ${security.vulnerabilities.length}`);
    console.log('──────────────────────────────────');
    
    // Group by severity
    const bySeverity = security.vulnerabilities.reduce((acc, vuln) => {
      if (!acc[vuln.severity]) acc[vuln.severity] = [];
      acc[vuln.severity].push(vuln);
      return acc;
    }, {});
    
    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      const vulns = bySeverity[severity];
      if (vulns?.length > 0) {
        const emoji = severity === 'critical' ? '🚨' : severity === 'high' ? '⚠️' : severity === 'medium' ? '📋' : '📝';
        console.log(`\n${emoji} ${severity.toUpperCase()} (${vulns.length}):`);
        
        vulns.slice(0, 5).forEach(vuln => {
          console.log(`   • ${vuln.message}`);
          console.log(`     📍 ${vuln.file}:${vuln.line || 'unknown'}`);
          if (vuln.suggestion) {
            console.log(`     💡 ${vuln.suggestion}`);
          }
        });
        
        if (vulns.length > 5) {
          console.log(`     ... and ${vulns.length - 5} more`);
        }
      }
    });
  } else {
    console.log('✅ No security vulnerabilities found!');
  }
  
  console.log('');
}

// Run the example
if (require.main === module) {
  runComplexityAnalysis().catch(error => {
    console.error('Failed to run complexity analysis:', error);
    process.exit(1);
  });
}

module.exports = { runComplexityAnalysis };