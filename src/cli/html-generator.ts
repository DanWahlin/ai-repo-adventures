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
import { parseAdventureConfig } from '../shared/adventure-config.js';
import { TemplateEngine } from './template-engine.js';
import { sanitizeEmojiInText, sanitizeQuestTitle } from '../shared/emoji-validator.js';

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
  private templateEngine: TemplateEngine;
  private projectPath: string = process.cwd();
  private outputDir: string = '';
  private selectedTheme: AdventureTheme = 'space';
  private customThemeData?: CustomThemeData;
  private quests: QuestInfo[] = [];
  private repoUrl: string | null = null;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.adventureManager = new AdventureManager();
    this.templateEngine = new TemplateEngine();
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

  async startWithArgs(args: Map<string, string>): Promise<void> {
    console.log(chalk.bgBlue.white.bold(' 🌟 Repo Adventure HTML Generator 🌟 '));
    console.log(chalk.dim('─'.repeat(50)));
    console.log();

    try {
      // Set theme from args
      const themeArg = args.get('theme');
      if (themeArg) {
        const theme = this.parseThemeArg(themeArg);
        if (!theme) {
          throw new Error(`Invalid theme: ${themeArg}. Valid themes: space, mythical, ancient, developer, custom`);
        }
        this.selectedTheme = theme;
        console.log(chalk.green(`✅ Theme: ${themeArg}`));
      }

      // Set output directory from args
      const outputArg = args.get('output');
      this.outputDir = outputArg || './public';
      console.log(chalk.green(`✅ Output: ${this.outputDir}`));

      // Handle overwrite setting
      const overwrite = args.has('overwrite');
      if (overwrite) {
        console.log(chalk.green('✅ Overwrite: enabled'));
      }

      // Check if output directory exists and handle overwrite
      if (fs.existsSync(this.outputDir) && !overwrite) {
        const files = fs.readdirSync(this.outputDir).filter(f => f.endsWith('.html'));
        if (files.length > 0) {
          throw new Error(`Output directory ${this.outputDir} contains HTML files. Use --overwrite to replace them.`);
        }
      }

      // Create directories if they don't exist or if overwrite is enabled
      if (overwrite && fs.existsSync(this.outputDir)) {
        fs.rmSync(this.outputDir, { recursive: true, force: true });
      }
      
      // Create output directories
      fs.mkdirSync(this.outputDir, { recursive: true });
      fs.mkdirSync(path.join(this.outputDir, 'assets'), { recursive: true });
      fs.mkdirSync(path.join(this.outputDir, 'assets','images'), { recursive: true });

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

  private parseThemeArg(themeArg: string): AdventureTheme | null {
    const lowerTheme = themeArg.toLowerCase();
    switch (lowerTheme) {
      case 'space':
      case '1':
        return 'space';
      case 'mythical':
      case '2':
        return 'mythical';
      case 'ancient':
      case '3':
        return 'ancient';
      case 'developer':
      case '4':
        return 'developer';
      case 'custom':
      case '5':
        return 'custom';
      default:
        return null;
    }
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
    fs.mkdirSync(path.join(this.outputDir, 'assets', 'images'), { recursive: true });

    console.log(chalk.green(`✅ Output directory: ${this.outputDir}`));
    console.log();
  }

  private async generateAdventure(): Promise<void> {
    console.log(chalk.yellow.bold('🚀 Generating Adventure...'));
    console.log();

    // Load repository URL from adventure.config.json
    const config = parseAdventureConfig(this.projectPath);
    if (config && typeof config === 'object' && 'adventure' in config) {
      const adventure = (config as any).adventure;
      if (adventure && typeof adventure.url === 'string') {
        this.repoUrl = adventure.url.replace(/\/$/, ''); // Remove trailing slash
      }
    }

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

    console.log(chalk.dim('🖼️ Copying images...'));
    this.copyImages();

    console.log(chalk.dim('📝 Creating main adventure page...'));
    this.generateIndexHTML();

    console.log(chalk.dim('📖 Generating quest pages...'));
    await this.generateQuestPages();
  }

  private extractQuestInfo(): void {
    this.quests = this.adventureManager.getAllQuests().map((quest, index) => ({
      id: quest.id,
      title: sanitizeQuestTitle(quest.title),
      filename: `quest-${index + 1}.html`
    }));
  }

  /**
   * Determines if a theme is light-colored and requires dark GitHub logo
   */
  private isLightTheme(theme: AdventureTheme): boolean {
    // Light themes that need dark GitHub logo (github-mark.svg)
    const lightThemes: AdventureTheme[] = ['mythical'];
    return lightThemes.includes(theme);
  }

  /**
   * Get appropriate GitHub logo based on theme brightness
   */
  private getGitHubLogo(): string {
    return this.isLightTheme(this.selectedTheme) 
      ? 'assets/images/github-mark.svg'          // Dark logo for light themes
      : 'assets/images/github-mark-white.svg';   // White logo for dark themes
  }

  /**
   * Get common template variables used across all pages
   */
  private getCommonTemplateVariables(): { [key: string]: string } {
    const adventureTitle = this.adventureManager.getTitle();
    const config = parseAdventureConfig(this.projectPath);
    let repoName = 'Repository';
    let repoUrl = '#';
    
    if (config && typeof config === 'object' && 'adventure' in config) {
      const adventure = (config as any).adventure;
      if (adventure) {
        repoName = adventure.name || 'Repository';
        repoUrl = adventure.url || '#';
      }
    }

    // Theme-appropriate emoticons (using safe emojis)
    const themeIcons = {
      space: { theme: '🚀', quest: '⭐' },
      ancient: { theme: '🏛️', quest: '📜' },
      mythical: { theme: '🧙‍♂️', quest: '⚔️' },
      developer: { theme: '💻', quest: '📋' },
      custom: { theme: '🎨', quest: '⭐' }
    };

    const icons = themeIcons[this.selectedTheme] || themeIcons.space;
    
    return {
      ADVENTURE_TITLE: adventureTitle,
      INDEX_LINK: 'index.html',
      CURRENT_THEME: this.selectedTheme,
      REPO_NAME: repoName,
      REPO_URL: repoUrl,
      THEME_ICON: icons.theme,
      QUEST_ICON: icons.quest,
      GITHUB_LOGO: this.getGitHubLogo()
    };
  }

  private generateThemeCSS(): void {
    const themeCSS = this.loadThemeCSS(this.selectedTheme);
    const baseCSS = this.loadBaseCSS();
    const animationsCSS = this.loadAnimationsCSS();
    
    // Combine CSS in the correct order: theme variables, base styles, animations
    const combinedCSS = themeCSS + '\n\n' + baseCSS + '\n\n' + animationsCSS;
    
    const cssPath = path.join(this.outputDir, 'assets', 'theme.css');
    fs.writeFileSync(cssPath, combinedCSS);
  }

  private copyImages(): void {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const sourceImagesDir = path.join(__dirname, 'assets', 'images');
    const targetImagesDir = path.join(this.outputDir, 'assets','images');

    try {
      if (fs.existsSync(sourceImagesDir)) {
        // Ensure target directory exists
        fs.mkdirSync(targetImagesDir, { recursive: true });
        
        const imageFiles = fs.readdirSync(sourceImagesDir);
        imageFiles.forEach(file => {
          const sourcePath = path.join(sourceImagesDir, file);
          const targetPath = path.join(targetImagesDir, file);
          fs.copyFileSync(sourcePath, targetPath);
        });
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️ Warning: Could not copy images from source directory'));
    }
  }

  private loadThemeCSS(theme: AdventureTheme): string {
    return this.loadCSSFile(`themes/${theme}.css`, 'themes/default.css');
  }

  private loadBaseCSS(): string {
    return this.loadCSSFile('themes/base.css', null) || '/* Base CSS not found */';
  }

  private loadAnimationsCSS(): string {
    return this.loadCSSFile('themes/animations.css', null) || '/* Animations CSS not found */';
  }

  private loadCSSFile(relativePath: string, fallbackPath: string | null): string {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    
    try {
      return fs.readFileSync(path.join(__dirname, relativePath), 'utf-8');
    } catch {
      if (fallbackPath) {
        try {
          return fs.readFileSync(path.join(__dirname, fallbackPath), 'utf-8');
        } catch {
          return this.getFallbackCSS();
        }
      }
      return '';
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
      
      // Remove code files section from description
      if (description) {
        description = description.replace(/\*?\*?Code Files:.*$/si, '').trim();
      }
      
      return `<a href="${quest.filename}" class="quest-link">
        <h3>${this.formatInlineMarkdown(quest.title)}</h3>
        ${description ? `<p>${this.formatInlineMarkdown(description)}</p>` : ''}
      </a>`;
    }).join('\n');

    const cleanStoryContent = sanitizeEmojiInText(this.adventureManager.getStoryContent());
    
    const variables = {
      ...this.getCommonTemplateVariables(),
      PAGE_TITLE: sanitizeEmojiInText(this.adventureManager.getTitle()),
      STORY_CONTENT: this.formatMarkdown(cleanStoryContent),
      QUEST_LINKS: questLinks
    };
    
    return this.templateEngine.renderPage('index-template.html', variables);
  }

  private buildQuestHTML(quest: QuestInfo, content: string, questIndex: number): string {
    const nextQuest = questIndex < this.quests.length - 1 ? this.quests[questIndex + 1] : null;

    const bottomNavigation = nextQuest ? `
      <div class="quest-navigation quest-navigation-bottom">
        <a href="${nextQuest.filename}" class="next-quest-btn">Next: ${nextQuest.title.length > 40 ? nextQuest.title.slice(0, 40) + '...' : nextQuest.title} →</a>
      </div>
    ` : '';

    const variables = {
      ...this.getCommonTemplateVariables(),
      PAGE_TITLE: this.stripHTML(this.formatInlineMarkdown(quest.title)),
      QUEST_CONTENT: this.formatMarkdown(content),
      BOTTOM_NAVIGATION: bottomNavigation
    };

    return this.templateEngine.renderPage('quest-template.html', variables);
  }

  private formatInlineMarkdown(text: string): string {
    // This could use marked.parseInline() but keeping it simple for title formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');
  }

  private formatMarkdown(content: string): string {
    // Pure markdown to HTML conversion - no post-processing
    let htmlContent = marked(content) as string;
    
    // Only add CSS class to inline code and hyperlinks - nothing else
    htmlContent = htmlContent
      .replace(/<code>/g, '<code class="inline-code">');  // Add CSS class to inline code
    
    // Highlight file path prefixes (e.g., "src/tools/tools.ts:")
    htmlContent = this.highlightFilePathPrefixes(htmlContent);
    
    // Add hyperlinks to file references if we have a repo URL
    if (this.repoUrl) {
      htmlContent = this.addFileHyperlinksToHTML(htmlContent);
    }
    
    return htmlContent;
  }

  /**
   * Highlights prefixes in headings that contain colons
   * Matches everything up to and including the first colon in h3-h6 headings only
   * Excludes h1 and h2 tags to avoid affecting quest titles
   */
  private highlightFilePathPrefixes(htmlContent: string): string {
    // Pattern to match content before and including the first colon in h3-h6 headings only
    const headingColonPattern = /(<h[3-6][^>]*>)([^<]*?)(:)([^<]*?)(<\/h[3-6]>)/g;
    
    return htmlContent.replace(
      headingColonPattern, 
      (_match, openTag, beforeColon, colon, afterColon, closeTag) => {
        return `${openTag}<span class="header-prefix">${beforeColon}${colon}</span>${afterColon}${closeTag}`;
      }
    );
  }

  private stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Converts file paths in HTML content to GitHub URLs
   * Handles file paths within code tags and plain text
   */
  private addFileHyperlinksToHTML(htmlContent: string): string {
    if (!this.repoUrl) return htmlContent;

    // Pattern to match file paths: src/file.ts, ./src/file.ts, /src/file.ts
    const filePathPattern = /\.?\/?src\/[\w\-/]+\.(ts|js|tsx|jsx|css|json|md)/;

    // Convert file paths in <code> tags to hyperlinks
    htmlContent = htmlContent.replace(
      /<code class="inline-code">([^<]*)<\/code>/g, 
      (match, codeContent) => {
        const fileMatch = codeContent.match(filePathPattern);
        if (fileMatch) {
          const normalizedPath = fileMatch[0].replace(/^\.?\//, '');
          const githubUrl = `${this.repoUrl}/blob/main/${normalizedPath}`;
          return `<a href="${githubUrl}" target="_blank" rel="noopener noreferrer"><code class="inline-code">${normalizedPath}</code></a>`;
        }
        return match;
      }
    );
    return htmlContent;
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
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const argMap = new Map<string, string>();
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg && arg.startsWith('--')) {
      const key = arg.substring(2);
      const nextArg = args[i + 1];
      const value = nextArg && !nextArg.startsWith('--') ? nextArg : 'true';
      argMap.set(key, value);
      if (value !== 'true') i++; // Skip next arg if it was used as value
    }
  }
  
  // Check for help flag
  if (argMap.has('help') || argMap.has('h')) {
    console.log(`
${chalk.bgBlue.white.bold(' Repo Adventure HTML Generator ')}

Generate a complete HTML adventure website from your codebase!

Usage:
  npm run generate-html [options]

Options:
  --theme <theme>        Theme: space, mythical, ancient, developer, or custom
  --output <dir>         Output directory (default: ./public)
  --overwrite           Overwrite existing files without prompting
  --help, -h            Show this help message

Examples:
  npm run generate-html --theme space --output ./docs --overwrite
  npm run generate-html --theme mythical
  npm run generate-html (interactive mode)
`);
    return;
  }
  
  // Run with CLI args if provided, otherwise interactive
  if (argMap.has('theme')) {
    await generator.startWithArgs(argMap);
  } else {
    await generator.start();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { HTMLAdventureGenerator };