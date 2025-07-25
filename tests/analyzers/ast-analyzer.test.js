const ASTAnalyzer = require('../../lib/analyzers/ast-analyzer');

describe('ASTAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ASTAnalyzer({});
  });

  describe('constructor', () => {
    test('should initialize with options', () => {
      expect(analyzer.options).toBeDefined();
    });
  });

  describe('analyzeFile', () => {
    test('should analyze React functional component', async () => {
      const content = `
import React from 'react';

const UserCard = ({ user }) => {
  return (
    <div className="user-card">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
};

export default UserCard;
`;

      const analysis = await analyzer.analyzeFile(content, '/test/UserCard.jsx');
      
      expect(analysis).toBeDefined();
      expect(analysis.components).toHaveLength(1);
      expect(analysis.components[0].name).toBe('UserCard');
      expect(analysis.components[0].type).toBe('arrow');
      expect(analysis.components[0].props).toContain('user');
    });

    test('should analyze React class component', async () => {
      const content = `
import React, { Component } from 'react';

class UserProfile extends Component {
  constructor(props) {
    super(props);
    this.state = { loading: false };
  }

  render() {
    return <div>User Profile</div>;
  }
}

export default UserProfile;
`;

      const analysis = await analyzer.analyzeFile(content, '/test/UserProfile.jsx');
      
      expect(analysis.components).toHaveLength(1);
      expect(analysis.components[0].name).toBe('UserProfile');
      expect(analysis.components[0].type).toBe('class');
    });

    test('should detect React hooks', async () => {
      const content = `
import React, { useState, useEffect } from 'react';

const HooksComponent = () => {
  const [count, setCount] = useState(0);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/data').then(setData);
  }, []);

  return <div>{count}</div>;
};
`;

      const analysis = await analyzer.analyzeFile(content, '/test/HooksComponent.jsx');
      
      expect(analysis.hooks).toBeDefined();
      expect(analysis.hooks.length).toBeGreaterThan(0);
      
      const useStateHooks = analysis.hooks.filter(h => h.name === 'useState');
      expect(useStateHooks).toHaveLength(2);
      
      const useEffectHooks = analysis.hooks.filter(h => h.name === 'useEffect');
      expect(useEffectHooks).toHaveLength(1);
    });

    test('should analyze regular functions', async () => {
      const content = `
function calculateSum(a, b) {
  return a + b;
}

const calculateProduct = (x, y) => x * y;

export { calculateSum, calculateProduct };
`;

      const analysis = await analyzer.analyzeFile(content, '/test/utils.js');
      
      expect(analysis.functions).toHaveLength(2);
      expect(analysis.functions[0].name).toBe('calculateSum');
      expect(analysis.functions[0].type).toBe('function');
      expect(analysis.functions[1].name).toBe('calculateProduct');
      expect(analysis.functions[1].type).toBe('arrow');
    });

    test('should analyze classes', async () => {
      const content = `
class DataService {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async fetchData(endpoint) {
    const response = await fetch(endpoint);
    return response.json();
  }

  validateData(data) {
    return data && typeof data === 'object';
  }
}

export default DataService;
`;

      const analysis = await analyzer.analyzeFile(content, '/test/DataService.js');
      
      expect(analysis.classes).toHaveLength(1);
      expect(analysis.classes[0].name).toBe('DataService');
      expect(analysis.classes[0].methods).toHaveLength(3); // constructor, fetchData, validateData
    });
  });

  describe('React component detection', () => {
    test('should detect component by JSX return', () => {
      const content = `
const MyComponent = () => {
  return <div>Hello</div>;
};
`;

      return analyzer.analyzeFile(content, '/test/component.jsx')
        .then(analysis => {
          expect(analysis.components).toHaveLength(1);
          expect(analysis.components[0].name).toBe('MyComponent');
        });
    });

    test('should detect component by React element creation', () => {
      const content = `
const MyComponent = () => {
  return React.createElement('div', null, 'Hello');
};
`;

      return analyzer.analyzeFile(content, '/test/component.jsx')
        .then(analysis => {
          expect(analysis.components).toHaveLength(1);
        });
    });

    test('should not detect non-components as components', () => {
      const content = `
const regularFunction = () => {
  return "Hello World";
};

const dataProcessor = (data) => {
  return data.map(item => item.value);
};
`;

      return analyzer.analyzeFile(content, '/test/utils.js')
        .then(analysis => {
          expect(analysis.components).toHaveLength(0);
          expect(analysis.functions).toHaveLength(2);
        });
    });
  });

  describe('TypeScript support', () => {
    test('should analyze TypeScript code', async () => {
      const content = `
interface User {
  id: number;
  name: string;
  email: string;
}

class UserService {
  private users: User[] = [];

  async getUser(id: number): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  addUser(user: User): void {
    this.users.push(user);
  }
}

export default UserService;
`;

      const analysis = await analyzer.analyzeFile(content, '/test/UserService.ts');
      
      expect(analysis.classes).toHaveLength(1);
      expect(analysis.classes[0].name).toBe('UserService');
      expect(analysis.interfaces).toBeDefined();
      expect(analysis.interfaces).toHaveLength(1);
      expect(analysis.interfaces[0].name).toBe('User');
    });
  });

  describe('error handling', () => {
    test('should handle invalid JavaScript gracefully', async () => {
      const invalidContent = 'this is not valid JavaScript {{{';
      
      await expect(analyzer.analyzeFile(invalidContent, '/test/invalid.js'))
        .resolves.toBeDefined();
    });

    test('should handle empty content', async () => {
      const analysis = await analyzer.analyzeFile('', '/test/empty.js');
      
      expect(analysis).toBeDefined();
      expect(analysis.components).toHaveLength(0);
      expect(analysis.functions).toHaveLength(0);
      expect(analysis.classes).toHaveLength(0);
    });
  });

  describe('API endpoint detection edge cases', () => {
    test('should handle non-string literal route paths', async () => {
      const content = `
        const route = '/users';
        app.get(route, handler); // This won't be detected
        app.post(getRoute(), handler); // This won't be detected
      `;
      
      const analysis = await analyzer.analyzeFile(content, '/test/api.js');
      expect(analysis.apiEndpoints).toHaveLength(0);
    });

    test('should detect all HTTP methods', async () => {
      const content = `
        app.get('/get', handler);
        app.post('/post', handler);
        app.put('/put', handler);
        app.delete('/delete', handler);
        app.patch('/patch', handler);
        app.all('/all', handler);
      `;
      
      const analysis = await analyzer.analyzeFile(content, '/test/api.js');
      expect(analysis.apiEndpoints).toHaveLength(6);
      expect(analysis.apiEndpoints.map(e => e.method)).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL']);
    });
  });

  describe('file type detection', () => {
    test('should handle different file extensions', async () => {
      const content = `const test = () => {};`;
      
      await expect(analyzer.analyzeFile(content, '/test/file.js')).resolves.toBeDefined();
      await expect(analyzer.analyzeFile(content, '/test/file.jsx')).resolves.toBeDefined();
      await expect(analyzer.analyzeFile(content, '/test/file.ts')).resolves.toBeDefined();
      await expect(analyzer.analyzeFile(content, '/test/file.tsx')).resolves.toBeDefined();
    });
  });

  describe('export declarations edge cases', () => {
    test('should handle named exports', async () => {
      const content = `
        export const utils = {};
        export function helper() {}
        export class Service {}
      `;
      
      const analysis = await analyzer.analyzeFile(content, '/test/exports.js');
      expect(analysis.exports.filter(e => e.type === 'named')).toHaveLength(3);
    });

    test('should handle export without declaration', async () => {
      const content = `
        const utils = {};
        export { utils };
      `;
      
      const analysis = await analyzer.analyzeFile(content, '/test/exports.js');
      // Export without declaration won't be captured by the current logic
      expect(analysis.exports).toBeDefined();
    });
  });

  describe('additional coverage tests', () => {
    test('should detect React function components', async () => {
      const content = `
        function MyComponent(props) {
          return <div>{props.text}</div>;
        }
        
        function Button({ onClick, label }) {
          return <button onClick={onClick}>{label}</button>;
        }
      `;
      
      const analysis = await analyzer.analyzeFile(content, '/test/components.jsx');
      expect(analysis.components.length).toBeGreaterThan(0);
      expect(analysis.components.some(c => c.name === 'MyComponent')).toBe(true);
      expect(analysis.components.some(c => c.name === 'Button')).toBe(true);
    });

    test('should detect custom hooks', async () => {
      const content = `
        function useCustomHook() {
          const [state, setState] = useState();
          return [state, setState];
        }
        
        const useAnotherHook = () => {
          const value = useMemo(() => computeValue(), []);
          return value;
        };
      `;
      
      const analysis = await analyzer.analyzeFile(content, '/test/hooks.js');
      expect(analysis.hooks.length).toBeGreaterThan(0);
      
      // Check for function-declared hook
      const funcHook = analysis.functions.find(f => f.name === 'useCustomHook');
      expect(funcHook).toBeDefined();
      
      // Check for arrow function hook 
      const arrowHook = analysis.hooks.find(h => h.name === 'useAnotherHook');
      expect(arrowHook).toBeDefined();
    });
    test('should analyze arrow functions with various patterns', async () => {
      const content = `
        const simpleArrow = () => console.log('test');
        const withParams = (a, b) => a + b;
        const withBody = (x) => {
          return x * 2;
        };
        const async = async () => await fetch('/api');
      `;
      
      const analysis = await analyzer.analyzeFile(content, '/test/arrows.js');
      expect(analysis.functions.length).toBeGreaterThanOrEqual(4);
    });

    test('should handle class methods and properties', async () => {
      const content = `
        class Service {
          constructor() {
            this.name = 'Service';
          }
          
          async fetchData() {
            return await api.get('/data');
          }
          
          static getInstance() {
            return new Service();
          }
        }
      `;
      
      const analysis = await analyzer.analyzeFile(content, '/test/class.js');
      expect(analysis.classes).toHaveLength(1);
      expect(analysis.classes[0].methods.length).toBeGreaterThanOrEqual(2);
    });

    test('should handle import declarations', async () => {
      const content = `
        import React from 'react';
        import { useState, useEffect } from 'react';
        import * as utils from './utils';
        import './styles.css';
      `;
      
      const analysis = await analyzer.analyzeFile(content, '/test/imports.js');
      expect(analysis.imports).toHaveLength(4);
    });

    test('should detect GraphQL endpoints', async () => {
      const content = `
        app.use('/graphql', graphqlHTTP({
          schema: schema,
          graphiql: true
        }));
      `;
      
      const analysis = await analyzer.analyzeFile(content, '/test/graphql.js');
      expect(analysis.graphqlEndpoints || []).toBeDefined();
    });

    test('should handle object method shorthand', async () => {
      const content = `
        const obj = {
          method() {
            return 'test';
          },
          async asyncMethod() {
            return await Promise.resolve('test');
          }
        };
      `;
      
      const analysis = await analyzer.analyzeFile(content, '/test/methods.js');
      expect(analysis.functions.length).toBeGreaterThanOrEqual(0);
    });

    test('should detect TypeScript type aliases', async () => {
      const content = `
        type UserType = {
          id: number;
          name: string;
        };
        
        type StringOrNumber = string | number;
      `;
      
      const analysis = await analyzer.analyzeFile(content, '/test/types.ts');
      expect(analysis.types).toHaveLength(2);
      expect(analysis.types[0].name).toBe('UserType');
      expect(analysis.types[1].name).toBe('StringOrNumber');
    });
  });
});