#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Simple post-install script that runs setup
try {
  const setupScript = path.join(__dirname, 'setup.js');
  require(setupScript);
} catch (error) {
  console.warn('Post-install setup failed:', error.message);
  console.log('You can manually run setup later with: npm run setup');
}