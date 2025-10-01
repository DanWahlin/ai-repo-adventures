/**
 * Shared test utilities for all test files
 */

import { strict as assert } from 'assert';
import type { ProjectInfo } from '../../src/shared/types.js';
import { LLM_REQUEST_TIMEOUT } from '../../src/shared/config.js';

// Test-specific configuration
const TEST_CONFIG = {
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  MAX_TEST_NAME_LENGTH: 200,
  MAX_ERROR_MESSAGE_LENGTH: 1000,
  MAX_SUITE_NAME_LENGTH: 100,
  MIN_TEST_GROUPS: 1
} as const;

// Test execution options
export interface TestOptions {
  timeout?: number;
}

// Test statistics
export interface TestStats {
  passed: number;
  failed: number;
  skipped: number;
}

/**
 * Generic test runner function
 */
export async function createTestRunner(suiteName: string = 'Tests') {
  const stats: TestStats = { passed: 0, failed: 0, skipped: 0 };
  
  const test = async (name: string, testFn: () => Promise<void> | void, options: TestOptions = {}) => {
    // Input validation
    if (!name || typeof name !== 'string') {
      throw new Error('Test name must be a non-empty string');
    }
    if (name.length > TEST_CONFIG.MAX_TEST_NAME_LENGTH) {
      throw new Error(`Test name too long: ${name.length} > ${TEST_CONFIG.MAX_TEST_NAME_LENGTH}`);
    }
    if (typeof testFn !== 'function') {
      throw new Error('Test function must be a function');
    }
    
    const timeout = options.timeout || TEST_CONFIG.DEFAULT_TIMEOUT;
    
    try {

      // Run test with timeout using AbortController for better cleanup
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, timeout);

      try {
        await Promise.race([
          testFn(),
          new Promise((_, reject) => {
            abortController.signal.addEventListener('abort', () => {
              reject(new Error(`Test timeout after ${timeout}ms`));
            });
          })
        ]);
      } finally {
        clearTimeout(timeoutId);
      }
      
      console.log(`✅ ${name}`);
      stats.passed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const truncatedMessage = errorMessage.length > TEST_CONFIG.MAX_ERROR_MESSAGE_LENGTH 
        ? errorMessage.substring(0, TEST_CONFIG.MAX_ERROR_MESSAGE_LENGTH) + '... (truncated)'
        : errorMessage;
      
      console.log(`❌ ${name}: ${truncatedMessage}`);
      stats.failed++;
    }
  };

  const printResults = () => {
    console.log('\n' + '='.repeat(50));
    console.log(`📊 ${suiteName.toUpperCase()} RESULTS`);
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${stats.passed}`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log(`⏭️  Skipped: ${stats.skipped}`);
    
    const total = stats.passed + stats.failed;
    if (total > 0) {
      console.log(`📈 Success Rate: ${Math.round((stats.passed / total) * 100)}%`);
    }
    
    if (stats.failed === 0) {
      console.log('');
      console.log(`🎉 All ${total > 0 ? total : stats.skipped} tests completed successfully!`);
    } else {
      console.log('');
      console.log(`⚠️  ${stats.failed} tests failed. Please review the failures above.`);
    }

    if (stats.skipped === total && total > 0) {
      console.log('');
      console.log('⚠️  All tests were skipped - no LLM available.');
      console.log('💡 Configure LLM_PROVIDER and API keys to run LLM-dependent tests.');
    }
  };

  return { test, stats, printResults };
}

/**
 * Mock project info for testing
 */
export const mockProjectInfo: ProjectInfo = {
  type: 'Web Application',
  fileCount: 45,
  mainTechnologies: ['TypeScript', 'Node.js', 'React'],
  hasTests: true,
  hasDatabase: false,
  hasApi: true,
  hasFrontend: true,
  repomixContent: '# Test Project\n\nThis is mock repomix content for testing.\n\n## File: src/server.ts\n```typescript\nfunction startServer() { }\n```\n\n## File: src/utils.ts\n```typescript\nclass ApiController { }\n```',
  llmContextSummary: 'Mock project for testing'
};

/**
 * Real project info for integration testing
 * Contains substantial repomix content to enable proper quest generation
 */
export const realProjectInfo: ProjectInfo = {
  type: 'TypeScript MCP Server',
  fileCount: 45,
  mainTechnologies: ['TypeScript', 'Node.js', 'MCP'],
  hasTests: true,
  hasDatabase: false,
  hasApi: true,
  hasFrontend: false,
  repomixContent: `# MCP Repo Adventure

TypeScript MCP server for gamified code exploration and learning.

## File: packages/mcp/src/server.ts
\`\`\`typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export class RepoAdventureServer {
  private server: Server;
  private tools: ToolRegistry;
  private adventureManager: AdventureManager;

  constructor(projectInfo: ProjectInfo) {
    this.server = new Server({ name: 'repo-adventure', version: '1.0.0' });
    this.tools = new ToolRegistry();
    this.adventureManager = new AdventureManager();
    this.setupHandlers();
  }

  async setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.tools.getTools()
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const tool = this.tools.getTool(request.params.name);
      return await tool.handler(request.params.arguments);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    await this.adventureManager.initializeAdventure(this.projectInfo, 'space');
  }
}
\`\`\`

## File: packages/core/src/adventure/adventure-manager.ts
\`\`\`typescript
export class AdventureManager {
  private state: AdventureState;
  private storyGenerator: StoryGenerator;

  constructor() {
    this.state = new AdventureState();
    this.storyGenerator = new StoryGenerator();
  }

  async initializeAdventure(projectInfo: ProjectInfo, theme: string): Promise<string> {
    this.state.reset();
    this.state.projectInfo = projectInfo;
    this.state.currentTheme = theme;

    const story = await this.storyGenerator.generateStory(projectInfo, theme);
    const quests = await this.parseQuests(story);
    this.state.quests = quests;

    return story;
  }

  async exploreQuest(questId: string): Promise<QuestResult> {
    const quest = this.state.quests.get(questId);
    if (!quest) throw new Error('Quest not found');

    const content = await this.storyGenerator.generateQuestContent(quest);
    quest.completed = true;

    return { narrative: content, completed: true };
  }
}
\`\`\`

## File: packages/core/src/adventure/story-generator.ts
\`\`\`typescript
export class StoryGenerator {
  private llmClient: LLMClient;

  constructor() {
    this.llmClient = new LLMClient();
  }

  async generateStory(projectInfo: ProjectInfo, theme: string): Promise<string> {
    const prompt = await this.loadPrompt('story-generation-prompt.md');
    const processedPrompt = this.replaceVariables(prompt, { theme, projectInfo });

    return await this.llmClient.generateContent(processedPrompt);
  }

  async generateQuestContent(quest: Quest): Promise<string> {
    const prompt = await this.loadPrompt('quest-content-prompt.md');
    return await this.llmClient.generateContent(prompt);
  }
}
\`\`\`

## File: packages/core/src/llm/llm-client.ts
\`\`\`typescript
export class LLMClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(config?: LLMConfig) {
    this.apiKey = config?.apiKey || process.env.LLM_API_KEY;
    this.baseURL = config?.baseURL || process.env.LLM_BASE_URL;
    this.model = config?.model || process.env.LLM_MODEL;
  }

  async generateContent(prompt: string): Promise<string> {
    const response = await fetch(\`\${this.baseURL}/chat/completions\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
\`\`\`

## File: packages/core/src/shared/config.ts
\`\`\`typescript
export interface Config {
  llmApiKey: string;
  llmBaseURL: string;
  llmModel: string;
  llmTemperature: number;
  maxTokens: number;
}

export async function loadConfig(): Promise<Config> {
  return {
    llmApiKey: process.env.LLM_API_KEY || '',
    llmBaseURL: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    llmModel: process.env.LLM_MODEL || 'gpt-4',
    llmTemperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4000')
  };
}
\`\`\``,
  llmContextSummary: 'Real MCP server project with comprehensive file structure'
};

