#!/usr/bin/env node

/**
 * Comprehensive test runner for all unit tests
 */

import { runTests as runAdventureAlgorithmTests } from './unit/adventure-algorithms.test.js';
import { runLLMClientTests } from './unit/llm-client.test.js';
import { runTests as runAdventureLLMTests } from './unit/adventure-llm.test.js';

async function runAllUnitTests() {
  console.log('🧪 MCP Repo Adventure - Unit Test Suite');
  console.log('=' .repeat(60));
  console.log('Running comprehensive unit tests for all core algorithms\n');

  let totalPassed = 0;
  let totalFailed = 0;
  const testSuites: { name: string; runner: () => Promise<void> }[] = [
    { name: 'Adventure Algorithms', runner: runAdventureAlgorithmTests },
    { name: 'LLM Client', runner: runLLMClientTests },
    { name: 'Adventure LLM Integration', runner: runAdventureLLMTests }
  ];

  for (const suite of testSuites) {
    console.log(`\n🎯 Running ${suite.name} Tests`);
    console.log('='.repeat(60));
    
    try {
      await suite.runner();
      console.log(`\n✅ ${suite.name} tests completed successfully`);
    } catch (error) {
      console.log(`\n❌ ${suite.name} tests failed:`, error);
      totalFailed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  
  const successfulSuites = testSuites.length - totalFailed;
  console.log(`Test Suites: ${successfulSuites}/${testSuites.length} passed`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 All unit tests passed successfully!');
    console.log('✨ The adventure algorithms are working correctly.');
    console.log('🚀 Ready for production deployment!');
  } else {
    console.log(`\n⚠️  ${totalFailed} test suite(s) failed.`);
    console.log('🔧 Please review and fix the failing tests before deployment.');
    process.exit(1);
  }
}

// Run all tests
runAllUnitTests().catch(error => {
  console.error('💥 Unit test runner failed:', error);
  process.exit(1);
});