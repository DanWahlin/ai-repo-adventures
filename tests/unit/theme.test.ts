#!/usr/bin/env node

/**
 * Unit tests for Theme utilities - Pure business logic testing
 */

import { 
  parseTheme, 
  isValidTheme, 
  formatThemeOption, 
  getThemeByKey, 
  getAllThemes,
  THEMES 
} from '../../packages/core/dist/shared/theme.js';
import { createTestRunner, assert } from '../shared/test-utils.js';

export async function runThemeTests() {
  console.log('🎨 Running Theme Utility Tests\n');
  const { test, stats, printResults } = await createTestRunner('Theme Tests');

  // parseTheme Tests
  console.log('\n📦 parseTheme Function Tests');
  console.log('-'.repeat(30));

  await test('parseTheme handles valid theme names', () => {
    assert(parseTheme('space') === 'space', 'Should parse "space" correctly');
    assert(parseTheme('mythical') === 'mythical', 'Should parse "mythical" correctly');
    assert(parseTheme('ancient') === 'ancient', 'Should parse "ancient" correctly');
  });

  await test('parseTheme handles theme numbers', () => {
    assert(parseTheme('1') === 'space', 'Should convert "1" to "space"');
    assert(parseTheme('2') === 'mythical', 'Should convert "2" to "mythical"');
    assert(parseTheme('3') === 'ancient', 'Should convert "3" to "ancient"');
  });

  await test('parseTheme handles case insensitive input', () => {
    assert(parseTheme('SPACE') === 'space', 'Should handle uppercase');
    assert(parseTheme('Mythical') === 'mythical', 'Should handle mixed case');
    assert(parseTheme('ANCIENT') === 'ancient', 'Should handle uppercase ancient');
  });

  await test('parseTheme handles whitespace', () => {
    assert(parseTheme('  space  ') === 'space', 'Should trim whitespace');
    assert(parseTheme('\tmythical\n') === 'mythical', 'Should handle tabs/newlines');
  });

  await test('parseTheme returns null for invalid input', () => {
    assert(parseTheme('invalid') === null, 'Should return null for invalid theme');
    assert(parseTheme('') === null, 'Should return null for empty string');
    assert(parseTheme('999') === null, 'Should return null for invalid number');
  });

  // isValidTheme Tests
  console.log('\n📦 isValidTheme Function Tests');
  console.log('-'.repeat(30));

  await test('isValidTheme accepts valid themes', () => {
    assert(isValidTheme('space') === true, 'Should accept "space"');
    assert(isValidTheme('mythical') === true, 'Should accept "mythical"');
    assert(isValidTheme('ancient') === true, 'Should accept "ancient"');
  });

  await test('isValidTheme rejects invalid themes', () => {
    assert(isValidTheme('invalid') === false, 'Should reject invalid theme');
    assert(isValidTheme('') === false, 'Should reject empty string');
    assert(isValidTheme('cyber') === false, 'Should reject non-existent theme');
  });

  await test('isValidTheme handles edge cases', () => {
    assert(isValidTheme('SPACE') === false, 'Should be case sensitive');
    assert(isValidTheme(' space ') === false, 'Should not handle whitespace');
  });

  // formatThemeOption Tests
  console.log('\n📦 formatThemeOption Function Tests');
  console.log('-'.repeat(30));

  await test('formatThemeOption creates proper formatting', () => {
    const spaceFormatted = formatThemeOption(THEMES.SPACE);
    assert(spaceFormatted.includes('1.'), 'Should include theme number');
    assert(spaceFormatted.includes('🚀'), 'Should include emoji');
    assert(spaceFormatted.includes('Space Exploration'), 'Should include display name');
    assert(spaceFormatted.includes('cosmic codebases'), 'Should include description');
  });

  await test('formatThemeOption handles all themes consistently', () => {
    const allThemes = getAllThemes();
    for (const theme of allThemes) {
      const formatted = formatThemeOption(theme);
      assert(formatted.includes(`${theme.id}.`), `Should include ID for ${theme.key}`);
      assert(formatted.includes(theme.emoji), `Should include emoji for ${theme.key}`);
      assert(formatted.includes(theme.displayName), `Should include name for ${theme.key}`);
    }
  });

  // getThemeByKey Tests
  console.log('\n📦 getThemeByKey Function Tests');
  console.log('-'.repeat(30));

  await test('getThemeByKey finds existing themes', () => {
    const spaceTheme = getThemeByKey('space');
    assert(spaceTheme !== null, 'Should find space theme');
    assert(spaceTheme?.key === 'space', 'Should return correct theme');
    assert(spaceTheme?.emoji === '🚀', 'Should have correct emoji');
  });

  await test('getThemeByKey returns null for invalid keys', () => {
    assert(getThemeByKey('invalid') === null, 'Should return null for invalid key');
    assert(getThemeByKey('') === null, 'Should return null for empty key');
  });

  // getAllThemes Tests
  console.log('\n📦 getAllThemes Function Tests');
  console.log('-'.repeat(30));

  await test('getAllThemes returns all themes', () => {
    const allThemes = getAllThemes();
    assert(Array.isArray(allThemes), 'Should return an array');
    assert(allThemes.length >= 3, 'Should have at least 3 themes');
    
    const themeKeys = allThemes.map(t => t.key);
    assert(themeKeys.includes('space'), 'Should include space theme');
    assert(themeKeys.includes('mythical'), 'Should include mythical theme');
    assert(themeKeys.includes('ancient'), 'Should include ancient theme');
  });

  await test('getAllThemes returns consistent data structure', () => {
    const allThemes = getAllThemes();
    for (const theme of allThemes) {
      assert(typeof theme.id === 'number', 'Theme ID should be number');
      assert(typeof theme.key === 'string', 'Theme key should be string');
      assert(typeof theme.displayName === 'string', 'Display name should be string');
      assert(typeof theme.emoji === 'string', 'Emoji should be string');
      assert(typeof theme.description === 'string', 'Description should be string');
      assert(Array.isArray(theme.keywords), 'Keywords should be array');
    }
  });

  printResults();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runThemeTests();
}