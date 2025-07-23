const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class ErrorHandler extends EventEmitter {
  constructor(verbose = false) {
    super();
    this.verbose = verbose;
    this.errorCounts = {
      network: 0,
      parsing: 0,
      filesystem: 0,
      ai: 0,
      validation: 0,
      unknown: 0
    };
    
    this.recoveryStrategies = this.loadRecoveryStrategies();
    this.errorHistory = [];
    this.maxHistorySize = 100;
    
    // Circuit breaker state
    this.circuitBreaker = {
      network: { failures: 0, lastFailure: null, state: 'closed' },
      ai: { failures: 0, lastFailure: null, state: 'closed' }
    };
    
    this.thresholds = {
      circuitBreakerFailures: 5,
      circuitBreakerTimeout: 60000, // 1 minute
      maxRetries: 3,
      baseDelay: 1000
    };
  }

  handle(error, context = '', forceErrorType = null) {
    if (!error) {
      error = new Error('Unknown error occurred');
    }
    
    // Convert string errors to Error objects
    if (typeof error === 'string') {
      error = new Error(error);
    }
    
    const errorType = forceErrorType || this.categorizeError(error, context);
    const isRecoverable = this.isRecoverable(errorType, error);
    const isRetryable = this.isRetryable(errorType, error);
    
    // Increment error counts
    this.errorCounts[errorType]++;
    
    // Update circuit breaker
    this.updateCircuitBreaker(errorType, error);
    
    // Create error information object
    const errorInfo = {
      type: errorType,
      message: this.formatErrorMessage(errorType, error),
      originalMessage: error.message || 'Unknown error',
      code: error.code,
      recoverable: isRecoverable,
      retryable: isRetryable,
      context: context,
      suggestion: this.generateSuggestion(errorType, error),
      recoveryStrategy: this.getRecoveryStrategy(errorType, isRecoverable, isRetryable),
      severity: this.assessSeverity(errorType, error),
      timestamp: new Date().toISOString()
    };
    
    // Add verbose information if enabled
    if (this.verbose) {
      errorInfo.stack = error.stack;
      errorInfo.details = {
        name: error.name,
        fileName: error.fileName,
        lineNumber: error.lineNumber,
        columnNumber: error.columnNumber
      };
    }
    
    // Add to error history
    this.addToHistory(errorInfo);
    
    // Emit error event for monitoring
    this.emit('error', errorInfo);
    
    // Log if verbose
    if (this.verbose) {
      console.error(`[${errorType.toUpperCase()}] Error in ${context}:`, error.message);
      if (errorInfo.suggestion) {
        console.info('Suggestion:', errorInfo.suggestion);
      }
    }
    
    return errorInfo;
  }
  
  categorizeError(error, context = '') {
    // Network errors
    if (this.isNetworkError(error)) {
      return 'network';
    }
    
    // Filesystem errors
    if (this.isFilesystemError(error)) {
      return 'filesystem';
    }
    
    // Parsing errors
    if (error instanceof SyntaxError || error.name === 'SyntaxError') {
      return 'parsing';
    }
    
    // AI service errors (context-based)
    if (context.toLowerCase().includes('ai') || 
        context.toLowerCase().includes('analysis') ||
        error.message.toLowerCase().includes('api')) {
      return 'ai';
    }
    
    // Validation errors
    if (error.message.toLowerCase().includes('invalid') ||
        error.message.toLowerCase().includes('validation') ||
        error.message.toLowerCase().includes('required')) {
      return 'validation';
    }
    
    return 'unknown';
  }
  
  isNetworkError(error) {
    const networkCodes = [
      'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET',
      'EADDRINUSE', 'EADDRNOTAVAIL', 'ENETDOWN', 'ENETUNREACH',
      'EHOSTDOWN', 'EHOSTUNREACH', 'EPIPE', 'TIMEOUT'
    ];
    
    return networkCodes.includes(error.code) ||
           error.message.toLowerCase().includes('timeout') ||
           error.message.toLowerCase().includes('network') ||
           error.message.toLowerCase().includes('connection');
  }
  
  isFilesystemError(error) {
    const fsCodes = [
      'ENOENT', 'EACCES', 'EPERM', 'EEXIST', 'ENOTDIR',
      'EISDIR', 'EMFILE', 'ENFILE', 'ENOSPC', 'EROFS'
    ];
    
    return fsCodes.includes(error.code);
  }
  
  isRecoverable(errorType, error) {
    switch (errorType) {
      case 'network':
        return true; // Network errors are generally recoverable
      case 'ai':
        return true; // AI service errors can be retried
      case 'filesystem':
        // Some filesystem errors are recoverable
        return !['EACCES', 'EPERM', 'EROFS'].includes(error.code);
      case 'parsing':
        return false; // Parsing errors usually indicate bad data
      case 'validation':
        return false; // Validation errors need manual intervention
      case 'unknown':
      default:
        return false;
    }
  }
  
  isRetryable(errorType, error) {
    switch (errorType) {
      case 'network':
        // Retry timeouts and temporary connection issues, but not DNS errors
        return ['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'TIMEOUT'].includes(error.code);
      case 'ai':
        return true; // AI service errors are generally retryable
      case 'filesystem':
        // Retry temporary filesystem issues
        return ['EMFILE', 'ENFILE'].includes(error.code);
      default:
        return false;
    }
  }
  
  formatErrorMessage(errorType, error) {
    const messageMap = {
      network: {
        'ENOTFOUND': 'Network connection failed - unable to resolve hostname',
        'ECONNREFUSED': 'Network connection was refused by the server',
        'ETIMEDOUT': 'Network operation timed out',
        'TIMEOUT': 'Request timed out waiting for response',
        'default': 'Network communication error occurred'
      },
      filesystem: {
        'ENOENT': 'File or directory not found',
        'EACCES': 'Permission denied - insufficient file access rights',
        'EPERM': 'Operation not permitted - administrative privileges required',
        'ENOTDIR': 'Path component is not a directory',
        'EISDIR': 'Expected file but found directory',
        'ENOSPC': 'No space left on device',
        'default': 'File system operation failed'
      },
      parsing: {
        'default': 'Invalid data format - unable to parse content'
      },
      ai: {
        'default': 'AI service communication error'
      },
      validation: {
        'default': 'Configuration validation failed'
      },
      unknown: {
        'default': error.message || 'An unexpected error occurred'
      }
    };
    
    const categoryMessages = messageMap[errorType] || messageMap.unknown;
    return categoryMessages[error.code] || categoryMessages.default;
  }
  
  generateSuggestion(errorType, error) {
    switch (errorType) {
      case 'network':
        if (error.code === 'ENOTFOUND') {
          return 'Check internet connection and verify the API endpoint URL is correct';
        } else if (error.code === 'TIMEOUT' || error.code === 'ETIMEDOUT') {
          return 'Increase timeout value or check network stability';
        } else if (error.code === 'ECONNREFUSED') {
          return 'Verify the service is running and accessible on the specified port';
        }
        return 'Check network connectivity and service availability';
        
      case 'filesystem':
        if (error.code === 'ENOENT') {
          return 'Check if the file path is correct and ensure the file exists';
        } else if (error.code === 'EACCES' || error.code === 'EPERM') {
          return 'Check file permissions or run with appropriate privileges';
        } else if (error.code === 'ENOSPC') {
          return 'Free up disk space and try again';
        }
        return 'Verify file paths and permissions are correct';
        
      case 'parsing':
        return 'Check the JSON syntax and validate the file format is correct';
        
      case 'ai':
        return 'Check AI service availability and verify API credentials are valid';
        
      case 'validation':
        return 'Check configuration values and ensure all required fields are provided';
        
      case 'unknown':
      default:
        return 'Check the application logs for more details and contact support if needed';
    }
  }
  
  getRecoveryStrategy(errorType, isRecoverable, isRetryable) {
    if (isRetryable) {
      return {
        type: 'retry',
        maxAttempts: this.thresholds.maxRetries,
        backoff: 'exponential',
        delay: this.thresholds.baseDelay,
        jitter: true
      };
    } else if (isRecoverable) {
      return {
        type: 'fallback',
        action: 'use_cached_results'
      };
    } else if (errorType === 'validation') {
      return {
        type: 'skip',
        action: 'continue_with_defaults'
      };
    } else {
      return {
        type: 'none',
        action: 'abort_operation'
      };
    }
  }
  
  assessSeverity(errorType, error) {
    // Critical: System-breaking errors
    const criticalCodes = ['EACCES', 'EPERM', 'EROFS'];
    if (criticalCodes.includes(error.code)) {
      return 'critical';
    }
    
    // High: Significant impact on functionality
    if (errorType === 'validation' || errorType === 'parsing') {
      return 'high';
    }
    
    // Medium: Recoverable errors with workarounds
    if (errorType === 'network' || errorType === 'ai') {
      return 'medium';
    }
    
    // Low: Minor issues with minimal impact
    if (error.code === 'ENOENT') {
      return 'low';
    }
    
    return 'medium';
  }
  
  updateCircuitBreaker(errorType, error) {
    if (!['network', 'ai'].includes(errorType)) return;
    
    const breaker = this.circuitBreaker[errorType];
    const now = Date.now();
    
    if (breaker.state === 'open') {
      // Check if enough time has passed to try again
      if (now - breaker.lastFailure > this.thresholds.circuitBreakerTimeout) {
        breaker.state = 'half-open';
        breaker.failures = 0;
      }
    } else {
      // Record failure
      breaker.failures++;
      breaker.lastFailure = now;
      
      if (breaker.failures >= this.thresholds.circuitBreakerFailures) {
        breaker.state = 'open';
        this.emit('circuitBreakerOpen', { type: errorType, failures: breaker.failures });
      }
    }
  }
  
  isCircuitBreakerOpen(errorType) {
    if (!['network', 'ai'].includes(errorType)) return false;
    return this.circuitBreaker[errorType].state === 'open';
  }
  
  resetCircuitBreaker(errorType) {
    if (this.circuitBreaker[errorType]) {
      this.circuitBreaker[errorType] = {
        failures: 0,
        lastFailure: null,
        state: 'closed'
      };
    }
  }
  
  addToHistory(errorInfo) {
    this.errorHistory.unshift({
      ...errorInfo,
      id: this.generateErrorId()
    });
    
    // Limit history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }
  
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getErrorStats() {
    const total = Object.values(this.errorCounts).reduce((sum, count) => sum + count, 0);
    const mostCommon = Object.entries(this.errorCounts)
      .reduce((max, [type, count]) => count > max.count ? { type, count } : max, { type: 'none', count: 0 }).type;
    
    return {
      total,
      byType: { ...this.errorCounts },
      mostCommon,
      recentErrors: this.errorHistory.slice(0, 10),
      circuitBreakerStatus: this.circuitBreaker
    };
  }
  
  clearErrorCounts() {
    Object.keys(this.errorCounts).forEach(key => {
      this.errorCounts[key] = 0;
    });
    this.errorHistory = [];
  }
  
  loadRecoveryStrategies() {
    return {
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000,
        jitter: true
      },
      fallback: {
        useCachedResults: true,
        useDefaultValues: true,
        skipOperation: false
      },
      circuitBreaker: {
        failureThreshold: 5,
        timeoutDuration: 60000,
        monitoringPeriod: 300000
      }
    };
  }
  
  // Advanced recovery mechanisms
  async executeWithRetry(operation, context, options = {}) {
    const maxAttempts = options.maxAttempts || this.thresholds.maxRetries;
    const baseDelay = options.baseDelay || this.thresholds.baseDelay;
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const errorInfo = this.handle(error, context);
        
        if (!errorInfo.retryable || attempt === maxAttempts) {
          throw error;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateRetryDelay(attempt, baseDelay, options.jitter !== false);
        
        if (this.verbose) {
          console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        }
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
  
  calculateRetryDelay(attempt, baseDelay, useJitter = true) {
    // Exponential backoff: delay = baseDelay * (2 ^ (attempt - 1))
    let delay = baseDelay * Math.pow(2, attempt - 1);
    
    // Apply jitter to avoid thundering herd problem
    if (useJitter) {
      delay += Math.random() * baseDelay;
    }
    
    return Math.min(delay, 30000); // Cap at 30 seconds
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async executeWithCircuitBreaker(operation, context, errorType = 'network') {
    if (this.isCircuitBreakerOpen(errorType)) {
      throw new Error(`Circuit breaker is open for ${errorType} operations`);
    }
    
    try {
      const result = await operation();
      
      // Reset circuit breaker on success
      if (this.circuitBreaker[errorType]?.state === 'half-open') {
        this.resetCircuitBreaker(errorType);
      }
      
      return result;
    } catch (error) {
      this.handle(error, context, errorType);
      throw error;
    }
  }
  
  async executeWithFallback(primaryOperation, fallbackOperation, context) {
    try {
      return await primaryOperation();
    } catch (error) {
      const errorInfo = this.handle(error, context);
      
      if (errorInfo.recoverable && fallbackOperation) {
        if (this.verbose) {
          console.warn('Primary operation failed, trying fallback...');
        }
        
        try {
          return await fallbackOperation();
        } catch (fallbackError) {
          this.handle(fallbackError, `${context} (fallback)`);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }
  
  async saveErrorReport(outputPath) {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        stats: this.getErrorStats(),
        configuration: {
          verbose: this.verbose,
          thresholds: this.thresholds
        },
        suggestions: this.generateGlobalSuggestions()
      };
      
      await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
      return outputPath;
    } catch (error) {
      if (this.verbose) {
        console.error('Failed to save error report:', error.message);
      }
      throw error;
    }
  }
  
  generateGlobalSuggestions() {
    const stats = this.getErrorStats();
    const suggestions = [];
    
    if (stats.byType.network > 5) {
      suggestions.push('High number of network errors detected. Consider checking network stability and implementing retry mechanisms.');
    }
    
    if (stats.byType.filesystem > 3) {
      suggestions.push('Multiple filesystem errors encountered. Verify file permissions and paths.');
    }
    
    if (stats.byType.ai > 10) {
      suggestions.push('Frequent AI service errors. Consider implementing circuit breaker pattern or fallback mechanisms.');
    }
    
    return suggestions;
  }
  
  // Health check for error handler
  getHealthStatus() {
    const stats = this.getErrorStats();
    const now = Date.now();
    const recentErrors = this.errorHistory.filter(
      error => now - new Date(error.timestamp).getTime() < 300000 // Last 5 minutes
    );
    
    const health = {
      status: 'healthy',
      totalErrors: stats.total,
      recentErrors: recentErrors.length,
      circuitBreakers: Object.entries(this.circuitBreaker).map(([type, breaker]) => ({
        type,
        state: breaker.state,
        failures: breaker.failures
      })),
      recommendations: []
    };
    
    // Determine health status
    if (recentErrors.length > 20) {
      health.status = 'unhealthy';
      health.recommendations.push('High error rate detected in the last 5 minutes');
    } else if (recentErrors.length > 10) {
      health.status = 'degraded';
      health.recommendations.push('Elevated error rate detected');
    }
    
    // Check circuit breakers
    const openBreakers = Object.values(this.circuitBreaker).filter(b => b.state === 'open');
    if (openBreakers.length > 0) {
      health.status = 'degraded';
      health.recommendations.push(`${openBreakers.length} circuit breaker(s) are open`);
    }
    
    return health;
  }

  // Legacy method for backward compatibility
  createRecoveryStrategy(errorType) {
    const strategies = {
      FILE_NOT_FOUND: 'Skip file and continue',
      TIMEOUT: 'Retry with shorter timeout',
      PARSE_ERROR: 'Try alternative parsing method',
      PERMISSION_DENIED: 'Skip restricted file'
    };
    
    return strategies[errorType] || 'Stop execution';
  }
}

module.exports = ErrorHandler;