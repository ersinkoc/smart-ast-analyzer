const Logger = require('../../lib/utils/logger');
const chalk = require('chalk');
const ora = require('ora');

// Mock chalk and ora
jest.mock('chalk', () => {
  const mockChalk = {
    cyan: {
      bold: jest.fn(text => text)
    },
    green: jest.fn(text => text),
    red: jest.fn(text => text),
    yellow: jest.fn(text => text),
    gray: jest.fn(text => text),
    blue: jest.fn(text => text),
    magenta: jest.fn(text => text)
  };
  return mockChalk;
});

jest.mock('log-symbols', () => ({
  success: '✓',
  error: '✖',
  warning: '⚠',
  info: 'ℹ'
}));

jest.mock('ora');

describe('Logger', () => {
  let logger;
  let consoleSpy;
  let consoleErrorSpy;
  let mockSpinner;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Create mock spinner
    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis()
    };
    
    // Mock ora to return our mock spinner
    ora.mockReturnValue(mockSpinner);
    
    logger = new Logger();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    test('initializes with default verbose false', () => {
      const logger = new Logger();
      expect(logger.verbose).toBe(false);
      expect(logger.spinner).toBeNull();
    });

    test('initializes with custom verbose setting', () => {
      const logger = new Logger(true);
      expect(logger.verbose).toBe(true);
    });
  });

  describe('start', () => {
    test('logs start message with cyan bold styling', () => {
      logger.start('Starting analysis');
      
      expect(chalk.cyan.bold).toHaveBeenCalledWith('\n🚀 Starting analysis\n');
      expect(consoleSpy).toHaveBeenCalledWith(chalk.cyan.bold('\n🚀 Starting analysis\n'));
    });
  });

  describe('info', () => {
    test('creates new spinner with message', () => {
      logger.info('Processing files');
      
      expect(ora).toHaveBeenCalledWith('Processing files');
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(logger.spinner).toBe(mockSpinner);
    });

    test('stops existing spinner before creating new one', () => {
      logger.spinner = mockSpinner;
      
      logger.info('New task');
      
      expect(mockSpinner.stop).toHaveBeenCalled();
      expect(ora).toHaveBeenCalledWith('New task');
    });
  });

  describe('success', () => {
    test('succeeds spinner with message when spinner exists', () => {
      logger.spinner = mockSpinner;
      
      logger.success('Task completed');
      
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Task completed');
      expect(logger.spinner).toBeNull();
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    test('logs success message when no spinner exists', () => {
      logger.success('Task completed');
      
      expect(chalk.green).toHaveBeenCalledWith('✅ Task completed');
      expect(consoleSpy).toHaveBeenCalledWith(chalk.green('✅ Task completed'));
      expect(mockSpinner.succeed).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    test('fails spinner with message when spinner exists', () => {
      logger.spinner = mockSpinner;
      
      logger.error('Task failed');
      
      expect(mockSpinner.fail).toHaveBeenCalledWith('Task failed');
      expect(logger.spinner).toBeNull();
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    test('logs error message when no spinner exists', () => {
      logger.error('Task failed');
      
      expect(chalk.red).toHaveBeenCalledWith('❌ Task failed');
      expect(consoleSpy).toHaveBeenCalledWith(chalk.red('❌ Task failed'));
    });

    test('logs error details when verbose mode is enabled', () => {
      logger.verbose = true;
      const error = new Error('Detailed error');
      
      logger.error('Task failed', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    });

    test('does not log error details when verbose mode is disabled', () => {
      logger.verbose = false;
      const error = new Error('Detailed error');
      
      logger.error('Task failed', error);
      
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    test('logs warning message with yellow styling', () => {
      logger.warn('This is a warning');
      
      expect(chalk.yellow).toHaveBeenCalledWith('⚠️  This is a warning');
      expect(consoleSpy).toHaveBeenCalledWith(chalk.yellow('⚠️  This is a warning'));
    });

    test('stops and restarts spinner if exists', () => {
      logger.spinner = mockSpinner;
      
      logger.warn('Warning message');
      
      expect(mockSpinner.stop).toHaveBeenCalled();
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(chalk.yellow).toHaveBeenCalledWith('⚠️  Warning message');
      expect(consoleSpy).toHaveBeenCalledWith(chalk.yellow('⚠️  Warning message'));
    });

    test('handles warning when no spinner exists', () => {
      logger.warn('Warning message');
      
      expect(chalk.yellow).toHaveBeenCalledWith('⚠️  Warning message');
      expect(consoleSpy).toHaveBeenCalledWith(chalk.yellow('⚠️  Warning message'));
      expect(mockSpinner.stop).not.toHaveBeenCalled();
      expect(mockSpinner.start).not.toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    test('logs debug message when verbose is true', () => {
      logger.verbose = true;
      
      logger.debug('Debug information');
      
      expect(chalk.gray).toHaveBeenCalledWith('[DEBUG] Debug information');
      expect(consoleSpy).toHaveBeenCalledWith(chalk.gray('[DEBUG] Debug information'));
    });

    test('does not log debug message when verbose is false', () => {
      logger.verbose = false;
      
      logger.debug('Debug information');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(chalk.gray).not.toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    test('handles complete workflow with spinner', () => {
      // Start a task
      logger.info('Starting task');
      expect(logger.spinner).toBeDefined();
      
      // Show warning during task
      logger.warn('Minor issue detected');
      expect(mockSpinner.stop).toHaveBeenCalledTimes(1);
      expect(mockSpinner.start).toHaveBeenCalledTimes(2);
      
      // Complete task successfully
      logger.success('Task completed');
      expect(logger.spinner).toBeNull();
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    test('handles error workflow with spinner', () => {
      // Start a task
      logger.info('Starting risky task');
      const spinner = logger.spinner;
      
      // Task fails
      const error = new Error('Task error');
      logger.error('Task failed', error);
      
      expect(spinner.fail).toHaveBeenCalledWith('Task failed');
      expect(logger.spinner).toBeNull();
    });

    test('handles multiple operations without spinner', () => {
      logger.start('Application started');
      logger.success('Configuration loaded');
      logger.warn('Using default settings');
      logger.error('Connection failed');
      
      expect(consoleSpy).toHaveBeenCalledTimes(4);
      expect(mockSpinner.start).not.toHaveBeenCalled();
    });

    test('verbose mode shows debug logs', () => {
      logger = new Logger(true);
      
      logger.debug('Verbose debug 1');
      logger.debug('Verbose debug 2');
      logger.error('Error occurred', new Error('Test error'));
      
      expect(consoleSpy).toHaveBeenCalledTimes(3); // 2 debug + 1 error
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });
});