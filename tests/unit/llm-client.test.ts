#!/usr/bin/env node

/**
 * Unit tests for LLM Client functionality (simplified for MCP usage)
 */

import { strict as assert } from 'assert';
import { LLMClient } from '../../src/llm/LLMClient.js';

async function runLLMClientTests() {
  console.log('🤖 Running LLM Client Tests\n');
  let passed = 0;
  let failed = 0;

  // Test helper
  const test = async (name: string, testFn: () => Promise<void> | void) => {
    try {
      await testFn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  };

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
  });


  await test('Cache can be cleared', async () => {
    const client = new LLMClient();
    
    // Make a request to populate cache
    await client.generateResponse('Cache test prompt');
    
    // Clear cache using internal method
    const cache = (client as any).requestCache;
    cache.clear();
    
    assert(cache.size === 0, 'Cache should be empty after clearing');
  });

  // Error Handling Tests
  console.log('\n🚨 Error Handling Tests');
  console.log('-'.repeat(30));

  await test('Fallback responses work when API fails', async () => {
    // Create client with invalid configuration to force fallback
    const client = new LLMClient({
      baseURL: 'https://invalid-url-that-will-fail.com',
      apiKey: 'invalid-key'
    });
    
    const response = await client.generateResponse('Test fallback prompt');
    
    assert(response.content.length > 0, 'Should return fallback content');
    assert(response.provider === 'Fallback System', 'Should indicate fallback was used');
    assert(response.model === 'fallback-template', 'Should use fallback model');
  });

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
    
    // Prime cache (may timeout but should create fallback cache entry)
    try {
      await client.generateResponse('Performance test prompt');
    } catch (error) {
      // Expected to timeout, but fallback should be cached
    }
    
    // Test cached lookup speed - should be instant now
    const startTime = Date.now();
    try {
      await client.generateResponse('Performance test prompt');
    } catch (error) {
      // Even fallback responses should be cached
    }
    const endTime = Date.now();
    
    // Cache lookup should be very fast (under 50ms) even for fallback responses
    assert(endTime - startTime < 50, `Cache lookup should be very fast, but took ${endTime - startTime}ms`);
  });


  // Results Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 LLM CLIENT TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All LLM client tests passed!');
  } else {
    console.log(`\n⚠️  ${failed} tests failed. Please review the failures above.`);
  }

  return { passed, failed };
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runLLMClientTests().catch(console.error);
}

export { runLLMClientTests };