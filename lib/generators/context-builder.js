class ContextBuilder {
  constructor(projectInfo) {
    this.projectInfo = projectInfo;
  }

  buildContext(analysisType, files) {
    const context = {
      project: this.getProjectContext(),
      framework: this.getFrameworkContext(),
      files: this.prepareFilesContext(files),
      analysis: this.getAnalysisContext(analysisType)
    };

    return context;
  }

  getProjectContext() {
    return {
      path: this.projectInfo.path,
      type: this.projectInfo.type,
      language: this.projectInfo.language,
      framework: this.projectInfo.framework,
      totalFiles: this.projectInfo.metrics.totalFiles,
      dependencies: this.projectInfo.dependencies.total
    };
  }

  getFrameworkContext() {
    const frameworkInfo = {
      nextjs: {
        routing: 'File-based routing in pages/ or app/',
        apiRoutes: 'API routes in pages/api/ or app/api/',
        specialFiles: ['_app.js', '_document.js', 'middleware.js']
      },
      react: {
        components: 'Functional and class components',
        hooks: 'useState, useEffect, custom hooks',
        stateManagement: 'Context API, Redux, or third-party'
      },
      express: {
        routing: 'Router middleware and route handlers',
        middleware: 'Application and route-specific middleware',
        structure: 'MVC or service-oriented architecture'
      },
      vue: {
        components: 'Single File Components (.vue)',
        reactivity: 'Composition API or Options API',
        routing: 'Vue Router for navigation'
      }
    };

    return frameworkInfo[this.projectInfo.framework] || {};
  }

  prepareFilesContext(files) {
    return files.map(file => ({
      path: file.relativePath || file.path,
      size: file.size,
      lines: file.lines,
      extension: file.extension,
      preview: this.getFilePreview(file.content)
    }));
  }

  getFilePreview(content) {
    // Return first 5 lines for context
    const lines = content.split('\n').slice(0, 5);
    return lines.join('\n');
  }

  getAnalysisContext(analysisType) {
    const contexts = {
      api: {
        focus: 'REST endpoints, GraphQL schemas, RPC methods',
        concerns: 'Authentication, validation, error handling, performance',
        patterns: 'Route definitions, middleware chains, response formats'
      },
      components: {
        focus: 'Component composition, data flow, state management',
        concerns: 'Props, events, lifecycle, performance, accessibility',
        patterns: 'Component trees, data passing, event handling'
      },
      websocket: {
        focus: 'Real-time communication, event handling, room management',
        concerns: 'Connection management, event flow, error handling',
        patterns: 'Event emitters, listeners, room joins/leaves'
      },
      auth: {
        focus: 'Authentication flows, authorization checks, security',
        concerns: 'Token management, session handling, permissions',
        patterns: 'Login/logout, protected routes, role checks'
      },
      database: {
        focus: 'Database queries, model relationships, transactions',
        concerns: 'Query optimization, data integrity, migrations',
        patterns: 'CRUD operations, joins, indexing'
      },
      performance: {
        focus: 'Bottlenecks, optimization opportunities, monitoring',
        concerns: 'Bundle size, render performance, memory usage',
        patterns: 'Code splitting, lazy loading, memoization'
      }
    };

    return contexts[analysisType] || {};
  }
}

module.exports = ContextBuilder;