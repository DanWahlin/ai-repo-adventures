#!/usr/bin/env node

/**
 * Comprehensive test runner for all unit tests
 */

import { runTestSuite } from './shared/test-utils.js';
import { runTests as runAdventureAlgorithmTests } from './unit/adventure-algorithms.test.js';
import { runLLMClientTests } from './unit/llm-client.test.js';
import { runTests as runAdventureLLMTests } from './unit/adventure-llm.test.js';

async function runAllUnitTests() {
  console.log('Running comprehensive unit tests for all core algorithms\n');

  await runTestSuite('🧪 MCP Repo Adventure - Unit Test Suite', [
    { name: 'Adventure Algorithms', runner: runAdventureAlgorithmTests },
    { name: 'LLM Client', runner: runLLMClientTests },
    { name: 'Adventure LLM Integration', runner: runAdventureLLMTests }
  ]);
}

// Run all tests
runAllUnitTests().catch(error => {
  console.error('💥 Unit test runner failed:', error);
  process.exit(1);
});