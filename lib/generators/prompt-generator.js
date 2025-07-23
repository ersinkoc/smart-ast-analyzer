const PromptTemplates = require('./prompt-templates');
const ContextBuilder = require('./context-builder');

class PromptGenerator {
  constructor(projectInfo) {
    this.projectInfo = projectInfo;
    this.templates = PromptTemplates;
    this.contextBuilder = new ContextBuilder(projectInfo);
  }

  generateAPIAnalysisPrompt(files) {
    const framework = this.projectInfo.framework;
    const template = this.templates.getAPITemplate(framework);
    
    return `
You are analyzing a ${framework} project's API structure. Your task is to create a comprehensive map of all API endpoints, their relationships, and usage patterns.

Project Information:
- Framework: ${framework}
- Language: ${this.projectInfo.language}
- Project Type: ${this.projectInfo.type}
- Total Files: ${this.projectInfo.metrics?.totalFiles || 'Unknown'}

Framework-Specific Patterns to Look For:
${template.patterns.map(p => `- ${p}`).join('\n')}

Analyze the provided files and identify:

1. ALL API ENDPOINTS:
   - HTTP method (GET, POST, PUT, DELETE, PATCH)
   - Route/path pattern
   - Handler function name
   - File location and line number

2. REQUEST/RESPONSE STRUCTURE:
   - Request parameters (query, params, body)
   - Request validation rules
   - Response format and types
   - Status codes used

3. AUTHENTICATION & AUTHORIZATION:
   - Auth middleware used
   - Permission requirements
   - Token validation
   - User role checks

4. MIDDLEWARE CHAIN:
   - Pre-processing middleware
   - Validation middleware
   - Error handling middleware
   - Post-processing middleware

5. DATABASE OPERATIONS:
   - Database queries executed
   - Models/collections accessed
   - Transaction usage
   - Query optimization issues

6. EXTERNAL API CALLS:
   - Third-party services called
   - API dependencies
   - Timeout handling
   - Retry logic

7. COMPONENT USAGE:
   - Which frontend components call each endpoint
   - How the data is used in the UI
   - State management integration
   - Error handling in components

8. WEBSOCKET INTEGRATION:
   - Real-time updates triggered
   - Socket events emitted
   - Room/channel usage

9. ISSUES AND IMPROVEMENTS:
   - Missing error handling
   - Unprotected endpoints
   - N+1 query problems
   - Missing rate limiting
   - Inconsistent response formats
   - Deprecated endpoints
   - Orphaned endpoints (not used anywhere)

Output Format (JSON only):
{
  "endpoints": [
    {
      "method": "string",
      "path": "string",
      "file": "string",
      "line": "number",
      "handler": "string",
      "middleware": ["string"],
      "auth": {
        "required": "boolean",
        "type": "string",
        "roles": ["string"]
      },
      "request": {
        "params": {},
        "query": {},
        "body": {},
        "headers": {}
      },
      "response": {
        "success": {},
        "error": {}
      },
      "database": {
        "operations": ["string"],
        "models": ["string"]
      },
      "calledBy": [
        {
          "file": "string",
          "component": "string",
          "line": "number",
          "usage": "string"
        }
      ],
      "externalAPIs": ["string"],
      "websockets": ["string"],
      "issues": ["string"],
      "suggestions": ["string"]
    }
  ],
  "apiGroups": {
    "groupName": {
      "baseUrl": "string",
      "endpoints": ["string"],
      "commonMiddleware": ["string"],
      "purpose": "string"
    }
  },
  "orphanedEndpoints": ["string"],
  "deprecatedEndpoints": ["string"],
  "securityIssues": [
    {
      "endpoint": "string",
      "issue": "string",
      "severity": "critical|high|medium|low",
      "suggestion": "string"
    }
  ],
  "performanceIssues": [
    {
      "endpoint": "string",
      "issue": "string",
      "impact": "string",
      "suggestion": "string"
    }
  ],
  "recommendations": ["string"]
}
    `;
  }

