#!/usr/bin/env node

const { execSync } = require('child_process');
const chalk = require('chalk');

function checkDependency(command, name) {
  try {
    execSync(command, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

function main() {
  console.log(chalk.cyan.bold('🔍 Smart AST Analyzer - Dependency Check\n'));

  const checks = [
    { command: 'node --version', name: 'Node.js', required: true },
    { command: 'npm --version', name: 'npm', required: true },
    { command: 'gemini --version', name: 'Gemini CLI', required: false },
    { command: 'claude --version', name: 'Claude CLI', required: false }
  ];

  let hasRequiredDeps = true;
  let hasAnyAI = false;

  for (const check of checks) {
    const isAvailable = checkDependency(check.command, check.name);
    
    if (isAvailable) {
      console.log(chalk.green(`✅ ${check.name} - Available`));
      if (check.name.includes('CLI')) {
        hasAnyAI = true;
      }
    } else {
      if (check.required) {
        console.log(chalk.red(`❌ ${check.name} - Missing (Required)`));
        hasRequiredDeps = false;
      } else {
        console.log(chalk.yellow(`⚠️  ${check.name} - Missing (Optional)`));
      }
    }
  }

  console.log();

  if (!hasRequiredDeps) {
    console.log(chalk.red.bold('❌ Missing required dependencies!'));
    console.log('Please install Node.js and npm first.');
    process.exit(1);
  }

  if (!hasAnyAI) {
    console.log(chalk.yellow.bold('⚠️  No AI CLI tools found!'));
    console.log('You need at least one AI CLI tool to use Smart AST Analyzer:');
    console.log('');
    console.log('For Gemini CLI:');
    console.log('  npm install -g @google-ai/generativelanguage-cli');
    console.log('');
    console.log('For Claude CLI:');
    console.log('  npm install -g @anthropic-ai/claude-cli');
    console.log('');
    process.exit(1);
  }

  console.log(chalk.green.bold('✅ All dependencies satisfied!'));
  console.log('You can now use Smart AST Analyzer.');
}

if (require.main === module) {
  main();
}

module.exports = main;