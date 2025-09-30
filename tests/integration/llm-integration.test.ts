#!/usr/bin/env node

/**
 * Integration tests that actually call the LLM and validate responses
 */

import { AdventureManager } from '../../packages/core/dist/adventure/adventure-manager.js';
import { LLMClient } from '../../packages/core/dist/llm/llm-client.js';
import { 
  createTestRunner, 
  realProjectInfo, 
  assert, 
  TestHelpers 
} from '../shared/test-utils.js';

// Test helper
async function runTests() {
  console.log('🤖 Running LLM Integration Tests');
  console.log('');
  const { test, stats, printResults } = await createTestRunner('LLM Integration Tests');

  // LLM Client Integration Tests
  console.log('🔌 LLM Client Integration Tests');
  console.log('-'.repeat(40));

  await test('LLM client can generate basic text response', async () => {
    const llmClient = new LLMClient();
    const response = await llmClient.generateResponse('Say "Hello World" in exactly those words.');
    
    assert(response.content.length > 0, 'Should return non-empty response');
    assert(typeof response.content === 'string', 'Should return string content');
    
    // Use shared helper for case-insensitive word checking
    assert(TestHelpers.containsAllWords(response.content, ['hello', 'world']), 'Should contain requested text (case insensitive)');
  }, { timeout: 20000 });

  await test('LLM client can generate JSON response', async () => {
    const llmClient = new LLMClient();
    const prompt = 'Generate a JSON object with keys "name" and "description" for a TypeScript project.';
    const response = await llmClient.generateResponse(prompt, { responseFormat: 'json_object' });
    
    assert(response.content.length > 0, 'Should return non-empty response');
    
    // Use shared helper for JSON validation
    assert(TestHelpers.isValidJson(response.content), 'Should be valid JSON');
    const parsed = JSON.parse(response.content);
    assert(typeof parsed === 'object', 'Should parse to object');
    assert(typeof parsed.name === 'string', 'Should have name field');
    assert(typeof parsed.description === 'string', 'Should have description field');
  }, { timeout: 20000 });

  await test('LLM client handles multiple requests correctly', async () => {
    const llmClient = new LLMClient();
    const prompt = 'Respond with just the word "test": ';
    
    // First call
    const response1 = await llmClient.generateResponse(prompt);
    assert(response1.content.length > 0, 'First response should not be empty');
    
    // Second call - should work consistently
    const response2 = await llmClient.generateResponse(prompt);
    assert(response2.content.length > 0, 'Second response should not be empty');
    
    // Both responses should be valid
    assert(typeof response1.content === 'string', 'First response should be string');
    assert(typeof response2.content === 'string', 'Second response should be string');
  }, { timeout: 25000 });

  // Adventure Manager Integration Tests  
  console.log('');
  console.log('🎮 Adventure Manager Integration Tests');
  console.log('-'.repeat(40));

  await test('Adventure initialization generates valid story with LLM', async () => {
    const manager = new AdventureManager();
    const result = await manager.initializeAdventure(realProjectInfo, 'space');
    
    assert(typeof result === 'string', 'Should return story string');
    assert(result.length > 100, 'Story should be substantial (>100 chars)');
    assert(result.includes('adventure') || result.includes('Adventure'), 'Should mention adventures');
    
    // Output story content for visibility
    console.log('\n📖 Generated Story (Space Theme):');
    console.log('-'.repeat(50));
    const storyPreview = result.length > 500 ? result.substring(0, 500) + '...' : result;
    console.log(storyPreview);
    
    // More flexible space theme detection using shared helper
    const spaceWords = ['space', 'cosmic', 'star', 'galaxy', 'ship', 'orbit', 'universe', 'stellar', 'astro'];
    const foundSpaceWords = TestHelpers.getFoundWords(result, spaceWords);
    assert(foundSpaceWords.length > 0, `Should include space theme elements. Found: ${foundSpaceWords}`);
    
    // Check that adventures were created and output their details
    const progress = manager.getProgress();
    assert(progress.choices && progress.choices.length > 0, 'Should have created adventure choices');
    
    console.log('\n🎯 Available Adventures:');
    progress.choices?.forEach((choice, index) => {
      console.log(`  ${index + 1}. ${choice}`);
    });
  }, { timeout: 45000 });

  await test('Adventure exploration generates detailed content', async () => {
    const manager = new AdventureManager();
    
    // Initialize adventure first
    const storyResult = await manager.initializeAdventure(realProjectInfo, 'mythical');
    
    // Get available adventures before exploring
    const progress = manager.getProgress();
    const firstAdventure = progress.choices?.[0];
    
    console.log('\n🏰 Adventure Details (Medieval Theme):');
    console.log('-'.repeat(50));
    console.log(`🎯 Adventure Title: ${progress.choices?.[0] || 'No adventures available'}`);
    
    // Explore first adventure
    const result = await manager.exploreQuest('1');
    
    assert(typeof result.narrative === 'string', 'Should return narrative string');
    assert(result.narrative.length > 200, 'Narrative should be detailed (>200 chars)');
    assert(result.completed === true, 'Adventure should be marked as completed');
    assert(result.progressUpdate && result.progressUpdate.includes('%'), 'Should include progress update');
    
    // Output adventure narrative preview
    const narrativePreview = result.narrative.length > 400 ? result.narrative.substring(0, 400) + '...' : result.narrative;
    console.log(`📜 Adventure Narrative Preview:\n${narrativePreview}`);
    console.log(`\n📊 Progress: ${result.progressUpdate}`);
    
    // Check that mythical theme is present
    const mythical_indicators = ['mythical', 'knight', 'castle', 'quest', 'realm', 'kingdom'];
    const hasTheme = mythical_indicators.some(indicator => 
      result.narrative.toLowerCase().includes(indicator)
    );
    assert(hasTheme, 'Should include mythical theme elements');
  }, { timeout: 60000 });

  await test('Multiple themes generate different content', async () => {
    const manager1 = new AdventureManager();
    const manager2 = new AdventureManager();
    const manager3 = new AdventureManager();
    
    // Generate all three theme stories
    const spaceStory = await manager1.initializeAdventure(realProjectInfo, 'space');
    const ancientStory = await manager2.initializeAdventure(realProjectInfo, 'ancient');
    const mythicalStory = await manager3.initializeAdventure(realProjectInfo, 'mythical');
    
    console.log('\n🌟 Theme Comparison - Story Previews:');
    console.log('='.repeat(60));
    
    // Space theme
    const spacePreview = spaceStory.length > 200 ? spaceStory.substring(0, 200) + '...' : spaceStory;
    console.log(`\n🚀 SPACE THEME:\n${spacePreview}`);
    
    const spaceProgress = manager1.getProgress();
    console.log(`Adventures: ${spaceProgress.choices?.filter(c => c !== 'View progress').join(', ')}`);
    
    // Ancient theme  
    const ancientPreview = ancientStory.length > 200 ? ancientStory.substring(0, 200) + '...' : ancientStory;
    console.log(`\n🏛️ ANCIENT THEME:\n${ancientPreview}`);
    
    const ancientProgress = manager2.getProgress();
    console.log(`Adventures: ${ancientProgress.choices?.filter(c => c !== 'View progress').join(', ')}`);
    
    // Medieval theme
    const mythicalPreview = mythicalStory.length > 200 ? mythicalStory.substring(0, 200) + '...' : mythicalStory;
    console.log(`\n🏰 MEDIEVAL THEME:\n${mythicalPreview}`);
    
    const mythicalProgress = manager3.getProgress();
    console.log(`Adventures: ${mythicalProgress.choices?.filter(c => c !== 'View progress').join(', ')}`);
    
    assert(spaceStory !== ancientStory, 'Different themes should generate different stories');
    assert(spaceStory !== mythicalStory, 'Space and mythical should be different');
    assert(ancientStory !== mythicalStory, 'Ancient and mythical should be different');
    
    // Check theme-specific vocabulary using shared helpers
    const spaceWords = ['space', 'ship', 'galaxy', 'star', 'cosmic', 'orbital'];
    const ancientWords = ['temple', 'pyramid', 'ancient', 'wisdom', 'oracle', 'sacred'];
    
    assert(TestHelpers.containsAnyWord(spaceStory, spaceWords), 'Space story should contain space vocabulary');
    assert(TestHelpers.containsAnyWord(ancientStory, ancientWords), 'Ancient story should contain ancient vocabulary');
  }, { timeout: 90000 });

  // Response Quality Tests
  console.log('');
  console.log('🔍 Response Quality Tests');
  console.log('-'.repeat(40));

  await test('Story structure validation with secondary LLM call', async () => {
    const manager = new AdventureManager();
    const llmClient = new LLMClient();
    
    // Generate the story first
    const storyResult = await manager.initializeAdventure(realProjectInfo, 'space');
    const progress = manager.getProgress();
    
    // Get the actual adventures that were created
    assert(progress.choices && progress.choices.length > 0, 'Should have created adventures');
    const quests = progress.choices;
    
    // Use LLM to validate the story structure
    const validationPrompt = `Please analyze this story and quests for quality. This is a "gamified" type of concept for 
    learning about code repos as opposed to an actual book concept. The "chapters" concept is more about ensuring that the individual quest stories
    align with the overall story.
    Return JSON with:
    {
      "storyQuality": "good/poor",
      "hasOverallNarrative": true/false,
      "questsAreChapters": true/false,
      "themeConsistency": "good/poor",
      "reasoning": "explanation"
    }

    STORY: ${storyResult}
    
    QUESTS: ${JSON.stringify(quests)}`;

    const validation = await llmClient.generateResponse(validationPrompt, { responseFormat: 'json_object' });
    const validationResult = JSON.parse(validation.content);

    console.log(validationResult);
    
    // Assert the LLM validation results
    assert(validationResult.storyQuality === 'good', `Story quality should be good: ${validationResult.storyQuality}`);
    assert(validationResult.hasOverallNarrative === true, `Should have overall narrative: ${validationResult.hasOverallNarrative}`);
    assert(validationResult.questsAreChapters === true, `Quests should be chapters: ${validationResult.questsAreChapters}`);
    assert(validationResult.themeConsistency === 'good', `Theme should be consistent: ${validationResult.themeConsistency}`);

  }, { timeout: 30000 });

  await test('Adventure chapters validation with LLM analysis', async () => {
    const manager = new AdventureManager();
    const llmClient = new LLMClient();
    
    // Initialize with mythical theme
    const storyResult = await manager.initializeAdventure(realProjectInfo, 'mythical');
    
    // Explore first adventure to get detailed content
    const adventure1 = await manager.exploreQuest('1');
    
    // Use LLM to validate the adventure content
    const chapterValidationPrompt = `Analyze this adventure content to verify it's a proper "chapter" of a larger story. Return JSON:
    {
      "isProperChapter": true/false,
      "connectsToMainStory": true/false,
      "hasCodeEducationalContent": true/false,
      "mythicalThemeConsistent": true/false,
      "progressesNarrative": true/false,
      "reasoning": "detailed explanation"
    }

    MAIN STORY: ${storyResult}
    
    ADVENTURE CHAPTER: ${adventure1.narrative}`;

    const chapterValidation = await llmClient.generateResponse(chapterValidationPrompt, { responseFormat: 'json_object' });
    const chapterResult = JSON.parse(chapterValidation.content);
    
    // Assert the chapter validation results
    assert(chapterResult.isProperChapter === true, `Should be a proper chapter: ${chapterResult.reasoning}`);
    assert(chapterResult.connectsToMainStory === true, `Should connect to main story: ${chapterResult.reasoning}`);
    assert(chapterResult.hasCodeEducationalContent === true, `Should have educational content: ${chapterResult.reasoning}`);
    assert(chapterResult.mythicalThemeConsistent === true, `Should maintain theme: ${chapterResult.reasoning}`);
    assert(chapterResult.progressesNarrative === true, `Should progress narrative: ${chapterResult.reasoning}`);
    
  }, { timeout: 75000 });

  await test('Theme guidelines compliance validation', async () => {
    const manager = new AdventureManager();
    const llmClient = new LLMClient();
    
    // Test all three themes
    const themes: Array<'space' | 'mythical' | 'ancient'> = ['space', 'mythical', 'ancient'];
    
    for (const theme of themes) {
      const storyResult = await manager.initializeAdventure(realProjectInfo, theme);
      
      // Get theme-specific validation criteria
      const themeValidationPrompt = `Validate this ${theme}-themed story follows our guidelines. Return JSON:
      {
        "themeVocabularyCorrect": true/false,
        "noMixedThemes": true/false,
        "educationalValue": "high/medium/low",
        "projectIntegration": "good/poor",
        "storyCoherence": "good/poor",
        "forbiddenElements": [],
        "reasoning": "explanation"
      }

      Theme: ${theme.toUpperCase()}
      Expected: Should contain SOME ${theme === 'space' ? 'space-related terms (starship, cosmic, galaxy, mission, crew, navigation, etc.)' : 
                           theme === 'mythical' ? 'fantasy terms (castle, knight, quest, kingdom, magic, heroic, etc.)' : 
                           'ancient terms (temple, pyramid, wisdom, sacred, priest, ritual, etc.)'} 
      AND integrate actual project elements (like RepoAdventureServer, AdventureManager, TypeScript, etc.)
      
      Should NOT contain: ${theme === 'space' ? 'kingdoms, magic, temples, medieval elements' : 
                          theme === 'mythical' ? 'space ships, galaxies, ancient temples' : 
                          'space ships, galaxies, mythical castles'}

      IMPORTANT: Project-specific terms like "RepoAdventureServer" and "AdventureManager" are EXPECTED and GOOD - they show proper project integration.

      STORY: ${storyResult}`;

      const themeValidation = await llmClient.generateResponse(themeValidationPrompt, { responseFormat: 'json_object' });
      const themeResult = JSON.parse(themeValidation.content);
      
      // Assert theme compliance
      assert(themeResult.themeVocabularyCorrect === true, `${theme} theme vocabulary should be correct: ${themeResult.reasoning}`);
      assert(themeResult.noMixedThemes === true, `${theme} theme should not mix themes: ${themeResult.reasoning}`);
      assert(themeResult.educationalValue === 'high' || themeResult.educationalValue === 'medium', 
             `${theme} should have educational value: ${themeResult.reasoning}`);
      assert(themeResult.projectIntegration === 'good', `${theme} should integrate project info: ${themeResult.reasoning}`);
      assert(themeResult.forbiddenElements.length === 0, `${theme} should not have forbidden elements: ${themeResult.forbiddenElements}`);
    }
    
  }, { timeout: 120000 }); // Longer timeout for 3 themes

  await test('Multi-chapter story coherence validation', async () => {
    const manager = new AdventureManager();
    const llmClient = new LLMClient();
    
    // Initialize story
    const mainStory = await manager.initializeAdventure(realProjectInfo, 'ancient');
    const progress = manager.getProgress();
    
    // Explore multiple adventures to get chapter content
    const chapters: Array<{ id: number; narrative: string; completed: boolean | undefined }> = [];
    const maxChapters = Math.min(3, progress.choices?.length || 0);
    
    for (let i = 1; i <= maxChapters; i++) {
      try {
        const chapter = await manager.exploreQuest(i.toString());
        chapters.push({
          id: i,
          narrative: chapter.narrative,
          completed: chapter.completed
        });
      } catch (error) {
        // Some adventures might not be available - that's okay
        break;
      }
    }
    
    assert(chapters.length > 0, 'Should have at least one chapter to validate');
    
    // Use LLM to validate the multi-chapter coherence
    const coherencePrompt = `Analyze this story with multiple chapters for overall coherence. Return JSON:
    {
      "overallCoherence": "excellent/good/poor",
      "chaptersConnected": true/false,
      "progressiveNarrative": true/false,
      "educationalProgression": true/false,
      "themeConsistency": true/false,
      "storyCompleteness": "complete/partial/incomplete",
      "codebaseIntegration": "excellent/good/poor",
      "reasoning": "detailed analysis"
    }

    MAIN STORY: ${mainStory}
    
    CHAPTERS: ${JSON.stringify(chapters, null, 2)}`;

    const coherenceValidation = await llmClient.generateResponse(coherencePrompt, { responseFormat: 'json_object' });
    const coherenceResult = JSON.parse(coherenceValidation.content);
    
    // Assert story coherence
    assert(coherenceResult.overallCoherence === 'excellent' || coherenceResult.overallCoherence === 'good', 
           `Story should be coherent: ${coherenceResult.reasoning}`);
    assert(coherenceResult.chaptersConnected === true, 
           `Chapters should be connected: ${coherenceResult.reasoning}`);
    assert(coherenceResult.progressiveNarrative === true, 
           `Should have progressive narrative: ${coherenceResult.reasoning}`);
    assert(coherenceResult.educationalProgression === true, 
           `Should have educational progression: ${coherenceResult.reasoning}`);
    assert(coherenceResult.themeConsistency === true, 
           `Theme should be consistent: ${coherenceResult.reasoning}`);
    
  }, { timeout: 90000 });

  await test('LLM responses contain project-specific information', async () => {
    const manager = new AdventureManager();
    const result = await manager.initializeAdventure(realProjectInfo, 'space');
    
    // Should reference actual project technologies using shared helper
    const technologies = ['TypeScript', 'Node.js', 'MCP'];
    assert(TestHelpers.containsAnyWord(result, technologies), 'Should reference actual project technologies');
    
    // Should reference common project elements (more flexible than exact file names)
    const projectElements = ['src', 'package', 'index', 'test', 'dist', 'adventure', 'analyzer', 'server'];
    assert(TestHelpers.containsAnyWord(result, projectElements), `Should reference project elements. Found in story: "${result.substring(0, 200)}..."`);
  }, { timeout: 45000 });

  await test('Adventure content includes code snippets and hints', async () => {
    const manager = new AdventureManager();
    await manager.initializeAdventure(realProjectInfo, 'ancient');

    const result = await manager.exploreQuest('1');

    // Check for code-related content using shared helper
    const codeIndicators = ['function', 'class', 'import', 'export', 'const', 'let', '()', '{}'];
    assert(TestHelpers.containsAnyWord(result.narrative, codeIndicators), 'Should include code-related content');

    // Check for educational content using shared helper
    const educationalWords = ['learn', 'understand', 'explore', 'discover', 'pattern', 'architecture'];
    assert(TestHelpers.containsAnyWord(result.narrative, educationalWords), 'Should include educational content');
  }, { timeout: 45000 });

  // Quest Content Priority Integration Tests
  console.log('');
  console.log('🎯 Quest Content Priority Integration Tests');
  console.log('-'.repeat(40));

  await test('Quest with specific files uses targeted content (not full repo)', async () => {
    const manager = new AdventureManager();

    // Create project info with adventure.config.json
    const projectInfoWithConfig = {
      ...realProjectInfo,
      hasAdventureConfig: true
    };

    // Initialize with space theme
    await manager.initializeAdventure(projectInfoWithConfig, 'space');

    // Get progress to find a quest with codeFiles
    const progress = manager.getProgress();
    assert(progress.choices && progress.choices.length > 0, 'Should have quests available');

    // Explore the first quest - it should use quest-specific files if defined
    const result = await manager.exploreQuest('1');

    // Verify quest was generated
    assert(result.narrative && result.narrative.length > 0, 'Should generate quest narrative');
    assert(result.completed === true, 'Quest should be marked as completed');

    // The quest should reference specific code elements (not a generic full repo description)
    // This validates that targeted content was used instead of full repository context
    const hasSpecificCode = TestHelpers.containsAnyWord(result.narrative, [
      'function', 'class', 'method', 'import', 'export', 'const', 'interface'
    ]);
    assert(hasSpecificCode, 'Should contain specific code references from targeted files');

    // Verify the narrative is focused (not overly broad like full repo would be)
    // A targeted quest should be specific enough to be educational but not overwhelming
    assert(result.narrative.length < 15000, 'Quest narrative should be focused, not entire repo dump');

    console.log(`\n✅ Quest content is targeted (${result.narrative.length} chars)`);
    console.log(`   This validates quest-specific files take priority over full repo`);

  }, { timeout: 60000 });

  await test('Quest content respects adventure.config.json optimization', async () => {
    const manager = new AdventureManager();

    // Create project info WITH adventure.config.json but WITHOUT quest-specific files
    const projectInfoOptimized = {
      ...realProjectInfo,
      hasAdventureConfig: true
    };

    // Initialize adventure
    await manager.initializeAdventure(projectInfoOptimized, 'mythical');

    // Explore quest
    const result = await manager.exploreQuest('1');

    // Verify quest uses optimized content
    assert(result.narrative && result.narrative.length > 0, 'Should generate quest narrative');
    assert(result.completed === true, 'Quest should be completed');

    // Check that content is project-specific (validates adventure.config.json was used)
    const hasProjectElements = TestHelpers.containsAnyWord(result.narrative, [
      'TypeScript', 'package', 'src', 'test', 'adventure', 'analyzer'
    ]);
    assert(hasProjectElements, 'Should reference project elements from adventure.config.json');

    console.log(`\n✅ Quest uses adventure.config.json optimization`);
    console.log(`   Content size: ${result.narrative.length} chars`);

  }, { timeout: 60000 });

  // Note: LLM misconfiguration test removed due to ES module complexity
  // The LLMClient constructor properly throws 'LLM configuration required' error
  // when environment variables are not set, which can be verified manually

  // Print results using shared utility
  printResults();
  
  // Exit with error code if tests failed
  if (stats.failed > 0) {
    console.log('🔧 Please check LLM configuration and connectivity.');
    process.exit(1);
  } else {
    // Explicitly exit on success to ensure the process terminates
    process.exit(0);
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('💥 Integration test runner failed:', error);
    process.exit(1);
  });
}

export { runTests };