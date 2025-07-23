class PromptTemplates {
  static getAPITemplate(framework) {
    const frameworkSpecific = {
      nextjs: {
        patterns: ['API routes in pages/api/', 'Route handlers in app/api/', 'Server actions'],
        examples: 'pages/api/users.js, app/api/auth/route.ts'
      },
      express: {
        patterns: ['Router middleware', 'Route handlers', 'Controller methods'],
        examples: 'app.get("/users", handler), router.use("/api", middleware)'
      },
      django: {
        patterns: ['Django views', 'URL patterns', 'ViewSets'],
        examples: 'def user_view(request), path("users/", view)'
      },
      fastapi: {
        patterns: ['FastAPI routes', 'Path operations', 'Dependencies'],
        examples: '@app.get("/users"), async def get_users()'
      }
    };

    return frameworkSpecific[framework] || frameworkSpecific.express;
  }

  static getComponentTemplate(framework) {
    const frameworkSpecific = {
      react: {
        patterns: ['Functional components', 'Class components', 'Hooks', 'Context'],
        stateManagement: ['useState', 'useReducer', 'Context API', 'Redux', 'Zustand']
      },
      vue: {
        patterns: ['Single File Components', 'Composition API', 'Options API', 'Composables'],
        stateManagement: ['reactive', 'ref', 'Vuex', 'Pinia']
      },
      angular: {
        patterns: ['Components', 'Services', 'Directives', 'Pipes'],
        stateManagement: ['RxJS', 'NgRx', 'Services']
      }
    };

    return frameworkSpecific[framework] || frameworkSpecific.react;
  }

  static getWebSocketTemplate(library) {
    const librarySpecific = {
      'socket.io': {
        patterns: ['socket.emit', 'socket.on', 'io.to(room)', 'socket.join'],
        events: ['connection', 'disconnect', 'custom events']
      },
      'ws': {
        patterns: ['WebSocket constructor', 'ws.send', 'ws.on'],
        events: ['open', 'message', 'close', 'error']
      }
    };

    return librarySpecific[library] || librarySpecific['socket.io'];
  }
}

module.exports = PromptTemplates;