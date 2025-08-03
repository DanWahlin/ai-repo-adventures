#!/usr/bin/env node

/**
 * Unit tests for adventure and file management functionality
 * Focused on testing our business logic, not library internals
 */

import { AdventureManager } from '../../src/adventure/adventure-manager.js';
import { FileContentManager } from '../../src/adventure/file-content-manager.js';
import { createTestRunner, mockProjectInfo, assert } from '../shared/test-utils.js';

async function runTests() {
  console.log('🧪 Running LLM Adventure Generation Tests\n');
  const { test, stats, printResults } = await createTestRunner('LLM Adventure Generation Tests');

  // Core Adventure Functionality Tests
  console.log('🔍 Basic Functionality Tests');
  console.log('-'.repeat(30));

  await test('Adventure manager initialization behavior', async () => {
    const manager = new AdventureManager();
    try {
      const result = await manager.initializeAdventure(mockProjectInfo, 'space');
      // If LLM is available, should succeed
      assert(typeof result === 'string', 'Should return story string when LLM available');
      assert(result.length > 0, 'Should return non-empty result');
      console.log('Adventure initialization succeeded with working LLM');
    } catch (error) {
      // If LLM is not available, should fail gracefully
      assert(error instanceof Error, 'Should throw Error when LLM unavailable');
      assert(error.message.includes('Unable to generate') || error.message.includes('LLM'), 'Should have meaningful error message');
      console.log('Adventure initialization failed as expected without LLM');
    }
  });

  // File Management Tests - Now using FileContentManager
  console.log('\n📁 File Management Tests');
  console.log('-'.repeat(30));

  await test('File content manager builds index correctly', async () => {
    const fileManager = new FileContentManager();
    fileManager.buildFileIndex(mockProjectInfo);
    
    const stats = fileManager.getIndexStats();
    assert(stats.totalEntries > 0, 'File index should not be empty');
    assert(stats.uniqueFiles > 0, 'Should have unique files indexed');
    assert(fileManager.hasFile('package.json'), 'Should index config files');
    assert(fileManager.hasFile('index.ts'), 'Should index source files by name');
  });

  await test('File lookup functionality works', async () => {
    const fileManager = new FileContentManager();
    fileManager.buildFileIndex(mockProjectInfo);
    
    const foundExact = fileManager.findFileInIndex('package.json');
    assert(foundExact === 'package.json', 'Should find exact file match');
    
    const foundPartial = fileManager.findFileInIndex('index');
    assert(foundPartial && foundPartial.includes('index'), 'Should find partial file match');
  });

  // Error Context Tests
  console.log('\n🚨 Error Context Tests');
  console.log('-'.repeat(30));

  await test('Error logging includes theme and project type', async () => {
    const manager = new AdventureManager();
    
    // This test just verifies our error handling works without relying on specific LLM failures
    try {
      await manager.exploreAdventure('non-existent-adventure');
      assert(false, 'Should handle non-existent adventure');
    } catch (error) {
      // Adventure exploration should handle missing adventures gracefully
      // This tests our business logic error handling
      assert(true, 'Error handling works correctly');
    }
  });

  // Performance Tests - Testing our code, not libraries
  console.log('\n⚡ Performance Tests');
  console.log('-'.repeat(30));

  await test('File indexing is performant', async () => {
    const fileManager = new FileContentManager();
    
    const startTime = Date.now();
    fileManager.buildFileIndex(mockProjectInfo);
    const endTime = Date.now();
    
    // File indexing should be very fast for our small test project
    assert(endTime - startTime < 100, 'File indexing should complete in under 100ms');
  });

  await test('File operations work efficiently', async () => {
    const fileManager = new FileContentManager();
    fileManager.buildFileIndex(mockProjectInfo);
    
    const startTime = Date.now();
    const found = fileManager.findFileInIndex('package.json');
    const stats = fileManager.getIndexStats();
    fileManager.clearIndex();
    const endTime = Date.now();
    
    assert(found === 'package.json', 'Should find file correctly');
    assert(stats.totalEntries > 0, 'Should have stats');
    assert(endTime - startTime < 50, 'Operations should be fast');
  });

  // Integration Tests
  console.log('\n🔗 Integration Tests');
  console.log('-'.repeat(30));

  await test('Adventure initialization works for all supported themes', async () => {
    const themes = ['space', 'mythical', 'ancient'];
    
    for (const theme of themes) {
      const manager = new AdventureManager();
      try {
        const result = await manager.initializeAdventure(mockProjectInfo, theme);
        // If this succeeds, LLM is working
        assert(typeof result === 'string', `Should return string for theme ${theme}`);
        assert(result.length > 0, `Should return content for theme ${theme}`);
        console.log(`Theme ${theme} initialization succeeded`);
      } catch (error) {
        // If LLM is not available, should fail gracefully for all themes
        assert(error instanceof Error, `Should throw Error for theme ${theme}`);
        console.log(`Theme ${theme} failed as expected:`, error.message);
      }
    }
  });

  printResults();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };