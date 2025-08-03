/**
 * Shared test utilities for all test files
 */

import { strict as assert } from 'assert';
import { LLMClient } from '../../src/llm/llm-client.js';
import type { ProjectInfo } from '../../src/analyzer/project-analyzer.js';
import { TIMEOUTS } from '../../src/shared/config.js';

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
  skipIfNoLLM?: boolean;
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
      // Check if LLM is available for tests that require it
      if (options.skipIfNoLLM) {
        const llmClient = new LLMClient();
        const isAvailable = await llmClient.isAvailable();
        if (!isAvailable) {
          console.log(`⏭️  ${name} (skipped - no LLM available)`);
          stats.skipped++;
          return;
        }
      }

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
  structure: {
    directories: ['src', 'tests', 'dist'],
    importantFiles: ['package.json', 'README.md', 'src/index.ts'],
    configFiles: ['package.json', 'tsconfig.json', '.env'],
    sourceFiles: ['src/index.ts', 'src/app.ts', 'src/utils.ts']
  },
  hasTests: true,
  hasDatabase: false,
  hasApi: true,
  hasFrontend: true,
  codeAnalysis: {
    functions: [
      {
        name: 'startServer',
        summary: 'Initializes and starts the web server',
        parameters: ['port', 'options'],
        isAsync: true,
        isExported: true,
        fileName: 'src/server.ts',
        source: 'regex',
        language: 'typescript'
      }
    ],
    classes: [
      {
        name: 'ApiController',
        summary: 'Handles API requests and responses',
        methods: ['get', 'post', 'delete'],
        properties: ['router', 'middleware'],
        isExported: true,
        fileName: 'src/controllers/api.ts',
        source: 'regex',
        language: 'typescript'
      }
    ],
    dependencies: [
      { name: 'express', version: '^4.18.0', type: 'dependency', category: 'framework' }
    ],
    entryPoints: ['src/index.ts'],
    keyFiles: []
  }
};

/**
 * Real project info for integration testing
 */
export const realProjectInfo: ProjectInfo = {
  type: 'TypeScript MCP Server',
  fileCount: 45,
  mainTechnologies: ['TypeScript', 'Node.js', 'MCP'],
  structure: {
    directories: ['src', 'tests', 'dist', 'docs'],
    importantFiles: ['package.json', 'README.md', 'src/index.ts', 'CLAUDE.md'],
    configFiles: ['package.json', 'tsconfig.json', '.env'],
    sourceFiles: ['src/index.ts', 'src/adventure/adventure-manager.ts', 'src/llm/llm-client.ts', 'src/analyzer/project-analyzer.ts']
  },
  hasTests: true,
  hasDatabase: false,
  hasApi: true,
  hasFrontend: false,
  codeAnalysis: {
    functions: [
      {
        name: 'initializeAdventure',
        summary: 'Initializes adventure with project analysis and theme',
        parameters: ['projectInfo', 'theme'],
        isAsync: true,
        isExported: true,
        fileName: 'src/adventure/adventure-manager.ts',
        source: 'regex',
        language: 'typescript'
      },
      {
        name: 'generateResponse',
        summary: 'Generates LLM response with caching and fallbacks',
        parameters: ['prompt', 'options'],
        isAsync: true,
        isExported: true,
        fileName: 'src/llm/llm-client.ts',
        source: 'regex', 
        language: 'typescript'
      },
      {
        name: 'analyzeProject',
        summary: 'Analyzes project structure and code patterns',
        parameters: ['projectPath'],
        isAsync: true,
        isExported: true,
        fileName: 'src/analyzer/project-analyzer.ts',
        source: 'regex',
        language: 'typescript'
      }
    ],
    classes: [
      {
        name: 'AdventureManager',
        summary: 'Manages adventure generation and state',
        methods: ['initializeAdventure', 'exploreAdventure', 'getProgress'],
        properties: ['state', 'llmClient', 'fileIndex'],
        isExported: true,
        fileName: 'src/adventure/adventure-manager.ts',
        source: 'regex',
        language: 'typescript'
      },
      {
        name: 'LLMClient', 
        summary: 'Handles LLM API communication with caching',
        methods: ['generateResponse', 'isAvailable'],
        properties: ['cache', 'provider'],
        isExported: true,
        fileName: 'src/llm/llm-client.ts',
        source: 'regex',
        language: 'typescript'
      }
    ],
    dependencies: [
      { name: '@modelcontextprotocol/sdk', version: '^1.17.1', type: 'dependency', category: 'framework' },
      { name: 'openai', version: '^5.10.2', type: 'dependency', category: 'ai' },
      { name: 'zod', version: '^3.25.76', type: 'dependency', category: 'validation' }
    ],
    entryPoints: ['src/index.ts'],
    keyFiles: [
      { path: 'src/index.ts', content: 'export { server };', summary: 'Main MCP server entry point' },
      { path: 'src/adventure/adventure-manager.ts', content: 'export class AdventureManager {', summary: 'Adventure management class' },
      { path: 'src/llm/llm-client.ts', content: 'export class LLMClient {', summary: 'LLM API client wrapper' }
    ]
  }
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