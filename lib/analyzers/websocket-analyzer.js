class WebSocketAnalyzer {
  constructor(framework) {
    this.framework = framework;
  }

  async analyze(aiResult, files) {
    if (!aiResult || aiResult.error) {
      return this.createEmptyResult(aiResult?.error);
    }

    // Enhance AI results with additional analysis
    const enhancedResult = {
      ...aiResult,
      metadata: this.generateMetadata(aiResult, files),
      architecture: this.analyzeArchitecture(aiResult),
      security: this.enhanceSecurityAnalysis(aiResult),
      performance: this.enhancePerformanceAnalysis(aiResult),
      recommendations: this.generateRecommendations(aiResult)
    };

    return enhancedResult;
  }

  createEmptyResult(error) {
    return {
      websocket: {},
      connections: [],
      events: {
        client: {},
        server: {}
      },
      eventFlow: [],
      rooms: {},
      issues: {
        security: [],
        performance: [],
        reliability: [],
        memoryLeaks: []
      },
      metadata: {
        totalEvents: 0,
        analysisDate: new Date().toISOString(),
        framework: this.framework,
        error: error
      },
      recommendations: [
        'Check if your project uses WebSocket connections',
        'Ensure WebSocket files are in the expected locations (socket/, ws/, realtime/)',
        'Verify that the AI analysis service is working correctly'
      ]
    };
  }

  generateMetadata(result, files) {
    const clientEvents = Object.keys(result.events?.client || {}).length;
    const serverEvents = Object.keys(result.events?.server || {}).length;
    
    return {
      totalEvents: clientEvents + serverEvents,
      clientEvents: clientEvents,
      serverEvents: serverEvents,
      totalConnections: result.connections?.length || 0,
      totalRooms: Object.keys(result.rooms || {}).length,
      totalFiles: files.length,
      analysisDate: new Date().toISOString(),
      framework: this.framework,
      library: result.websocket?.library || 'unknown',
      eventComplexity: this.assessEventComplexity(result)
    };
  }

  assessEventComplexity(result) {
    const allEvents = {
      ...result.events?.client || {},
      ...result.events?.server || {}
    };
    
    const complexity = {
      simple: 0,
      moderate: 0,
      complex: 0
    };
    
    Object.values(allEvents).forEach(event => {
      const payloadSize = JSON.stringify(event.payload || {}).length;
      const handlersCount = event.handlers?.length || 0;
      
      const score = payloadSize / 100 + handlersCount * 2;
      
      if (score < 5) {
        complexity.simple++;
      } else if (score < 15) {
        complexity.moderate++;
      } else {
        complexity.complex++;
      }
    });
    
    return complexity;
  }

  analyzeArchitecture(result) {
    return {
      connectionPattern: this.identifyConnectionPattern(result),
      eventPattern: this.identifyEventPattern(result),
      scalabilityAssessment: this.assessScalability(result),
      communicationFlow: this.analyzeCommunicationFlow(result),
      namespaceUsage: this.analyzeNamespaceUsage(result)
    };
  }

  identifyConnectionPattern(result) {
    const connections = result.connections || [];
    
    if (connections.length === 0) return 'none';
    if (connections.length === 1) return 'single';
    
    // Check for multiple namespaces
    const namespaces = new Set(connections.map(c => c.namespace).filter(Boolean));
    if (namespaces.size > 1) return 'multi-namespace';
    
    return 'multi-connection';
  }

  identifyEventPattern(result) {
    const eventFlow = result.eventFlow || [];
    
    if (eventFlow.length === 0) return 'none';
    
    // Analyze bidirectional vs unidirectional
    const clientToServer = eventFlow.filter(flow => flow.from === 'client').length;
    const serverToClient = eventFlow.filter(flow => flow.from === 'server').length;
    
    if (clientToServer > 0 && serverToClient > 0) {
      return 'bidirectional';
    } else if (clientToServer > 0) {
      return 'client-to-server';
    } else if (serverToClient > 0) {
      return 'server-to-client';
    }
    
    return 'unknown';
  }

  assessScalability(result) {
    const assessment = {
      level: 'unknown',
      concerns: [],
      recommendations: []
    };
    
    const totalEvents = Object.keys(result.events?.client || {}).length + 
                       Object.keys(result.events?.server || {}).length;
    
    const totalRooms = Object.keys(result.rooms || {}).length;
    
    if (totalEvents < 10 && totalRooms < 5) {
      assessment.level = 'small';
    } else if (totalEvents < 50 && totalRooms < 20) {
      assessment.level = 'medium';
      assessment.recommendations.push('Consider connection pooling');
    } else {
      assessment.level = 'large';
      assessment.concerns.push('High event volume');
      assessment.concerns.push('Many rooms to manage');
      assessment.recommendations.push('Implement horizontal scaling');
      assessment.recommendations.push('Consider Redis adapter for Socket.io');
    }
    
    return assessment;
  }

  analyzeCommunicationFlow(result) {
    const eventFlow = result.eventFlow || [];
    
    return {
      totalFlows: eventFlow.length,
      patterns: this.identifyFlowPatterns(eventFlow),
      cycles: this.detectEventCycles(eventFlow),
      bottlenecks: this.identifyFlowBottlenecks(eventFlow)
    };
  }

  identifyFlowPatterns(eventFlow) {
    const patterns = [];
    
    // Request-response pattern
    const requestResponsePairs = eventFlow.filter(flow => 
      eventFlow.some(response => 
        response.trigger === flow.event && response.from !== flow.from
      )
    );
    
    if (requestResponsePairs.length > 0) {
      patterns.push('request-response');
    }
    
    // Broadcast pattern
    const broadcasts = eventFlow.filter(flow => flow.to === 'broadcast');
    if (broadcasts.length > 0) {
      patterns.push('broadcast');
    }
    
    // Room-based communication
    const roomEvents = eventFlow.filter(flow => 
      flow.payload && typeof flow.payload === 'object' && flow.payload.room
    );
    if (roomEvents.length > 0) {
      patterns.push('room-based');
    }
    
    return patterns;
  }

  detectEventCycles(eventFlow) {
    // Simplified cycle detection
    const cycles = [];
    const visited = new Set();
    
    eventFlow.forEach(flow => {
      if (visited.has(flow.event)) {
        cycles.push(flow.event);
      } else {
        visited.add(flow.event);
      }
    });
    
    return cycles;
  }

  identifyFlowBottlenecks(eventFlow) {
    const eventCounts = {};
    
    eventFlow.forEach(flow => {
      eventCounts[flow.event] = (eventCounts[flow.event] || 0) + 1;
    });
    
    // Events that appear frequently might be bottlenecks
    return Object.entries(eventCounts)
      .filter(([event, count]) => count > 5)
      .map(([event, count]) => ({ event, frequency: count }));
  }

  analyzeNamespaceUsage(result) {
    const connections = result.connections || [];
    const namespaces = {};
    
    connections.forEach(conn => {
      if (conn.namespace) {
        namespaces[conn.namespace] = {
          connections: (namespaces[conn.namespace]?.connections || 0) + 1,
          purpose: conn.purpose || 'unknown'
        };
      }
    });
    
    return {
      total: Object.keys(namespaces).length,
      details: namespaces,
      organized: Object.keys(namespaces).length > 1
    };
  }

  enhanceSecurityAnalysis(result) {
    const security = {
      ...result.security,
      authenticationStatus: this.assessAuthentication(result),
      authorizationStatus: this.assessAuthorization(result),
      inputValidation: this.assessInputValidation(result),
      rateLimiting: this.assessRateLimiting(result),
      securityScore: 0
    };
    
    // Calculate security score
    let score = 100;
    
    if (security.authenticationStatus === 'missing') score -= 30;
    if (security.authorizationStatus === 'inadequate') score -= 20;
    if (security.inputValidation === 'insufficient') score -= 25;
    if (security.rateLimiting === 'missing') score -= 15;
    
    security.securityScore = Math.max(0, score);
    
    return security;
  }

  assessAuthentication(result) {
    const connections = result.connections || [];
    
    const authenticatedConnections = connections.filter(conn => 
      conn.auth && Object.keys(conn.auth).length > 0
    );
    
    if (authenticatedConnections.length === 0) return 'missing';
    if (authenticatedConnections.length < connections.length) return 'partial';
    return 'complete';
  }

  assessAuthorization(result) {
    const events = { ...result.events?.client || {}, ...result.events?.server || {} };
    
    const authorizedEvents = Object.values(events).filter(event => 
      event.authorization || event.permissions
    );
    
    const totalEvents = Object.keys(events).length;
    
    if (totalEvents === 0) return 'unknown';
    if (authorizedEvents.length === 0) return 'missing';
    if (authorizedEvents.length < totalEvents * 0.5) return 'inadequate';
    return 'adequate';
  }

  assessInputValidation(result) {
    const events = { ...result.events?.client || {}, ...result.events?.server || {} };
    
    const validatedEvents = Object.values(events).filter(event => 
      event.validation || (event.payload && Object.keys(event.payload).length > 0)
    );
    
    const totalEvents = Object.keys(events).length;
    
    if (totalEvents === 0) return 'unknown';
    if (validatedEvents.length < totalEvents * 0.3) return 'insufficient';
    if (validatedEvents.length < totalEvents * 0.7) return 'partial';
    return 'adequate';
  }

  assessRateLimiting(result) {
    // Check if rate limiting is mentioned in issues or configuration
    const hasRateLimiting = result.websocket?.config?.rateLimiting ||
                           result.issues?.performance?.some(issue => 
                             issue.toLowerCase().includes('rate limit')
                           );
    
    return hasRateLimiting ? 'present' : 'missing';
  }

  enhancePerformanceAnalysis(result) {
    const performance = {
      connectionPerformance: this.assessConnectionPerformance(result),
      eventPerformance: this.assessEventPerformance(result),
      memoryUsage: this.assessMemoryUsage(result),
      networkEfficiency: this.assessNetworkEfficiency(result),
      performanceScore: 0
    };
    
    // Calculate performance score
    let score = 100;
    
    if (performance.connectionPerformance.issues > 0) score -= 20;
    if (performance.eventPerformance.heavyEvents > 3) score -= 25;
    if (performance.memoryUsage.risk === 'high') score -= 30;
    if (performance.networkEfficiency < 0.7) score -= 15;
    
    performance.performanceScore = Math.max(0, score);
    
    return performance;
  }

  assessConnectionPerformance(result) {
    const connections = result.connections || [];
    
    return {
      totalConnections: connections.length,
      issues: connections.filter(conn => !conn.options?.reconnection).length,
      recommendations: connections.length > 100 ? ['Consider connection pooling'] : []
    };
  }

  assessEventPerformance(result) {
    const allEvents = {
      ...result.events?.client || {},
      ...result.events?.server || {}
    };
    
    let heavyEvents = 0;
    let totalPayloadSize = 0;
    
    Object.values(allEvents).forEach(event => {
      const payloadSize = JSON.stringify(event.payload || {}).length;
      totalPayloadSize += payloadSize;
      
      if (payloadSize > 1000) { // 1KB threshold
        heavyEvents++;
      }
    });
    
    return {
      totalEvents: Object.keys(allEvents).length,
      heavyEvents,
      averagePayloadSize: Object.keys(allEvents).length > 0 ? 
        totalPayloadSize / Object.keys(allEvents).length : 0
    };
  }

  assessMemoryUsage(result) {
    const memoryLeaks = result.issues?.memoryLeaks || [];
    const totalRooms = Object.keys(result.rooms || {}).length;
    
    let risk = 'low';
    
    if (memoryLeaks.length > 0 || totalRooms > 100) {
      risk = 'medium';
    }
    
    if (memoryLeaks.length > 3 || totalRooms > 500) {
      risk = 'high';
    }
    
    return {
      risk,
      leakCount: memoryLeaks.length,
      roomCount: totalRooms
    };
  }

  assessNetworkEfficiency(result) {
    const eventFlow = result.eventFlow || [];
    
    if (eventFlow.length === 0) return 1;
    
    // Simple efficiency calculation based on bidirectional communication
    const bidirectionalFlows = eventFlow.filter(flow => 
      eventFlow.some(response => 
        response.trigger === flow.event && response.from !== flow.from
      )
    );
    
    return bidirectionalFlows.length / eventFlow.length;
  }

  generateRecommendations(result) {
    const recommendations = [];
    
    // Security recommendations
    const securityAnalysis = this.enhanceSecurityAnalysis(result);
    
    if (securityAnalysis.authenticationStatus === 'missing') {
      recommendations.push({
        priority: 'high',
        category: 'security',
        title: 'Implement Authentication',
        description: 'Add authentication to WebSocket connections to prevent unauthorized access'
      });
    }
    
    if (securityAnalysis.inputValidation === 'insufficient') {
      recommendations.push({
        priority: 'high',
        category: 'security',
        title: 'Add Input Validation',
        description: 'Validate all incoming WebSocket event payloads'
      });
    }
    
    // Performance recommendations
    const performanceAnalysis = this.enhancePerformanceAnalysis(result);
    
    if (performanceAnalysis.eventPerformance.heavyEvents > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        title: 'Optimize Event Payloads',
        description: `${performanceAnalysis.eventPerformance.heavyEvents} events have large payloads. Consider compression or data structure optimization.`
      });
    }
    
    if (performanceAnalysis.memoryUsage.risk === 'high') {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        title: 'Address Memory Leaks',
        description: 'Implement proper cleanup for WebSocket connections and room management'
      });
    }
    
    // Architecture recommendations
    const architecture = this.analyzeArchitecture(result);
    
    if (architecture.scalabilityAssessment.level === 'large') {
      recommendations.push({
        priority: 'medium',
        category: 'architecture',
        title: 'Plan for Scalability',
        description: 'Consider horizontal scaling solutions and Redis adapter for Socket.io'
      });
    }
    
    return recommendations;
  }
}

module.exports = WebSocketAnalyzer;