#!/usr/bin/env node

/**
 * Integration tests that actually call the LLM and validate responses
 */

import { AdventureManager } from '../../src/adventure/AdventureManager.js';
import { LLMClient } from '../../src/llm/LLMClient.js';
import { 
  createTestRunner, 
  realProjectInfo, 
  assert, 
  TestHelpers 
} from '../shared/test-utils.js';

// Test helper
async function runTests() {
  console.log('🤖 Running LLM Integration Tests\\n');
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
  }, { skipIfNoLLM: true, timeout: 20000 });

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
  }, { skipIfNoLLM: true, timeout: 20000 });

  await test('LLM client handles caching correctly', async () => {
    const llmClient = new LLMClient();
    const prompt = 'Generate a unique UUID: ';
    
    // First call
    const response1 = await llmClient.generateResponse(prompt);
    assert(response1.content.length > 0, 'First response should not be empty');
    
    // Second call - should be cached
    const response2 = await llmClient.generateResponse(prompt);
    assert(response2.content === response1.content, 'Second response should be cached and identical');
  }, { skipIfNoLLM: true, timeout: 25000 });

  // Adventure Manager Integration Tests  
  console.log('\\n🎮 Adventure Manager Integration Tests');
  console.log('-'.repeat(40));

  await test('Adventure initialization generates valid story with LLM', async () => {
    const manager = new AdventureManager();
    const result = await manager.initializeAdventure(realProjectInfo, 'space');
    
    assert(typeof result === 'string', 'Should return story string');
    assert(result.length > 100, 'Story should be substantial (>100 chars)');
    assert(result.includes('adventure') || result.includes('Adventure'), 'Should mention adventures');
    
    // More flexible space theme detection using shared helper
    const spaceWords = ['space', 'cosmic', 'star', 'galaxy', 'ship', 'orbit', 'universe', 'stellar', 'astro'];
    const foundSpaceWords = TestHelpers.getFoundWords(result, spaceWords);
    assert(foundSpaceWords.length > 0, `Should include space theme elements. Found: ${foundSpaceWords}`);
    
    // Check that adventures were created
    const progress = manager.getProgress();
    assert(progress.choices && progress.choices.length > 0, 'Should have created adventure choices');
  }, { skipIfNoLLM: true, timeout: 45000 });

  await test('Adventure exploration generates detailed content', async () => {
    const manager = new AdventureManager();
    
    // Initialize adventure first
    await manager.initializeAdventure(realProjectInfo, 'medieval');
    
    // Explore first adventure
    const result = await manager.exploreAdventure('1');
    
    assert(typeof result.narrative === 'string', 'Should return narrative string');
    assert(result.narrative.length > 200, 'Narrative should be detailed (>200 chars)');
    assert(result.completed === true, 'Adventure should be marked as completed');
    assert(result.progressUpdate && result.progressUpdate.includes('%'), 'Should include progress update');
    
    // Check that medieval theme is present
    const medieval_indicators = ['medieval', 'knight', 'castle', 'quest', 'realm', 'kingdom'];
    const hasTheme = medieval_indicators.some(indicator => 
      result.narrative.toLowerCase().includes(indicator)
    );
    assert(hasTheme, 'Should include medieval theme elements');
  }, { skipIfNoLLM: true, timeout: 60000 });

  await test('Multiple themes generate different content', async () => {
    const manager1 = new AdventureManager();
    const manager2 = new AdventureManager();
    
    // Generate space and ancient theme stories
    const spaceStory = await manager1.initializeAdventure(realProjectInfo, 'space');
    const ancientStory = await manager2.initializeAdventure(realProjectInfo, 'ancient');
    
    assert(spaceStory !== ancientStory, 'Different themes should generate different stories');
    
    // Check theme-specific vocabulary using shared helpers
    const spaceWords = ['space', 'ship', 'galaxy', 'star', 'cosmic', 'orbital'];
    const ancientWords = ['temple', 'pyramid', 'ancient', 'wisdom', 'oracle', 'sacred'];
    
    assert(TestHelpers.containsAnyWord(spaceStory, spaceWords), 'Space story should contain space vocabulary');
    assert(TestHelpers.containsAnyWord(ancientStory, ancientWords), 'Ancient story should contain ancient vocabulary');
  }, { skipIfNoLLM: true, timeout: 60000 });

  // Response Quality Tests
  console.log('\\n🔍 Response Quality Tests');
  console.log('-'.repeat(40));

  await test('LLM responses contain project-specific information', async () => {
    const manager = new AdventureManager();
    const result = await manager.initializeAdventure(realProjectInfo, 'space');
    
    // Should reference actual project technologies using shared helper
    const technologies = ['TypeScript', 'Node.js', 'MCP'];
    assert(TestHelpers.containsAnyWord(result, technologies), 'Should reference actual project technologies');
    
    // Should reference actual file structure
    const files = ['src/', 'package.json', 'index.ts'];
    assert(TestHelpers.containsAnyWord(result, files), 'Should reference actual project files');
  }, { skipIfNoLLM: true, timeout: 45000 });

  await test('Adventure content includes code snippets and hints', async () => {
    const manager = new AdventureManager();
    await manager.initializeAdventure(realProjectInfo, 'ancient');
    
    const result = await manager.exploreAdventure('1');
    
    // Check for code-related content using shared helper
    const codeIndicators = ['function', 'class', 'import', 'export', 'const', 'let', '()', '{}'];
    assert(TestHelpers.containsAnyWord(result.narrative, codeIndicators), 'Should include code-related content');
    
    // Check for educational content using shared helper
    const educationalWords = ['learn', 'understand', 'explore', 'discover', 'pattern', 'architecture'];
    assert(TestHelpers.containsAnyWord(result.narrative, educationalWords), 'Should include educational content');
  }, { skipIfNoLLM: true, timeout: 45000 });

  await test('Fallback system works when LLM unavailable', async () => {
    // Create a manager with a broken LLM client (simulate failure)
    const manager = new AdventureManager();
    
    // Temporarily break the LLM by using invalid config
    const originalEnv = process.env.LLM_PROVIDER;
    process.env.LLM_PROVIDER = 'invalid-provider';
    
    try {
      const result = await manager.initializeAdventure(realProjectInfo, 'space');
      
      // Should still return a story (fallback)
      assert(typeof result === 'string', 'Should return fallback story');
      assert(result.length > 50, 'Fallback story should be substantial');
      assert(result.includes('adventure'), 'Fallback should mention adventures');
      
      // Should have created some adventures
      const progress = manager.getProgress();
      assert(progress.choices && progress.choices.length > 0, 'Should have fallback adventures');
      
    } finally {
      // Restore environment
      if (originalEnv) {
        process.env.LLM_PROVIDER = originalEnv;
      } else {
        delete process.env.LLM_PROVIDER;
      }
    }
  }, { timeout: 15000 }); // No skipIfNoLLM since we're testing fallback

  // Print results using shared utility
  printResults();
  
  // Exit with error code if tests failed
  if (stats.failed > 0) {
    console.log('🔧 Please check LLM configuration and connectivity.');
    process.exit(1);
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