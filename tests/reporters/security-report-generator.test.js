const SecurityReportGenerator = require('../../lib/reporters/security-report-generator');
const fs = require('fs').promises;
const path = require('path');

// Mock fs.promises
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn()
  }
}));

describe('SecurityReportGenerator', () => {
  let generator;
  let mockSecurityResults;
  let mockProjectInfo;

  beforeEach(() => {
    jest.clearAllMocks();
    
    generator = new SecurityReportGenerator();
    
    mockProjectInfo = {
      framework: 'react',
      type: 'web',
      language: 'JavaScript'
    };
    
    mockSecurityResults = {
      vulnerabilities: [
        {
          type: 'SQL Injection',
          severity: 'critical',
          description: 'SQL injection vulnerability in user input',
          location: { file: 'api/users.js', line: 42 },
          mitigation: 'Use parameterized queries'
        },
        {
          type: 'XSS',
          severity: 'high',
          description: 'Cross-site scripting vulnerability',
          location: { file: 'components/Comment.js', line: 15 }
        },
        {
          type: 'Information Disclosure',
          severity: 'medium',
          description: 'Sensitive data in console.log',
          location: { file: 'utils/debug.js', line: 8 }
        }
      ],
      securityScore: 65,
      authentication: {
        methods: ['jwt'],
        strength: 'medium'
      },
      authorization: {
        type: 'rbac',
        strength: 'strong'
      },
      staticAnalysis: {
        hardcodedSecrets: [
          { type: 'API Key', file: 'config.js', line: 10 }
        ],
        riskScore: 55
      },
      dependencyAnalysis: {
        vulnerabilities: [
          { package: 'lodash', version: '4.17.11', severity: 'critical' },
          { package: 'axios', version: '0.19.0', severity: 'medium' }
        ],
        securityScore: 70
      },
      owaspCompliance: {
        score: 75,
        violations: ['A01:2021', 'A03:2021']
      },
      complianceReport: {
        overallCompliance: 72,
        standards: {
          pci: { score: 80 },
          gdpr: { score: 65 }
        }
      },
      recommendations: [
        {
          priority: 'critical',
          title: 'Fix SQL Injection vulnerability',
          description: 'Use parameterized queries',
          implementation: { timeline: 'immediate' }
        },
        {
          priority: 'high',
          title: 'Implement MFA',
          description: 'Add multi-factor authentication'
        },
        {
          priority: 'medium',
          title: 'Update dependencies',
          description: 'Update vulnerable packages'
        }
      ]
    };
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      expect(generator.outputDir).toBe('./security-reports');
      expect(generator.format).toBe('html');
    });

    test('should initialize with custom options', () => {
      const customGenerator = new SecurityReportGenerator({
        output: './custom-reports',
        format: 'json'
      });
      
      expect(customGenerator.outputDir).toBe('./custom-reports');
      expect(customGenerator.format).toBe('json');
    });
  });

  describe('generateSecurityReport', () => {
    test('should generate HTML report when format is html', async () => {
      const result = await generator.generateSecurityReport(mockSecurityResults, mockProjectInfo);
      
      expect(fs.mkdir).toHaveBeenCalledWith('./security-reports', { recursive: true });
      expect(fs.writeFile).toHaveBeenCalled();
      expect(result.reportId).toMatch(/^security-\d+$/);
      expect(result.files).toHaveLength(1);
      expect(result.summary).toBeDefined();
    });

    test('should generate JSON report when format is json', async () => {
      generator.format = 'json';
      
      const result = await generator.generateSecurityReport(mockSecurityResults, mockProjectInfo);
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.json'),
        expect.any(String)
      );
      expect(result.files).toHaveLength(1);
    });

    test('should generate all formats when format is all', async () => {
      generator.format = 'all';
      
      const result = await generator.generateSecurityReport(mockSecurityResults, mockProjectInfo);
      
      expect(result.files).toHaveLength(3);
      expect(fs.writeFile).toHaveBeenCalledTimes(3);
    });

    test('should handle PDF format', async () => {
      generator.format = 'pdf';
      
      const result = await generator.generateSecurityReport(mockSecurityResults, mockProjectInfo);
      
      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toContain('.pdf');
    });
  });

  describe('generateExecutiveSummary', () => {
    test('should generate comprehensive summary', () => {
      const summary = generator.generateExecutiveSummary(mockSecurityResults);
      
      expect(summary.overallRisk).toBe('medium');
      expect(summary.totalVulnerabilities).toBe(3);
      expect(summary.criticalIssues).toBe(1);
      expect(summary.securityScore).toBe(65);
      expect(summary.complianceScore).toBe(72);
      expect(summary.keyFindings).toHaveLength(5);
      expect(summary.immediateActions).toHaveLength(3);
    });

    test('should handle missing data gracefully', () => {
      const summary = generator.generateExecutiveSummary({});
      
      expect(summary.totalVulnerabilities).toBe(0);
      expect(summary.criticalIssues).toBe(0);
      expect(summary.securityScore).toBe(0);
      expect(summary.complianceScore).toBe(0);
    });

    test('should identify key findings correctly', () => {
      const summary = generator.generateExecutiveSummary(mockSecurityResults);
      
      expect(summary.keyFindings).toContain('Multi-factor authentication not implemented');
      expect(summary.keyFindings).toContain('1 critical vulnerabilities identified');
      expect(summary.keyFindings).toContain('2 vulnerable dependencies found');
      expect(summary.keyFindings).toContain('1 hardcoded secrets detected');
    });
  });

  describe('calculateOverallRisk', () => {
    test('should calculate low risk for high scores', () => {
      const risk = generator.calculateOverallRisk({
        securityScore: 85,
        dependencyAnalysis: { securityScore: 90 },
        staticAnalysis: { riskScore: 88 }
      });
      
      expect(risk).toBe('low');
    });

    test('should calculate medium risk for medium scores', () => {
      const risk = generator.calculateOverallRisk({
        securityScore: 65,
        dependencyAnalysis: { securityScore: 70 }
      });
      
      expect(risk).toBe('medium');
    });

    test('should calculate high risk for low scores', () => {
      const risk = generator.calculateOverallRisk({
        securityScore: 45,
        staticAnalysis: { riskScore: 50 }
      });
      
      expect(risk).toBe('high');
    });

    test('should calculate critical risk for very low scores', () => {
      const risk = generator.calculateOverallRisk({
        securityScore: 30,
        dependencyAnalysis: { securityScore: 35 }
      });
      
      expect(risk).toBe('critical');
    });

    test('should return unknown for no scores', () => {
      const risk = generator.calculateOverallRisk({});
      expect(risk).toBe('unknown');
    });
  });

  describe('extractKeyFindings', () => {
    test('should extract authentication findings', () => {
      const findings = generator.extractKeyFindings({
        authentication: { methods: [] }
      });
      
      expect(findings).toContain('No authentication mechanisms detected');
    });

    test('should detect missing MFA', () => {
      const findings = generator.extractKeyFindings({
        authentication: { methods: ['jwt'] }
      });
      
      expect(findings).toContain('Multi-factor authentication not implemented');
    });

    test('should detect authorization issues', () => {
      const findings = generator.extractKeyFindings({
        authorization: { type: 'unknown' }
      });
      
      expect(findings).toContain('Authorization mechanism unclear or missing');
    });

    test('should limit findings to 10', () => {
      const manyVulns = Array(15).fill({ severity: 'critical' });
      const findings = generator.extractKeyFindings({
        vulnerabilities: manyVulns
      });
      
      expect(findings.length).toBeLessThanOrEqual(10);
    });
  });

  describe('extractImmediateActions', () => {
    test('should extract critical vulnerability actions', () => {
      const actions = generator.extractImmediateActions(mockSecurityResults);
      
      expect(actions).toContain('Fix SQL Injection vulnerability in api/users.js');
    });

    test('should include hardcoded secrets action', () => {
      const actions = generator.extractImmediateActions(mockSecurityResults);
      
      expect(actions).toContain('Remove all hardcoded secrets and use environment variables');
    });

    test('should include critical dependency updates', () => {
      const actions = generator.extractImmediateActions(mockSecurityResults);
      
      expect(actions).toContain('Update lodash to fix critical vulnerability');
    });

    test('should limit actions to 5', () => {
      const manyVulns = Array(10).fill({
        severity: 'critical',
        type: 'Test',
        location: { file: 'test.js' }
      });
      
      const actions = generator.extractImmediateActions({ vulnerabilities: manyVulns });
      
      expect(actions).toHaveLength(5);
    });
  });

  describe('generateRiskMatrix', () => {
    test('should categorize vulnerabilities by severity and likelihood', () => {
      const matrix = generator.generateRiskMatrix(mockSecurityResults);
      
      expect(matrix.critical).toBeDefined();
      expect(matrix.high).toBeDefined();
      expect(matrix.medium).toBeDefined();
      expect(matrix.low).toBeDefined();
    });

    test('should handle empty vulnerabilities', () => {
      const matrix = generator.generateRiskMatrix({});
      
      expect(matrix.critical.high).toEqual([]);
      expect(matrix.low.low).toEqual([]);
    });
  });

  describe('assessImpact', () => {
    test('should assess high impact for injection vulnerabilities', () => {
      const impact = generator.assessImpact({
        type: 'SQL Injection'
      });
      
      expect(impact).toBe('high');
    });

    test('should assess medium impact for XSS', () => {
      const impact = generator.assessImpact({
        type: 'XSS'
      });
      
      expect(impact).toBe('medium');
    });

    test('should assess low impact for other vulnerabilities', () => {
      const impact = generator.assessImpact({
        type: 'Missing Security Header'
      });
      
      expect(impact).toBe('low');
    });
  });

  describe('assessLikelihood', () => {
    test('should assess high likelihood for injection vulnerabilities', () => {
      const likelihood = generator.assessLikelihood({
        type: 'Code Injection'
      });
      
      expect(likelihood).toBe('high');
    });

    test('should assess medium likelihood for public/api files', () => {
      const likelihood = generator.assessLikelihood({
        location: { file: 'public/index.js' }
      });
      
      expect(likelihood).toBe('medium');
    });

    test('should assess low likelihood for other cases', () => {
      const likelihood = generator.assessLikelihood({
        type: 'Test',
        location: { file: 'internal/utils.js' }
      });
      
      expect(likelihood).toBe('low');
    });
  });

  describe('generateComplianceStatus', () => {
    test('should generate compliance status with OWASP data', () => {
      const status = generator.generateComplianceStatus(mockSecurityResults);
      
      expect(status.standards.owasp).toBeDefined();
      expect(status.standards.owasp.score).toBe(75);
      expect(status.standards.owasp.status).toBe('compliant');
      expect(status.standards.owasp.violations).toEqual(['A01:2021', 'A03:2021']);
    });

    test('should handle multiple compliance standards', () => {
      const status = generator.generateComplianceStatus(mockSecurityResults);
      
      expect(status.standards.pci).toBeDefined();
      expect(status.standards.gdpr).toBeDefined();
      expect(status.overall).toBe('compliant');
    });

    test('should mark non-compliant for low scores', () => {
      const results = {
        owaspCompliance: { score: 50, violations: [] }
      };
      
      const status = generator.generateComplianceStatus(results);
      
      expect(status.standards.owasp.status).toBe('non-compliant');
    });

    test('should handle missing compliance data', () => {
      const status = generator.generateComplianceStatus({});
      
      expect(status.overall).toBe('unknown');
      expect(Object.keys(status.standards)).toHaveLength(0);
    });
  });

  describe('generateActionPlan', () => {
    test('should categorize actions by timeline', () => {
      const plan = generator.generateActionPlan(mockSecurityResults);
      
      expect(plan.immediate).toHaveLength(2); // 1 recommendation + 1 critical vuln
      expect(plan.shortTerm).toHaveLength(1);
      expect(plan.mediumTerm).toHaveLength(1);
      expect(plan.longTerm).toHaveLength(0);
    });

    test('should add critical vulnerabilities to immediate actions', () => {
      const plan = generator.generateActionPlan(mockSecurityResults);
      
      const sqlInjectionFix = plan.immediate.find(action => 
        action.title === 'Fix SQL Injection'
      );
      
      expect(sqlInjectionFix).toBeDefined();
      expect(sqlInjectionFix.priority).toBe('critical');
    });

    test('should handle empty recommendations', () => {
      const plan = generator.generateActionPlan({
        vulnerabilities: []
      });
      
      expect(plan.immediate).toEqual([]);
      expect(plan.shortTerm).toEqual([]);
    });
  });

  describe('inferTimeline', () => {
    test('should infer immediate timeline for critical priority', () => {
      const timeline = generator.inferTimeline({ priority: 'critical' });
      expect(timeline).toBe('immediate');
    });

    test('should infer short term for high priority', () => {
      const timeline = generator.inferTimeline({ priority: 'high' });
      expect(timeline).toBe('short_term');
    });

    test('should infer medium term for medium priority', () => {
      const timeline = generator.inferTimeline({ priority: 'medium' });
      expect(timeline).toBe('medium_term');
    });

    test('should infer long term for low priority', () => {
      const timeline = generator.inferTimeline({ priority: 'low' });
      expect(timeline).toBe('long_term');
    });
  });

  describe('HTML generation methods', () => {
    test('should generate HTML report', async () => {
      const filepath = await generator.generateHTMLReport({
        id: 'test-123',
        timestamp: new Date().toISOString(),
        projectInfo: mockProjectInfo,
        securityResults: mockSecurityResults,
        summary: generator.generateExecutiveSummary(mockSecurityResults),
        riskMatrix: {},
        complianceStatus: {},
        actionPlan: {}
      });
      
      expect(filepath).toContain('test-123.html');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.html'),
        expect.stringContaining('<!DOCTYPE html>')
      );
    });

    test('should generate HTML header with project info', () => {
      const header = generator.generateHTMLHeader({
        projectInfo: mockProjectInfo,
        timestamp: new Date().toISOString(),
        summary: { overallRisk: 'medium' }
      });
      
      expect(header).toContain('Security Analysis Report');
      expect(header).toContain('react');
      expect(header).toContain('MEDIUM');
    });

    test('should generate executive summary HTML', () => {
      const summaryHTML = generator.generateHTMLExecutiveSummary({
        summary: {
          criticalIssues: 5,
          totalVulnerabilities: 10,
          securityScore: 75,
          complianceScore: 80,
          keyFindings: ['Finding 1', 'Finding 2'],
          immediateActions: ['Action 1', 'Action 2']
        }
      });
      
      expect(summaryHTML).toContain('Executive Summary');
      expect(summaryHTML).toContain('5</div>'); // Critical issues
      expect(summaryHTML).toContain('75/100'); // Security score
      expect(summaryHTML).toContain('Finding 1');
      expect(summaryHTML).toContain('Action 1');
    });

    test('should handle empty vulnerabilities section', () => {
      const vulnSection = generator.generateHTMLVulnerabilitySection({
        securityResults: {}
      });
      
      expect(vulnSection).toContain('No vulnerabilities detected');
    });
  });

  describe('JSON report generation', () => {
    test('should generate JSON report', async () => {
      const report = {
        id: 'test-json',
        timestamp: new Date().toISOString(),
        projectInfo: mockProjectInfo,
        securityResults: mockSecurityResults
      };
      
      const filepath = await generator.generateJSONReport(report);
      
      expect(filepath).toContain('test-json.json');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.json'),
        expect.stringContaining('"id":"test-json"')
      );
    });
  });

  describe('PDF report generation', () => {
    test('should generate PDF report placeholder', async () => {
      const report = {
        id: 'test-pdf',
        summary: { overallRisk: 'low' }
      };
      
      const filepath = await generator.generatePDFReport(report);
      
      expect(filepath).toContain('test-pdf.pdf');
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('groupBySeverity', () => {
    test('should group vulnerabilities by severity', () => {
      const groups = generator.groupBySeverity(mockSecurityResults.vulnerabilities);
      
      expect(groups.critical).toHaveLength(1);
      expect(groups.high).toHaveLength(1);
      expect(groups.medium).toHaveLength(1);
      expect(groups.low).toHaveLength(0);
    });

    test('should handle empty vulnerabilities', () => {
      const groups = generator.groupBySeverity([]);
      
      expect(groups.critical).toEqual([]);
      expect(groups.high).toEqual([]);
      expect(groups.medium).toEqual([]);
      expect(groups.low).toEqual([]);
    });
  });

  describe('getSecurityReportCSS', () => {
    test('should return CSS styles', () => {
      const css = generator.getSecurityReportCSS();
      
      expect(css).toContain('body');
      expect(css).toContain('.container');
      expect(css).toContain('.security-header');
    });
  });

  describe('generateSecurityChartJS', () => {
    test('should generate chart JavaScript', () => {
      const js = generator.generateSecurityChartJS({
        securityResults: mockSecurityResults,
        summary: { totalVulnerabilities: 10 }
      });
      
      expect(js).toContain('Chart');
      expect(js).toContain('vulnerability');
    });
  });

  describe('edge cases for 100% coverage', () => {
    test('should handle long_term timeline recommendations', () => {
      const securityResults = {
        recommendations: [
          { description: 'Long term fix', implementation: { timeline: 'long_term' } }
        ]
      };
      
      const plan = generator.generateActionPlan(securityResults);
      
      expect(plan.longTerm).toHaveLength(1);
      expect(plan.longTerm[0].description).toBe('Long term fix');
    });
  });
});