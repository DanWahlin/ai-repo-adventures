#!/usr/bin/env node

/**
 * Standalone CLI tool for generating HTML adventure files
 * Refactored for simplicity and maintainability
 */

import * as readline from 'readline';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { marked } from 'marked';
import { repoAnalyzer } from '@ai-repo-adventures/core/analyzer';
import { AdventureManager } from '@ai-repo-adventures/core/adventure';
import { getAllThemes, getThemeByKey, AdventureTheme, parseAdventureConfig, sanitizeEmojiInText, sanitizeQuestTitle, LLM_MODEL } from '@ai-repo-adventures/core/shared';
import { createProjectInfo } from '@ai-repo-adventures/core';
import { TemplateEngine } from './template-engine.js';

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
  private maxQuests?: number;
  private logLlmOutput: boolean = false;
  private serve: boolean = false;

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
          throw new Error(`Invalid theme: ${themeArg}. Valid themes: space, mythical, ancient, developer, custom, all`);
        }
        
        if (theme === 'all') {
          // Handle multi-theme generation
          await this.generateAllThemes(args);
          return;
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

      // Handle max-quests setting
      const maxQuestsArg = args.get('max-quests');
      const maxQuests = maxQuestsArg ? parseInt(maxQuestsArg, 10) : undefined;
      if (maxQuests !== undefined && (isNaN(maxQuests) || maxQuests < 0)) {
        throw new Error(`Invalid max-quests value: ${maxQuestsArg}. Must be a positive number.`);
      }
      if (maxQuests !== undefined) {
        console.log(chalk.green(`✅ Max quests: ${maxQuests}`));
        this.maxQuests = maxQuests;
      }

      // Handle log-llm-output setting
      this.logLlmOutput = args.has('log-llm-output');
      if (this.logLlmOutput) {
        console.log(chalk.green('✅ LLM output logging: enabled'));
      }

      // Handle serve setting
      this.serve = args.has('serve');
      if (this.serve) {
        console.log(chalk.green('✅ HTTP server: will start after generation'));
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
      
      if (this.serve) {
        await this.startHttpServer();
      } else {
        console.log(chalk.cyan(`🌐 Open: ${path.join(this.outputDir, 'index.html')}`));
      }
    } catch (error) {
      console.error(chalk.red('❌ Error generating adventure:'), error);
      this.rl.close();
      process.exit(1);
    }
    
    this.rl.close();
    process.exit(0);
  }

  private parseThemeArg(themeArg: string): AdventureTheme | 'all' | null {
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
      case 'all':
        return 'all';
      default:
        return null;
    }
  }

  private async selectTheme(): Promise<void> {
    console.log(chalk.yellow.bold('📚 Choose Your Adventure Theme:'));
    console.log();
    
    const themes = getAllThemes();
    themes.forEach((theme: any) => {
      console.log(`${theme.emoji} ${chalk.bold(theme.id.toString())}. ${theme.displayName} - ${theme.description}`);
    });
    console.log();

    const choice = await this.prompt('Enter theme number or name: ');
    
    // Parse theme choice
    const themeNumber = parseInt(choice.trim());
    if (!isNaN(themeNumber)) {
      const theme = themes.find((t: any) => t.id === themeNumber);
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
    const storyContent = await this.adventureManager.initializeAdventure(
      projectInfo, 
      this.selectedTheme, 
      this.projectPath,
      this.customThemeData
    );

    // Save story content if logging is enabled
    this.saveLlmOutput('story.output.md', storyContent);

    // Step 3: Extract quest information
    this.extractQuestInfo();

    // Step 4: Generate all files
    console.log(chalk.dim('🎨 Creating theme styling...'));
    this.generateThemeCSS();

    console.log(chalk.dim('🧭 Adding quest navigator...'));
    this.copyQuestNavigator();

    console.log(chalk.dim('🖼️ Copying images...'));
    this.copyImages();

    console.log(chalk.dim('📝 Creating main adventure page...'));
    this.generateIndexHTML();

    console.log(chalk.dim('📖 Generating quest pages...'));
    await this.generateQuestPages();
  }

  private extractQuestInfo(): void {
    this.quests = this.adventureManager.getAllQuests().map((quest: any, index: number) => ({
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
   * Save LLM output to tests/llm-output directory if logging is enabled
   */
  private saveLlmOutput(baseFilename: string, content: string): void {
    if (!this.logLlmOutput) return;
    
    const llmOutputDir = path.join('tests', 'llm-output');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(llmOutputDir)) {
      fs.mkdirSync(llmOutputDir, { recursive: true });
    }
    
    // Extract the file extension and base name
    const parts = baseFilename.split('.');
    const extension = parts.pop(); // Get the extension (e.g., 'md')
    const baseName = parts.join('.'); // Get the base name (e.g., 'story.output')
    
    // Include the model name in the filename
    const modelName = LLM_MODEL.replace(/[^a-zA-Z0-9-]/g, '-'); // Sanitize model name for filename
    const filename = `${baseName}.${modelName}.${extension}`;
    
    const outputPath = path.join(llmOutputDir, filename);
    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(chalk.dim(`📝 LLM output saved: ${outputPath}`));
  }

  /**
   * Start an HTTP server in the output directory
   */
  private async startHttpServer(port: number = 8080): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        let filePath = path.join(this.outputDir, req.url === '/' ? 'index.html' : req.url || '');
        
        // Security check - ensure we stay within the directory
        if (!filePath.startsWith(this.outputDir)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        // Set content type based on file extension
        const extname = path.extname(filePath);
        let contentType = 'text/html';
        switch (extname) {
          case '.js':
            contentType = 'text/javascript';
            break;
          case '.css':
            contentType = 'text/css';
            break;
          case '.json':
            contentType = 'application/json';
            break;
          case '.png':
            contentType = 'image/png';
            break;
          case '.jpg':
            contentType = 'image/jpg';
            break;
          case '.svg':
            contentType = 'image/svg+xml';
            break;
        }

        fs.readFile(filePath, (err, content) => {
          if (err) {
            if (err.code === 'ENOENT') {
              res.writeHead(404);
              res.end('File not found');
            } else {
              res.writeHead(500);
              res.end('Server error');
            }
          } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
          }
        });
      });

      server.listen(port, () => {
        const url = `http://localhost:${port}`;
        console.log(chalk.green(`🌐 HTTP server started on ${url}`));
        
        // Open browser after a brief delay
        setTimeout(() => {
          this.openBrowser(url);
        }, 1000);
        
        console.log(chalk.dim('\n💡 Press Ctrl+C to stop the server when you\'re done exploring'));
        
        // Keep the server running - user will stop with Ctrl+C
        process.on('SIGINT', () => {
          console.log(chalk.yellow('\n👋 Shutting down HTTP server...'));
          server.close(() => {
            console.log(chalk.green('✅ Server stopped successfully!'));
            process.exit(0);
          });
        });
        
        process.on('SIGTERM', () => {
          server.close(() => process.exit(0));
        });
        
        resolve();
      });

      server.on('error', (err) => {
        console.error(chalk.red('❌ Failed to start HTTP server:'), err);
        console.log(chalk.yellow('\n📁 Files are still available at:'));
        console.log(chalk.cyan(`  ${this.outputDir}`));
        reject(err);
      });
    });
  }

  /**
   * Open URL in default browser
   */
  private openBrowser(url: string): void {
    const platform = process.platform;
    let command: string;
    
    switch (platform) {
      case 'darwin':
        command = 'open';
        break;
      case 'win32':
        command = 'start';
        break;
      default:
        command = 'xdg-open';
    }

    try {
      spawn(command, [url], { detached: true, stdio: 'ignore' });
      console.log(chalk.cyan(`🚀 Opening ${url} in default browser`));
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Could not automatically open browser. Please visit: ${url}`));
    }
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

    const icons = (themeIcons as any)[this.selectedTheme] || themeIcons.space;
    
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

  private copyQuestNavigator(): void {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const templatesDir = path.join(__dirname, 'templates');
    const assetsDir = path.join(this.outputDir, 'assets');

    try {
      // Ensure assets directory exists
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }

      // Copy quest navigator JavaScript
      const navigatorJSSource = path.join(templatesDir, 'quest-navigator.js');
      const navigatorJSTarget = path.join(assetsDir, 'quest-navigator.js');
      if (fs.existsSync(navigatorJSSource)) {
        fs.copyFileSync(navigatorJSSource, navigatorJSTarget);
      }

      // Copy quest navigator CSS
      const navigatorCSSSource = path.join(templatesDir, 'quest-navigator.css');
      const navigatorCSSTarget = path.join(assetsDir, 'quest-navigator.css');
      if (fs.existsSync(navigatorCSSSource)) {
        fs.copyFileSync(navigatorCSSSource, navigatorCSSTarget);
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️ Warning: Could not copy quest navigator files'));
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
    const questsToGenerate = this.maxQuests !== undefined ? Math.min(this.maxQuests, this.quests.length) : this.quests.length;
    
    // Trim the quests array to match the actual number being generated
    if (questsToGenerate < this.quests.length) {
      this.quests = this.quests.slice(0, questsToGenerate);
    }
    
    for (let i = 0; i < questsToGenerate; i++) {
      const quest = this.quests[i];
      if (!quest) continue;
      
      console.log(chalk.dim(`  📖 Generating quest ${i + 1}/${questsToGenerate}: ${quest.title}`));
      
      try {
        const questContent = await this.generateQuestContentWithRetry(quest.id);
        
        // Save quest content if logging is enabled
        this.saveLlmOutput('quest.output.md', questContent);
        
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
    const prevQuest = questIndex > 0 ? this.quests[questIndex - 1] : null;
    const nextQuest = questIndex < this.quests.length - 1 ? this.quests[questIndex + 1] : null;

    let bottomNavigation = '';
    if (prevQuest || nextQuest) {
      // Determine navigation CSS class based on which buttons are present
      let navClass = 'quest-navigation quest-navigation-bottom';
      const hasCompleteButton = !nextQuest && prevQuest; // Last quest with complete button
      
      if (prevQuest && nextQuest) {
        // Both buttons present - use default space-between
      } else if (prevQuest && !nextQuest && !hasCompleteButton) {
        navClass += ' nav-prev-only';
      } else if (!prevQuest && nextQuest) {
        navClass += ' nav-next-only';
      }
      // Note: when hasCompleteButton is true, we use default space-between for proper alignment
      
      bottomNavigation = `
      <div class="${navClass}">`;
      
      if (prevQuest) {
        bottomNavigation += `
        <a href="${prevQuest.filename}" class="prev-quest-btn">← Previous: ${prevQuest.title.length > 30 ? prevQuest.title.slice(0, 30) + '...' : prevQuest.title}</a>`;
      }
      
      if (nextQuest) {
        bottomNavigation += `
        <a href="${nextQuest.filename}" class="next-quest-btn">Next: ${nextQuest.title.length > 30 ? nextQuest.title.slice(0, 30) + '...' : nextQuest.title} →</a>`;
      } else if (prevQuest) {
        // On the last quest, add a button to return to the theme homepage
        bottomNavigation += `
        <a href="index.html" class="next-quest-btn complete-btn">Complete Adventure →</a>`;
      }
      
      bottomNavigation += `
      </div>
    `;
    }

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

    // Pattern to match file paths: packages/core/src/file.ts, src/file.ts, ./packages/mcp/src/file.ts, etc.
    const filePathPattern = /\.?\/?(?:packages\/[\w-]+\/)?src\/[\w-/]+\.(ts|js|tsx|jsx|css|json|md)/;

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

  private async generateAllThemes(args: Map<string, string>): Promise<void> {
    console.log(chalk.green('✅ Generating all themes'));
    
    // Set output directory from args
    const outputArg = args.get('output');
    this.outputDir = outputArg || './public';
    console.log(chalk.green(`✅ Output: ${this.outputDir}`));

    // Handle overwrite setting
    const overwrite = args.has('overwrite');
    if (overwrite) {
      console.log(chalk.green('✅ Overwrite: enabled'));
    }

    // Handle max-quests setting
    const maxQuestsArg = args.get('max-quests');
    const maxQuests = maxQuestsArg ? parseInt(maxQuestsArg, 10) : undefined;
    if (maxQuests !== undefined && (isNaN(maxQuests) || maxQuests < 0)) {
      throw new Error(`Invalid max-quests value: ${maxQuestsArg}. Must be a positive number.`);
    }
    if (maxQuests !== undefined) {
      console.log(chalk.green(`✅ Max quests: ${maxQuests}`));
      this.maxQuests = maxQuests;
    }

    // Handle log-llm-output setting
    this.logLlmOutput = args.has('log-llm-output');
    if (this.logLlmOutput) {
      console.log(chalk.green('✅ LLM output logging: enabled'));
    }

    // Handle serve setting
    this.serve = args.has('serve');
    if (this.serve) {
      console.log(chalk.green('✅ HTTP server: will start after generation'));
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
    
    // Create root output directory
    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.mkdirSync(path.join(this.outputDir, 'assets'), { recursive: true });
    fs.mkdirSync(path.join(this.outputDir, 'assets', 'images'), { recursive: true });

    // Generate each theme in its own subdirectory
    const themes: AdventureTheme[] = ['space', 'mythical', 'ancient', 'developer'];
    
    console.log(chalk.blue(`\n🎯 Starting parallel generation of ${themes.length} themes...`));
    console.log(chalk.dim('Themes will be generated concurrently for faster completion'));
    
    // Track progress
    const progress = {
      completed: 0,
      total: themes.length,
      results: [] as { theme: string; success: boolean; error?: any }[]
    };

    // Create all theme generation promises
    const themePromises = themes.map(async (theme, index) => {
      const startTime = Date.now();
      console.log(chalk.yellow(`🚀 [${index + 1}/${themes.length}] Starting ${theme} theme generation...`));
      
      // Create theme-specific directory
      const themeDir = path.join(this.outputDir, theme);
      fs.mkdirSync(themeDir, { recursive: true });
      fs.mkdirSync(path.join(themeDir, 'assets'), { recursive: true });
      fs.mkdirSync(path.join(themeDir, 'assets', 'images'), { recursive: true });
      
      // Create a new generator instance for this theme to avoid state conflicts
      const themeGenerator = new HTMLAdventureGenerator();
      
      try {
        themeGenerator['selectedTheme'] = theme;
        themeGenerator['outputDir'] = themeDir;
        themeGenerator['maxQuests'] = this.maxQuests;
        themeGenerator['logLlmOutput'] = this.logLlmOutput;
        
        await themeGenerator.generateAdventure();
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        progress.completed++;
        console.log(chalk.green(`✅ [${progress.completed}/${progress.total}] ${theme} theme completed in ${duration}s`));
        
        return { theme, success: true };
      } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        progress.completed++;
        console.log(chalk.red(`❌ [${progress.completed}/${progress.total}] ${theme} theme failed after ${duration}s:`, error instanceof Error ? error.message : error));
        
        return { theme, success: false, error };
      } finally {
        // Always close the readline interface to allow process to exit
        try {
          themeGenerator['rl'].close();
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
    });

    // Wait for all themes to complete
    console.log(chalk.blue('\n⏳ Generating themes in parallel...'));
    const results = await Promise.allSettled(themePromises);
    
    // Process results and show summary
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;
    
    console.log(chalk.blue('\n📊 Generation Summary:'));
    console.log(chalk.green(`  ✅ Successful: ${successful}/${themes.length}`));
    if (failed > 0) {
      console.log(chalk.red(`  ❌ Failed: ${failed}/${themes.length}`));
    }
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { theme, success } = result.value;
        if (success) {
          console.log(chalk.dim(`    ✓ ${theme}`));
        } else {
          console.log(chalk.dim(`    ✗ ${theme} - generation failed`));
        }
      } else {
        console.log(chalk.dim(`    ✗ ${themes[index]} - promise rejected`));
      }
    });

    // Generate homepage index.html
    console.log(chalk.yellow('\n🏠 Generating homepage...'));
    this.generateHomepageIndex();
    
    // Copy global assets
    this.copyGlobalAssets();
    
    console.log();
    console.log(chalk.green.bold('🎉 All themes generated successfully!'));
    console.log(chalk.cyan(`📁 Location: ${this.outputDir}`));
    
    if (this.serve) {
      await this.startHttpServer();
    } else {
      console.log(chalk.cyan(`🌐 Open: ${path.join(this.outputDir, 'index.html')}`));
    }
  }

  private generateHomepageIndex(): void {
    // Get repo URL from adventure.config.json
    const config = parseAdventureConfig(this.projectPath);
    let repoUrl = 'https://github.com/danwahlin/ai-repo-adventures';
    let repoName = 'AI Repo Adventures';
    
    if (config && typeof config === 'object' && 'adventure' in config) {
      const adventure = (config as any).adventure;
      if (adventure && typeof adventure.url === 'string') {
        repoUrl = adventure.url.replace(/\/$/, ''); // Remove trailing slash
      }
      if (adventure && typeof adventure.name === 'string') {
        repoName = adventure.name;
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Repo Adventure - AI Repo Adventures</title>
    <link rel="stylesheet" href="assets/theme.css">
</head>
<body>
    <nav class="navbar">
        <div class="nav-content">
            <div class="nav-left">
                <a href="index.html">${repoName}</a>
            </div>
            <div class="nav-right">
                <a href="${repoUrl}" target="_blank" rel="noopener noreferrer" class="github-link">
                    <img src="assets/images/github-mark.svg" alt="GitHub" width="24" height="24">
                </a>
            </div>
        </div>
    </nav>
    
    <div class="container">
        <div class="hero-section">
            <div class="hero-background"></div>
            <div class="hero-content">
                <h1>MCP Repo Adventure<br><span class="subtitle">AI Repo Adventures</span></h1>
            </div>
        </div>
        
        <div class="story-content">
            <div class="welcome-section">
                <p>Welcome to AI Repo Adventures! An innovative way to explore and learn codebases through immersive, themed adventure quests. Each theme offers a unique perspective on the <a href="${repoUrl}" target="_blank" rel="noopener noreferrer">${repoName}</a> repo's code, transforming technical exploration into fun and engaging storytelling.</p>
            </div>
            
            <div class="theme-selector">
                <h2>Choose Your Adventure Theme</h2>
                <div class="theme-grid">

            <div class="theme-card" onclick="window.location.href='space/index.html'">
                <div class="theme-preview">
                    <img src="space/assets/images/space.png" alt="Space Explorer Preview" loading="lazy">
                </div>
                <div class="theme-info">
                    <h3>Space Explorer</h3>
                    <p>Embark on cosmic adventures through code galaxies and starship protocols.</p>
                </div>
            </div>

            <div class="theme-card" onclick="window.location.href='mythical/index.html'">
                <div class="theme-preview">
                    <img src="mythical/assets/images/mythical.png" alt="Enchanted Kingdom Preview" loading="lazy">
                </div>
                <div class="theme-info">
                    <h3>Enchanted Kingdom</h3>
                    <p>Journey through ancient codebases in a realm of parchment and magic.</p>
                </div>
            </div>

            <div class="theme-card" onclick="window.location.href='ancient/index.html'">
                <div class="theme-preview">
                    <img src="ancient/assets/images/ancient.png" alt="Ancient Explorer Preview" loading="lazy">
                </div>
                <div class="theme-info">
                    <h3>Ancient Explorer</h3>
                    <p>Discover sacred coding wisdom in mystical temples and ancient halls.</p>
                </div>
            </div>

            <div class="theme-card" onclick="window.location.href='developer/index.html'">
                <div class="theme-preview">
                    <img src="developer/assets/images/developer.png" alt="Developer Preview" loading="lazy">
                </div>
                <div class="theme-info">
                    <h3>Developer</h3>
                    <p>Navigate modern development workflows with professional precision.</p>
                </div>
            </div>
            </div>
            </div>
        </div>
    </div>
    
    <footer class="footer">
        <div class="footer-content">
            <span>Created using <a href="https://github.com/DanWahlin/ai-repo-adventures" target="_blank" rel="noopener noreferrer" class="repo-link">AI Repo Adventures</a></span>
        </div>
    </footer>
</body>
</html>`;

    const indexPath = path.join(this.outputDir, 'index.html');
    fs.writeFileSync(indexPath, html);
    console.log(chalk.green('✅ Homepage index.html created'));
  }

  private copyGlobalAssets(): void {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    
    // Copy the homepage theme CSS that matches your existing public/assets/theme.css
    const homepageCSS = `/* AI REPO ADVENTURES HOMEPAGE THEME - LIGHT */
:root {
  /* ===== COLOR PALETTE ===== */
  --primary-bg: linear-gradient(135deg, #f7fafc 0%, #ffffff 100%);
  --body-overlay: radial-gradient(circle at 25% 75%, rgba(102, 126, 234, 0.03) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(118, 75, 162, 0.02) 0%, transparent 50%);
  --primary-text: #2d3748;
  --heading-color: #1a202c;
  --paragraph-color: #4a5568;
  --accent-primary: #667eea;
  --accent-secondary: #764ba2;
  --accent-tertiary: #f093fb;
  --title-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  /* ===== TYPOGRAPHY ===== */
  --font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-heading: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-code: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  --heading-weight: 600;

  /* ===== EFFECTS ===== */
  --text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  --glow-shadow: 0 4px 12px rgba(100, 181, 246, 0.3);

  /* ===== NAVBAR ===== */
  --navbar-bg: rgba(255, 255, 255, 0.98);
  --navbar-border: none;
  --navbar-shadow: 0 2px 20px rgba(0, 0, 0, 0.05);

  /* ===== CONTENT AREAS ===== */
  --content-bg: rgba(255, 255, 255, 0.95);
  --content-border: 1px solid #e2e8f0;
  --content-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  --section-border: 1px solid #e2e8f0;

  /* ===== BACKGROUND IMAGES ===== */
  --story-bg-image: url('images/ai-adventures.png');
  --story-background-position-percentage: 50%;
}

/* ===== ANIMATIONS FOR WOW FACTOR ===== */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 10px 40px rgba(102, 126, 234, 0.2);
  }
  50% {
    box-shadow: 0 10px 50px rgba(102, 126, 234, 0.3);
  }
}

@keyframes gradientShift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes slowPan {
  0% {
    transform: scale(1.1) translate(-8%, -5%);
  }
  25% {
    transform: scale(1.15) translate(-2%, -8%);
  }
  50% {
    transform: scale(1.12) translate(2%, -3%);
  }
  75% {
    transform: scale(1.08) translate(-5%, -7%);
  }
  100% {
    transform: scale(1.1) translate(-8%, -5%);
  }
}

@keyframes loadingBar {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* Base styles from theme system */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

* { 
  box-sizing: border-box; 
}

html { 
  scroll-behavior: smooth;
  scroll-padding-top: 100px;
  margin: 0;
  padding: 0;
}

body {
  background: #f7fafc;
  background-attachment: fixed;
  color: var(--primary-text);
  font-family: var(--font-primary);
  font-weight: 400;
  margin: 0;
  padding: 0;
  min-height: 100vh;
  line-height: 1.6;
  position: relative;
  overflow-x: hidden;
  opacity: 0;
  animation: fadeIn 0.8s ease-out forwards;
  display: flex;
  flex-direction: column;
}

/* Ensure no gaps around body */
body::before,
body::after {
  margin: 0;
  padding: 0;
}

/* Page loading effect */
body::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary), var(--accent-tertiary));
  transform: translateX(-100%);
  animation: loadingBar 2s ease-out;
  z-index: 9999;
}

body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--body-overlay);
  pointer-events: none;
  z-index: -1;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  min-height: calc(100vh - 160px); /* Subtract navbar and footer height */
}

/* ===== NAVBAR ===== */
.navbar {
  background: var(--navbar-bg);
  border-bottom: var(--navbar-border);
  box-shadow: var(--navbar-shadow);
  padding: 1rem 0;
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-left a {
  color: var(--heading-color);
  font-family: var(--font-heading);
  font-size: 1.1rem;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.3s ease;
}

.nav-right .github-link {
  display: flex;
  align-items: center;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.nav-right .github-link:hover {
  opacity: 1;
}

/* ===== TYPOGRAPHY ===== */
h1 {
  background: var(--title-gradient);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
  margin-bottom: 2rem;
  font-family: var(--font-heading);
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 700;
  text-shadow: var(--glow-shadow);
  position: relative;
}

h2 {
  color: var(--accent-primary);
  font-family: var(--font-heading);
  font-weight: var(--heading-weight);
  border-bottom: var(--section-border);
  padding-bottom: 0.8rem;
  margin-top: 3rem;
  margin-bottom: 1.5rem;
  text-shadow: var(--text-shadow);
  font-size: 1.8rem;
}

h3 {
  color: var(--accent-secondary);
  font-family: var(--font-heading);
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.8rem;
  font-size: 1.3rem;
}

p {
  color: var(--paragraph-color);
  margin-bottom: 1.2rem;
  line-height: 1.7;
  font-size: 1.1rem;
}

/* ===== HERO SECTION WITH BACKGROUND ===== */
.hero-section {
  position: relative;
  background: transparent;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 3rem;
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.2);
  animation: fadeIn 1s ease-out, pulseGlow 6s ease-in-out infinite;
  min-height: 400px;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 120%;
  height: 120%;
  background-image: var(--story-bg-image);
  background-size: cover;
  background-position: center;
  opacity: 1;
  z-index: 1;
  will-change: transform;
  animation: slowPan 30s ease-in-out infinite;
}

.hero-section:hover .hero-background {
  animation-play-state: paused;
  filter: brightness(1.1);
}

.hero-content {
  position: relative;
  z-index: 2;
  padding: 4rem 3rem;
  text-align: center;
  color: #ffffff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
  min-height: 400px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.hero-content h1 {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  color: #ffffff;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  letter-spacing: -1px;
  background: none;
  -webkit-text-fill-color: unset;
  animation: fadeInUp 1s ease-out 0.3s both;
  position: relative;
}

.hero-content h1::after {
  content: '';
  position: absolute;
  top: 0;
  left: -10px;
  right: -10px;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transform: translateX(-100%);
  animation: shimmer 3s ease-in-out 2s infinite;
}

.hero-content h1 .subtitle {
  display: block;
  font-size: 0.6em;
  font-weight: 600;
  opacity: 0.9;
  margin-top: 0.5rem;
  letter-spacing: 0.5px;
}

/* Welcome Section */
.welcome-section {
  text-align: center;
  padding: 2rem 1rem;
  margin-bottom: 2rem;
  animation: fadeInUp 1s ease-out 0.6s both;
}

.welcome-section p {
  font-size: 1.2rem;
  line-height: 1.7;
  margin: 0 auto;
  color: var(--paragraph-color);
  font-weight: 400;
}

/* ===== STORY CONTENT WITH BACKGROUND ===== */
.story-content {
  background: var(--content-bg);
  border-radius: 15px;
  padding: 1rem;
  backdrop-filter: blur(5px);
  margin-bottom: 2rem;
}

.story-content h1 {
  position: relative;
  background-image: var(--story-bg-image);
  background-size: cover;
  background-position: center var(--story-background-position-percentage);
  background-repeat: no-repeat;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  border-radius: 15px;
  overflow: hidden;
  margin-top: 0;
  margin-bottom: 3rem;
  font-size: 4rem;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.story-content h1::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1;
}

.story-content h1 * {
  position: relative;
  z-index: 2;
}

/* ===== HOMEPAGE SPECIFIC STYLES ===== */
.quest-preview {
  background: var(--content-bg);
  border-radius: 15px;
  padding: 2rem;
  margin-bottom: 2rem;
  backdrop-filter: blur(5px);
  border: var(--content-border);
  box-shadow: var(--content-shadow);
}

.quest-list {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
  font-family: var(--font-code);
  font-size: 1rem;
  line-height: 1.6;
  white-space: pre-line;
}

.theme-selector {
  background: transparent;
  padding: 0;
  border: none;
  box-shadow: none;
  animation: fadeIn 1s ease-out 0.8s both;
}

.theme-selector h2 {
  text-align: center;
  color: var(--heading-color);
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 3rem;
  border: none;
  padding-bottom: 0;
  position: relative;
}

.theme-selector h2::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
  animation: fadeIn 1s ease-out 1s both;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  margin-top: 2rem;
  margin-left: auto;
  margin-right: auto;
}

.theme-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
}

/* Stagger animation for cards */
.theme-card:nth-child(1) { animation-delay: 1s; }
.theme-card:nth-child(2) { animation-delay: 1.1s; }
.theme-card:nth-child(3) { animation-delay: 1.2s; }
.theme-card:nth-child(4) { animation-delay: 1.3s; }

/* Animated gradient border on hover */
.theme-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 12px;
  padding: 2px;
  background: linear-gradient(45deg, #667eea, #764ba2, #f093fb, #667eea);
  background-size: 300% 300%;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s ease;
  animation: gradientShift 3s ease infinite;
  z-index: 1;
}

.theme-card:hover::before {
  opacity: 1;
}

.theme-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 15px 35px rgba(102, 126, 234, 0.2);
  border-color: transparent;
  background: #ffffff;
}

.theme-icon {
  font-size: 3rem;
  text-align: center;
  margin-bottom: 1rem;
}

.theme-info {
  padding: 1.5rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 2;
  background: #ffffff;
}

.theme-info h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--heading-color);
  font-size: 1.3rem;
}

.theme-info p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--paragraph-color);
  line-height: 1.5;
}

/* Remove quest list styles - no longer needed */

.theme-preview {
  width: 100%;
  height: 180px;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
  margin: 0;
  position: relative;
}

.theme-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-card:hover .theme-preview img {
  transform: scale(1.05);
}

/* ===== FOOTER ===== */
.footer {
  background: var(--navbar-bg);
  border-top: 1px solid #e2e8f0;
  padding: 1.5rem 0;
  margin-top: auto;
  width: 100%;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  text-align: center;
  color: var(--paragraph-color);
  font-size: 0.95rem;
}

.footer-content .repo-link {
  color: var(--accent-primary);
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
}

.footer-content .repo-link:hover {
  color: var(--accent-secondary);
  text-decoration: underline;
}

/* ===== RESPONSIVE DESIGN ===== */
@media (min-width: 769px) and (max-width: 1200px) {
  .theme-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .container { padding: 1rem; }
  
  .hero-content h1 {
    font-size: 2.5rem;
  }
  
  .hero-content p {
    font-size: 1.1rem;
  }
  
  .hero-content {
    padding: 3rem 2rem;
    min-height: 200px;
  }
  
  .story-content h1 {
    min-height: 250px;
    padding: 2rem 1rem;
    font-size: 2.5rem;
  }
  
  .theme-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .quest-preview, .theme-selector {
    padding: 1.5rem;
  }
}

@media (max-width: 480px) {
  .hero-content h1 {
    font-size: 2rem;
  }
  
  .hero-content p {
    font-size: 1rem;
  }
  
  .hero-content {
    padding: 2.5rem 1.5rem;
    min-height: 160px;
  }
  
  .story-content h1 {
    min-height: 200px;
    font-size: 2rem;
  }
  
  .theme-icon {
    font-size: 2.5rem;
  }
}`;

    const cssPath = path.join(this.outputDir, 'assets', 'theme.css');
    fs.writeFileSync(cssPath, homepageCSS);
    
    // Copy global images (ai-adventures.png and github icons)
    const sourceImagesDir = path.join(__dirname, 'assets', 'images');
    const targetImagesDir = path.join(this.outputDir, 'assets', 'images');

    try {
      if (fs.existsSync(sourceImagesDir)) {
        // Ensure target directory exists
        fs.mkdirSync(targetImagesDir, { recursive: true });
        
        // Copy specific global images
        const globalImages = ['ai-adventures.png', 'github-mark.svg', 'github-mark-white.svg'];
        globalImages.forEach(file => {
          const sourcePath = path.join(sourceImagesDir, file);
          const targetPath = path.join(targetImagesDir, file);
          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath);
          }
        });
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️ Warning: Could not copy global images'));
    }
    
    console.log(chalk.green('✅ Global assets copied'));
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
  --theme <theme>        Theme: space, mythical, ancient, developer, custom, or all
  --output <dir>         Output directory (default: ./public)
  --overwrite           Overwrite existing files without prompting
  --max-quests <num>    Limit number of quests to generate (default: all)
  --log-llm-output      Save raw LLM output to tests/llm-output directory
  --serve               Start HTTP server and open browser after generation
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