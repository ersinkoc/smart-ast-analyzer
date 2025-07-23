# 🔍 Smart AST Analyzer

AI-enhanced project analysis tool that provides deep insights into your codebase. Features a powerful built-in analysis engine with optional AI enhancement. Get comprehensive analysis of API endpoints, component relationships, WebSocket events, security vulnerabilities, performance bottlenecks, code complexity, and dependency graphs.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![npm version](https://img.shields.io/badge/npm-v1.0.0-blue.svg)](https://www.npmjs.com/package/smart-ast-analyzer)
[![Release](https://img.shields.io/badge/release-v1.0.0-success.svg)](https://github.com/ersinkoc/smart-ast-analyzer/releases/tag/v1.0.0)

## ✨ Features

### 🔬 Deep Code Analysis
- 🎯 **AST-Based Analysis** - Real Abstract Syntax Tree parsing with Babel
- 📊 **Code Complexity Metrics** - Cyclomatic and cognitive complexity analysis
- 📈 **Dependency Graph Analysis** - Circular dependency detection and visualization
- 🔍 **Function & Class Analysis** - Extract components, functions, hooks automatically

### 🔐 Advanced Security Scanning
- 🛡️ **Vulnerability Detection** - Identifies eval(), SQL injection, XSS risks
- 🔑 **Authentication Analysis** - Reviews auth patterns and security practices
- 🚨 **Hardcoded Secrets Detection** - Finds API keys, passwords in code
- ⚠️ **Security Scoring** - Comprehensive security assessment

### ⚡ Performance Intelligence
- 🎪 **Bottleneck Detection** - Nested loops, DOM queries in loops
- 🏗️ **Architectural Analysis** - Design patterns and anti-patterns
- 💾 **Memory Leak Detection** - Large arrays, inefficient cloning
- 🚀 **Optimization Suggestions** - Actionable performance improvements

### 🔗 Comprehensive Coverage
- 🌐 **API Mapping** - Discover all endpoints with Express, FastAPI, etc.
- 🧩 **Component Analysis** - React, Vue, Angular component relationships
- 🔌 **WebSocket Events** - Real-time communication patterns
- 🗄️ **Database Queries** - ORM models, SQL patterns, N+1 detection
- 📊 **Multiple Outputs** - JSON, Markdown, and interactive HTML reports

## 🚀 Quick Start

### Installation

```bash
# Global installation
npm install -g smart-ast-analyzer

# Or use directly with npx
npx smart-ast-analyzer analyze
```

### Basic Usage

```bash
# Analyze current directory with built-in engine (recommended)
smart-ast analyze

# Analyze specific directory with deep analysis
smart-ast analyze --path ./my-project

# Focus on specific analysis types
smart-ast analyze --type api          # API endpoints and security
smart-ast analyze --type components   # Component architecture
smart-ast analyze --type security     # Security vulnerabilities
smart-ast analyze --type performance  # Performance bottlenecks

# Use AI enhancement (optional - requires CLI setup)
smart-ast analyze --ai gemini
smart-ast analyze --ai claude
```

## 📋 Prerequisites

- **Node.js** >= 14.0.0
- **Dependencies** - All analysis dependencies included (Babel, TypeScript parser, etc.)
- **Optional AI Enhancement**:
  - Gemini CLI (`gemini -y -p "prompt"`)
  - Claude Code CLI (`claude "prompt @file"`)

## 🏗️ Architecture

The Smart AST Analyzer uses a multi-layered analysis approach:

1. **BaseAnalyzer** - Orchestrates all analysis types
2. **ASTAnalyzer** - Real AST parsing with Babel for deep code insights  
3. **DeepAnalysisEngine** - Comprehensive complexity, security, and performance analysis
4. **AIEnhancer** - Optional AI-powered insights and recommendations

> **Core Philosophy**: Analyze deeply with built-in engines first, enhance with AI when needed.

## 🎯 Analysis Types

### 🌐 API Analysis (`--type api`)
**AST-Powered Endpoint Discovery**
- Express.js route detection (`app.get()`, `router.post()`, etc.)
- Middleware chain analysis and authentication patterns
- Security vulnerability scanning (SQL injection, XSS, eval())
- Request/response structure analysis
- Authentication flow mapping

### 🧩 Component Analysis (`--type component`)
**Deep React/Vue/Angular Inspection**
- AST-based component extraction (function, class, arrow functions)
- Props and hooks analysis with TypeScript support
- Component dependency mapping
- Performance anti-pattern detection
- Dead code and unused component identification

### 🔐 Security Analysis (`--type security`)
**Comprehensive Vulnerability Scanning**
- **Critical**: `eval()`, `setTimeout(string)` detection
- **High**: SQL injection patterns in queries
- **Medium**: XSS via `innerHTML` assignments
- **Low**: Unvalidated environment variable usage
- Hardcoded secrets detection (API keys, passwords)

### ⚡ Performance Analysis (`--type performance`)
**Bottleneck Detection & Optimization**
- Nested iteration complexity (O(n²) patterns)
- DOM queries inside loops
- Large array initialization detection
- Inefficient deep cloning (`JSON.parse(JSON.stringify())`)
- Memory leak potential identification

### 📊 Complexity Analysis (Built-in)
**Code Quality Metrics**
- **Cyclomatic Complexity** - Decision points and branching
- **Cognitive Complexity** - Human comprehension difficulty  
- **Nesting Depth** - Code structure complexity
- **Function Length** - Lines of code per function
- **Class Cohesion** - Single responsibility metrics

### 🕸️ Dependency Analysis (Built-in)  
**Import/Export Relationship Mapping**
- Circular dependency detection with path tracing
- Unused import identification
- External vs internal dependency classification
- Dependency graph visualization data
- Module coupling analysis

## 🛠️ Configuration

### Command Line Options

```bash
smart-ast analyze [options]

Options:
  -p, --path <path>         Project path to analyze (default: current directory)
  -a, --ai <type>           AI to use: gemini, claude, or mock (default: mock)
  -t, --type <type>         Analysis type: api|component|websocket|auth|db|perf|full (default: full)
  -o, --output <dir>        Output directory (default: ./smart-ast-output)
  -f, --format <format>     Output format: json|markdown|html|all (default: all)
  --max-files <number>      Maximum files to analyze per category (default: 50)
  --include <patterns>      Include file patterns (comma-separated)
  --exclude <patterns>      Exclude file patterns (comma-separated)
  --no-cache               Disable caching
  --verbose                Verbose output
  --config <file>          Custom config file
```

### Configuration File

Create a `.smart-ast.json` file in your project root:

```json
{
  "ai": "mock",
  "analysis": {
    "type": "full",
    "maxFiles": 100,
    "deepAnalysis": true,
    "complexity": {
      "maxCyclomatic": 10,
      "maxCognitive": 15,
      "maxNesting": 4
    },
    "security": {
      "scanSecrets": true,
      "checkVulnerabilities": true
    },
    "exclude": [
      "node_modules/**",
      ".git/**", 
      "dist/**",
      "build/**",
      "*.min.js"
    ]
  },
  "output": {
    "format": "all", 
    "directory": "./smart-ast-output",
    "includeSourceMaps": false
  }
}
```

## 📊 Output Examples

### JSON Output
```json
{
  "projectInfo": {
    "framework": "react",
    "language": "javascript", 
    "totalFiles": 45,
    "totalLines": 12843
  },
  "deepAnalysis": {
    "complexity": {
      "overall": { "score": 12, "rating": "moderate" },
      "functions": [
        {
          "name": "processData",
          "cyclomatic": 15,
          "cognitive": 23,
          "warnings": ["High cognitive complexity"]
        }
      ]
    },
    "security": {
      "score": 75,
      "vulnerabilities": [
        {
          "type": "dangerous-eval",
          "severity": "critical",
          "file": "src/utils.js",
          "line": 42
        }
      ]
    },
    "dependencies": {
      "cycles": ["src/a.js -> src/b.js -> src/a.js"],
      "external": ["react", "lodash"],
      "internal": ["./utils", "./config"]
    }
  },
  "recommendations": [
    "🔴 Critical: Refactor complex functions",
    "🔴 Security: Fix 3 critical vulnerabilities"
  ]
}
```

### HTML Report
Interactive dashboard featuring:
- 📊 **Executive Summary** - Project overview with key metrics
- 🌐 **API Analysis** - Endpoint table with security status
- 🧩 **Component Architecture** - Component hierarchy and relationships  
- 🔐 **Security Dashboard** - Vulnerability list with severity levels
- ⚡ **Performance Metrics** - Bottlenecks and optimization opportunities
- 📈 **Code Complexity** - Function/class complexity with warnings
- 🕸️ **Dependency Graph** - Import relationships and circular dependencies
- 🎯 **Actionable Recommendations** - Prioritized improvement suggestions

### Markdown Report
Developer-friendly format with:
- Detailed analysis sections for each category
- Code examples and line number references
- Severity-based vulnerability listings
- Performance optimization suggestions
- Complexity metrics tables

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 🤖 Analysis Engine Architecture

### 🏗️ Built-in Analysis Engine (Primary - Recommended)

The Smart AST Analyzer features a sophisticated multi-engine analysis system:

#### 🔬 AST-Based Core Engine
- ✅ **Babel Parser Integration** - Real Abstract Syntax Tree analysis
- ✅ **TypeScript Support** - Full TS/TSX parsing with decorators
- ✅ **Multi-Language** - JavaScript, JSX, TypeScript, Vue, Angular
- ✅ **Deep Inspection** - Function complexity, class cohesion, dependency graphs

#### 🛡️ Security Analysis Engine  
- ✅ **Vulnerability Detection** - AST-based security scanning
- ✅ **Pattern Recognition** - SQL injection, XSS, eval() detection
- ✅ **Secret Scanning** - Hardcoded API keys, passwords
- ✅ **Security Scoring** - Comprehensive risk assessment

#### ⚡ Performance Analysis Engine
- ✅ **Bottleneck Detection** - O(n²) complexity, nested iterations
- ✅ **Anti-Pattern Recognition** - Memory leaks, inefficient cloning
- ✅ **DOM Analysis** - Query optimization suggestions
- ✅ **Bundle Analysis** - Large dependency detection

```bash
# Comprehensive analysis with all engines
smart-ast analyze --type full
```

### 🤖 Optional AI Enhancement

#### Gemini CLI Integration
- **Status**: ✅ Production Ready
- **Usage**: `smart-ast analyze --ai gemini`  
- **Function**: Enhances built-in analysis with AI insights
- **Command**: `gemini -y -p "focused-prompt"`

#### Claude Code Integration
- **Status**: ✅ Functional
- **Usage**: `smart-ast analyze --ai claude`
- **Function**: Provides additional recommendations
- **Command**: `claude "focused-prompt @tempfile"`

> **Philosophy**: Powerful built-in analysis first, AI enhancement second. Most projects get excellent results without external AI.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Ersin KOÇ**
- Email: ersinkoc@gmail.com
- GitHub: [@ersinkoc](https://github.com/ersinkoc)

## 🙏 Acknowledgments

- Thanks to the Gemini and Claude teams for their excellent AI services
- Inspired by various AST analysis tools in the ecosystem
- Built with love for the developer community

## 📚 Documentation

For detailed documentation, examples, and API reference, visit our [GitHub repository](https://github.com/ersinkoc/smart-ast-analyzer).

## 🐛 Bug Reports

Found a bug? Please [open an issue](https://github.com/ersinkoc/smart-ast-analyzer/issues) with a detailed description and reproduction steps.

## 🌟 Support

If you find this tool helpful, please consider:
- ⭐ Starring the repository
- 🐦 Sharing it on social media
- 💬 Providing feedback and suggestions

---

Made with ❤️ by [Ersin KOÇ](https://github.com/ersinkoc)