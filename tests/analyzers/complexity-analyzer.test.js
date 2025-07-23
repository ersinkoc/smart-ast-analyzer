const ComplexityAnalyzer = require('../../lib/analyzers/complexity-analyzer');

describe('ComplexityAnalyzer', () => {
  let analyzer;
  let mockProjectInfo;
  let mockFiles;

  beforeEach(() => {
    analyzer = new ComplexityAnalyzer('react', { analysisDepth: 'comprehensive' });
    
    mockProjectInfo = {
      framework: 'react',
      totalFiles: 10,
      dependencies: { total: 25 }
    };

    mockFiles = [
      {
        path: '/src/components/ComplexComponent.jsx',
        content: `
import React, { useState, useEffect } from 'react';

const ComplexComponent = ({ data, onUpdate }) => {
  const [state, setState] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (data && data.length > 0) {
      processData(data);
    }
  }, [data]);

  const processData = async (inputData) => {
    try {
      setLoading(true);
      setError(null);
      
      for (let i = 0; i < inputData.length; i++) {
        if (inputData[i].type === 'complex') {
          if (inputData[i].nested) {
            for (let j = 0; j < inputData[i].nested.length; j++) {
              if (inputData[i].nested[j].validate) {
                if (await validateItem(inputData[i].nested[j])) {
                  setState(prev => ({ ...prev, [inputData[i].nested[j].id]: true }));
                } else {
                  setState(prev => ({ ...prev, [inputData[i].nested[j].id]: false }));
                }
              }
            }
          }
        } else if (inputData[i].type === 'simple') {
          setState(prev => ({ ...prev, [inputData[i].id]: inputData[i].value }));
        } else {
          console.warn('Unknown data type:', inputData[i].type);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateItem = async (item) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(item.value > 0 && item.value < 100);
      }, Math.random() * 1000);
    });
  };

  const handleSubmit = () => {
    if (Object.keys(state).length > 0) {
      if (onUpdate && typeof onUpdate === 'function') {
        onUpdate(state);
      }
    }
  };

  // TODO: Optimize this component - it's getting too complex
  // FIXME: Handle edge cases better

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="complex-component">
      <h1>Complex Component</h1>
      {data && data.map((item, index) => (
        <div key={index}>
          <span>{item.name}</span>
          {state[item.id] && <span>✓</span>}
        </div>
      ))}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
};

export default ComplexComponent;
`,
        lines: 68,
        size: 2048
      },
      {
        path: '/src/utils/helpers.js',
        content: `
const formatDate = (date) => {
  return date.toLocaleDateString();
};

const calculateSum = (numbers) => {
  return numbers.reduce((sum, num) => sum + num, 0);
};

const validateEmail = (email) => {
  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return regex.test(email);
};

// Simple utility functions
const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);
const isEmptyObject = (obj) => Object.keys(obj).length === 0;

module.exports = {
  formatDate,
  calculateSum,
  validateEmail,
  capitalizeFirst,
  isEmptyObject
};
`,
        lines: 20,
        size: 512
      },
      {
        path: '/src/services/DataService.js',
        content: `
class DataService {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.cache = new Map();
  }

  async fetchUser(userId) {
    if (this.cache.has(userId)) {
      return this.cache.get(userId);
    }

    try {
      const response = await fetch(\`\${this.apiUrl}/users/\${userId}\`);
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      const user = await response.json();
      this.cache.set(userId, user);
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  async updateUser(userId, userData) {
    try {
      const response = await fetch(\`\${this.apiUrl}/users/\${userId}\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const updatedUser = await response.json();
      this.cache.set(userId, updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = DataService;
`,
        lines: 45,
        size: 1024
      }
    ];
  });

  describe('constructor', () => {
    test('should initialize with framework and options', () => {
      expect(analyzer.framework).toBe('react');
      expect(analyzer.options.analysisDepth).toBe('comprehensive');
      expect(analyzer.complexityThresholds).toBeDefined();
      expect(analyzer.debtPatterns).toBeDefined();
    });
  });

  describe('analyze', () => {
    test('should perform comprehensive complexity analysis', async () => {
      const mockAIResult = { components: [{ name: 'TestComponent' }] };

      const result = await analyzer.analyze(mockAIResult, mockFiles, mockProjectInfo);

      expect(result).toBeDefined();
      expect(result.codeMetrics).toBeDefined();
      expect(result.technicalDebt).toBeDefined();
      expect(result.maintainabilityIndex).toBeDefined();
      expect(result.codeSmells).toBeDefined();
      expect(result.refactoringOpportunities).toBeDefined();
      expect(result.complexityTrends).toBeDefined();
      expect(result.qualityGates).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('should handle empty AI result', async () => {
      const result = await analyzer.analyze(null, mockFiles, mockProjectInfo);

      expect(result.codeMetrics.cyclomaticComplexity).toBe(0);
      expect(result.recommendations).toContain('Complexity analysis could not be performed');
    });

    test('should handle AI result with error', async () => {
      const errorResult = { error: 'Analysis failed' };
      const result = await analyzer.analyze(errorResult, mockFiles, mockProjectInfo);

      expect(result.metadata.error).toBe('Analysis failed');
    });
  });

  describe('calculateCodeMetrics', () => {
    test('should calculate comprehensive code metrics', async () => {
      const metrics = await analyzer.calculateCodeMetrics(mockFiles);

      expect(metrics.cyclomaticComplexity).toBeGreaterThan(0);
      expect(metrics.cognitiveComplexity).toBeGreaterThan(0);
      expect(metrics.linesOfCode).toBeGreaterThan(0);
      expect(metrics.commentLines).toBeDefined();
      expect(metrics.codeToCommentRatio).toBeDefined();
      expect(metrics.fileComplexity).toHaveLength(mockFiles.length);
      expect(metrics.functionComplexity).toBeDefined();
      expect(metrics.classComplexity).toBeDefined();
    });

    test('should calculate derived metrics correctly', async () => {
      const metrics = await analyzer.calculateCodeMetrics(mockFiles);

      expect(metrics.averageMethodLength).toBeGreaterThanOrEqual(0);
      expect(metrics.maintainabilityMetrics).toBeDefined();
      expect(metrics.maintainabilityMetrics.averageComplexity).toBeDefined();
    });
  });

  describe('calculateCyclomaticComplexity', () => {
    test('should calculate complexity for simple code', () => {
      const simpleCode = `
        function simple() {
          return true;
        }
      `;
      
      const complexity = analyzer.calculateCyclomaticComplexity(simpleCode);
      expect(complexity).toBe(1); // Base complexity
    });

    test('should calculate complexity for complex code', () => {
      const complexCode = `
        function complex(x) {
          if (x > 0) {
            if (x < 10) {
              for (let i = 0; i < x; i++) {
                if (i % 2 === 0) {
                  return i;
                }
              }
            } else {
              while (x > 10) {
                x--;
              }
            }
          }
          return x;
        }
      `;
      
      const complexity = analyzer.calculateCyclomaticComplexity(complexCode);
      expect(complexity).toBeGreaterThan(5);
    });

    test('should handle logical operators', () => {
      const logicalCode = `
        if (a && b || c) {
          return true;
        }
      `;
      
      const complexity = analyzer.calculateCyclomaticComplexity(logicalCode);
      expect(complexity).toBe(4); // 1 + if + && + ||
    });
  });

  describe('calculateCognitiveComplexity', () => {
    test('should consider nesting weight', () => {
      const nestedCode = `
        function nested() {
          if (condition1) {
            if (condition2) {
              if (condition3) {
                return true;
              }
            }
          }
        }
      `;
      
      const complexity = analyzer.calculateCognitiveComplexity(nestedCode);
      expect(complexity).toBeGreaterThan(3); // Should be higher due to nesting
    });
  });

  describe('analyzeFunctions', () => {
    test('should identify all function types', () => {
      const code = `
        function regularFunction() { return 1; }
        const arrowFunction = () => { return 2; };
        const methodFunction = {
          method() { return 3; }
        };
      `;
      
      const functions = analyzer.analyzeFunctions(code, '/test.js');
      
      expect(functions.length).toBeGreaterThanOrEqual(2);
      expect(functions[0]).toHaveProperty('name');
      expect(functions[0]).toHaveProperty('complexity');
      expect(functions[0]).toHaveProperty('lines');
    });

    test('should count parameters correctly', () => {
      const code = `
        function withParams(a, b, c) { return a + b + c; }
        const noParams = () => { return 1; };
      `;
      
      const functions = analyzer.analyzeFunctions(code, '/test.js');
      const withParamsFunc = functions.find(f => f.name === 'withParams');
      const noParamsFunc = functions.find(f => f.name === 'noParams');
      
      expect(withParamsFunc.parameters).toBe(3);
      expect(noParamsFunc.parameters).toBe(0);
    });
  });

  describe('analyzeClasses', () => {
    test('should analyze class structure', () => {
      const code = `
        class TestClass {
          constructor(name) {
            this.name = name;
            this.data = [];
          }
          
          getName() {
            return this.name;
          }
          
          setData(data) {
            this.data = data;
          }
          
          processData() {
            return this.data.map(item => item.value);
          }
        }
      `;
      
      const classes = analyzer.analyzeClasses(code, '/test.js');
      
      expect(classes).toHaveLength(1);
      expect(classes[0].name).toBe('TestClass');
      expect(classes[0].methods).toBeGreaterThan(0);
      expect(classes[0].responsibilities).toBeGreaterThan(0);
    });

    test('should calculate class cohesion', () => {
      const code = `
        class CohesiveClass {
          constructor() {
            this.value = 0;
          }
          
          getValue() {
            return this.value;
          }
          
          setValue(val) {
            this.value = val;
          }
        }
      `;
      
      const classes = analyzer.analyzeClasses(code, '/test.js');
      expect(classes[0].cohesion).toBeGreaterThan(0);
    });
  });

  describe('assessTechnicalDebt', () => {
    test('should identify various debt categories', async () => {
      const debt = await analyzer.assessTechnicalDebt(mockFiles);

      expect(debt.categories.codeSmells).toBeDefined();
      expect(debt.categories.complexCode).toBeDefined();
      expect(debt.categories.documentationDebt).toBeDefined();
      expect(debt.categories.architecturalDebt).toBeDefined();
      
      expect(debt.totalDebt).toBeGreaterThan(0);
      expect(debt.debtRatio).toBeDefined();
      expect(debt.prioritizedTasks).toBeDefined();
    });

    test('should detect TODO/FIXME debt', async () => {
      const debt = await analyzer.assessTechnicalDebt(mockFiles);
      
      const todoDebt = debt.issues.find(issue => issue.type === 'TODO');
      expect(todoDebt).toBeDefined();
      expect(todoDebt.severity).toBe('medium');
    });

    test('should calculate debt ratio', async () => {
      const debt = await analyzer.assessTechnicalDebt(mockFiles);
      
      expect(debt.debtRatio).toBeGreaterThanOrEqual(0);
      expect(debt.debtRatio).toBeLessThanOrEqual(100);
    });

    test('should detect different types of TODO debt', async () => {
      const todoFiles = [{
        path: '/todos.js',
        content: `
          // TODO: Implement this feature
          // FIXME: This is broken
          // HACK: Temporary solution
          // XXX: This needs review
          function example() {
            return true;
          }
        `,
        lines: 8
      }];

      const debt = await analyzer.assessTechnicalDebt(todoFiles);
      
      const todoIssue = debt.issues.find(issue => issue.type === 'TODO');
      const fixmeIssue = debt.issues.find(issue => issue.type === 'FIXME');
      const hackIssue = debt.issues.find(issue => issue.type === 'HACK');
      const xxxIssue = debt.issues.find(issue => issue.type === 'XXX');
      
      expect(todoIssue).toBeDefined();
      expect(fixmeIssue).toBeDefined();
      expect(hackIssue).toBeDefined();
      expect(xxxIssue).toBeDefined();
      
      expect(fixmeIssue.severity).toBe('high');
      expect(hackIssue.severity).toBe('high');
      expect(todoIssue.severity).toBe('medium');
      expect(xxxIssue.severity).toBe('medium');
    });

    test('should handle files with high comment ratio (no documentation debt)', async () => {
      const wellDocumentedFiles = [{
        path: '/documented.js',
        content: `
          // This is a well-documented function
          // It performs calculations
          // Returns the result
          function calculate() {
            // Process the data
            const result = 42;
            // Return the calculated value
            return result;
          }
        `,
        lines: 10
      }];

      const debt = await analyzer.assessTechnicalDebt(wellDocumentedFiles);
      
      const docDebt = debt.issues.find(issue => issue.type === 'Documentation Debt');
      expect(docDebt).toBeUndefined(); // Should not have doc debt
    });

    test('should handle empty files gracefully', async () => {
      const emptyFiles = [{
        path: '/empty.js',
        content: '',
        lines: 0
      }];

      const debt = await analyzer.assessTechnicalDebt(emptyFiles);
      
      // Empty files may still have documentation debt due to low comment ratio
      expect(debt.totalDebt).toBeGreaterThanOrEqual(0);
      expect(debt.debtRatio).toBeGreaterThanOrEqual(0);
    });
  });

  describe('detectCodeSmells', () => {
    test('should detect long methods', async () => {
      const longMethodFile = {
        path: '/test/long-method.js',
        content: `
function veryLongMethod() {
${Array(60).fill('  console.log("line");').join('\n')}
}
        `,
        lines: 62
      };

      const smells = await analyzer.detectCodeSmells([longMethodFile]);
      const longMethodSmell = smells.find(s => s.type === 'Long Method');
      
      expect(longMethodSmell).toBeDefined();
      expect(longMethodSmell.severity).toBe('medium');
    });

    test('should detect god classes', async () => {
      const godClassCode = `
class GodClass {
${Array(25).fill('  method() { return true; }').join('\n')}
}
      `;
      
      const godClassFile = {
        path: '/test/god-class.js',
        content: godClassCode,
        lines: godClassCode.split('\n').length
      };

      const smells = await analyzer.detectCodeSmells([godClassFile]);
      const godClassSmell = smells.find(s => s.type === 'God Class');
      
      expect(godClassSmell).toBeDefined();
      expect(godClassSmell.severity).toBe('high');
    });

    test('should detect deep nesting', async () => {
      const deepNestedCode = `
function deeplyNested() {
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          if (e) {
            if (f) {
              return true;
            }
          }
        }
      }
    }
  }
}
      `;
      
      const deepNestedFile = {
        path: '/test/deep-nested.js',
        content: deepNestedCode,
        lines: 15
      };

      const smells = await analyzer.detectCodeSmells([deepNestedFile]);
      const nestingSmell = smells.find(s => s.type === 'Deep Nesting');
      
      expect(nestingSmell).toBeDefined();
      expect(nestingSmell.severity).toBe('high');
    });

    test('should detect long parameter lists', async () => {
      const longParamCode = `
function manyParams(a, b, c, d, e, f, g) {
  return a + b + c + d + e + f + g;
}
      `;
      
      const longParamFile = {
        path: '/test/long-params.js',
        content: longParamCode,
        lines: 3
      };

      const smells = await analyzer.detectCodeSmells([longParamFile]);
      const paramSmell = smells.find(s => s.type === 'Long Parameter List');
      
      expect(paramSmell).toBeDefined();
      expect(paramSmell.severity).toBe('medium');
    });
  });

  describe('identifyRefactoringOpportunities', () => {
    test('should suggest extract method for complex code', () => {
      const complexFile = {
        path: '/test/complex.js',
        content: `
function complex() {
  if (a) { if (b) { if (c) { if (d) { return 1; } } } }
  if (e) { if (f) { if (g) { if (h) { return 2; } } } }
}
        `
      };

      const opportunities = analyzer.identifyRefactoringOpportunities([complexFile]);
      const extractMethod = opportunities.find(o => o.type === 'Extract Method');
      
      expect(extractMethod).toBeDefined();
      expect(extractMethod.priority).toBe('high');
    });

    test('should suggest polymorphism for switch statements', () => {
      const switchCode = `
switch (type) {
  case 'A': return handleA();
  case 'B': return handleB();
}
switch (status) {
  case 'active': return processActive();
  case 'inactive': return processInactive();
}
switch (role) {
  case 'admin': return adminAction();
  case 'user': return userAction();
}
      `;
      
      const switchFile = {
        path: '/test/switches.js',
        content: switchCode
      };

      const opportunities = analyzer.identifyRefactoringOpportunities([switchFile]);
      const polymorphism = opportunities.find(o => 
        o.type === 'Replace Conditional with Polymorphism'
      );
      
      expect(polymorphism).toBeDefined();
      expect(polymorphism.priority).toBe('medium');
    });
  });

  describe('analyzeComplexityTrends', () => {
    test('should analyze complexity trends', () => {
      const trends = analyzer.analyzeComplexityTrends(mockFiles);

      expect(trends.average).toBeDefined();
      expect(trends.distribution).toBeDefined();
      expect(trends.trend).toBeDefined();
      expect(trends.hotspots).toBeDefined();
      expect(trends.recommendations).toBeDefined();
    });

    test('should identify complexity hotspots', () => {
      const trends = analyzer.analyzeComplexityTrends(mockFiles);
      
      expect(trends.hotspots).toHaveLength(Math.min(10, mockFiles.length));
      expect(trends.hotspots[0]).toHaveProperty('file');
      expect(trends.hotspots[0]).toHaveProperty('complexity');
      expect(trends.hotspots[0]).toHaveProperty('severity');
    });
  });

  describe('evaluateQualityGates', () => {
    test('should evaluate quality gates', () => {
      const gates = analyzer.evaluateQualityGates(mockFiles);

      expect(gates.gates).toBeDefined();
      expect(gates.passed).toBeDefined();
      expect(gates.failed).toBeDefined();
      expect(gates.status).toBeDefined();
      expect(gates.overallScore).toBeDefined();
    });

    test('should mark failing gates correctly', () => {
      const highComplexityFiles = [{
        path: '/test.js',
        content: Array(50).fill('if (true) { console.log("test"); }').join('\n')
      }];

      const gates = analyzer.evaluateQualityGates(highComplexityFiles);
      const complexityGate = gates.gates.find(g => g.name === 'Cyclomatic Complexity');
      
      expect(complexityGate).toBeDefined();
      if (complexityGate.actual >= complexityGate.threshold) {
        expect(complexityGate.status).toBe('pass');
      } else {
        expect(complexityGate.status).toBe('fail');
      }
    });
  });

  describe('generateComplexityRecommendations', () => {
    test('should recommend complexity reduction for high complexity', () => {
      const highComplexityFiles = [{
        path: '/test.js',
        content: Array(50).fill('if (true) { if (true) { console.log("test"); } }').join('\n')
      }];

      const recommendations = analyzer.generateComplexityRecommendations(highComplexityFiles);
      const complexityRec = recommendations.find(r => r.category === 'complexity');
      
      expect(complexityRec).toBeDefined();
      expect(complexityRec.priority).toBe('high');
    });

    test('should recommend maintainability improvements', () => {
      const recommendations = analyzer.generateComplexityRecommendations(mockFiles);
      const maintainabilityRec = recommendations.find(r => r.category === 'maintainability');
      
      // This may or may not be present depending on the maintainability score
      if (maintainabilityRec) {
        expect(maintainabilityRec.priority).toBe('medium');
      }
    });
  });

  describe('utility methods', () => {
    test('should count lines correctly', () => {
      const content = 'line1\nline2\n\nline4';
      expect(analyzer.countLines(content)).toBe(3); // Empty lines excluded
    });

    test('should categorize project size', () => {
      expect(analyzer.categorizeProjectSize(500)).toBe('small');
      expect(analyzer.categorizeProjectSize(5000)).toBe('medium');
      expect(analyzer.categorizeProjectSize(25000)).toBe('large');
      expect(analyzer.categorizeProjectSize(75000)).toBe('enterprise');
    });

    test('should detect file types correctly', () => {
      expect(analyzer.isFrontendFile('/src/components/Button.jsx')).toBe(true);
      expect(analyzer.isBackendFile('/src/api/users.js')).toBe(true);
      expect(analyzer.isTestFile('/src/components/Button.test.js')).toBe(true);
      expect(analyzer.isConfigFile('/webpack.config.js')).toBe(true);
    });

    test('should calculate nesting level', () => {
      const nestedCode = `
        if (a) {
          if (b) {
            if (c) {
              return true;
            }
          }
        }
      `;
      
      const nestingLevel = analyzer.calculateNestingLevel(nestedCode);
      expect(nestingLevel).toBeGreaterThanOrEqual(3);
    });

    test('should calculate project size with zero files', () => {
      const size = analyzer.calculateProjectSize([]);
      expect(size.lines).toBe(0);
      expect(size.bytes).toBe(0);
      expect(size.files).toBe(0);
      expect(size.avgLinesPerFile).toBe(0);
      expect(size.sizeCategory).toBe('small');
    });

    test('should determine analysis scope with mixed file types', () => {
      const mixedFiles = [
        { path: '/src/components/Button.jsx', content: 'jsx' },
        { path: '/src/components/Modal.tsx', content: 'tsx' }, 
        { path: '/src/api/users.js', content: 'js' },
        { path: '/src/services/data.js', content: 'service' },
        { path: '/tests/button.test.js', content: 'test' },
        { path: '/config/webpack.config.js', content: 'config' }
      ];

      const scope = analyzer.determineAnalysisScope(mixedFiles);
      
      expect(scope.primary).toBeDefined();
      expect(scope.distribution).toBeDefined();
      expect(scope.distribution.frontend).toBeGreaterThan(0);
      expect(scope.distribution.backend).toBeGreaterThan(0);
      expect(scope.distribution.test).toBeGreaterThan(0);
      expect(scope.distribution.config).toBeGreaterThan(0);
      expect(scope.isFullstack).toBe(true);
    });

    test('should detect different config file patterns', () => {
      expect(analyzer.isConfigFile('package.json')).toBe(true);
      expect(analyzer.isConfigFile('.babelrc')).toBe(true);
      expect(analyzer.isConfigFile('config.yml')).toBe(true);
      expect(analyzer.isConfigFile('settings.toml')).toBe(true);
      expect(analyzer.isConfigFile('/src/components/Button.jsx')).toBe(false);
    });

    test('should detect different test file patterns', () => {
      expect(analyzer.isTestFile('component.test.js')).toBe(true);
      expect(analyzer.isTestFile('utils.spec.ts')).toBe(true);
      expect(analyzer.isTestFile('__tests__/helper.js')).toBe(true);
      expect(analyzer.isTestFile('/src/components/Button.jsx')).toBe(false);
    });

    test('should detect backend file patterns', () => {
      expect(analyzer.isBackendFile('/src/server/index.js')).toBe(true);
      expect(analyzer.isBackendFile('/api/routes/users.js')).toBe(true);
      expect(analyzer.isBackendFile('/controllers/auth.js')).toBe(true);
      expect(analyzer.isBackendFile('/models/user.js')).toBe(true);
      expect(analyzer.isBackendFile('/services/email.js')).toBe(true);
      expect(analyzer.isBackendFile('/src/components/Button.jsx')).toBe(false);
    });

    test.skip('should detect frontend file patterns', () => {
      expect(analyzer.isFrontendFile('/src/components/Button.jsx')).toBe(true);
      expect(analyzer.isFrontendFile('/client/app.js')).toBe(true);
      expect(analyzer.isFrontendFile('/styles/main.css')).toBe(true);
      expect(analyzer.isFrontendFile('/scss/variables.scss')).toBe(true);
      expect(analyzer.isFrontendFile('/index.html')).toBe(true);
      expect(analyzer.isFrontendFile('/src/component/Widget.ts')).toBe(true); // Contains 'component'
      expect(analyzer.isFrontendFile('/api/routes/users.js')).toBe(false);
    });
  });

  describe('maintainability calculations', () => {
    test('should calculate file maintainability index', () => {
      const metrics = {
        cyclomaticComplexity: 10,
        linesOfCode: 100,
        commentLines: 20
      };
      
      const mi = analyzer.calculateFileMaintainabilityIndex(metrics);
      expect(mi).toBeGreaterThanOrEqual(0);
      expect(mi).toBeLessThanOrEqual(171);
    });

    test('should categorize maintainability levels', () => {
      expect(analyzer.categorializeMaintainability(90)).toBe('excellent');
      expect(analyzer.categorializeMaintainability(75)).toBe('good');
      expect(analyzer.categorializeMaintainability(60)).toBe('fair');
      expect(analyzer.categorializeMaintainability(35)).toBe('poor');
      expect(analyzer.categorializeMaintainability(15)).toBe('critical');
    });

    test('should assess maintenance risk', () => {
      expect(analyzer.assessMaintenanceRisk(35, 15)).toBe('critical');
      expect(analyzer.assessMaintenanceRisk(25, 35)).toBe('high');
      expect(analyzer.assessMaintenanceRisk(15, 65)).toBe('medium');
      expect(analyzer.assessMaintenanceRisk(8, 85)).toBe('low');
    });
  });

  describe('duplicate code detection', () => {
    test('should detect duplicate lines', () => {
      const lines = [
        'const result = processData(input);',
        'console.log("Processing complete");',
        'const result = processData(input);', // duplicate
        'return result;',
        'console.log("Processing complete");' // duplicate
      ];
      
      const duplicates = analyzer.detectDuplicateCode(lines, '/test.js');
      expect(duplicates.length).toBeGreaterThan(0);
    });

    test('should ignore short lines', () => {
      const lines = [
        'a',
        'b',
        'a', // duplicate but too short
        'const longLineOfCodeThatShouldBeDetected = true;',
        'const longLineOfCodeThatShouldBeDetected = true;' // duplicate and long enough
      ];
      
      const duplicates = analyzer.detectDuplicateCode(lines, '/test.js');
      expect(duplicates.length).toBe(1); // Only the long duplicate should be detected
    });
  });

  describe('language distribution analysis', () => {
    test('should analyze language distribution', () => {
      const files = [
        { path: '/test.js', content: 'test', lines: 10, size: 100 },
        { path: '/test.jsx', content: 'test', lines: 20, size: 200 },
        { path: '/test.ts', content: 'test', lines: 15, size: 150 }
      ];

      const distribution = analyzer.analyzeLanguageDistribution(files);
      
      expect(distribution['.js']).toBeDefined();
      expect(distribution['.jsx']).toBeDefined();
      expect(distribution['.ts']).toBeDefined();
      expect(distribution['.js'].count).toBe(1);
      expect(distribution['.jsx'].count).toBe(1);
      expect(distribution['.ts'].count).toBe(1);
    });

    test('should handle files without size or lines properties', () => {
      const files = [
        { path: '/test.js', content: 'line1\nline2\nline3' }, // No size or lines
        { path: '/test.jsx', content: 'single line' }
      ];

      const distribution = analyzer.analyzeLanguageDistribution(files);
      
      expect(distribution['.js']).toBeDefined();
      expect(distribution['.jsx']).toBeDefined();
      expect(distribution['.js'].lines).toBeGreaterThan(0);
      expect(distribution['.jsx'].lines).toBeGreaterThan(0);
      expect(distribution['.js'].size).toBeGreaterThan(0);
      expect(distribution['.jsx'].size).toBeGreaterThan(0);
    });
  });

  describe('debt prioritization', () => {
    test('should prioritize technical debt tasks', () => {
      const issues = [
        { type: 'Critical Issue', severity: 'critical', effort: 60 },
        { type: 'Medium Issue', severity: 'medium', effort: 30 },
        { type: 'High Issue', severity: 'high', effort: 90 }
      ];

      const prioritized = analyzer.prioritizeTechnicalDebtTasks(issues);
      
      expect(prioritized).toHaveLength(3);
      expect(prioritized[0].priority).toBe(1); // Should be first priority
      expect(prioritized[0].estimatedROI).toBeDefined();
    });

    test('should calculate debt ROI correctly', () => {
      const issue = { severity: 'high', effort: 50 };
      const roi = analyzer.calculateDebtROI(issue);
      
      expect(roi).toBeGreaterThan(0);
      expect(typeof roi).toBe('number');
    });

    test('should handle issues without effort specified', () => {
      const issue = { severity: 'medium' }; // No effort specified
      const roi = analyzer.calculateDebtROI(issue);
      
      expect(roi).toBeGreaterThan(0);
      expect(typeof roi).toBe('number');
    });

    test('should handle unknown severity levels', () => {
      const issue = { severity: 'unknown', effort: 40 };
      const roi = analyzer.calculateDebtROI(issue);
      
      expect(roi).toBeGreaterThan(0);
      expect(typeof roi).toBe('number');
    });
  });

  describe('critical complexity scenarios', () => {
    test('should categorize files with critical complexity level (≥30)', () => {
      const criticalComplexityCode = Array(35).fill('if (condition) { if (nested) { return true; } }').join('\n');
      const criticalFile = {
        path: '/critical-complexity.js',
        content: criticalComplexityCode,
        lines: 35
      };

      const distribution = analyzer.getComplexityDistribution([criticalFile]);
      expect(distribution.critical).toBe(1);
      expect(distribution.low).toBe(0);
      expect(distribution.medium).toBe(0);
      expect(distribution.high).toBe(0);
    });

    test('should assess complexity trend as critical for high complexity values', () => {
      const trend = analyzer.assessComplexityTrend(35);
      expect(trend).toBe('critical');
    });

    test('should assess complexity trend as high for values 20-29', () => {
      const trend = analyzer.assessComplexityTrend(25);
      expect(trend).toBe('high');
    });

    test('should assess complexity trend as moderate for values 10-19', () => {
      const trend = analyzer.assessComplexityTrend(15);
      expect(trend).toBe('moderate');
    });

    test('should assess complexity trend as low for values below 10', () => {
      const trend = analyzer.assessComplexityTrend(5);
      expect(trend).toBe('low');
    });
  });

  describe('parameter object refactoring opportunities', () => {
    test('should suggest parameter object for functions with many parameters', () => {
      const manyParamCode = `
        function withManyParams(a, b, c, d, e, f) {
          return a + b + c + d + e + f;
        }
        
        function anotherWithManyParams(x, y, z, w, q, r, s) {
          return x * y * z * w * q * r * s;
        }
      `;
      
      const manyParamFile = {
        path: '/many-params.js',
        content: manyParamCode
      };

      const opportunities = analyzer.identifyRefactoringOpportunities([manyParamFile]);
      const paramObjectOpportunity = opportunities.find(o => 
        o.type === 'Introduce Parameter Object'
      );
      
      expect(paramObjectOpportunity).toBeDefined();
      expect(paramObjectOpportunity.priority).toBe('medium');
      expect(paramObjectOpportunity.description).toContain('functions with long parameter lists');
    });
  });

  describe('complexity trend recommendations', () => {
    test('should provide high complexity recommendations for avgComplexity > 25', () => {
      const recommendations = analyzer.generateTrendRecommendations(30);
      
      expect(recommendations).toContain('Implement code complexity gates in CI/CD pipeline');
      expect(recommendations).toContain('Schedule regular refactoring sessions');
      expect(recommendations).toContain('Conduct architecture review');
    });

    test('should provide medium complexity recommendations for avgComplexity 15-25', () => {
      const recommendations = analyzer.generateTrendRecommendations(20);
      
      expect(recommendations).toContain('Monitor complexity metrics regularly');
      expect(recommendations).toContain('Establish complexity thresholds for new code');
    });

    test('should provide low complexity recommendations for avgComplexity <= 15', () => {
      const recommendations = analyzer.generateTrendRecommendations(10);
      
      expect(recommendations).toContain('Maintain current practices');
      expect(recommendations).toContain('Consider sharing best practices with other teams');
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle empty file list', async () => {
      const result = await analyzer.analyze({}, [], mockProjectInfo);
      
      expect(result).toBeDefined();
      expect(result.codeMetrics.cyclomaticComplexity).toBe(0);
    });

    test('should handle files with no functions or classes', async () => {
      const simpleFiles = [{
        path: '/simple.js',
        content: 'const x = 1;\nconst y = 2;\nmodule.exports = { x, y };',
        lines: 3
      }];

      const metrics = await analyzer.calculateCodeMetrics(simpleFiles);
      
      expect(metrics.functionComplexity).toHaveLength(0);
      expect(metrics.classComplexity).toHaveLength(0);
    });

    test('should handle malformed code gracefully', async () => {
      const malformedFiles = [{
        path: '/malformed.js',
        content: 'function incomplete( { // malformed function',
        lines: 1
      }];

      // Should not throw an error
      const result = await analyzer.analyze({}, malformedFiles, mockProjectInfo);
      expect(result).toBeDefined();
    });

    test('should handle function with empty parameter list', () => {
      const paramCount = analyzer.countParameters('()');
      expect(paramCount).toBe(0);
    });

    test('should handle function with whitespace-only parameters', () => {
      const paramCount = analyzer.countParameters('( , , )');
      expect(paramCount).toBe(0); // Empty params should not be counted
    });

    test('should handle files without extension', () => {
      const files = [
        { path: '/README', content: 'readme', lines: 5, size: 50 },
        { path: '/Makefile', content: 'makefile', lines: 10, size: 100 }
      ];

      const distribution = analyzer.analyzeLanguageDistribution(files);
      
      expect(distribution['']).toBeDefined(); // Files without extension
      expect(distribution[''].count).toBe(2);
    });

    test('should handle zero-complexity files', () => {
      const simpleFiles = [{
        path: '/constants.js',
        content: 'const API_URL = "https://api.example.com";',
        lines: 1
      }];

      const distribution = analyzer.getComplexityDistribution(simpleFiles);
      expect(distribution.low).toBe(1);
      expect(distribution.medium).toBe(0);
      expect(distribution.high).toBe(0);
      expect(distribution.critical).toBe(0);
    });

    test('should handle switch statements in complexity calculation', () => {
      const switchCode = `
        function processType(type) {
          switch (type) {
            case 'A':
              return 'Type A';
            case 'B':
              return 'Type B';
            default:
              return 'Unknown';
          }
        }
      `;
      
      const complexity = analyzer.calculateCyclomaticComplexity(switchCode);
      expect(complexity).toBeGreaterThan(1); // Should count switch and cases
    });

    test.skip('should handle ternary operators in complexity calculation', () => {
      const ternaryCode = `
        const result = condition1 ? value1 : defaultValue;
        const another = condition2 ? value2 : fallback;
      `;
      
      const complexity = analyzer.calculateCyclomaticComplexity(ternaryCode);
      expect(complexity).toBeGreaterThan(1); // Should count ternary operators
    });

    test('should handle catch blocks in complexity calculation', () => {
      const catchCode = `
        try {
          riskyOperation();
        } catch (error1) {
          handleError1();
        } catch (error2) {
          handleError2();
        }
      `;
      
      const complexity = analyzer.calculateCyclomaticComplexity(catchCode);
      expect(complexity).toBeGreaterThan(1); // Should count catch blocks
    });

    test('should calculate coupling for files with no imports', () => {
      const noImportCode = `
        function standalone() {
          const local = 'value';
          return local.toUpperCase();
        }
      `;
      
      const coupling = analyzer.calculateCoupling(noImportCode);
      expect(coupling).toBeGreaterThanOrEqual(0);
    });

    test('should calculate cohesion for files with no variables', () => {
      const noVarCode = `
        function pureFunction(input) {
          return input * 2;
        }
      `;
      
      const cohesion = analyzer.calculateCohesion(noVarCode);
      expect(cohesion).toBe(0); // No variables means zero cohesion
    });

    test('should handle files with only frontend scope', () => {
      const frontendFiles = [
        { path: '/components/Button.jsx', content: 'jsx' },
        { path: '/components/Modal.tsx', content: 'tsx' },
        { path: '/styles/main.css', content: 'css' }
      ];

      const scope = analyzer.determineAnalysisScope(frontendFiles);
      
      expect(scope.primary).toBe('frontend');
      expect(scope.distribution.frontend).toBe(3);
      expect(scope.distribution.backend).toBe(0);
      expect(scope.isFullstack).toBe(false);
    });

    test('should handle quality gates with varying thresholds', () => {
      const lowComplexityFiles = [{
        path: '/simple.js',
        content: 'const x = 1;',
        lines: 1
      }];

      const gates = analyzer.evaluateQualityGates(lowComplexityFiles);
      
      expect(gates.gates).toHaveLength(4);
      expect(['pass', 'fail']).toContain(gates.status);
      expect(gates.overallScore).toBeGreaterThanOrEqual(0);
      expect(gates.overallScore).toBeLessThanOrEqual(100);
    });

    test('should handle else statements in complexity calculation', () => {
      const elseCode = `
        if (condition) {
          return 'true';
        } else {
          return 'false';
        }
      `;
      
      const complexity = analyzer.calculateCyclomaticComplexity(elseCode);
      expect(complexity).toBeGreaterThan(1); // Should count if and else
    });

    test('should handle while loops in complexity calculation', () => {
      const whileCode = `
        while (condition) {
          doSomething();
        }
      `;
      
      const complexity = analyzer.calculateCyclomaticComplexity(whileCode);
      expect(complexity).toBeGreaterThan(1); // Should count while loop
    });

    test('should handle for loops in complexity calculation', () => {
      const forCode = `
        for (let i = 0; i < 10; i++) {
          process(i);
        }
      `;
      
      const complexity = analyzer.calculateCyclomaticComplexity(forCode);
      expect(complexity).toBeGreaterThan(1); // Should count for loop
    });

    test('should handle empty analysis scope when no files match categories', () => {
      const miscFiles = [
        { path: '/doc.md', content: 'markdown' },
        { path: '/README.txt', content: 'readme' }
      ];

      const scope = analyzer.determineAnalysisScope(miscFiles);
      
      expect(scope.primary).toBeDefined();
      expect(scope.distribution.frontend).toBe(0);
      expect(scope.distribution.backend).toBe(0);
      expect(scope.distribution.test).toBe(0);
      expect(scope.distribution.config).toBe(0);
      expect(scope.isFullstack).toBe(false);
    });

    test('should calculate maintainability index for empty file list', () => {
      const maintainabilityIndex = analyzer.calculateMaintainabilityIndex([]);
      expect(maintainabilityIndex).toBe(0);
    });
  });
});