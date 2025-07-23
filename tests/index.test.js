const SmartASTAnalyzer = require('../index');
const CoreAnalyzer = require('../lib/core/smart-ast-analyzer');

describe('Index Module', () => {
  test('exports SmartASTAnalyzer class', () => {
    expect(SmartASTAnalyzer).toBeDefined();
    expect(SmartASTAnalyzer).toBe(CoreAnalyzer);
  });

  test('can instantiate the analyzer', () => {
    const analyzer = new SmartASTAnalyzer({});
    expect(analyzer).toBeInstanceOf(CoreAnalyzer);
  });
});