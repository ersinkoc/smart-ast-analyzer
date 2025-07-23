#!/usr/bin/env node

/**
 * Basic usage example for Smart AST Analyzer
 * 
 * This example shows how to use the analyzer programmatically
 * instead of through the CLI.
 */

const SmartASTAnalyzer = require('../index');
const path = require('path');

async function basicExample() {
  console.log('🚀 Smart AST Analyzer - Basic Usage Example\n');

  // Configuration options
  const options = {
    path: process.cwd(),           // Analyze current directory
    ai: 'gemini',                  // Use Gemini (or 'claude')
    type: 'full',                  // Full analysis
    output: './example-output',    // Output directory
    format: 'all',                 // Generate all formats
    maxFiles: 20,                  // Limit files for demo
    verbose: true                  // Show detailed output
  };

  try {
    // Create analyzer instance
    const analyzer = new SmartASTAnalyzer(options);
    
    console.log('📂 Analyzing project...');
    console.log(`   Path: ${options.path}`);
    console.log(`   AI: ${options.ai}`);
    console.log(`   Type: ${options.type}`);
    
    // Run analysis
    const report = await analyzer.run();
    
    console.log('\n✅ Analysis completed successfully!');
    console.log(`📊 Report ID: ${report.reportId}`);
    console.log(`📁 Output directory: ${report.outputDir}`);
    console.log(`📄 Generated files: ${report.files.length}`);
    
    // Display some results
    console.log('\n📋 Summary:');
    console.log(`   ${report.summary}`);
    
    if (report.files.length > 0) {
      console.log('\n📄 Generated Reports:');
      report.files.forEach(file => {
        console.log(`   • ${path.basename(file)}`);
      });
    }

    return report;
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    
    if (error.message.includes('CLI not found')) {
      console.log('\n💡 Tip: Make sure you have either Gemini CLI or Claude CLI installed:');
      console.log('   npm install -g @google-ai/generativelanguage-cli');
      console.log('   npm install -g @anthropic-ai/claude-cli');
    }
    
    throw error;
  }
}

// Run example if called directly
if (require.main === module) {
  basicExample()
    .then(() => {
      console.log('\n🎉 Example completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Example failed:', error.message);
      process.exit(1);
    });
}

module.exports = basicExample;