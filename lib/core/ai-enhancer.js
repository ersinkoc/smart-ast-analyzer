const AIExecutor = require('./ai-executor');
const Helpers = require('../utils/helpers');

class AIEnhancer {
  constructor(aiType = 'mock', options = {}) {
    this.executor = new AIExecutor(aiType, options);
    this.aiType = aiType;
  }

  async enhance(analysisResults, projectInfo) {
    if (this.aiType === 'mock') {
      return analysisResults;
    }

    try {
      // Only enhance specific areas where AI can add value
      const enhancements = {};

      // 1. Get security recommendations for found endpoints
      if (analysisResults.api?.endpoints?.length > 0) {
        enhancements.security = await this.getSecurityInsights(analysisResults.api.endpoints);
      }

      // 2. Get performance tips for components
      if (analysisResults.component?.components) {
        enhancements.performance = await this.getPerformanceInsights(analysisResults.component.components);
      }

      // 3. Get architecture recommendations
      enhancements.architecture = await this.getArchitectureInsights(projectInfo, analysisResults);

      // Merge enhancements into results
      return this.mergeEnhancements(analysisResults, enhancements);
    } catch (error) {
      console.warn('AI enhancement failed, returning original results:', error.message);
      return analysisResults;
    }
  }

  async getSecurityInsights(endpoints) {
    // Create a focused prompt with just endpoint summary
    const endpointSummary = endpoints.slice(0, 10).map(ep => 
      `${ep.method} ${ep.path}`
    ).join('\n');

    const prompt = `Given these API endpoints:
${endpointSummary}

List 3 specific security recommendations. Return as JSON array of strings.`;

    try {
      const result = await this.executor.execute(prompt, { type: 'security' });
      // Handle both array response and object with recommendations property
      if (Array.isArray(result)) {
        return result.slice(0, 3);
      }
      return result.recommendations || ['Enable rate limiting', 'Add authentication', 'Validate inputs'];
    } catch (error) {
      return ['Enable rate limiting', 'Add authentication', 'Validate inputs'];
    }
  }

  async getPerformanceInsights(components) {
    const componentNames = Object.keys(components).slice(0, 10).join(', ');
    
    const prompt = `Given these React components: ${componentNames}
List 3 performance optimization tips. Return as JSON array of strings.`;

    try {
      const result = await this.executor.execute(prompt, { type: 'performance' });
      // Handle both array response and object with recommendations property
      if (Array.isArray(result)) {
        return result.slice(0, 3);
      }
      return result.recommendations || ['Use React.memo', 'Implement lazy loading', 'Optimize re-renders'];
    } catch (error) {
      return ['Use React.memo', 'Implement lazy loading', 'Optimize re-renders'];
    }
  }

  async getArchitectureInsights(projectInfo, analysisResults) {
    const summary = `${projectInfo.framework} project with ${analysisResults.api?.endpoints?.length || 0} endpoints and ${Object.keys(analysisResults.component?.components || {}).length} components`;
    
    const prompt = `For a ${summary}, suggest 3 architecture improvements. Return as JSON array of strings.`;

    try {
      const result = await this.executor.execute(prompt, { type: 'architecture' });
      // Handle both array response and object with recommendations property
      if (Array.isArray(result)) {
        return result.slice(0, 3);
      }
      return result.recommendations || ['Implement service layer', 'Add error boundaries', 'Use dependency injection'];
    } catch (error) {
      return ['Implement service layer', 'Add error boundaries', 'Use dependency injection'];
    }
  }

  mergeEnhancements(results, enhancements) {
    const enhanced = { ...results };

    // Add security recommendations
    if (enhancements.security && enhanced.api) {
      enhanced.api.aiSecurityInsights = enhancements.security;
    }

    // Add performance recommendations
    if (enhancements.performance && enhanced.component) {
      enhanced.component.aiPerformanceInsights = enhancements.performance;
    }

    // Add architecture recommendations
    enhanced.aiArchitectureInsights = enhancements.architecture;

    return enhanced;
  }
}

module.exports = AIEnhancer;