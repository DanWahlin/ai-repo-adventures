#!/usr/bin/env node

/**
 * Standalone CLI tool for generating HTML adventure files
 * Creates a complete adventure website with themed styling
 */

import * as readline from 'readline';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
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
      // Step 1: Select theme
      await this.selectTheme();
      
      // Step 2: Select output directory
      await this.selectOutputDirectory();
      
      // Step 3: Generate adventure
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
    
    // Clean exit
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
        // Remove all files and subdirectories
        fs.rmSync(this.outputDir, { recursive: true, force: true });
      }
    }
    
    // Create directory
    fs.mkdirSync(this.outputDir, { recursive: true });

    // Create assets directory
    const assetsDir = path.join(this.outputDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });

    console.log(chalk.green(`✅ Output directory: ${this.outputDir}`));
    console.log();
  }

  private async generateAdventure(): Promise<void> {
    console.log(chalk.yellow.bold('🚀 Generating Adventure...'));
    console.log();

    // Step 1: Generate repomix content and project info
    console.log(chalk.dim('📊 Analyzing codebase...'));
    const repomixContent = await repoAnalyzer.generateRepomixContext(this.projectPath);
    const projectInfo = createProjectInfo(repomixContent);

    // Step 2: Initialize adventure and get story with quests
    console.log(chalk.dim('✨ Generating themed story and quests...'));
    await this.adventureManager.initializeAdventure(
      projectInfo, 
      this.selectedTheme, 
      this.projectPath,
      this.customThemeData
    );

    // Step 3: Parse quest information from the adventure state
    this.extractQuestInfo();

    // Step 4: Generate CSS file
    console.log(chalk.dim('🎨 Creating theme styling...'));
    await this.generateThemeCSS();

    // Step 5: Generate index.html (using clean story content)
    console.log(chalk.dim('📝 Creating main adventure page...'));
    const storyContent = this.adventureManager.getStoryContent();
    await this.generateIndexHTML(storyContent);

    // Step 6: Generate all quest pages
    console.log(chalk.dim('📖 Generating quest pages...'));
    await this.generateQuestPages();
  }

  private extractQuestInfo(): void {
    // Get real quest data from adventure manager
    const adventureQuests = this.adventureManager.getAllQuests();
    this.quests = adventureQuests.map((quest, index) => ({
      id: quest.id,
      title: quest.title,
      filename: `quest-${index + 1}.html`
    }));
  }

  private async generateThemeCSS(): Promise<void> {
    const cssContent = this.getThemeCSS(this.selectedTheme);
    const cssPath = path.join(this.outputDir, 'assets', 'theme.css');
    fs.writeFileSync(cssPath, cssContent);
  }

  private async generateIndexHTML(storyContent: string): Promise<void> {
    const html = this.generateIndexHTMLContent(storyContent);
    const indexPath = path.join(this.outputDir, 'index.html');
    fs.writeFileSync(indexPath, html);
  }

  private async generateQuestPages(): Promise<void> {
    for (let i = 0; i < this.quests.length; i++) {
      const quest = this.quests[i];
      if (!quest) continue;
      
      console.log(chalk.dim(`  📖 Generating quest ${i + 1}/${this.quests.length}: ${quest.title}`));
      
      try {
        // Generate quest content with retry logic
        const questContent = await this.generateQuestContentWithRetry(quest.id);
        
        // Create HTML page
        const html = this.generateQuestHTMLContent(quest, questContent, i);
        const questPath = path.join(this.outputDir, quest.filename);
        fs.writeFileSync(questPath, html);
        
      } catch (error) {
        console.log(chalk.red(`    ❌ Failed to generate quest: ${quest.title}`));
        // Create a placeholder page for failed quests
        const placeholderHTML = this.generateQuestHTMLContent(quest, 'Quest content could not be generated.', i);
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
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    throw new Error('Max retries exceeded');
  }

  private prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(chalk.bold(question), resolve);
    });
  }

  private getThemeCSS(theme: AdventureTheme): string {
    // Generate CSS with variables for the selected theme
    return this.generateVariableBasedCSS(theme);
  }

  private generateVariableBasedCSS(theme: AdventureTheme): string {
    // Read the existing theme.css file which already has all CSS variables
    // ESM modules require import.meta.url instead of __dirname
    const currentDir = path.dirname(new URL(import.meta.url).pathname);
    const themeFilePath = path.join(currentDir, '../../adventure/assets/theme.css');
    
    try {
      // Use the existing theme.css content directly
      const existingThemeCSS = fs.readFileSync(themeFilePath, 'utf8');
      return existingThemeCSS;
    } catch (error) {
      // Fallback to minimal CSS if theme file not found
      return `/* ${this.getThemeEmoji(theme)} ${this.getThemeTitle(theme)} */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;600&display=swap');

/* ===== CSS VARIABLES ===== */
:root {
  /* Fallback variables - using existing theme.css structure */
  --primary-bg: linear-gradient(135deg, #0c0c1e 0%, #1a1a3e 50%, #0c0c1e 100%);
  --primary-text: #e0e6ff;
  --accent-primary: #64ffda;
  --code-line-height: 1.3;
}`;
    }
  }

  // Removed getThemeKeyframes - animations are now in the existing theme.css

  private getThemeEmoji(theme: AdventureTheme): string {
    switch (theme) {
      case 'space': return '🚀 SPACE EXPLORATION THEME';
      case 'mythical': return '🏰 ENCHANTED KINGDOM THEME';
      case 'ancient': return '🏺 ANCIENT CIVILIZATION THEME';
      case 'developer': return '📖 DEVELOPER DOCUMENTATION THEME';
      default: return '🎨 CUSTOM THEME';
    }
  }

  private getThemeTitle(theme: AdventureTheme): string {
    switch (theme) {
      case 'space': return 'SPACE EXPLORATION THEME';
      case 'mythical': return 'ENCHANTED KINGDOM THEME';
      case 'ancient': return 'ANCIENT CIVILIZATION THEME';
      case 'developer': return 'DEVELOPER DOCUMENTATION THEME';
      default: return 'CUSTOM THEME';
    }
  }

  // Removed old hardcoded CSS method - now using variable-based approach above

  private generateIndexHTMLContent(storyContent: string): string {
    const questLinks = this.quests.map(quest => 
      `<a href="${quest.filename}" class="quest-link">
        <h3>${quest.title}</h3>
      </a>`
    ).join('\n');

    const adventureTitle = this.adventureManager.getTitle();

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
            ${this.formatContentForHTML(storyContent)}
        </div>
        
        <div class="quests-section">
            <h2>Available Quests</h2>
            ${questLinks}
        </div>
    </div>
</body>
</html>`;
  }

  private generateQuestHTMLContent(quest: QuestInfo, content: string, questIndex: number): string {
    const prevQuest = questIndex > 0 ? this.quests[questIndex - 1] : null;
    const nextQuest = questIndex < this.quests.length - 1 ? this.quests[questIndex + 1] : null;
    const adventureTitle = this.adventureManager.getTitle();

    const navigation = `
      <div class="quest-navigation">
        ${prevQuest ? `<a href="${prevQuest.filename}">← Previous: ${prevQuest.title}</a>` : ''}
        ${nextQuest ? `<a href="${nextQuest.filename}">Next: ${nextQuest.title} →</a>` : ''}
      </div>
    `;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${quest.title} - Repo Adventure</title>
    <link rel="stylesheet" href="assets/theme.css">
</head>
<body>
    <nav class="navbar">
        <div class="nav-content">
            <a href="index.html">${adventureTitle}</a>
        </div>
    </nav>
    
    <div class="container">
        <h1>${quest.title}</h1>
        
        ${navigation}
        
        <div class="quest-content">
            ${this.formatContentForHTML(content)}
        </div>
        
        ${navigation}
    </div>
</body>
</html>`;
  }

  private formatContentForHTML(content: string): string {
    // Convert markdown-like content to HTML with enhanced code block support
    const codeBlockPlaceholders: string[] = [];
    let processedContent = content;
    
    // Step 1: Extract code blocks and replace with placeholders
    processedContent = processedContent.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (_match, lang, code) => {
      const language = lang || 'typescript';
      const formattedCode = this.formatCodeBlock(code, language);
      const codeBlockHtml = `<div class="code-block"><div class="code-header">${language}</div><pre><code class="language-${language}">${formattedCode}</code></pre></div>`;
      const placeholder = `__CODE_BLOCK_${codeBlockPlaceholders.length}__`;
      codeBlockPlaceholders.push(codeBlockHtml);
      return placeholder;
    });
    
    // Step 2: Process the rest of the content
    processedContent = processedContent
      // Handle inline code
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // Handle headers
      .replace(/^#{3} (.*)$/gm, '<h3>$1</h3>')
      .replace(/^#{2} (.*)$/gm, '<h2>$1</h2>')
      .replace(/^#{1} (.*)$/gm, '<h1>$1</h1>')
      // Handle emphasis
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Handle paragraphs
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.*)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/<p><h([1-6])>/g, '<h$1>')
      .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
      // Handle code block placeholders specially
      .replace(/<p>(__CODE_BLOCK_\d+__)<\/p>/g, '$1');
    
    // Step 3: Restore code blocks
    codeBlockPlaceholders.forEach((codeBlock, index) => {
      const placeholder = `__CODE_BLOCK_${index}__`;
      processedContent = processedContent.replace(placeholder, codeBlock);
    });
    
    return processedContent;
  }

  private formatCodeBlock(code: string, language: string): string {
    // Preserve indentation and add syntax highlighting classes
    return code
      .split('\n')
      .map(line => {
        // Preserve leading whitespace
        const indent = line.match(/^(\s*)/)?.[1] || '';
        const content = line.trim();
        
        if (!content) return '';
        
        // Add basic syntax highlighting for TypeScript/JavaScript
        if (language === 'typescript' || language === 'javascript') {
          return indent + this.highlightTypeScript(content);
        }
        
        return line;
      })
      .join('\n');
  }

  private highlightTypeScript(line: string): string {
    // Skip if already has HTML tags to prevent double-wrapping
    if (line.includes('<span') || line.includes('&lt;span')) {
      return line;
    }
    
    // More robust approach: apply highlighting in sequence and track what's been processed
    let processedLine = line;
    
    // 1. Comments first (to avoid highlighting keywords in comments)
    processedLine = processedLine.replace(/(\/\/.*$)/g, '<span class="comment">$1</span>');
    
    // 2. Strings (to avoid highlighting keywords in strings)
    processedLine = processedLine.replace(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="string">$1$2$1</span>');
    
    // 3. Keywords - more precise pattern to avoid conflicts
    processedLine = processedLine.replace(/\b(async|await|function|const|let|var|if|else|for|while|return|import|export|class|interface|type|Promise)\b(?![^<]*<\/span>)/g, (match, p1, offset, string) => {
      // Don't replace if already inside a span
      const beforeMatch = string.substring(0, offset);
      const lastOpenSpan = beforeMatch.lastIndexOf('<span');
      const lastCloseSpan = beforeMatch.lastIndexOf('</span>');
      if (lastOpenSpan > lastCloseSpan) {
        return match; // Inside a span, don't replace
      }
      return `<span class="keyword">${p1}</span>`;
    });
    
    // 4. Types
    processedLine = processedLine.replace(/\b(string|number|boolean|void|any|unknown|ProjectInfo|AdventureTheme|CustomThemeData)\b(?![^<]*<\/span>)/g, (match, p1, offset, string) => {
      const beforeMatch = string.substring(0, offset);
      const lastOpenSpan = beforeMatch.lastIndexOf('<span');
      const lastCloseSpan = beforeMatch.lastIndexOf('</span>');
      if (lastOpenSpan > lastCloseSpan) {
        return match;
      }
      return `<span class="type">${p1}</span>`;
    });
    
    // 5. Functions/methods
    processedLine = processedLine.replace(/(\w+)(\s*\()/g, (match, p1, p2, offset, string) => {
      const beforeMatch = string.substring(0, offset);
      const lastOpenSpan = beforeMatch.lastIndexOf('<span');
      const lastCloseSpan = beforeMatch.lastIndexOf('</span>');
      if (lastOpenSpan > lastCloseSpan) {
        return match;
      }
      return `<span class="function">${p1}</span>${p2}`;
    });
    
    // 6. Properties
    processedLine = processedLine.replace(/\.(\w+)(?!\s*\()/g, (match, p1, offset, string) => {
      const beforeMatch = string.substring(0, offset);
      const lastOpenSpan = beforeMatch.lastIndexOf('<span');
      const lastCloseSpan = beforeMatch.lastIndexOf('</span>');
      if (lastOpenSpan > lastCloseSpan) {
        return match;
      }
      return `.<span class="property">${p1}</span>`;
    });
    
    return processedLine;
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