#!/usr/bin/env node

/**
 * HTML Generator Test
 * 
 * Tests the HTML generator with minimal LLM calls:
 * - 1 story generation 
 * - 1 quest generation
 * - Outputs to tests/public for inspection
 */

import * as path from 'path';
import * as fs from 'fs';
import { HTMLAdventureGenerator } from '../src/cli/html-generator.js';
import { repoAnalyzer } from '../src/analyzer/repo-analyzer.js';
import { createProjectInfo } from '../src/tools/shared.js';
import chalk from 'chalk';

async function runHTMLGeneratorTest() {
  console.log(chalk.blue('🧪 HTML Generator Test - Minimal LLM Usage\n'));
  
  try {
    // Step 1: Setup test output directory
    const testOutputDir = path.join(process.cwd(), 'tests', 'public');
    
    // Clean up previous test output
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
    
    fs.mkdirSync(testOutputDir, { recursive: true });
    console.log(chalk.dim(`📁 Test output directory: ${testOutputDir}`));
    
    // Step 2: Generate minimal project info
    console.log(chalk.dim('📊 Analyzing project...'));
    const projectPath = process.cwd();
    const repomixContent = await repoAnalyzer.generateRepomixContext(projectPath);
    const projectInfo = createProjectInfo(repomixContent);
    
    console.log(chalk.green(`✅ Analyzed ${projectInfo.fileCount} files`));
    
    // Step 3: Initialize HTML generator with test configuration
    const generator = new HTMLAdventureGenerator();
    
    // Override internal properties for testing
    (generator as any).outputDir = testOutputDir;
    (generator as any).selectedTheme = 'space';
    (generator as any).projectPath = projectPath;
    
    console.log(chalk.dim('🎨 Using space theme...'));
    
    // Step 4: Generate story and quests using the adventure manager directly
    console.log(chalk.yellow('🚀 Generating story (1 LLM call)...'));
    const storyWithQuests = await (generator as any).adventureManager.initializeAdventure(projectInfo, 'space', projectPath);
    
    // Get the generated quests from the adventure manager
    const quests = (generator as any).adventureManager.getAllQuests().map((quest: any, index: number) => ({
      id: String(index + 1),
      title: quest.title,
      filename: `quest-${index + 1}.html`
    }));
    
    // Store quests in the generator for later use
    (generator as any).quests = quests;
    
    console.log(chalk.green(`✅ Generated story with ${quests.length} quests`));
    
    // Step 5: Generate HTML for just the first quest
    if (quests.length > 0) {
      console.log(chalk.yellow('📝 Generating first quest content (1 LLM call)...'));
      
      // Generate only the first quest
      const firstQuest = quests[0];
      const questContent = await (generator as any).generateQuestContentWithRetry(firstQuest.id);
      
      // Generate HTML files
      console.log(chalk.dim('🌐 Generating HTML files...'));
      
      // Generate index.html
      const indexHTML = (generator as any).generateIndexHTMLContent(storyWithQuests);
      const indexPath = path.join(testOutputDir, 'index.html');
      fs.writeFileSync(indexPath, indexHTML);
      
      // Generate CSS
      const themeCSS = (generator as any).getThemeCSS('space');
      const assetsDir = path.join(testOutputDir, 'assets');
      fs.mkdirSync(assetsDir, { recursive: true });
      const cssPath = path.join(assetsDir, 'theme.css');
      fs.writeFileSync(cssPath, themeCSS);
      
      // Generate quest HTML
      const questHTML = (generator as any).generateQuestHTMLContent(firstQuest, questContent, 0);
      const questPath = path.join(testOutputDir, firstQuest.filename);
      fs.writeFileSync(questPath, questHTML);
      
      console.log(chalk.green('✅ Generated HTML files:'));
      console.log(chalk.dim(`  • ${indexPath}`));
      console.log(chalk.dim(`  • ${cssPath}`));
      console.log(chalk.dim(`  • ${questPath}`));
      
      // Step 6: Test summary
      console.log(chalk.green('\n🎉 HTML Generator Test Complete!'));
      console.log(chalk.white('📋 Summary:'));
      console.log(chalk.dim(`  • LLM calls made: 2 (story + 1 quest)`));
      console.log(chalk.dim(`  • Files generated: 3 (index.html, theme.css, ${firstQuest.filename})`));
      console.log(chalk.dim(`  • Output location: ${testOutputDir}`));
      console.log(chalk.dim(`  • Quest generated: "${firstQuest.title}"`));
      
      // Step 7: Usage instructions
      console.log(chalk.blue('\n🌐 To view the test output:'));
      console.log(chalk.cyan(`  1. cd ${testOutputDir}`));
      console.log(chalk.cyan(`  2. python -m http.server 8080`));
      console.log(chalk.cyan(`  3. Open http://localhost:8080`));
      
      console.log(chalk.green('\n✨ Test completed successfully!'));
      
    } else {
      throw new Error('No quests were generated');
    }
    
  } catch (error) {
    console.error(chalk.red('❌ HTML Generator Test failed:'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runHTMLGeneratorTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export { runHTMLGeneratorTest };