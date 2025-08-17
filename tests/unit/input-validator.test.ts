#!/usr/bin/env node

/**
 * Unit tests for Input Validation utilities - Pure function testing
 */

import { 
  validateAdventureChoice, 
  validateTheme 
} from '../../packages/core/dist/shared/input-validator.js';
import { createTestRunner, assert } from '../shared/test-utils.js';

export async function runInputValidatorTests() {
  console.log('✅ Running Input Validator Tests\n');
  const { test, stats, printResults } = await createTestRunner('Input Validator Tests');

  // validateAdventureChoice Tests
  console.log('\n📦 validateAdventureChoice Function Tests');
  console.log('-'.repeat(30));

  await test('validateAdventureChoice accepts valid inputs', () => {
    assert(validateAdventureChoice('1') === '1', 'Should accept quest number');
    assert(validateAdventureChoice('Quest 1') === 'Quest 1', 'Should accept quest title');
    assert(validateAdventureChoice('View progress') === 'View progress', 'Should accept progress command');
  });

  await test('validateAdventureChoice trims whitespace', () => {
    assert(validateAdventureChoice('  1  ') === '1', 'Should trim spaces');
    assert(validateAdventureChoice('\t2\n') === '2', 'Should trim tabs and newlines');
    assert(validateAdventureChoice('  Quest 1  ') === 'Quest 1', 'Should trim quest title');
  });

  await test('validateAdventureChoice rejects empty input', () => {
    try {
      validateAdventureChoice('');
      assert(false, 'Should throw error for empty string');
    } catch (error) {
      assert(error instanceof Error, 'Should throw Error');
      assert(error.message.includes('required'), 'Should mention required');
    }
  });

  await test('validateAdventureChoice rejects null/undefined', () => {
    try {
      validateAdventureChoice(null as any);
      assert(false, 'Should throw error for null');
    } catch (error) {
      assert(error instanceof Error, 'Should throw Error');
    }

    try {
      validateAdventureChoice(undefined as any);
      assert(false, 'Should throw error for undefined');
    } catch (error) {
      assert(error instanceof Error, 'Should throw Error');
    }
  });

  await test('validateAdventureChoice rejects overly long input', () => {
    const longString = 'a'.repeat(201); // Over 200 character limit
    try {
      validateAdventureChoice(longString);
      assert(false, 'Should throw error for long input');
    } catch (error) {
      assert(error instanceof Error, 'Should throw Error');
      assert(error.message.includes('too long'), 'Should mention length limit');
    }
  });

  await test('validateAdventureChoice accepts maximum length input', () => {
    const maxString = 'a'.repeat(200); // Exactly 200 characters
    const result = validateAdventureChoice(maxString);
    assert(result === maxString, 'Should accept exactly 200 characters');
  });

  // validateTheme Tests
  console.log('\n📦 validateTheme Function Tests');
  console.log('-'.repeat(30));

  await test('validateTheme accepts valid theme names', () => {
    assert(validateTheme('space') === 'space', 'Should accept space theme');
    assert(validateTheme('mythical') === 'mythical', 'Should accept mythical theme');
    assert(validateTheme('ancient') === 'ancient', 'Should accept ancient theme');
  });

  await test('validateTheme accepts theme numbers', () => {
    assert(validateTheme('1') === 'space', 'Should convert "1" to space');
    assert(validateTheme('2') === 'mythical', 'Should convert "2" to mythical');
    assert(validateTheme('3') === 'ancient', 'Should convert "3" to ancient');
  });

  await test('validateTheme handles case insensitive input', () => {
    assert(validateTheme('SPACE') === 'space', 'Should handle uppercase');
    assert(validateTheme('Mythical') === 'mythical', 'Should handle mixed case');
    assert(validateTheme('ANCIENT') === 'ancient', 'Should handle uppercase ancient');
  });

  await test('validateTheme trims whitespace', () => {
    assert(validateTheme('  space  ') === 'space', 'Should trim spaces');
    assert(validateTheme('\tmythical\n') === 'mythical', 'Should trim tabs/newlines');
  });

  await test('validateTheme rejects empty input', () => {
    try {
      validateTheme('');
      assert(false, 'Should throw error for empty string');
    } catch (error) {
      assert(error instanceof Error, 'Should throw Error');
      assert(error.message.includes('required'), 'Should mention required');
    }
  });

  await test('validateTheme rejects invalid themes', () => {
    try {
      validateTheme('invalid-theme');
      assert(false, 'Should throw error for invalid theme');
    } catch (error) {
      assert(error instanceof Error, 'Should throw Error');
      assert(error.message.includes('Invalid theme'), 'Should mention invalid theme');
      assert(error.message.includes('space'), 'Should list valid themes');
    }
  });

  await test('validateTheme rejects invalid numbers', () => {
    try {
      validateTheme('999');
      assert(false, 'Should throw error for invalid number');
    } catch (error) {
      assert(error instanceof Error, 'Should throw Error');
      assert(error.message.includes('Invalid theme'), 'Should mention invalid theme');
    }
  });

  await test('validateTheme rejects null/undefined', () => {
    try {
      validateTheme(null as any);
      assert(false, 'Should throw error for null');
    } catch (error) {
      assert(error instanceof Error, 'Should throw Error');
    }

    try {
      validateTheme(undefined as any);
      assert(false, 'Should throw error for undefined');
    } catch (error) {
      assert(error instanceof Error, 'Should throw Error');
    }
  });

  printResults();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runInputValidatorTests();
}