#!/usr/bin/env node

/**
 * Integration test runner that calls real LLMs
 */

import { runTestSuite } from './shared/test-utils.js';
import { runTests as runLLMIntegrationTests } from './integration/llm-integration.test.js';
import { runTests as runTargetedExtractionTests } from './integration/targeted-extraction.test.js';
import { runTests as runLLMTargetedContentTests } from './integration/llm-targeted-content.test.js';
import { runTests as runSimplifiedAlgorithmTests } from './integration/simplified-algorithms.test.js';
import { runTests as runAdventureLLMTests } from './integration/adventure-llm.test.js';
import { runTests as runMultiModelTests } from './integration/multi-model.test.js';

async function runAllIntegrationTests() {
  console.log('⚠️  These tests require external services (file system, LLM, repomix)');
  console.log('💡 Tests will be skipped if services are unavailable\n');

  await runTestSuite('🤖 MCP Repo Adventure - Integration Test Suite', [
    { name: 'LLM Integration', runner: runLLMIntegrationTests },
    { name: 'Targeted Extraction', runner: runTargetedExtractionTests },
    { name: 'LLM Targeted Content', runner: runLLMTargetedContentTests },
    { name: 'Simplified Architecture', runner: runSimplifiedAlgorithmTests },
    { name: 'Adventure LLM Integration', runner: runAdventureLLMTests },
    { name: 'Multi-Model Compatibility', runner: runMultiModelTests }
  ]);
}

// Run all tests
runAllIntegrationTests()
  .then(() => {
    // Force exit after successful completion to avoid hanging
    setTimeout(() => {
      process.exit(0);
    }, 100);
  })
  .catch(error => {
    console.error('💥 Integration test runner failed:', error);
    process.exit(1);
  });