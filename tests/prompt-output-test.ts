#!/usr/bin/env node

/**
 * Prompt Output Test
 * 
 * This test generates and displays the exact prompts sent to the LLM
 * for both story generation and quest content generation.
 * 
 * Outputs prompts to tests/prompts/ directory for inspection.
 */

import { repoAnalyzer } from '../dist/analyzer/repo-analyzer.js';
import { createProjectInfo } from '../dist/tools/shared.js';
import { loadStoryGenerationPrompt, loadQuestContentPrompt } from '../dist/shared/prompt-loader.js';
import { formatAdventureConfigForPrompt } from '../dist/shared/adventure-config.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPrompts() {
  console.log('=== TESTING LLM PROMPTS ===\n');
  
  try {
    const projectPath = process.cwd();
    const promptsDir = path.join(__dirname, 'prompts');
    
    // Ensure prompts directory exists
    if (!fs.existsSync(promptsDir)) {
      fs.mkdirSync(promptsDir, { recursive: true });
    }
    
    console.log('Project path:', projectPath);
    console.log('Prompts output directory:', promptsDir);
    
    // Step 1: Generate project info for story generation
    console.log('\n--- Generating Project Info ---');
    const repomixContent = await repoAnalyzer.generateRepomixContext(projectPath);
    const projectInfo = createProjectInfo(repomixContent);
    console.log(`✅ Analyzed ${projectInfo.fileCount} files`);
    
    // Step 2: Test Story Generation Prompt
    console.log('\n=== STORY GENERATION PROMPT ===');
    const theme = 'space';
    const adventureGuidance = formatAdventureConfigForPrompt(projectPath);
    
    const storyPrompt = loadStoryGenerationPrompt({
      theme,
      repomixContent: repomixContent,
      adventureGuidance
    });
    
    console.log('Story prompt length:', storyPrompt.length, 'characters');
    console.log('Adventure guidance length:', adventureGuidance.length, 'characters');
    
    // Save story prompt to prompts directory
    const storyPromptPath = path.join(promptsDir, 'story-prompt.txt');
    fs.writeFileSync(storyPromptPath, storyPrompt);
    console.log(`✅ Story prompt saved to ${path.relative(projectPath, storyPromptPath)}\n`);
    
    // Step 3: Test Quest Content Generation Prompt
    console.log('=== QUEST CONTENT GENERATION PROMPT ===');
    
    // Create a dummy quest with the files that should be included
    const dummyQuest = {
      id: 'quest-1',
      title: 'Navigating the Cosmic MCP Command Deck',
      description: 'Test quest',
      codeFiles: ['src/server.ts', 'src/tools/tools.ts']
    };
    
    // Generate targeted content for the quest files
    console.log('Generating targeted content for quest files:', dummyQuest.codeFiles);
    const questCodeContent = await repoAnalyzer.generateTargetedContent(
      projectPath,
      dummyQuest.codeFiles,
      false // Don't compress for better readability
    );
    
    console.log('Quest code content length:', questCodeContent.length, 'characters');
    console.log('Quest code content includes src/server.ts:', questCodeContent.includes('src/server.ts'));
    console.log('Quest code content includes src/tools/tools.ts:', questCodeContent.includes('src/tools/tools.ts'));
    
    const questPrompt = loadQuestContentPrompt({
      theme,
      adventureTitle: dummyQuest.title,
      codeContent: questCodeContent,
      storyContent: 'Sample story content for consistency.',
      adventureGuidance
    });
    
    console.log('\nQuest prompt length:', questPrompt.length, 'characters');
    
    // Save quest prompt to prompts directory
    const questPromptPath = path.join(promptsDir, 'quest-prompt.txt');
    fs.writeFileSync(questPromptPath, questPrompt);
    console.log(`✅ Quest prompt saved to ${path.relative(projectPath, questPromptPath)}\n`);
    
    console.log('=== ANALYSIS ===');
    console.log('Files that should have code snippets based on adventure guidance:');
    
    // Extract file mentions from adventure guidance
    const fileMentions = adventureGuidance.match(/src\/[^`\s]+/g) || [];
    const uniqueFiles = [...new Set(fileMentions)];
    uniqueFiles.forEach(file => {
      console.log(`  • ${file}`);
    });
    
    // Save analysis to file
    const analysisPath = path.join(promptsDir, 'analysis.txt');
    const analysisContent = `=== PROMPT ANALYSIS ===

Project Path: ${projectPath}
Generated At: ${new Date().toISOString()}

=== PROMPT STATISTICS ===
Story Prompt Length: ${storyPrompt.length} characters
Quest Prompt Length: ${questPrompt.length} characters
Adventure Guidance Length: ${adventureGuidance.length} characters

=== FILES THAT SHOULD HAVE CODE SNIPPETS ===
Based on adventure guidance, these files should have dedicated code snippet sections:

${uniqueFiles.map(file => `• ${file}`).join('\n')}

=== QUEST FILES FOR THIS TEST ===
• ${dummyQuest.codeFiles.join('\n• ')}

=== VERIFICATION ===
Quest code content includes src/server.ts: ${questCodeContent.includes('src/server.ts')}
Quest code content includes src/tools/tools.ts: ${questCodeContent.includes('src/tools/tools.ts')}
Quest code content length: ${questCodeContent.length} characters
`;
    
    fs.writeFileSync(analysisPath, analysisContent);
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('Files generated in tests/prompts/:');
    console.log('  • story-prompt.txt - The exact prompt sent to story generation LLM');
    console.log('  • quest-prompt.txt - The exact prompt sent to quest content LLM');
    console.log('  • analysis.txt - Analysis of prompts and expected files');
    console.log('\nCheck these files to see exactly what the LLM is receiving.');
    console.log('The quest prompt should contain the enhanced format requirements.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testPrompts();