const SecurityAnalyzer = require('../../lib/analyzers/security-analyzer');

describe('SecurityAnalyzer', () => {
  let analyzer;
  let mockProjectInfo;
  let mockFiles;

  beforeEach(() => {
    analyzer = new SecurityAnalyzer('react');
    
    mockProjectInfo = {
      framework: 'react',
      dependencies: {
        dependencies: {
          'lodash': '^4.17.11',
          'axios': '^0.20.0',
          'express': '^4.17.0'
        },
        devDependencies: {
          'jest': '^29.0.0'
        }
      }
    };

    mockFiles = [
      {
        path: '/src/auth/login.js',
        content: `
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }
  
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }
  
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  return { token, user };
};
`
      },
      {
        path: '/src/api/users.js',
        content: `
const express = require('express');
const sql = require('mysql');

const router = express.Router();

router.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  const query = "SELECT * FROM users WHERE id = " + userId; // SQL injection vulnerability
  
  sql.query(query, (err, results) => {
    if (err) {
      console.log(err); // Information disclosure
      return res.status(500).send('Error');
    }
    res.json(results);
  });
});

const API_KEY = "sk-1234567890abcdef"; // Hardcoded secret
`
      },
      {
        path: '/src/components/UserProfile.jsx',
        content: `
import React from 'react';

const UserProfile = ({ userData }) => {
  const handleSubmit = (data) => {
    document.getElementById('profile').innerHTML = data.bio; // XSS vulnerability
  };

  return (
    <div>
      <h1>{userData.name}</h1>
      <div id="profile" dangerouslySetInnerHTML={{ __html: userData.bio }}></div>
    </div>
  );
};
`
      }
    ];
  });

  describe('constructor', () => {
    test('should initialize with framework', () => {
      expect(analyzer.framework).toBe('react');
      expect(analyzer.vulnerabilityPatterns).toBeDefined();
      expect(analyzer.owaspCategories).toBeDefined();
    });
  });

  describe('analyze', () => {
    test('should perform comprehensive security analysis', async () => {
      const mockAIResult = {
        authentication: {
          methods: ['jwt'],
          flows: {
            login: { secure: true, issues: [] }
          }
        },
        authorization: {
          type: 'jwt',
          roles: ['user', 'admin']
        },
        security: {
          vulnerabilities: [
            {
              type: 'SQL Injection',
              severity: 'critical',
              description: 'Potential SQL injection in user query'
            }
          ]
        }
      };

      const result = await analyzer.analyze(mockAIResult, mockFiles, mockProjectInfo);

      expect(result).toBeDefined();
      expect(result.staticAnalysis).toBeDefined();
      expect(result.dependencyAnalysis).toBeDefined();
      expect(result.owaspCompliance).toBeDefined();
      expect(result.securityScore).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('should handle empty AI result', async () => {
      const result = await analyzer.analyze(null, mockFiles, mockProjectInfo);

      expect(result).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.recommendations).toContain('No security analysis could be performed');
    });

    test('should handle AI result with error', async () => {
      const errorResult = { error: 'AI analysis failed' };
      const result = await analyzer.analyze(errorResult, mockFiles, mockProjectInfo);

      expect(result.metadata.error).toBe('AI analysis failed');
      expect(result.recommendations).toContain('No security analysis could be performed');
    });
  });

  describe('performStaticAnalysis', () => {
    test('should detect hardcoded secrets', async () => {
      const analysis = await analyzer.performStaticAnalysis(mockFiles);

      expect(analysis.hardcodedSecrets).toBeDefined();
      expect(analysis.hardcodedSecrets.length).toBeGreaterThan(0);
      
      const apiKeySecret = analysis.hardcodedSecrets.find(s => s.type === 'API Key');
      expect(apiKeySecret).toBeDefined();
      expect(apiKeySecret.file).toBe('/src/api/users.js');
      expect(apiKeySecret.severity).toBe('critical');
    });

    test('should detect insecure patterns', async () => {
      const analysis = await analyzer.performStaticAnalysis(mockFiles);

      expect(analysis.insecurePatterns).toBeDefined();
      expect(analysis.insecurePatterns.length).toBeGreaterThan(0);
      
      const sqlInjection = analysis.insecurePatterns.find(p => p.type === 'SQL Injection');
      expect(sqlInjection).toBeDefined();
      expect(sqlInjection.severity).toBe('critical');
    });

    test('should detect XSS vulnerabilities', async () => {
      const analysis = await analyzer.performStaticAnalysis(mockFiles);

      const xssPattern = analysis.insecurePatterns.find(p => p.type === 'XSS Risk');
      expect(xssPattern).toBeDefined();
      expect(xssPattern.file).toBe('/src/components/UserProfile.jsx');
    });
  });

  describe('detectHardcodedSecrets', () => {
    test('should detect various types of secrets', () => {
      const lines = [
        'const API_KEY = "sk-1234567890abcdef";',
        'const SECRET_KEY = "super-secret-key";',
        'const password = "admin123";',
        'const token = "jwt-token-here";',
        'const privateKey = "-----BEGIN PRIVATE KEY-----";',
        'const mongoUrl = "mongodb://user:pass@localhost:27017/db";'
      ];

      const secrets = analyzer.detectHardcodedSecrets(lines, '/test/file.js');

      expect(secrets).toHaveLength(6);
      expect(secrets[0].type).toBe('API Key');
      expect(secrets[1].type).toBe('Secret Key');
      expect(secrets[2].type).toBe('Password');
      expect(secrets[3].type).toBe('Token');
      expect(secrets[4].type).toBe('Private Key');
      expect(secrets[5].type).toBe('Database URL');
    });

    test('should provide mitigation advice', () => {
      const lines = ['const API_KEY = "sk-1234567890abcdef";'];
      const secrets = analyzer.detectHardcodedSecrets(lines, '/test/file.js');

      expect(secrets[0].mitigation).toBe('Move to environment variables or secure vault');
    });
  });

  describe('detectInsecurePatterns', () => {
    test('should detect code injection patterns', () => {
      const lines = [
        'eval(userInput);',
        'document.write(data);',
        'innerHTML = userInput;',
        'const query = "SELECT * FROM users WHERE id = " + userId;',
        'const template = `Hello ${userInput}`;',
        'const hash = md5(password);',
        'Math.random();'
      ];

      const patterns = analyzer.detectInsecurePatterns(lines, '/test/file.js');

      expect(patterns.length).toBeGreaterThan(0);
      
      const evalPattern = patterns.find(p => p.type === 'Code Injection');
      expect(evalPattern).toBeDefined();
      expect(evalPattern.severity).toBe('critical');

      const weakHashPattern = patterns.find(p => p.type === 'Weak Hash Algorithm');
      expect(weakHashPattern).toBeDefined();
    });

    test('should provide appropriate mitigations', () => {
      const lines = ['eval(userInput);'];
      const patterns = analyzer.detectInsecurePatterns(lines, '/test/file.js');

      expect(patterns[0].mitigation).toBe('Avoid eval(). Use JSON.parse() or safe alternatives');
    });
  });

  describe('detectSecurityCodeSmells', () => {
    test('should detect missing error handling in auth code', () => {
      const content = `
        const password = req.body.password;
        const hash = bcrypt.hash(password, 10);
        user.password = hash;
      `;

      const smells = analyzer.detectSecurityCodeSmells(content, '/auth/signup.js');

      const errorHandlingSmell = smells.find(s => s.type === 'Missing Error Handling');
      expect(errorHandlingSmell).toBeDefined();
      expect(errorHandlingSmell.severity).toBe('medium');
    });

    test('should detect information disclosure via console.log', () => {
      const content = `
        const user = await User.findById(id);
        console.log('User data:', user);
      `;

      const smells = analyzer.detectSecurityCodeSmells(content, '/api/users.js');

      const infoDisclosureSmell = smells.find(s => s.type === 'Information Disclosure');
      expect(infoDisclosureSmell).toBeDefined();
    });

    test('should detect incomplete security implementations', () => {
      const content = `
        // TODO: Add authentication middleware
        // FIXME: Implement proper authorization
        const authenticate = () => {
          // Implementation needed
        };
      `;

      const smells = analyzer.detectSecurityCodeSmells(content, '/middleware/auth.js');

      const incompleteSmell = smells.find(s => s.type === 'Incomplete Security Implementation');
      expect(incompleteSmell).toBeDefined();
    });
  });

  describe('detectAuthPatterns', () => {
    test('should detect JWT authentication', () => {
      const content = `
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ userId: user.id }, secret);
      `;

      const patterns = analyzer.detectAuthPatterns(content, '/auth/jwt.js');

      const jwtPattern = patterns.find(p => p.type === 'JWT Authentication');
      expect(jwtPattern).toBeDefined();
      expect(jwtPattern.confidence).toBe('high');
    });

    test('should detect OAuth patterns', () => {
      const content = `
        const passport = require('passport');
        const GoogleStrategy = require('passport-google-oauth20').Strategy;
      `;

      const patterns = analyzer.detectAuthPatterns(content, '/auth/oauth.js');

      const oauthPattern = patterns.find(p => p.type === 'OAuth Authentication');
      expect(oauthPattern).toBeDefined();
    });

    test('should detect session authentication', () => {
      const content = `
        const session = require('express-session');
        app.use(session({ secret: 'secret', cookie: { secure: true } }));
      `;

      const patterns = analyzer.detectAuthPatterns(content, '/app.js');

      const sessionPattern = patterns.find(p => p.type === 'Session Authentication');
      expect(sessionPattern).toBeDefined();
    });

    test('should warn about basic authentication', () => {
      const content = `
        const auth = require('basic-auth');
        const credentials = auth(req);
      `;

      const patterns = analyzer.detectAuthPatterns(content, '/middleware/basic.js');

      const basicPattern = patterns.find(p => p.type === 'Basic Authentication');
      expect(basicPattern).toBeDefined();
      expect(basicPattern.warning).toBe('Basic auth should only be used over HTTPS');
    });
  });

  describe('analyzeDependencies', () => {
    test('should identify vulnerable packages', async () => {
      const analysis = await analyzer.analyzeDependencies(mockProjectInfo);

      expect(analysis.vulnerabilities.length).toBeGreaterThan(0);
      
      const lodashVuln = analysis.vulnerabilities.find(v => v.package === 'lodash');
      expect(lodashVuln).toBeDefined();
      expect(lodashVuln.severity).toBe('medium');
    });

    test('should handle missing dependencies', async () => {
      const emptyProjectInfo = { dependencies: null };
      const analysis = await analyzer.analyzeDependencies(emptyProjectInfo);

      expect(analysis.vulnerabilities).toEqual([]);
      expect(analysis.outdated).toEqual([]);
    });
  });

  describe('assessOWASPCompliance', () => {
    test('should assess OWASP compliance categories', () => {
      const mockResult = {
        authentication: { methods: ['jwt'] },
        authorization: { type: 'rbac' },
        security: { 
          vulnerabilities: [
            { type: 'SQL Injection', severity: 'critical' }
          ]
        },
        protectedRoutes: [
          { path: '/admin', requiredRole: 'admin' }
        ]
      };

      const compliance = analyzer.assessOWASPCompliance(mockResult);

      expect(compliance.score).toBeDefined();
      expect(compliance.categories).toBeDefined();
      expect(compliance.violations).toBeDefined();
      expect(compliance.passed).toBeDefined();
    });

    test('should identify compliance violations', () => {
      const mockResult = {
        security: {
          vulnerabilities: [
            { type: 'SQL Injection', severity: 'critical' }
          ]
        },
        protectedRoutes: []
      };

      const compliance = analyzer.assessOWASPCompliance(mockResult);

      expect(compliance.violations.length).toBeGreaterThan(0);
    });
  });

  describe('assessAccessControl', () => {
    test('should pass with proper access controls', () => {
      const mockResult = {
        protectedRoutes: [
          { path: '/admin', requiredRole: 'admin' },
          { path: '/user', requiredRole: 'user' }
        ],
        authorization: { type: 'rbac' }
      };

      const assessment = analyzer.assessAccessControl(mockResult);

      expect(assessment.score).toBe(100);
      expect(assessment.issues).toHaveLength(0);
    });

    test('should fail with unprotected routes', () => {
      const mockResult = {
        protectedRoutes: [
          { path: '/admin' }, // Missing requiredRole
          { path: '/user', requiredRole: 'user' }
        ],
        authorization: { type: 'unknown' }
      };

      const assessment = analyzer.assessAccessControl(mockResult);

      expect(assessment.score).toBeLessThan(100);
      expect(assessment.issues.length).toBeGreaterThan(0);
    });
  });

  describe('assessCryptography', () => {
    test('should pass with strong cryptography', () => {
      const mockResult = {
        security: {
          passwordHashing: 'bcrypt',
          tokenType: 'jwt',
          tokenEncryption: true
        }
      };

      const assessment = analyzer.assessCryptography(mockResult);

      expect(assessment.score).toBe(100);
    });

    test('should fail with weak password hashing', () => {
      const mockResult = {
        security: {
          passwordHashing: 'md5',
          tokenType: 'custom',
          tokenEncryption: false
        }
      };

      const assessment = analyzer.assessCryptography(mockResult);

      expect(assessment.score).toBeLessThan(100);
      expect(assessment.issues).toContain('Weak password hashing algorithm detected');
    });
  });

  describe('assessInjection', () => {
    test('should pass with no injection vulnerabilities', () => {
      const mockResult = {
        security: { vulnerabilities: [] }
      };

      const assessment = analyzer.assessInjection(mockResult);

      expect(assessment.score).toBe(100);
    });

    test('should fail with injection vulnerabilities', () => {
      const mockResult = {
        security: {
          vulnerabilities: [
            { type: 'SQL Injection', severity: 'critical' },
            { type: 'Code Injection', severity: 'high' }
          ]
        }
      };

      const assessment = analyzer.assessInjection(mockResult);

      expect(assessment.score).toBeLessThan(100);
      expect(assessment.issues).toContain('2 injection vulnerabilities detected');
    });
  });

  describe('calculateSecurityScore', () => {
    test('should calculate score based on vulnerabilities', () => {
      const mockResult = {
        security: {
          vulnerabilities: [
            { severity: 'critical' },
            { severity: 'high' },
            { severity: 'medium' }
          ],
          csrfProtection: true,
          rateLimiting: true
        },
        authentication: { methods: ['jwt'] }
      };

      const score = analyzer.calculateSecurityScore(mockResult);

      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    test('should return perfect score for secure application', () => {
      const mockResult = {
        security: {
          vulnerabilities: [],
          csrfProtection: true,
          rateLimiting: true
        },
        authentication: { methods: ['jwt', 'oauth'] }
      };

      const score = analyzer.calculateSecurityScore(mockResult);

      expect(score).toBe(100);
    });
  });

  describe('performRiskAssessment', () => {
    test('should categorize risks by severity', () => {
      const mockResult = {
        security: {
          vulnerabilities: [
            { 
              type: 'SQL Injection',
              severity: 'critical',
              description: 'Critical SQL injection',
              suggestion: 'Use parameterized queries'
            },
            {
              type: 'XSS',
              severity: 'medium',
              description: 'Cross-site scripting',
              suggestion: 'Sanitize user input'
            }
          ]
        }
      };

      const risks = analyzer.performRiskAssessment(mockResult);

      expect(risks.critical).toHaveLength(1);
      expect(risks.medium).toHaveLength(1);
      expect(risks.high).toHaveLength(0);
      expect(risks.low).toHaveLength(0);
    });
  });

  describe('assessImpact and assessLikelihood', () => {
    test('should assess impact correctly', () => {
      const highImpactVuln = { type: 'SQL Injection' };
      const mediumImpactVuln = { type: 'XSS' };
      const lowImpactVuln = { type: 'Information Disclosure' };

      expect(analyzer.assessImpact(highImpactVuln)).toBe('high');
      expect(analyzer.assessImpact(mediumImpactVuln)).toBe('medium');
      expect(analyzer.assessImpact(lowImpactVuln)).toBe('low');
    });

    test('should assess likelihood correctly', () => {
      const highLikelihoodVuln = { type: 'SQL Injection' };
      const mediumLikelihoodVuln = { type: 'Authentication Bypass' };
      const lowLikelihoodVuln = { type: 'Other Vulnerability' };

      expect(analyzer.assessLikelihood(highLikelihoodVuln)).toBe('high');
      expect(analyzer.assessLikelihood(mediumLikelihoodVuln)).toBe('medium');
      expect(analyzer.assessLikelihood(lowLikelihoodVuln)).toBe('low');
    });
  });

  describe('generateMitigationStrategies', () => {
    test('should generate authentication strategies', () => {
      const mockResult = {
        authentication: { methods: [] },
        security: { vulnerabilities: [] }
      };

      const strategies = analyzer.generateMitigationStrategies(mockResult);

      const authStrategy = strategies.find(s => s.category === 'Authentication');
      expect(authStrategy).toBeDefined();
      expect(authStrategy.priority).toBe('high');
      expect(authStrategy.strategy).toBe('Implement Multi-Factor Authentication');
    });

    test('should generate encryption strategies', () => {
      const mockResult = {
        security: { tokenType: 'custom' }
      };

      const strategies = analyzer.generateMitigationStrategies(mockResult);

      const encryptionStrategy = strategies.find(s => s.category === 'Encryption');
      expect(encryptionStrategy).toBeDefined();
      expect(encryptionStrategy.priority).toBe('medium');
    });

    test('should generate input validation strategies', () => {
      const mockResult = {
        security: {
          vulnerabilities: [
            { type: 'SQL Injection' }
          ]
        }
      };

      const strategies = analyzer.generateMitigationStrategies(mockResult);

      const validationStrategy = strategies.find(s => s.category === 'Input Validation');
      expect(validationStrategy).toBeDefined();
      expect(validationStrategy.priority).toBe('critical');
    });
  });

  describe('generateComplianceReport', () => {
    test('should generate comprehensive compliance report', () => {
      const mockResult = {
        authentication: { methods: ['jwt'] },
        security: { vulnerabilities: [] }
      };

      const report = analyzer.generateComplianceReport(mockResult);

      expect(report.standards).toBeDefined();
      expect(report.standards['OWASP Top 10']).toBeDefined();
      expect(report.overallCompliance).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.actionItems).toBeDefined();
    });

    test('should recommend security audit for low compliance', () => {
      const mockResult = {
        security: {
          vulnerabilities: [
            { type: 'SQL Injection', severity: 'critical' }
          ]
        }
      };

      // Mock the OWASP assessment to return low score
      jest.spyOn(analyzer, 'assessOWASPCompliance').mockReturnValue({ score: 30 });
      jest.spyOn(analyzer, 'assessNISTCompliance').mockReturnValue({ score: 40 });
      jest.spyOn(analyzer, 'assessPCICompliance').mockReturnValue({ score: 35 });

      const report = analyzer.generateComplianceReport(mockResult);

      expect(report.overallCompliance).toBeLessThan(70);
      expect(report.actionItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: 'Security Audit'
          })
        ])
      );
    });
  });

  describe('generateSecurityRecommendations', () => {
    test('should generate critical recommendations for low security score', () => {
      const mockResult = {
        security: {
          vulnerabilities: [
            { severity: 'critical' },
            { severity: 'critical' }
          ]
        },
        authentication: { methods: [] }
      };

      const recommendations = analyzer.generateSecurityRecommendations(mockResult);

      const criticalRec = recommendations.find(r => r.priority === 'critical');
      expect(criticalRec).toBeDefined();
      expect(criticalRec.title).toBe('Immediate Security Review Required');
    });

    test('should recommend MFA when missing', () => {
      const mockResult = {
        authentication: { methods: ['password'] },
        security: { vulnerabilities: [] }
      };

      const recommendations = analyzer.generateSecurityRecommendations(mockResult);

      const mfaRec = recommendations.find(r => r.title === 'Implement Multi-Factor Authentication');
      expect(mfaRec).toBeDefined();
      expect(mfaRec.priority).toBe('high');
    });
  });

  describe('edge cases', () => {
    test('should handle files with no content', async () => {
      const emptyFiles = [{ path: '/empty.js', content: '' }];
      const analysis = await analyzer.performStaticAnalysis(emptyFiles);

      expect(analysis).toBeDefined();
      expect(analysis.hardcodedSecrets).toHaveLength(0);
      expect(analysis.insecurePatterns).toHaveLength(0);
    });

    test('should handle malformed dependency information', async () => {
      const malformedProjectInfo = {
        dependencies: {
          dependencies: null,
          devDependencies: undefined
        }
      };

      const analysis = await analyzer.analyzeDependencies(malformedProjectInfo);

      expect(analysis.vulnerabilities).toEqual([]);
    });

    test('should handle empty authentication methods', () => {
      const mockResult = {
        authentication: { methods: null }
      };

      const score = analyzer.calculateSecurityScore(mockResult);

      expect(score).toBeLessThanOrEqual(80); // Points deducted for missing auth
    });
  });

  describe('isSecurityFile', () => {
    test('should identify security-related files', () => {
      expect(analyzer.isSecurityFile('/auth/login.js')).toBe(true);
      expect(analyzer.isSecurityFile('/middleware/security.js')).toBe(true);
      expect(analyzer.isSecurityFile('/guards/admin.guard.ts')).toBe(true);
      expect(analyzer.isSecurityFile('/jwt/token.js')).toBe(true);
      expect(analyzer.isSecurityFile('/crypto/hash.js')).toBe(true);
      
      expect(analyzer.isSecurityFile('/components/Button.jsx')).toBe(false);
      expect(analyzer.isSecurityFile('/utils/helpers.js')).toBe(false);
    });
  });
});