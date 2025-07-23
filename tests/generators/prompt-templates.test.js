const PromptTemplates = require('../../lib/generators/prompt-templates');

describe('PromptTemplates', () => {
  describe('getAPITemplate', () => {
    test('should return Next.js specific template', () => {
      const template = PromptTemplates.getAPITemplate('nextjs');
      
      expect(template).toHaveProperty('patterns');
      expect(template).toHaveProperty('examples');
      expect(template.patterns).toContain('API routes in pages/api/');
      expect(template.patterns).toContain('Route handlers in app/api/');
      expect(template.patterns).toContain('Server actions');
      expect(template.examples).toContain('pages/api/users.js');
    });

    test('should return Express specific template', () => {
      const template = PromptTemplates.getAPITemplate('express');
      
      expect(template).toHaveProperty('patterns');
      expect(template).toHaveProperty('examples');
      expect(template.patterns).toContain('Router middleware');
      expect(template.patterns).toContain('Route handlers');
      expect(template.patterns).toContain('Controller methods');
      expect(template.examples).toContain('app.get("/users", handler)');
    });

    test('should return Django specific template', () => {
      const template = PromptTemplates.getAPITemplate('django');
      
      expect(template).toHaveProperty('patterns');
      expect(template).toHaveProperty('examples');
      expect(template.patterns).toContain('Django views');
      expect(template.patterns).toContain('URL patterns');
      expect(template.patterns).toContain('ViewSets');
      expect(template.examples).toContain('def user_view(request)');
    });

    test('should return FastAPI specific template', () => {
      const template = PromptTemplates.getAPITemplate('fastapi');
      
      expect(template).toHaveProperty('patterns');
      expect(template).toHaveProperty('examples');
      expect(template.patterns).toContain('FastAPI routes');
      expect(template.patterns).toContain('Path operations');
      expect(template.patterns).toContain('Dependencies');
      expect(template.examples).toContain('@app.get("/users")');
    });

    test('should return Express template as default for unknown framework', () => {
      const template = PromptTemplates.getAPITemplate('unknown');
      
      expect(template).toHaveProperty('patterns');
      expect(template).toHaveProperty('examples');
      // Should default to Express patterns
      expect(template.patterns).toContain('Router middleware');
    });
  });

  describe('getComponentTemplate', () => {
    test('should return React specific template', () => {
      const template = PromptTemplates.getComponentTemplate('react');
      
      expect(template).toHaveProperty('patterns');
      expect(template).toHaveProperty('stateManagement');
      expect(template.patterns).toContain('Functional components');
      expect(template.patterns).toContain('Class components');
      expect(template.patterns).toContain('Hooks');
      expect(template.patterns).toContain('Context');
      expect(template.stateManagement).toContain('useState');
      expect(template.stateManagement).toContain('Redux');
    });

    test('should return Vue specific template', () => {
      const template = PromptTemplates.getComponentTemplate('vue');
      
      expect(template).toHaveProperty('patterns');
      expect(template).toHaveProperty('stateManagement');
      expect(template.patterns).toContain('Single File Components');
      expect(template.patterns).toContain('Composition API');
      expect(template.patterns).toContain('Options API');
      expect(template.patterns).toContain('Composables');
      expect(template.stateManagement).toContain('reactive');
      expect(template.stateManagement).toContain('Vuex');
    });

    test('should return Angular specific template', () => {
      const template = PromptTemplates.getComponentTemplate('angular');
      
      expect(template).toHaveProperty('patterns');
      expect(template).toHaveProperty('stateManagement');
      expect(template.patterns).toContain('Components');
      expect(template.patterns).toContain('Services');
      expect(template.patterns).toContain('Directives');
      expect(template.patterns).toContain('Pipes');
      expect(template.stateManagement).toContain('RxJS');
      expect(template.stateManagement).toContain('NgRx');
    });

    test('should return React template as default for unknown framework', () => {
      const template = PromptTemplates.getComponentTemplate('unknown');
      
      expect(template).toHaveProperty('patterns');
      expect(template).toHaveProperty('stateManagement');
      // Should default to React patterns
      expect(template.patterns).toContain('Functional components');
    });
  });

  describe('getWebSocketTemplate', () => {
    test('should return socket.io specific template', () => {
      const template = PromptTemplates.getWebSocketTemplate('socket.io');
      
      expect(template).toHaveProperty('patterns');
      expect(template).toHaveProperty('events');
      expect(template.patterns).toContain('socket.emit');
      expect(template.patterns).toContain('socket.on');
      expect(template.patterns).toContain('io.to(room)');
      expect(template.patterns).toContain('socket.join');
      expect(template.events).toContain('connection');
      expect(template.events).toContain('disconnect');
      expect(template.events).toContain('custom events');
    });

    test('should return ws specific template', () => {
      const template = PromptTemplates.getWebSocketTemplate('ws');
      
      expect(template).toHaveProperty('patterns');
      expect(template).toHaveProperty('events');
      expect(template.patterns).toContain('WebSocket constructor');
      expect(template.patterns).toContain('ws.send');
      expect(template.patterns).toContain('ws.on');
      expect(template.events).toContain('open');
      expect(template.events).toContain('message');
      expect(template.events).toContain('close');
      expect(template.events).toContain('error');
    });

    test('should return socket.io template as default for unknown library', () => {
      const template = PromptTemplates.getWebSocketTemplate('unknown');
      
      expect(template).toHaveProperty('patterns');
      expect(template).toHaveProperty('events');
      // Should default to socket.io patterns
      expect(template.patterns).toContain('socket.emit');
    });

    test('should handle null/undefined library parameter', () => {
      const template1 = PromptTemplates.getWebSocketTemplate(null);
      const template2 = PromptTemplates.getWebSocketTemplate(undefined);
      
      expect(template1).toHaveProperty('patterns');
      expect(template1).toHaveProperty('events');
      expect(template2).toHaveProperty('patterns');
      expect(template2).toHaveProperty('events');
      // Should default to socket.io patterns
      expect(template1.patterns).toContain('socket.emit');
      expect(template2.patterns).toContain('socket.emit');
    });
  });

  describe('edge cases', () => {
    test('should handle empty string parameters', () => {
      const apiTemplate = PromptTemplates.getAPITemplate('');
      const componentTemplate = PromptTemplates.getComponentTemplate('');
      const wsTemplate = PromptTemplates.getWebSocketTemplate('');
      
      // All should return default templates
      expect(apiTemplate.patterns).toContain('Router middleware'); // Express default
      expect(componentTemplate.patterns).toContain('Functional components'); // React default
      expect(wsTemplate.patterns).toContain('socket.emit'); // socket.io default
    });

    test('should handle numeric parameters', () => {
      const apiTemplate = PromptTemplates.getAPITemplate(123);
      const componentTemplate = PromptTemplates.getComponentTemplate(456);
      const wsTemplate = PromptTemplates.getWebSocketTemplate(789);
      
      // All should return default templates
      expect(apiTemplate).toBeDefined();
      expect(componentTemplate).toBeDefined();
      expect(wsTemplate).toBeDefined();
    });

    test('should handle case sensitivity', () => {
      const template1 = PromptTemplates.getAPITemplate('NEXTJS');
      const template2 = PromptTemplates.getAPITemplate('NextJS');
      const template3 = PromptTemplates.getAPITemplate('nextJs');
      
      // Case sensitive - should return default (Express)
      expect(template1.patterns).toContain('Router middleware');
      expect(template2.patterns).toContain('Router middleware');
      expect(template3.patterns).toContain('Router middleware');
    });
  });
});