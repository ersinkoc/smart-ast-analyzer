const ComponentAnalyzer = require('../../lib/analyzers/component-analyzer');

describe('ComponentAnalyzer', () => {
  let analyzer;
  let mockFiles;
  let mockAIResult;

  beforeEach(() => {
    analyzer = new ComponentAnalyzer('react');
    mockFiles = [
      { path: '/components/Button.jsx', content: 'Button component', relativePath: 'components/Button.jsx' },
      { path: '/components/Modal.jsx', content: 'Modal component', relativePath: 'components/Modal.jsx' }
    ];
    
    mockAIResult = {
      components: {
        Button: {
          file: '/components/Button.jsx',
          type: 'functional',
          props: {
            onClick: { type: 'function', required: true },
            disabled: { type: 'boolean', required: false, default: false }
          },
          state: {
            local: ['isHovered'],
            global: [],
            server: []
          },
          dependencies: {
            components: [],
            hooks: ['useState'],
            utils: [],
            external: []
          }
        },
        Modal: {
          file: '/components/Modal.jsx',
          type: 'functional',
          props: {
            isOpen: { type: 'boolean', required: true },
            onClose: { type: 'function', required: true }
          },
          state: {
            local: [],
            global: ['modalState'],
            server: []
          }
        }
      },
      componentTree: {},
      dataFlow: [],
      unusedComponents: [],
      circularDependencies: [],
      propDrilling: []
    };
  });

  describe('constructor', () => {
    test('initializes with framework', () => {
      expect(analyzer.framework).toBe('react');
    });
  });

  describe('analyze', () => {
    test('returns enhanced result for valid AI result', async () => {
      const result = await analyzer.analyze(mockAIResult, mockFiles);
      
      expect(result).toBeDefined();
      expect(result.components).toEqual(mockAIResult.components);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalComponents).toBe(2);
      expect(result.metadata.totalFiles).toBe(2);
      expect(result.metadata.framework).toBe('react');
      expect(result.frameworkSpecific).toBeDefined();
      expect(result.architecture).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('returns empty result when AI result has error', async () => {
      const errorResult = { error: 'AI analysis failed' };
      const result = await analyzer.analyze(errorResult, mockFiles);
      
      expect(result.components).toEqual({});
      expect(result.componentTree).toEqual({});
      expect(result.metadata.error).toBe('AI analysis failed');
      expect(result.metadata.totalComponents).toBe(0);
      expect(result.recommendations).toContain('Check if your project has components');
    });

    test('returns empty result when AI result is null', async () => {
      const result = await analyzer.analyze(null, mockFiles);
      
      expect(result.components).toEqual({});
      expect(result.metadata.totalComponents).toBe(0);
      expect(result.recommendations).toContain('Ensure component files are in the expected locations');
    });

    test('returns empty result when AI result is undefined', async () => {
      const result = await analyzer.analyze(undefined, mockFiles);
      
      expect(result.components).toEqual({});
      expect(result.recommendations).toContain('Verify that the AI analysis service is working correctly');
    });
  });

  describe('createEmptyResult', () => {
    test('creates empty result without error', () => {
      const result = analyzer.createEmptyResult();
      
      expect(result.components).toEqual({});
      expect(result.componentTree).toEqual({});
      expect(result.dataFlow).toEqual([]);
      expect(result.unusedComponents).toEqual([]);
      expect(result.circularDependencies).toEqual([]);
      expect(result.propDrilling).toEqual([]);
      expect(result.metadata.totalComponents).toBe(0);
      expect(result.metadata.framework).toBe('react');
      expect(result.metadata.error).toBeUndefined();
      expect(result.recommendations).toHaveLength(3);
    });

    test('creates empty result with error message', () => {
      const errorMessage = 'Custom error';
      const result = analyzer.createEmptyResult(errorMessage);
      
      expect(result.metadata.error).toBe(errorMessage);
    });
  });

  describe('generateMetadata', () => {
    test('generates metadata with components', () => {
      const metadata = analyzer.generateMetadata(mockAIResult, mockFiles);
      
      expect(metadata.totalComponents).toBe(2);
      expect(metadata.totalFiles).toBe(2);
      expect(metadata.framework).toBe('react');
      expect(metadata.analysisDate).toBeDefined();
      expect(metadata.componentTypes).toBeDefined();
      expect(metadata.stateManagementPatterns).toBeDefined();
      expect(metadata.averagePropsPerComponent).toBeDefined();
      expect(metadata.componentComplexity).toBeDefined();
    });

    test('handles result without components', () => {
      const resultWithoutComponents = { ...mockAIResult };
      delete resultWithoutComponents.components;
      
      const metadata = analyzer.generateMetadata(resultWithoutComponents, mockFiles);
      expect(metadata.totalComponents).toBe(0);
    });
  });

  describe('countComponentTypes', () => {
    test('counts component types correctly', () => {
      const types = analyzer.countComponentTypes(mockAIResult.components);
      
      expect(types.functional).toBe(2);
    });

    test('handles components without type', () => {
      const componentsWithoutType = {
        Component1: { file: 'test.jsx' },
        Component2: { file: 'test2.jsx', type: 'class' }
      };
      
      const types = analyzer.countComponentTypes(componentsWithoutType);
      expect(types.unknown).toBe(1);
      expect(types.class).toBe(1);
    });
  });

  describe('identifyStatePatterns', () => {
    test('identifies state management patterns', () => {
      const patterns = analyzer.identifyStatePatterns(mockAIResult.components);
      
      expect(patterns).toContain('local');
      expect(patterns).toContain('global');
      expect(patterns).not.toContain('server');
    });

    test('handles components without state', () => {
      const componentsWithoutState = {
        Component1: { file: 'test.jsx' }
      };
      
      const patterns = analyzer.identifyStatePatterns(componentsWithoutState);
      expect(Array.from(patterns)).toEqual([]);
    });

    test('identifies server state patterns', () => {
      const componentsWithServerState = {
        Component1: { 
          file: 'test.jsx',
          state: {
            local: [],
            global: [],
            server: ['userProfile', 'posts']
          }
        }
      };
      
      const patterns = analyzer.identifyStatePatterns(componentsWithServerState);
      expect(patterns).toContain('server');
    });
  });

  describe('calculateAverageProps', () => {
    test('calculates average props per component', () => {
      const avg = analyzer.calculateAverageProps(mockAIResult.components);
      
      expect(avg).toBe(2); // Button has 2 props, Modal has 2 props
    });

    test('handles components without props', () => {
      const componentsWithoutProps = {
        Component1: { file: 'test.jsx' }
      };
      
      const avg = analyzer.calculateAverageProps(componentsWithoutProps);
      expect(avg).toBe(0);
    });

    test('handles empty components object', () => {
      const avg = analyzer.calculateAverageProps({});
      expect(avg).toBe(0);
    });
  });

  describe('assessComplexity', () => {
    test('assesses component complexity', () => {
      const complexity = analyzer.assessComplexity(mockAIResult.components);
      
      expect(complexity).toBeDefined();
      expect(complexity.simple).toBeDefined();
      expect(complexity.moderate).toBeDefined();
      expect(complexity.complex).toBeDefined();
    });

    test('handles empty components', () => {
      const complexity = analyzer.assessComplexity({});
      
      expect(complexity.simple).toBe(0);
      expect(complexity.moderate).toBe(0);
      expect(complexity.complex).toBe(0);
    });

    test('categorizes moderate complexity components (score 11-25)', () => {
      const componentsWithModerateComplexity = {
        ModerateComponent: {
          props: { prop1: {}, prop2: {}, prop3: {}, prop4: {}, prop5: {}, prop6: {}, prop7: {}, prop8: {}, prop9: {}, prop10: {}, prop11: {} }, // 11 props
          state: { local: ['state1'], global: ['global1'] }, // +5 points (2*1 + 3*1)
          dependencies: { components: ['Comp1'], hooks: ['useState'] }, // +2 points
          apiCalls: [{ endpoint: '/api/test' }], // +3 points
          children: ['Child1'] // +1 point
          // Total: 11 + 5 + 2 + 3 + 1 = 22 (moderate)
        }
      };
      
      const complexity = analyzer.assessComplexity(componentsWithModerateComplexity);
      expect(complexity.moderate).toBe(1);
      expect(complexity.simple).toBe(0);
      expect(complexity.complex).toBe(0);
    });

    test('categorizes complex components (score > 25)', () => {
      const componentsWithHighComplexity = {
        ComplexComponent: {
          props: { prop1: {}, prop2: {}, prop3: {}, prop4: {}, prop5: {}, prop6: {}, prop7: {}, prop8: {}, prop9: {}, prop10: {} }, // 10 props
          state: { 
            local: ['state1', 'state2', 'state3'], // +6 points (2*3)
            global: ['global1', 'global2'], // +6 points (3*2)
            server: ['server1'] // +2 points (2*1)
          },
          dependencies: { 
            components: ['Comp1', 'Comp2'], // +2 points
            hooks: ['useState', 'useEffect'] // +2 points
          },
          apiCalls: [
            { endpoint: '/api/test1' },
            { endpoint: '/api/test2' }
          ], // +6 points (3*2)
          children: ['Child1', 'Child2', 'Child3'] // +3 points
          // Total: 10 + 6 + 6 + 2 + 2 + 2 + 6 + 3 = 37 (complex)
        }
      };
      
      const complexity = analyzer.assessComplexity(componentsWithHighComplexity);
      expect(complexity.complex).toBe(1);
      expect(complexity.simple).toBe(0);
      expect(complexity.moderate).toBe(0);
    });
  });

  describe('calculateComplexityScore', () => {
    test('calculates complexity score for component', () => {
      const component = {
        props: { prop1: {}, prop2: {} },
        state: { local: ['state1'], global: ['global1'] },
        dependencies: { components: ['Comp1'], hooks: ['useState'] },
        apiCalls: [{ endpoint: '/api/test' }],
        children: ['Child1']
      };
      
      const score = analyzer.calculateComplexityScore(component);
      expect(score).toBeGreaterThan(0);
    });

    test('handles component without properties', () => {
      const component = {};
      const score = analyzer.calculateComplexityScore(component);
      expect(score).toBe(0);
    });
  });

  describe('addFrameworkSpecificAnalysis', () => {
    test('adds React specific analysis', () => {
      const frameworkAnalysis = analyzer.addFrameworkSpecificAnalysis(mockAIResult);
      
      expect(frameworkAnalysis).toBeDefined();
      expect(frameworkAnalysis.hookUsage).toBeDefined();
      expect(frameworkAnalysis.classComponents).toBeDefined();
      expect(frameworkAnalysis.functionalComponents).toBeDefined();
      expect(frameworkAnalysis.contextUsage).toBeDefined();
      expect(frameworkAnalysis.memoizationPatterns).toBeDefined();
    });

    test('counts class components correctly in React analysis', () => {
      const resultWithClassComponents = {
        components: {
          ClassButton: {
            file: '/components/ClassButton.jsx',
            type: 'class',
            props: { onClick: { type: 'function' } }
          },
          FunctionalButton: {
            file: '/components/FunctionalButton.jsx',
            type: 'functional',
            props: { onClick: { type: 'function' } }
          },
          AnotherClass: {
            file: '/components/AnotherClass.jsx',
            type: 'class',
            props: { title: { type: 'string' } }
          }
        }
      };
      
      const frameworkAnalysis = analyzer.addFrameworkSpecificAnalysis(resultWithClassComponents);
      
      expect(frameworkAnalysis.classComponents).toBe(2);
      expect(frameworkAnalysis.functionalComponents).toBe(1);
    });

    test('detects context usage in React components', () => {
      const resultWithContextUsage = {
        components: {
          ContextConsumer: {
            file: '/components/ContextConsumer.jsx',
            type: 'functional',
            state: {
              local: [],
              global: ['context', 'userContext'],
              server: []
            }
          },
          RegularComponent: {
            file: '/components/RegularComponent.jsx', 
            type: 'functional',
            state: {
              local: ['count'],
              global: ['sharedState'],
              server: []
            }
          }
        }
      };
      
      const frameworkAnalysis = analyzer.addFrameworkSpecificAnalysis(resultWithContextUsage);
      
      expect(frameworkAnalysis.contextUsage).toBe(1);
    });

    test('tracks memoization patterns in React components', () => {
      const resultWithMemoization = {
        components: {
          MemoizedComponent: {
            file: '/components/MemoizedComponent.jsx',
            type: 'functional',
            performance: {
              memoized: true
            }
          },
          RegularComponent: {
            file: '/components/RegularComponent.jsx',
            type: 'functional'
          },
          AnotherMemoized: {
            file: '/components/AnotherMemoized.jsx',
            type: 'functional',
            performance: {
              memoized: true
            }
          }
        }
      };
      
      const frameworkAnalysis = analyzer.addFrameworkSpecificAnalysis(resultWithMemoization);
      
      expect(frameworkAnalysis.memoizationPatterns).toContain('/components/MemoizedComponent.jsx');
      expect(frameworkAnalysis.memoizationPatterns).toContain('/components/AnotherMemoized.jsx');
      expect(frameworkAnalysis.memoizationPatterns).toHaveLength(2);
    });

    test('adds Vue specific analysis', () => {
      const vueAnalyzer = new ComponentAnalyzer('vue');
      const frameworkAnalysis = vueAnalyzer.addFrameworkSpecificAnalysis(mockAIResult);
      
      expect(frameworkAnalysis).toBeDefined();
      expect(frameworkAnalysis.compositionAPI).toBeDefined();
      expect(frameworkAnalysis.optionsAPI).toBeDefined();
      expect(frameworkAnalysis.singleFileComponents).toBeDefined();
      expect(frameworkAnalysis.composableUsage).toBeDefined();
    });

    test('detects Vue Single File Components correctly', () => {
      const vueAnalyzer = new ComponentAnalyzer('vue');
      const resultWithVueComponents = {
        components: {
          VueComponent1: {
            file: '/components/VueComponent1.vue',
            type: 'functional'
          },
          VueComponent2: {
            file: '/components/VueComponent2.vue',
            type: 'functional'
          },
          JSComponent: {
            file: '/components/JSComponent.js',
            type: 'functional'
          }
        }
      };
      
      const frameworkAnalysis = vueAnalyzer.addFrameworkSpecificAnalysis(resultWithVueComponents);
      
      expect(frameworkAnalysis.singleFileComponents).toBe(2);
    });

    test('adds Angular specific analysis', () => {
      const angularAnalyzer = new ComponentAnalyzer('angular');
      const frameworkAnalysis = angularAnalyzer.addFrameworkSpecificAnalysis(mockAIResult);
      
      expect(frameworkAnalysis.components).toBeDefined();
      expect(frameworkAnalysis.services).toBeDefined();
      expect(frameworkAnalysis.pipes).toBeDefined();
      expect(frameworkAnalysis.directives).toBeDefined();
    });

    test('adds default analysis for unknown framework', () => {
      const unknownAnalyzer = new ComponentAnalyzer('unknown');
      const frameworkAnalysis = unknownAnalyzer.addFrameworkSpecificAnalysis(mockAIResult);
      
      expect(frameworkAnalysis).toEqual({});
    });
  });

  describe('analyzeArchitecture', () => {
    test('analyzes component architecture', () => {
      const architecture = analyzer.analyzeArchitecture(mockAIResult);
      
      expect(architecture).toBeDefined();
      expect(architecture.depth).toBeDefined();
      expect(architecture.breadth).toBeDefined();
      expect(architecture.patterns).toBeDefined();
      expect(architecture.coupling).toBeDefined();
      expect(architecture.cohesion).toBeDefined();
    });

    test('handles empty components', () => {
      const emptyResult = { componentTree: {} };
      const architecture = analyzer.analyzeArchitecture(emptyResult);
      
      expect(architecture.depth).toBe(1); // Empty tree returns depth 1
      expect(architecture.breadth).toBe(0);
    });

    test('identifies Container/Presentational pattern', () => {
      const resultWithContainerPattern = {
        components: {
          UserListContainer: {
            apiCalls: [{ endpoint: '/api/users' }],
            children: ['UserList'],
            props: {}
          },
          UserList: {
            apiCalls: [],
            children: [],
            props: { users: { type: 'array' } }
          }
        },
        componentTree: {}
      };

      const architecture = analyzer.analyzeArchitecture(resultWithContainerPattern);
      expect(architecture.patterns).toContain('Container/Presentational');
    });

    test('identifies Compound Components pattern', () => {
      const resultWithCompoundPattern = {
        components: {
          Modal: {
            children: ['ModalHeader', 'ModalBody', 'ModalFooter'],
            props: {}
          },
          ModalHeader: {
            children: [],
            props: {}
          },
          ModalBody: {
            children: [],
            props: {}
          }
        },
        componentTree: {}
      };

      const architecture = analyzer.analyzeArchitecture(resultWithCompoundPattern);
      expect(architecture.patterns).toContain('Compound Components');
    });

    test('identifies Render Props pattern', () => {
      const resultWithRenderProps = {
        components: {
          DataProvider: {
            props: { 
              render: { type: 'function' },
              children: { type: 'function' }
            }
          },
          MouseTracker: {
            props: {
              renderContent: { type: 'function' }
            }
          }
        },
        componentTree: {}
      };

      const architecture = analyzer.analyzeArchitecture(resultWithRenderProps);
      expect(architecture.patterns).toContain('Render Props');
    });

    test('identifies multiple architectural patterns', () => {
      const resultWithMultiplePatterns = {
        components: {
          // Container/Presentational pattern
          UserListContainer: {
            apiCalls: [{ endpoint: '/api/users' }],
            children: ['UserList'],
            props: {}
          },
          UserList: {
            apiCalls: [],
            children: [],
            props: { users: { type: 'array' } }
          },
          // Compound Components pattern
          Modal: {
            children: ['ModalHeader', 'ModalBody'],
            props: {}
          },
          ModalHeader: {
            children: [],
            props: {}
          },
          // Render Props pattern
          DataProvider: {
            props: { 
              render: { type: 'function' }
            }
          }
        },
        componentTree: {}
      };

      const architecture = analyzer.analyzeArchitecture(resultWithMultiplePatterns);
      expect(architecture.patterns).toContain('Container/Presentational');
      expect(architecture.patterns).toContain('Compound Components');
      expect(architecture.patterns).toContain('Render Props');
      expect(architecture.patterns).toHaveLength(3);
    });
  });

  describe('calculateTreeDepth', () => {
    test('calculates component tree depth', () => {
      const componentTree = {
        App: {
          Header: {},
          Main: {
            Content: {
              Article: {}
            }
          }
        }
      };
      
      const depth = analyzer.calculateTreeDepth(componentTree);
      expect(depth).toBe(5); // Actual depth is 5 levels deep
    });

    test('handles empty tree', () => {
      const depth = analyzer.calculateTreeDepth({});
      expect(depth).toBe(1);
    });

    test('handles null tree', () => {
      const depth = analyzer.calculateTreeDepth(null);
      expect(depth).toBe(0);
    });
  });

  describe('calculateTreeBreadth', () => {
    test('calculates component tree breadth', () => {
      const componentTree = {
        App: {},
        Login: {},
        Dashboard: {}
      };
      
      const breadth = analyzer.calculateTreeBreadth(componentTree);
      expect(breadth).toBe(3);
    });

    test('handles empty tree', () => {
      const breadth = analyzer.calculateTreeBreadth({});
      expect(breadth).toBe(0);
    });

    test('handles null tree', () => {
      const breadth = analyzer.calculateTreeBreadth(null);
      expect(breadth).toBe(0);
    });
  });

  describe('assessCoupling', () => {
    test('returns low coupling for components with few dependencies', () => {
      const resultWithLowCoupling = {
        components: {
          Component1: {
            dependencies: { components: ['ComponentA'] }
          },
          Component2: {
            dependencies: { components: [] }
          },
          Component3: {
            dependencies: { components: ['ComponentB'] }
          }
        }
      };

      const coupling = analyzer.assessCoupling(resultWithLowCoupling);
      expect(coupling).toBe('low'); // Average: (1 + 0 + 1) / 3 = 0.67 < 2
    });

    test('returns medium coupling for components with moderate dependencies', () => {
      const resultWithMediumCoupling = {
        components: {
          Component1: {
            dependencies: { components: ['ComponentA', 'ComponentB', 'ComponentC'] }
          },
          Component2: {
            dependencies: { components: ['ComponentD', 'ComponentE'] }
          },
          Component3: {
            dependencies: { components: ['ComponentF', 'ComponentG', 'ComponentH', 'ComponentI'] }
          }
        }
      };

      const coupling = analyzer.assessCoupling(resultWithMediumCoupling);
      expect(coupling).toBe('medium'); // Average: (3 + 2 + 4) / 3 = 3 (2 <= 3 < 5)
    });

    test('returns high coupling for components with many dependencies', () => {
      const resultWithHighCoupling = {
        components: {
          Component1: {
            dependencies: { 
              components: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] 
            }
          },
          Component2: {
            dependencies: { 
              components: ['I', 'J', 'K', 'L', 'M'] 
            }
          }
        }
      };

      const coupling = analyzer.assessCoupling(resultWithHighCoupling);
      expect(coupling).toBe('high'); // Average: (8 + 5) / 2 = 6.5 >= 5
    });
  });

  describe('countResponsibilities', () => {
    test('counts responsibilities including event handling', () => {
      const componentWithEvents = {
        apiCalls: [{ endpoint: '/api/data' }],
        state: { local: ['count'], global: ['theme'] },
        events: {
          emitted: ['userClick', 'dataLoaded'],
          handled: ['onSubmit']
        }
      };

      const responsibilities = analyzer.countResponsibilities(componentWithEvents);
      expect(responsibilities).toBe(4); // API calls + state + UI rendering + event handling
    });

    test('counts responsibilities without events', () => {
      const componentWithoutEvents = {
        apiCalls: [{ endpoint: '/api/data' }],
        state: { local: ['count'] },
        events: { emitted: [], handled: [] }
      };

      const responsibilities = analyzer.countResponsibilities(componentWithoutEvents);
      expect(responsibilities).toBe(3); // API calls + state management + UI rendering (no event handling)
    });

    test('counts responsibilities with only emitted events', () => {
      const componentWithEmittedEvents = {
        events: {
          emitted: ['dataChanged'],
          handled: []
        }
      };

      const responsibilities = analyzer.countResponsibilities(componentWithEmittedEvents);
      expect(responsibilities).toBe(2); // UI rendering + event handling
    });

    test('counts responsibilities with only handled events', () => {
      const componentWithHandledEvents = {
        events: {
          emitted: [],
          handled: ['onClick', 'onSubmit']
        }
      };

      const responsibilities = analyzer.countResponsibilities(componentWithHandledEvents);
      expect(responsibilities).toBe(2); // UI rendering + event handling
    });
  });

  describe('enhancePerformanceAnalysis', () => {
    test('enhances performance analysis', () => {
      const performance = analyzer.enhancePerformanceAnalysis(mockAIResult);
      
      expect(performance).toBeDefined();
      expect(performance.categories).toBeDefined();
      expect(performance.totalIssues).toBeDefined();
      expect(performance.optimizationOpportunities).toBeDefined();
    });

    test('identifies performance issues', () => {
      const resultWithPerformanceIssues = {
        ...mockAIResult,
        components: {
          HeavyComponent: {
            performance: { rerendersRisk: 'high', heavyOperations: ['computation'] },
            rendering: { lists: true, conditional: true }
          }
        }
      };
      
      const performance = analyzer.enhancePerformanceAnalysis(resultWithPerformanceIssues);
      expect(performance.categories.rerendering).toBeGreaterThan(0);
      expect(performance.categories.heavyOperations).toBeGreaterThan(0);
    });

    test('identifies memory leak risks', () => {
      const resultWithMemoryLeaks = {
        ...mockAIResult,
        components: {
          LeakyComponent: {
            apiCalls: [{ trigger: 'useEffect' }]
          }
        }
      };
      
      const performance = analyzer.enhancePerformanceAnalysis(resultWithMemoryLeaks);
      expect(performance.categories.memoryLeaks).toBe(1);
    });
  });

  describe('generateRecommendations', () => {
    test('generates basic recommendations', () => {
      const recommendations = analyzer.generateRecommendations(mockAIResult);
      
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('includes recommendations for unused components', () => {
      const resultWithIssues = {
        ...mockAIResult,
        unusedComponents: ['OldComponent', 'AnotherOldComponent']
      };
      
      const recommendations = analyzer.generateRecommendations(resultWithIssues);
      
      const cleanupRec = recommendations.find(rec => 
        rec.title && rec.title.includes('Unused Components')
      );
      expect(cleanupRec).toBeDefined();
      expect(cleanupRec.priority).toBe('low');
      expect(cleanupRec.category).toBe('maintenance');
    });

    test('includes recommendations for circular dependencies', () => {
      const resultWithCircularDeps = {
        ...mockAIResult,
        circularDependencies: [['A', 'B', 'A']]
      };
      
      const recommendations = analyzer.generateRecommendations(resultWithCircularDeps);
      
      const circularRec = recommendations.find(rec => 
        rec.title && rec.title.includes('Circular Dependencies')
      );
      expect(circularRec).toBeDefined();
      expect(circularRec.priority).toBe('high');
    });

    test('includes recommendations for prop drilling', () => {
      const resultWithPropDrilling = {
        ...mockAIResult,
        propDrilling: [{ prop: 'data', depth: 5 }]
      };
      
      const recommendations = analyzer.generateRecommendations(resultWithPropDrilling);
      
      const propDrillingRec = recommendations.find(rec => 
        rec.title && rec.title.includes('Prop Drilling')
      );
      expect(propDrillingRec).toBeDefined();
      expect(propDrillingRec.priority).toBe('medium');
    });

    test('includes recommendations for performance issues', () => {
      const resultWithPerfIssues = {
        ...mockAIResult,
        components: {
          SlowComponent: {
            performance: { rerendersRisk: 'high' }
          }
        }
      };
      
      const recommendations = analyzer.generateRecommendations(resultWithPerfIssues);
      
      const perfRec = recommendations.find(rec => 
        rec.title && rec.title.includes('Component Rendering')
      );
      expect(perfRec).toBeDefined();
      expect(perfRec.category).toBe('performance');
    });
  });

  describe('different frameworks', () => {
    test('works with React framework', () => {
      const reactAnalyzer = new ComponentAnalyzer('react');
      expect(reactAnalyzer.framework).toBe('react');
    });

    test('works with Vue framework', () => {
      const vueAnalyzer = new ComponentAnalyzer('vue');
      expect(vueAnalyzer.framework).toBe('vue');
    });

    test('works with Angular framework', () => {
      const angularAnalyzer = new ComponentAnalyzer('angular');
      expect(angularAnalyzer.framework).toBe('angular');
    });

    test('works with Svelte framework', () => {
      const svelteAnalyzer = new ComponentAnalyzer('svelte');
      expect(svelteAnalyzer.framework).toBe('svelte');
    });
  });
});