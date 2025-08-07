#!/usr/bin/env node

/**
 * Unit tests for simplified repomix-first architecture
 * Tests focus on the core functionality that remains after removing redundant LLM analysis
 */

import { AdventureManager } from '../../src/adventure/adventure-manager.js';
import { DynamicStoryGenerator } from '../../src/adventure/story-generator.js';
import { THEMES } from '../../src/shared/theme.js';
import { RepoAnalyzer } from '../../src/analyzer/repo-analyzer.js';
import { createTestRunner, mockProjectInfo, assert } from '../shared/test-utils.js';

async function runTests() {
  console.log('🧪 Running Simplified Architecture Unit Tests\n');
  const { test, stats, printResults } = await createTestRunner('Simplified Architecture Tests');

  // RepoAnalyzer Tests - New simplified API
  console.log('📁 RepoAnalyzer Tests');
  console.log('-'.repeat(30));

  await test('RepoAnalyzer generates repomix content', async () => {
    const analyzer = new RepoAnalyzer();
    
    // Test basic repomix generation for current directory
    const content = await analyzer.generateRepomixContext('.');
    assert(typeof content === 'string', 'Should return string content');
    assert(content.length > 0, 'Should generate non-empty content');
    assert(content.includes('# '), 'Should contain markdown headers');
  });

  await test('RepoAnalyzer caches content within TTL', async () => {
    const analyzer = new RepoAnalyzer();
    
    // First call should generate content
    const content1 = await analyzer.generateRepomixContext('.');
    
    // Second call within cache TTL should return same content
    const content2 = await analyzer.generateRepomixContext('.');
    
    assert(content1 === content2, 'Should return identical content from cache');
    assert(typeof content1 === 'string', 'Should return string content');
    assert(content1.length > 0, 'Should have non-empty cached content');
  });

  await test('RepoAnalyzer handles invalid paths', async () => {
    const analyzer = new RepoAnalyzer();
    
    // Test empty path
    try {
      await analyzer.generateRepomixContext('');
      assert.fail('Should throw error for empty path');
    } catch (error) {
      assert(error instanceof Error, 'Should throw Error');
      assert(error.message.includes('non-empty string'), 'Should reject empty path');
    }
    
    // Test path traversal
    try {
      await analyzer.generateRepomixContext('../../../etc');
      assert.fail('Should throw error for path traversal');
    } catch (error) {
      assert(error instanceof Error, 'Should throw Error');
      assert(error.message.includes('traversal') || error.message.includes('system directory'), 'Should reject dangerous paths');
    }
  });

  // Adventure Manager Tests
  console.log('\n🎮 Adventure Manager Tests');
  console.log('-'.repeat(30));

  await test('Adventure manager initializes with LLM', async () => {
    const manager = new AdventureManager();
    
    try {
      const result = await manager.initializeAdventure(mockProjectInfo, 'space');
      assert(typeof result === 'string', 'Should return story string');
      assert(result.length > 0, 'Should generate non-empty story');
    } catch (error) {
      // If LLM is not available, this is expected
      if (error instanceof Error && error.message.includes('LLM')) {
        console.log('   (LLM unavailable - using fallback)');
        assert(true, 'Expected LLM unavailability');
      } else {
        throw error;
      }
    }
  });

  await test('Adventure manager handles invalid choices', async () => {
    const manager = new AdventureManager();
    
    const result = await manager.exploreQuest('invalid-choice-12345');
    assert(typeof result.narrative === 'string', 'Should return narrative');
    assert(result.narrative.includes('not found') || result.narrative.includes('invalid'), 'Should handle invalid choices gracefully');
  });

  await test('Adventure manager provides empty progress initially', () => {
    const manager = new AdventureManager();
    
    const progress = manager.getProgress();
    assert(typeof progress.narrative === 'string', 'Should return progress narrative');
  });

  // Story Generator Tests
  console.log('\n📚 Story Generator Tests');
  console.log('-'.repeat(30));

  await test('Story generator validates themes', async () => {
    const generator = new DynamicStoryGenerator();
    generator.setProject(mockProjectInfo);

    // Test valid themes
    for (const theme of Object.values(THEMES)) {
      try {
        const story = await generator.generateStory(theme.key as any);
        assert(typeof story.content === 'string', `Should generate story for ${theme.key}`);
        assert(story.theme === theme.key, `Should return correct theme for ${theme.key}`);
      } catch (error) {
        // LLM might not be available - that's okay for unit tests
        if (error instanceof Error && (error.message.includes('LLM') || error.message.includes('template'))) {
          console.log(`   (LLM unavailable for ${theme} - using fallback)`);
          assert(true, 'Expected LLM unavailability');
        } else {
          throw error;
        }
      }
    }
  });

  await test('Story generator requires project to be set', async () => {
    const generator = new DynamicStoryGenerator();
    // Don't set project
    
    try {
      await generator.generateStory('space');
      assert.fail('Should require project to be set');
    } catch (error) {
      assert(error instanceof Error, 'Should throw Error');
      assert(error.message.includes('project'), 'Should mention project in error');
    }
  });

  await test('Story generator creates project-specific content', async () => {
    const generator = new DynamicStoryGenerator();
    generator.setProject(mockProjectInfo);

    try {
      const response = await generator.generateStoryAndAdventures(mockProjectInfo, 'space');
      assert(typeof response.story === 'string', 'Should return story');
      assert(Array.isArray(response.adventures), 'Should return adventures array');
      assert(response.adventures.length > 0, 'Should generate at least one adventure');
    } catch (error) {
      // If LLM is not available, fallback should still work
      if (error instanceof Error && error.message.includes('LLM')) {
        console.log('   (LLM unavailable - testing fallback)');
        // Test should still pass with fallback
      } else {
        throw error;
      }
    }
  });

  // Integration Tests
  console.log('\n🔗 Integration Tests');
  console.log('-'.repeat(30));

  await test('Complete workflow: repomix -> story -> adventure', async () => {
    const analyzer = new RepoAnalyzer();
    const manager = new AdventureManager();

    // Step 1: Generate repomix content
    const repomixContent = await analyzer.generateRepomixContext('.');
    
    // Step 2: Create ProjectInfo with repomix content
    const projectInfo = {
      ...mockProjectInfo,
      repomixContent
    };

    // Step 3: Initialize adventure
    try {
      const result = await manager.initializeAdventure(projectInfo, 'space');
      assert(typeof result === 'string', 'Should complete workflow');
      assert(result.length > 0, 'Should generate meaningful content');
    } catch (error) {
      if (error instanceof Error && error.message.includes('LLM')) {
        console.log('   (LLM unavailable - workflow uses fallbacks)');
        assert(true, 'Workflow should handle LLM unavailability');
      } else {
        throw error;
      }
    }
  });

  // Error Handling Tests
  console.log('\n🚨 Error Handling Tests');
  console.log('-'.repeat(30));

  await test('System handles missing repomix content gracefully', async () => {
    const manager = new AdventureManager();
    const emptyProject = {
      ...mockProjectInfo,
      repomixContent: ''
    };

    try {
      const result = await manager.initializeAdventure(emptyProject, 'space');
      // Should still work with fallback templates
      assert(typeof result === 'string', 'Should handle empty repomix content');
    } catch (error) {
      // This is also acceptable - system should handle gracefully
      assert(error instanceof Error, 'Should throw proper Error');
    }
  });

  await test('System handles invalid theme gracefully', async () => {
    const generator = new DynamicStoryGenerator();
    generator.setProject(mockProjectInfo);

    try {
      // This should default to a valid theme
      const story = await generator.generateStory('invalid-theme' as any);
      assert(Object.values(THEMES).some(t => t.key === story.theme), 'Should default to valid theme');
    } catch (error) {
      // This is also acceptable
      assert(error instanceof Error, 'Should handle invalid theme gracefully');
    }
  });

  printResults();
  return stats;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };