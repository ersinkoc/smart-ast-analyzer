# Contributing to Smart AST Analyzer

First off, thank you for considering contributing to Smart AST Analyzer! It's people like you that make Smart AST Analyzer such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title** for the issue to identify the problem.
* **Describe the exact steps which reproduce the problem** in as many details as possible.
* **Provide specific examples to demonstrate the steps**.
* **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
* **Explain which behavior you expected to see instead and why.**
* **Include screenshots and animated GIFs** if possible.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title** for the issue to identify the suggestion.
* **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
* **Provide specific examples to demonstrate the steps** or point out the part of Smart AST Analyzer where the suggestion is related to.
* **Describe the current behavior** and **explain which behavior you expected to see instead** and why.

### Pull Requests

* Fill in the required template
* Do not include issue numbers in the PR title
* Follow the JavaScript styleguide
* Include thoughtfully-worded, well-structured tests
* Document new code
* End all files with a newline

## Development Process

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

### Setup Development Environment

```bash
# Clone your fork
git clone https://github.com/your-username/smart-ast-analyzer.git
cd smart-ast-analyzer

# Install dependencies
npm install

# Run tests
npm test

# Run linter
npm run lint
```

### Testing

We use Jest for testing. Please write tests for new code you create.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Style

We use ESLint and Prettier for code formatting. Your code should follow the existing style.

```bash
# Check code style
npm run lint

# Fix code style issues
npm run lint:fix

# Format code
npm run format
```

### Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

### Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the tags on this repository.

## Project Structure

```
smart-ast-analyzer/
├── bin/                 # CLI executables
├── lib/                 # Core library code
│   ├── analyzers/      # Analysis modules
│   ├── core/           # Core functionality
│   ├── generators/     # Report generators
│   ├── reporters/      # Output formatters
│   └── utils/          # Utility functions
├── tests/              # Test files
├── examples/           # Example usage
└── scripts/            # Build and utility scripts
```

## Recognition

Contributors will be recognized in our README.md file and in release notes.

## Questions?

Feel free to contact the project maintainer:
- **Ersin KOÇ** - ersinkoc@gmail.com

Thank you for contributing! 🎉