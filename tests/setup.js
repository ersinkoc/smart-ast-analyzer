// Comprehensive Jest setup file for Smart AST Analyzer
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Set test timeout to 30 seconds for AI calls and complex operations
jest.setTimeout(30000);

// Global test configuration
global.TEST_CONFIG = {
  timeout: 30000,
  tempDir: path.join(os.tmpdir(), 'smart-ast-analyzer-tests'),
  fixturesDir: path.join(__dirname, 'fixtures'),
  outputDir: path.join(__dirname, 'test-output'),
  mockDataDir: path.join(__dirname, 'mock-data')
};

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeEach(() => {
  // Reset console mocks before each test
  console.log = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
  console.error = originalConsole.error; // Keep error for debugging
});

afterEach(() => {
  // Restore console after each test
  Object.assign(console, originalConsole);
});

// Setup test directories
beforeAll(async () => {
  try {
    await fs.mkdir(global.TEST_CONFIG.tempDir, { recursive: true });
    await fs.mkdir(global.TEST_CONFIG.outputDir, { recursive: true });
    await fs.mkdir(global.TEST_CONFIG.mockDataDir, { recursive: true });
  } catch (error) {
    console.warn('Could not create test directories:', error.message);
  }
});

// Cleanup test directories
afterAll(async () => {
  try {
    await fs.rmdir(global.TEST_CONFIG.tempDir, { recursive: true });
    await fs.rmdir(global.TEST_CONFIG.outputDir, { recursive: true });
  } catch (error) {
    // Ignore cleanup errors
  }
});

// Comprehensive mock data
global.MOCK_PROJECT_INFO = {
  framework: 'react',
  type: 'frontend',
  language: 'javascript',
  version: '1.0.0',
  files: {
    components: [
      { path: '/src/components/Header.jsx', name: 'Header.jsx', extension: '.jsx', size: 1024, lines: 45 },
      { path: '/src/components/Footer.jsx', name: 'Footer.jsx', extension: '.jsx', size: 512, lines: 25 }
    ],
    apis: [
      { path: '/src/api/users.js', name: 'users.js', extension: '.js', size: 2048, lines: 78 },
      { path: '/src/api/posts.js', name: 'posts.js', extension: '.js', size: 1536, lines: 65 }
    ],
    services: [
      { path: '/src/services/auth.js', name: 'auth.js', extension: '.js', size: 1024, lines: 42 }
    ],
    auth: [
      { path: '/src/auth/login.js', name: 'login.js', extension: '.js', size: 768, lines: 35 }
    ],
    models: [],
    websockets: [],
    config: [
      { path: '/package.json', name: 'package.json', extension: '.json', size: 512, lines: 20 }
    ]
  },
  dependencies: {
    dependencies: {
      'react': '^18.0.0',
      'express': '^4.18.0',
      'lodash': '^4.17.0',
      'axios': '^0.27.0'
    },
    devDependencies: {
      'jest': '^29.0.0',
      '@testing-library/react': '^13.0.0',
      'eslint': '^8.0.0'
    },
    total: 7
  },
  totalFiles: 6,
  packageJson: {
    name: 'test-project',
    version: '1.0.0',
    description: 'A test project for Smart AST Analyzer',
    scripts: {
      test: 'jest',
      build: 'webpack',
      start: 'react-scripts start',
      lint: 'eslint src/'
    },
    dependencies: {
      'react': '^18.0.0',
      'express': '^4.18.0'
    }
  }
};

