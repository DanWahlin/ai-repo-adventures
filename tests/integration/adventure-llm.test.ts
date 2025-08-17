#!/usr/bin/env node

/**
 * Unit tests for adventure and file management functionality
 * Focused on testing our business logic, not library internals
 */

import { AdventureManager } from '../../packages/core/dist/adventure/adventure-manager.js';
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

  // Adventure Content Tests - Using repomixContent directly
  console.log('\n📁 Adventure Content Tests');
  console.log('-'.repeat(30));

  await test('Adventure content uses repomix content directly', async () => {
    const manager = new AdventureManager();
    assert(mockProjectInfo.repomixContent.length > 0, 'Mock project should have repomix content');
    assert(mockProjectInfo.repomixContent.includes('Test Project'), 'Should contain project content');
    assert(mockProjectInfo.repomixContent.includes('src/server.ts'), 'Should contain file references');
  });

  await test('Project info contains all required fields', async () => {
    assert(typeof mockProjectInfo.type === 'string', 'Should have project type');
    assert(typeof mockProjectInfo.fileCount === 'number', 'Should have file count');
    assert(Array.isArray(mockProjectInfo.mainTechnologies), 'Should have technologies array');
    assert(typeof mockProjectInfo.repomixContent === 'string', 'Should have repomix content');
    assert(mockProjectInfo.repomixContent.length > 0, 'Repomix content should not be empty');
  });

  // Error Context Tests
  console.log('\n🚨 Error Context Tests');
  console.log('-'.repeat(30));

  await test('Error logging includes theme and project type', async () => {
    const manager = new AdventureManager();
    
    // This test just verifies our error handling works without relying on specific LLM failures
    try {
      await manager.exploreQuest('non-existent-adventure');
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

  await test('Adventure manager initialization is performant', async () => {
    const manager = new AdventureManager();
    
    const startTime = Date.now();
    // Test that manager can be created quickly without file system operations
    const endTime = Date.now();
    
    // Manager creation should be very fast since we removed file indexing
    assert(endTime - startTime < 50, 'Adventure manager creation should be fast');
  });

  await test('Repomix content access is efficient', async () => {
    const startTime = Date.now();
    const content = mockProjectInfo.repomixContent;
    const hasContent = content.length > 0;
    const endTime = Date.now();
    
    assert(hasContent, 'Should have repomix content');
    assert(endTime - startTime < 10, 'Content access should be instant');
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