  generateComponentAnalysisPrompt(files) {
    const framework = this.projectInfo.framework;
    const template = this.templates.getComponentTemplate(framework);

    return `
Analyze the component structure and relationships in this ${framework} project.

Project Information:
- Framework: ${framework}
- Language: ${this.projectInfo.language}
- Component Files: ${files.length}

Framework-Specific Patterns:
${template.patterns.map(p => `- ${p}`).join('\n')}

State Management Options:
${template.stateManagement.map(s => `- ${s}`).join('\n')}

Identify for EACH component:

1. COMPONENT METADATA:
   - Name and file location
   - Type (functional/class/page/layout)
   - Props interface/types
   - Export type (default/named)

2. STATE MANAGEMENT:
   - Local state (useState, state)
   - Global state (Redux, Context, Zustand, etc.)
   - Server state (React Query, SWR, etc.)
   - Form state management

3. DEPENDENCIES:
   - Imported components
   - Imported hooks
   - Imported utilities
   - External libraries used

4. DATA FLOW:
   - Props received and their types
   - Events emitted/callbacks
   - Context consumed
   - Global state accessed

5. API INTEGRATION:
   - API calls made (direct or via hooks)
   - Loading states
   - Error handling
   - Data transformation

6. LIFECYCLE & EFFECTS:
   - useEffect dependencies and purposes
   - Component lifecycle methods
   - Cleanup functions
   - Memory leak risks

7. RENDERING:
   - Conditional rendering logic
   - List rendering
   - Dynamic components
   - Portal usage

8. PERFORMANCE:
   - Memoization (memo, useMemo, useCallback)
   - Heavy computations
   - Unnecessary re-renders
   - Bundle size impact

9. PATTERNS & ISSUES:
   - Component composition patterns
   - Prop drilling
   - Over-engineering
   - Under-abstraction
   - Accessibility issues

Output Format (JSON only):
{
  "components": {
    "ComponentName": {
      "file": "string",
      "type": "functional|class|page|layout",
      "lines": "number",
      "props": {
        "propName": {
          "type": "string",
          "required": "boolean",
          "default": "any"
        }
      },
      "state": {
        "local": ["string"],
        "global": ["string"],
        "server": ["string"]
      },
      "dependencies": {
        "components": ["string"],
        "hooks": ["string"],
        "utils": ["string"],
        "external": ["string"]
      },
      "apiCalls": [
        {
          "endpoint": "string",
          "method": "string",
          "trigger": "string",
          "stateUpdate": "string"
        }
      ],
      "events": {
        "emitted": ["string"],
        "handled": ["string"]
      },
      "children": ["string"],
      "parents": ["string"],
      "rendering": {
        "conditional": "boolean",
        "lists": "boolean",
        "portals": "boolean"
      },
      "performance": {
        "memoized": "boolean",
        "heavyOperations": ["string"],
        "rerendersRisk": "high|medium|low"
      },
      "issues": ["string"],
      "suggestions": ["string"]
    }
  },
  "componentTree": {},
  "dataFlow": [
    {
      "from": "string",
      "to": "string",
      "data": "string",
      "type": "prop|context|event|state"
    }
  ],
  "unusedComponents": ["string"],
  "circularDependencies": [["string"]],
  "propDrilling": [
    {
      "prop": "string",
      "path": ["string"],
      "depth": "number"
    }
  ],
  "recommendations": ["string"]
}
    `;
  }

  generateWebSocketAnalysisPrompt(files) {
    return `
Analyze WebSocket implementation and real-time communication patterns in this ${this.projectInfo.framework} project.

Project Information:
- Framework: ${this.projectInfo.framework}
- Language: ${this.projectInfo.language}
- Files to analyze: ${files.length}

Examine:

1. WEBSOCKET SETUP:
   - Library used (Socket.io, native WebSocket, etc.)
   - Connection configuration
   - Authentication mechanism
   - Reconnection strategy
   - Connection lifecycle

2. EVENT MAPPING:
   - All event names (client & server)
   - Event payload structures
   - Event flow direction
   - Event namespaces/rooms

3. CLIENT-SIDE IMPLEMENTATION:
   - Connection management
   - Event listeners
   - Event emitters
   - State updates from events
   - Cleanup/unsubscribe logic

4. SERVER-SIDE IMPLEMENTATION:
   - Event handlers
   - Broadcasting logic
   - Room management
   - User session handling
   - Scaling considerations

5. DATA FLOW:
   - Real-time data updates
   - State synchronization
   - Optimistic updates
   - Conflict resolution

6. ERROR HANDLING:
   - Connection errors
   - Timeout handling
   - Failed event handling
   - Fallback mechanisms

7. SECURITY:
   - Authentication checks
   - Authorization for events
   - Input validation
   - Rate limiting

8. PERFORMANCE:
   - Event frequency
   - Payload sizes
   - Memory leaks
   - Connection pooling

Output Format (JSON only):
{
  "websocket": {
    "library": "string",
    "version": "string",
    "transport": ["string"],
    "config": {}
  },
  "connections": [
    {
      "name": "string",
      "url": "string",
      "namespace": "string",
      "auth": {},
      "options": {}
    }
  ],
  "events": {
    "client": {
      "eventName": {
        "file": "string",
        "line": "number",
        "payload": {},
        "handlers": ["string"],
        "emittedFrom": ["string"]
      }
    },
    "server": {
      "eventName": {
        "file": "string",
        "payload": {},
        "broadcast": "boolean",
        "rooms": ["string"]
      }
    }
  },
  "eventFlow": [
    {
      "trigger": "string",
      "event": "string",
      "from": "client|server",
      "to": "client|server",
      "payload": {},
      "stateUpdates": ["string"]
    }
  ],
  "rooms": {
    "roomName": {
      "purpose": "string",
      "joinLogic": "string",
      "events": ["string"]
    }
  },
  "issues": {
    "security": ["string"],
    "performance": ["string"],
    "reliability": ["string"],
    "memoryLeaks": ["string"]
  },
  "recommendations": ["string"]
}
    `;
  }

