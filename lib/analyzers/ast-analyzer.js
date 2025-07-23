const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const fs = require('fs').promises;
const path = require('path');

class ASTAnalyzer {
  constructor(options = {}) {
    this.options = options;
  }

  async analyzeFile(content, filePath) {
    const ext = path.extname(filePath);
    const isTypeScript = ['.ts', '.tsx'].includes(ext);
    const isJSX = ['.jsx', '.tsx'].includes(ext);

    try {
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript', 
          'decorators-legacy',
          'classProperties',
          'classPrivateProperties',
          'classPrivateMethods',
          'dynamicImport',
          'exportDefaultFrom',
          'exportNamespaceFrom',
          'asyncGenerators',
          'functionBind',
          'functionSent',
          'objectRestSpread',
          'optionalCatchBinding',
          'optionalChaining',
          'nullishCoalescingOperator'
        ]
      });

      const analysis = {
        imports: [],
        exports: [],
        functions: [],
        classes: [],
        components: [],
        hooks: [],
        apiEndpoints: [],
        variables: [],
        types: [],
        interfaces: []
      };

      const self = this; // Preserve this context
      
      traverse(ast, {
        // Import declarations
        ImportDeclaration(path) {
          const source = path.node.source.value;
          const specifiers = path.node.specifiers.map(spec => ({
            type: spec.type,
            local: spec.local.name,
            imported: spec.imported?.name || spec.local.name
          }));
          
          analysis.imports.push({
            source,
            specifiers,
            line: path.node.loc?.start.line
          });
        },

        // Hook calls (useState, useEffect, etc.) and API route detection
        CallExpression(path) {
          const callee = path.node.callee;
          
          // Handle React hooks
          if (t.isIdentifier(callee) && callee.name.startsWith('use')) {
            // Check if it's a valid hook name (useXxx where X is uppercase)
            if (callee.name.length > 3 && /^use[A-Z]/.test(callee.name)) {
              const hookInfo = {
                name: callee.name,
                line: path.node.loc?.start.line,
                args: path.node.arguments.length
              };
              
              // Avoid duplicates
              if (!analysis.hooks.some(h => h.name === hookInfo.name && h.line === hookInfo.line)) {
                analysis.hooks.push(hookInfo);
              }
            }
          }
          
          // Handle Express-style API routes
          if (t.isMemberExpression(callee)) {
            const object = callee.object;
            const method = callee.property.name;
            
            if ((object.name === 'app' || object.name === 'router') && 
                ['get', 'post', 'put', 'delete', 'patch', 'all'].includes(method)) {
              const routePath = path.node.arguments[0];
              if (t.isStringLiteral(routePath)) {
                analysis.apiEndpoints.push({
                  method: method.toUpperCase(),
                  path: routePath.value,
                  line: path.node.loc?.start.line,
                  framework: 'express'
                });
              }
            }
          }
        },

        // Export declarations
        ExportNamedDeclaration(path) {
          if (path.node.declaration) {
            analysis.exports.push({
              type: 'named',
              declaration: path.node.declaration.type,
              line: path.node.loc?.start.line
            });
          }
        },

        ExportDefaultDeclaration(path) {
          analysis.exports.push({
            type: 'default',
            declaration: path.node.declaration.type,
            line: path.node.loc?.start.line
          });
        },

        // Function declarations
        FunctionDeclaration(path) {
          const name = path.node.id?.name;
          if (name) {
            const info = {
              name,
              async: path.node.async,
              generator: path.node.generator,
              params: path.node.params.map(p => self.getParamName(p)),
              line: path.node.loc?.start.line
            };

            // Check if it's a React component
            if (self.isReactComponent(name, path)) {
              analysis.components.push({
                ...info,
                type: 'function',
                props: self.extractProps(path.node.params),
                hooks: self.extractHooks(path)
              });
            } else {
              analysis.functions.push({
                ...info,
                type: 'function'
              });
            }
          }
        },

        // Arrow functions assigned to variables
        VariableDeclarator(path) {
          if (t.isArrowFunctionExpression(path.node.init) || t.isFunctionExpression(path.node.init)) {
            const name = path.node.id.name;
            const func = path.node.init;
            
            const info = {
              name,
              async: func.async,
              params: func.params.map(p => self.getParamName(p)),
              line: path.node.loc?.start.line
            };

            // Check if it's a React component
            if (self.isReactComponent(name, path)) {
              analysis.components.push({
                ...info,
                type: 'arrow',
                props: self.extractProps(func.params),
                hooks: self.extractHooks(path)
              });
            } else if (name.startsWith('use') && name[3] === name[3]?.toUpperCase()) {
              analysis.hooks.push(info);
            } else {
              analysis.functions.push({
                ...info,
                type: 'arrow'
              });
            }
          }
        },

        // Class declarations
        ClassDeclaration(path) {
          const name = path.node.id?.name;
          if (name) {
            const methods = [];
            const properties = [];

            path.traverse({
              ClassMethod(methodPath) {
                methods.push({
                  name: methodPath.node.key.name,
                  kind: methodPath.node.kind,
                  static: methodPath.node.static,
                  async: methodPath.node.async,
                  line: methodPath.node.loc?.start.line
                });
              },
              ClassProperty(propPath) {
                properties.push({
                  name: propPath.node.key.name,
                  static: propPath.node.static,
                  line: propPath.node.loc?.start.line
                });
              }
            });

            const classInfo = {
              name,
              methods,
              properties,
              extends: path.node.superClass?.name,
              line: path.node.loc?.start.line
            };

            // Check if it's a React component
            if (path.node.superClass && 
                (path.node.superClass.name === 'Component' || 
                 path.node.superClass.name === 'PureComponent' ||
                 (t.isMemberExpression(path.node.superClass) && 
                  path.node.superClass.object.name === 'React'))) {
              analysis.components.push({
                ...classInfo,
                type: 'class'
              });
            } else {
              analysis.classes.push(classInfo);
            }
          }
        },

        // TypeScript type aliases
        TSTypeAliasDeclaration(path) {
          if (isTypeScript) {
            analysis.types.push({
              name: path.node.id.name,
              line: path.node.loc?.start.line
            });
          }
        },

        // TypeScript interfaces
        TSInterfaceDeclaration(path) {
          if (isTypeScript) {
            analysis.interfaces.push({
              name: path.node.id.name,
              extends: path.node.extends?.map(e => e.expression.name),
              line: path.node.loc?.start.line
            });
          }
        },

      });

      // For Next.js API routes, check if file exports specific HTTP methods
      if (filePath.includes('/api/') || filePath.includes('\\api\\')) {
        const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
        const exportedMethods = analysis.exports
          .filter(exp => httpMethods.includes(exp.name))
          .map(exp => exp.name);
        
        if (exportedMethods.length > 0) {
          const apiPath = self.getNextJSApiPath(filePath);
          exportedMethods.forEach(method => {
            analysis.apiEndpoints.push({
              method,
              path: apiPath,
              line: 1,
              framework: 'nextjs-app-router'
            });
          });
        }
      }

      return analysis;
    } catch (error) {
      console.error(`AST parsing failed for ${filePath}:`, error.message);
      // Fall back to basic analysis
      return this.basicAnalysis(content, filePath);
    }
  }

  getParamName(param) {
    if (t.isIdentifier(param)) {
      return param.name;
    } else if (t.isObjectPattern(param)) {
      return '{...}';
    } else if (t.isArrayPattern(param)) {
      return '[...]';
    } else if (t.isRestElement(param)) {
      return `...${param.argument.name}`;
    }
    return 'unknown';
  }

  isReactComponent(name, path) {
    // Component name should start with uppercase
    if (name[0] !== name[0].toUpperCase()) {
      return false;
    }

    // Check if it returns JSX or React.createElement
    let hasJSX = false;
    let hasReactCreate = false;
    
    path.traverse({
      JSXElement() {
        hasJSX = true;
      },
      JSXFragment() {
        hasJSX = true;
      },
      CallExpression(callPath) {
        const callee = callPath.node.callee;
        if (t.isMemberExpression(callee) && 
            t.isIdentifier(callee.object) && callee.object.name === 'React' &&
            t.isIdentifier(callee.property) && callee.property.name === 'createElement') {
          hasReactCreate = true;
        }
      }
    });

    return hasJSX || hasReactCreate;
  }

  extractHooks(path) {
    const hooks = [];
    path.traverse({
      CallExpression(callPath) {
        const callee = callPath.node.callee;
        if (t.isIdentifier(callee) && callee.name.startsWith('use')) {
          if (!hooks.includes(callee.name)) {
            hooks.push(callee.name);
          }
        }
      }
    });
    return hooks;
  }

  extractProps(params) {
    const props = [];
    if (params && params.length > 0) {
      const firstParam = params[0];
      if (t.isObjectPattern(firstParam)) {
        firstParam.properties.forEach(prop => {
          if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
            props.push(prop.key.name);
          }
        });
      } else if (t.isIdentifier(firstParam)) {
        props.push(firstParam.name);
      }
    }
    return props;
  }

  getNextJSApiPath(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    const apiIndex = parts.findIndex(p => p === 'api');
    
    if (apiIndex !== -1) {
      const pathParts = parts.slice(apiIndex + 1);
      const cleanPath = pathParts
        .map(p => p.replace(/\.(js|ts|jsx|tsx)$/, ''))
        .map(p => p === 'index' ? '' : p)
        .filter(Boolean)
        .map(p => p.replace(/\[([^\]]+)\]/, ':$1'));
      
      return '/api/' + (cleanPath.length > 0 ? cleanPath.join('/') : '');
    }
    
    return '/api/unknown';
  }

  basicAnalysis(content, filePath) {
    // Fallback to regex-based analysis if AST parsing fails
    const analysis = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      components: [],
      hooks: [],
      apiEndpoints: [],
      variables: [],
      types: [],
      interfaces: []
    };

    // Basic regex patterns
    const importRegex = /import\s+(?:{[^}]+}|[\w\s,]+)\s+from\s+['"]([^'"]+)['"]/g;
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
    const classRegex = /(?:export\s+)?class\s+(\w+)/g;
    const componentRegex = /(?:export\s+)?(?:const|function)\s+([A-Z]\w+)/g;

    let match;
    while ((match = importRegex.exec(content))) {
      analysis.imports.push({ source: match[1] });
    }

    while ((match = functionRegex.exec(content))) {
      analysis.functions.push({ name: match[1] });
    }

    while ((match = classRegex.exec(content))) {
      analysis.classes.push({ name: match[1] });
    }

    while ((match = componentRegex.exec(content))) {
      if (content.includes('return') && content.includes('<')) {
        analysis.components.push({ name: match[1], type: 'function' });
      }
    }

    return analysis;
  }
}

module.exports = ASTAnalyzer;