// Mock files with realistic content
global.MOCK_FILES_WITH_CONTENT = [
  {
    path: '/src/components/Header.jsx',
    name: 'Header.jsx',
    extension: '.jsx',
    size: 1024,
    lines: 45,
    content: `import React, { useState, useEffect } from 'react';
import { fetchUserData } from '../api/users';
import './Header.css';

const Header = ({ user, onLogout }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  
  useEffect(() => {
    if (user?.id) {
      loadUserData(user.id);
    }
  }, [user?.id]);
  
  const loadUserData = async (userId) => {
    try {
      setIsLoading(true);
      const data = await fetchUserData(userId);
      setUserData(data);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <header className="header">
      <div className="header-content">
        <h1>My App</h1>
        {isLoading ? (
          <div>Loading...</div>
        ) : userData ? (
          <div className="user-info">
            <span>Welcome, {userData.name}</span>
            <button onClick={onLogout}>Logout</button>
          </div>
        ) : (
          <button>Login</button>
        )}
      </div>
    </header>
  );
};

export default Header;`
  },
  {
    path: '/src/api/users.js',
    name: 'users.js',
    extension: '.js',
    size: 2048,
    lines: 78,
    content: `const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateEmail, validatePassword } = require('../utils/validation');

const router = express.Router();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.sendStatus(401);
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// GET /api/users/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { password, ...userData } = user.toObject();
    res.json(userData);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password does not meet requirements' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = new User({
      email,
      password: hashedPassword,
      name
    });
    
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const { password: _, ...userData } = user.toObject();
    
    res.status(201).json({
      user: userData,
      token
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;`
  },
  {
    path: '/src/services/auth.js',
    name: 'auth.js',
    extension: '.js',
    size: 1024,
    lines: 42,
    content: `const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

class AuthService {
  static async login(email, password) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }
      
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return { token, user: { id: user._id, email: user.email, name: user.name } };
    } catch (error) {
      throw error;
    }
  }
  
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
  
  static async refreshToken(token) {
    try {
      const decoded = this.verifyToken(token);
      const newToken = jwt.sign(
        { userId: decoded.userId, email: decoded.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      return newToken;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = AuthService;`
  }
];

// Enhanced test helpers
global.testHelpers = {
  createMockFile: (path, content, options = {}) => ({
    path,
    relativePath: path.replace(process.cwd(), '.'),
    name: path.split('/').pop(),
    extension: path.split('.').pop(),
    content: content || '',
    size: content ? content.length : 0,
    lines: content ? content.split('\n').length : 0,
    lastModified: new Date(),
    ...options
  }),

  createMockProjectInfo: (overrides = {}) => ({
    framework: 'nextjs',
    language: 'javascript',
    type: 'node',
    version: '1.0.0',
    metrics: { totalFiles: 10, totalLines: 500, totalSize: 25600 },
    dependencies: { total: 15 },
    files: {
      apis: [],
      components: [],
      services: [],
      models: [],
      websockets: [],
      auth: [],
      configs: [],
      tests: []
    },
    packageJson: {
      name: 'test-project',
      version: '1.0.0',
      dependencies: {},
      devDependencies: {},
      scripts: {}
    },
    ...overrides
  }),

  createMockLogger: () => ({
    start: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }),

  createMockCache: () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    generateKey: jest.fn().mockReturnValue('mock-cache-key'),
    clear: jest.fn().mockResolvedValue(true),
    has: jest.fn().mockResolvedValue(false)
  }),

  createMockErrorHandler: () => ({
    handle: jest.fn().mockReturnValue({
      message: 'Mock error',
      recoverable: true,
      stack: 'Mock stack trace',
      code: 'MOCK_ERROR'
    })
  }),

  createMockAIExecutor: () => ({
    execute: jest.fn().mockResolvedValue({ success: true, data: {} }),
    cleanup: jest.fn().mockResolvedValue(true)
  }),

  createTempFile: async (filename, content) => {
    const filepath = path.join(global.TEST_CONFIG.tempDir, filename);
    await fs.writeFile(filepath, content);
    return filepath;
  },

  cleanupTempFiles: async () => {
    try {
      const files = await fs.readdir(global.TEST_CONFIG.tempDir);
      await Promise.all(
        files.map(file => 
          fs.unlink(path.join(global.TEST_CONFIG.tempDir, file))
        )
      );
    } catch (error) {
      // Ignore cleanup errors
    }
  }
};

// Mock implementations for Node.js modules
jest.mock('child_process', () => ({
  exec: jest.fn(),
  execSync: jest.fn().mockReturnValue('mock output'),
  spawn: jest.fn()
}));

// Global error handler for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});