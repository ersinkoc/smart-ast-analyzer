const WebSocketAnalyzer = require('../../lib/analyzers/websocket-analyzer');

describe('WebSocketAnalyzer', () => {
  let analyzer;
  let mockFiles;
  let mockAIResult;

  beforeEach(() => {
    analyzer = new WebSocketAnalyzer('socket.io');
    mockFiles = [
      { path: '/sockets/chat.js', content: 'Chat socket', relativePath: 'sockets/chat.js' },
      { path: '/sockets/notification.js', content: 'Notification socket', relativePath: 'sockets/notification.js' }
    ];
    
    mockAIResult = {
      websocket: {
        library: 'socket.io',
        config: {
          rateLimiting: true
        }
      },
      connections: [
        {
          namespace: '/chat',
          auth: { token: 'jwt' },
          options: { reconnection: true },
          purpose: 'chat communication'
        },
        {
          namespace: '/notifications',
          auth: { session: 'cookie' },
          options: { reconnection: false }
        }
      ],
      events: {
        client: {
          'join-room': {
            payload: { room: 'general', userId: 123 },
            handlers: ['validateUser', 'joinRoom'],
            validation: true,
            authorization: true
          },
          'send-message': {
            payload: { message: 'hello', room: 'general' },
            handlers: ['validateMessage', 'broadcastMessage'],
            validation: true
          }
        },
        server: {
          'user-joined': {
            payload: { userId: 123, username: 'john' },
            handlers: ['updateUserList']
          },
          'new-message': {
            payload: { message: 'hello', from: 'john', timestamp: Date.now() },
            handlers: ['displayMessage']
          }
        }
      },
      eventFlow: [
        { event: 'join-room', from: 'client', to: 'server', trigger: null },
        { event: 'user-joined', from: 'server', to: 'broadcast', trigger: 'join-room' },
        { event: 'send-message', from: 'client', to: 'server', payload: { room: 'general' } },
        { event: 'new-message', from: 'server', to: 'broadcast', trigger: 'send-message' }
      ],
      rooms: {
        'general': { users: ['john', 'jane'] },
        'private': { users: ['admin'] },
        'support': { users: ['agent1', 'agent2'] }
      },
      issues: {
        security: [],
        performance: ['rate limit needed'],
        reliability: [],
        memoryLeaks: ['room cleanup needed']
      }
    };
  });

  describe('constructor', () => {
    test('initializes with framework', () => {
      expect(analyzer.framework).toBe('socket.io');
    });
  });

  describe('analyze', () => {
    test('returns enhanced result for valid AI result', async () => {
      const result = await analyzer.analyze(mockAIResult, mockFiles);
      
      expect(result).toBeDefined();
      expect(result.websocket).toEqual(mockAIResult.websocket);
      expect(result.metadata).toBeDefined();
      expect(result.architecture).toBeDefined();
      expect(result.security).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('returns empty result when AI result has error', async () => {
      const errorResult = { error: 'WebSocket analysis failed' };
      const result = await analyzer.analyze(errorResult, mockFiles);
      
      expect(result.websocket).toEqual({});
      expect(result.connections).toEqual([]);
      expect(result.metadata.error).toBe('WebSocket analysis failed');
      expect(result.metadata.totalEvents).toBe(0);
      expect(result.recommendations).toContain('Check if your project uses WebSocket connections');
    });

    test('returns empty result when AI result is null', async () => {
      const result = await analyzer.analyze(null, mockFiles);
      
      expect(result.websocket).toEqual({});
      expect(result.metadata.totalEvents).toBe(0);
      expect(result.recommendations).toContain('Ensure WebSocket files are in the expected locations (socket/, ws/, realtime/)');
    });

    test('returns empty result when AI result is undefined', async () => {
      const result = await analyzer.analyze(undefined, mockFiles);
      
      expect(result.websocket).toEqual({});
      expect(result.recommendations).toContain('Verify that the AI analysis service is working correctly');
    });
  });

  describe('createEmptyResult', () => {
    test('creates empty result without error', () => {
      const result = analyzer.createEmptyResult();
      
      expect(result.websocket).toEqual({});
      expect(result.connections).toEqual([]);
      expect(result.events.client).toEqual({});
      expect(result.events.server).toEqual({});
      expect(result.eventFlow).toEqual([]);
      expect(result.rooms).toEqual({});
      expect(result.metadata.totalEvents).toBe(0);
      expect(result.metadata.framework).toBe('socket.io');
      expect(result.metadata.error).toBeUndefined();
      expect(result.recommendations).toHaveLength(3);
    });

    test('creates empty result with error message', () => {
      const errorMessage = 'Custom WebSocket error';
      const result = analyzer.createEmptyResult(errorMessage);
      
      expect(result.metadata.error).toBe(errorMessage);
    });
  });

  describe('generateMetadata', () => {
    test('generates metadata with events and connections', () => {
      const metadata = analyzer.generateMetadata(mockAIResult, mockFiles);
      
      expect(metadata.totalEvents).toBe(4); // 2 client + 2 server
      expect(metadata.clientEvents).toBe(2);
      expect(metadata.serverEvents).toBe(2);
      expect(metadata.totalConnections).toBe(2);
      expect(metadata.totalRooms).toBe(3);
      expect(metadata.totalFiles).toBe(2);
      expect(metadata.framework).toBe('socket.io');
      expect(metadata.library).toBe('socket.io');
      expect(metadata.eventComplexity).toBeDefined();
      expect(metadata.analysisDate).toBeDefined();
    });

    test('handles result without events', () => {
      const resultWithoutEvents = { ...mockAIResult };
      delete resultWithoutEvents.events;
      
      const metadata = analyzer.generateMetadata(resultWithoutEvents, mockFiles);
      expect(metadata.totalEvents).toBe(0);
      expect(metadata.clientEvents).toBe(0);
      expect(metadata.serverEvents).toBe(0);
    });

    test('handles result with unknown library', () => {
      const resultWithoutLibrary = { ...mockAIResult };
      delete resultWithoutLibrary.websocket.library;
      
      const metadata = analyzer.generateMetadata(resultWithoutLibrary, mockFiles);
      expect(metadata.library).toBe('unknown');
    });
  });

  describe('assessEventComplexity', () => {
    test('assesses event complexity correctly', () => {
      const complexity = analyzer.assessEventComplexity(mockAIResult);
      
      expect(complexity).toBeDefined();
      expect(complexity.simple).toBeDefined();
      expect(complexity.moderate).toBeDefined();
      expect(complexity.complex).toBeDefined();
      expect(typeof complexity.simple).toBe('number');
      expect(typeof complexity.moderate).toBe('number');
      expect(typeof complexity.complex).toBe('number');
    });

    test('handles events without payload or handlers', () => {
      const resultWithSimpleEvents = {
        events: {
          client: {
            'simple-event': {}
          },
          server: {
            'another-simple': {}
          }
        }
      };
      
      const complexity = analyzer.assessEventComplexity(resultWithSimpleEvents);
      expect(complexity.simple).toBe(2);
      expect(complexity.moderate).toBe(0);
      expect(complexity.complex).toBe(0);
    });

    test('handles result without events', () => {
      const complexity = analyzer.assessEventComplexity({});
      
      expect(complexity.simple).toBe(0);
      expect(complexity.moderate).toBe(0);
      expect(complexity.complex).toBe(0);
    });
  });

  describe('analyzeArchitecture', () => {
    test('analyzes WebSocket architecture', () => {
      const architecture = analyzer.analyzeArchitecture(mockAIResult);
      
      expect(architecture.connectionPattern).toBeDefined();
      expect(architecture.eventPattern).toBeDefined();
      expect(architecture.scalabilityAssessment).toBeDefined();
      expect(architecture.communicationFlow).toBeDefined();
      expect(architecture.namespaceUsage).toBeDefined();
    });
  });

  describe('identifyConnectionPattern', () => {
    test('identifies no connections', () => {
      const result = { connections: [] };
      expect(analyzer.identifyConnectionPattern(result)).toBe('none');
    });

    test('identifies single connection', () => {
      const result = { connections: [{ namespace: '/chat' }] };
      expect(analyzer.identifyConnectionPattern(result)).toBe('single');
    });

    test('identifies multi-namespace pattern', () => {
      const result = { 
        connections: [
          { namespace: '/chat' },
          { namespace: '/notifications' }
        ] 
      };
      expect(analyzer.identifyConnectionPattern(result)).toBe('multi-namespace');
    });

    test('identifies multi-connection pattern', () => {
      const result = { 
        connections: [
          { namespace: '/chat' },
          { namespace: '/chat' }
        ] 
      };
      expect(analyzer.identifyConnectionPattern(result)).toBe('multi-connection');
    });
  });

  describe('identifyEventPattern', () => {
    test('identifies bidirectional pattern', () => {
      const result = {
        eventFlow: [
          { from: 'client', event: 'message' },
          { from: 'server', event: 'response' }
        ]
      };
      expect(analyzer.identifyEventPattern(result)).toBe('bidirectional');
    });

    test('identifies client-to-server pattern', () => {
      const result = {
        eventFlow: [
          { from: 'client', event: 'message1' },
          { from: 'client', event: 'message2' }
        ]
      };
      expect(analyzer.identifyEventPattern(result)).toBe('client-to-server');
    });

    test('identifies server-to-client pattern', () => {
      const result = {
        eventFlow: [
          { from: 'server', event: 'notification1' },
          { from: 'server', event: 'notification2' }
        ]
      };
      expect(analyzer.identifyEventPattern(result)).toBe('server-to-client');
    });

    test('identifies no pattern', () => {
      const result = { eventFlow: [] };
      expect(analyzer.identifyEventPattern(result)).toBe('none');
    });
  });

  describe('assessScalability', () => {
    test('assesses small scale application', () => {
      const result = {
        events: { client: { event1: {} }, server: { event1: {} } },
        rooms: { room1: {} }
      };
      const assessment = analyzer.assessScalability(result);
      
      expect(assessment.level).toBe('small');
      expect(assessment.concerns).toEqual([]);
      expect(assessment.recommendations).toEqual([]);
    });

    test('assesses medium scale application', () => {
      const result = {
        events: { 
          client: Array.from({length: 15}, (_, i) => [`event${i}`, {}]).reduce((obj, [k, v]) => ({...obj, [k]: v}), {}),
          server: Array.from({length: 10}, (_, i) => [`event${i}`, {}]).reduce((obj, [k, v]) => ({...obj, [k]: v}), {})
        },
        rooms: Array.from({length: 10}, (_, i) => [`room${i}`, {}]).reduce((obj, [k, v]) => ({...obj, [k]: v}), {})
      };
      const assessment = analyzer.assessScalability(result);
      
      expect(assessment.level).toBe('medium');
      expect(assessment.recommendations).toContain('Consider connection pooling');
    });

    test('assesses large scale application', () => {
      const result = {
        events: { 
          client: Array.from({length: 30}, (_, i) => [`event${i}`, {}]).reduce((obj, [k, v]) => ({...obj, [k]: v}), {}),
          server: Array.from({length: 30}, (_, i) => [`event${i}`, {}]).reduce((obj, [k, v]) => ({...obj, [k]: v}), {})
        },
        rooms: Array.from({length: 25}, (_, i) => [`room${i}`, {}]).reduce((obj, [k, v]) => ({...obj, [k]: v}), {})
      };
      const assessment = analyzer.assessScalability(result);
      
      expect(assessment.level).toBe('large');
      expect(assessment.concerns).toContain('High event volume');
      expect(assessment.concerns).toContain('Many rooms to manage');
      expect(assessment.recommendations).toContain('Implement horizontal scaling');
      expect(assessment.recommendations).toContain('Consider Redis adapter for Socket.io');
    });
  });

  describe('analyzeCommunicationFlow', () => {
    test('analyzes communication flow', () => {
      const flow = analyzer.analyzeCommunicationFlow(mockAIResult);
      
      expect(flow.totalFlows).toBe(4);
      expect(flow.patterns).toBeDefined();
      expect(flow.cycles).toBeDefined();
      expect(flow.bottlenecks).toBeDefined();
    });
  });

  describe('identifyFlowPatterns', () => {
    test('identifies request-response pattern', () => {
      const eventFlow = [
        { event: 'request', from: 'client' },
        { event: 'response', from: 'server', trigger: 'request' }
      ];
      const patterns = analyzer.identifyFlowPatterns(eventFlow);
      
      expect(patterns).toContain('request-response');
    });

    test('identifies broadcast pattern', () => {
      const eventFlow = [
        { event: 'announcement', to: 'broadcast' }
      ];
      const patterns = analyzer.identifyFlowPatterns(eventFlow);
      
      expect(patterns).toContain('broadcast');
    });

    test('identifies room-based pattern', () => {
      const eventFlow = [
        { event: 'room-message', payload: { room: 'general' } }
      ];
      const patterns = analyzer.identifyFlowPatterns(eventFlow);
      
      expect(patterns).toContain('room-based');
    });
  });

  describe('detectEventCycles', () => {
    test('detects event cycles', () => {
      const eventFlow = [
        { event: 'event1' },
        { event: 'event2' },
        { event: 'event1' } // Cycle
      ];
      const cycles = analyzer.detectEventCycles(eventFlow);
      
      expect(cycles).toContain('event1');
    });

    test('handles no cycles', () => {
      const eventFlow = [
        { event: 'event1' },
        { event: 'event2' },
        { event: 'event3' }
      ];
      const cycles = analyzer.detectEventCycles(eventFlow);
      
      expect(cycles).toEqual([]);
    });
  });

  describe('identifyFlowBottlenecks', () => {
    test('identifies flow bottlenecks', () => {
      const eventFlow = Array.from({length: 7}, () => ({ event: 'frequent-event' }));
      const bottlenecks = analyzer.identifyFlowBottlenecks(eventFlow);
      
      expect(bottlenecks).toHaveLength(1);
      expect(bottlenecks[0]).toEqual({ event: 'frequent-event', frequency: 7 });
    });

    test('handles no bottlenecks', () => {
      const eventFlow = [
        { event: 'event1' },
        { event: 'event2' },
        { event: 'event3' }
      ];
      const bottlenecks = analyzer.identifyFlowBottlenecks(eventFlow);
      
      expect(bottlenecks).toEqual([]);
    });
  });

  describe('analyzeNamespaceUsage', () => {
    test('analyzes namespace usage', () => {
      const result = {
        connections: [
          { namespace: '/chat', purpose: 'chatting' },
          { namespace: '/notifications', purpose: 'alerts' },
          { namespace: '/chat', purpose: 'chatting' }
        ]
      };
      const namespaceAnalysis = analyzer.analyzeNamespaceUsage(result);
      
      expect(namespaceAnalysis.total).toBe(2);
      expect(namespaceAnalysis.organized).toBe(true);
      expect(namespaceAnalysis.details['/chat'].connections).toBe(2);
      expect(namespaceAnalysis.details['/notifications'].connections).toBe(1);
    });

    test('handles connections without namespaces', () => {
      const result = {
        connections: [
          { purpose: 'general' },
          { purpose: 'admin' }
        ]
      };
      const namespaceAnalysis = analyzer.analyzeNamespaceUsage(result);
      
      expect(namespaceAnalysis.total).toBe(0);
      expect(namespaceAnalysis.organized).toBe(false);
    });
  });

  describe('enhanceSecurityAnalysis', () => {
    test('enhances security analysis', () => {
      const security = analyzer.enhanceSecurityAnalysis(mockAIResult);
      
      expect(security.authenticationStatus).toBeDefined();
      expect(security.authorizationStatus).toBeDefined();
      expect(security.inputValidation).toBeDefined();
      expect(security.rateLimiting).toBeDefined();
      expect(security.securityScore).toBeDefined();
      expect(typeof security.securityScore).toBe('number');
      expect(security.securityScore).toBeGreaterThanOrEqual(0);
      expect(security.securityScore).toBeLessThanOrEqual(100);
    });
  });

  describe('assessAuthentication', () => {
    test('identifies complete authentication', () => {
      const result = {
        connections: [
          { auth: { token: 'jwt' } },
          { auth: { session: 'cookie' } }
        ]
      };
      expect(analyzer.assessAuthentication(result)).toBe('complete');
    });

    test('identifies partial authentication', () => {
      const result = {
        connections: [
          { auth: { token: 'jwt' } },
          { auth: {} }
        ]
      };
      expect(analyzer.assessAuthentication(result)).toBe('partial');
    });

    test('identifies missing authentication', () => {
      const result = {
        connections: [
          { auth: {} },
          { auth: {} }
        ]
      };
      expect(analyzer.assessAuthentication(result)).toBe('missing');
    });
  });

  describe('assessAuthorization', () => {
    test('identifies adequate authorization', () => {
      const result = {
        events: {
          client: {
            event1: { authorization: true },
            event2: { permissions: ['read'] }
          },
          server: {
            event3: { authorization: true }
          }
        }
      };
      expect(analyzer.assessAuthorization(result)).toBe('adequate');
    });

    test('identifies inadequate authorization', () => {
      const result = {
        events: {
          client: {
            event1: { authorization: true },
            event2: {},
            event3: {}
          }
        }
      };
      expect(analyzer.assessAuthorization(result)).toBe('inadequate');
    });

    test('identifies missing authorization', () => {
      const result = {
        events: {
          client: {
            event1: {},
            event2: {}
          }
        }
      };
      expect(analyzer.assessAuthorization(result)).toBe('missing');
    });

    test('handles no events', () => {
      const result = { events: {} };
      expect(analyzer.assessAuthorization(result)).toBe('unknown');
    });
  });

  describe('assessInputValidation', () => {
    test('identifies adequate validation', () => {
      const result = {
        events: {
          client: {
            event1: { validation: true },
            event2: { payload: { field1: 'value' } }
          }
        }
      };
      expect(analyzer.assessInputValidation(result)).toBe('adequate');
    });

    test('identifies partial validation', () => {
      const result = {
        events: {
          client: {
            event1: { validation: true },
            event2: {},
            event3: {}
          }
        }
      };
      expect(analyzer.assessInputValidation(result)).toBe('partial');
    });

    test('identifies insufficient validation', () => {
      const result = {
        events: {
          client: {
            event1: {},
            event2: {},
            event3: {},
            event4: {}
          }
        }
      };
      expect(analyzer.assessInputValidation(result)).toBe('insufficient');
    });

    test('handles no events', () => {
      const result = { events: {} };
      expect(analyzer.assessInputValidation(result)).toBe('unknown');
    });
  });

  describe('assessRateLimiting', () => {
    test('identifies present rate limiting from config', () => {
      const result = {
        websocket: { config: { rateLimiting: true } }
      };
      expect(analyzer.assessRateLimiting(result)).toBe('present');
    });

    test('identifies present rate limiting from issues', () => {
      const result = {
        websocket: {},
        issues: { performance: ['rate limit implemented'] }
      };
      expect(analyzer.assessRateLimiting(result)).toBe('present');
    });

    test('identifies missing rate limiting', () => {
      const result = {
        websocket: { config: {} },
        issues: { performance: [] }
      };
      expect(analyzer.assessRateLimiting(result)).toBe('missing');
    });
  });

  describe('enhancePerformanceAnalysis', () => {
    test('enhances performance analysis', () => {
      const performance = analyzer.enhancePerformanceAnalysis(mockAIResult);
      
      expect(performance.connectionPerformance).toBeDefined();
      expect(performance.eventPerformance).toBeDefined();
      expect(performance.memoryUsage).toBeDefined();
      expect(performance.networkEfficiency).toBeDefined();
      expect(performance.performanceScore).toBeDefined();
      expect(typeof performance.performanceScore).toBe('number');
      expect(performance.performanceScore).toBeGreaterThanOrEqual(0);
      expect(performance.performanceScore).toBeLessThanOrEqual(100);
    });
  });

  describe('assessConnectionPerformance', () => {
    test('assesses connection performance', () => {
      const result = {
        connections: [
          { options: { reconnection: true } },
          { options: { reconnection: false } },
          { options: {} }
        ]
      };
      const performance = analyzer.assessConnectionPerformance(result);
      
      expect(performance.totalConnections).toBe(3);
      expect(performance.issues).toBe(2); // Two without reconnection
      expect(performance.recommendations).toEqual([]);
    });

    test('recommends connection pooling for many connections', () => {
      const result = {
        connections: Array.from({length: 150}, () => ({ options: { reconnection: true } }))
      };
      const performance = analyzer.assessConnectionPerformance(result);
      
      expect(performance.recommendations).toContain('Consider connection pooling');
    });
  });

  describe('assessEventPerformance', () => {
    test('assesses event performance', () => {
      const result = {
        events: {
          client: {
            'light-event': { payload: { msg: 'hi' } },
            'heavy-event': { payload: { data: 'x'.repeat(2000) } }
          },
          server: {
            'normal-event': { payload: { status: 'ok' } }
          }
        }
      };
      const performance = analyzer.assessEventPerformance(result);
      
      expect(performance.totalEvents).toBe(3);
      expect(performance.heavyEvents).toBe(1);
      expect(performance.averagePayloadSize).toBeGreaterThan(0);
    });

    test('handles events without payload', () => {
      const result = {
        events: {
          client: {
            'event1': {},
            'event2': {}
          }
        }
      };
      const performance = analyzer.assessEventPerformance(result);
      
      expect(performance.heavyEvents).toBe(0);
    });
  });

  describe('assessMemoryUsage', () => {
    test('identifies low risk', () => {
      const result = {
        issues: { memoryLeaks: [] },
        rooms: { room1: {}, room2: {} }
      };
      const memory = analyzer.assessMemoryUsage(result);
      
      expect(memory.risk).toBe('low');
      expect(memory.leakCount).toBe(0);
      expect(memory.roomCount).toBe(2);
    });

    test('identifies medium risk', () => {
      const result = {
        issues: { memoryLeaks: ['leak1'] },
        rooms: Array.from({length: 150}, (_, i) => [`room${i}`, {}]).reduce((obj, [k, v]) => ({...obj, [k]: v}), {})
      };
      const memory = analyzer.assessMemoryUsage(result);
      
      expect(memory.risk).toBe('medium');
    });

    test('identifies high risk', () => {
      const result = {
        issues: { memoryLeaks: ['leak1', 'leak2', 'leak3', 'leak4'] },
        rooms: Array.from({length: 600}, (_, i) => [`room${i}`, {}]).reduce((obj, [k, v]) => ({...obj, [k]: v}), {})
      };
      const memory = analyzer.assessMemoryUsage(result);
      
      expect(memory.risk).toBe('high');
    });
  });

  describe('assessNetworkEfficiency', () => {
    test('calculates network efficiency', () => {
      const result = {
        eventFlow: [
          { event: 'request1', from: 'client' },
          { event: 'response1', from: 'server', trigger: 'request1' },
          { event: 'request2', from: 'client' },
          { event: 'broadcast', from: 'server' }
        ]
      };
      const efficiency = analyzer.assessNetworkEfficiency(result);
      
      expect(efficiency).toBeGreaterThan(0);
      expect(efficiency).toBeLessThanOrEqual(1);
    });

    test('returns 1 for empty event flow', () => {
      const result = { eventFlow: [] };
      expect(analyzer.assessNetworkEfficiency(result)).toBe(1);
    });
  });

  describe('generateRecommendations', () => {
    test('generates security recommendations', () => {
      const resultWithSecurityIssues = {
        ...mockAIResult,
        connections: [{ auth: {} }], // No authentication
        events: {
          client: {
            'unsafe-event': {} // No validation
          }
        }
      };
      
      const recommendations = analyzer.generateRecommendations(resultWithSecurityIssues);
      
      const authRec = recommendations.find(rec => rec.title === 'Implement Authentication');
      const validationRec = recommendations.find(rec => rec.title === 'Add Input Validation');
      
      expect(authRec).toBeDefined();
      expect(authRec.priority).toBe('high');
      expect(authRec.category).toBe('security');
      
      expect(validationRec).toBeDefined();
      expect(validationRec.priority).toBe('high');
      expect(validationRec.category).toBe('security');
    });

    test('generates performance recommendations', () => {
      const resultWithPerformanceIssues = {
        ...mockAIResult,
        events: {
          client: {
            'heavy-event': { payload: { data: 'x'.repeat(2000) } }
          }
        },
        issues: {
          memoryLeaks: ['leak1', 'leak2', 'leak3', 'leak4'] // High memory risk
        }
      };
      
      const recommendations = analyzer.generateRecommendations(resultWithPerformanceIssues);
      
      const payloadRec = recommendations.find(rec => rec.title === 'Optimize Event Payloads');
      const memoryRec = recommendations.find(rec => rec.title === 'Address Memory Leaks');
      
      expect(payloadRec).toBeDefined();
      expect(payloadRec.priority).toBe('medium');
      expect(payloadRec.category).toBe('performance');
      
      expect(memoryRec).toBeDefined();
      expect(memoryRec.priority).toBe('high');
      expect(memoryRec.category).toBe('performance');
    });

    test('generates architecture recommendations', () => {
      const resultWithScalabilityIssues = {
        ...mockAIResult,
        events: {
          client: Array.from({length: 30}, (_, i) => [`event${i}`, {}]).reduce((obj, [k, v]) => ({...obj, [k]: v}), {}),
          server: Array.from({length: 30}, (_, i) => [`event${i}`, {}]).reduce((obj, [k, v]) => ({...obj, [k]: v}), {})
        },
        rooms: Array.from({length: 25}, (_, i) => [`room${i}`, {}]).reduce((obj, [k, v]) => ({...obj, [k]: v}), {})
      };
      
      const recommendations = analyzer.generateRecommendations(resultWithScalabilityIssues);
      
      const scalabilityRec = recommendations.find(rec => rec.title === 'Plan for Scalability');
      
      expect(scalabilityRec).toBeDefined();
      expect(scalabilityRec.priority).toBe('medium');
      expect(scalabilityRec.category).toBe('architecture');
    });

    test('handles minimal issues', () => {
      const cleanResult = {
        websocket: { config: { rateLimiting: true } },
        connections: [{ auth: { token: 'jwt' }, options: { reconnection: true } }],
        events: {
          client: {
            'clean-event': { validation: true, authorization: true, payload: { msg: 'hi' } }
          }
        },
        rooms: { room1: {} },
        issues: { memoryLeaks: [] }
      };
      
      const recommendations = analyzer.generateRecommendations(cleanResult);
      
      // Should have minimal recommendations for a clean setup
      expect(recommendations.length).toBeLessThan(3);
    });
  });

  describe('different frameworks', () => {
    test('works with different WebSocket frameworks', () => {
      const wsAnalyzer = new WebSocketAnalyzer('ws');
      expect(wsAnalyzer.framework).toBe('ws');
      
      const socketioAnalyzer = new WebSocketAnalyzer('socket.io');
      expect(socketioAnalyzer.framework).toBe('socket.io');
      
      const customAnalyzer = new WebSocketAnalyzer('custom-ws');
      expect(customAnalyzer.framework).toBe('custom-ws');
    });
  });
});