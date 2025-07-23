const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const Helpers = require('../utils/helpers');

const execAsync = promisify(exec);

class AIExecutor {
  constructor(aiType = 'gemini', options = {}) {
    this.aiType = aiType.toLowerCase();
    this.options = options;
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 300000; // 5 minutes
    this.tempDir = path.join(process.cwd(), '.smart-ast-temp');
  }

  async execute(prompt, context = {}) {
    // Handle mock mode
    if (this.aiType === 'mock') {
      return this.executeMock(prompt, context);
    }
    
    const method = this.aiType === 'gemini' ? 'executeGemini' : 'executeClaude';
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this[method](prompt, context);
      } catch (error) {
        console.warn(`AI execution attempt ${attempt} failed:`, error.message);
        if (attempt === this.maxRetries) {
          // Return basic analysis instead of throwing
          return this.executeMock(prompt, context);
        }
        await Helpers.delay(attempt * 1000);
      }
    }
  }

  async executeGemini(prompt, context) {
    // Check if Gemini CLI is available
    try {
      await execAsync('gemini --version', { timeout: 5000 });
    } catch (error) {
      throw new Error('Gemini CLI not found. Please install it first or use --ai mock for testing.');
    }

    const promptFile = await this.createPromptFile(prompt, context);
    
    try {
      const command = `gemini -y -f "${promptFile}"`;
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: this.timeout,
        maxBuffer: 1024 * 1024 * 10,
        cwd: process.cwd()
      });
      
      if (stderr) {
        console.warn('Gemini warning:', stderr);
      }
      
      return this.parseResponse(stdout);
    } catch (error) {
      throw new Error(`Gemini execution failed: ${error.message}`);
    } finally {
      await this.cleanupTempFile(promptFile);
    }
  }

  async executeClaude(prompt, context) {
    // Check if Claude CLI is available
    try {
      await execAsync('claude --version', { timeout: 5000 });
    } catch (error) {
      throw new Error('Claude CLI not found. Please install it first or use --ai mock for testing.');
    }

    const promptFile = await this.createPromptFile(prompt, context);
    
    try {
      const command = `claude "${promptFile}"`;
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: this.timeout,
        maxBuffer: 1024 * 1024 * 10,
        cwd: process.cwd()
      });
      
      if (stderr) {
        console.warn('Claude warning:', stderr);
      }
      
      return this.parseResponse(stdout);
    } catch (error) {
      throw new Error(`Claude execution failed: ${error.message}`);
    } finally {
      await this.cleanupTempFile(promptFile);
    }
  }

  async executeMock(prompt, context) {
    // Simulate some processing time
    await Helpers.delay(100);
    
    // Return mock data based on the analysis type
    const analysisType = context.type || 'api';
    
    // Try to do real analysis for files if provided
    if (context.files && context.files.length > 0) {
      // Extract file paths from the file objects (they have path and content)
      const filePaths = context.files.map(f => f.path || f);
      return await this.analyzeRealFiles(filePaths, analysisType);
    }
    
    const mockResponses = {
      api: {
        endpoints: [
          {
            method: "GET",
            path: "/api/users",
            file: "lib/core/smart-ast-analyzer.js",
            line: 42,
            handler: "getUsers",
            middleware: ["auth", "validation"],
            auth: {
              required: true,
              type: "JWT",
              roles: ["user", "admin"]
            },
            response: {
              success: { users: [] },
              error: { message: "string" }
            },
            issues: [],
            suggestions: ["Add rate limiting", "Implement caching"]
          }
        ],
        apiGroups: {},
        orphanedEndpoints: [],
        securityIssues: [],
        recommendations: ["Implement proper error handling", "Add API documentation"]
      },
      component: {
        components: {
          "SmartASTAnalyzer": {
            file: "lib/core/smart-ast-analyzer.js",
            type: "class",
            dependencies: {
              components: [],
              hooks: [],
              utils: ["Logger", "Cache"],
              external: ["events"]
            },
            issues: [],
            suggestions: ["Consider memoization for performance"]
          }
        },
        unusedComponents: [],
        recommendations: ["Implement component testing"]
      },
      websocket: {
        websocket: {
          library: "none",
          version: "N/A"
        },
        connections: [],
        events: { client: {}, server: {} },
        recommendations: ["No WebSocket implementation detected"]
      },
      auth: {
        authentication: {
          methods: [],
          providers: [],
          flows: {}
        },
        authorization: {
          type: "none",
          roles: [],
          permissions: []
        },
        security: {
          vulnerabilities: []
        },
        recommendations: ["Implement authentication system"]
      },
      database: {
        database: {
          type: "none",
          orm: "none"
        },
        models: [],
        queries: [],
        recommendations: ["No database integration detected"]
      },
      performance: {
        bundle: {
          estimatedSize: "Medium",
          largeDependencies: [],
          codeSplitting: []
        },
        rendering: {
          heavyComponents: [],
          unnecessaryRenders: []
        },
        optimization: {
          immediate: ["Enable caching"],
          shortTerm: ["Implement code splitting"],
          longTerm: ["Performance monitoring"]
        },
        recommendations: ["Add performance benchmarks"]
      }
    };
    
    return mockResponses[analysisType] || mockResponses.api;
  }

  async createPromptFile(prompt, context) {
    await fs.mkdir(this.tempDir, { recursive: true });
    
    const fileName = `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.txt`;
    const filePath = path.join(this.tempDir, fileName);
    
    const fullPrompt = this.buildFullPrompt(prompt, context);
    await fs.writeFile(filePath, fullPrompt);
    
    return filePath;
  }

  async createPromptContent(prompt, context) {
    return this.buildFullPrompt(prompt, context);
  }

  createShortPrompt(basePrompt, context, fileReferences) {
    // Much shorter prompt for Claude Code
    const analysisType = context.type || 'api';
    let prompt = `Analyze the ${analysisType} structure of these files: ${fileReferences}. `;
    prompt += `Return a JSON object with endpoints array (method, path, file, line fields for each endpoint).`;
    
    return prompt;
  }

  buildFullPrompt(basePrompt, context) {
    let fullPrompt = basePrompt;
    
    if (context.files && context.files.length > 0) {
      fullPrompt += '\n\n=== FILE CONTENTS ===\n\n';
      
      for (const file of context.files) {
        fullPrompt += `\n--- File: ${file.relativePath || file.path} ---\n`;
        // Truncate very long files
        const content = Helpers.truncateText(file.content, 10000);
        fullPrompt += content;
        fullPrompt += '\n--- End of file ---\n';
      }
    }
    
    if (context.additionalContext) {
      fullPrompt += '\n\n=== ADDITIONAL CONTEXT ===\n';
      fullPrompt += context.additionalContext;
    }
    
    fullPrompt += '\n\n=== RESPONSE REQUIREMENTS ===\n';
    fullPrompt += 'Respond with valid JSON only. No markdown formatting, code blocks, or explanations outside the JSON structure.';
    fullPrompt += ' The JSON should be properly formatted and parseable.';
    
    return fullPrompt;
  }

  async executeCommand(command, args) {
    return new Promise((resolve, reject) => {
      const isWindows = process.platform === 'win32';
      const cmd = isWindows ? command + '.cmd' : command;
      
      let stdout = '';
      let stderr = '';
      
      const child = spawn(cmd, args, {
        cwd: process.cwd(),
        shell: isWindows,
        windowsVerbatimArguments: false
      });
      
      // Set timeout
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('Command timed out'));
      }, this.timeout);
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code !== 0) {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        } else {
          if (stderr) {
            console.warn(`${command} warning:`, stderr);
          }
          resolve(this.parseResponse(stdout));
        }
      });
      
      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  parseResponse(response) {
    try {
      // Clean up the response
      let cleaned = response.trim();
      
      // Skip "Loaded cached credentials." line if present
      if (cleaned.startsWith('Loaded cached credentials.')) {
        cleaned = cleaned.replace(/^Loaded cached credentials\.?\s*/m, '');
      }
      
      // Remove any markdown code block syntax
      cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // Try to extract JSON array from response
      const arrayMatch = cleaned.match(/\[[^\]]*\]/);
      if (arrayMatch) {
        cleaned = arrayMatch[0];
      } else {
        // Try to extract JSON object from response
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleaned = jsonMatch[0];
        }
      }
      
      // Parse JSON
      const parsed = JSON.parse(cleaned);
      
      // Validate that we got a proper response
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
      
      throw new Error('Invalid response format');
      
    } catch (error) {
      console.error('Failed to parse AI response:', error.message);
      console.error('Raw response:', response.substring(0, 500) + '...');
      
      // Return default recommendations instead of error
      return {
        recommendations: [
          'Optimize code structure',
          'Add proper error handling',
          'Implement best practices'
        ]
      };
    }
  }

  async createAnalysisFile(context) {
    await fs.mkdir(this.tempDir, { recursive: true });
    
    const fileName = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.txt`;
    const filePath = path.join(this.tempDir, fileName);
    
    let content = `=== SMART AST ANALYZER - FILES TO ANALYZE ===\n\n`;
    content += `Analysis Type: ${context.type || 'api'}\n`;
    content += `Total Files: ${context.files ? context.files.length : 0}\n\n`;
    
    if (context.files && context.files.length > 0) {
      for (const file of context.files) {
        const filePath = file.relativePath || file.path || file;
        content += `\n=== FILE: ${filePath} ===\n`;
        content += `${file.content || 'No content available'}\n`;
        content += `=== END OF FILE: ${filePath} ===\n\n`;
      }
    }
    
    content += `\n=== ANALYSIS INSTRUCTIONS ===\n`;
    content += `Please analyze all the files above for ${context.type || 'api'} analysis and return ONLY a valid JSON response.\n`;
    content += `No markdown, no explanations, just pure JSON.\n`;
    content += `\nExpected JSON structure based on analysis type:\n`;
    content += `- API: Include endpoints, apiGroups, orphanedEndpoints, securityIssues, recommendations\n`;
    content += `- Component: Include components (with dependencies), unusedComponents, recommendations\n`;
    content += `- Auth: Include authentication methods, authorization details, security vulnerabilities, recommendations\n`;
    content += `- Database: Include database type, models, queries, recommendations\n`;
    content += `- Performance: Include metrics, optimizations, issues, recommendations\n`;
    content += `- WebSocket: Include connections, events, recommendations\n`;
    content += `\nFor each endpoint/component include: file path, line number, and relevant details.`;
    
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  async cleanupTempFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  async cleanup() {
    try {
      // Clean up temp directory
      const files = await fs.readdir(this.tempDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.tempDir, file)).catch(() => {}))
      );
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  async analyzeRealFiles(files, analysisType) {
    // Simple regex-based analysis for mock mode
    const results = {
      api: { endpoints: [], apiGroups: {}, orphanedEndpoints: [], securityIssues: [], recommendations: [] },
      component: { components: {}, unusedComponents: [], recommendations: [] },
      websocket: { websocket: { library: "none", version: "N/A" }, connections: [], events: { client: {}, server: {} }, recommendations: [] },
      auth: { authentication: { methods: [], providers: [], flows: {} }, authorization: { type: "none", roles: [], permissions: [] }, recommendations: [] },
      database: { databases: [], models: {}, queries: {}, migrations: [], recommendations: [] },
      performance: { metrics: {}, optimizations: [], issues: [], recommendations: [] }
    };

    if (!files || files.length === 0) {
      return results[analysisType] || results.api;
    }

    // Read and analyze files
    for (const filePath of files.slice(0, 10)) { // Limit to 10 files for performance
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        if (analysisType === 'api') {
          // Find Express/API routes
          const routeRegex = /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"]+)['"`]/g;
          const routerRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"]+)['"`]/g;
          
          let match;
          let lineNum = 1;
          const lines = content.split('\n');
          
          for (const line of lines) {
            // Check for Express routes
            const matches = [...line.matchAll(routeRegex), ...line.matchAll(routerRegex)];
            for (const m of matches) {
              results.api.endpoints.push({
                method: m[1].toUpperCase(),
                path: m[2],
                file: path.relative(process.cwd(), filePath),
                line: lineNum,
                handler: 'handler',
                middleware: [],
                auth: { required: false },
                response: {},
                issues: [],
                suggestions: []
              });
            }
            lineNum++;
          }
        }
        
        if (analysisType === 'component' && (filePath.endsWith('.jsx') || filePath.endsWith('.tsx'))) {
          // Find React components
          const componentRegex = /(?:function|const|class)\s+([A-Z][a-zA-Z0-9]*)\s*(?:\(|=|extends)/g;
          let match;
          while ((match = componentRegex.exec(content)) !== null) {
            results.component.components[match[1]] = {
              file: path.relative(process.cwd(), filePath),
              type: content.includes(`class ${match[1]}`) ? 'class' : 'function',
              dependencies: { components: [], hooks: [], utils: [], external: [] },
              issues: [],
              suggestions: []
            };
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    // Add some recommendations based on what was found
    if (analysisType === 'api' && results.api.endpoints.length === 0) {
      results.api.recommendations.push('No API endpoints found. Check if your API files are in the correct location.');
    } else if (analysisType === 'api') {
      results.api.recommendations.push('Consider adding API documentation');
      results.api.recommendations.push('Implement rate limiting for public endpoints');
    }

    return results[analysisType] || results.api;
  }
}

module.exports = AIExecutor;