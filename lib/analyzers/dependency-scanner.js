const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class DependencyScanner {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.vulnerabilityDatabase = this.loadVulnerabilityDatabase();
    this.packageManagers = ['npm', 'yarn', 'pnpm'];
  }

  async scan() {
    const results = {
      packageManager: await this.detectPackageManager(),
      dependencies: await this.analyzeDependencies(),
      vulnerabilities: [],
      outdatedPackages: [],
      securityMetrics: {},
      recommendations: []
    };

    // Perform security scanning
    results.vulnerabilities = await this.scanForVulnerabilities(results.dependencies);
    results.outdatedPackages = await this.findOutdatedPackages(results.dependencies);
    results.securityMetrics = this.calculateSecurityMetrics(results);
    results.recommendations = this.generateRecommendations(results);

    return results;
  }

  async detectPackageManager() {
    const detectors = {
      'package-lock.json': 'npm',
      'yarn.lock': 'yarn',
      'pnpm-lock.yaml': 'pnpm',
      'composer.lock': 'composer',
      'Pipfile.lock': 'pipenv',
      'poetry.lock': 'poetry',
      'Cargo.lock': 'cargo'
    };

    for (const [lockFile, manager] of Object.entries(detectors)) {
      const lockPath = path.join(this.projectPath, lockFile);
      try {
        await fs.access(lockPath);
        return {
          name: manager,
          lockFile: lockFile,
          version: await this.getPackageManagerVersion(manager)
        };
      } catch (error) {
        // Lock file doesn't exist
      }
    }

    return { name: 'unknown', lockFile: null, version: null };
  }

  async getPackageManagerVersion(manager) {
    try {
      const versionCmd = {
        npm: 'npm --version',
        yarn: 'yarn --version',
        pnpm: 'pnpm --version',
        composer: 'composer --version',
        pipenv: 'pipenv --version',
        poetry: 'poetry --version',
        cargo: 'cargo --version'
      };

      const command = versionCmd[manager];
      if (command) {
        const output = execSync(command, { encoding: 'utf8', timeout: 5000 });
        return output.trim();
      }
    } catch (error) {
      // Package manager not available
    }
    return null;
  }

  async analyzeDependencies() {
    const dependencies = {
      production: {},
      development: {},
      peer: {},
      optional: {},
      total: 0
    };

    try {
      const packageJsonPath = path.join(this.projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      dependencies.production = packageJson.dependencies || {};
      dependencies.development = packageJson.devDependencies || {};
      dependencies.peer = packageJson.peerDependencies || {};
      dependencies.optional = packageJson.optionalDependencies || {};

      dependencies.total = Object.keys(dependencies.production).length +
                          Object.keys(dependencies.development).length +
                          Object.keys(dependencies.peer).length +
                          Object.keys(dependencies.optional).length;

      // Get installed versions from node_modules or lock file
      dependencies.installed = await this.getInstalledVersions();

    } catch (error) {
      console.warn('Failed to analyze dependencies:', error.message);
    }

    return dependencies;
  }

  async getInstalledVersions() {
    const installed = {};
    
    try {
      // Try to read from package-lock.json first
      const lockPath = path.join(this.projectPath, 'package-lock.json');
      const lockFile = JSON.parse(await fs.readFile(lockPath, 'utf-8'));
      
      if (lockFile.dependencies) {
        Object.entries(lockFile.dependencies).forEach(([name, info]) => {
          installed[name] = {
            version: info.version,
            resolved: info.resolved,
            integrity: info.integrity,
            dependencies: info.dependencies
          };
        });
      }
    } catch (error) {
      // Fallback to checking node_modules
      try {
        const nodeModulesPath = path.join(this.projectPath, 'node_modules');
        const packages = await fs.readdir(nodeModulesPath);
        
        for (const pkg of packages.slice(0, 50)) { // Limit to avoid performance issues
          if (pkg.startsWith('.') || pkg.startsWith('@')) continue;
          
          try {
            const pkgJsonPath = path.join(nodeModulesPath, pkg, 'package.json');
            const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf-8'));
            installed[pkg] = {
              version: pkgJson.version,
              description: pkgJson.description,
              homepage: pkgJson.homepage
            };
          } catch (e) {
            // Skip packages without readable package.json
          }
        }
      } catch (error) {
        // No node_modules directory
      }
    }

    return installed;
  }

  async scanForVulnerabilities(dependencies) {
    const vulnerabilities = [];

    // Check known vulnerable packages
    const allPackages = {
      ...dependencies.production,
      ...dependencies.development
    };

    for (const [packageName, versionRange] of Object.entries(allPackages)) {
      const packageVulns = await this.checkPackageVulnerabilities(packageName, versionRange);
      vulnerabilities.push(...packageVulns);
    }

    // Try to use npm audit if available
    try {
      const auditResults = await this.runNpmAudit();
      vulnerabilities.push(...auditResults);
    } catch (error) {
      console.warn('npm audit failed:', error.message);
    }

    return this.deduplicateVulnerabilities(vulnerabilities);
  }

  async checkPackageVulnerabilities(packageName, versionRange) {
    const vulnerabilities = [];
    const knownVulns = this.vulnerabilityDatabase[packageName];

    if (knownVulns) {
      knownVulns.forEach(vuln => {
        if (this.isVersionAffected(versionRange, vuln.affectedVersions)) {
          vulnerabilities.push({
            package: packageName,
            installedVersion: versionRange,
            vulnerability: vuln.id,
            severity: vuln.severity,
            title: vuln.title,
            description: vuln.description,
            references: vuln.references,
            patchedVersions: vuln.patchedVersions,
            recommendation: vuln.recommendation,
            cwe: vuln.cwe,
            cvss: vuln.cvss
          });
        }
      });
    }

    return vulnerabilities;
  }

  isVersionAffected(installedVersion, affectedVersions) {
    // Simplified version checking - in a real implementation, 
    // you'd use a proper semver library
    if (!affectedVersions || affectedVersions.length === 0) return false;
    
    // Remove version range operators for basic comparison
    const cleanVersion = installedVersion.replace(/[^0-9.]/g, '');
    
    return affectedVersions.some(range => {
      const cleanRange = range.replace(/[^0-9.]/g, '');
      return cleanVersion === cleanRange;
    });
  }

  async runNpmAudit() {
    const vulnerabilities = [];

    try {
      const auditOutput = execSync('npm audit --json', {
        cwd: this.projectPath,
        encoding: 'utf8',
        timeout: 30000,
        stdio: 'pipe'
      });

      const auditData = JSON.parse(auditOutput);

      if (auditData.vulnerabilities) {
        Object.entries(auditData.vulnerabilities).forEach(([packageName, vuln]) => {
          vulnerabilities.push({
            package: packageName,
            vulnerability: vuln.name,
            severity: vuln.severity,
            title: vuln.title,
            description: vuln.info,
            references: vuln.references || [],
            via: vuln.via,
            effects: vuln.effects,
            range: vuln.range,
            nodes: vuln.nodes,
            fixAvailable: vuln.fixAvailable
          });
        });
      }
    } catch (error) {
      // npm audit failed - this is common and not necessarily an error
      if (error.status === 1) {
        // npm audit returns exit code 1 when vulnerabilities are found
        try {
          const auditData = JSON.parse(error.stdout);
          // Process the audit data even when exit code is 1
          if (auditData.vulnerabilities) {
            Object.entries(auditData.vulnerabilities).forEach(([packageName, vuln]) => {
              vulnerabilities.push({
                package: packageName,
                vulnerability: vuln.name || 'Unknown',
                severity: vuln.severity || 'unknown',
                title: vuln.title || `Vulnerability in ${packageName}`,
                description: vuln.info || 'No description available',
                fixAvailable: vuln.fixAvailable
              });
            });
          }
        } catch (parseError) {
          // Could not parse audit output
        }
      }
    }

    return vulnerabilities;
  }

  async findOutdatedPackages(dependencies) {
    const outdated = [];

    try {
      const outdatedOutput = execSync('npm outdated --json', {
        cwd: this.projectPath,
        encoding: 'utf8',
        timeout: 30000,
        stdio: 'pipe'
      });

      const outdatedData = JSON.parse(outdatedOutput);

      Object.entries(outdatedData).forEach(([packageName, info]) => {
        outdated.push({
          package: packageName,
          current: info.current,
          wanted: info.wanted,
          latest: info.latest,
          dependent: info.dependent,
          type: info.type,
          homepage: info.homepage
        });
      });
    } catch (error) {
      // npm outdated command failed or returned non-zero exit code
      // This is normal when packages are outdated
    }

    return outdated;
  }

  deduplicateVulnerabilities(vulnerabilities) {
    const seen = new Set();
    return vulnerabilities.filter(vuln => {
      const key = `${vuln.package}-${vuln.vulnerability}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  calculateSecurityMetrics(results) {
    const metrics = {
      totalPackages: results.dependencies.total,
      vulnerablePackages: results.vulnerabilities.length,
      criticalVulnerabilities: results.vulnerabilities.filter(v => v.severity === 'critical').length,
      highVulnerabilities: results.vulnerabilities.filter(v => v.severity === 'high').length,
      mediumVulnerabilities: results.vulnerabilities.filter(v => v.severity === 'moderate' || v.severity === 'medium').length,
      lowVulnerabilities: results.vulnerabilities.filter(v => v.severity === 'low').length,
      outdatedPackages: results.outdatedPackages.length,
      securityScore: 0,
      riskLevel: 'low'
    };

    // Calculate security score (0-100)
    let score = 100;
    score -= metrics.criticalVulnerabilities * 25;
    score -= metrics.highVulnerabilities * 15;
    score -= metrics.mediumVulnerabilities * 10;
    score -= metrics.lowVulnerabilities * 5;
    score -= metrics.outdatedPackages * 2;

    metrics.securityScore = Math.max(0, score);

    // Determine risk level
    if (metrics.criticalVulnerabilities > 0 || metrics.securityScore < 50) {
      metrics.riskLevel = 'critical';
    } else if (metrics.highVulnerabilities > 0 || metrics.securityScore < 70) {
      metrics.riskLevel = 'high';
    } else if (metrics.mediumVulnerabilities > 0 || metrics.securityScore < 85) {
      metrics.riskLevel = 'medium';
    } else {
      metrics.riskLevel = 'low';
    }

    return metrics;
  }

  generateRecommendations(results) {
    const recommendations = [];

    // Critical vulnerabilities
    if (results.securityMetrics.criticalVulnerabilities > 0) {
      recommendations.push({
        priority: 'critical',
        type: 'vulnerability',
        title: 'Fix Critical Vulnerabilities Immediately',
        description: `${results.securityMetrics.criticalVulnerabilities} critical vulnerabilities found that require immediate attention.`,
        action: 'Update affected packages or find alternatives',
        packages: results.vulnerabilities
          .filter(v => v.severity === 'critical')
          .map(v => v.package)
      });
    }

    // High vulnerabilities
    if (results.securityMetrics.highVulnerabilities > 0) {
      recommendations.push({
        priority: 'high',
        type: 'vulnerability',
        title: 'Address High Severity Vulnerabilities',
        description: `${results.securityMetrics.highVulnerabilities} high severity vulnerabilities found.`,
        action: 'Plan security updates in next sprint',
        packages: results.vulnerabilities
          .filter(v => v.severity === 'high')
          .map(v => v.package)
      });
    }

    // Outdated packages
    if (results.outdatedPackages.length > 10) {
      recommendations.push({
        priority: 'medium',
        type: 'maintenance',
        title: 'Update Outdated Dependencies',
        description: `${results.outdatedPackages.length} packages are outdated and may have security issues.`,
        action: 'Regular dependency updates',
        automation: 'Consider using Dependabot or Renovate'
      });
    }

    // Package manager security
    if (results.packageManager.name === 'unknown') {
      recommendations.push({
        priority: 'low',
        type: 'configuration',
        title: 'Use Package Manager Lock Files',
        description: 'Lock files ensure reproducible builds and security.',
        action: 'Commit package-lock.json or yarn.lock to version control'
      });
    }

    // Security automation
    recommendations.push({
      priority: 'low',
      type: 'process',
      title: 'Implement Security Automation',
      description: 'Automate dependency security scanning in CI/CD pipeline.',
      action: 'Add npm audit or Snyk to CI/CD',
      tools: ['npm audit', 'Snyk', 'OWASP Dependency Check', 'GitHub Security Advisories']
    });

    return recommendations;
  }

  loadVulnerabilityDatabase() {
    // In a real implementation, this would load from a comprehensive database
    // like the National Vulnerability Database (NVD) or GitHub Security Advisories
    return {
      'lodash': [
        {
          id: 'GHSA-p6mc-m468-83gw',
          severity: 'high',
          title: 'Prototype Pollution in lodash',
          description: 'Lodash versions prior to 4.17.12 are vulnerable to Prototype Pollution.',
          affectedVersions: ['<4.17.12'],
          patchedVersions: ['>=4.17.12'],
          references: ['https://github.com/advisories/GHSA-p6mc-m468-83gw'],
          cwe: 'CWE-1321',
          cvss: 7.0,
          recommendation: 'Update to lodash version 4.17.12 or later'
        }
      ],
      'axios': [
        {
          id: 'GHSA-wf5p-g6vw-rhxx',
          severity: 'high',
          title: 'Axios CSRF vulnerability',
          description: 'Axios before 0.21.1 is vulnerable to Server-Side Request Forgery.',
          affectedVersions: ['<0.21.1'],
          patchedVersions: ['>=0.21.1'],
          references: ['https://github.com/advisories/GHSA-wf5p-g6vw-rhxx'],
          cwe: 'CWE-918',
          cvss: 8.1,
          recommendation: 'Update to axios version 0.21.1 or later'
        }
      ],
      'minimist': [
        {
          id: 'GHSA-vh95-rmgr-6w4m',
          severity: 'moderate',
          title: 'Prototype Pollution in minimist',
          description: 'minimist before 1.2.2 is vulnerable to prototype pollution.',
          affectedVersions: ['<1.2.2'],
          patchedVersions: ['>=1.2.2'],
          references: ['https://github.com/advisories/GHSA-vh95-rmgr-6w4m'],
          cwe: 'CWE-1321',
          cvss: 5.6,
          recommendation: 'Update to minimist version 1.2.2 or later'
        }
      ],
      'node-fetch': [
        {
          id: 'GHSA-w7rc-rwvf-8q5r',
          severity: 'high',
          title: 'node-fetch forwards secure headers to untrusted sites',
          description: 'node-fetch before 2.6.7 and 3.x before 3.2.4 vulnerable to exposure of sensitive information.',
          affectedVersions: ['<2.6.7', '>=3.0.0 <3.2.4'],
          patchedVersions: ['>=2.6.7', '>=3.2.4'],
          references: ['https://github.com/advisories/GHSA-w7rc-rwvf-8q5r'],
          cwe: 'CWE-200',
          cvss: 6.1,
          recommendation: 'Update to node-fetch version 2.6.7/3.2.4 or later'
        }
      ]
    };
  }
}

module.exports = DependencyScanner;