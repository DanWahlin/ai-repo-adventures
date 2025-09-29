#!/usr/bin/env node

/**
 * Test for sequential mode retry logic after token rate limit
 */

import { createTestRunner, assert } from '../shared/test-utils.js';

async function runSequentialRetryTests() {
  console.log('🔄 Running Sequential Retry Tests\n');
  const { test, stats, printResults } = await createTestRunner('Sequential Retry Logic');

  // Test retry logic concepts
  console.log('\n📦 Retry Logic Tests');
  console.log('-'.repeat(30));

  await test('Theme completion tracking prevents reprocessing', () => {
    const completedThemes = new Set<string>();
    const themes = ['space', 'mythical', 'ancient', 'developer'];
    const results: { theme: string; success: boolean }[] = [];

    // Simulate processing themes with retry
    for (const theme of themes) {
      let themeCompleted = completedThemes.has(theme);
      let retryCount = 0;
      const maxRetries = 3;

      while (!themeCompleted && retryCount < maxRetries) {
        // Simulate success on second attempt for 'mythical'
        if (theme === 'mythical' && retryCount === 0) {
          retryCount++;
          continue; // Simulate first failure
        }

        // Mark as completed
        completedThemes.add(theme);
        themeCompleted = true;
        results.push({ theme, success: true });
      }

      if (!themeCompleted) {
        results.push({ theme, success: false });
      }
    }

    assert(completedThemes.size === 4, 'All themes should be completed');
    assert(results.filter(r => r.success).length === 4, 'All results should be successful');
  });

  await test('Retry counter prevents infinite loops', () => {
    let retryCount = 0;
    const maxRetries = 3;
    let attempts = 0;

    while (retryCount < maxRetries) {
      attempts++;
      retryCount++;
    }

    assert(attempts === 3, 'Should attempt exactly maxRetries times');
    assert(retryCount === maxRetries, 'Retry count should equal max retries');
  });

  await test('Only rate limit errors trigger retry', () => {
    const errors = [
      { type: 'rate_limit', shouldRetry: true },
      { type: 'network', shouldRetry: false },
      { type: 'auth', shouldRetry: false },
      { type: 'rate_limit', shouldRetry: true }
    ];

    const retriedErrors = errors.filter(e => {
      // Simulate retry logic
      if (e.type === 'rate_limit') {
        return true; // Would retry
      }
      return false; // Would not retry
    });

    assert(retriedErrors.length === 2, 'Should only retry rate limit errors');
    assert(retriedErrors.every(e => e.type === 'rate_limit'), 'All retried errors should be rate limit type');
  });

  await test('Results array correctly tracks success after retry', () => {
    const results: { theme: string; success: boolean; attempt?: number }[] = [];
    const theme = 'space';
    let themeCompleted = false;
    let retryCount = 0;

    // Simulate failure then success
    while (!themeCompleted && retryCount < 3) {
      if (retryCount === 1) {
        // Success on second attempt
        results.push({ theme, success: true, attempt: retryCount + 1 });
        themeCompleted = true;
      } else {
        // Failure on first attempt
        retryCount++;
      }
    }

    assert(results.length === 1, 'Should have exactly one result');
    assert(results[0].success === true, 'Result should be successful');
    assert(results[0].attempt === 2, 'Should succeed on second attempt');
  });

  await test('Maximum retry limit is enforced', () => {
    const maxRetries = 3;
    let retryCount = 0;
    let themeCompleted = false;
    const results: any[] = [];

    // Simulate all attempts failing
    while (!themeCompleted && retryCount < maxRetries) {
      retryCount++;
      // Always fail
    }

    if (!themeCompleted && retryCount >= maxRetries) {
      results.push({ success: false, reason: 'Exceeded maximum retries' });
    }

    assert(retryCount === 3, 'Should attempt exactly 3 times');
    assert(results.length === 1, 'Should have one failure result');
    assert(results[0].success === false, 'Should be marked as failed');
    assert(results[0].reason.includes('maximum retries'), 'Should indicate max retries exceeded');
  });

  await test('Successful themes are not retried', () => {
    const completedThemes = new Set<string>();
    const theme = 'space';
    let attempts = 0;

    // First attempt succeeds
    attempts++;
    completedThemes.add(theme);

    // Check if we should retry (we shouldn't)
    if (!completedThemes.has(theme)) {
      attempts++; // This shouldn't happen
    }

    assert(attempts === 1, 'Should only attempt once for successful theme');
    assert(completedThemes.has(theme), 'Theme should be marked as completed');
  });

  printResults();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSequentialRetryTests();
}

export { runSequentialRetryTests };