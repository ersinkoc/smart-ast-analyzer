#!/usr/bin/env node

/**
 * API Analysis Example
 * 
 * This example demonstrates how to perform API-specific analysis
 * and shows how to access detailed results programmatically.
 */

const SmartASTAnalyzer = require('../index');
const fs = require('fs').promises;
const path = require('path');

async function apiAnalysisExample() {
  console.log('🔗 Smart AST Analyzer - API Analysis Example\n');

  const options = {
    path: process.cwd(),
    ai: 'gemini',
    type: 'api',                   // API-specific analysis
    output: './api-analysis-output',
    format: 'json',                // JSON for programmatic access
    maxFiles: 30,
    verbose: false
  };

  try {
    const analyzer = new SmartASTAnalyzer(options);
    
    console.log('🔍 Running API analysis...');
    const report = await analyzer.run();
    
    // Read the JSON report for detailed analysis
    const jsonFile = report.files.find(f => f.endsWith('.json'));
    if (!jsonFile) {
      throw new Error('JSON report not generated');
    }
    
    const reportData = JSON.parse(await fs.readFile(jsonFile, 'utf-8'));
    const apiResults = reportData.results.api;
    
    console.log('\n📊 API Analysis Results:');
    console.log('========================');
    
    if (apiResults.endpoints) {
      console.log(`🔗 Total Endpoints: ${apiResults.endpoints.length}`);
      
      // Group by HTTP method
      const methodCounts = {};
      apiResults.endpoints.forEach(endpoint => {
        const method = endpoint.method || 'UNKNOWN';
        methodCounts[method] = (methodCounts[method] || 0) + 1;
      });
      
      console.log('\n📈 Endpoints by Method:');
      Object.entries(methodCounts).forEach(([method, count]) => {
        console.log(`   ${method}: ${count}`);
      });
      
      // Show authentication status
      const authEndpoints = apiResults.endpoints.filter(e => e.auth?.required);
      console.log(`\n🔐 Authenticated Endpoints: ${authEndpoints.length}/${apiResults.endpoints.length}`);
      
      // Show first few endpoints as examples
      console.log('\n📋 Sample Endpoints:');
      apiResults.endpoints.slice(0, 5).forEach((endpoint, i) => {
        console.log(`   ${i + 1}. ${endpoint.method} ${endpoint.path}`);
        console.log(`      Handler: ${endpoint.handler || 'Unknown'}`);
        console.log(`      Auth: ${endpoint.auth?.required ? '✅' : '❌'}`);
        console.log(`      Issues: ${endpoint.issues?.length || 0}`);
        console.log('');
      });
    } else {
      console.log('❌ No API endpoints found');
      console.log('💡 Make sure your project has API routes in expected locations:');
      console.log('   • Next.js: pages/api/ or app/api/');
      console.log('   • Express: routes/ or controllers/');
      console.log('   • Django: views.py files');
    }
    
    // Security analysis
    if (apiResults.securityIssues && apiResults.securityIssues.length > 0) {
      console.log(`\n⚠️  Security Issues Found: ${apiResults.securityIssues.length}`);
      
      const criticalIssues = apiResults.securityIssues.filter(i => i.severity === 'critical');
      const highIssues = apiResults.securityIssues.filter(i => i.severity === 'high');
      
      if (criticalIssues.length > 0) {
        console.log(`   🚨 Critical: ${criticalIssues.length}`);
      }
      if (highIssues.length > 0) {
        console.log(`   ⚠️  High: ${highIssues.length}`);
      }
      
      console.log('\n🔍 Top Security Issues:');
      apiResults.securityIssues.slice(0, 3).forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.issue}`);
        console.log(`      Endpoint: ${issue.endpoint}`);
        console.log(`      Severity: ${issue.severity}`);
        console.log('');
      });
    } else {
      console.log('\n✅ No security issues detected');
    }
    
    // Orphaned endpoints
    if (apiResults.orphanedEndpoints && apiResults.orphanedEndpoints.length > 0) {
      console.log(`\n🗑️  Orphaned Endpoints: ${apiResults.orphanedEndpoints.length}`);
      console.log('   These endpoints are defined but not used by any frontend code:');
      apiResults.orphanedEndpoints.slice(0, 5).forEach(endpoint => {
        console.log(`   • ${endpoint}`);
      });
    }
    
    // Recommendations
    if (reportData.recommendations && reportData.recommendations.length > 0) {
      console.log('\n💡 Top Recommendations:');
      reportData.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec.title} (${rec.priority} priority)`);
        console.log(`      ${rec.description}`);
        console.log('');
      });
    }
    
    console.log(`\n📄 Full report saved to: ${jsonFile}`);
    
    return apiResults;
    
  } catch (error) {
    console.error('❌ API analysis failed:', error.message);
    throw error;
  }
}

// Helper function to display API statistics
function displayAPIStatistics(apiResults) {
  const stats = {
    total: apiResults.endpoints?.length || 0,
    byMethod: {},
    authenticated: 0,
    withIssues: 0
  };
  
  if (apiResults.endpoints) {
    apiResults.endpoints.forEach(endpoint => {
      // Count by method
      const method = endpoint.method || 'UNKNOWN';
      stats.byMethod[method] = (stats.byMethod[method] || 0) + 1;
      
      // Count authenticated
      if (endpoint.auth?.required) {
        stats.authenticated++;
      }
      
      // Count with issues
      if (endpoint.issues && endpoint.issues.length > 0) {
        stats.withIssues++;
      }
    });
  }
  
  return stats;
}

if (require.main === module) {
  apiAnalysisExample()
    .then(() => {
      console.log('\n🎉 API analysis example completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Example failed:', error.message);
      process.exit(1);
    });
}

module.exports = { apiAnalysisExample, displayAPIStatistics };