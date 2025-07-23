const chalk = require('chalk');
const ora = require('ora');

class Logger {
  constructor(verbose = false) {
    this.verbose = verbose;
    this.spinner = null;
  }

  start(message) {
    console.log(chalk.cyan.bold(`\n🚀 ${message}\n`));
  }

  info(message) {
    if (this.spinner) this.spinner.stop();
    this.spinner = ora(message).start();
  }

  success(message) {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    } else {
      console.log(chalk.green(`✅ ${message}`));
    }
  }

  error(message, error) {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    } else {
      console.log(chalk.red(`❌ ${message}`));
    }
    if (error && this.verbose) {
      console.error(error);
    }
  }

  warn(message) {
    if (this.spinner) this.spinner.stop();
    console.log(chalk.yellow(`⚠️  ${message}`));
    if (this.spinner) this.spinner.start();
  }

  debug(message) {
    if (this.verbose) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
    }
  }
}

module.exports = Logger;