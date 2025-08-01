#!/usr/bin/env node

/**
 * Integration test runner that calls real LLMs
 */

import { runTestSuite } from './shared/test-utils.js';
import { runTests as runLLMIntegrationTests } from './integration/llm-integration.test.js';

async function runAllIntegrationTests() {
  console.log('⚠️  These tests require LLM_PROVIDER and API keys to be configured');
  console.log('💡 Tests will be skipped if no LLM is available\n');

  await runTestSuite('🤖 MCP Repo Adventure - Integration Test Suite', [
    { name: 'LLM Integration', runner: runLLMIntegrationTests }
  ]);
}

// Run all tests
runAllIntegrationTests().catch(error => {
  console.error('💥 Integration test runner failed:', error);
  process.exit(1);
});