/**
 * Assertion utilities
 */
export { assert };

/**
 * Common test helper functions
 */
export class TestHelpers {
  /**
   * Wait for a specified amount of time
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if a string contains any of the provided words (case insensitive)
   */
  static containsAnyWord(text: string, words: string[]): boolean {
    const lowerText = text.toLowerCase();
    return words.some(word => lowerText.includes(word.toLowerCase()));
  }

  /**
   * Check if a string contains all of the provided words (case insensitive)
   */
  static containsAllWords(text: string, words: string[]): boolean {
    const lowerText = text.toLowerCase();
    return words.every(word => lowerText.includes(word.toLowerCase()));
  }

  /**
   * Validate JSON structure
   */
  static isValidJson(text: string): boolean {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get words that are found in text from a list
   */
  static getFoundWords(text: string, words: string[]): string[] {
    const lowerText = text.toLowerCase();
    return words.filter(word => lowerText.includes(word.toLowerCase()));
  }

  /**
   * Measure execution time of a function
   */
  static async measureTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  }
}

/**
 * Test suite runner for multiple test groups
 */
export async function runTestSuite(
  suiteName: string, 
  testGroups: Array<{ name: string; runner: () => Promise<void> }>
): Promise<void> {
  // Input validation
  if (!suiteName || typeof suiteName !== 'string') {
    throw new Error('Suite name must be a non-empty string');
  }
  if (!Array.isArray(testGroups) || testGroups.length === 0) {
    throw new Error('Test groups must be a non-empty array');
  }
  
  // Validate test group structure
  for (const group of testGroups) {
    if (!group.name || typeof group.name !== 'string') {
      throw new Error('Each test group must have a non-empty name');
    }
    if (typeof group.runner !== 'function') {
      throw new Error('Each test group must have a runner function');
    }
  }

  console.log(`🧪 ${suiteName}`);
  console.log('='.repeat(60));
  console.log(`Running ${testGroups.length} test group(s)`);
  console.log('');

  let totalFailed = 0;
  const results: Array<{ name: string; success: boolean; error?: Error }> = [];

  for (const group of testGroups) {
    console.log('');
    console.log(`🎯 Running ${group.name} Tests`);
    console.log('='.repeat(60));
    
    try {
      await group.runner();
      console.log('');
      console.log(`✅ ${group.name} tests completed successfully`);
      results.push({ name: group.name, success: true });
    } catch (error) {
      console.log('');
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${group.name} tests failed: ${errorMessage}`);
      totalFailed++;
      results.push({ 
        name: group.name, 
        success: false, 
        error: error instanceof Error ? error : new Error(errorMessage)
      });
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('🏁 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  
  const successfulGroups = testGroups.length - totalFailed;
  console.log(`Test Groups: ${successfulGroups}/${testGroups.length} passed`);
  
  // Show detailed results
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`  ${status} ${result.name}`);
    if (!result.success && result.error) {
      console.log(`    Error: ${result.error.message}`);
    }
  });
  
  if (totalFailed === 0) {
    console.log('');
    console.log('🎉 All test groups passed successfully!');
    console.log('🚀 System is working correctly!');
    // Set exit code instead of calling process.exit()
    process.exitCode = 0;
  } else {
    console.log('');
    console.log(`⚠️  ${totalFailed} test group(s) failed.`);
    console.log('🔧 Please review and fix the failing tests.');
    process.exitCode = 1;
  }
}