  generateAuthAnalysisPrompt(files) {
    return `
Analyze authentication and authorization implementation in this ${this.projectInfo.framework} project.

Project Files: ${files.length}

Examine:

1. AUTHENTICATION METHODS:
   - Login/logout mechanisms
   - Password validation
   - Multi-factor authentication
   - OAuth/SSO integration
   - Session management
   - Token handling (JWT, etc.)

2. AUTHORIZATION PATTERNS:
   - Role-based access control (RBAC)
   - Permission systems
   - Protected routes/endpoints
   - Middleware for auth checks
   - Resource-level permissions

3. SECURITY MEASURES:
   - Password hashing
   - Token encryption
   - CSRF protection
   - Rate limiting
   - Input sanitization
   - Secure cookie handling

4. USER MANAGEMENT:
   - User registration
   - Profile management
   - Password reset flows
   - Account verification
   - User roles/groups

5. SESSION HANDLING:
   - Session storage
   - Session expiration
   - Logout mechanisms
   - Cross-device sessions
   - Remember me functionality

6. API SECURITY:
   - Endpoint protection
   - API key management
   - Request validation
   - Response filtering
   - Audit logging

Output Format (JSON only):
{
  "authentication": {
    "methods": ["password", "oauth", "jwt", "session"],
    "providers": ["google", "facebook", "github"],
    "flows": {
      "login": {
        "file": "string",
        "steps": ["string"]
      },
      "logout": {
        "file": "string",
        "cleanup": ["string"]
      }
    }
  },
  "authorization": {
    "type": "rbac|acl|custom",
    "roles": ["admin", "user", "guest"],
    "permissions": ["read", "write", "delete"],
    "middleware": [
      {
        "name": "string",
        "file": "string",
        "protects": ["string"]
      }
    ]
  },
  "security": {
    "passwordHashing": "bcrypt|argon2|scrypt",
    "tokenType": "jwt|session|custom",
    "csrfProtection": "boolean",
    "rateLimiting": "boolean",
    "vulnerabilities": [
      {
        "type": "string",
        "severity": "critical|high|medium|low",
        "location": "string",
        "description": "string"
      }
    ]
  },
  "protectedRoutes": [
    {
      "path": "string",
      "method": "string",
      "requiredRole": "string",
      "file": "string"
    }
  ],
  "issues": ["string"],
  "recommendations": ["string"]
}
    `;
  }

