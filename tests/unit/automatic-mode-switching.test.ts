#!/usr/bin/env node

/**
 * Unit tests for automatic mode switching functionality
 */

import { createTestRunner, assert } from '../shared/test-utils.js';
import { RateLimitError, RateLimitType } from '../../packages/core/dist/llm/llm-client.js';

async function runAutomaticModeSwitchingTests() {
  console.log('🔄 Running Automatic Mode Switching Tests\n');
  const { test, stats, printResults } = await createTestRunner('Automatic Mode Switching');

  // RateLimitError Tests
  console.log('\n📦 RateLimitError Class Tests');
  console.log('-'.repeat(30));

  await test('RateLimitError creates with proper properties', () => {
    const error = new RateLimitError(
      RateLimitType.TOKEN_RATE_EXCEEDED,
      60,
      'Original Azure error message',
      new Error('Original error')
    );

    assert(error instanceof Error, 'Should be an instance of Error');
    assert(error.name === 'RateLimitError', 'Should have correct name');
    assert(error.type === RateLimitType.TOKEN_RATE_EXCEEDED, 'Should have correct type');
    assert(error.waitSeconds === 60, 'Should have correct wait time');
    assert(error.originalMessage === 'Original Azure error message', 'Should preserve original message');
    assert(error.originalError instanceof Error, 'Should preserve original error');
  });

  await test('RateLimitError message for token rate exceeded', () => {
    const error = new RateLimitError(
      RateLimitType.TOKEN_RATE_EXCEEDED,
      60,
      'Azure S0 token rate exceeded'
    );

    assert(error.message.includes('Token rate limit exceeded'), 'Message should mention token rate limit');
    assert(error.message.includes('200K tokens/60s'), 'Message should mention token window');
    assert(error.message.includes('60 seconds'), 'Message should include wait time');
  });

  await test('RateLimitError message for request rate limit', () => {
    const error = new RateLimitError(
      RateLimitType.REQUEST_RATE_LIMIT,
      30,
      'Azure S0 request rate limit'
    );

    assert(error.message.includes('Request rate limit'), 'Message should mention request rate limit');
    assert(error.message.includes('30 seconds'), 'Message should include wait time');
    assert(!error.message.includes('200K tokens'), 'Should not mention token window for request limits');
  });

  // Mode Switching Logic Tests
  console.log('\n🔄 Mode Switching Logic Tests');
  console.log('-'.repeat(30));

  await test('Detects token rate exceeded vs request rate limit', () => {
    const tokenError = new RateLimitError(
      RateLimitType.TOKEN_RATE_EXCEEDED,
      60,
      'token rate exceeded'
    );

    const requestError = new RateLimitError(
      RateLimitType.REQUEST_RATE_LIMIT,
      30,
      'request rate limit'
    );

    assert(tokenError.type === RateLimitType.TOKEN_RATE_EXCEEDED, 'Should identify token rate error');
    assert(requestError.type === RateLimitType.REQUEST_RATE_LIMIT, 'Should identify request rate error');
    assert(tokenError.type !== requestError.type, 'Error types should be different');
  });

  await test('Wait time defaults to 60 seconds for token rate limits', () => {
    const error = new RateLimitError(
      RateLimitType.TOKEN_RATE_EXCEEDED,
      undefined as any, // Test default value
      'error message'
    );

    assert(error.waitSeconds === 60, 'Should default to 60 seconds');
  });

  await test('Error can be caught and identified by type', () => {
    try {
      throw new RateLimitError(
        RateLimitType.TOKEN_RATE_EXCEEDED,
        60,
        'test error'
      );
    } catch (error) {
      if (error instanceof RateLimitError) {
        assert(error.type === RateLimitType.TOKEN_RATE_EXCEEDED, 'Should catch and identify error type');
      } else {
        assert(false, 'Should be RateLimitError instance');
      }
    }
  });

  // Progress Tracking Tests
  console.log('\n📊 Progress Tracking Tests');
  console.log('-'.repeat(30));

  await test('Completed themes tracking with Set', () => {
    const completedThemes = new Set<string>();

    // Add themes
    completedThemes.add('space');
    completedThemes.add('mythical');

    assert(completedThemes.size === 2, 'Should track 2 completed themes');
    assert(completedThemes.has('space'), 'Should track space theme');
    assert(completedThemes.has('mythical'), 'Should track mythical theme');

    // Test remaining themes calculation
    const allThemes = ['space', 'mythical', 'ancient', 'developer'];
    const remaining = allThemes.filter(t => !completedThemes.has(t));

    assert(remaining.length === 2, 'Should have 2 remaining themes');
    assert(remaining.includes('ancient'), 'Should include ancient in remaining');
    assert(remaining.includes('developer'), 'Should include developer in remaining');
  });

  await test('No duplicate completed themes', () => {
    const completedThemes = new Set<string>();

    completedThemes.add('space');
    completedThemes.add('space'); // Try to add duplicate
    completedThemes.add('space'); // Try again

    assert(completedThemes.size === 1, 'Should only have 1 theme despite duplicates');
  });

  // Wait Time Extraction Tests
  console.log('\n⏱️  Wait Time Extraction Tests');
  console.log('-'.repeat(30));

  await test('Sequential retry respects RateLimitError.waitSeconds', () => {
    const error = new RateLimitError(
      RateLimitType.TOKEN_RATE_EXCEEDED,
      30, // Custom wait time
      'Token rate exceeded'
    );

    const waitTime = (error instanceof RateLimitError) ? error.waitSeconds : 60;
    assert(waitTime === 30, 'Should extract custom wait time');
  });

  await test('Wait time extraction defaults to 60 for non-RateLimitError', () => {
    const error = new Error('Regular error');
    const waitTime = (error instanceof RateLimitError) ? error.waitSeconds : 60;
    assert(waitTime === 60, 'Should default to 60 seconds');
  });

  await test('Wait time extraction uses instanceof check for type safety', () => {
    const error = { waitSeconds: 45 }; // Plain object, not RateLimitError
    const waitTime = (error instanceof RateLimitError) ? error.waitSeconds : 60;
    assert(waitTime === 60, 'Should default because not a RateLimitError instance');
  });

  await test('Wait time handles null/undefined errors gracefully', () => {
    const error = null;
    const waitTime = (error instanceof RateLimitError) ? error.waitSeconds : 60;
    assert(waitTime === 60, 'Should handle null error');
  });

  await test('Both error types are recognized by detection pattern', () => {
    const tokenError = new RateLimitError(RateLimitType.TOKEN_RATE_EXCEEDED, 60, 'Test');
    const requestError = new RateLimitError(RateLimitType.REQUEST_RATE_LIMIT, 30, 'Test');

    const isTokenRateLimit = (tokenError instanceof RateLimitError) &&
      (tokenError.type === RateLimitType.TOKEN_RATE_EXCEEDED ||
       tokenError.type === RateLimitType.REQUEST_RATE_LIMIT);

    const isRequestRateLimit = (requestError instanceof RateLimitError) &&
      (requestError.type === RateLimitType.TOKEN_RATE_EXCEEDED ||
       requestError.type === RateLimitType.REQUEST_RATE_LIMIT);

    assert(isTokenRateLimit === true, 'Should recognize TOKEN_RATE_EXCEEDED');
    assert(isRequestRateLimit === true, 'Should recognize REQUEST_RATE_LIMIT');
  });

  await test('RateLimitError preserves original error context', () => {
    const originalError = new Error('Azure API error');
    const rateLimitError = new RateLimitError(
      RateLimitType.REQUEST_RATE_LIMIT,
      45,
      'Request rate limit',
      originalError
    );

    assert(rateLimitError.originalError === originalError, 'Should preserve original error');
    assert(rateLimitError.originalError?.message === 'Azure API error', 'Should preserve error message');
  });

  printResults();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAutomaticModeSwitchingTests();
}

export { runAutomaticModeSwitchingTests };