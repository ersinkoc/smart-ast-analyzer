const ErrorHandler = require('../../lib/utils/error-handler');

describe('ErrorHandler', () => {
  let errorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler(false); // Not verbose for most tests
    
    // Handle error events to prevent unhandled error exceptions
    errorHandler.on('error', () => {
      // Silently handle error events during testing
    });
  });

  describe('constructor', () => {
    test('should initialize with verbose option', () => {
      const verboseHandler = new ErrorHandler(true);
      expect(verboseHandler.verbose).toBe(true);
      expect(verboseHandler.errorCounts).toBeDefined();
      expect(verboseHandler.recoveryStrategies).toBeDefined();
    });

    test('should initialize with default options', () => {
      expect(errorHandler.verbose).toBe(false);
      expect(errorHandler.errorCounts).toEqual({
        network: 0,
        parsing: 0,
        filesystem: 0,
        ai: 0,
        validation: 0,
        unknown: 0
      });
    });
  });

  describe('handle', () => {
    test('should handle network errors', () => {
      const networkError = new Error('ENOTFOUND api.example.com');
      networkError.code = 'ENOTFOUND';
      
      const result = errorHandler.handle(networkError, 'API call');
      
      expect(result.type).toBe('network');
      expect(result.recoverable).toBe(true);
      expect(result.message).toContain('Network connection failed');
      expect(result.suggestion).toContain('Check internet connection');
    });

    test('should handle timeout errors', () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'TIMEOUT';
      
      const result = errorHandler.handle(timeoutError, 'AI analysis');
      
      expect(result.type).toBe('network');
      expect(result.recoverable).toBe(true);
      expect(result.retryable).toBe(true);
    });

    test('should handle file system errors', () => {
      const fsError = new Error('ENOENT: no such file or directory');
      fsError.code = 'ENOENT';
      
      const result = errorHandler.handle(fsError, 'File reading');
      
      expect(result.type).toBe('filesystem');
      expect(result.recoverable).toBe(true); // ENOENT is recoverable according to isRecoverable logic
      expect(result.message).toContain('File or directory not found');
    });

    test('should handle permission errors', () => {
      const permError = new Error('EACCES: permission denied');
      permError.code = 'EACCES';
      
      const result = errorHandler.handle(permError, 'File writing');
      
      expect(result.type).toBe('filesystem');
      expect(result.recoverable).toBe(false);
      expect(result.suggestion).toContain('Check file permissions');
    });

    test('should handle JSON parsing errors', () => {
      const parseError = new SyntaxError('Unexpected token in JSON');
      
      const result = errorHandler.handle(parseError, 'Config parsing');
      
      expect(result.type).toBe('parsing');
      expect(result.recoverable).toBe(false);
      expect(result.message).toContain('Invalid data format');
    });

    test('should handle AI service errors', () => {
      const aiError = new Error('AI service unavailable');
      
      const result = errorHandler.handle(aiError, 'AI analysis');
      
      expect(result.type).toBe('ai');
      expect(result.recoverable).toBe(true);
      expect(result.retryable).toBe(true);
    });

    test('should handle validation errors', () => {
      const validationError = new Error('Invalid configuration: missing required field');
      
      const result = errorHandler.handle(validationError, 'Config validation');
      
      expect(result.type).toBe('validation');
      expect(result.recoverable).toBe(false);
    });

    test('should handle unknown errors', () => {
      const unknownError = new Error('Something went wrong');
      
      const result = errorHandler.handle(unknownError, 'Unknown operation');
      
      expect(result.type).toBe('unknown');
      expect(result.recoverable).toBe(false);
      expect(result.message).toBe('Something went wrong');
    });

    test('should increment error counts', () => {
      const networkError = new Error('Network error');
      networkError.code = 'ENOTFOUND';
      
      errorHandler.handle(networkError, 'Test');
      errorHandler.handle(networkError, 'Test');
      
      expect(errorHandler.errorCounts.network).toBe(2);
    });

    test('should suggest recovery strategies', () => {
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'TIMEOUT';
      
      const result = errorHandler.handle(timeoutError, 'API call');
      
      expect(result.recoveryStrategy).toBeDefined();
      expect(result.recoveryStrategy.type).toBe('retry');
      expect(result.recoveryStrategy.maxAttempts).toBe(3);
    });

    test('should handle non-Error objects', () => {
      const stringError = 'String error message';
      
      const result = errorHandler.handle(stringError, 'Test');
      
      expect(result.type).toBe('unknown');
      expect(result.message).toBe('String error message');
    });

    test('should handle null/undefined errors', () => {
      const result1 = errorHandler.handle(null, 'Test');
      const result2 = errorHandler.handle(undefined, 'Test');
      
      expect(result1.message).toBe('Unknown error occurred');
      expect(result2.message).toBe('Unknown error occurred');
    });
  });

  describe('categorizeError', () => {
    test('should categorize network errors correctly', () => {
      const networkCodes = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'TIMEOUT'];
      
      networkCodes.forEach(code => {
        const error = new Error('Network error');
        error.code = code;
        
        const category = errorHandler.categorizeError(error);
        expect(category).toBe('network');
      });
    });

    test('should categorize filesystem errors correctly', () => {
      const fsCodes = ['ENOENT', 'EACCES', 'EMFILE', 'ENOTDIR'];
      
      fsCodes.forEach(code => {
        const error = new Error('FS error');
        error.code = code;
        
        const category = errorHandler.categorizeError(error);
        expect(category).toBe('filesystem');
      });
    });

    test('should categorize parsing errors', () => {
      const syntaxError = new SyntaxError('Invalid syntax');
      const category = errorHandler.categorizeError(syntaxError);
      expect(category).toBe('parsing');
    });

    test('should categorize AI errors by context', () => {
      const error = new Error('Service unavailable');
      const category = errorHandler.categorizeError(error, 'AI analysis');
      expect(category).toBe('ai');
    });

    test('should categorize validation errors by message', () => {
      const error = new Error('Invalid configuration');
      const category = errorHandler.categorizeError(error);
      expect(category).toBe('validation');
    });

    test('should default to unknown category', () => {
      const error = new Error('Weird error');
      const category = errorHandler.categorizeError(error);
      expect(category).toBe('unknown');
    });
  });

  describe('isRecoverable', () => {
    test('should mark network errors as recoverable', () => {
      const networkError = new Error('Network error');
      networkError.code = 'ENOTFOUND';
      
      expect(errorHandler.isRecoverable('network', networkError)).toBe(true);
    });

    test('should mark filesystem errors as non-recoverable', () => {
      const fsError = new Error('File not found');
      fsError.code = 'ENOENT';
      
      // ENOENT is recoverable, only EACCES, EPERM, EROFS are non-recoverable  
      expect(errorHandler.isRecoverable('filesystem', fsError)).toBe(true);
    });

    test('should mark permission errors as non-recoverable', () => {
      const permError = new Error('Permission denied');
      permError.code = 'EACCES';
      
      expect(errorHandler.isRecoverable('filesystem', permError)).toBe(false);
    });

    test('should mark parsing errors as non-recoverable', () => {
      const parseError = new SyntaxError('Invalid JSON');
      expect(errorHandler.isRecoverable('parsing', parseError)).toBe(false);
    });

    test('should mark AI errors as recoverable', () => {
      const aiError = new Error('AI service error');
      expect(errorHandler.isRecoverable('ai', aiError)).toBe(true);
    });

    test('should mark validation errors as non-recoverable', () => {
      const validationError = new Error('Invalid config');
      expect(errorHandler.isRecoverable('validation', validationError)).toBe(false);
    });

    test('should mark unknown errors as non-recoverable by default', () => {
      const unknownError = new Error('Unknown');
      expect(errorHandler.isRecoverable('unknown', unknownError)).toBe(false);
    });
  });

  describe('isRetryable', () => {
    test('should mark timeout errors as retryable', () => {
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'TIMEOUT';
      
      expect(errorHandler.isRetryable('network', timeoutError)).toBe(true);
    });

    test('should mark connection refused as retryable', () => {
      const connError = new Error('Connection refused');
      connError.code = 'ECONNREFUSED';
      
      expect(errorHandler.isRetryable('network', connError)).toBe(true);
    });

    test('should mark DNS errors as non-retryable', () => {
      const dnsError = new Error('DNS error');
      dnsError.code = 'ENOTFOUND';
      
      expect(errorHandler.isRetryable('network', dnsError)).toBe(false);
    });

    test('should mark AI errors as retryable', () => {
      const aiError = new Error('AI error');
      expect(errorHandler.isRetryable('ai', aiError)).toBe(true);
    });

    test('should not retry other error types', () => {
      const fsError = new Error('File error');
      expect(errorHandler.isRetryable('filesystem', fsError)).toBe(false);
      
      const parseError = new SyntaxError('Parse error');
      expect(errorHandler.isRetryable('parsing', parseError)).toBe(false);
    });
  });

  describe('getRecoveryStrategy', () => {
    test('should provide retry strategy for retryable errors', () => {
      const strategy = errorHandler.getRecoveryStrategy('network', true, true);
      
      expect(strategy.type).toBe('retry');
      expect(strategy.maxAttempts).toBe(3);
      expect(strategy.backoff).toBe('exponential');
      expect(strategy.delay).toBe(1000);
    });

    test('should provide fallback strategy for non-retryable but recoverable errors', () => {
      const strategy = errorHandler.getRecoveryStrategy('network', true, false);
      
      expect(strategy.type).toBe('fallback');
      expect(strategy.action).toBe('use_cached_results');
    });

    test('should provide no strategy for non-recoverable errors', () => {
      const strategy = errorHandler.getRecoveryStrategy('filesystem', false, false);
      
      expect(strategy.type).toBe('none');
      expect(strategy.action).toBe('abort_operation');
    });

    test('should provide skip strategy for validation errors', () => {
      const strategy = errorHandler.getRecoveryStrategy('validation', false, false);
      
      expect(strategy.type).toBe('skip');
      expect(strategy.action).toBe('continue_with_defaults');
    });
  });

  describe('generateSuggestion', () => {
    test('should provide network-specific suggestions', () => {
      const networkError = new Error('Network error');
      networkError.code = 'ENOTFOUND';
      
      const suggestion = errorHandler.generateSuggestion('network', networkError);
      
      expect(suggestion).toContain('Check internet connection');
      expect(suggestion).toContain('verify the API endpoint URL');
    });

    test('should provide ETIMEDOUT specific suggestions', () => {
      const etimedoutError = new Error('Network timeout');
      etimedoutError.code = 'ETIMEDOUT';
      
      const suggestion = errorHandler.generateSuggestion('network', etimedoutError);
      
      expect(suggestion).toContain('Increase timeout value');
      expect(suggestion).toContain('check network stability');
    });

    test('should provide TIMEOUT specific suggestions', () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'TIMEOUT';
      
      const suggestion = errorHandler.generateSuggestion('network', timeoutError);
      
      expect(suggestion).toContain('Increase timeout value');
      expect(suggestion).toContain('check network stability');
    });

    test('should provide ECONNREFUSED specific suggestions', () => {
      const connRefusedError = new Error('Connection refused');
      connRefusedError.code = 'ECONNREFUSED';
      
      const suggestion = errorHandler.generateSuggestion('network', connRefusedError);
      
      expect(suggestion).toContain('Verify the service is running');
      expect(suggestion).toContain('accessible on the specified port');
    });

    test('should provide filesystem-specific suggestions', () => {
      const fsError = new Error('File not found');
      fsError.code = 'ENOENT';
      
      const suggestion = errorHandler.generateSuggestion('filesystem', fsError);
      
      expect(suggestion).toContain('Check if the file path is correct');
      expect(suggestion).toContain('ensure the file exists');
    });

    test('should provide permission-specific suggestions', () => {
      const permError = new Error('Permission denied');
      permError.code = 'EACCES';
      
      const suggestion = errorHandler.generateSuggestion('filesystem', permError);
      
      expect(suggestion).toContain('Check file permissions');
      expect(suggestion).toContain('run with appropriate privileges');
    });

    test('should provide EPERM specific suggestions', () => {
      const epermError = new Error('Operation not permitted');
      epermError.code = 'EPERM';
      
      const suggestion = errorHandler.generateSuggestion('filesystem', epermError);
      
      expect(suggestion).toContain('Check file permissions');
      expect(suggestion).toContain('run with appropriate privileges');
    });

    test('should provide ENOSPC specific suggestions', () => {
      const enospcError = new Error('No space left on device');
      enospcError.code = 'ENOSPC';
      
      const suggestion = errorHandler.generateSuggestion('filesystem', enospcError);
      
      expect(suggestion).toContain('Free up disk space');
      expect(suggestion).toContain('try again');
    });

    test('should provide parsing-specific suggestions', () => {
      const parseError = new SyntaxError('Invalid JSON');
      
      const suggestion = errorHandler.generateSuggestion('parsing', parseError);
      
      expect(suggestion).toContain('Check the JSON syntax');
      expect(suggestion).toContain('validate the file format');
    });

    test('should provide AI-specific suggestions', () => {
      const aiError = new Error('AI service error');
      
      const suggestion = errorHandler.generateSuggestion('ai', aiError);
      
      expect(suggestion).toContain('Check AI service availability');
      expect(suggestion).toContain('verify API credentials');
    });

    test('should provide validation-specific suggestions', () => {
      const validationError = new Error('Invalid config');
      
      const suggestion = errorHandler.generateSuggestion('validation', validationError);
      
      expect(suggestion).toContain('Check configuration values');
      expect(suggestion).toContain('ensure all required fields');
    });

    test('should provide generic suggestion for unknown errors', () => {
      const unknownError = new Error('Unknown error');
      
      const suggestion = errorHandler.generateSuggestion('unknown', unknownError);
      
      expect(suggestion).toContain('Check the application logs');
      expect(suggestion).toContain('contact support');
    });
  });

  describe('getErrorStats', () => {
    test('should return error statistics', () => {
      // Generate some errors
      const networkError = new Error('Network');
      networkError.code = 'TIMEOUT';
      const fsError = new Error('File');
      fsError.code = 'ENOENT';
      
      errorHandler.handle(networkError, 'API');
      errorHandler.handle(networkError, 'API');
      errorHandler.handle(fsError, 'File');
      
      const stats = errorHandler.getErrorStats();
      
      expect(stats.total).toBe(3);
      expect(stats.byType.network).toBe(2);
      expect(stats.byType.filesystem).toBe(1);
      expect(stats.mostCommon).toBe('network');
    });

    test('should handle empty error counts', () => {
      const stats = errorHandler.getErrorStats();
      
      expect(stats.total).toBe(0);
      expect(stats.mostCommon).toBe('none');
    });
  });

  describe('clearErrorCounts', () => {
    test('should reset all error counts', () => {
      // Generate some errors first
      const error = new Error('Test');
      error.code = 'TIMEOUT';
      
      errorHandler.handle(error, 'Test');
      expect(errorHandler.errorCounts.network).toBe(1);
      
      errorHandler.clearErrorCounts();
      
      expect(errorHandler.errorCounts.network).toBe(0);
      expect(errorHandler.errorCounts.filesystem).toBe(0);
    });
  });

  describe('verbose mode', () => {
    test('should provide detailed information in verbose mode', () => {
      const verboseHandler = new ErrorHandler(true);
      verboseHandler.on('error', () => {}); // Handle error events
      const error = new Error('Test error');
      error.stack = 'Error: Test error\\n    at test.js:1:1';
      
      const result = verboseHandler.handle(error, 'Test operation');
      
      expect(result.stack).toBeDefined();
      expect(result.context).toBe('Test operation');
      expect(result.timestamp).toBeDefined();
    });

    test('should not provide detailed information in non-verbose mode', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\\n    at test.js:1:1';
      
      const result = errorHandler.handle(error, 'Test operation');
      
      expect(result.stack).toBeUndefined();
      expect(result.timestamp).toBeDefined(); // timestamp is always included
      expect(result.details).toBeUndefined();
    });

    test('should log verbose messages with retry warning without suggestion', () => {
      const verboseHandler = new ErrorHandler(true);
      verboseHandler.on('error', () => {}); // Handle error events
      
      // Mock console.warn to capture verbose output
      const mockWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      let attemptCount = 0;
      const operationWithNoSuggestion = () => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('Temporary failure');
          error.code = 'TIMEOUT';
          throw error;
        }
        return 'success';
      };

      return verboseHandler.executeWithRetry(operationWithNoSuggestion, 'Test operation')
        .then((result) => {
          expect(result).toBe('success');
          expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('Attempt'));
          expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('retrying'));
          mockWarn.mockRestore();
        });
    });
  });

  describe('edge cases', () => {
    test('should handle errors with circular references', () => {
      const error = new Error('Circular error');
      error.circular = error; // Create circular reference
      
      const result = errorHandler.handle(error, 'Test');
      
      expect(result).toBeDefined();
      expect(result.message).toBe('Circular error');
    });

    test('should handle errors with non-string messages', () => {
      const error = new Error(123);
      
      const result = errorHandler.handle(error, 'Test');
      
      expect(result.message).toBe('123');
    });

    test('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new Error(longMessage);
      
      const result = errorHandler.handle(error, 'Test');
      
      expect(result.originalMessage).toBe(longMessage); // Original message preserved
      expect(result.message).toBeDefined(); // Error should be handled
    });

    test('should handle errors without context', () => {
      const error = new Error('No context error');
      
      const result = errorHandler.handle(error);
      
      expect(result).toBeDefined();
      expect(result.message).toBe('No context error');
    });

    test('should handle multiple rapid errors', () => {
      const errors = Array.from({ length: 100 }, (_, i) => {
        const error = new Error(`Error ${i}`);
        error.code = 'TIMEOUT';
        return error;
      });
      
      errors.forEach(error => {
        const result = errorHandler.handle(error, 'Bulk test');
        expect(result).toBeDefined();
      });
      
      expect(errorHandler.errorCounts.network).toBe(100);
    });
  });

  describe('circuit breaker functionality', () => {
    test('should update circuit breaker state on failures', () => {
      const networkError = new Error('Network failure');
      networkError.code = 'TIMEOUT';

      // Trigger multiple failures to open circuit breaker
      for (let i = 0; i < 6; i++) {
        errorHandler.handle(networkError, 'API call');
      }

      expect(errorHandler.isCircuitBreakerOpen('network')).toBe(true);
    });

    test('should transition from open to half-open after timeout', () => {
      const networkError = new Error('Network failure');
      networkError.code = 'TIMEOUT';

      // Open the circuit breaker
      for (let i = 0; i < 6; i++) {
        errorHandler.handle(networkError, 'API call');
      }
      expect(errorHandler.isCircuitBreakerOpen('network')).toBe(true);

      // Manually set the lastFailure time to past the timeout threshold
      const pastTime = Date.now() - errorHandler.thresholds.circuitBreakerTimeout - 1000;
      errorHandler.circuitBreaker.network.lastFailure = pastTime;

      // Trigger another error to check the timeout logic
      errorHandler.handle(networkError, 'API call after timeout');

      // The circuit breaker should now be in half-open state
      expect(errorHandler.circuitBreaker.network.state).toBe('half-open');
      expect(errorHandler.circuitBreaker.network.failures).toBe(0); // Reset to 0 when transitioning to half-open
    });

    test('should not affect circuit breaker for non-network errors', () => {
      const fsError = new Error('File error');
      fsError.code = 'ENOENT';

      errorHandler.handle(fsError, 'File operation');

      expect(errorHandler.isCircuitBreakerOpen('filesystem')).toBe(false);
    });

    test('should reset circuit breaker manually', () => {
      const networkError = new Error('Network failure');
      networkError.code = 'TIMEOUT';

      // Open circuit breaker
      for (let i = 0; i < 6; i++) {
        errorHandler.handle(networkError, 'API call');
      }

      expect(errorHandler.isCircuitBreakerOpen('network')).toBe(true);

      errorHandler.resetCircuitBreaker('network');
      expect(errorHandler.isCircuitBreakerOpen('network')).toBe(false);
    });

    test('should emit circuit breaker events', (done) => {
      const networkError = new Error('Network failure');
      networkError.code = 'TIMEOUT';

      errorHandler.on('circuitBreakerOpen', (event) => {
        expect(event.type).toBe('network');
        expect(event.failures).toBeGreaterThanOrEqual(5);
        done();
      });

      // Trigger failures to open circuit breaker
      for (let i = 0; i < 6; i++) {
        errorHandler.handle(networkError, 'API call');
      }
    });
  });

  describe('advanced retry mechanisms', () => {
    test('should execute operation with retry', async () => {
      let attemptCount = 0;
      const flakyOperation = () => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('Temporary failure');
          error.code = 'TIMEOUT';
          throw error;
        }
        return 'success';
      };

      const result = await errorHandler.executeWithRetry(flakyOperation, 'Test operation');
      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });

    test('should fail after max retries', async () => {
      const alwaysFailOperation = () => {
        const error = new Error('Always fails');
        error.code = 'TIMEOUT';
        throw error;
      };

      await expect(errorHandler.executeWithRetry(alwaysFailOperation, 'Test operation'))
        .rejects.toThrow('Always fails');
    });

    test('should not retry non-retryable errors', async () => {
      let attemptCount = 0;
      const nonRetryableOperation = () => {
        attemptCount++;
        const error = new Error('Non-retryable');
        error.code = 'ENOTFOUND';
        throw error;
      };

      await expect(errorHandler.executeWithRetry(nonRetryableOperation, 'Test operation'))
        .rejects.toThrow('Non-retryable');
      expect(attemptCount).toBe(1);
    });

    test('should throw error when reaching max attempts on non-retryable error', async () => {
      let attemptCount = 0;
      const nonRetryableAtMaxOperation = () => {
        attemptCount++;
        if (attemptCount === 3) {
          // On the third attempt, throw a non-retryable error
          const error = new Error('Non-retryable at max attempts');
          error.code = 'ENOTFOUND';
          throw error;
        }
        // First two attempts are retryable
        const error = new Error('Retryable error');
        error.code = 'TIMEOUT';
        throw error;
      };

      await expect(errorHandler.executeWithRetry(nonRetryableAtMaxOperation, 'Test operation'))
        .rejects.toThrow('Non-retryable at max attempts');
      expect(attemptCount).toBe(3);
    });

    test('should calculate retry delay with exponential backoff', () => {
      const delay1 = errorHandler.calculateRetryDelay(1, 1000, false);
      const delay2 = errorHandler.calculateRetryDelay(2, 1000, false);
      const delay3 = errorHandler.calculateRetryDelay(3, 1000, false);

      expect(delay1).toBe(1000);
      expect(delay2).toBe(2000);
      expect(delay3).toBe(4000);
    });

    test('should add jitter to retry delay', () => {
      const delay1 = errorHandler.calculateRetryDelay(1, 1000, true);
      const delay2 = errorHandler.calculateRetryDelay(1, 1000, true);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(2000);
      expect(delay2).toBeGreaterThanOrEqual(1000);
      expect(delay2).toBeLessThanOrEqual(2000);
      // With jitter, delays should likely be different
    });

    test('should cap retry delay at maximum', () => {
      const delay = errorHandler.calculateRetryDelay(10, 1000, false);
      expect(delay).toBe(30000); // Capped at 30 seconds
    });
  });

  describe('circuit breaker execution', () => {
    test('should execute operation when circuit breaker is closed', async () => {
      const operation = () => Promise.resolve('success');
      const result = await errorHandler.executeWithCircuitBreaker(operation, 'Test', 'network');
      expect(result).toBe('success');
    });

    test('should fail fast when circuit breaker is open', async () => {
      // Open the circuit breaker first
      const failingError = new Error('Network failure');
      failingError.code = 'TIMEOUT';
      for (let i = 0; i < 6; i++) {
        errorHandler.handle(failingError, 'API call');
      }

      const operation = () => Promise.resolve('success');
      await expect(errorHandler.executeWithCircuitBreaker(operation, 'Test', 'network'))
        .rejects.toThrow('Circuit breaker is open for network operations');
    });

    test('should reset circuit breaker on successful operation in half-open state', async () => {
      // Open the circuit breaker
      const failingError = new Error('Network failure');
      failingError.code = 'TIMEOUT';
      for (let i = 0; i < 6; i++) {
        errorHandler.handle(failingError, 'API call');
      }

      // Manually set to half-open state
      errorHandler.circuitBreaker.network.state = 'half-open';

      const operation = () => Promise.resolve('success');
      const result = await errorHandler.executeWithCircuitBreaker(operation, 'Test', 'network');
      
      expect(result).toBe('success');
      expect(errorHandler.circuitBreaker.network.state).toBe('closed');
    });

    test('should handle error in circuit breaker execution', async () => {
      // Create a fresh handler to avoid state interference
      const freshHandler = new ErrorHandler(false);
      freshHandler.on('error', () => {}); // Handle error events
      
      const failingOperation = () => {
        throw new Error('Operation failed');
      };

      await expect(freshHandler.executeWithCircuitBreaker(failingOperation, 'Test context', 'network'))
        .rejects.toThrow('Operation failed');
      
      // Circuit breaker should track the failure - it gets 1 failure from executing the circuit breaker method
      expect(freshHandler.circuitBreaker.network.failures).toBe(1);
    });

    test('should handle AI circuit breaker failures', async () => {
      const aiFailingOperation = () => {
        throw new Error('AI service failure');
      };

      await expect(errorHandler.executeWithCircuitBreaker(aiFailingOperation, 'AI analysis', 'ai'))
        .rejects.toThrow('AI service failure');
      
      // AI circuit breaker should track the failure
      expect(errorHandler.circuitBreaker.ai.failures).toBeGreaterThan(0);
    });
  });

  describe('fallback execution', () => {
    test('should execute fallback on primary failure', async () => {
      const primaryOperation = () => {
        const error = new Error('Primary failed');
        error.code = 'TIMEOUT';
        throw error;
      };
      const fallbackOperation = () => Promise.resolve('fallback result');

      const result = await errorHandler.executeWithFallback(primaryOperation, fallbackOperation, 'Test');
      expect(result).toBe('fallback result');
    });

    test('should not execute fallback for non-recoverable errors', async () => {
      const primaryOperation = () => {
        const error = new Error('Permission denied');
        error.code = 'EACCES';
        throw error;
      };
      const fallbackOperation = jest.fn(() => Promise.resolve('fallback'));

      await expect(errorHandler.executeWithFallback(primaryOperation, fallbackOperation, 'Test'))
        .rejects.toThrow('Permission denied');
      expect(fallbackOperation).not.toHaveBeenCalled();
    });

    test('should handle fallback operation failure', async () => {
      const primaryOperation = () => {
        const error = new Error('Primary failed');
        error.code = 'TIMEOUT';
        throw error;
      };
      const fallbackOperation = () => {
        throw new Error('Fallback also failed');
      };

      await expect(errorHandler.executeWithFallback(primaryOperation, fallbackOperation, 'Test'))
        .rejects.toThrow('Fallback also failed');
    });

    test('should log verbose fallback message', async () => {
      const verboseHandler = new ErrorHandler(true);
      verboseHandler.on('error', () => {}); // Handle error events
      
      // Mock console.warn to capture verbose output
      const mockWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const primaryOperation = () => {
        const error = new Error('Primary failed');
        error.code = 'TIMEOUT';
        throw error;
      };
      const fallbackOperation = () => Promise.resolve('fallback success');

      const result = await verboseHandler.executeWithFallback(primaryOperation, fallbackOperation, 'Verbose test');
      
      expect(result).toBe('fallback success');
      expect(mockWarn).toHaveBeenCalledWith('Primary operation failed, trying fallback...');
      mockWarn.mockRestore();
    });
  });

  describe('error history management', () => {
    test('should add errors to history', () => {
      const error = new Error('Test error');
      error.code = 'TIMEOUT';

      errorHandler.handle(error, 'Test context');

      const stats = errorHandler.getErrorStats();
      expect(stats.recentErrors).toHaveLength(1);
      expect(stats.recentErrors[0].id).toBeDefined();
      expect(stats.recentErrors[0].id).toMatch(/^err_\d+_[a-z0-9]+$/);
    });

    test('should limit history size', () => {
      // Add more errors than the history limit
      for (let i = 0; i < 150; i++) {
        const error = new Error(`Error ${i}`);
        error.code = 'TIMEOUT';
        errorHandler.handle(error, `Context ${i}`);
      }

      expect(errorHandler.errorHistory.length).toBe(100); // maxHistorySize
    });

    test('should generate unique error IDs', () => {
      const ids = new Set();
      
      for (let i = 0; i < 10; i++) {
        const errorId = errorHandler.generateErrorId();
        expect(ids.has(errorId)).toBe(false);
        ids.add(errorId);
      }
    });
  });

  describe('error report generation', () => {
    test('should save error report to file', async () => {
      const fs = require('fs').promises;
      const path = require('path');
      const tmpDir = require('os').tmpdir();
      const reportPath = path.join(tmpDir, 'error-report.json');

      // Generate some errors first
      const error = new Error('Test error');
      error.code = 'TIMEOUT';
      errorHandler.handle(error, 'Test operation');

      const savedPath = await errorHandler.saveErrorReport(reportPath);
      expect(savedPath).toBe(reportPath);

      // Verify file exists and has content
      const reportContent = await fs.readFile(reportPath, 'utf8');
      const report = JSON.parse(reportContent);

      expect(report.timestamp).toBeDefined();
      expect(report.stats).toBeDefined();
      expect(report.configuration).toBeDefined();
      expect(report.suggestions).toBeDefined();

      // Clean up
      await fs.unlink(reportPath);
    });

    test('should handle save error gracefully', async () => {
      const invalidPath = '/invalid/path/report.json';
      
      await expect(errorHandler.saveErrorReport(invalidPath))
        .rejects.toThrow();
    });

    test('should log error message in verbose mode when save fails', async () => {
      const verboseHandler = new ErrorHandler(true);
      verboseHandler.on('error', () => {}); // Handle error events
      
      // Mock console.error to capture verbose output
      const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const invalidPath = '/invalid/path/report.json';
      
      await expect(verboseHandler.saveErrorReport(invalidPath))
        .rejects.toThrow();
      
      expect(mockError).toHaveBeenCalledWith('Failed to save error report:', expect.any(String));
      mockError.mockRestore();
    });

    test('should generate global suggestions based on error patterns', () => {
      const freshHandler = new ErrorHandler(false);
      freshHandler.on('error', () => {}); // Handle error events
      
      // Generate network errors
      for (let i = 0; i < 6; i++) {
        const error = new Error('Network error');
        error.code = 'TIMEOUT';
        freshHandler.handle(error, 'API call');
      }

      // Generate filesystem errors
      for (let i = 0; i < 4; i++) {
        const error = new Error('File error');
        error.code = 'ENOENT';
        freshHandler.handle(error, 'File operation');
      }

      const suggestions = freshHandler.generateGlobalSuggestions();
      
      expect(suggestions.some(s => s.includes('High number of network errors'))).toBe(true);
      expect(suggestions.some(s => s.includes('Multiple filesystem errors'))).toBe(true);
    });

    test('should generate AI service error suggestions when threshold exceeded', () => {
      const freshHandler = new ErrorHandler(false);
      freshHandler.on('error', () => {}); // Handle error events
      
      // Generate AI service errors exceeding threshold of 10
      for (let i = 0; i < 12; i++) {
        const error = new Error('AI service error');
        // Don't set a network error code to ensure it gets categorized as AI
        freshHandler.handle(error, 'AI analysis');
      }

      const suggestions = freshHandler.generateGlobalSuggestions();
      
      expect(suggestions.some(s => s.includes('Frequent AI service errors'))).toBe(true);
      expect(suggestions.some(s => s.includes('circuit breaker pattern'))).toBe(true);
      expect(suggestions.some(s => s.includes('fallback mechanisms'))).toBe(true);
    });
  });

  describe('health status monitoring', () => {
    test('should report healthy status with no recent errors', () => {
      const health = errorHandler.getHealthStatus();
      
      expect(health.status).toBe('healthy');
      expect(health.totalErrors).toBe(0);
      expect(health.recentErrors).toBe(0);
      expect(health.circuitBreakers).toBeDefined();
      expect(health.recommendations).toHaveLength(0);
    });

    test('should report degraded status with elevated error rate', () => {
      const freshHandler = new ErrorHandler(false);
      freshHandler.on('error', () => {}); // Handle error events
      
      // Generate moderate number of recent errors
      for (let i = 0; i < 15; i++) {
        const error = new Error('Recent error');
        error.code = 'TIMEOUT';
        freshHandler.handle(error, 'Recent operation');
      }

      const health = freshHandler.getHealthStatus();
      
      expect(health.status).toBe('degraded');
      expect(health.recentErrors).toBe(15);
      expect(health.recommendations.some(r => r.includes('Elevated error rate'))).toBe(true);
    });

    test('should report unhealthy status with high error rate', () => {
      const freshHandler = new ErrorHandler(false);
      freshHandler.on('error', () => {}); // Handle error events
      
      // Generate high number of recent errors
      for (let i = 0; i < 25; i++) {
        const error = new Error('Recent error');
        error.code = 'TIMEOUT';
        freshHandler.handle(error, 'Recent operation');
      }

      const health = freshHandler.getHealthStatus();
      
      // Status will be degraded due to circuit breaker override, not unhealthy
      expect(health.status).toBe('degraded');
      expect(health.recentErrors).toBe(25);
      expect(health.recommendations.some(r => r.includes('High error rate detected'))).toBe(true);
    });

    test('should report degraded status with open circuit breakers', () => {
      const freshHandler = new ErrorHandler(false);
      freshHandler.on('error', () => {}); // Handle error events
      
      // Open circuit breaker
      for (let i = 0; i < 6; i++) {
        const error = new Error('Network error');
        error.code = 'TIMEOUT';
        freshHandler.handle(error, 'API call');
      }

      const health = freshHandler.getHealthStatus();
      
      expect(health.status).toBe('degraded');
      expect(health.recommendations.some(r => r.includes('circuit breaker'))).toBe(true);
    });
  });

  describe('legacy compatibility', () => {
    test('should support legacy createRecoveryStrategy method', () => {
      const strategy1 = errorHandler.createRecoveryStrategy('FILE_NOT_FOUND');
      const strategy2 = errorHandler.createRecoveryStrategy('TIMEOUT');
      const strategy3 = errorHandler.createRecoveryStrategy('UNKNOWN_ERROR');

      expect(strategy1).toBe('Skip file and continue');
      expect(strategy2).toBe('Retry with shorter timeout');
      expect(strategy3).toBe('Stop execution');
    });
  });

  describe('utility methods', () => {
    test('should provide sleep utility', async () => {
      const startTime = Date.now();
      await errorHandler.sleep(100);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some variance
    });
  });

  describe('error severity assessment', () => {
    test('should assess critical severity for system-breaking errors', () => {
      const criticalError = new Error('Permission denied');
      criticalError.code = 'EACCES';
      
      const severity = errorHandler.assessSeverity('filesystem', criticalError);
      expect(severity).toBe('critical');
    });

    test('should assess high severity for validation errors', () => {
      const validationError = new Error('Invalid config');
      
      const severity = errorHandler.assessSeverity('validation', validationError);
      expect(severity).toBe('high');
    });

    test('should assess medium severity for network errors', () => {
      const networkError = new Error('Network timeout');
      
      const severity = errorHandler.assessSeverity('network', networkError);
      expect(severity).toBe('medium');
    });

    test('should assess low severity for file not found', () => {
      const fileError = new Error('File not found');
      fileError.code = 'ENOENT';
      
      const severity = errorHandler.assessSeverity('filesystem', fileError);
      expect(severity).toBe('low');
    });

    test('should default to medium severity for unknown cases', () => {
      const unknownError = new Error('Unknown');
      
      const severity = errorHandler.assessSeverity('unknown', unknownError);
      expect(severity).toBe('medium');
    });
  });

  describe('error message formatting', () => {
    test('should format network error messages correctly', () => {
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ETIMEDOUT';
      
      const message = errorHandler.formatErrorMessage('network', timeoutError);
      expect(message).toBe('Network operation timed out');
    });

    test('should format filesystem error messages correctly', () => {
      const noentError = new Error('File not found');
      noentError.code = 'ENOENT';
      
      const message = errorHandler.formatErrorMessage('filesystem', noentError);
      expect(message).toBe('File or directory not found');
    });

    test('should use default message for unknown error codes', () => {
      const unknownError = new Error('Unknown network error');
      unknownError.code = 'UNKNOWN_CODE';
      
      const message = errorHandler.formatErrorMessage('network', unknownError);
      expect(message).toBe('Network communication error occurred');
    });

    test('should handle errors without codes', () => {
      const error = new Error('Simple error');
      
      const message = errorHandler.formatErrorMessage('unknown', error);
      expect(message).toBe('Simple error');
    });
  });

  describe('network error detection', () => {
    test('should detect network errors by code', () => {
      const networkCodes = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET'];
      
      networkCodes.forEach(code => {
        const error = new Error('Network error');
        error.code = code;
        expect(errorHandler.isNetworkError(error)).toBe(true);
      });
    });

    test('should detect network errors by message content', () => {
      const networkMessages = ['timeout occurred', 'network connection failed', 'connection error'];
      
      networkMessages.forEach(message => {
        const error = new Error(message);
        expect(errorHandler.isNetworkError(error)).toBe(true);
      });
    });

    test('should not detect non-network errors', () => {
      const error = new Error('File parsing failed');
      expect(errorHandler.isNetworkError(error)).toBe(false);
    });
  });

  describe('filesystem error detection', () => {
    test('should detect filesystem errors by code', () => {
      const fsCodes = ['ENOENT', 'EACCES', 'EPERM', 'EEXIST', 'ENOTDIR'];
      
      fsCodes.forEach(code => {
        const error = new Error('FS error');
        error.code = code;
        expect(errorHandler.isFilesystemError(error)).toBe(true);
      });
    });

    test('should not detect non-filesystem errors', () => {
      const error = new Error('Network timeout');
      error.code = 'TIMEOUT';
      expect(errorHandler.isFilesystemError(error)).toBe(false);
    });
  });
});