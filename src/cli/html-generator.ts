#!/usr/bin/env node

/**
 * Standalone CLI tool for generating HTML adventure files
 * Refactored for simplicity and maintainability
 */

import * as readline from 'readline';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { marked } from 'marked';
import { repoAnalyzer } from '../analyzer/repo-analyzer.js';
import { AdventureManager } from '../adventure/adventure-manager.js';
import { getAllThemes, getThemeByKey, AdventureTheme } from '../shared/theme.js';
import { createProjectInfo } from '../tools/shared.js';

interface CustomThemeData {
  name: string;
  description: string;
  keywords: string[];
}

interface QuestInfo {
  id: string;
  title: string;
  filename: string;
}

class HTMLAdventureGenerator {
  private rl: readline.Interface;
  private adventureManager: AdventureManager;
  private projectPath: string = process.cwd();
  private outputDir: string = '';
  private selectedTheme: AdventureTheme = 'space';
  private customThemeData?: CustomThemeData;
  private quests: QuestInfo[] = [];

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.adventureManager = new AdventureManager();
  }

  async start(): Promise<void> {
    console.clear();
    console.log(chalk.bgBlue.white.bold(' 🌟 Repo Adventure HTML Generator 🌟 '));
    console.log(chalk.dim('─'.repeat(50)));
    console.log();
    console.log(chalk.yellow('Generate a complete HTML adventure website from your codebase!'));
    console.log();

    try {
      await this.selectTheme();
      await this.selectOutputDirectory();
      await this.generateAdventure();
      
      console.log();
      console.log(chalk.green.bold('🎉 Adventure website generated successfully!'));
      console.log(chalk.cyan(`📁 Location: ${this.outputDir}`));
      console.log(chalk.cyan(`🌐 Open: ${path.join(this.outputDir, 'index.html')}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Error generating adventure:'), error);
      this.rl.close();
      process.exit(1);
    }
    
    this.rl.close();
    process.exit(0);
  }

  private async selectTheme(): Promise<void> {
    console.log(chalk.yellow.bold('📚 Choose Your Adventure Theme:'));
    console.log();
    
    const themes = getAllThemes();
    themes.forEach(theme => {
      console.log(`${theme.emoji} ${chalk.bold(theme.id.toString())}. ${theme.displayName} - ${theme.description}`);
    });
    console.log();

    const choice = await this.prompt('Enter theme number or name: ');
    
    // Parse theme choice
    const themeNumber = parseInt(choice.trim());
    if (!isNaN(themeNumber)) {
      const theme = themes.find(t => t.id === themeNumber);
      if (theme) {
        this.selectedTheme = theme.key as AdventureTheme;
      } else {
        console.log(chalk.red('Invalid theme number. Using space theme.'));
        this.selectedTheme = 'space';
      }
    } else {
      const theme = getThemeByKey(choice.trim().toLowerCase());
      if (theme) {
        this.selectedTheme = theme.key as AdventureTheme;
      } else {
        console.log(chalk.red('Invalid theme name. Using space theme.'));
        this.selectedTheme = 'space';
      }
    }

    // Handle custom theme
    if (this.selectedTheme === 'custom') {
      await this.createCustomTheme();
    }

    const selectedThemeInfo = getThemeByKey(this.selectedTheme);
    console.log(chalk.green(`✅ Selected: ${selectedThemeInfo?.displayName || this.selectedTheme}`));
    console.log();
  }

  private async createCustomTheme(): Promise<void> {
    console.log(chalk.cyan('\n🎨 Creating Custom Theme...'));
    console.log();

    const name = await this.prompt('Theme name (e.g., "Cyberpunk", "Pirate Adventure"): ');
    const description = await this.prompt('Theme description: ');
    const keywordsInput = await this.prompt('Keywords (comma-separated): ');
    
    const keywords = keywordsInput.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    if (!name.trim() || !description.trim() || keywords.length === 0) {
      console.log(chalk.red('❌ Invalid custom theme data. Using space theme instead.'));
      this.selectedTheme = 'space';
      return;
    }

    this.customThemeData = {
      name: name.trim(),
      description: description.trim(),
      keywords
    };

    console.log(chalk.green('✅ Custom theme created!'));
  }

  private async selectOutputDirectory(): Promise<void> {
    console.log(chalk.yellow.bold('📁 Output Directory:'));
    console.log(chalk.dim(`Current directory: ${process.cwd()}`));
    console.log();

    const dir = await this.prompt('Enter output directory (or press Enter for ./public): ');
    this.outputDir = dir.trim() || path.join(process.cwd(), 'public');

    // Check if directory exists and has content
    if (fs.existsSync(this.outputDir)) {
      const files = fs.readdirSync(this.outputDir);
      if (files.length > 0) {
        console.log(chalk.yellow(`⚠️  Directory '${this.outputDir}' already exists and contains files.`));
        console.log(chalk.dim('Files found:'));
        files.slice(0, 5).forEach(file => {
          console.log(chalk.dim(`  - ${file}`));
        });
        if (files.length > 5) {
          console.log(chalk.dim(`  ... and ${files.length - 5} more files`));
        }
        console.log();

        const overwrite = await this.prompt('Do you want to overwrite this directory? (y/N): ');
        if (!overwrite.toLowerCase().startsWith('y')) {
          console.log(chalk.red('❌ Operation cancelled.'));
          process.exit(0);
        }
        
        console.log(chalk.yellow('🗑️  Clearing existing directory...'));
        fs.rmSync(this.outputDir, { recursive: true, force: true });
      }
    }
    
    // Create directories
    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.mkdirSync(path.join(this.outputDir, 'assets'), { recursive: true });

    console.log(chalk.green(`✅ Output directory: ${this.outputDir}`));
    console.log();
  }

  private async generateAdventure(): Promise<void> {
    console.log(chalk.yellow.bold('🚀 Generating Adventure...'));
    console.log();

    // Step 1: Generate project analysis
    console.log(chalk.dim('📊 Analyzing codebase...'));
    const repomixContent = await repoAnalyzer.generateRepomixContext(this.projectPath);
    const projectInfo = createProjectInfo(repomixContent);

    // Step 2: Initialize adventure
    console.log(chalk.dim('✨ Generating themed story and quests...'));
    await this.adventureManager.initializeAdventure(
      projectInfo, 
      this.selectedTheme, 
      this.projectPath,
      this.customThemeData
    );

    // Step 3: Extract quest information
    this.extractQuestInfo();

    // Step 4: Generate all files
    console.log(chalk.dim('🎨 Creating theme styling...'));
    this.generateThemeCSS();

    console.log(chalk.dim('📝 Creating main adventure page...'));
    this.generateIndexHTML();

    console.log(chalk.dim('📖 Generating quest pages...'));
    await this.generateQuestPages();
  }

  private extractQuestInfo(): void {
    const adventureQuests = this.adventureManager.getAllQuests();
    this.quests = adventureQuests.map((quest, index) => ({
      id: quest.id,
      title: quest.title,
      filename: `quest-${index + 1}.html`
    }));
  }

  private generateThemeCSS(): void {
    const themeCSS = this.loadThemeCSS(this.selectedTheme);
    const baseCSS = this.loadBaseCSS();
    const combinedCSS = themeCSS + '\n\n' + baseCSS;
    const cssPath = path.join(this.outputDir, 'assets', 'theme.css');
    fs.writeFileSync(cssPath, combinedCSS);
  }

  private loadThemeCSS(theme: AdventureTheme): string {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const themePath = path.join(__dirname, 'themes', `${theme}.css`);
    
    try {
      return fs.readFileSync(themePath, 'utf-8');
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Theme file not found for ${theme}, using default`));
      const defaultPath = path.join(__dirname, 'themes', 'default.css');
      try {
        return fs.readFileSync(defaultPath, 'utf-8');
      } catch {
        console.warn(chalk.yellow(`⚠️  Default theme not found, using fallback`));
        return this.getFallbackCSS();
      }
    }
  }

  private loadBaseCSS(): string {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const basePath = path.join(__dirname, 'themes', 'base.css');
    
    try {
      return fs.readFileSync(basePath, 'utf-8');
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Base CSS not found, using minimal fallback`));
      return '/* Base CSS not found - using minimal styles */';
    }
  }

  private getFallbackCSS(): string {
    return `/* Fallback CSS */
    :root {
      --primary-bg: #f5f5f5;
      --primary-text: #333;
      --accent-primary: #1976d2;
      --accent-secondary: #42a5f5;
      --font-primary: -apple-system, BlinkMacSystemFont, sans-serif;
      --font-heading: -apple-system, BlinkMacSystemFont, sans-serif;
      --font-code: Monaco, 'Courier New', monospace;
    }`;
  }

  private generateIndexHTML(): void {
    const html = this.buildIndexHTML();
    const indexPath = path.join(this.outputDir, 'index.html');
    fs.writeFileSync(indexPath, html);
  }

  private async generateQuestPages(): Promise<void> {
    for (let i = 0; i < this.quests.length; i++) {
      const quest = this.quests[i];
      if (!quest) continue;
      
      console.log(chalk.dim(`  📖 Generating quest ${i + 1}/${this.quests.length}: ${quest.title}`));
      
      try {
        const questContent = await this.generateQuestContentWithRetry(quest.id);
        const html = this.buildQuestHTML(quest, questContent, i);
        const questPath = path.join(this.outputDir, quest.filename);
        fs.writeFileSync(questPath, html);
        
      } catch (error) {
        console.log(chalk.red(`    ❌ Failed to generate quest: ${quest.title}`));
        const placeholderHTML = this.buildQuestHTML(quest, 'Quest content could not be generated.', i);
        const questPath = path.join(this.outputDir, quest.filename);
        fs.writeFileSync(questPath, placeholderHTML);
      }
    }
  }

  private async generateQuestContentWithRetry(questId: string, maxRetries: number = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.adventureManager.exploreQuest(questId);
        return result.narrative;
      } catch (error) {
        console.log(chalk.yellow(`    ⚠️  Attempt ${attempt}/${maxRetries} failed, retrying...`));
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    throw new Error('Max retries exceeded');
  }

  private buildIndexHTML(): string {
    const adventureQuests = this.adventureManager.getAllQuests();
    const questLinks = this.quests.map((quest, index) => {
      const questData = adventureQuests[index];
      let description = questData?.description || '';
      
      // Clean up description
      if (description) {
        description = description.replace(/\*\*Code Files:\*\*.*$/s, '').trim();
        description = description.replace(/Code Files:.*$/s, '').trim();
      }
      
      return `<a href="${quest.filename}" class="quest-link">
        <h3>${this.formatInlineMarkdown(quest.title)}</h3>
        ${description ? `<p>${this.formatMarkdown(description)}</p>` : ''}
      </a>`;
    }).join('\n');

    const adventureTitle = this.adventureManager.getTitle();
    const cleanStoryContent = this.adventureManager.getStoryContent();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${adventureTitle}</title>
    <link rel="stylesheet" href="assets/theme.css">
</head>
<body>
    <nav class="navbar">
        <div class="nav-content">
            <h1>${adventureTitle}</h1>
        </div>
    </nav>
    
    <div class="container">
        <div class="story-content">
            <h2>Your Adventure Awaits</h2>
            ${this.formatMarkdown(cleanStoryContent)}
        </div>
        
        <div class="quests-section">
            <h2>Adventure Quests</h2>
            ${questLinks}
        </div>
    </div>
</body>
</html>`;
  }

  private buildQuestHTML(quest: QuestInfo, content: string, questIndex: number): string {
    const nextQuest = questIndex < this.quests.length - 1 ? this.quests[questIndex + 1] : null;
    const adventureTitle = this.adventureManager.getTitle();
    
    const truncateTitle = (title: string, maxLength: number = 40): string => {
      return title.length > maxLength ? title.slice(0, maxLength) + '...' : title;
    };

    const bottomNavigation = nextQuest ? `
      <div class="quest-navigation quest-navigation-bottom">
        <a href="${nextQuest.filename}" class="next-quest-btn">Next: ${truncateTitle(nextQuest.title)} →</a>
      </div>
    ` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.stripHTML(this.formatInlineMarkdown(quest.title))} - Repo Adventure</title>
    <link rel="stylesheet" href="assets/theme.css">
</head>
<body>
    <nav class="navbar">
        <div class="nav-content">
            <a href="index.html">${adventureTitle}</a>
        </div>
    </nav>
    
    <div class="container">
        <h1 class="quest-title">${this.formatInlineMarkdown(quest.title)}</h1>
        <hr>
        <div class="quest-content">
            ${this.formatMarkdown(content)}
        </div>
        
        ${bottomNavigation}
    </div>
</body>
</html>`;
  }

  private formatInlineMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');
  }

  private formatMarkdown(content: string): string {
    // Simple markdown processing - let marked handle most of it
    let htmlContent = marked(content) as string;
    
    // Fix inline code styling
    htmlContent = htmlContent.replace(/<code>/g, '<code class="inline-code">');
    
    // Style section dividers
    htmlContent = htmlContent.replace(/<p>([─-]{3,}.*?[─-]{3,})<\/p>/g, '<p class="section-divider">$1</p>');
    
    // Remove duplicate quest titles
    htmlContent = htmlContent.replace(/^<p><strong>🚀 Quest \d+:.*?<\/strong><\/p>\s*/i, '');
    
    // Fix bullet points in "Helpful Hints" sections that aren't properly formatted as lists
    // Look for paragraphs with multiple bullet points and convert to proper lists
    htmlContent = htmlContent.replace(
      /<p><strong>💡 Helpful Hints:<\/strong>\s*(?:<br\s*\/>)?\s*([^<]*(?:•[^•]+)+)<\/p>/gi,
      (match, bulletContent) => {
        const bullets = bulletContent.split('•').filter(item => item.trim()).map(item => {
          const trimmed = item.trim();
          // Remove any trailing punctuation or whitespace, but preserve content formatting
          return trimmed.replace(/^\s*/, '').replace(/\s*$/, '');
        });
        
        const listItems = bullets.map(bullet => 
          `<li>${bullet.replace(/^\s*<strong>(.*?)<\/strong>:\s*/, '<strong>$1</strong>: ')}</li>`
        ).join('\n');
        
        return `<p><strong>💡 Helpful Hints:</strong></p>\n<ul>\n${listItems}\n</ul>`;
      }
    );
    
    return htmlContent;
  }

  private stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  private prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(chalk.bold(question), resolve);
    });
  }
}

// Main execution
async function main() {
  const generator = new HTMLAdventureGenerator();
  await generator.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { HTMLAdventureGenerator };