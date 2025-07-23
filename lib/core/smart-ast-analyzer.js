const ProjectScanner = require('./project-scanner');
const AIExecutor = require('./ai-executor');
const PromptGenerator = require('../generators/prompt-generator');
const ReportBuilder = require('../reporters/report-builder');
const APIDocsGenerator = require('../generators/api-docs-generator');
const FileReader = require('./file-reader');
const ConfigManager = require('./config-manager');
const SecurityAnalyzer = require('../analyzers/security-analyzer');
const PerformanceProfiler = require('../analyzers/performance-profiler');
const ComplexityAnalyzer = require('../analyzers/complexity-analyzer');
const Logger = require('../utils/logger');
const Cache = require('../utils/cache');
const ErrorHandler = require('../utils/error-handler');
const EventEmitter = require('events');
const fs = require('fs').promises;

class SmartASTAnalyzer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = this.validateOptions(options);
    this.logger = new Logger(options.verbose);
    this.cache = new Cache(options.cache !== false);
    this.errorHandler = new ErrorHandler(options.verbose);
    
    this.scanner = new ProjectScanner(options);
    this.aiExecutor = new AIExecutor(options.ai, options);
    this.reportBuilder = new ReportBuilder(options);
    this.apiDocsGenerator = new APIDocsGenerator(options);
    this.configManager = new ConfigManager(options);
    
    // Initialize specialized analyzers
    this.securityAnalyzer = new SecurityAnalyzer(options.framework || 'unknown');
    this.performanceProfiler = new PerformanceProfiler(options.framework || 'unknown', options);
    this.complexityAnalyzer = new ComplexityAnalyzer(options.framework || 'unknown', options);
    
    // Analysis state
    this.state = {
      phase: 'idle',
      progress: 0,
      startTime: null,
      errors: [],
      warnings: []
    };
    
    // Performance monitoring
    this.metrics = {
      analysisTime: 0,
      filesAnalyzed: 0,
      cacheHits: 0,
      apiCalls: 0
    };
  }

  validateOptions(options) {
    const defaults = {
      maxFiles: 500,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      timeout: 300000, // 5 minutes
      verbose: false,
      cache: true,
      retries: 3,
      parallel: true,
      outputFormats: ['markdown', 'json'],
      analysisDepth: 'standard', // standard, deep, comprehensive
      enableRealtime: false,
      monitorPerformance: true
    };
    
    const merged = { ...defaults, ...options };
    
    // Validate critical options
    if (merged.maxFiles < 1 || merged.maxFiles > 10000) {
      throw new Error('maxFiles must be between 1 and 10000');
    }
    if (merged.timeout < 10000 || merged.timeout > 3600000) {
      throw new Error('timeout must be between 10 seconds and 1 hour');
    }
    
    return merged;
  }

  async run() {
    this.state.startTime = Date.now();
    this.state.phase = 'starting';
    this.emit('analysisStart');
    
    this.logger.start('Smart AST Analysis');

    try {
      // Load configuration
      const config = await this.configManager.loadConfig();
      this.mergeConfig(config);

      // 1. Scan project
      this.logger.info('Scanning project structure...');
      const projectInfo = await this.scanner.scan();
      projectInfo.aiType = this.options.ai;
      
      this.logger.success(`Detected ${projectInfo.framework} project`);
      
      const totalFiles = Object.values(projectInfo.files).flat().length;
      this.logger.info(`Found ${totalFiles} files to analyze`);

      if (totalFiles === 0) {
        throw new Error('No files found to analyze. Check your include/exclude patterns.');
      }

      // 2. Generate prompts
      const promptGenerator = new PromptGenerator(projectInfo);
      
      // 3. Perform analysis based on type
      this.state.phase = 'analyzing';
      const results = {};
      const analysisTypes = this.getAnalysisTypes();
      
      // Parallel analysis if enabled
      if (this.options.parallel && analysisTypes.length > 1) {
        const analysisPromises = analysisTypes.map(async (type) => {
          try {
            this.logger.info(`Analyzing ${type}...`);
            this.emit('analysisTypeStart', type);
            
            const result = await this.analyzeType(type, projectInfo, promptGenerator);
            this.updateProgress(analysisTypes.indexOf(type) + 1, analysisTypes.length);
            
            if (result?.error) {
              this.state.warnings.push(`${type} analysis completed with warnings`);
              this.logger.warn(`${type} analysis completed with warnings`);
            } else {
              this.logger.success(`${type} analysis complete`);
            }
            
            this.emit('analysisTypeComplete', type, result);
            return { type, result };
          } catch (error) {
            const errorInfo = this.errorHandler.handle(error, `${type} analysis`);
            this.logger.error(`${type} analysis failed: ${errorInfo.message}`);
            this.state.errors.push({ type, error: errorInfo });
            
            if (!errorInfo.recoverable) {
              throw error;
            }
            
            return {
              type,
              result: {
                error: errorInfo.message,
                partialResults: {},
                timestamp: new Date().toISOString()
              }
            };
          }
        });
        
        const analysisResults = await Promise.allSettled(analysisPromises);
        
        analysisResults.forEach(({ status, value, reason }) => {
          if (status === 'fulfilled' && value) {
            results[value.type] = value.result;
          } else if (status === 'rejected') {
            this.logger.error('Analysis failed:', reason);
            throw reason;
          }
        });
      } else {
        // Sequential analysis
        for (let i = 0; i < analysisTypes.length; i++) {
          const type = analysisTypes[i];
          try {
            this.logger.info(`Analyzing ${type}...`);
            this.emit('analysisTypeStart', type);
            
            results[type] = await this.analyzeType(type, projectInfo, promptGenerator);
            this.updateProgress(i + 1, analysisTypes.length);
            
            if (results[type]?.error) {
              this.state.warnings.push(`${type} analysis completed with warnings`);
              this.logger.warn(`${type} analysis completed with warnings`);
            } else {
              this.logger.success(`${type} analysis complete`);
            }
            
            this.emit('analysisTypeComplete', type, results[type]);
          } catch (error) {
            const errorInfo = this.errorHandler.handle(error, `${type} analysis`);
            this.logger.error(`${type} analysis failed: ${errorInfo.message}`);
            this.state.errors.push({ type, error: errorInfo });
            
            if (!errorInfo.recoverable) {
              throw error;
            }
            
            results[type] = {
              error: errorInfo.message,
              partialResults: {},
              timestamp: new Date().toISOString()
            };
          }
        }
      }

      // 4. Enhanced analysis with specialized analyzers
      this.state.phase = 'enhancing';
      await this.enhanceResults(results, projectInfo);
      
      // 5. Generate comprehensive report
      this.state.phase = 'reporting';
      this.logger.info('Generating comprehensive report...');
      const report = await this.reportBuilder.build(results, projectInfo);
      
      // Add analysis metrics to report
      report.analysisMetrics = this.getAnalysisMetrics();
      report.executionTime = Date.now() - this.state.startTime;
      report.state = this.state;
      
      this.logger.success('Analysis complete!');
      this.logger.success(`Reports saved to: ${report.outputDir}`);
      
      // 6. Display summary
      this.displaySummary(report);
      
      // 7. Save analysis state for future reference
      await this.saveAnalysisState(report);
      
      // 8. Cleanup
      await this.cleanup();
      
      this.state.phase = 'completed';
      this.emit('analysisComplete', report);
      
      return report;
      
    } catch (error) {
      this.logger.error('Analysis failed', error);
      await this.cleanup();
      throw error;
    }
  }

  mergeConfig(config) {
    // Merge configuration with options
    if (config.analysis) {
      this.options.maxFiles = this.options.maxFiles || config.analysis.maxFilesPerCategory;
      this.options.exclude = this.options.exclude || config.analysis.excludePatterns?.join(',');
      this.options.include = this.options.include || config.analysis.includePatterns?.join(',');
    }
    
    if (config.ai) {
      this.aiExecutor.timeout = config.ai.timeout;
      this.aiExecutor.maxRetries = config.ai.maxRetries;
    }
  }

  getAnalysisTypes() {
    const allTypes = ['api', 'components', 'websocket', 'auth', 'database', 'performance', 'security', 'complexity'];
    
    if (this.options.type === 'full' || this.options.type === 'comprehensive') {
      return this.options.analysisDepth === 'comprehensive' ? allTypes : 
             ['api', 'components', 'websocket', 'auth', 'database', 'performance'];
    }
    
    if (this.options.type === 'security') {
      return ['auth', 'security'];
    }
    
    if (this.options.type === 'quality') {
      return ['performance', 'complexity'];
    }
    
    if (Array.isArray(this.options.type)) {
      return this.options.type.filter(type => allTypes.includes(type));
    }
    
    return [this.options.type];
  }

  updateProgress(current, total) {
    this.state.progress = Math.round((current / total) * 100);
    this.emit('progress', this.state.progress);
  }
  
  async enhanceResults(results, projectInfo) {
    this.logger.info('Enhancing results with specialized analyzers...');
    
    // Collect all files for enhanced analysis
    const allFiles = Object.values(projectInfo.files).flat();
    const fileReader = new FileReader({ maxFileSize: this.options.maxFileSize });
    const filesWithContent = await fileReader.readFiles(allFiles.slice(0, this.options.maxFiles));
    
    // Security enhancement
    if (results.auth || results.security) {
      try {
        const securityResult = results.auth || results.security || {};
        results.security = await this.securityAnalyzer.analyze(securityResult, filesWithContent, projectInfo);
        this.logger.success('Security analysis enhanced');
      } catch (error) {
        this.logger.warn('Security enhancement failed:', error.message);
      }
    }
    
    // Performance enhancement
    if (results.performance) {
      try {
        results.performance = await this.performanceProfiler.profile(results.performance, filesWithContent, projectInfo);
        this.logger.success('Performance analysis enhanced');
      } catch (error) {
        this.logger.warn('Performance enhancement failed:', error.message);
      }
    }
    
    // Complexity analysis
    if (this.options.analysisDepth === 'comprehensive' || results.complexity) {
      try {
        results.complexity = await this.complexityAnalyzer.analyze(results.complexity || {}, filesWithContent, projectInfo);
        this.logger.success('Complexity analysis completed');
      } catch (error) {
        this.logger.warn('Complexity analysis failed:', error.message);
      }
    }
    
    this.metrics.filesAnalyzed = filesWithContent.length;
  }
  
  getAnalysisMetrics() {
    return {
      ...this.metrics,
      analysisTime: Date.now() - this.state.startTime,
      errors: this.state.errors.length,
      warnings: this.state.warnings.length,
      cacheEfficiency: this.metrics.apiCalls > 0 ? 
        Math.round((this.metrics.cacheHits / this.metrics.apiCalls) * 100) : 0
    };
  }
  
  async saveAnalysisState(report) {
    if (!this.options.saveState) return;
    
    try {
      const stateFile = `${report.outputDir}/analysis-state.json`;
      const state = {
        timestamp: new Date().toISOString(),
        options: this.options,
        metrics: this.getAnalysisMetrics(),
        state: this.state,
        summary: {
          totalFiles: report.projectInfo?.totalFiles || 0,
          analysisTypes: this.getAnalysisTypes(),
          success: this.state.errors.length === 0
        }
      };
      
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      this.logger.debug('Analysis state saved');
    } catch (error) {
      this.logger.warn('Could not save analysis state:', error.message);
    }
  }

  async analyzeType(type, projectInfo, promptGenerator) {
    const fileReader = new FileReader({
      maxFileSize: 1024 * 1024, // 1MB
      exclude: this.options.exclude?.split(',') || []
    });
    
    // Get relevant files for this analysis type
    const relevantFiles = this.getRelevantFiles(type, projectInfo.files);
    
    if (relevantFiles.length === 0) {
      this.logger.warn(`No relevant files found for ${type} analysis`);
      return {
        message: `No relevant files found for ${type} analysis`,
        suggestions: this.getSuggestionsForMissingFiles(type)
      };
    }
    
    // Check cache
    const cacheKey = this.cache.generateKey(type, relevantFiles);
    const cached = await this.cache.get(cacheKey);
    if (cached && !cached.error) {
      this.logger.info(`Using cached results for ${type}`);
      return cached;
    }
    
    // Read file contents
    this.logger.debug(`Reading ${relevantFiles.length} files for ${type} analysis`);
    const filesWithContent = await fileReader.readFiles(relevantFiles);
    
    if (filesWithContent.length === 0) {
      throw new Error(`No files could be read for ${type} analysis`);
    }
    
    // First, do our own analysis
    const BaseAnalyzer = require('../analyzers/base-analyzer');
    const baseAnalyzer = new BaseAnalyzer();
    const baseResults = await baseAnalyzer.analyzeFiles(filesWithContent);
    
    // Then enhance with AI if available and not mock
    let enhancedResults = baseResults;
    if (this.options.ai && this.options.ai !== 'mock') {
      try {
        const AIEnhancer = require('./ai-enhancer');
        const enhancer = new AIEnhancer(this.options.ai);
        enhancedResults = await enhancer.enhance(baseResults, projectInfo);
      } catch (error) {
        this.logger.warn('AI enhancement failed, using base results:', error.message);
      }
    }
    
    // Format results according to type
    const formattedResult = this.formatAnalysisResult(type, enhancedResults);
    
    // Generate API documentation if this is an API analysis
    if (type === 'api' && formattedResult.endpoints?.length > 0) {
      try {
        await this.apiDocsGenerator.generateAPIDocumentation(formattedResult, this.options.output || './smart-ast-output');
      } catch (error) {
        this.logger.warn('API documentation generation failed:', error.message);
      }
    }
    
    // Cache results only if valid
    if (!formattedResult.error) {
      await this.cache.set(cacheKey, formattedResult);
    }
    
    return formattedResult;
  }

  getPromptMethodName(type) {
    const methodMap = {
      api: 'generateAPIAnalysisPrompt',
      components: 'generateComponentAnalysisPrompt',
      websocket: 'generateWebSocketAnalysisPrompt',
      auth: 'generateAuthAnalysisPrompt',
      database: 'generateDatabaseAnalysisPrompt',
      performance: 'generatePerformanceAnalysisPrompt'
    };
    
    return methodMap[type];
  }

  getRelevantFiles(type, categorizedFiles) {
    const fileMap = {
      api: [...(categorizedFiles.apis || []), ...(categorizedFiles.services || [])],
      components: categorizedFiles.components || [],
      websocket: categorizedFiles.websockets || [],
      auth: categorizedFiles.auth || [],
      database: [...(categorizedFiles.models || []), ...(categorizedFiles.services || [])],
      performance: [
        ...(categorizedFiles.components || []),
        ...(categorizedFiles.apis || []),
        ...(categorizedFiles.services || [])
      ]
    };
    
    return fileMap[type] || [];
  }

  getSuggestionsForMissingFiles(type) {
    const suggestions = {
      api: [
        'Create API routes in routes/, api/, or controllers/ directory',
        'Ensure API files have extensions: .js, .ts, .jsx, .tsx',
        'Check if files contain API patterns like app.get(), router.post(), etc.'
      ],
      components: [
        'Place React/Vue components in components/, src/, or pages/ directory',
        'Ensure component files have extensions: .jsx, .tsx, .vue',
        'Check if files export React/Vue components'
      ],
      websocket: [
        'Create WebSocket files in socket/, ws/, or realtime/ directory',
        'Look for socket.io, WebSocket, or similar implementations',
        'Check for files containing socket, io, or ws in their names'
      ],
      auth: [
        'Create authentication files in auth/ or middleware/ directory',
        'Look for passport, jwt, or authentication middleware',
        'Check for login, logout, or auth-related functions'
      ],
      database: [
        'Create model files in models/, entities/, or schemas/ directory',
        'Look for database ORM files (Sequelize, TypeORM, Mongoose)',
        'Check for database query implementations'
      ],
      performance: [
        'Analysis requires component and API files',
        'Ensure you have sufficient code files to analyze',
        'Consider running individual analysis types first'
      ]
    };
    
    return suggestions[type] || ['No specific suggestions available'];
  }

  getAdditionalContext(type, projectInfo) {
    const baseContext = [
      `Project Framework: ${projectInfo.framework}`,
      `Project Type: ${projectInfo.type}`,
      `Language: ${projectInfo.language}`
    ];
    
    const typeSpecificContext = {
      api: [
        'Focus on REST endpoints, GraphQL schemas, and RPC methods',
        'Pay attention to authentication middleware and security practices',
        'Look for input validation and error handling patterns'
      ],
      components: [
        'Pay attention to component composition and data flow',
        'Look for state management patterns and prop passing',
        'Consider performance implications of rendering'
      ],
      websocket: [
        'Focus on real-time communication patterns',
        'Look for event handlers, emitters, and room management',
        'Consider connection lifecycle and error handling'
      ],
      auth: [
        'Focus on authentication and authorization flows',
        'Look for token management and session handling',
        'Consider security best practices and vulnerabilities'
      ],
      database: [
        'Focus on query patterns and data relationships',
        'Look for potential performance issues and optimization opportunities',
        'Consider transaction handling and data integrity'
      ],
      performance: [
        'Focus on bundle size, rendering performance, and optimization opportunities',
        'Look for memory leaks, heavy computations, and inefficient patterns',
        'Consider caching, lazy loading, and code splitting opportunities'
      ]
    };
    
    return [...baseContext, ...(typeSpecificContext[type] || [])].join('\n');
  }

  formatAnalysisResult(type, results) {
    const formatted = {
      timestamp: new Date().toISOString(),
      type: type
    };

    switch (type) {
      case 'api':
        formatted.endpoints = results.endpoints || [];
        formatted.apiGroups = this.groupEndpointsByPath(results.endpoints);
        formatted.orphanedEndpoints = [];
        formatted.securityIssues = results.security?.issues || [];
        formatted.recommendations = results.aiSecurityInsights || [
          'Implement rate limiting',
          'Add authentication middleware',
          'Validate input parameters'
        ];
        break;

      case 'components':
        formatted.components = results.components || {};
        formatted.unusedComponents = [];
        formatted.recommendations = results.aiPerformanceInsights || [
          'Use React.memo for expensive components',
          'Implement code splitting',
          'Optimize re-renders'
        ];
        break;

      case 'auth':
        formatted.authentication = {
          methods: [],
          providers: [],
          flows: {}
        };
        formatted.authorization = {
          type: 'none',
          roles: [],
          permissions: []
        };
        formatted.recommendations = ['Implement authentication system'];
        break;

      case 'performance':
        formatted.metrics = results.performance || {};
        formatted.issues = results.performance?.issues || [];
        formatted.recommendations = results.aiArchitectureInsights || [
          'Optimize bundle size',
          'Implement lazy loading',
          'Add performance monitoring'
        ];
        break;

      default:
        formatted.data = results;
        formatted.recommendations = ['Analysis completed'];
    }

    return formatted;
  }

  groupEndpointsByPath(endpoints) {
    const groups = {};
    
    endpoints.forEach(endpoint => {
      const basePath = endpoint.path.split('/')[1] || 'root';
      if (!groups[basePath]) {
        groups[basePath] = [];
      }
      groups[basePath].push(endpoint);
    });

    return groups;
  }

  validateAnalysisResult(type, result) {
    if (!result || typeof result !== 'object') {
      return {
        error: 'Invalid analysis result format',
        rawResult: result
      };
    }
    
    if (result.error || result.parseError) {
      return result; // Already an error result
    }
    
    // Type-specific validation
    const validators = {
      api: (r) => r.endpoints || r.message,
      components: (r) => r.components || r.message,
      websocket: (r) => r.events || r.websocket || r.message,
      auth: (r) => r.authentication || r.message,
      database: (r) => r.models || r.database || r.message,
      performance: (r) => r.bundle || r.rendering || r.metrics || r.message
    };
    
    const validator = validators[type];
    if (validator && !validator(result)) {
      return {
        error: `Invalid ${type} analysis result structure`,
        rawResult: result,
        expected: `Expected ${type}-specific data structure`
      };
    }
    
    return result;
  }

  displaySummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ANALYSIS SUMMARY');
    console.log('='.repeat(60));
    console.log(report.summary);
    
    if (report.insights && report.insights.length > 0) {
      console.log('\n🔍 KEY INSIGHTS:');
      report.insights.slice(0, 3).forEach((insight, i) => {
        console.log(`${i + 1}. ${insight}`);
      });
    }
    
    if (report.recommendations && report.recommendations.length > 0) {
      console.log('\n🎯 TOP RECOMMENDATIONS:');
      report.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`${i + 1}. ${rec.title} (${rec.priority} priority)`);
      });
    }
    
    if (report.metrics) {
      console.log('\n📈 QUALITY METRICS:');
      console.log(`Security Score: ${report.metrics.securityScore || 'N/A'}/100`);
      console.log(`Performance Score: ${report.metrics.performanceScore || 'N/A'}/100`);
      console.log(`Maintainability Score: ${report.metrics.maintainabilityScore || 'N/A'}/100`);
      console.log(`Overall Score: ${report.metrics.overallScore || 'N/A'}/100`);
    }
    
    if (report.files && report.files.length > 0) {
      console.log('\n📁 GENERATED REPORTS:');
      report.files.forEach(file => {
        console.log(`• ${file}`);
      });
    }
    
    console.log('='.repeat(60) + '\n');
  }

  async cleanup() {
    try {
      await this.aiExecutor.cleanup();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

module.exports = SmartASTAnalyzer;