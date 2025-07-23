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

  describe('file type detection', () => {
    test('should handle different file extensions', async () => {
      const content = `const test = () => {};`;
      
      await expect(analyzer.analyzeFile(content, '/test/file.js')).resolves.toBeDefined();
      await expect(analyzer.analyzeFile(content, '/test/file.jsx')).resolves.toBeDefined();
      await expect(analyzer.analyzeFile(content, '/test/file.ts')).resolves.toBeDefined();
      await expect(analyzer.analyzeFile(content, '/test/file.tsx')).resolves.toBeDefined();
    });
  });
});