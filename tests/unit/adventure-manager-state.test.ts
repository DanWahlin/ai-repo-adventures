#!/usr/bin/env node

/**
 * Unit tests for AdventureManager State Management
 *
 * CRITICAL STATE TESTS:
 * - Quest caching and cache invalidation
 * - Quest prerequisite validation
 * - Quest finding by number, ID, and title (with checkmark prefix)
 * - Adventure config quest count enforcement
 * - Quest file merging from config
 * - Progress calculation edge cases
 * - State reset functionality
 */

import { AdventureManager, Quest } from '../../packages/core/dist/adventure/adventure-manager.js';
import { createTestRunner, assert, mockProjectInfo } from '../shared/test-utils.js';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export async function runAdventureManagerStateTests() {
  console.log('🎮 Running AdventureManager State Tests\n');
  const { test, stats, printResults } = await createTestRunner('AdventureManager State Tests');

  // ============================================================================
  // QUEST CACHING TESTS
  // ============================================================================

  console.log('\n💾 Quest Caching Behavior');
  console.log('-'.repeat(50));

  await test('quest content is cached after first exploration', async () => {
    const manager = new AdventureManager();

    // Initialize adventure with mock data
    await manager.initializeAdventure(mockProjectInfo, 'space');

    // Get initial progress to verify quests exist
    const progress = manager.getProgress();
    assert(progress.choices && progress.choices.length > 1, 'Should have quests available');

    // Explore first quest (should generate and cache content)
    const firstExploration = await manager.exploreQuest('1');
    assert(firstExploration.completed === true, 'First exploration should complete');
    assert(firstExploration.narrative.length > 0, 'Should have narrative content');

    // Explore same quest again (should use cached content)
    const secondExploration = await manager.exploreQuest('1');
    assert(secondExploration.completed === true, 'Second exploration should complete');
    assert(
      secondExploration.narrative.includes('[REVISITING COMPLETED QUEST]'),
      'Cached quest should have revisit indicator'
    );

    console.log('✓ Quest caching: First exploration generates, second uses cache');
  }, { timeout: 30000 });

  await test('different quests maintain separate cache entries', async () => {
    const manager = new AdventureManager();
    await manager.initializeAdventure(mockProjectInfo, 'mythical');

    // Explore two different quests
    const quest1 = await manager.exploreQuest('1');
    const quest2 = await manager.exploreQuest('2');

    // Both should be completed and have different content
    assert(quest1.completed === true, 'Quest 1 should complete');
    assert(quest2.completed === true, 'Quest 2 should complete');
    assert(quest1.narrative !== quest2.narrative, 'Different quests should have different content');

    // Re-explore quest 1 (should use cache)
    const quest1Again = await manager.exploreQuest('1');
    assert(
      quest1Again.narrative.includes('[REVISITING COMPLETED QUEST]'),
      'Quest 1 should be cached'
    );

    console.log('✓ Separate cache entries maintained for different quests');
  }, { timeout: 45000 });

  await test('state reset clears quest cache', async () => {
    const manager = new AdventureManager();
    await manager.initializeAdventure(mockProjectInfo, 'space');

    // Explore and cache quest
    await manager.exploreQuest('1');

    // Initialize new adventure (should reset state and cache)
    await manager.initializeAdventure(mockProjectInfo, 'ancient');

    // Explore quest in new adventure (should not have cache indicator)
    const freshQuest = await manager.exploreQuest('1');
    assert(
      !freshQuest.narrative.includes('[REVISITING COMPLETED QUEST]'),
      'New adventure should not have cached content from previous'
    );

    console.log('✓ State reset properly clears quest cache');
  }, { timeout: 45000 });

  // ============================================================================
  // QUEST FINDING TESTS
  // ============================================================================

  console.log('\n🔍 Quest Finding Logic');
  console.log('-'.repeat(50));

  await test('finds quest by numeric choice', async () => {
    const manager = new AdventureManager();
    await manager.initializeAdventure(mockProjectInfo, 'space');

    // Find by number
    const result = await manager.exploreQuest('1');
    assert(result.completed === true, 'Should find quest by number');
    assert(result.narrative.length > 0, 'Should return quest content');

    console.log('✓ Quest found by numeric choice (1, 2, 3, etc.)');
  }, { timeout: 30000 });

  await test('finds quest by title (partial match)', async () => {
    const manager = new AdventureManager();
    await manager.initializeAdventure(mockProjectInfo, 'mythical');

    const progress = manager.getProgress();
    const firstQuestTitle = progress.choices?.[0] || '';

    // Extract partial title (remove emoji and take first few words)
    const partialTitle = firstQuestTitle
      .replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\d+\.)\s*/u, '')
      .split(' ')
      .slice(0, 2)
      .join(' ');

    if (partialTitle.length > 3) {
      const result = await manager.exploreQuest(partialTitle);
      assert(result.completed === true, `Should find quest by partial title: "${partialTitle}"`);

      console.log(`✓ Quest found by partial title: "${partialTitle}"`);
    } else {
      console.log('⚠️  Quest title too short for partial match test');
    }
  }, { timeout: 30000 });

  await test('finds completed quest with checkmark prefix', async () => {
    const manager = new AdventureManager();
    await manager.initializeAdventure(mockProjectInfo, 'space');

    // Complete a quest
    await manager.exploreQuest('1');

    // Get progress to see completed quest with checkmark
    const progress = manager.getProgress();
    const completedQuestChoice = progress.choices?.find(c => c.includes('✅'));

    if (completedQuestChoice) {
      // Try to find using the checkmark-prefixed title
      const result = await manager.exploreQuest(completedQuestChoice);
      assert(result.completed === true, 'Should find quest even with ✅ prefix');
      assert(
        result.narrative.includes('[REVISITING COMPLETED QUEST]'),
        'Should return cached content'
      );

      console.log(`✓ Quest found with checkmark prefix: "${completedQuestChoice.substring(0, 30)}..."`);
    }
  }, { timeout: 30000 });

  await test('returns not found for invalid quest selection', async () => {
    const manager = new AdventureManager();
    await manager.initializeAdventure(mockProjectInfo, 'ancient');

    const result = await manager.exploreQuest('nonexistent-quest-12345');

    assert(result.narrative.includes('Quest not found'), 'Should return not found message');
    assert(result.choices && result.choices.length > 0, 'Should return available quest choices');
    assert(!result.completed, 'Should not mark as completed');

    console.log('✓ Invalid quest selection returns helpful error');
  }, { timeout: 30000 });

  // ============================================================================
  // PROGRESS TRACKING TESTS
  // ============================================================================

  console.log('\n📊 Progress Tracking');
  console.log('-'.repeat(50));

  await test('progress starts at 0% with no completed quests', async () => {
    const manager = new AdventureManager();
    await manager.initializeAdventure(mockProjectInfo, 'space');

    const progress = manager.getProgress();

    assert(progress.narrative.includes('0%'), 'Should show 0% progress');
    assert(progress.narrative.includes('0/'), 'Should show 0 completed quests');
    assert(progress.choices && progress.choices.length > 1, 'Should have quest choices');

    console.log('✓ Initial progress: 0% (0 completed quests)');
  });

  await test('progress updates after completing quests', async () => {
    const manager = new AdventureManager();
    await manager.initializeAdventure(mockProjectInfo, 'mythical');

    const quests = manager.getAllQuests();
    const totalQuests = quests.length;

    // Complete first quest
    await manager.exploreQuest('1');

    const progress1 = manager.getProgress();
    const expectedPercentage1 = Math.round((1 / totalQuests) * 100);
    assert(
      progress1.narrative.includes(`${expectedPercentage1}%`),
      `Should show ${expectedPercentage1}% after 1 quest`
    );

    // Complete second quest
    await manager.exploreQuest('2');

    const progress2 = manager.getProgress();
    const expectedPercentage2 = Math.round((2 / totalQuests) * 100);
    assert(
      progress2.narrative.includes(`${expectedPercentage2}%`),
      `Should show ${expectedPercentage2}% after 2 quests`
    );

    console.log(`✓ Progress tracking: ${expectedPercentage1}% → ${expectedPercentage2}%`);
  }, { timeout: 60000 });

  await test('progress shows 100% when all quests completed', async () => {
    const manager = new AdventureManager();
    await manager.initializeAdventure(mockProjectInfo, 'ancient');

    const quests = manager.getAllQuests();

    // Complete all quests
    for (let i = 1; i <= quests.length; i++) {
      await manager.exploreQuest(i.toString());
    }

    const finalProgress = manager.getProgress();

    assert(finalProgress.narrative.includes('100%'), 'Should show 100% completion');
    assert(
      finalProgress.narrative.includes('Congratulations'),
      'Should show completion message'
    );

    console.log(`✓ 100% completion after ${quests.length} quests`);
  }, { timeout: 90000 });

  await test('completed quests show checkmark in choices', async () => {
    const manager = new AdventureManager();
    await manager.initializeAdventure(mockProjectInfo, 'space');

    // Complete first quest
    await manager.exploreQuest('1');

    const progress = manager.getProgress();
    const firstChoice = progress.choices?.[0] || '';

    assert(firstChoice.includes('✅'), 'Completed quest should have checkmark');
    assert(!firstChoice.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u) || firstChoice.includes('✅'),
      'Theme emoji should be replaced with checkmark'
    );

    console.log(`✓ Completed quest displays: "${firstChoice.substring(0, 40)}..."`);
  }, { timeout: 30000 });

  // ============================================================================
  // QUEST CONFIG MERGING TESTS
  // ============================================================================

  console.log('\n🔧 Quest Configuration Merging');
  console.log('-'.repeat(50));

  await test('merges quest files from adventure.config.json by position', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adventure-test-'));

    try {
      // Create test files
      fs.writeFileSync(path.join(tempDir, 'file1.ts'), 'export const test1 = 1;');
      fs.writeFileSync(path.join(tempDir, 'file2.ts'), 'export const test2 = 2;');

      // Create adventure.config.json with quest files
      const config = {
        adventure: {
          quests: [
            {
              title: 'First Quest',
              files: [{ path: 'file1.ts' }]
            },
            {
              title: 'Second Quest',
              files: [{ path: 'file2.ts' }]
            }
          ]
        }
      };
      fs.writeFileSync(
        path.join(tempDir, 'adventure.config.json'),
        JSON.stringify(config, null, 2)
      );

      const manager = new AdventureManager();
      const projectInfo = { ...mockProjectInfo };

      await manager.initializeAdventure(projectInfo, 'space', tempDir);

      const quests = manager.getAllQuests();

      // First quest should have file1.ts
      assert(
        quests[0].codeFiles?.includes('file1.ts'),
        'First quest should have file1.ts from config'
      );

      // Second quest should have file2.ts
      if (quests.length > 1) {
        assert(
          quests[1].codeFiles?.includes('file2.ts'),
          'Second quest should have file2.ts from config'
        );
      }

      console.log('✓ Quest files merged by position from adventure.config.json');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, { timeout: 30000 });

  await test('enforces quest count from adventure.config.json', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adventure-test-'));

    try {
      // Create adventure.config.json with only 2 quests defined
      const config = {
        adventure: {
          quests: [
            { title: 'Quest 1', files: [] },
            { title: 'Quest 2', files: [] }
          ]
        }
      };
      fs.writeFileSync(
        path.join(tempDir, 'adventure.config.json'),
        JSON.stringify(config, null, 2)
      );

      const manager = new AdventureManager();
      await manager.initializeAdventure(mockProjectInfo, 'mythical', tempDir);

      const quests = manager.getAllQuests();

      // Should limit to 2 quests as defined in config
      assert(
        quests.length <= 2,
        `Should limit to 2 quests from config, got ${quests.length}`
      );

      console.log(`✓ Quest count enforced: ${quests.length} quests (max 2 from config)`);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, { timeout: 30000 });

  // ============================================================================
  // STATE MANAGEMENT TESTS
  // ============================================================================

  console.log('\n🔄 State Management');
  console.log('-'.repeat(50));

  await test('state resets properly on new adventure', async () => {
    const manager = new AdventureManager();

    // Initialize first adventure
    await manager.initializeAdventure(mockProjectInfo, 'space');
    await manager.exploreQuest('1');

    const progress1 = manager.getProgress();
    assert(progress1.narrative.includes('completed'), 'Should have completed quest');

    // Initialize new adventure
    await manager.initializeAdventure(mockProjectInfo, 'ancient');

    const progress2 = manager.getProgress();
    assert(progress2.narrative.includes('0%'), 'New adventure should start at 0%');
    assert(progress2.narrative.includes('0/'), 'New adventure should have 0 completed');

    console.log('✓ State reset: space adventure → ancient adventure (0% progress)');
  }, { timeout: 60000 });

  await test('getters return current state correctly', async () => {
    const manager = new AdventureManager();
    await manager.initializeAdventure(mockProjectInfo, 'mythical');

    const title = manager.getTitle();
    const story = manager.getStoryContent();
    const quests = manager.getAllQuests();
    const projectInfo = manager.getProjectInfo();
    const theme = manager.getCurrentTheme();

    assert(title.length > 0, 'Should have title');
    assert(story.length > 0, 'Should have story content');
    assert(quests.length > 0, 'Should have quests');
    assert(projectInfo !== undefined, 'Should have project info');
    assert(theme === 'mythical', 'Should have correct theme');

    console.log(`✓ State getters: title="${title.substring(0, 30)}...", quests=${quests.length}, theme=${theme}`);
  }, { timeout: 30000 });

  await test('handles quest prerequisite validation', async () => {
    const manager = new AdventureManager();

    // Try to explore quest without initializing adventure (should throw)
    try {
      await manager.exploreQuest('1');
      assert(false, 'Should throw error for missing project context');
    } catch (error) {
      assert(
        error instanceof Error && error.message.includes('project context'),
        'Should throw prerequisite error'
      );
    }

    console.log('✓ Prerequisite validation: throws error without project context');
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  console.log('\n⚠️  Edge Cases');
  console.log('-'.repeat(50));

  await test('handles empty quest list gracefully', async () => {
    const manager = new AdventureManager();

    // Mock project with minimal content that might generate fewer quests
    const minimalProject = {
      ...mockProjectInfo,
      repomixContent: '# Minimal Project\n\n## File: index.ts\n```typescript\nexport const x = 1;\n```'
    };

    await manager.initializeAdventure(minimalProject, 'space');

    const progress = manager.getProgress();

    // Should handle gracefully even if no quests generated
    assert(progress.narrative.length > 0, 'Should have progress narrative');
    assert(progress.choices !== undefined, 'Should have choices array');

    console.log('✓ Empty quest list handled gracefully');
  }, { timeout: 30000 });

  await test('handles re-exploring same quest multiple times', async () => {
    const manager = new AdventureManager();
    await manager.initializeAdventure(mockProjectInfo, 'space');

    // Explore same quest 3 times
    const exploration1 = await manager.exploreQuest('1');
    const exploration2 = await manager.exploreQuest('1');
    const exploration3 = await manager.exploreQuest('1');

    // All should succeed and use cache after first
    assert(exploration1.completed === true, 'First exploration completes');
    assert(
      exploration2.narrative.includes('[REVISITING COMPLETED QUEST]'),
      'Second exploration uses cache'
    );
    assert(
      exploration3.narrative.includes('[REVISITING COMPLETED QUEST]'),
      'Third exploration uses cache'
    );

    // Progress should only count quest once
    const progress = manager.getProgress();
    assert(progress.narrative.includes('1/'), 'Should only count quest once');

    console.log('✓ Re-exploring same quest: uses cache, counts once');
  }, { timeout: 45000 });

  await test('progress request returns current state', async () => {
    const manager = new AdventureManager();
    await manager.initializeAdventure(mockProjectInfo, 'ancient');

    // Complete first quest
    await manager.exploreQuest('1');

    // Request progress via text or number
    const progressByText = await manager.exploreQuest('progress');
    const progressByView = await manager.exploreQuest('View progress');

    assert(
      progressByText.narrative.includes('Quest Progress'),
      'Text "progress" should return progress'
    );
    assert(
      progressByView.narrative.includes('Quest Progress'),
      'Text "View progress" should return progress'
    );

    console.log('✓ Progress request: "progress" and "View progress" both work');
  }, { timeout: 30000 });

  printResults();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAdventureManagerStateTests();
}
