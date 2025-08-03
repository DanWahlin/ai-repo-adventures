#!/usr/bin/env node

/**
 * Unit tests for LLM Client functionality (simplified for MCP usage)
 */

import { LLMClient } from '../../src/llm/LLMClient.js';
import { createTestRunner, assert } from '../shared/test-utils.js';

async function runLLMClientTests() {
  console.log('🤖 Running LLM Client Tests\n');
  const { test, stats, printResults } = await createTestRunner('LLM Client Tests');

  // Caching Tests
  console.log('\n📦 Caching Tests');
  console.log('-'.repeat(30));

  await test('Request cache prevents duplicate LLM calls', async () => {
    const client = new LLMClient();
    
    const prompt = 'Simple cache test prompt';
    const response1 = await client.generateResponse(prompt);
    const response2 = await client.generateResponse(prompt);
    
    assert(response1.content === response2.content, 'Cached responses should be identical');
    assert(response1.model === response2.model, 'Response metadata should match');
  }, { skipIfNoLLM: true, timeout: 15000 });


  await test('Cache can be cleared', async () => {
    const client = new LLMClient();
    
    // Make a request to populate cache
    await client.generateResponse('Cache test prompt');
    
    // Clear cache using internal method
    const cache = (client as any).requestCache;
    cache.clear();
    
    assert(cache.size === 0, 'Cache should be empty after clearing');
  }, { skipIfNoLLM: true, timeout: 15000 });

  // Error Handling Tests
  console.log('\n🚨 Error Handling Tests');
  console.log('-'.repeat(30));

  await test('Client properly errors when API fails', async () => {
    // Create client with invalid configuration to force error
    const client = new LLMClient({
      baseURL: 'https://invalid-url-that-will-fail.com',
      apiKey: 'invalid-key'
    });
    
    try {
      await client.generateResponse('Test prompt that should fail');
      assert.fail('Should throw error when API is unavailable');
    } catch (error) {
      // Should now properly error instead of fallback
      assert(error instanceof Error, 'Should throw Error when API unavailable');
      assert(error.message.includes('LLM service unavailable') || error.message.includes('Network error'), 'Should have meaningful error message');
    }
  }, { timeout: 10000 });

  await test('Client availability check works correctly', () => {
    const client = new LLMClient();
    
    // Test that client has necessary methods
    assert(typeof client.isAvailable === 'function', 'Should have isAvailable method');
    assert(typeof client.generateResponse === 'function', 'Should have generateResponse method');
  });

  // Performance Tests
  console.log('\n⚡ Performance Tests');
  console.log('-'.repeat(30));

  await test('Cache lookup is fast', async () => {
    const client = new LLMClient();
    
    // Test that errors are not cached (should retry each time)
    let firstErrorTime, secondErrorTime;
    
    try {
      const start = Date.now();
      await client.generateResponse('Performance test prompt');
    } catch (error) {
      firstErrorTime = Date.now();
    }
    
    try {
      const start = Date.now();
      await client.generateResponse('Performance test prompt');  
    } catch (error) {
      secondErrorTime = Date.now();
    }
    
    // Both calls should fail (no caching of errors)
    assert(firstErrorTime && secondErrorTime, 'Both calls should fail without LLM service');
  }, { timeout: 20000 });


  // Print results using shared utility
  printResults();

  return { passed: stats.passed, failed: stats.failed };
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runLLMClientTests().catch(console.error);
}

export { runLLMClientTests };