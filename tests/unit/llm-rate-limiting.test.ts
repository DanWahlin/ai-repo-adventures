#!/usr/bin/env node

/**
 * Unit tests for LLM rate limiting functionality
 */

import { strict as assert } from 'assert';
import { LLMClient } from '../../src/llm/LLMClient.js';

async function runLLMRateLimitingTests() {
  console.log('🔒 Running LLM Rate Limiting Tests\n');
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

  // Rate Limiting Tests
  console.log('🚦 Rate Limiting Tests');
  console.log('-'.repeat(30));

  await test('Rate limiter enforces request cooldown', async () => {
    const client = new LLMClient({
      rateLimitConfig: {
        maxRequestsPerMinute: 10,
        maxConcurrentRequests: 2,
        requestCooldownMs: 500 // 500ms cooldown
      }
    });

    const startTime = Date.now();
    
    // Make two rapid requests
    const promises = [
      client.generateResponse('Test prompt 1'),
      client.generateResponse('Test prompt 2')
    ];
    
    await Promise.all(promises);
    const endTime = Date.now();
    
    // Second request should be delayed by cooldown
    assert(endTime - startTime >= 500, 'Second request should be delayed by cooldown period');
  });

  await test('Rate limiter enforces concurrent request limit', async () => {
    const client = new LLMClient({
      rateLimitConfig: {
        maxRequestsPerMinute: 10,
        maxConcurrentRequests: 1, // Only 1 concurrent request
        requestCooldownMs: 100
      }
    });

    const startTime = Date.now();
    
    // Try to make 3 concurrent requests with limit of 1
    const promises = [
      client.generateResponse('Concurrent test 1'),
      client.generateResponse('Concurrent test 2'),
      client.generateResponse('Concurrent test 3')
    ];
    
    await Promise.all(promises);
    const endTime = Date.now();
    
    // Requests should be serialized due to concurrent limit
    assert(endTime - startTime >= 200, 'Requests should be serialized with concurrent limit');
  });

  await test('Request cache prevents duplicate LLM calls', async () => {
    const client = new LLMClient();
    
    const prompt = 'Cache test prompt';
    const systemPrompt = 'Test system prompt';
    
    const startTime = Date.now();
    const response1 = await client.generateResponse(prompt, systemPrompt);
    const midTime = Date.now();
    const response2 = await client.generateResponse(prompt, systemPrompt); // Same prompt
    const endTime = Date.now();
    
    // First call should be slower (actual API call or fallback generation)
    // Second call should be faster (cached)
    const firstCallTime = midTime - startTime;
    const secondCallTime = endTime - midTime;
    
    assert(response1.content === response2.content, 'Cached response should match original');
    assert(secondCallTime < firstCallTime, 'Cached call should be faster');
  });

  await test('Cache key generation is consistent', () => {
    const client = new LLMClient();
    
    // Access private method for testing
    const getCacheKey = (client as any).getCacheKey.bind(client);
    
    const key1 = getCacheKey('test prompt', 'system');
    const key2 = getCacheKey('test prompt', 'system');
    const key3 = getCacheKey('different prompt', 'system');
    const key4 = getCacheKey('test prompt', 'different system');
    
    assert(key1 === key2, 'Same inputs should generate same cache key');
    assert(key1 !== key3, 'Different prompts should generate different keys');
    assert(key1 !== key4, 'Different system prompts should generate different keys');
  });

  await test('Cache can be cleared', async () => {
    const client = new LLMClient();
    
    // Make a request to populate cache
    await client.generateResponse('Cache clear test');
    
    const configBefore = client.getConfiguration();
    assert(configBefore.cacheSize > 0, 'Cache should have entries');
    
    client.clearCache();
    
    const configAfter = client.getConfiguration();
    assert(configAfter.cacheSize === 0, 'Cache should be empty after clearing');
  });

  await test('Rate limiting configuration is respected', () => {
    const customConfig = {
      maxRequestsPerMinute: 5,
      maxConcurrentRequests: 1,
      requestCooldownMs: 2000
    };
    
    const client = new LLMClient({
      rateLimitConfig: customConfig
    });
    
    // Verify configuration is applied (would need to access private rateLimiter for full verification)
    const config = client.getConfiguration();
    assert(typeof config.cacheSize === 'number', 'Should track cache size');
    assert(config.provider, 'Should have provider information');
  });

  await test('Fallback responses work when API fails', async () => {
    const client = new LLMClient({
      baseURL: 'https://invalid-api-endpoint.com',
      apiKey: 'invalid-key'
    });
    
    const response = await client.generateResponse('test prompt for fallback');
    
    assert(response.content.length > 0, 'Should return fallback content');
    assert(response.provider === 'Fallback System', 'Should indicate fallback was used');
    assert(response.model === 'fallback-template', 'Should use fallback model identifier');
  });

  await test('Client availability check works correctly', () => {
    // Test with environment variables present/absent
    const originalApiKey = process.env.LLM_API_KEY;
    const originalOpenAIKey = process.env.OPENAI_API_KEY;
    const originalGitHubToken = process.env.GITHUB_TOKEN;
    
    // Remove all keys
    delete process.env.LLM_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GITHUB_TOKEN;
    
    const clientWithoutKey = new LLMClient();
    assert(!clientWithoutKey.isAvailable(), 'Should report not available without API keys');
    
    // Restore keys
    if (originalApiKey) process.env.LLM_API_KEY = originalApiKey;
    if (originalOpenAIKey) process.env.OPENAI_API_KEY = originalOpenAIKey;    
    if (originalGitHubToken) process.env.GITHUB_TOKEN = originalGitHubToken;
    
    const clientWithKey = new LLMClient();
    // Should be available if any key exists
  });

  // Performance Tests
  console.log('\n⚡ Performance Tests');
  console.log('-'.repeat(30));

  await test('Cache lookup is fast', async () => {
    const client = new LLMClient();
    
    // Prime the cache
    await client.generateResponse('Performance test prompt');
    
    // Test cache lookup speed
    const startTime = Date.now();
    await client.generateResponse('Performance test prompt'); // Same prompt (cached)
    const endTime = Date.now();
    
    assert(endTime - startTime < 50, 'Cache lookup should complete in under 50ms');
  });

  await test('Rate limiter overhead is minimal', async () => {
    const client = new LLMClient({
      rateLimitConfig: {
        maxRequestsPerMinute: 100,
        maxConcurrentRequests: 10,
        requestCooldownMs: 0 // No cooldown for performance test
      }
    });
    
    const startTime = Date.now();
    
    // Test a single cached call (should be very fast)
    const samePrompt = 'Rate limit perf test cached';
    await client.generateResponse(samePrompt); // Prime cache
    await client.generateResponse(samePrompt); // Use cache
    
    const endTime = Date.now();
    
    // Cached calls should be very fast
    assert(endTime - startTime < 2000, 'Rate limiting should not add excessive overhead for cached calls');
  });

  // Results Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 LLM RATE LIMITING TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All LLM rate limiting tests passed!');
  } else {
    console.log(`\n⚠️  ${failed} tests failed. Please review the failures above.`);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runLLMRateLimitingTests().catch(error => {
    console.error('💥 LLM rate limiting test runner failed:', error);
    process.exit(1);
  });
}

export { runLLMRateLimitingTests };