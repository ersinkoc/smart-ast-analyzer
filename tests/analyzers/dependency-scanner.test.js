const DependencyScanner = require('../../lib/analyzers/dependency-scanner');
const fs = require('fs').promises;
const { execSync } = require('child_process');
const path = require('path');

// Mock fs
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn()
  }
}));

// Mock child_process
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  ...jest.requireActual('path')
}));

describe('DependencyScanner', () => {
  let scanner;
  const mockProjectPath = '/mock/project';

  beforeEach(() => {
    jest.clearAllMocks();
    scanner = new DependencyScanner(mockProjectPath);
  });

  describe('constructor', () => {
    test('initializes with project path', () => {
      expect(scanner.projectPath).toBe(mockProjectPath);
      expect(scanner.vulnerabilityDatabase).toBeDefined();
      expect(scanner.packageManagers).toEqual(['npm', 'yarn', 'pnpm']);
    });
  });

  describe('scan', () => {
    test('returns complete scan results', async () => {
      // Mock all the async methods
      scanner.detectPackageManager = jest.fn().mockResolvedValue({ name: 'npm' });
      scanner.analyzeDependencies = jest.fn().mockResolvedValue({ total: 5 });
      scanner.scanForVulnerabilities = jest.fn().mockResolvedValue([]);
      scanner.findOutdatedPackages = jest.fn().mockResolvedValue([]);
      scanner.calculateSecurityMetrics = jest.fn().mockReturnValue({ score: 100 });
      scanner.generateRecommendations = jest.fn().mockReturnValue([]);

      const result = await scanner.scan();

      expect(result).toBeDefined();
      expect(result.packageManager).toEqual({ name: 'npm' });
      expect(result.dependencies).toEqual({ total: 5 });
      expect(result.vulnerabilities).toEqual([]);
      expect(result.outdatedPackages).toEqual([]);
      expect(result.securityMetrics).toEqual({ score: 100 });
      expect(result.recommendations).toEqual([]);
    });
  });

  describe('detectPackageManager', () => {
    test('detects npm from package-lock.json', async () => {
      fs.access.mockResolvedValueOnce(); // package-lock.json exists
      scanner.getPackageManagerVersion = jest.fn().mockResolvedValue('8.19.2');

      const result = await scanner.detectPackageManager();

      expect(fs.access).toHaveBeenCalledWith(path.join(mockProjectPath, 'package-lock.json'));
      expect(result).toEqual({
        name: 'npm',
        lockFile: 'package-lock.json',
        version: '8.19.2'
      });
    });

    test('detects yarn from yarn.lock', async () => {
      fs.access.mockRejectedValueOnce(new Error('not found')); // package-lock.json doesn't exist
      fs.access.mockResolvedValueOnce(); // yarn.lock exists
      scanner.getPackageManagerVersion = jest.fn().mockResolvedValue('1.22.19');

      const result = await scanner.detectPackageManager();

      expect(result).toEqual({
        name: 'yarn',
        lockFile: 'yarn.lock',
        version: '1.22.19'
      });
    });

    test('detects pnpm from pnpm-lock.yaml', async () => {
      fs.access.mockRejectedValueOnce(new Error('not found')); // package-lock.json
      fs.access.mockRejectedValueOnce(new Error('not found')); // yarn.lock
      fs.access.mockResolvedValueOnce(); // pnpm-lock.yaml exists
      scanner.getPackageManagerVersion = jest.fn().mockResolvedValue('7.18.2');

      const result = await scanner.detectPackageManager();

      expect(result).toEqual({
        name: 'pnpm',
        lockFile: 'pnpm-lock.yaml',
        version: '7.18.2'
      });
    });

    test('returns unknown when no lock files found', async () => {
      fs.access.mockRejectedValue(new Error('not found')); // All lock files missing

      const result = await scanner.detectPackageManager();

      expect(result).toEqual({
        name: 'unknown',
        lockFile: null,
        version: null
      });
    });
  });

  describe('getPackageManagerVersion', () => {
    test('returns npm version', async () => {
      execSync.mockReturnValue('8.19.2\n');

      const version = await scanner.getPackageManagerVersion('npm');

      expect(execSync).toHaveBeenCalledWith('npm --version', {
        encoding: 'utf8',
        timeout: 5000
      });
      expect(version).toBe('8.19.2');
    });

    test('returns yarn version', async () => {
      execSync.mockReturnValue('1.22.19\n');

      const version = await scanner.getPackageManagerVersion('yarn');

      expect(version).toBe('1.22.19');
    });

    test('returns null for unknown package manager', async () => {
      const version = await scanner.getPackageManagerVersion('unknown');

      expect(version).toBeNull();
      expect(execSync).not.toHaveBeenCalled();
    });

    test('returns null when command fails', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const version = await scanner.getPackageManagerVersion('npm');

      expect(version).toBeNull();
    });
  });

  describe('analyzeDependencies', () => {
    test('analyzes package.json dependencies', async () => {
      const mockPackageJson = {
        dependencies: {
          'react': '^18.0.0',
          'lodash': '^4.17.21'
        },
        devDependencies: {
          'jest': '^29.0.0'
        },
        peerDependencies: {
          'react-dom': '^18.0.0'
        },
        optionalDependencies: {
          'fsevents': '^2.3.2'
        }
      };

      fs.readFile.mockResolvedValue(JSON.stringify(mockPackageJson));
      scanner.getInstalledVersions = jest.fn().mockResolvedValue({});

      const result = await scanner.analyzeDependencies();

      expect(fs.readFile).toHaveBeenCalledWith(path.join(mockProjectPath, 'package.json'), 'utf-8');
      expect(result.production).toEqual(mockPackageJson.dependencies);
      expect(result.development).toEqual(mockPackageJson.devDependencies);
      expect(result.peer).toEqual(mockPackageJson.peerDependencies);
      expect(result.optional).toEqual(mockPackageJson.optionalDependencies);
      expect(result.total).toBe(5); // 2 deps + 1 dev + 1 peer + 1 optional = 5
      expect(result.installed).toEqual({});
    });

    test('handles missing package.json', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await scanner.analyzeDependencies();

      expect(result).toEqual({
        production: {},
        development: {},
        peer: {},
        optional: {},
        total: 0
      });
      expect(consoleSpy).toHaveBeenCalledWith('Failed to analyze dependencies:', 'File not found');
      consoleSpy.mockRestore();
    });

    test('handles package.json with missing dependency sections', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0'
      };

      fs.readFile.mockResolvedValue(JSON.stringify(mockPackageJson));
      scanner.getInstalledVersions = jest.fn().mockResolvedValue({});

      const result = await scanner.analyzeDependencies();

      expect(result.production).toEqual({});
      expect(result.development).toEqual({});
      expect(result.peer).toEqual({});
      expect(result.optional).toEqual({});
      expect(result.total).toBe(0);
    });
  });

  describe('getInstalledVersions', () => {
    test('reads versions from package-lock.json', async () => {
      const mockLockFile = {
        dependencies: {
          'react': {
            version: '18.2.0',
            resolved: 'https://registry.npmjs.org/react/-/react-18.2.0.tgz',
            integrity: 'sha512-...',
            dependencies: {
              'loose-envify': {
                version: '1.4.0'
              }
            }
          }
        }
      };

      fs.readFile.mockResolvedValue(JSON.stringify(mockLockFile));

      const result = await scanner.getInstalledVersions();

      expect(fs.readFile).toHaveBeenCalledWith(path.join(mockProjectPath, 'package-lock.json'), 'utf-8');
      expect(result).toEqual({
        'react': {
          version: '18.2.0',
          resolved: 'https://registry.npmjs.org/react/-/react-18.2.0.tgz',
          integrity: 'sha512-...',
          dependencies: {
            'loose-envify': {
              version: '1.4.0'
            }
          }
        }
      });
    });

    test('falls back to node_modules when lock file not available', async () => {
      fs.readFile.mockRejectedValueOnce(new Error('Lock file not found'));
      fs.readdir.mockResolvedValue(['react', 'lodash', '.cache', '@types']);
      fs.readFile.mockResolvedValueOnce(JSON.stringify({
        name: 'react',
        version: '18.2.0',
        description: 'React library',
        homepage: 'https://reactjs.org'
      }));
      fs.readFile.mockResolvedValueOnce(JSON.stringify({
        name: 'lodash',
        version: '4.17.21',
        description: 'Lodash utility library'
      }));

      const result = await scanner.getInstalledVersions();

      expect(fs.readdir).toHaveBeenCalledWith(path.join(mockProjectPath, 'node_modules'));
      expect(result).toEqual({
        'react': {
          version: '18.2.0',
          description: 'React library',
          homepage: 'https://reactjs.org'
        },
        'lodash': {
          version: '4.17.21',
          description: 'Lodash utility library',
          homepage: undefined
        }
      });
    });

    test('returns empty object when both lock file and node_modules unavailable', async () => {
      fs.readFile.mockRejectedValue(new Error('Not found'));
      fs.readdir.mockRejectedValue(new Error('Not found'));

      const result = await scanner.getInstalledVersions();

      expect(result).toEqual({});
    });
  });

  describe('scanForVulnerabilities', () => {
    test('scans dependencies for vulnerabilities', async () => {
      const mockDependencies = {
        production: { 'lodash': '^4.17.10' },
        development: { 'jest': '^29.0.0' }
      };

      scanner.checkPackageVulnerabilities = jest.fn()
        .mockResolvedValueOnce([{ package: 'lodash', severity: 'high' }])
        .mockResolvedValueOnce([]);
      scanner.runNpmAudit = jest.fn().mockResolvedValue([]);
      scanner.deduplicateVulnerabilities = jest.fn().mockImplementation(vulns => vulns);

      const result = await scanner.scanForVulnerabilities(mockDependencies);

      expect(scanner.checkPackageVulnerabilities).toHaveBeenCalledWith('lodash', '^4.17.10');
      expect(scanner.checkPackageVulnerabilities).toHaveBeenCalledWith('jest', '^29.0.0');
      expect(result).toEqual([{ package: 'lodash', severity: 'high' }]);
    });

    test('handles npm audit failure gracefully', async () => {
      const mockDependencies = { production: {}, development: {} };
      
      scanner.checkPackageVulnerabilities = jest.fn().mockResolvedValue([]);
      scanner.runNpmAudit = jest.fn().mockRejectedValue(new Error('npm audit failed'));
      scanner.deduplicateVulnerabilities = jest.fn().mockImplementation(vulns => vulns);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await scanner.scanForVulnerabilities(mockDependencies);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('npm audit failed:', 'npm audit failed');
      consoleSpy.mockRestore();
    });
  });

  describe('checkPackageVulnerabilities', () => {
    test('finds vulnerabilities for known packages', async () => {
      scanner.isVersionAffected = jest.fn().mockReturnValue(true);

      const result = await scanner.checkPackageVulnerabilities('lodash', '^4.17.10');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        package: 'lodash',
        installedVersion: '^4.17.10',
        vulnerability: 'GHSA-p6mc-m468-83gw',
        severity: 'high',
        title: 'Prototype Pollution in lodash'
      });
    });

    test('returns empty array for unknown packages', async () => {
      const result = await scanner.checkPackageVulnerabilities('unknown-package', '^1.0.0');

      expect(result).toEqual([]);
    });

    test('returns empty array when version not affected', async () => {
      scanner.isVersionAffected = jest.fn().mockReturnValue(false);

      const result = await scanner.checkPackageVulnerabilities('lodash', '^4.17.15');

      expect(result).toEqual([]);
    });
  });

  describe('isVersionAffected', () => {
    test('returns true for affected version', () => {
      const result = scanner.isVersionAffected('4.17.10', ['4.17.10']);

      expect(result).toBe(true);
    });

    test('returns false for unaffected version', () => {
      const result = scanner.isVersionAffected('4.17.15', ['<4.17.12']);

      expect(result).toBe(false);
    });

    test('returns false for empty affected versions', () => {
      const result = scanner.isVersionAffected('1.0.0', []);

      expect(result).toBe(false);
    });

    test('returns false for null affected versions', () => {
      const result = scanner.isVersionAffected('1.0.0', null);

      expect(result).toBe(false);
    });
  });

  describe('runNpmAudit', () => {
    test('parses npm audit output successfully', async () => {
      const mockAuditOutput = {
        vulnerabilities: {
          'lodash': {
            name: 'lodash',
            severity: 'high',
            title: 'Prototype Pollution',
            info: 'Lodash vulnerability description',
            references: ['https://example.com'],
            via: ['lodash'],
            effects: ['package'],
            range: '<4.17.12',
            nodes: ['node_modules/lodash'],
            fixAvailable: true
          }
        }
      };

      execSync.mockReturnValue(JSON.stringify(mockAuditOutput));

      const result = await scanner.runNpmAudit();

      expect(execSync).toHaveBeenCalledWith('npm audit --json', {
        cwd: mockProjectPath,
        encoding: 'utf8',
        timeout: 30000,
        stdio: 'pipe'
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        package: 'lodash',
        vulnerability: 'lodash',
        severity: 'high',
        title: 'Prototype Pollution'
      });
    });

    test('handles npm audit exit code 1 with vulnerabilities', async () => {
      const mockError = new Error('npm audit found vulnerabilities');
      mockError.status = 1;
      mockError.stdout = JSON.stringify({
        vulnerabilities: {
          'axios': {
            name: 'axios-vuln',
            severity: 'medium',
            title: 'Axios Vulnerability',
            fixAvailable: false
          }
        }
      });

      execSync.mockImplementation(() => {
        throw mockError;
      });

      const result = await scanner.runNpmAudit();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        package: 'axios',
        vulnerability: 'axios-vuln',
        severity: 'medium',
        title: 'Axios Vulnerability',
        fixAvailable: false
      });
    });

    test('returns empty array when npm audit fails', async () => {
      execSync.mockImplementation(() => {
        throw new Error('npm not found');
      });

      const result = await scanner.runNpmAudit();

      expect(result).toEqual([]);
    });
  });

  describe('findOutdatedPackages', () => {
    test('parses npm outdated output successfully', async () => {
      const mockOutdatedOutput = {
        'react': {
          current: '17.0.2',
          wanted: '17.0.2',
          latest: '18.2.0',
          dependent: 'my-app',
          type: 'dependencies',
          homepage: 'https://reactjs.org'
        }
      };

      execSync.mockReturnValue(JSON.stringify(mockOutdatedOutput));

      const result = await scanner.findOutdatedPackages({});

      expect(execSync).toHaveBeenCalledWith('npm outdated --json', {
        cwd: mockProjectPath,
        encoding: 'utf8',
        timeout: 30000,
        stdio: 'pipe'
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        package: 'react',
        current: '17.0.2',
        wanted: '17.0.2',
        latest: '18.2.0',
        dependent: 'my-app',
        type: 'dependencies',
        homepage: 'https://reactjs.org'
      });
    });

    test('returns empty array when npm outdated fails', async () => {
      execSync.mockImplementation(() => {
        throw new Error('npm outdated failed');
      });

      const result = await scanner.findOutdatedPackages({});

      expect(result).toEqual([]);
    });
  });

  describe('deduplicateVulnerabilities', () => {
    test('removes duplicate vulnerabilities', () => {
      const vulnerabilities = [
        { package: 'lodash', vulnerability: 'GHSA-123' },
        { package: 'lodash', vulnerability: 'GHSA-123' },
        { package: 'axios', vulnerability: 'GHSA-456' },
        { package: 'lodash', vulnerability: 'GHSA-789' }
      ];

      const result = scanner.deduplicateVulnerabilities(vulnerabilities);

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        { package: 'lodash', vulnerability: 'GHSA-123' },
        { package: 'axios', vulnerability: 'GHSA-456' },
        { package: 'lodash', vulnerability: 'GHSA-789' }
      ]);
    });

    test('handles empty vulnerability array', () => {
      const result = scanner.deduplicateVulnerabilities([]);

      expect(result).toEqual([]);
    });
  });

  describe('calculateSecurityMetrics', () => {
    test('calculates security metrics correctly', () => {
      const mockResults = {
        dependencies: { total: 50 },
        vulnerabilities: [
          { severity: 'critical' },
          { severity: 'high' },
          { severity: 'high' },
          { severity: 'moderate' },
          { severity: 'low' }
        ],
        outdatedPackages: [1, 2, 3]
      };

      const result = scanner.calculateSecurityMetrics(mockResults);

      expect(result.totalPackages).toBe(50);
      expect(result.vulnerablePackages).toBe(5);
      expect(result.criticalVulnerabilities).toBe(1);
      expect(result.highVulnerabilities).toBe(2);
      expect(result.mediumVulnerabilities).toBe(1);
      expect(result.lowVulnerabilities).toBe(1);
      expect(result.outdatedPackages).toBe(3);
      expect(result.securityScore).toBe(24); // 100 - 25 - 30 - 10 - 5 - 6 = 24
      expect(result.riskLevel).toBe('critical');
    });

    test('handles empty vulnerabilities', () => {
      const mockResults = {
        dependencies: { total: 10 },
        vulnerabilities: [],
        outdatedPackages: []
      };

      const result = scanner.calculateSecurityMetrics(mockResults);

      expect(result.securityScore).toBe(100);
      expect(result.riskLevel).toBe('low');
    });

    test('calculates correct risk levels', () => {
      // High risk
      let mockResults = {
        dependencies: { total: 10 },
        vulnerabilities: [{ severity: 'high' }],
        outdatedPackages: []
      };
      let result = scanner.calculateSecurityMetrics(mockResults);
      expect(result.riskLevel).toBe('high');

      // Medium risk
      mockResults = {
        dependencies: { total: 10 },
        vulnerabilities: [{ severity: 'moderate' }],
        outdatedPackages: []
      };
      result = scanner.calculateSecurityMetrics(mockResults);
      expect(result.riskLevel).toBe('medium');

      // Low risk
      mockResults = {
        dependencies: { total: 10 },
        vulnerabilities: [{ severity: 'low' }],
        outdatedPackages: []
      };
      result = scanner.calculateSecurityMetrics(mockResults);
      expect(result.riskLevel).toBe('low');
    });
  });

  describe('generateRecommendations', () => {
    test('generates critical vulnerability recommendations', () => {
      const mockResults = {
        securityMetrics: {
          criticalVulnerabilities: 2,
          highVulnerabilities: 0
        },
        vulnerabilities: [
          { severity: 'critical', package: 'lodash' },
          { severity: 'critical', package: 'axios' }
        ],
        outdatedPackages: [],
        packageManager: { name: 'npm' }
      };

      const result = scanner.generateRecommendations(mockResults);

      expect(result).toHaveLength(2); // Critical vuln + Security automation
      expect(result[0]).toMatchObject({
        priority: 'critical',
        type: 'vulnerability',
        title: 'Fix Critical Vulnerabilities Immediately',
        packages: ['lodash', 'axios']
      });
    });

    test('generates high vulnerability recommendations', () => {
      const mockResults = {
        securityMetrics: {
          criticalVulnerabilities: 0,
          highVulnerabilities: 3
        },
        vulnerabilities: [
          { severity: 'high', package: 'react' },
          { severity: 'high', package: 'vue' },
          { severity: 'high', package: 'angular' }
        ],
        outdatedPackages: [],
        packageManager: { name: 'npm' }
      };

      const result = scanner.generateRecommendations(mockResults);

      expect(result).toHaveLength(2); // High vuln + Security automation
      expect(result[0]).toMatchObject({
        priority: 'high',
        type: 'vulnerability',
        title: 'Address High Severity Vulnerabilities',
        packages: ['react', 'vue', 'angular']
      });
    });

    test('generates outdated packages recommendation', () => {
      const mockResults = {
        securityMetrics: {
          criticalVulnerabilities: 0,
          highVulnerabilities: 0
        },
        vulnerabilities: [],
        outdatedPackages: new Array(15).fill({}), // 15 outdated packages
        packageManager: { name: 'npm' }
      };

      const result = scanner.generateRecommendations(mockResults);

      expect(result).toHaveLength(2); // Outdated packages + Security automation
      expect(result[0]).toMatchObject({
        priority: 'medium',
        type: 'maintenance',
        title: 'Update Outdated Dependencies'
      });
    });

    test('generates unknown package manager recommendation', () => {
      const mockResults = {
        securityMetrics: {
          criticalVulnerabilities: 0,
          highVulnerabilities: 0
        },
        vulnerabilities: [],
        outdatedPackages: [],
        packageManager: { name: 'unknown' }
      };

      const result = scanner.generateRecommendations(mockResults);

      expect(result).toHaveLength(2); // Unknown PM + Security automation
      expect(result[0]).toMatchObject({
        priority: 'low',
        type: 'configuration',
        title: 'Use Package Manager Lock Files'
      });
    });

    test('always includes security automation recommendation', () => {
      const mockResults = {
        securityMetrics: {
          criticalVulnerabilities: 0,
          highVulnerabilities: 0
        },
        vulnerabilities: [],
        outdatedPackages: [],
        packageManager: { name: 'npm' }
      };

      const result = scanner.generateRecommendations(mockResults);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        priority: 'low',
        type: 'process',
        title: 'Implement Security Automation',
        tools: ['npm audit', 'Snyk', 'OWASP Dependency Check', 'GitHub Security Advisories']
      });
    });
  });

  describe('loadVulnerabilityDatabase', () => {
    test('loads vulnerability database with known vulnerabilities', () => {
      const db = scanner.loadVulnerabilityDatabase();

      expect(db).toBeDefined();
      expect(db.lodash).toBeDefined();
      expect(db.axios).toBeDefined();
      expect(db.minimist).toBeDefined();
      expect(db['node-fetch']).toBeDefined();

      expect(db.lodash[0]).toMatchObject({
        id: 'GHSA-p6mc-m468-83gw',
        severity: 'high',
        title: 'Prototype Pollution in lodash',
        affectedVersions: ['<4.17.12'],
        patchedVersions: ['>=4.17.12']
      });
    });
  });
});