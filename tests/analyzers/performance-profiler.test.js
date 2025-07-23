const PerformanceProfiler = require('../../lib/analyzers/performance-profiler');

describe('PerformanceProfiler', () => {
  let profiler;
  let mockProjectInfo;
  let mockFiles;

  beforeEach(() => {
    profiler = new PerformanceProfiler('react', { 
      enableMetrics: true,
      monitorPerformance: true 
    });
    
    mockProjectInfo = {
      framework: 'react',
      dependencies: { total: 25 }
    };

    mockFiles = [
      {
        path: '/src/components/HeavyComponent.jsx',
        content: `
import React, { useState, useEffect } from 'react';
import { heavyCalculation } from '../utils/calculations';

const HeavyComponent = ({ data }) => {
  const [state, setState] = useState([]);

  useEffect(() => {
    const result = heavyCalculation(data);
    setState(result);
  }, [data]);

  return (
    <div>
      {state.map((item, index) => (
        <div key={index}>{item.value}</div>
      ))}
    </div>
  );
};

export default HeavyComponent;
        `,
        size: 512,
        lines: 20
      },
      {
        path: '/src/api/users.js',
        content: `
const express = require('express');

const router = express.Router();

router.get('/users', async (req, res) => {
  // Potentially slow endpoint
  const users = await User.find({}).populate('posts');
  res.json(users);
});

router.get('/users/:id/posts', async (req, res) => {
  const posts = await Post.find({ userId: req.params.id });
  res.json(posts);
});

module.exports = router;
        `,
        size: 256,
        lines: 15
      }
    ];
  });

  describe('constructor', () => {
    test('should initialize with framework and options', () => {
      expect(profiler.framework).toBe('react');
      expect(profiler.options.enableMetrics).toBe(true);
      expect(profiler.performancePatterns).toBeDefined();
      expect(profiler.bundleAnalyzer).toBeDefined();
      expect(profiler.runtimeAnalyzer).toBeDefined();
      expect(profiler.memoryAnalyzer).toBeDefined();
    });
  });

  describe('profile', () => {
    test('should perform comprehensive performance analysis', async () => {
      const mockAIResult = {
        bundle: { estimatedSize: '250KB' },
        rendering: { heavyComponents: [] },
        api: { slowEndpoints: [] },
        memory: { potentialLeaks: [] }
      };

      const result = await profiler.profile(mockAIResult, mockFiles, mockProjectInfo);

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.bundleAnalysis).toBeDefined();
      expect(result.runtimeAnalysis).toBeDefined();
      expect(result.memoryAnalysis).toBeDefined();
      expect(result.performanceMetrics).toBeDefined();
      expect(result.bottlenecks).toBeDefined();
      expect(result.optimizationOpportunities).toBeDefined();
      expect(result.performanceScore).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('should handle empty AI result', async () => {
      const result = await profiler.profile(null, mockFiles, mockProjectInfo);

      expect(result.bundle.estimatedSize).toBe('unknown');
      expect(result.performanceScore).toBe(0);
      expect(result.recommendations).toContain('Performance analysis could not be performed');
    });

    test('should handle AI result with error', async () => {
      const errorResult = { error: 'Performance analysis failed' };
      const result = await profiler.profile(errorResult, mockFiles, mockProjectInfo);

      expect(result.metadata.error).toBe('Performance analysis failed');
    });
  });

  describe('generateMetadata', () => {
    test('should generate comprehensive metadata', () => {
      const metadata = profiler.generateMetadata(mockFiles, mockProjectInfo);

      expect(metadata.totalFiles).toBe(mockFiles.length);
      expect(metadata.analysisDate).toBeDefined();
      expect(metadata.framework).toBe('react');
      expect(metadata.projectSize).toBeDefined();
      expect(metadata.complexity).toBeDefined();
      expect(metadata.dependencies).toBe(25);
      expect(metadata.analysisScope).toBeDefined();
    });

    test('should calculate project size correctly', () => {
      const size = profiler.calculateProjectSize(mockFiles);

      expect(size.bytes).toBeGreaterThan(0);
      expect(size.lines).toBeGreaterThan(0);
      expect(size.files).toBe(mockFiles.length);
      expect(size.avgFileSize).toBeDefined();
      expect(size.avgLinesPerFile).toBeDefined();
    });
  });

  describe('estimateComplexity', () => {
    test('should estimate complexity based on code patterns', () => {
      const complexity = profiler.estimateComplexity(mockFiles);

      expect(['low', 'medium', 'high']).toContain(complexity);
    });

    test('should detect various complexity indicators', () => {
      const complexFile = {
        content: `
          for (let i = 0; i < items.length; i++) {
            if (items[i].active) {
              while (processing) {
                items[i].data.forEach(item => {
                  if (condition) {
                    switch (item.type) {
                      case 'complex':
                        class Handler {
                          async process() {
                            await this.callback();
                          }
                        }
                        break;
                    }
                  }
                });
              }
            }
          }
        `
      };

      const complexity = profiler.estimateComplexity([complexFile]);
      expect(complexity).toBe('high');
    });
  });

  describe('calculatePerformanceMetrics', () => {
    test('should calculate comprehensive performance metrics', () => {
      const mockAIResult = {
        bundle: { estimatedSize: '300KB' },
        rendering: { heavyComponents: [{ name: 'Heavy' }] },
        api: { slowEndpoints: [{ endpoint: '/slow' }] }
      };

      const metrics = profiler.calculatePerformanceMetrics(mockAIResult, mockFiles);

      expect(metrics.loadTime).toBeDefined();
      expect(metrics.bundleSize).toBeDefined();
      expect(metrics.renderTime).toBeDefined();
      expect(metrics.apiResponseTime).toBeDefined();
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.cacheEfficiency).toBeDefined();
      expect(metrics.optimizationLevel).toBeDefined();
    });
  });

  describe('estimateLoadTime', () => {
    test('should estimate load time based on file characteristics', () => {
      const loadTime = profiler.estimateLoadTime(mockFiles);

      expect(loadTime.estimated).toMatch(/\d+ms/);
      expect(['fast', 'moderate', 'slow']).toContain(loadTime.category);
      expect(loadTime.factors).toBeDefined();
      expect(loadTime.factors.totalSize).toBeDefined();
      expect(loadTime.factors.jsFiles).toBeDefined();
      expect(loadTime.factors.cssFiles).toBeDefined();
    });

    test('should categorize load time correctly', () => {
      const fastFiles = [{ size: 100, extension: '.js' }];
      const slowFiles = Array(100).fill({ size: 50000, extension: '.js' });

      const fastLoadTime = profiler.estimateLoadTime(fastFiles);
      const slowLoadTime = profiler.estimateLoadTime(slowFiles);

      expect(fastLoadTime.category).toBe('fast');
      expect(slowLoadTime.category).toBe('slow');
    });
  });

  describe('estimateBundleSize', () => {
    test('should estimate bundle size with compression', () => {
      const bundleSize = profiler.estimateBundleSize(mockFiles);

      expect(bundleSize.raw).toMatch(/\d+KB/);
      expect(bundleSize.minified).toMatch(/\d+KB/);
      expect(bundleSize.gzipped).toMatch(/\d+KB/);
      expect(['small', 'medium', 'large']).toContain(bundleSize.category);
    });

    test('should only consider JS files', () => {
      const mixedFiles = [
        { extension: '.js', size: 1000 },
        { extension: '.css', size: 1000 },
        { extension: '.jsx', size: 1000 },
        { extension: '.html', size: 1000 }
      ];

      const bundleSize = profiler.estimateBundleSize(mixedFiles);
      // Should only include .js and .jsx files
      expect(bundleSize.category).toBe('small'); // Only 2KB of JS
    });
  });

  describe('assessCacheEfficiency', () => {
    test('should assess caching patterns in code', () => {
      const filesWithCache = [{
        content: `
          import { useMemo, useCallback } from 'react';
          
          const Component = ({ data }) => {
            const memoizedData = useMemo(() => processData(data), [data]);
            const memoizedCallback = useCallback(() => {}, []);
            
            return React.memo(() => <div>{memoizedData}</div>);
          };
        `
      }];

      const cacheEfficiency = profiler.assessCacheEfficiency(filesWithCache);

      expect(cacheEfficiency.score).toBeGreaterThan(50);
      expect(cacheEfficiency.level).toBe('good');
      expect(cacheEfficiency.recommendations).toHaveLength(0);
    });

    test('should recommend caching improvements', () => {
      const filesWithoutCache = [{
        content: `
          const Component = ({ data }) => {
            const processedData = expensiveOperation(data);
            return <div>{processedData}</div>;
          };
        `
      }];

      const cacheEfficiency = profiler.assessCacheEfficiency(filesWithoutCache);

      expect(cacheEfficiency.score).toBeLessThan(70);
      expect(cacheEfficiency.level).toBe('poor');
      expect(cacheEfficiency.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('identifyBottlenecks', () => {
    test('should identify various types of bottlenecks', () => {
      const mockAIResult = {
        bundle: { 
          largeDependencies: [
            { name: 'heavy-lib', size: '500KB' },
            { name: 'another-lib', size: '300KB' }
          ]
        },
        rendering: {
          heavyComponents: [
            { name: 'ComplexChart', complexity: 15 },
            { name: 'DataTable', complexity: 12 }
          ]
        },
        api: {
          slowEndpoints: [
            { endpoint: '/api/heavy-query', avgTime: '2.5s' }
          ]
        },
        memory: {
          potentialLeaks: [
            { file: '/src/leaky-component.js', type: 'event-listener' }
          ]
        }
      };

      const bottlenecks = profiler.identifyBottlenecks(mockAIResult, mockFiles);

      expect(bottlenecks.length).toBe(4);
      
      const bundleBottleneck = bottlenecks.find(b => b.type === 'Bundle Size');
      expect(bundleBottleneck).toBeDefined();
      expect(bundleBottleneck.severity).toBe('high');
      
      const renderingBottleneck = bottlenecks.find(b => b.type === 'Rendering Performance');
      expect(renderingBottleneck).toBeDefined();
      
      const apiBottleneck = bottlenecks.find(b => b.type === 'API Performance');
      expect(apiBottleneck).toBeDefined();
      
      const memoryBottleneck = bottlenecks.find(b => b.type === 'Memory Usage');
      expect(memoryBottleneck).toBeDefined();
    });

    test('should provide solutions for bottlenecks', () => {
      const mockAIResult = {
        bundle: { largeDependencies: [{ name: 'test', size: '100KB' }] }
      };

      const bottlenecks = profiler.identifyBottlenecks(mockAIResult, mockFiles);
      const bundleBottleneck = bottlenecks.find(b => b.type === 'Bundle Size');

      expect(bundleBottleneck.solution).toBe('Code splitting and tree shaking');
    });
  });

  describe('findOptimizationOpportunities', () => {
    test('should find immediate optimization opportunities', () => {
      const filesWithDeadCode = [{
        path: '/test.js',
        content: `
          function usedFunction() { return true; }
          function unusedFunction() { return false; } // This should be detected as unused
          
          export { usedFunction };
        `
      }];

      const opportunities = profiler.findOptimizationOpportunities({}, filesWithDeadCode);

      const deadCodeOpp = opportunities.immediate.find(o => o.type === 'Dead Code Elimination');
      expect(deadCodeOpp).toBeDefined();
      expect(deadCodeOpp.effort).toBe('low');
    });

    test('should suggest code splitting for projects without it', () => {
      const mockAIResult = { bundle: { codeSplitting: [] } };

      const opportunities = profiler.findOptimizationOpportunities(mockAIResult, mockFiles);

      const codeSplittingOpp = opportunities.shortTerm.find(o => o.type === 'Code Splitting');
      expect(codeSplittingOpp).toBeDefined();
      expect(codeSplittingOpp.impact).toBe('Faster Initial Load');
    });

    test('should suggest component memoization', () => {
      const mockAIResult = {
        rendering: {
          heavyComponents: [
            { name: 'Heavy1', performance: { memoized: false } },
            { name: 'Heavy2', performance: { memoized: false } }
          ]
        }
      };

      const opportunities = profiler.findOptimizationOpportunities(mockAIResult, mockFiles);

      const memoizationOpp = opportunities.shortTerm.find(o => o.type === 'Component Memoization');
      expect(memoizationOpp).toBeDefined();
      expect(memoizationOpp.components).toEqual(['Heavy1', 'Heavy2']);
    });

    test('should suggest long-term optimizations', () => {
      const opportunities = profiler.findOptimizationOpportunities({}, mockFiles);

      const serviceWorkerOpp = opportunities.longTerm.find(o => o.type === 'Service Worker Implementation');
      expect(serviceWorkerOpp).toBeDefined();
      expect(serviceWorkerOpp.effort).toBe('high');
      expect(serviceWorkerOpp.benefits).toContain('Asset caching');
    });

    test('should suggest framework-specific optimizations', () => {
      const reactProfiler = new PerformanceProfiler('react');
      const opportunities = reactProfiler.findOptimizationOpportunities({}, mockFiles);

      const ssrOpp = opportunities.longTerm.find(o => o.type.includes('Server-Side Rendering'));
      expect(ssrOpp).toBeDefined();

      const nextProfiler = new PerformanceProfiler('nextjs');
      const nextOpportunities = nextProfiler.findOptimizationOpportunities({}, mockFiles);
      
      const nextSsrOpp = nextOpportunities.longTerm.find(o => o.type.includes('Server-Side Rendering'));
      expect(nextSsrOpp).toBeDefined();
    });
  });

  describe('findUnusedCode', () => {
    test('should detect unused functions', () => {
      const files = [{
        path: '/test.js',
        content: `
          function used() { return 'used'; }
          function unused() { return 'unused'; }
          
          console.log(used());
        `
      }];

      const unusedCode = profiler.findUnusedCode(files);
      expect(unusedCode.length).toBeGreaterThan(0);
      
      const unusedFunction = unusedCode.find(u => u.name === 'unused');
      expect(unusedFunction).toBeDefined();
      expect(unusedFunction.type).toBe('function');
    });

    test('should limit results to prevent overwhelming output', () => {
      const manyUnusedFunctions = Array.from({ length: 20 }, (_, i) => 
        `function unused${i}() { return ${i}; }`
      ).join('\n');

      const files = [{ path: '/test.js', content: manyUnusedFunctions }];
      
      const unusedCode = profiler.findUnusedCode(files);
      expect(unusedCode.length).toBeLessThanOrEqual(10);
    });
  });

  describe('calculatePerformanceScore', () => {
    test('should calculate score based on various factors', () => {
      const perfectResult = {
        bundle: { largeDependencies: [] },
        rendering: { heavyComponents: [] },
        api: { slowEndpoints: [] },
        memory: { potentialLeaks: [] },
        optimization: { immediate: [] }
      };

      const perfectScore = profiler.calculatePerformanceScore(perfectResult);
      expect(perfectScore).toBe(100);
    });

    test('should deduct points for performance issues', () => {
      const problematicResult = {
        bundle: { largeDependencies: [{ name: 'heavy' }, { name: 'another' }] },
        rendering: { heavyComponents: [{ name: 'heavy1' }] },
        api: { slowEndpoints: [{ endpoint: '/slow' }] },
        memory: { potentialLeaks: [{ file: 'leaky.js' }] }
      };

      const score = profiler.calculatePerformanceScore(problematicResult);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    test('should add bonus points for optimizations', () => {
      const optimizedResult = {
        bundle: { 
          largeDependencies: [],
          codeSplitting: [{ type: 'route-based' }]
        },
        rendering: { heavyComponents: [] },
        api: { slowEndpoints: [] },
        memory: { potentialLeaks: [] },
        optimization: { immediate: [] }
      };

      const optimizedScore = profiler.calculatePerformanceScore(optimizedResult);
      expect(optimizedScore).toBe(100); // Perfect score + bonus, capped at 100
    });
  });

  describe('generatePerformanceRecommendations', () => {
    test('should generate critical recommendations for poor performance', () => {
      const poorResult = {
        bundle: { largeDependencies: Array(5).fill({ name: 'heavy' }) },
        rendering: { heavyComponents: Array(3).fill({ name: 'heavy' }) },
        api: { slowEndpoints: Array(2).fill({ endpoint: '/slow' }) },
        memory: { potentialLeaks: Array(2).fill({ file: 'leak.js' }) }
      };

      const recommendations = profiler.generatePerformanceRecommendations(poorResult, mockFiles);

      const criticalRec = recommendations.find(r => r.priority === 'high');
      expect(criticalRec).toBeDefined();
      expect(criticalRec.category).toBe('performance');
    });

    test('should recommend bundle optimization', () => {
      const bundleResult = {
        bundle: { largeDependencies: [{ name: 'huge-lib' }] }
      };

      const recommendations = profiler.generatePerformanceRecommendations(bundleResult, mockFiles);

      const bundleRec = recommendations.find(r => r.category === 'bundle');
      expect(bundleRec).toBeDefined();
      expect(bundleRec.packages).toEqual(['huge-lib']);
    });

    test('should recommend component optimization', () => {
      const renderingResult = {
        rendering: { 
          heavyComponents: [
            { name: 'Chart' }, 
            { name: 'DataGrid' }
          ] 
        }
      };

      const recommendations = profiler.generatePerformanceRecommendations(renderingResult, mockFiles);

      const renderingRec = recommendations.find(r => r.category === 'rendering');
      expect(renderingRec).toBeDefined();
      expect(renderingRec.techniques).toContain('React.memo');
    });

    test('should recommend code splitting', () => {
      const noSplittingResult = { bundle: { codeSplitting: [] } };

      const recommendations = profiler.generatePerformanceRecommendations(noSplittingResult, mockFiles);

      const splittingRec = recommendations.find(r => r.category === 'optimization');
      expect(splittingRec).toBeDefined();
      expect(splittingRec.title).toBe('Implement Code Splitting');
    });

    test('should provide framework-specific recommendations', () => {
      const reactProfiler = new PerformanceProfiler('react');
      const recommendations = reactProfiler.generatePerformanceRecommendations(
        { bundle: { codeSplitting: [] } }, 
        mockFiles
      );

      const codeSplittingRec = recommendations.find(r => r.category === 'optimization');
      expect(codeSplittingRec.implementation).toBe('Use React.lazy() and Suspense');
    });
  });

  describe('BundleAnalyzer', () => {
    test('should analyze bundle characteristics', async () => {
      const bundleAnalyzer = profiler.bundleAnalyzer;
      const analysis = await bundleAnalyzer.analyze(mockFiles, mockProjectInfo);

      expect(analysis.totalSize).toMatch(/\d+KB/);
      expect(analysis.fileCount).toBeDefined();
      expect(analysis.largeDependencies).toBeDefined();
      expect(analysis.codeSplitting).toBeDefined();
    });

    test('should identify large dependencies', () => {
      const bundleAnalyzer = profiler.bundleAnalyzer;
      const projectWithLargeDeps = {
        dependencies: {
          dependencies: {
            'lodash': '^4.0.0',
            'moment': '^2.0.0',
            'three': '^0.140.0'
          }
        }
      };

      const largeDeps = bundleAnalyzer.findLargeDependencies(projectWithLargeDeps);
      expect(largeDeps.length).toBeGreaterThan(0);
      
      const threeDep = largeDeps.find(d => d.name === 'three');
      expect(threeDep).toBeDefined();
      expect(threeDep.estimatedSize).toBe('580KB');
    });

    test('should suggest alternatives for large dependencies', () => {
      const bundleAnalyzer = profiler.bundleAnalyzer;
      const alternatives = bundleAnalyzer.suggestAlternatives('lodash');
      
      expect(alternatives).toContain('Native ES6 methods');
      expect(alternatives).toContain('lodash-es');
    });

    test('should assess code splitting implementation', () => {
      const bundleAnalyzer = profiler.bundleAnalyzer;
      const filesWithSplitting = [{
        content: `
          const LazyComponent = React.lazy(() => import('./Component'));
          const dynamicImport = () => import('./utils');
        `,
        path: '/app.js'
      }];

      const codeSplitting = bundleAnalyzer.assessCodeSplitting(filesWithSplitting);
      expect(codeSplitting.length).toBe(2);
      expect(codeSplitting[0].type).toBe('React.lazy');
      expect(codeSplitting[1].type).toBe('Dynamic import');
    });
  });

  describe('RuntimeAnalyzer', () => {
    test('should analyze runtime patterns', async () => {
      const runtimeAnalyzer = profiler.runtimeAnalyzer;
      const analysis = await runtimeAnalyzer.analyze(mockFiles, 'react');

      expect(analysis.renderingPatterns).toBeDefined();
      expect(analysis.eventHandlers).toBeDefined();
      expect(analysis.asyncOperations).toBeDefined();
      expect(analysis.domManipulation).toBeDefined();
    });

    test('should analyze React rendering patterns', () => {
      const runtimeAnalyzer = profiler.runtimeAnalyzer;
      const reactFiles = [{
        extension: '.jsx',
        content: `
          import React from 'react';
          const MemoComponent = React.memo(() => <div>Memoized</div>);
          const RegularComponent = () => {
            const [state, setState] = useState();
            useEffect(() => {}, []);
            return <div>Regular</div>;
          };
        `
      }];

      const patterns = runtimeAnalyzer.analyzeReactRendering(reactFiles);
      expect(patterns.components).toBe(1);
      expect(patterns.memoizedComponents).toBe(1);
      expect(patterns.hooksUsage).toBe(1);
    });

    test('should find unnecessary renders', () => {
      const runtimeAnalyzer = profiler.runtimeAnalyzer;
      const filesWithRenderIssues = [{
        content: `
          const Component = () => {
            setState(prevState => prevState); // Unnecessary update
            return <div>Component</div>;
          };
        `,
        path: '/component.jsx'
      }];

      const issues = runtimeAnalyzer.findUnnecessaryRenders(filesWithRenderIssues);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].issue).toContain('unnecessary state update');
    });

    test('should analyze event handlers', () => {
      const runtimeAnalyzer = profiler.runtimeAnalyzer;
      const filesWithHandlers = [{
        content: `
          element.addEventListener('click', handler);
          const Component = () => <button onClick={handleClick}>Click</button>;
          form.onSubmit = handleSubmit;
          
          // Cleanup
          element.removeEventListener('click', handler);
          useEffect(() => {
            return () => cleanup();
          }, []);
        `
      }];

      const handlers = runtimeAnalyzer.analyzeEventHandlers(filesWithHandlers);
      expect(handlers.totalHandlers).toBeGreaterThan(0);
      expect(handlers.withCleanup).toBeGreaterThan(0);
      expect(handlers.cleanupRatio).toBeGreaterThan(0);
    });

    test('should analyze async operations', () => {
      const runtimeAnalyzer = profiler.runtimeAnalyzer;
      const filesWithAsync = [{
        content: `
          async function fetchData() {
            try {
              const result = await api.get('/data');
              return result.data;
            } catch (error) {
              console.error(error);
            }
          }
          
          promise.then(result => {
            // Handle result
          }).catch(error => {
            // Handle error
          });
        `
      }];

      const asyncOps = runtimeAnalyzer.analyzeAsyncOperations(filesWithAsync);
      expect(asyncOps.totalAsync).toBeGreaterThan(0);
      expect(asyncOps.withErrorHandling).toBeGreaterThan(0);
      expect(asyncOps.errorHandlingRatio).toBeGreaterThan(0);
    });

    test('should analyze DOM manipulation', () => {
      const runtimeAnalyzer = profiler.runtimeAnalyzer;
      const filesWithDOM = [{
        content: `
          const element = document.getElementById('myElement');
          element.innerHTML = '<span>Content</span>';
          document.querySelector('.class').appendChild(newElement);
          window.location.href = '/new-page';
        `
      }];

      const domAnalysis = runtimeAnalyzer.analyzeDOMManipulation(filesWithDOM);
      expect(domAnalysis.totalManipulation).toBeGreaterThan(0);
      expect(domAnalysis.directManipulation).toBeGreaterThan(0);
      expect(domAnalysis.recommendation).toContain('framework patterns');
    });
  });

  describe('MemoryAnalyzer', () => {
    test('should analyze memory patterns', async () => {
      const memoryAnalyzer = profiler.memoryAnalyzer;
      const analysis = await memoryAnalyzer.analyze(mockFiles, 'react');

      expect(analysis.potentialLeaks).toBeDefined();
      expect(analysis.memoryPatterns).toBeDefined();
      expect(analysis.garbageCollection).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
    });

    test('should detect potential memory leaks', () => {
      const memoryAnalyzer = profiler.memoryAnalyzer;
      const leakyFiles = [{
        content: `
          setInterval(() => { console.log('tick'); }, 1000);
          setTimeout(() => { console.log('timeout'); }, 5000);
          element.addEventListener('click', handler);
        `,
        path: '/leaky.js'
      }];

      const leaks = memoryAnalyzer.findPotentialLeaks(leakyFiles);
      expect(leaks.length).toBe(3);
      
      const intervalLeak = leaks.find(l => l.type === 'interval');
      expect(intervalLeak).toBeDefined();
      expect(intervalLeak.solution).toContain('clearInterval');
    });

    test('should count closures', () => {
      const memoryAnalyzer = profiler.memoryAnalyzer;
      const filesWithClosures = [{
        content: `
          function outer() {
            return function inner() {
              return () => console.log('nested');
            };
          }
          
          const arrow = () => {
            return () => 'double arrow';
          };
        `
      }];

      const closures = memoryAnalyzer.countClosures(filesWithClosures);
      expect(closures.count).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(closures.risk);
    });

    test('should find large objects', () => {
      const memoryAnalyzer = profiler.memoryAnalyzer;
      const filesWithLargeArrays = [{
        content: `
          const bigArray = new Array(5000);
          const anotherBig = Array.from({length: 10000});
          const small = new Array(100);
        `,
        path: '/arrays.js'
      }];

      const largeObjects = memoryAnalyzer.findLargeObjects(filesWithLargeArrays);
      expect(largeObjects.length).toBe(2); // Only arrays > 1000
      expect(largeObjects[0].type).toBe('large array');
      expect(parseInt(largeObjects[0].size)).toBeGreaterThan(1000);
    });

    test('should generate memory recommendations', () => {
      const memoryAnalyzer = profiler.memoryAnalyzer;
      const filesWithIssues = [{
        content: `
          setInterval(() => {}, 1000); // Memory leak
          function outer() {
            return function() { return function() {}; }; // High closure usage
          }
        `,
        path: '/issues.js'
      }];

      const recommendations = memoryAnalyzer.generateMemoryRecommendations(filesWithIssues);
      
      const leakRec = recommendations.find(r => r.title === 'Fix Memory Leaks');
      expect(leakRec).toBeDefined();
      expect(leakRec.priority).toBe('high');
    });
  });

  describe('assessOptimizationLevel', () => {
    test('should add score when codeSplitting length > 0', () => {
      const aiResultWithSplitting = {
        bundle: { codeSplitting: [{ type: 'route-based' }] },
        rendering: { unnecessaryRenders: ['some-render'] },
        memory: { potentialLeaks: ['some-leak'] }
      };

      const optimization = profiler.assessOptimizationLevel(aiResultWithSplitting);
      expect(optimization.score).toBeGreaterThan(0);
      expect(optimization.optimizations.codeSplitting).toBe(true);
    });

    test('should add score when unnecessaryRenders length === 0', () => {
      const aiResultWithoutRenderIssues = {
        bundle: { codeSplitting: [] },
        rendering: { unnecessaryRenders: [] },
        memory: { potentialLeaks: ['some-leak'] }
      };

      const optimization = profiler.assessOptimizationLevel(aiResultWithoutRenderIssues);
      expect(optimization.score).toBeGreaterThan(0);
      expect(optimization.optimizations.memoization).toBe(true);
    });

    test('should handle complete optimization scenario', () => {
      const fullyOptimizedResult = {
        bundle: { codeSplitting: [{ type: 'route-based' }] },
        rendering: { unnecessaryRenders: [] },
        memory: { potentialLeaks: [] }
      };

      const optimization = profiler.assessOptimizationLevel(fullyOptimizedResult);
      expect(optimization.score).toBe(100);
      expect(optimization.level).toBe('good');
    });
  });

  describe('detectSplittingType', () => {
    test('should detect React.lazy', () => {
      const bundleAnalyzer = profiler.bundleAnalyzer;
      const content = 'const LazyComponent = React.lazy(() => import("./Component"));';
      
      const type = bundleAnalyzer.detectSplittingType(content);
      expect(type).toBe('React.lazy');
    });

    test('should detect Dynamic import', () => {
      const bundleAnalyzer = profiler.bundleAnalyzer;
      const content = 'const module = import("./module");';
      
      const type = bundleAnalyzer.detectSplittingType(content);
      expect(type).toBe('Dynamic import');
    });

    test('should detect Loadable components', () => {
      const bundleAnalyzer = profiler.bundleAnalyzer;
      const content = 'const LoadableComponent = loadable(() => {});';
      
      const type = bundleAnalyzer.detectSplittingType(content);
      expect(type).toBe('Loadable components');
    });

    test('should return Unknown for unrecognized patterns', () => {
      const bundleAnalyzer = profiler.bundleAnalyzer;
      const content = 'const regularComponent = () => <div>Hello</div>;';
      
      const type = bundleAnalyzer.detectSplittingType(content);
      expect(type).toBe('Unknown');
    });
  });

  describe('assessCodeSplitting with loadable', () => {
    test('should detect loadable components', () => {
      const bundleAnalyzer = profiler.bundleAnalyzer;
      const filesWithLoadable = [{
        content: `
          import loadable from '@loadable/component';
          
          const LoadableHome = loadable(() => import('../pages/Home'));
          const LoadableAbout = loadable(() => import('../pages/About'));
        `,
        path: '/routes.js'
      }];

      const codeSplitting = bundleAnalyzer.assessCodeSplitting(filesWithLoadable);
      const loadableIndicator = codeSplitting.find(c => c.type === 'Loadable components');
      expect(loadableIndicator).toBeDefined();
      expect(loadableIndicator.file).toBe('/routes.js');
    });
  });

  describe('findCircularReferences', () => {
    test('should detect parent-child references', () => {
      const memoryAnalyzer = profiler.memoryAnalyzer;
      const filesWithCircularRefs = [{
        content: `
          class Component {
            constructor(parent) {
              this.parent = parent;
              this.element = document.createElement('div');
            }
          }
        `,
        path: '/circular-ref.js'
      }];

      const references = memoryAnalyzer.findCircularReferences(filesWithCircularRefs);
      expect(references.length).toBe(1);
      expect(references[0].type).toBe('parent-child reference');
      expect(references[0].risk).toBe('medium');
      expect(references[0].file).toBe('/circular-ref.js');
    });

    test('should not detect references without parent pattern', () => {
      const memoryAnalyzer = profiler.memoryAnalyzer;
      const filesWithoutCircularRefs = [{
        content: `
          class Component {
            constructor() {
              this.element = document.createElement('div');
            }
          }
        `,
        path: '/normal.js'
      }];

      const references = memoryAnalyzer.findCircularReferences(filesWithoutCircularRefs);
      expect(references.length).toBe(0);
    });
  });

  describe('generateMemoryRecommendations with high closure risk', () => {
    test('should recommend closure optimization for high risk', () => {
      const memoryAnalyzer = profiler.memoryAnalyzer;
      
      // Create files with many closures to trigger high risk
      const filesWithManyClosures = [{
        content: `
          function outer1() { return function() { return () => 'nested'; }; }
          function outer2() { return function() { return () => 'nested'; }; }
          function outer3() { return function() { return () => 'nested'; }; }
          function outer4() { return function() { return () => 'nested'; }; }
          function outer5() { return function() { return () => 'nested'; }; }
          function outer6() { return function() { return () => 'nested'; }; }
          function outer7() { return function() { return () => 'nested'; }; }
          function outer8() { return function() { return () => 'nested'; }; }
          const arrow1 = () => () => () => 'triple';
          const arrow2 = () => () => () => 'triple';
          const arrow3 = () => () => () => 'triple';
        `,
        path: '/closures.js'
      }];

      const recommendations = memoryAnalyzer.generateMemoryRecommendations(filesWithManyClosures);
      const closureRec = recommendations.find(r => r.title === 'Optimize Closure Usage');
      
      expect(closureRec).toBeDefined();
      expect(closureRec.priority).toBe('medium');
      expect(closureRec.description).toContain('High number of closures');
      expect(closureRec.actions).toContain('Review closure necessity');
    });

    test('should not recommend closure optimization for low/medium risk', () => {
      const memoryAnalyzer = profiler.memoryAnalyzer;
      
      const filesWithFewClosures = [{
        content: `
          function simple() {
            return 'no closures here';
          }
          const arrow = () => 'simple arrow';
        `,
        path: '/simple.js'
      }];

      const recommendations = memoryAnalyzer.generateMemoryRecommendations(filesWithFewClosures);
      const closureRec = recommendations.find(r => r.title === 'Optimize Closure Usage');
      
      expect(closureRec).toBeUndefined();
    });
  });

  describe('additional branch coverage tests', () => {
    test('should handle projectInfo without dependencies', () => {
      const projectInfoNoDeps = { framework: 'react' };
      const metadata = profiler.generateMetadata(mockFiles, projectInfoNoDeps);
      
      expect(metadata.dependencies).toBe(0);
    });

    test('should handle different complexity ranges', () => {
      const lowComplexityFiles = [{
        content: 'const simple = () => "hello";',
        path: '/simple.js'
      }];

      const mediumComplexityFiles = [{
        content: `
          for (let i = 0; i < 10; i++) {
            if (condition) {
              function test() {
                return async () => await fetch();
              }
            }
          }
        `,
        path: '/medium.js'
      }];

      expect(profiler.estimateComplexity(lowComplexityFiles)).toBe('low');
      expect(profiler.estimateComplexity(mediumComplexityFiles)).toBe('medium');
    });

    test('should handle determineAnalysisScope edge cases', () => {
      const frontendOnlyFiles = [{
        path: '/src/components/Test.jsx',
        extension: '.jsx'
      }];

      const backendOnlyFiles = [{
        path: '/api/routes/users.js',
        extension: '.js'
      }];

      const unknownFiles = [{
        path: '/config.json',
        extension: '.json'
      }];

      expect(profiler.determineAnalysisScope(frontendOnlyFiles)).toBe('frontend');
      expect(profiler.determineAnalysisScope(backendOnlyFiles)).toBe('backend');
      expect(profiler.determineAnalysisScope(unknownFiles)).toBe('unknown');
    });

    test('should handle load time categories correctly', () => {
      const moderateFiles = Array.from({length: 5}, (_, i) => ({
        size: 30000, // 30KB per file = 150KB total
        extension: '.js'
      }));

      const loadTime = profiler.estimateLoadTime(moderateFiles);
      expect(loadTime.category).toBe('moderate');
    });

    test('should handle bundle size categories', () => {
      const mediumBundleFiles = [{
        size: 250000, // 250KB, after compression ~52KB gzipped
        extension: '.js'
      }];

      const largeBundleFiles = [{
        size: 1000000, // 1MB, after compression ~210KB gzipped
        extension: '.js'
      }];

      const mediumBundle = profiler.estimateBundleSize(mediumBundleFiles);
      const largeBundle = profiler.estimateBundleSize(largeBundleFiles);

      expect(mediumBundle.category).toBe('medium');
      expect(largeBundle.category).toBe('large');
    });

    test('should handle render time categories', () => {
      const fastRenderResult = {
        rendering: { heavyComponents: [] }
      };

      const slowRenderResult = {
        rendering: { heavyComponents: [1,2,3,4,5] }
      };

      const fastRender = profiler.estimateRenderTime(fastRenderResult);
      const slowRender = profiler.estimateRenderTime(slowRenderResult);

      expect(fastRender.category).toBe('fast');
      expect(slowRender.category).toBe('slow');
    });

    test('should handle API response time categories', () => {
      const fastAPIResult = {
        api: { slowEndpoints: [] }
      };

      const slowAPIResult = {
        api: { slowEndpoints: [1,2,3,4,5,6,7,8,9,10] } // More endpoints to trigger slow
      };

      const fastAPI = profiler.estimateAPIResponseTime(fastAPIResult);
      const slowAPI = profiler.estimateAPIResponseTime(slowAPIResult);

      expect(fastAPI.category).toBe('fast');
      expect(slowAPI.category).toBe('slow');
    });

    test('should handle memory usage categories', () => {
      const lowMemoryFiles = [{ size: 1000 }];
      const highMemoryFiles = [{ size: 10000000 }];

      const lowMemory = profiler.estimateMemoryUsage(lowMemoryFiles);
      const highMemory = profiler.estimateMemoryUsage(highMemoryFiles);

      expect(lowMemory.category).toBe('low');
      expect(highMemory.category).toBe('high');
    });

    test('should handle cache efficiency levels', () => {
      const goodCacheFiles = [{
        content: `
          import { useMemo, useCallback } from 'react';
          const Component = React.memo(() => {
            const cached = useMemo(() => {}, []);
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js');
            }
            return <div>Cached</div>;
          });
        `
      }];

      const cacheEfficiency = profiler.assessCacheEfficiency(goodCacheFiles);
      expect(cacheEfficiency.level).toBe('good');
    });

    test('should handle optimization level categories', () => {
      const poorOptimizationResult = {
        bundle: { codeSplitting: [] },
        rendering: { unnecessaryRenders: ['issue1'] },
        memory: { potentialLeaks: ['leak1'] }
      };

      const optimization = profiler.assessOptimizationLevel(poorOptimizationResult);
      expect(optimization.level).toBe('poor');
    });

    test('should handle different framework optimizations', () => {
      const vueProfiler = new PerformanceProfiler('vue');
      const angularProfiler = new PerformanceProfiler('angular');

      const vueOpportunities = vueProfiler.findOptimizationOpportunities({}, mockFiles);
      const angularOpportunities = angularProfiler.findOptimizationOpportunities({}, mockFiles);

      expect(vueOpportunities.longTerm).toBeDefined();
      expect(angularOpportunities.longTerm).toBeDefined();
      
      // Should not have React/Next.js specific optimizations
      const vueSSR = vueOpportunities.longTerm.find(o => o.type.includes('Server-Side Rendering'));
      const angularSSR = angularOpportunities.longTerm.find(o => o.type.includes('Server-Side Rendering'));
      
      expect(vueSSR).toBeUndefined();
      expect(angularSSR).toBeUndefined();
    });

    test('should handle suggestAlternatives for unknown packages', () => {
      const bundleAnalyzer = profiler.bundleAnalyzer;
      const alternatives = bundleAnalyzer.suggestAlternatives('unknown-package');
      
      expect(alternatives).toEqual([]);
    });

    test('should handle estimatePackageSize for unknown packages', () => {
      const bundleAnalyzer = profiler.bundleAnalyzer;
      const size = bundleAnalyzer.estimatePackageSize('unknown-package');
      
      expect(size).toBe('Unknown');
    });

    test('should handle analyzeRenderingPatterns for different frameworks', () => {
      const runtimeAnalyzer = profiler.runtimeAnalyzer;
      
      const vuePatterns = runtimeAnalyzer.analyzeRenderingPatterns(mockFiles, 'vue');
      const angularPatterns = runtimeAnalyzer.analyzeRenderingPatterns(mockFiles, 'angular');
      const unknownPatterns = runtimeAnalyzer.analyzeRenderingPatterns(mockFiles, 'unknown');
      
      expect(vuePatterns).toEqual({});
      expect(angularPatterns).toEqual({});
      expect(unknownPatterns).toEqual({});
    });

    test('should handle zero event handlers and async operations', () => {
      const runtimeAnalyzer = profiler.runtimeAnalyzer;
      const emptyFiles = [{ content: 'const simple = "test";' }];

      const handlers = runtimeAnalyzer.analyzeEventHandlers(emptyFiles);
      const asyncOps = runtimeAnalyzer.analyzeAsyncOperations(emptyFiles);

      expect(handlers.cleanupRatio).toBe(0);
      expect(asyncOps.errorHandlingRatio).toBe(0);
    });

    test('should handle DOM manipulation without recommendation', () => {
      const runtimeAnalyzer = profiler.runtimeAnalyzer;
      const filesWithoutDOM = [{ content: 'const simple = "test";' }];

      const domAnalysis = runtimeAnalyzer.analyzeDOMManipulation(filesWithoutDOM);
      expect(domAnalysis.recommendation).toBe(null);
    });

    test('should handle closure risk levels', () => {
      const memoryAnalyzer = profiler.memoryAnalyzer;
      
      const mediumClosureFiles = [{
        content: `
          function outer() { return function() { return 'nested'; }; }
          function outer2() { return function() { return 'nested'; }; }
          function outer3() { return function() { return 'nested'; }; }
          function outer4() { return function() { return 'nested'; }; }
        `
      }];

      const closures = memoryAnalyzer.countClosures(mediumClosureFiles);
      expect(['low', 'medium', 'high']).toContain(closures.risk);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle empty file list', async () => {
      const result = await profiler.profile({}, [], mockProjectInfo);
      
      expect(result).toBeDefined();
      expect(result.performanceScore).toBe(100); // No issues = perfect score
    });

    test('should handle missing AI result properties', async () => {
      const incompleteResult = { bundle: {} }; // Missing other properties
      const result = await profiler.profile(incompleteResult, mockFiles, mockProjectInfo);
      
      expect(result).toBeDefined();
      expect(result.bottlenecks).toBeDefined();
    });

    test('should handle files without extensions', () => {
      const filesWithoutExt = [{
        path: '/Dockerfile',
        content: 'FROM node:16',
        size: 50
      }];

      const bundleSize = profiler.estimateBundleSize(filesWithoutExt);
      expect(bundleSize.raw).toBe('0KB'); // No JS files
    });

    test('should handle zero-sized files', () => {
      const emptyFiles = [{ size: 0, lines: 0, extension: '.js' }];
      
      const loadTime = profiler.estimateLoadTime(emptyFiles);
      expect(loadTime.estimated).toBeDefined();
      expect(loadTime.category).toBe('fast');
    });

    test('should handle division by zero in calculations', () => {
      const emptyFiles = [];
      
      const projectSize = profiler.calculateProjectSize(emptyFiles);
      expect(projectSize.avgFileSize).toBe(0);
      expect(projectSize.avgLinesPerFile).toBe(0);
    });
  });
});