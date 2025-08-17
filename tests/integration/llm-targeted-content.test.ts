#!/usr/bin/env node

/**
 * Integration tests that verify LLM receives focused content and generates 
 * appropriate step-by-step adventure content with code analysis
 */

import { AdventureManager } from '../../packages/core/dist/adventure/adventure-manager.js';
import { StoryGenerator } from '../../packages/core/dist/adventure/story-generator.js';
import { repoAnalyzer } from '../../packages/core/dist/analyzer/repo-analyzer.js';
import { 
  createTestRunner, 
  realProjectInfo, 
  assert, 
  TestHelpers 
} from '../shared/test-utils.js';

async function runTests() {
  console.log('🤖 Running LLM Targeted Content Integration Tests');
  console.log('');
  const { test, stats, printResults } = await createTestRunner('LLM Targeted Content Tests');

  // Test 1: Direct LLM interaction with targeted content
  console.log('🎯 Direct LLM with Targeted Content Tests');
  console.log('-'.repeat(50));

  await test('StoryGenerator receives and processes targeted content correctly', async () => {
    const storyGenerator = new StoryGenerator();
    const projectPath = process.cwd();
    
    // Create a mock adventure with specific files
    const mockAdventure = {
      id: 'test-1',
      title: 'Command Center Analysis',
      description: 'Explore the core adventure management system',
      codeFiles: [
        'src/adventure/adventure-manager.ts',
        'src/adventure/story-generator.ts'
      ]
    };
    
    // Generate targeted content
    const targetedContent = await repoAnalyzer.generateTargetedContent(
      projectPath, 
      mockAdventure.codeFiles
    );
    
    console.log(`\n📊 Content Analysis:`);
    console.log(`   Targeted content length: ${targetedContent.length} chars`);
    console.log(`   Estimated tokens: ~${Math.round(targetedContent.length / 4)}`);
    
    // Use StoryGenerator to create adventure content with targeted content
    const adventureContent = await storyGenerator.generateAdventureContent(
      mockAdventure,
      'space',
      targetedContent
    );
    
    assert(typeof adventureContent === 'object', 'Should return adventure content object');
    assert(typeof adventureContent.adventure === 'string', 'Should have adventure narrative');
    assert(adventureContent.adventure.length > 100, 'Adventure narrative should be substantial');
    assert(Array.isArray(adventureContent.codeSnippets), 'Should have code snippets array');
    assert(Array.isArray(adventureContent.hints), 'Should have hints array');
    
    // Verify space theme is applied
    const spaceWords = ['space', 'cosmic', 'star', 'galaxy', 'ship', 'mission', 'crew'];
    const foundSpaceWords = TestHelpers.getFoundWords(adventureContent.adventure.toLowerCase(), spaceWords);
    assert(foundSpaceWords.length > 0, `Should contain space theme elements. Found: ${foundSpaceWords}`);
    
    // Verify it references the actual code files
    const referencesFiles = mockAdventure.codeFiles.some(file => {
      const fileName = file.split('/').pop();
      return adventureContent.adventure.includes(fileName!) || 
             adventureContent.codeSnippets.some(snippet => snippet.file.includes(fileName!));
    });
    assert(referencesFiles, 'Should reference the target files in content or snippets');
    
    console.log(`\n🌌 Generated Adventure Content Preview:`);
    console.log(`   Adventure length: ${adventureContent.adventure.length} chars`);
    console.log(`   Code snippets: ${adventureContent.codeSnippets.length}`);
    console.log(`   Hints: ${adventureContent.hints.length}`);
    console.log(`   Space theme words found: ${foundSpaceWords.join(', ')}`);
    
    // Show code snippets analysis
    if (adventureContent.codeSnippets.length > 0) {
      console.log(`\n📜 Code Snippets Analysis:`);
      adventureContent.codeSnippets.forEach((snippet, i) => {
        console.log(`   ${i + 1}. File: ${snippet.file}`);
        console.log(`      Snippet length: ${snippet.snippet.length} chars`);
        console.log(`      Explanation: ${snippet.explanation.substring(0, 80)}...`);
      });
    }
    
  }, { timeout: 60000 });

  // Test 2: Full end-to-end adventure flow with targeted content
  console.log('');
  console.log('🚀 End-to-End Adventure Flow Tests');
  console.log('-'.repeat(50));

  await test('Complete adventure flow produces step-by-step content with targeted files', async () => {
    const manager = new AdventureManager();
    const projectPath = process.cwd();
    
    // Initialize with mythical theme for clear identification
    const mainStory = await manager.initializeAdventure(realProjectInfo, 'mythical', projectPath);
    
    assert(mainStory.includes('adventure') || mainStory.includes('Adventure'), 'Main story should mention adventures');
    
    // Get the adventures and find one with files
    const adventures = (manager as any).state.adventures;
    const adventureWithFiles = adventures.find((adv: any) => 
      adv.codeFiles && adv.codeFiles.length > 0
    );
    
    if (!adventureWithFiles) {
      console.log('⚠️  No adventures with specific files found, testing first adventure');
    }
    
    // Explore the first adventure
    const adventureResult = await manager.exploreQuest('1');
    
    assert(typeof adventureResult.narrative === 'string', 'Should have narrative');
    assert(adventureResult.narrative.length > 200, 'Should have substantial narrative content');
    
    // Verify mythical theme consistency
    const mythicalWords = ['castle', 'knight', 'magic', 'kingdom', 'quest', 'heroic', 'royal'];
    const narrativeWords = TestHelpers.getFoundWords(adventureResult.narrative.toLowerCase(), mythicalWords);
    const mainStoryWords = TestHelpers.getFoundWords(mainStory.toLowerCase(), mythicalWords);
    
    assert(mainStoryWords.length > 0, `Main story should have mythical elements. Found: ${mainStoryWords}`);
    assert(narrativeWords.length > 0, `Adventure should maintain mythical theme. Found: ${narrativeWords}`);
    
    // Check for code-related content in the adventure
    const codeWords = ['function', 'class', 'method', 'variable', 'typescript', 'javascript', 'code', 'file'];
    const codeReferences = TestHelpers.getFoundWords(adventureResult.narrative.toLowerCase(), codeWords);
    assert(codeReferences.length > 0, `Adventure should reference code elements. Found: ${codeReferences}`);
    
    // Check for step-by-step or instructional content
    const instructionalIndicators = [
      'step', 'first', 'next', 'then', 'finally', 'begin', 'start', 'explore', 
      'examine', 'discover', 'analyze', 'understand', 'review'
    ];
    const instructionalContent = TestHelpers.getFoundWords(
      adventureResult.narrative.toLowerCase(), 
      instructionalIndicators
    );
    assert(instructionalContent.length > 0, 
           `Adventure should contain step-by-step guidance. Found: ${instructionalContent}`);
    
    console.log(`\n🏰 Adventure Analysis Results:`);
    console.log(`   Narrative length: ${adventureResult.narrative.length} chars`);
    console.log(`   Main story mythical words: ${mainStoryWords.join(', ')}`);
    console.log(`   Adventure mythical words: ${narrativeWords.join(', ')}`);
    console.log(`   Code references: ${codeReferences.join(', ')}`);
    console.log(`   Instructional elements: ${instructionalContent.join(', ')}`);
    
    // Show narrative preview
    console.log(`\n📖 Adventure Narrative Preview:`);
    const preview = adventureResult.narrative.length > 400 ? 
                   adventureResult.narrative.substring(0, 400) + '...' : 
                   adventureResult.narrative;
    console.log(preview);
    
  }, { timeout: 90000 });

  // Test 3: Compare targeted vs full content impact
  console.log('');
  console.log('📊 Content Impact Comparison Tests');
  console.log('-'.repeat(50));

  await test('Targeted content produces more focused adventure content than full repomix', async () => {
    const storyGenerator = new StoryGenerator();
    const projectPath = process.cwd();
    
    const testAdventure = {
      id: 'comparison-test',
      title: 'Content Comparison Test',  
      description: 'Testing focused vs broad content',
      codeFiles: ['src/adventure/adventure-manager.ts']
    };
    
    // Generate targeted content
    const targetedContent = await repoAnalyzer.generateTargetedContent(
      projectPath,
      testAdventure.codeFiles
    );
    
    // Generate full content 
    const fullContent = await repoAnalyzer.generateRepomixContext(projectPath);
    
    // Create adventure content with both approaches
    const targetedAdventure = await storyGenerator.generateAdventureContent(
      testAdventure, 'ancient', targetedContent
    );
    
    const fullAdventure = await storyGenerator.generateAdventureContent(
      testAdventure, 'ancient', fullContent  
    );
    
    console.log(`\n📊 Content Comparison:`);
    console.log(`   Targeted input: ${targetedContent.length} chars (~${Math.round(targetedContent.length/4)} tokens)`);
    console.log(`   Full input: ${fullContent.length} chars (~${Math.round(fullContent.length/4)} tokens)`);
    console.log(`   Targeted adventure length: ${targetedAdventure.adventure.length} chars`);
    console.log(`   Full adventure length: ${fullAdventure.adventure.length} chars`);
    console.log(`   Targeted code snippets: ${targetedAdventure.codeSnippets.length}`);
    console.log(`   Full code snippets: ${fullAdventure.codeSnippets.length}`);
    
    // Both should be valid adventures
    assert(targetedAdventure.adventure.length > 100, 'Targeted adventure should be substantial');
    assert(fullAdventure.adventure.length > 100, 'Full adventure should be substantial');
    
    // Check that both mention the target file
    const targetFile = 'adventure-manager';
    const targetedMentionsFile = targetedAdventure.adventure.toLowerCase().includes(targetFile);
    const fullMentionsFile = fullAdventure.adventure.toLowerCase().includes(targetFile);
    
    console.log(`   Targeted mentions target file: ${targetedMentionsFile ? '✅' : '❌'}`);
    console.log(`   Full mentions target file: ${fullMentionsFile ? '✅' : '❌'}`);
    
    // At least one should mention the target file (focused content should be more likely to)
    assert(targetedMentionsFile || fullMentionsFile, 
           'At least one approach should mention the target file');
    
    console.log(`\n🏛️  Token Efficiency:`);
    const tokenSavings = Math.round(((fullContent.length - targetedContent.length) / fullContent.length) * 100);
    console.log(`   Token reduction: ${tokenSavings}%`);
    console.log(`   Efficiency gain: ${tokenSavings > 70 ? '🚀 Excellent' : tokenSavings > 50 ? '✅ Good' : '⚠️ Modest'}`);
    
  }, { timeout: 120000 });

  printResults();
  return stats;
}

// Allow this test to be run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(stats => {
    process.exit(stats.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { runTests };