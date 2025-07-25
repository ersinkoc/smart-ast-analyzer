const APIDocsGenerator = require('../../lib/generators/api-docs-generator');
const fs = require('fs');
const path = require('path');

// Mock fs.promises
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined)
  }
}));

const mockFs = fs.promises;

describe('APIDocsGenerator', () => {
  let generator;
  let mockAnalysisResults;
  let outputPath;

  beforeEach(() => {
    generator = new APIDocsGenerator({});
    outputPath = '/test/output';
    
    mockAnalysisResults = {
      endpoints: [
        {
          method: 'GET',
          path: '/api/users',
          handler: 'getUsers',
          auth: false,
          description: 'Get all users'
        },
        {
          method: 'POST',
          path: '/api/users',
          handler: 'createUser',
          auth: true,
          description: 'Create a new user'
        },
        {
          method: 'GET',
          path: '/api/users/:id',
          handler: 'getUserById',
          auth: false,
          description: 'Get user by ID'
        }
      ],
      security: {
        score: 75,
        vulnerabilities: [
          {
            type: 'missing-auth',
            severity: 'medium',
            message: 'Endpoint lacks authentication',
            file: 'routes/users.js',
            line: 10
          }
        ]
      },
      deepAnalysis: {
        complexity: {
          overall: { rating: 'good', score: 8 },
          functions: [
            {
              name: 'getUsers',
              file: 'controllers/users.js',
              line: 15,
              cyclomatic: 3,
              cognitive: 2,
              warnings: []
            }
          ]
        }
      }
    };

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with options', () => {
      expect(generator.options).toBeDefined();
    });
  });

  describe('generateAPIDocumentation', () => {
    test('should generate complete API documentation', async () => {
      const result = await generator.generateAPIDocumentation(mockAnalysisResults, outputPath);
      
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(outputPath, 'api-docs'),
        { recursive: true }
      );
      
      expect(mockFs.writeFile).toHaveBeenCalledTimes(3);
      expect(result).toBe(path.join(outputPath, 'api-docs'));
    });

    test('should handle empty endpoints gracefully', async () => {
      const emptyResults = { endpoints: [], security: {}, deepAnalysis: {} };
      
      const result = await generator.generateAPIDocumentation(emptyResults, outputPath);
      
      expect(result).toBeNull();
    });

    test('should handle missing endpoints property', async () => {
      const resultsWithoutEndpoints = { security: {}, deepAnalysis: {} };
      
      const result = await generator.generateAPIDocumentation(resultsWithoutEndpoints, outputPath);
      
      expect(result).toBeNull();
    });
  });

  describe('generateOpenAPISpec', () => {
    test('should generate valid OpenAPI specification', async () => {
      const spec = await generator.generateOpenAPISpec(mockAnalysisResults.endpoints, mockAnalysisResults.security);
      
      expect(spec).toBeDefined();
      expect(spec.openapi).toBe('3.0.3');
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBe('API Documentation');
      expect(spec.paths).toBeDefined();
      
      // Should have paths for each endpoint
      expect(spec.paths['/api/users']).toBeDefined();
      expect(spec.paths['/api/users'].get).toBeDefined();
      expect(spec.paths['/api/users'].post).toBeDefined();
      expect(spec.paths['/api/users/:id']).toBeDefined();
    });

    test('should include proper HTTP methods in paths', async () => {
      const spec = await generator.generateOpenAPISpec(mockAnalysisResults.endpoints, mockAnalysisResults.security);
      
      const usersPath = spec.paths['/api/users'];
      expect(usersPath.get).toBeDefined();
      expect(usersPath.post).toBeDefined();
      
      expect(usersPath.get.summary).toContain('getUsers');
      expect(usersPath.post.summary).toContain('createUser');
    });
  });

  describe('generateMarkdownDocs', () => {
    test('should generate comprehensive markdown documentation', async () => {
      const markdown = await generator.generateMarkdownDocs(
        mockAnalysisResults.endpoints,
        mockAnalysisResults.security,
        mockAnalysisResults.deepAnalysis
      );
      
      expect(markdown).toContain('# API Documentation');
      expect(markdown).toContain('This API contains **3 endpoints**');
      expect(markdown).toContain('GET /api/users');
      expect(markdown).toContain('POST /api/users');
      expect(markdown).toContain('Security Issues');
      expect(markdown).toContain('Code Complexity Analysis');
    });

    test('should include security warnings', async () => {
      const markdown = await generator.generateMarkdownDocs(
        mockAnalysisResults.endpoints,
        mockAnalysisResults.security,
        mockAnalysisResults.deepAnalysis
      );
      
      expect(markdown).toContain('⚠️ Security Issues');
      expect(markdown).toContain('1 security issues found');
      expect(markdown).toContain('**MEDIUM**: Endpoint lacks authentication');
    });

    test('should include complexity metrics', async () => {
      const markdown = await generator.generateMarkdownDocs(
        mockAnalysisResults.endpoints,
        mockAnalysisResults.security,
        mockAnalysisResults.deepAnalysis
      );
      
      expect(markdown).toContain('Code Complexity Analysis');
      expect(markdown).toContain('Overall Complexity Rating**: good');
      expect(markdown).toContain('Complex Functions');
      expect(markdown).toContain('Cyclomatic: 3');
    });
  });

  describe('generatePostmanCollection', () => {
    test('should generate valid Postman collection', async () => {
      const collection = await generator.generatePostmanCollection(mockAnalysisResults.endpoints);
      
      expect(collection).toBeDefined();
      expect(collection.info).toBeDefined();
      expect(collection.info.name).toBe('API Collection');
      expect(collection.item).toBeDefined();
      expect(collection.item).toHaveLength(3);
      
      // Check first item
      const firstItem = collection.item[0];
      expect(firstItem.name).toBe('GET /api/users');
      expect(firstItem.request.method).toBe('GET');
      expect(firstItem.request.url.raw).toBe('{{baseUrl}}/api/users');
    });

    test('should include auth headers for authenticated endpoints', async () => {
      const collection = await generator.generatePostmanCollection(mockAnalysisResults.endpoints);
      
      const authEndpoint = collection.item.find(item => item.name === 'POST /api/users');
      expect(authEndpoint).toBeDefined();
      
      const authHeader = authEndpoint.request.header.find(h => h.key === 'Authorization');
      expect(authHeader).toBeDefined();
      expect(authHeader.value).toBe('Bearer {{token}}');
    });
  });

  describe('helper methods', () => {
    test('extractResource should extract resource name from path', () => {
      expect(generator.extractResource('/api/users')).toBe('Users');
      expect(generator.extractResource('/api/products/:id')).toBe('Products');
      expect(generator.extractResource('/')).toBe('Root');
      expect(generator.extractResource('/health')).toBe('Health');
    });

    test('getActionFromMethod should return correct action', () => {
      expect(generator.getActionFromMethod('GET')).toBe('Retrieve');
      expect(generator.getActionFromMethod('POST')).toBe('Create');
      expect(generator.getActionFromMethod('PUT')).toBe('Update');
      expect(generator.getActionFromMethod('PATCH')).toBe('Partially update');
      expect(generator.getActionFromMethod('DELETE')).toBe('Delete');
      expect(generator.getActionFromMethod('UNKNOWN')).toBe('Process');
    });

    test('groupEndpointsByResource should group endpoints correctly', () => {
      const groups = generator.groupEndpointsByResource(mockAnalysisResults.endpoints);
      
      expect(groups.Users).toBeDefined();
      expect(groups.Users).toHaveLength(3);
      expect(groups.Users[0].path).toBe('/api/users');
    });
  });

  describe('error handling', () => {
    test('should handle writeFile errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValueOnce(new Error('Write failed'));
      
      // Should not throw
      await expect(generator.generateAPIDocumentation(mockAnalysisResults, outputPath))
        .resolves.toBeDefined();
    });

    test('should include function warnings in complexity analysis', async () => {
      const analysisWithWarnings = {
        ...mockAnalysisResults,
        deepAnalysis: {
          complexity: {
            overall: { rating: 'moderate' },
            functions: [
              {
                name: 'complexFunction',
                file: 'api.js',
                line: 10,
                cyclomatic: 15,
                cognitive: 12,
                warnings: ['High cyclomatic complexity', 'Deep nesting detected']
              }
            ]
          }
        }
      };

      const result = await generator.generateAPIDocumentation(analysisWithWarnings, outputPath);
      
      expect(result).toBeDefined();
      expect(result).toBe(path.join(outputPath, 'api-docs'));
      
      // Verify writeFile was called with correct content
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('API.md'),
        expect.stringContaining('⚠️ High cyclomatic complexity, Deep nesting detected'),
        'utf-8'
      );
    });
  });
});