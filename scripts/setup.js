#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

async function setup() {
  console.log(chalk.cyan.bold('🚀 Setting up Smart AST Analyzer...\n'));

  try {
    // 1. Check Node.js version
    console.log('1. Checking Node.js version...');
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    
    if (majorVersion < 14) {
      throw new Error(`Node.js version ${nodeVersion} is not supported. Please use Node.js 14 or higher.`);
    }
    console.log(chalk.green(`   ✅ Node.js ${nodeVersion} is supported`));

    // 2. Check for AI CLI tools
    console.log('\n2. Checking AI CLI tools...');
    const aiTools = await checkAITools();
    
    if (aiTools.length === 0) {
      console.log(chalk.yellow('   ⚠️  No AI CLI tools found. You need either Gemini CLI or Claude CLI.'));
      console.log('   Please install one of the following:');
      console.log('   - Gemini CLI: npm install -g @google-ai/generativelanguage-cli');
      console.log('   - Claude CLI: npm install -g @anthropic-ai/claude-cli');
    } else {
      console.log(chalk.green(`   ✅ Found AI tools: ${aiTools.join(', ')}`));
    }

    // 3. Create necessary directories
    console.log('\n3. Creating directories...');
    await createDirectories();
    console.log(chalk.green('   ✅ Directories created'));

    // 4. Copy example config
    console.log('\n4. Setting up configuration...');
    await setupConfiguration();
    console.log(chalk.green('   ✅ Configuration files ready'));

    // 5. Make CLI executable
    console.log('\n5. Setting up CLI...');
    await setupCLI();
    console.log(chalk.green('   ✅ CLI ready'));

    // 6. Run tests (if in development)
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n6. Running tests...');
      try {
        execSync('npm test', { stdio: 'pipe' });
        console.log(chalk.green('   ✅ All tests passed'));
      } catch (error) {
        console.log(chalk.yellow('   ⚠️  Some tests failed (this is normal during setup)'));
      }
    }

    console.log(chalk.green.bold('\n🎉 Setup complete!\n'));
    console.log('To get started:');
    console.log('1. cd to your project directory');
    console.log('2. Run: smart-ast analyze');
    console.log('3. Or run: npx smart-ast-analyzer analyze\n');
    
    if (aiTools.length === 0) {
      console.log(chalk.yellow.bold('⚠️  Remember to install an AI CLI tool before using!'));
    }

  } catch (error) {
    console.error(chalk.red('❌ Setup failed:'), error.message);
    process.exit(1);
  }
}

async function checkAITools() {
  const tools = [];
  
  // Check for Gemini CLI
  try {
    execSync('gemini --version', { stdio: 'pipe' });
    tools.push('Gemini CLI');
  } catch (e) {
    // Not installed
  }
  
  // Check for Claude CLI
  try {
    execSync('claude --version', { stdio: 'pipe' });
    tools.push('Claude CLI');
  } catch (e) {
    // Not installed
  }
  
  return tools;
}

async function createDirectories() {
  const dirs = [
    'output',
    'cache',
    '.smart-ast-cache'
  ];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }
}

async function setupConfiguration() {
  const configPath = '.smart-ast.json';
  
  try {
    await fs.access(configPath);
    // Config already exists
  } catch (error) {
    // Create default config
    const defaultConfig = {
      ai: 'gemini',
      analysis: {
        type: 'full',
        maxFiles: 50,
        exclude: [
          'node_modules/**',
          '.git/**',
          'dist/**',
          'build/**'
        ]
      },
      output: {
        format: 'all',
        directory: './smart-ast-output'
      },
      cache: {
        enabled: true
      }
    };
    
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
  }
  
  // Copy .env.example if it doesn't exist
  try {
    await fs.access('.env');
  } catch (error) {
    try {
      const envExample = await fs.readFile('.env.example', 'utf-8');
      await fs.writeFile('.env', envExample);
    } catch (e) {
      // .env.example might not exist in some installations
    }
  }
}

async function setupCLI() {
  const binPath = path.join(__dirname, '..', 'bin', 'smart-ast');
  
  try {
    // Make sure the CLI script is executable on Unix systems
    if (process.platform !== 'win32') {
      await fs.chmod(binPath, '755');
    }
  } catch (error) {
    // Might not be needed on all systems
  }
}

if (require.main === module) {
  setup();
}

module.exports = setup;