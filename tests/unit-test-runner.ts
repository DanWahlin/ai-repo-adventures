#!/usr/bin/env node

/**
 * Comprehensive test runner for all unit tests
 */

import { runTestSuite } from './shared/test-utils.js';
import { runLLMClientTests } from './unit/llm-client.test.js';

async function runAllUnitTests() {
  console.log('Running unit tests for core business logic (no external dependencies)\n');

  await runTestSuite('🧪 MCP Repo Adventure - Unit Test Suite', [
    { name: 'LLM Client', runner: runLLMClientTests }
  ]);
}

// Run all tests
runAllUnitTests()
  .then(() => {
    // Explicitly exit on success to ensure the process terminates
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Unit test runner failed:', error);
    process.exit(1);
  });