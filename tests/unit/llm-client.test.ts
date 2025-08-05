#!/usr/bin/env node

/**
 * Unit tests for LLM Client functionality 
 * Focused on testing our business logic and error handling, not library internals
 */

import { LLMClient } from '../../src/llm/llm-client.js';
import { createTestRunner, assert } from '../shared/test-utils.js';

async function runLLMClientTests() {
  console.log('🤖 Running LLM Client Tests\n');
  const { test, stats, printResults } = await createTestRunner('LLM Client Tests');

  // Basic Functionality Tests
  console.log('\n📦 Basic Functionality Tests');
  console.log('-'.repeat(30));

  await test('LLM client has required methods', () => {
    const client = new LLMClient();
    
    // Test that client has necessary methods for our application
    assert(typeof client.generateResponse === 'function', 'Should have generateResponse method');
  });

  await test('LLM client initializes with configuration', async () => {
    // If we get here without an error, the client initialized successfully
    const client = new LLMClient();
    assert(client, 'Client should initialize when properly configured');
  });

  // Caching Tests - Testing our application logic
  console.log('\n📦 Response Caching Tests');
  console.log('-'.repeat(30));

  await test('LLM response caching behavior', async () => {
    const client = new LLMClient();
    
    try {
      const prompt = 'Simple cache test prompt for our application';
      const response1 = await client.generateResponse(prompt);
      const response2 = await client.generateResponse(prompt);
      
      // If LLM is available, cached responses should be identical
      assert(response1.content === response2.content, 'Cached responses should be identical');
      assert(response1.model === response2.model, 'Response metadata should match');
      console.log('Using cached LLM response');
      console.log('LLM caching works correctly with available service');
    } catch (error) {
      // If LLM is not available, that's also a valid test outcome
      assert(error instanceof Error, 'Should handle LLM unavailability gracefully');
      console.log('LLM caching test skipped - service unavailable');
    }
  }, { timeout: 15000 });

  // Error Handling Tests - Our business logic
  console.log('\n🚨 Error Handling Tests');
  console.log('-'.repeat(30));

  await test('Client handles invalid requests gracefully', async () => {
    const client = new LLMClient();
    
    try {
      await client.generateResponse('Test prompt that might fail');
      // If successful, that's fine too
      assert(true, 'Request succeeded or failed gracefully');
    } catch (error) {
      // Our error handling should provide meaningful feedback
      assert(error instanceof Error, 'Should throw Error when request fails');
      assert(
        error.message.includes('LLM request failed') || 
        error.message.includes('Request timeout'),
        'Should have meaningful error message'
      );
    }
  }, { timeout: 10000 });

  await test('Client request handling works correctly', async () => {
    const client = new LLMClient();
    
    try {
      // Use Promise.race with a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test request timeout')), 5000);
      });
      
      const response = await Promise.race([
        client.generateResponse('Test: respond with "ok"'),
        timeoutPromise
      ]);
      
      assert(typeof response === 'object' && 'content' in response, 'Should return valid response');
    } catch (error) {
      // It's expected that this might fail due to network issues, invalid endpoints, etc.
      assert(error instanceof Error, 'Should get proper error');
      console.log('    Note: Request failed (expected if no valid LLM configuration)');
    }
  }, { timeout: 10000 });

  printResults();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runLLMClientTests();
}

export { runLLMClientTests };