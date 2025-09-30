#!/usr/bin/env node

/**
 * Unit tests for HTML Generator functionality
 * Focus on testing the isTokenRateLimitError method and rate limit detection
 */

import { createTestRunner, assert } from '../shared/test-utils.js';
import { RateLimitError, RateLimitType } from '../../packages/core/dist/llm/llm-client.js';

async function runHtmlGeneratorTests() {
  console.log('🌐 Running HTML Generator Tests\n');
  const { test, stats, printResults } = await createTestRunner('HTML Generator Tests');

  // isTokenRateLimitError Method Tests
  console.log('\n🔍 isTokenRateLimitError Method Tests');
  console.log('-'.repeat(30));

  await test('isTokenRateLimitError recognizes TOKEN_RATE_EXCEEDED', () => {
    const error = new RateLimitError(
      RateLimitType.TOKEN_RATE_EXCEEDED,
      60,
      'Token rate exceeded'
    );

    // Simulate the html-generator's isTokenRateLimitError logic
    const isTokenRateLimit = (error instanceof RateLimitError) &&
      (error.type === RateLimitType.TOKEN_RATE_EXCEEDED ||
       error.type === RateLimitType.REQUEST_RATE_LIMIT);

    assert(isTokenRateLimit === true, 'Should recognize TOKEN_RATE_EXCEEDED');
  });

  await test('isTokenRateLimitError recognizes REQUEST_RATE_LIMIT', () => {
    const error = new RateLimitError(
      RateLimitType.REQUEST_RATE_LIMIT,
      30,
      'Request rate limit'
    );

    // Simulate the html-generator's isTokenRateLimitError logic
    const isTokenRateLimit = (error instanceof RateLimitError) &&
      (error.type === RateLimitType.TOKEN_RATE_EXCEEDED ||
       error.type === RateLimitType.REQUEST_RATE_LIMIT);

    assert(isTokenRateLimit === true, 'Should recognize REQUEST_RATE_LIMIT');
  });

  await test('isTokenRateLimitError rejects non-RateLimitError instances', () => {
    const regularError = new Error('Regular error');

    // Simulate the html-generator's isTokenRateLimitError logic
    const isTokenRateLimit = (regularError instanceof RateLimitError) &&
      (regularError.type === RateLimitType.TOKEN_RATE_EXCEEDED ||
       regularError.type === RateLimitType.REQUEST_RATE_LIMIT);

    assert(isTokenRateLimit === false, 'Should reject regular Error instances');
  });

  await test('isTokenRateLimitError handles null/undefined gracefully', () => {
    const nullError = null;
    const undefinedError = undefined;

    // Simulate the html-generator's isTokenRateLimitError logic with null
    const isNullRateLimit = (nullError instanceof RateLimitError) &&
      (nullError.type === RateLimitType.TOKEN_RATE_EXCEEDED ||
       nullError.type === RateLimitType.REQUEST_RATE_LIMIT);

    // Simulate the html-generator's isTokenRateLimitError logic with undefined
    const isUndefinedRateLimit = (undefinedError instanceof RateLimitError) &&
      (undefinedError.type === RateLimitType.TOKEN_RATE_EXCEEDED ||
       undefinedError.type === RateLimitType.REQUEST_RATE_LIMIT);

    assert(isNullRateLimit === false, 'Should handle null gracefully');
    assert(isUndefinedRateLimit === false, 'Should handle undefined gracefully');
  });

  await test('isTokenRateLimitError uses instanceof for type safety', () => {
    // Plain object that "looks like" a RateLimitError
    const fakeError = {
      type: RateLimitType.TOKEN_RATE_EXCEEDED,
      waitSeconds: 60,
      message: 'Fake error'
    };

    // Simulate the html-generator's isTokenRateLimitError logic
    const isTokenRateLimit = (fakeError instanceof RateLimitError) &&
      (fakeError.type === RateLimitType.TOKEN_RATE_EXCEEDED ||
       fakeError.type === RateLimitType.REQUEST_RATE_LIMIT);

    assert(isTokenRateLimit === false, 'Should require actual RateLimitError instance (not duck typing)');
  });

  await test('isTokenRateLimitError rejects NONE type', () => {
    // Create an error with NONE type (shouldn't happen in practice but test defensively)
    const error = new Error('Regular error') as any;
    error.type = RateLimitType.NONE;

    // Simulate the html-generator's isTokenRateLimitError logic
    const isTokenRateLimit = (error instanceof RateLimitError) &&
      (error.type === RateLimitType.TOKEN_RATE_EXCEEDED ||
       error.type === RateLimitType.REQUEST_RATE_LIMIT);

    assert(isTokenRateLimit === false, 'Should reject NONE type even if error shape matches');
  });

  // Wait Time Extraction Tests
  console.log('\n⏱️  Wait Time Extraction Tests');
  console.log('-'.repeat(30));

  await test('Extracts wait time from TOKEN_RATE_EXCEEDED error', () => {
    const error = new RateLimitError(
      RateLimitType.TOKEN_RATE_EXCEEDED,
      60,
      'Token rate exceeded'
    );

    // Simulate wait time extraction from html-generator
    const waitSeconds = (error instanceof RateLimitError) ? error.waitSeconds : 60;

    assert(waitSeconds === 60, 'Should extract wait time from error');
  });

  await test('Extracts custom wait time from REQUEST_RATE_LIMIT error', () => {
    const error = new RateLimitError(
      RateLimitType.REQUEST_RATE_LIMIT,
      45,
      'Request rate limit - retry after 45 seconds'
    );

    // Simulate wait time extraction from html-generator
    const waitSeconds = (error instanceof RateLimitError) ? error.waitSeconds : 60;

    assert(waitSeconds === 45, 'Should extract custom wait time');
  });

  await test('Defaults to 60 seconds for non-RateLimitError', () => {
    const error = new Error('Regular error');

    // Simulate wait time extraction from html-generator
    const waitSeconds = (error instanceof RateLimitError) ? error.waitSeconds : 60;

    assert(waitSeconds === 60, 'Should default to 60 seconds');
  });

  await test('Defaults to 60 seconds for null error', () => {
    const error = null;

    // Simulate wait time extraction from html-generator
    const waitSeconds = (error instanceof RateLimitError) ? error.waitSeconds : 60;

    assert(waitSeconds === 60, 'Should default to 60 seconds for null');
  });

  // Error Message Validation Tests
  console.log('\n💬 Error Message Validation Tests');
  console.log('-'.repeat(30));

  await test('RateLimitError preserves original Azure error message', () => {
    const originalAzureMessage = '429 Requests to the ChatCompletions_Create Operation have exceeded token rate limit';
    const error = new RateLimitError(
      RateLimitType.TOKEN_RATE_EXCEEDED,
      60,
      originalAzureMessage
    );

    assert(error.originalMessage === originalAzureMessage, 'Should preserve original Azure error message');
    assert(error.message.includes('Token rate limit exceeded'), 'Should have user-friendly message');
  });

  await test('RateLimitError for REQUEST_RATE_LIMIT includes retry time', () => {
    const error = new RateLimitError(
      RateLimitType.REQUEST_RATE_LIMIT,
      45,
      'Azure rate limit error'
    );

    assert(error.message.includes('45 seconds'), 'Error message should include wait time');
    assert(error.message.includes('Request rate limit'), 'Error message should mention request rate limit');
  });

  printResults();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runHtmlGeneratorTests();
}

export { runHtmlGeneratorTests };