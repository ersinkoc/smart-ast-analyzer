#!/usr/bin/env node

/**
 * Custom Configuration Example
 * 
 * This example shows how to use Smart AST Analyzer with custom
 * configurations for different project types and requirements.
 */

const SmartASTAnalyzer = require('../index');
const fs = require('fs').promises;
const path = require('path');

async function customConfigExample() {
  console.log('⚙️  Smart AST Analyzer - Custom Configuration Example\n');

  // Example 1: Next.js project with custom patterns
  console.log('📋 Example 1: Next.js Project Analysis');
  await runNextJSExample();

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 2: Express API with security focus
  console.log('📋 Example 2: Express API Security Analysis');
  await runExpressSecurityExample();

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 3: Large project with file limits
  console.log('📋 Example 3: Large Project with Limits');
  await runLargeProjectExample();
}

async function runNextJSExample() {
  const options = {
    path: process.cwd(),
    ai: 'gemini',
    type: 'components',
    output: './nextjs-analysis',
    format: 'html',
    maxFiles: 25,
    
    // Custom patterns for Next.js
    include: [
      'pages/**/*.{js,jsx,ts,tsx}',
      'app/**/*.{js,jsx,ts,tsx}',
      'components/**/*.{jsx,tsx}',
      'hooks/**/*.{js,ts}'
    ].join(','),
    
    exclude: [
      'pages/_document.*',
      'pages/_app.*',
      '**/*.test.*',
      '**/*.spec.*'
    ].join(','),
    
    verbose: true
  };

  try {
    console.log('🔍 Analyzing Next.js components with custom patterns...');
    
    const analyzer = new SmartASTAnalyzer(options);
    const report = await analyzer.run();
    
    console.log(`✅ Next.js analysis completed!`);
    console.log(`📊 Generated: ${report.files.length} report files`);
    console.log(`📁 Location: ${report.outputDir}`);
    
    return report;
    
  } catch (error) {
    console.error('❌ Next.js analysis failed:', error.message);
  }
}

async function runExpressSecurityExample() {
  const options = {
    path: process.cwd(),
    ai: 'claude',  // Using Claude for this example
    type: 'auth',  // Focus on authentication/security
    output: './express-security-analysis',
    format: 'json',
    
    // Express-specific patterns
    include: [
      'routes/**/*.js',
      'controllers/**/*.js',
      'middleware/**/*.js',
      'models/**/*.js',
      'app.js',
      'server.js'
    ].join(','),
    
    exclude: [
      'node_modules/**',
      'test/**',
      'tests/**',
      '**/*.min.js'
    ].join(','),
    
    maxFiles: 40,
    verbose: false
  };

  try {
    console.log('🔒 Running security-focused analysis on Express app...');
    
    const analyzer = new SmartASTAnalyzer(options);
    const report = await analyzer.run();
    
    // Read and display security metrics
    const jsonFile = report.files.find(f => f.endsWith('.json'));
    if (jsonFile) {
      const reportData = JSON.parse(await fs.readFile(jsonFile, 'utf-8'));
      const authResults = reportData.results.auth;
      
      if (authResults && authResults.security) {
        const vulns = authResults.security.vulnerabilities || [];
        console.log(`🔍 Found ${vulns.length} security issues`);
        
        const critical = vulns.filter(v => v.severity === 'critical').length;
        if (critical > 0) {
          console.log(`⚠️  ${critical} critical vulnerabilities detected!`);
        }
      }
    }
    
    console.log(`✅ Security analysis completed!`);
    
    return report;
    
  } catch (error) {
    console.error('❌ Express security analysis failed:', error.message);
  }
}

async function runLargeProjectExample() {
  // Create a temporary config file for this example
  const configPath = './.smart-ast-large-project.json';
  
  const customConfig = {
    ai: 'gemini',
    analysis: {
      type: 'performance',
      maxFiles: 100,  // Higher limit for large projects
      exclude: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        'coverage/**',
        '**/*.min.js',
        '**/*.bundle.js',
        'vendor/**',
        'third-party/**'
      ]
    },
    output: {
      format: 'markdown',  // Lighter format for large projects
      directory: './large-project-analysis'
    },
    cache: {
      enabled: true,  // Important for large projects
      ttl: 7200000   // 2 hours cache
    }
  };

  try {
    // Write temporary config
    await fs.writeFile(configPath, JSON.stringify(customConfig, null, 2));
    
    const options = {
      path: process.cwd(),
      config: configPath,
      verbose: true
    };

    console.log('📈 Analyzing large project with custom limits...');
    console.log(`⚡ Max files per category: ${customConfig.analysis.maxFiles}`);
    console.log(`💾 Caching enabled: ${customConfig.cache.enabled}`);
    
    const analyzer = new SmartASTAnalyzer(options);
    const report = await analyzer.run();
    
    console.log(`✅ Large project analysis completed!`);
    console.log(`📊 Performance score: ${report.summary}`);
    
    return report;
    
  } catch (error) {
    console.error('❌ Large project analysis failed:', error.message);
  } finally {
    // Clean up temporary config
    try {
      await fs.unlink(configPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Helper function to create project-specific configs
function createFrameworkConfig(framework, outputDir = './framework-analysis') {
  const configs = {
    nextjs: {
      include: 'pages/**/*.{js,jsx,ts,tsx},app/**/*.{js,jsx,ts,tsx},components/**/*.{jsx,tsx}',
      exclude: 'pages/_document.*,pages/_app.*',
      type: 'full',
      maxFiles: 50
    },
    
    react: {
      include: 'src/**/*.{jsx,tsx},components/**/*.{jsx,tsx}',
      exclude: '**/*.test.*,**/*.spec.*',
      type: 'components',
      maxFiles: 40
    },
    
    express: {
      include: 'routes/**/*.js,controllers/**/*.js,middleware/**/*.js',
      exclude: 'test/**,tests/**',
      type: 'api',
      maxFiles: 30
    },
    
    vue: {
      include: 'src/**/*.{vue,js,ts},components/**/*.vue',
      exclude: '**/*.test.*',
      type: 'components',
      maxFiles: 45
    }
  };

  const config = configs[framework];
  if (!config) {
    throw new Error(`Unsupported framework: ${framework}`);
  }

  return {
    path: process.cwd(),
    ai: 'gemini',
    output: outputDir,
    format: 'all',
    verbose: true,
    ...config
  };
}

// Example usage of framework-specific configs
async function analyzeFrameworkProject(framework) {
  console.log(`📱 Analyzing ${framework} project...`);
  
  try {
    const config = createFrameworkConfig(framework, `./analysis-${framework}`);
    const analyzer = new SmartASTAnalyzer(config);
    const report = await analyzer.run();
    
    console.log(`✅ ${framework} analysis completed!`);
    return report;
    
  } catch (error) {
    console.error(`❌ ${framework} analysis failed:`, error.message);
    throw error;
  }
}

if (require.main === module) {
  customConfigExample()
    .then(() => {
      console.log('\n🎉 Custom configuration examples completed!');
      console.log('\n💡 Key takeaways:');
      console.log('   • Use include/exclude patterns for targeted analysis');
      console.log('   • Adjust maxFiles based on project size');
      console.log('   • Enable caching for large projects');
      console.log('   • Choose appropriate AI provider for your needs');
      console.log('   • Select output format based on usage');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Examples failed:', error.message);
      process.exit(1);
    });
}

module.exports = { 
  customConfigExample, 
  createFrameworkConfig, 
  analyzeFrameworkProject 
};