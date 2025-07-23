#!/usr/bin/env node

/**
 * Comprehensive Example: Full Project Analysis
 * 
 * This example demonstrates the complete analysis capabilities
 * of Smart AST Analyzer v1.0.0, including:
 * - Deep AST-based code analysis
 * - Security vulnerability detection
 * - Performance bottleneck identification
 * - Code complexity metrics
 * - Dependency graph analysis
 * - Interactive visualizations
 * - API documentation generation
 */

const path = require('path');
const fs = require('fs').promises;
const SmartASTAnalyzer = require('../lib/core/smart-ast-analyzer');

async function runComprehensiveAnalysis() {
  console.log('🚀 Smart AST Analyzer v1.0.0 - Comprehensive Analysis Example\n');
  
  // Advanced configuration for maximum analysis depth
  const config = {
    ai: 'mock', // Use built-in analysis engine (recommended)
    verbose: true,
    output: path.join(__dirname, '../smart-ast-output'),
    
    analysis: {
      type: 'full', // Analyze everything
      deepAnalysis: true, // Enable deep AST analysis
      maxFiles: 500, // Increase file limit for large projects
      
      // Complexity analysis configuration
      complexity: {
        maxCyclomatic: 10,    // Flag functions with high cyclomatic complexity
        maxCognitive: 15,     // Flag functions difficult to understand
        maxNesting: 4,        // Flag deeply nested functions
        checkHooks: true,     // Analyze React hooks complexity
        checkComponents: true, // Analyze component complexity
        checkClasses: true    // Analyze class complexity and cohesion
      },
      
      // Security analysis configuration
      security: {
        scanSecrets: true,         // Detect hardcoded API keys, passwords
        checkVulnerabilities: true, // AST-based vulnerability detection
        checkXSS: true,            // Cross-site scripting detection
        checkSQLInjection: true,   // SQL injection pattern detection
        checkAuthentication: true,  // Auth pattern analysis
        checkCSRF: true,           // CSRF protection analysis
        validateInputs: true       // Input validation checking
      },
      
      // Performance analysis configuration
      performance: {
        checkRenderOptimization: true, // React render optimization
        detectMemoryLeaks: true,       // Memory leak detection
        checkBundleSize: true,         // Large dependency detection
        analyzeReRenders: true,        // Re-render analysis
        checkAsyncPatterns: true,      // Async/await pattern analysis
        detectN1Queries: true          // Database N+1 query detection
      },
      
      // Database analysis configuration
      database: {
        analyzeModels: true,       // ORM model analysis
        checkRelationships: true,  // Model relationship analysis
        validateQueries: true,     // SQL query validation
        checkIndexes: true,        // Index usage analysis
        detectSlowQueries: true    // Slow query detection
      }
    },
    
    // Output configuration - moved to top level
    format: 'all', // Generate JSON, Markdown, and HTML reports
    
    // Reporting configuration
    reporting: {
      includeComplexity: true,
      includeSecurity: true,
      includePerformance: true,
      includeDatabase: true,
      includeRecommendations: true,
      minSeverity: 'low', // Include all severity levels
      groupByComponent: true
    }
  };
  
  try {
    console.log('🔧 Configuration:');
    console.log(`   📊 Analysis Type: ${config.analysis.type}`);
    console.log(`   🔬 Deep Analysis: ${config.analysis.deepAnalysis ? 'Enabled' : 'Disabled'}`);
    console.log(`   🎯 Max Files: ${config.analysis.maxFiles}`);
    console.log(`   📁 Output Directory: ${config.output}`);
    console.log('');
    
    // Create analyzer instance with advanced configuration
    const analyzer = new SmartASTAnalyzer(config);
    
    // Target directory - analyze the Smart AST Analyzer itself as an example
    const projectPath = path.join(__dirname, '..');
    
    console.log(`📂 Analyzing project: ${projectPath}`);
    console.log('🎯 Analysis scope: Complete project analysis with all engines\n');
    
    // Performance monitoring
    const startTime = Date.now();
    console.log('⏱️ Starting comprehensive analysis...\n');
    
    // Run complete analysis
    const results = await analyzer.analyzeProject(projectPath);
    
    const analysisTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️ Analysis completed in ${analysisTime} seconds\n`);
    
    // Display comprehensive results
    await displayAnalysisResults(results, config.output);
    
    // Show generated files
    await listGeneratedFiles(config.output);
    
    console.log('\n🎉 Comprehensive analysis complete!');
    console.log('\n📖 To explore your results:');
    console.log('   1. Open the HTML dashboard for interactive visualizations');
    console.log('   2. Review the Markdown report for detailed findings');
    console.log('   3. Use the JSON data for programmatic access');
    console.log('   4. Check the API documentation if endpoints were found');
    console.log('\n✨ Happy coding! Keep your code clean and secure! ✨');
    
  } catch (error) {
    console.error('❌ Comprehensive analysis failed:', error.message);
    console.error('\n🔍 Troubleshooting tips:');
    console.error('   • Ensure the project directory exists and is readable');
    console.error('   • Check that you have write permissions to the output directory');
    console.error('   • Verify Node.js version is >= 14.0.0');
    console.error('   • Try with a smaller --max-files value for large projects');
    process.exit(1);
  }
}

async function displayAnalysisResults(results, outputDir) {
  console.log('📊 COMPREHENSIVE ANALYSIS RESULTS');
  console.log('═══════════════════════════════════\n');
  
  // Project overview
  displayProjectOverview(results);
  
  // Deep analysis results
  if (results.deepAnalysis) {
    displayDeepAnalysisResults(results.deepAnalysis);
  }
  
  // Traditional analysis results
  displayTraditionalResults(results);
}

function displayProjectOverview(results) {
  console.log('📋 PROJECT OVERVIEW:');
  console.log('──────────────────────');
  
  const projectInfo = results.projectInfo || {};
  console.log(`🏗️ Framework: ${projectInfo.framework || 'Unknown'}`);
  console.log(`💻 Language: ${projectInfo.language || 'JavaScript'}`);
  console.log(`📁 Total Files: ${projectInfo.totalFiles || 'Unknown'}`);
  console.log(`📄 Lines of Code: ${projectInfo.totalLines || 'Unknown'}`);
  console.log(`📦 Dependencies: ${projectInfo.dependencies || 'Unknown'}`);
  console.log('');
}

function displayDeepAnalysisResults(deepAnalysis) {
  console.log('🔬 DEEP ANALYSIS RESULTS:');
  console.log('───────────────────────────');
  
  // Complexity Analysis
  if (deepAnalysis.complexity) {
    const complexity = deepAnalysis.complexity;
    console.log(`📊 Complexity Rating: ${complexity.overall?.rating?.toUpperCase() || 'Unknown'}`);
    console.log(`🔢 Complexity Score: ${complexity.overall?.score || 'N/A'}`);
    console.log(`🔧 Functions Analyzed: ${complexity.functions?.length || 0}`);
    console.log(`🏛️ Classes Analyzed: ${complexity.classes?.length || 0}`);
    
    const complexFunctions = complexity.functions?.filter(f => f.cyclomatic > 10) || [];
    if (complexFunctions.length > 0) {
      console.log(`⚠️ Complex Functions: ${complexFunctions.length}`);
    }
    console.log('');
  }
  
  // Security Analysis
  if (deepAnalysis.security) {
    const security = deepAnalysis.security;
    console.log(`🛡️ Security Score: ${security.score}/100`);
    console.log(`🚨 Vulnerabilities Found: ${security.vulnerabilities?.length || 0}`);
    
    if (security.vulnerabilities?.length > 0) {
      const critical = security.vulnerabilities.filter(v => v.severity === 'critical').length;
      const high = security.vulnerabilities.filter(v => v.severity === 'high').length;
      const medium = security.vulnerabilities.filter(v => v.severity === 'medium').length;
      
      if (critical > 0) console.log(`   🚨 Critical: ${critical}`);
      if (high > 0) console.log(`   ⚠️ High: ${high}`);
      if (medium > 0) console.log(`   📋 Medium: ${medium}`);
    }
    console.log('');
  }
  
  // Dependency Analysis
  if (deepAnalysis.dependencies) {
    const deps = deepAnalysis.dependencies;
    console.log(`🕸️ Circular Dependencies: ${deps.cycles?.length || 0}`);
    console.log(`🌐 External Dependencies: ${deps.external?.size || 0}`);
    console.log(`🏠 Internal Dependencies: ${deps.internal?.size || 0}`);
    
    if (deps.cycles?.length > 0) {
      console.log('⚠️ Circular dependency cycles detected - see detailed report');
    }
    console.log('');
  }
  
  // Performance Analysis
  if (deepAnalysis.performance) {
    const performance = deepAnalysis.performance;
    console.log(`⚡ Performance Issues: ${performance.bottlenecks?.length || 0}`);
    console.log(`🎭 Anti-patterns: ${performance.antiPatterns?.length || 0}`);
    
    if (performance.bottlenecks?.length > 0) {
      const critical = performance.bottlenecks.filter(b => b.severity === 'high').length;
      if (critical > 0) console.log(`   🔥 Critical Issues: ${critical}`);
    }
    console.log('');
  }
  
  // Recommendations
  if (deepAnalysis.recommendations) {
    console.log('🎯 TOP RECOMMENDATIONS:');
    deepAnalysis.recommendations.slice(0, 5).forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    console.log('');
  }
}

function displayTraditionalResults(results) {
  console.log('📈 TRADITIONAL ANALYSIS:');
  console.log('─────────────────────────');
  
  // API Endpoints
  if (results.endpoints?.length > 0) {
    console.log(`🌐 API Endpoints: ${results.endpoints.length}`);
    console.log('   Top endpoints:');
    results.endpoints.slice(0, 5).forEach(endpoint => {
      console.log(`   • ${endpoint.method} ${endpoint.path}`);
    });
    console.log('');
  }
  
  // Components
  if (results.components && Object.keys(results.components).length > 0) {
    const componentCount = Object.keys(results.components).length;
    console.log(`🧩 Components Found: ${componentCount}`);
    console.log('   Component types:');
    Object.entries(results.components).forEach(([name, component]) => {
      console.log(`   • ${name} (${component.type || 'unknown'})`);
    });
    console.log('');
  }
  
  // WebSocket Events
  if (results.websocketEvents?.length > 0) {
    console.log(`🔌 WebSocket Events: ${results.websocketEvents.length}`);
    console.log('');
  }
  
  // Database Models
  if (results.models?.length > 0) {
    console.log(`🗄️ Database Models: ${results.models.length}`);
    console.log('');
  }
}

async function listGeneratedFiles(outputDir) {
  console.log('📁 GENERATED FILES:');
  console.log('─────────────────────');
  
  try {
    const files = await fs.readdir(outputDir);
    
    // Group files by type
    const fileGroups = {
      reports: files.filter(f => f.match(/\.(html|md|json)$/)),
      visualizations: files.filter(f => f === 'visualizations'),
      apiDocs: files.filter(f => f === 'api-docs'),
      other: files.filter(f => !f.match(/\.(html|md|json)$/) && !['visualizations', 'api-docs'].includes(f))
    };
    
    if (fileGroups.reports.length > 0) {
      console.log('📊 Analysis Reports:');
      fileGroups.reports.forEach(file => {
        const emoji = file.endsWith('.html') ? '🌐' : file.endsWith('.md') ? '📝' : '📋';
        console.log(`   ${emoji} ${file}`);
      });
      console.log('');
    }
    
    if (fileGroups.visualizations.length > 0) {
      console.log('📈 Interactive Visualizations:');
      console.log('   📊 dashboard.html - Interactive metrics dashboard');
      console.log('   📊 complexity-data.json - Complexity visualization data');
      console.log('   📊 dependency-data.json - Dependency graph data');
      console.log('');
    }
    
    if (fileGroups.apiDocs.length > 0) {
      console.log('📚 API Documentation:');
      console.log('   📄 openapi.json - OpenAPI 3.0 specification');
      console.log('   📝 API.md - Markdown documentation');
      console.log('   📦 postman-collection.json - Postman collection');
      console.log('');
    }
    
    console.log(`📍 All files saved to: ${outputDir}`);
    
  } catch (error) {
    console.warn('Could not list generated files:', error.message);
  }
}

// Run the comprehensive example
if (require.main === module) {
  runComprehensiveAnalysis().catch(error => {
    console.error('Failed to run comprehensive analysis:', error);
    process.exit(1);
  });
}

module.exports = { runComprehensiveAnalysis };