  generateDatabaseAnalysisPrompt(files) {
    return `
Analyze database operations, queries, and data access patterns in this ${this.projectInfo.framework} project.

Project Files: ${files.length}

Focus on:

1. DATABASE CONNECTIONS:
   - Connection configuration
   - Connection pooling
   - Multiple database support
   - Environment-based configs

2. MODELS/SCHEMAS:
   - Entity definitions
   - Relationships (1:1, 1:many, many:many)
   - Indexes and constraints
   - Validation rules

3. QUERY PATTERNS:
   - CRUD operations
   - Complex queries
   - Joins and aggregations
   - Raw SQL usage
   - Query builders (Knex, QueryBuilder)

4. PERFORMANCE:
   - N+1 query problems
   - Missing indexes
   - Slow queries
   - Query optimization
   - Caching strategies

5. TRANSACTIONS:
   - Transaction usage
   - Rollback mechanisms
   - Distributed transactions
   - Deadlock handling

6. MIGRATIONS:
   - Schema changes
   - Data migrations
   - Version control
   - Rollback strategies

7. DATA VALIDATION:
   - Input validation
   - Business rules
   - Constraint violations
   - Error handling

Output Format (JSON only):
{
  "database": {
    "type": "postgresql|mysql|mongodb|sqlite",
    "orm": "prisma|sequelize|typeorm|mongoose",
    "connections": [
      {
        "name": "string",
        "config": {},
        "pooling": "boolean"
      }
    ]
  },
  "models": [
    {
      "name": "string",
      "file": "string",
      "table": "string",
      "fields": [
        {
          "name": "string",
          "type": "string",
          "required": "boolean",
          "unique": "boolean",
          "indexed": "boolean"
        }
      ],
      "relationships": [
        {
          "type": "hasOne|hasMany|belongsTo|belongsToMany",
          "model": "string",
          "foreignKey": "string"
        }
      ]
    }
  ],
  "queries": [
    {
      "type": "select|insert|update|delete",
      "file": "string",
      "line": "number",
      "complexity": "simple|moderate|complex",
      "performance": "good|concerning|poor",
      "issues": ["string"]
    }
  ],
  "performance": {
    "nPlusOneQueries": [
      {
        "file": "string",
        "description": "string",
        "suggestion": "string"
      }
    ],
    "missingIndexes": ["string"],
    "slowQueries": ["string"]
  },
  "migrations": [
    {
      "file": "string",
      "type": "schema|data",
      "description": "string"
    }
  ],
  "issues": ["string"],
  "recommendations": ["string"]
}
    `;
  }

  generatePerformanceAnalysisPrompt(files) {
    return `
Analyze performance bottlenecks and optimization opportunities in this ${this.projectInfo.framework} project.

Project Files: ${files.length}
Framework: ${this.projectInfo.framework}

Identify:

1. BUNDLE SIZE ISSUES:
   - Large dependencies
   - Unused code
   - Code splitting opportunities
   - Tree shaking effectiveness

2. RENDER PERFORMANCE:
   - Unnecessary re-renders
   - Heavy components
   - Inefficient algorithms
   - Missing memoization

3. API OPTIMIZATION:
   - Slow endpoints
   - Over-fetching data
   - N+1 queries
   - Missing caching

4. MEMORY MANAGEMENT:
   - Memory leaks
   - Unused variables
   - Event listener cleanup
   - Large object retention

5. LOADING PERFORMANCE:
   - Image optimization
   - Lazy loading opportunities
   - Critical rendering path
   - Resource prioritization

6. CODE QUALITY:
   - Complex functions
   - Nested loops
   - Synchronous operations
   - Blocking code

Output Format (JSON only):
{
  "bundle": {
    "estimatedSize": "string",
    "largeDependencies": [
      {
        "name": "string",
        "size": "string",
        "necessary": "boolean"
      }
    ],
    "codeSplitting": [
      {
        "opportunity": "string",
        "file": "string",
        "impact": "high|medium|low"
      }
    ]
  },
  "rendering": {
    "heavyComponents": [
      {
        "name": "string",
        "file": "string",
        "issues": ["string"],
        "suggestions": ["string"]
      }
    ],
    "unnecessaryRenders": [
      {
        "component": "string",
        "cause": "string",
        "solution": "string"
      }
    ]
  },
  "api": {
    "slowEndpoints": [
      {
        "endpoint": "string",
        "issue": "string",
        "suggestion": "string"
      }
    ],
    "overfetching": [
      {
        "endpoint": "string",
        "unused": ["string"],
        "suggestion": "string"
      }
    ]
  },
  "memory": {
    "potentialLeaks": [
      {
        "file": "string",
        "type": "event|timeout|closure",
        "description": "string"
      }
    ]
  },
  "optimization": {
    "immediate": ["string"],
    "shortTerm": ["string"],
    "longTerm": ["string"]
  },
  "metrics": {
    "complexity": "low|medium|high",
    "maintainability": "good|fair|poor",
    "performance": "excellent|good|needs-improvement"
  },
  "recommendations": ["string"]
}
    `;
  }
}

module.exports = PromptGenerator;