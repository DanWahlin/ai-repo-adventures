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
import { repoAnalyzer } from '@codewithdan/ai-repo-adventures-core/analyzer';
import { AdventureManager } from '@codewithdan/ai-repo-adventures-core/adventure';
import { getAllThemes, getThemeByKey, AdventureTheme, parseAdventureConfig, LLM_MODEL } from '@codewithdan/ai-repo-adventures-core/shared';
import { LLMClient, RateLimitType, RateLimitInfo, RateLimitError } from '@codewithdan/ai-repo-adventures-core/llm';
import { createProjectInfo } from '@codewithdan/ai-repo-adventures-core';
import { TemplateEngine } from './template-engine.js';
import { AssetManager } from './asset-manager.js';
import { ThemeManager } from './theme-manager.js';

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
  private logLlmOutputDir: string = '.ai-repo-adventures/llm-output';
  private serve: boolean = false;
  private isMultiTheme: boolean = false;
  private processingMode: 'parallel' | 'sequential' = 'parallel';
  private forceSequential: boolean = false;
  private tokenRateLimitEncountered: boolean = false;
  private completedThemes = new Set<string>();
  private currentProcessingTheme?: string;
  private rateLimitWaitStartTime?: number;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.adventureManager = new AdventureManager();
    this.templateEngine = new TemplateEngine();
  }

  /**
   * Get AssetManager instance for current directory
   */
  private async getAssetManager() {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    return new (await import('./asset-manager.js')).AssetManager(__dirname);
  }

  async start(): Promise<void> {
    console.clear();
    console.log(chalk.bgBlue.white.bold(' 🌟 AI Repo Adventures HTML Generator 🌟 '));
    console.log(chalk.dim('─'.repeat(50)));
    console.log();
    console.log(chalk.yellow('Generate a complete HTML adventure website from your codebase!'));
    console.log();

    try {
      const shouldGenerateAllThemes = await this.selectTheme();
      await this.selectOutputDirectory();

      if (shouldGenerateAllThemes) {
        // Generate all themes using the same logic as command-line --theme all
        const args = new Map<string, string>();
        args.set('output', this.outputDir);
        args.set('overwrite', 'true'); // Always overwrite in interactive mode for simplicity

        await this.generateAllThemes(args);
      } else {
        // Generate single theme as usual
        await this.generateAdventure();

        console.log();
        console.log(chalk.green.bold('🎉 Adventure website generated successfully!'));
        console.log(chalk.cyan(`📁 Location: ${this.outputDir}`));
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

  async startWithArgs(args: Map<string, string>): Promise<void> {
    this.printHeader();

    try {
      // Handle theme configuration
      const shouldGenerateAllThemes = this.configureTheme(args);
      if (shouldGenerateAllThemes) {
        await this.generateAllThemes(args);
        return;
      }

      // Configure output and options
      this.configureOutputDirectory(args);
      const overwrite = this.configureOptions(args);
      
      // Setup directories and generate
      this.setupOutputDirectories(overwrite);
      await this.generateAdventure();
      
      this.printSuccessMessage();
      
      if (this.serve) {
        await this.startHttpServer();
      }
    } catch (error) {
      console.error(chalk.red('❌ Error generating adventure:'), error);
      this.rl.close();
      process.exit(1);
    }
    
    this.rl.close();
    process.exit(0);
  }

  private printHeader(): void {
    console.log(chalk.bgBlue.white.bold(' 🌟 AI Repo Adventures HTML Generator 🌟 '));
    console.log(chalk.dim('─'.repeat(50)));
    console.log();
  }

  private configureTheme(args: Map<string, string>): boolean {
    const themeArg = args.get('theme');
    if (!themeArg) return false;
    
    const theme = this.parseThemeArg(themeArg);
    if (!theme) {
      throw new Error(`Invalid theme: ${themeArg}. Valid themes: space, mythical, ancient, developer, custom, all`);
    }
    
    if (theme === 'all') {
      return true; // Signal that all themes should be generated
    }
    
    this.selectedTheme = theme;
    console.log(chalk.green(`✅ Theme: ${themeArg}`));
    return false;
  }

  private configureOutputDirectory(args: Map<string, string>): void {
    const outputArg = args.get('output');
    this.outputDir = outputArg || './public';
    console.log(chalk.green(`✅ Output: ${this.outputDir}`));
  }

  private configureOptions(args: Map<string, string>): boolean {
    // Configure overwrite setting
    const overwrite = args.has('overwrite');
    if (overwrite) {
      console.log(chalk.green('✅ Overwrite: enabled'));
    }

    // Configure max-quests setting
    const maxQuestsArg = args.get('max-quests');
    const maxQuests = maxQuestsArg ? parseInt(maxQuestsArg, 10) : undefined;
    if (maxQuests !== undefined && (isNaN(maxQuests) || maxQuests < 0)) {
      throw new Error(`Invalid max-quests value: ${maxQuestsArg}. Must be a positive number.`);
    }
    if (maxQuests !== undefined) {
      console.log(chalk.green(`✅ Max quests: ${maxQuests}`));
      this.maxQuests = maxQuests;
    }

    // Configure logging and serving
    this.logLlmOutput = args.has('log-llm-output');
    if (this.logLlmOutput) {
      const customDir = args.get('log-llm-output-dir');
      if (customDir) {
        this.logLlmOutputDir = customDir;
      }
      console.log(chalk.green(`✅ LLM output logging: enabled (${this.logLlmOutputDir})`));
    }

    this.serve = args.has('serve');
    if (this.serve) {
      console.log(chalk.green('✅ HTTP server: will start after generation'));
    }

    return overwrite;
  }

  private setupOutputDirectories(overwrite: boolean): void {
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
  }

  private printSuccessMessage(): void {
    console.log();
    console.log(chalk.green.bold('🎉 Adventure website generated successfully!'));
    console.log(chalk.cyan(`📁 Location: ${this.outputDir}`));
    
    if (!this.serve) {
      console.log(chalk.cyan(`🌐 Open: ${path.join(this.outputDir, 'index.html')}`));
    }
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

  private async selectTheme(): Promise<boolean> {
    console.log(chalk.yellow.bold('📚 Choose Your Adventure Theme:'));
    console.log();

    const themes = getAllThemes();
    const allThemesId = themes.length + 1;

    themes.forEach((theme: any) => {
      console.log(`${theme.emoji} ${chalk.bold(theme.id.toString())}. ${theme.displayName} - ${theme.description}`);
    });

    // Add "all themes" option
    console.log(`🌈 ${chalk.bold(allThemesId.toString())}. Generate All Themes - Create adventures in all available themes simultaneously`);
    console.log();

    const choice = await this.prompt('Enter theme number or name (or "all" for all themes): ');

    // Parse theme choice
    const cleanChoice = choice.trim().toLowerCase();
    const themeNumber = parseInt(choice.trim());

    // Check if user selected "all themes"
    if (cleanChoice === 'all' || themeNumber === allThemesId) {
      console.log(chalk.green('✅ Selected: Generate All Themes'));
      console.log();
      return true; // Signal that all themes should be generated
    }

    // Handle regular theme selection
    if (!isNaN(themeNumber)) {
      const theme = themes.find((t: any) => t.id === themeNumber);
      if (theme) {
        this.selectedTheme = theme.key as AdventureTheme;
      } else {
        console.log(chalk.red('Invalid theme number. Using space theme.'));
        this.selectedTheme = 'space';
      }
    } else {
      const theme = getThemeByKey(cleanChoice);
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

    return false; // Single theme selected
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

    // Step 3.5: Trim quests array if max-quests is specified (before homepage generation)
    const questsToGenerate = this.maxQuests !== undefined ? Math.min(this.maxQuests, this.quests.length) : this.quests.length;
    if (questsToGenerate < this.quests.length) {
      this.quests = this.quests.slice(0, questsToGenerate);
    }

    // Step 4: Generate all files
    console.log(chalk.dim('🎨 Creating theme styling...'));
    this.generateThemeCSS();

    console.log(chalk.dim('🧭 Adding quest navigator...'));
    if (!this.isMultiTheme) {
      const assetManager = await this.getAssetManager();
      assetManager.copyQuestNavigator(this.outputDir);
    }

    console.log(chalk.dim('🖼️ Copying images...'));
    // Skip copying images in multi-theme mode for individual themes
    // Images are copied once at the root level
    if (!this.isMultiTheme) {
      const assetManager = await this.getAssetManager();
      assetManager.copyImages(this.outputDir, this.isMultiTheme);
    }

    console.log(chalk.dim('📝 Creating main adventure page...'));
    this.generateIndexHTML();

    console.log(chalk.dim('📖 Generating quest pages...'));
    await this.generateQuestPages();

    console.log(chalk.dim('🎉 Creating adventure summary page...'));
    await this.generateSummaryHTML();
  }

  private extractQuestInfo(): void {
    this.quests = this.adventureManager.getAllQuests().map((quest: any, index: number) => ({
      id: quest.id,
      title: quest.title,
      filename: `quest-${index + 1}.html`
    }));
  }

  /**
   * Determines if a theme is light-colored and requires dark GitHub logo
   */
  private isLightTheme(theme: AdventureTheme): boolean {
    // Light themes that need dark GitHub logo (github-mark.svg)
    const lightThemes: AdventureTheme[] = ['mythical', 'developer'];
    return lightThemes.includes(theme);
  }

  /**
   * Get appropriate GitHub logo based on theme brightness
   */
  private getGitHubLogo(): string {
    const sharedPath = this.isMultiTheme ? '../assets/shared' : 'assets/shared';
    return this.isLightTheme(this.selectedTheme) 
      ? `${sharedPath}/github-mark.svg`          // Dark logo for light themes
      : `${sharedPath}/github-mark-white.svg`;   // White logo for dark themes
  }

  /**
   * Save LLM output to configured directory if logging is enabled
   */
  private saveLlmOutput(baseFilename: string, content: string): void {
    if (!this.logLlmOutput) return;

    const llmOutputDir = this.logLlmOutputDir;
    
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
    
    // Add "Change Theme" link only when in multi-theme mode
    const changeThemeLink = this.isMultiTheme 
      ? '<a href="../index.html" class="nav-link">Change Theme</a>'
      : '';

    return {
      ADVENTURE_TITLE: adventureTitle,
      INDEX_LINK: 'index.html',
      CURRENT_THEME: this.selectedTheme,
      REPO_NAME: repoName,
      REPO_URL: repoUrl,
      THEME_ICON: icons.theme,
      QUEST_ICON: icons.quest,
      GITHUB_LOGO: this.getGitHubLogo(),
      CHANGE_THEME_LINK: changeThemeLink,
      ASSETS_PATH: 'assets',
      NAVIGATOR_ASSETS_PATH: this.isMultiTheme ? '../assets/shared' : 'assets',
      TOGGLE_ASSETS_PATH: this.isMultiTheme ? '../assets' : 'assets',
      IMAGES_PATH: this.isMultiTheme ? '../assets/images' : 'assets/images',
      SHARED_PATH: this.isMultiTheme ? '../assets/shared' : 'assets/shared'
    };
  }

  private generateThemeCSS(): void {
    const themeCSS = this.loadThemeCSS(this.selectedTheme);
    const baseCSS = this.loadBaseCSS();
    const animationsCSS = this.loadAnimationsCSS();
    
    // Combine CSS in the correct order: theme variables, base styles, animations
    let combinedCSS = themeCSS + '\n\n' + baseCSS + '\n\n' + animationsCSS;
    
    // Fix image paths based on theme mode
    // In multi-theme: theme CSS is at ./theme/assets/theme.css, images at root ./assets/images/
    // In single-theme: theme CSS is at ./assets/theme.css, images at ./assets/images/  
    const imagePath = this.isMultiTheme ? '../../assets/images/' : 'images/';
    combinedCSS = combinedCSS.replace(/url\('images\//g, `url('${imagePath}`);
    
    const cssPath = path.join(this.outputDir, 'assets', 'theme.css');
    fs.writeFileSync(cssPath, combinedCSS);
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
    try {
      return this.loadCSSFile('themes/fallback.css', null) || '/* No fallback CSS available */';
    } catch {
      return '/* Fallback CSS load failed */';
    }
  }

  private generateIndexHTML(): void {
    const html = this.buildIndexHTML();
    const indexPath = path.join(this.outputDir, 'index.html');
    fs.writeFileSync(indexPath, html);
  }

  private async generateSummaryHTML(): Promise<void> {
    const html = await this.buildSummaryHTML();
    const summaryPath = path.join(this.outputDir, 'summary.html');
    fs.writeFileSync(summaryPath, html);
  }

  private async generateQuestPages(): Promise<void> {
    const questsToGenerate = this.quests.length;
    
    for (let i = 0; i < questsToGenerate; i++) {
      const quest = this.quests[i];
      if (!quest) continue;
      
      console.log(chalk.dim(`  📖 Generating quest ${i + 1}/${questsToGenerate} [${this.selectedTheme}]: ${quest.title}`));
      
      try {
        const questContent = await this.generateQuestContentWithRetry(quest.id);
        
        // Save quest content if logging is enabled
        this.saveLlmOutput('quest.output.md', questContent);
        
        const html = this.buildQuestHTML(quest, questContent, i);
        const questPath = path.join(this.outputDir, quest.filename);
        fs.writeFileSync(questPath, html);
        
      } catch (error) {
        console.log(chalk.red(`    ❌ Failed to generate quest [${this.selectedTheme}]: ${quest.title}`));

        // Fail-fast strategy: If we're in multi-theme mode and a quest fails,
        // throw an error to trigger sequential mode
        if (this.isMultiTheme) {
          throw new Error(`Quest generation failed for ${quest.title} in ${this.selectedTheme} theme. Switching to sequential mode for consistency.`);
        }

        // For single theme generation, still create placeholder
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
      
      const questLinkVariables = {
        QUEST_FILENAME: quest.filename,
        QUEST_TITLE: this.formatInlineMarkdown(quest.title),
        QUEST_DESCRIPTION: description ? `<p>${this.formatInlineMarkdown(description)}</p>` : ''
      };
      
      return this.templateEngine.renderTemplate('quest-link.html', questLinkVariables);
    }).join('\n');

    const cleanStoryContent = this.adventureManager.getStoryContent();
    
    const variables = {
      ...this.getCommonTemplateVariables(),
      PAGE_TITLE: this.adventureManager.getTitle(),
      STORY_CONTENT: this.formatMarkdown(cleanStoryContent),
      QUEST_LINKS: questLinks
    };
    
    return this.templateEngine.renderPage('index-template.html', variables);
  }

  private buildQuestHTML(quest: QuestInfo, content: string, questIndex: number): string {
    const prevQuest = questIndex > 0 ? this.quests[questIndex - 1] : null;
    const nextQuest = questIndex < this.quests.length - 1 ? this.quests[questIndex + 1] : null;

    let bottomNavigation = '';
    const isLastQuest = questIndex === this.quests.length - 1;
    
    if (prevQuest || nextQuest || isLastQuest) {
      // Determine navigation CSS class based on which buttons are present
      let navClass = 'quest-navigation quest-navigation-bottom';
      const hasCompleteButton = isLastQuest; // Last quest always has complete button
      
      if (prevQuest && nextQuest) {
        // Both buttons present - use default space-between
      } else if (prevQuest && !nextQuest && !hasCompleteButton) {
        navClass += ' nav-prev-only';
      } else if (!prevQuest && nextQuest) {
        navClass += ' nav-next-only';
      } else if (!prevQuest && hasCompleteButton) {
        // Single quest with complete button only
        navClass += ' nav-next-only';
      }
      // Note: when hasCompleteButton is true with prevQuest, we use default space-between for proper alignment
      
      bottomNavigation = `
      <div class="${navClass}">`;
      
      if (prevQuest) {
        bottomNavigation += `
        <a href="${prevQuest.filename}" class="prev-quest-btn">← Previous: Quest ${questIndex}</a>`;
      }
      
      if (nextQuest) {
        bottomNavigation += `
        <a href="${nextQuest.filename}" class="next-quest-btn">Next: Quest ${questIndex + 2} →</a>`;
      } else if (isLastQuest) {
        // On the last quest, add a button to go to summary page
        bottomNavigation += `
        <a href="summary.html" class="next-quest-btn complete-btn">Complete Adventure →</a>`;
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

  private async buildSummaryHTML(): Promise<string> {
    const lastQuest = this.quests[this.quests.length - 1];
    const questCount = this.quests.length;
    
    // Get theme-specific data
    const themeData = this.getThemeData();
    
    // Generate meaningful journey summary
    const journeySummary = this.generateJourneySummary(questCount, themeData);
    
    // Generate key concepts from quest content
    const keyConcepts = await this.generateKeyConcepts();

    const variables = {
      ...this.getCommonTemplateVariables(),
      PAGE_TITLE: `${themeData.name} Adventure - Complete!`,
      JOURNEY_SUMMARY: journeySummary,
      QUEST_SUMMARY_LIST: keyConcepts,
      LAST_QUEST_FILENAME: lastQuest.filename,
      LAST_QUEST_TITLE: `Quest ${questCount}`
    };
    
    return this.templateEngine.renderTemplate('summary-template.html', variables);
  }

  private getThemeData() {
    return this.selectedTheme === 'developer' ? 
      { 
        name: 'Developer', 
        emoji: '💻', 
        context: 'technical documentation and modern development practices',
        journey: 'development workflow'
      } :
      this.selectedTheme === 'space' ?
      { 
        name: 'Space', 
        emoji: '🚀', 
        context: 'cosmic starship operations and galactic exploration systems',
        journey: 'interstellar mission'
      } :
      this.selectedTheme === 'mythical' ?
      { 
        name: 'Mythical', 
        emoji: '🏰', 
        context: 'enchanted kingdoms and magical code artifacts',
        journey: 'mystical quest'
      } :
      this.selectedTheme === 'ancient' ?
      { 
        name: 'Ancient', 
        emoji: '🏛️', 
        context: 'archaeological discoveries and ancient coding wisdom',
        journey: 'archaeological expedition'
      } :
      { 
        name: 'Adventure', 
        emoji: '⚔️', 
        context: 'epic code exploration and discovery',
        journey: 'heroic adventure'
      };
  }

  private generateJourneySummary(questCount: number, themeData: any): string {
    if (this.selectedTheme === 'developer') {
      return `You've analyzed the MCP (Model Context Protocol) architecture and learned how this repository powers AI-driven code exploration. You've examined server implementation, tool orchestration, and request handling patterns that enable dynamic storytelling from codebases.`;
    } else {
      return `You've journeyed through ${themeData.context} to uncover the secrets of the MCP architecture. Your ${themeData.journey} revealed the intricate systems that power AI-driven code exploration and transform repositories into interactive adventures.`;
    }
  }

  private async generateKeyConcepts(): Promise<string> {
    try {
      // Load adventure configuration to understand project structure
      const config = parseAdventureConfig(this.projectPath);
      
      if (!config || typeof config !== 'object' || !('adventure' in config)) {
        // Fallback to hardcoded concepts if no config available
        return this.generateFallbackKeyConcepts();
      }

      const adventure = (config as any).adventure;
      if (!adventure || !adventure.quests) {
        return this.generateFallbackKeyConcepts();
      }

      // Extract quest titles and descriptions for analysis
      const questInfo = adventure.quests.map((quest: any) => ({
        title: quest.title,
        description: quest.description,
        files: quest.files?.map((file: any) => ({
          path: file.path,
          description: file.description
        })) || []
      }));

      const projectName = adventure.name || 'Project';
      const projectDescription = adventure.description || '';

      // Create prompt for LLM to generate key concepts
      const prompt = `Based on the following project information, generate 4-5 key architectural or technical concepts that users would learn from exploring this codebase. Focus on the most important technical aspects and patterns.

Project: ${projectName}
Description: ${projectDescription}

Quest Information:
${questInfo.map((quest: any) => 
  `- ${quest.title}: ${quest.description}\n  Files: ${quest.files.map((f: any) => `${f.path} (${f.description})`).join(', ')}`
).join('\n')}

Format your response as a JSON object with a "concepts" array:
{
  "concepts": [
    {"name": "Concept Name", "description": "Brief description of what was learned"},
    {"name": "Another Concept", "description": "Another brief description"}
  ]
}

Focus on architectural patterns, technical systems, frameworks, and development practices actually present in the codebase.`;

      // Generate concepts using LLM
      const llmClient = new LLMClient();
      const llmResponse = await llmClient.generateResponse(prompt, { responseFormat: 'json_object' });
      const parsed = JSON.parse(llmResponse.content);
      const concepts = parsed.concepts;

      if (Array.isArray(concepts) && concepts.length > 0) {
        return `<ul>\n${concepts.map((concept: any) => 
          `<li><strong>${concept.name}</strong>: ${concept.description}</li>`
        ).join('\n')}\n</ul>`;
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  LLM concept generation failed, using fallback concepts'));
      console.log(chalk.dim(`Error: ${error}`));
    }
    
    // Fallback to original hardcoded concepts
    return this.generateFallbackKeyConcepts();
  }

  private generateFallbackKeyConcepts(): string {
    const concepts = [
      '<strong>MCP Server Architecture</strong>: Dynamic tool registration, schema validation, and request handling patterns',
      '<strong>Tool Orchestration</strong>: How individual tools are dynamically loaded, validated, and executed safely',
      '<strong>Error Handling & Reliability</strong>: Graceful shutdown procedures, signal handling, and promise rejection management',
      '<strong>Performance Optimization</strong>: Content pre-generation and caching strategies for responsive user experiences'
    ];
    
    if (this.quests.length > 1) {
      concepts.push('<strong>Adventure Generation</strong>: Story creation, theme management, and quest progression systems');
    }
    
    return `<ul>\n${concepts.map(concept => `<li>${concept}</li>`).join('\n')}\n</ul>`;
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
   * Converts file paths and function names in HTML content to GitHub URLs
   * Handles file paths within code tags and plain text
   * Detects function names and links to specific line numbers in GitHub
   */
  private addFileHyperlinksToHTML(htmlContent: string): string {
    if (!this.repoUrl) return htmlContent;

    // Robust pattern that detects any path-like structure with file extensions
    // Matches: dir/file.ext, packages/name/src/file.ext, ./relative/path/file.ext, etc.
    // Requires at least one directory separator and a supported file extension
    const filePathPattern = /\.?\/?(?:[\w-]+\/)+[\w.-]+\.(ts|js|tsx|jsx|css|json|md|py|java|go|rs|cpp|c|h|hpp|php|rb|swift|kt|scala|clj|hs|ml|fs|ex|exs|elm|dart|lua|r|m|pl|sh|bat|ps1|yaml|yml|toml|ini|cfg|conf|properties)/;

    const createGitHubLink = (filePath: string, lineNumber?: number): string => {
      const normalizedPath = filePath.replace(/^\.?\//, ''); // Remove leading ./ or /
      const baseUrl = `${this.repoUrl}/blob/main/${normalizedPath}`;
      return lineNumber ? `${baseUrl}#L${lineNumber}` : baseUrl;
    };

    // Build function-to-line mapping for enhanced linking
    const functionLineMap = this.buildFunctionLineMap();


    // Convert function names and file paths in inline code to hyperlinks
    htmlContent = htmlContent.replace(
      /<code class="inline-code">([^<]*)<\/code>/g,
      (match, codeContent) => {

        // Check if it's a file path first
        const fileMatch = codeContent.match(filePathPattern);
        if (fileMatch) {
          const filePath = fileMatch[0];
          const githubUrl = createGitHubLink(filePath);
          const normalizedPath = filePath.replace(/^\.?\//, '');
          return `<a href="${githubUrl}" target="_blank" rel="noopener noreferrer"><code class="inline-code">${normalizedPath}</code></a>`;
        }

        // Check if it's a function name (simple pattern: word characters, dots, optional parentheses)
        const functionMatch = codeContent.match(/^[\w.-]+(?:\(\))?$/);
        if (functionMatch) {

          // First try to find exact match (including qualified names like Class.method)
          if (functionLineMap.has(codeContent)) {
            const { filePath, lineNumber } = functionLineMap.get(codeContent)!;
            const githubUrl = createGitHubLink(filePath, lineNumber);
            return `<a href="${githubUrl}" target="_blank" rel="noopener noreferrer"><code class="inline-code">${codeContent}</code></a>`;
          }

          // If no exact match, try without parentheses
          const cleanName = codeContent.replace(/\(\)$/, '');
          if (functionLineMap.has(cleanName)) {
            const { filePath, lineNumber } = functionLineMap.get(cleanName)!;
            const githubUrl = createGitHubLink(filePath, lineNumber);
            return `<a href="${githubUrl}" target="_blank" rel="noopener noreferrer"><code class="inline-code">${codeContent}</code></a>`;
          }

          // If still no match, try to find a qualified version (Class.method)
          // Look for any entry that ends with .cleanName
          for (const [qualifiedName, info] of functionLineMap.entries()) {
            if (qualifiedName.includes('.') && qualifiedName.endsWith(`.${cleanName}`)) {
              const { filePath, lineNumber } = info;
              const githubUrl = createGitHubLink(filePath, lineNumber);
              return `<a href="${githubUrl}" target="_blank" rel="noopener noreferrer"><code class="inline-code">${codeContent}</code></a>`;
            }
          }

        }

        return match;
      }
    );

    // Convert file paths in headings (h3-h6) to hyperlinks
    htmlContent = htmlContent.replace(
      /<(h[3-6][^>]*)>([^<]*)<\/(h[3-6])>/g,
      (match, openTag, headingContent, closeTag) => {
        const fileMatch = headingContent.match(filePathPattern);
        if (fileMatch) {
          const filePath = fileMatch[0];
          const githubUrl = createGitHubLink(filePath);
          const linkedContent = headingContent.replace(filePath, `<a href="${githubUrl}" target="_blank" rel="noopener noreferrer">${filePath}</a>`);
          return `<${openTag}>${linkedContent}</${closeTag}>`;
        }
        return match;
      }
    );

    // Convert file paths in header-prefix spans to hyperlinks
    htmlContent = htmlContent.replace(
      /<span class="header-prefix">([^<]*)<\/span>/g,
      (match, spanContent) => {
        const fileMatch = spanContent.match(filePathPattern);
        if (fileMatch) {
          const filePath = fileMatch[0];
          const githubUrl = createGitHubLink(filePath);
          const linkedContent = spanContent.replace(filePath, `<a href="${githubUrl}" target="_blank" rel="noopener noreferrer">${filePath}</a>`);
          return `<span class="header-prefix">${linkedContent}</span>`;
        }
        return match;
      }
    );

    return htmlContent;
  }

  /**
   * Builds a map of function names to their file paths and line numbers
   * Scans source files to find function definitions
   */
  private buildFunctionLineMap(): Map<string, { filePath: string; lineNumber: number }> {
    const functionMap = new Map<string, { filePath: string; lineNumber: number }>();

    try {
      // Get adventure config to know which files to scan
      const parsed = parseAdventureConfig(this.projectPath);
      if (!parsed || typeof parsed !== 'object') {
        return functionMap;
      }

      const config = parsed as any;
      if (!config?.adventure?.quests) {
        return functionMap;
      }

      // First, collect all highlights from adventure config to prioritize specific functions
      const highlights = new Map<string, { filePath: string; functionName: string }>();
      for (const quest of config.adventure.quests) {
        for (const fileConfig of quest.files || []) {
          if (fileConfig.highlights) {
            for (const highlight of fileConfig.highlights) {
              const parts = highlight.name.split('.');
              if (parts.length === 2) {
                // Qualified name like "ClassName.methodName"
                highlights.set(highlight.name, { filePath: fileConfig.path, functionName: parts[1] });
              } else {
                // Simple name
                highlights.set(highlight.name, { filePath: fileConfig.path, functionName: highlight.name });
              }
            }
          }
        }
      }

      // Scan all files mentioned in adventure config
      for (const quest of config.adventure.quests) {
        for (const fileConfig of quest.files || []) {
          const filePath = fileConfig.path;
          const fullPath = path.join(this.projectPath, filePath);

          if (fs.existsSync(fullPath)) {
            this.scanFileForFunctions(fullPath, filePath, functionMap, highlights);
          }
        }
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️ Warning: Could not build function line map'));
    }

    return functionMap;
  }

  /**
   * Scans a single file for function definitions and adds them to the map
   */
  private scanFileForFunctions(
    fullPath: string,
    relativePath: string,
    functionMap: Map<string, { filePath: string; lineNumber: number }>,
    highlights?: Map<string, { filePath: string; functionName: string }>
  ): void {
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const contextStack: Array<'class' | 'block'> = [];
      const classStack: string[] = [];
      let pendingClassName: string | null = null;
      let inBlockComment = false;
      let inString: string | null = null;

      for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const line = rawLine.trim();
        const lineNumber = i + 1;
        const classDeclarationMatch = line.match(/^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+(\w+)/);

        if (classDeclarationMatch) {
          pendingClassName = classDeclarationMatch[1];
        }

        const currentClassName = classStack[classStack.length - 1];

        // TypeScript/JavaScript function patterns - more precise to match only definitions
        const patterns = [
          // Method definitions with visibility modifiers: private/public methodName(
          /^\s*(?:private|public|protected|static)?\s*(\w+)\s*\([^)]*\)\s*:\s*[^{]+\s*\{/,
          // Method definitions with visibility modifiers and async: private async methodName(
          /^\s*(?:private|public|protected|static)?\s*async\s+(\w+)\s*\([^)]*\)\s*:\s*[^{]+\s*\{/,
          // Function declarations, allowing optional export/default/async prefixes
          /^\s*(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+(\w+)\s*\(/,
          // Arrow functions assigned to const/let/var with optional export/default prefix
          /^\s*(?:export\s+(?:default\s+)?)?(?:const|let|var)\s+(\w+)\s*=\s*.*=>/,
          // Class methods without visibility: methodName( followed by : or {
          /^\s*(\w+)\s*\([^)]*\)\s*[:{]/,
          // Async methods (including exported async arrow functions are covered above)
          /^\s*async\s+(\w+)\s*\(/
        ];

        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            const functionName = match[1];

            // Skip common non-function words
            const skipWords = ['if', 'for', 'while', 'switch', 'catch', 'return', 'const', 'let', 'var'];
            if (skipWords.includes(functionName)) {
              continue;
            }

            // Store function with priority: highlights take precedence

            if (currentClassName) {
              const qualifiedName = `${currentClassName}.${functionName}`;

              // Check if this function is highlighted in adventure config
              const isHighlighted = highlights && (
                highlights.has(qualifiedName) ||
                (highlights.has(functionName) && highlights.get(functionName)?.filePath === relativePath)
              );

              // Always store qualified name (class.method)
              functionMap.set(qualifiedName, { filePath: relativePath, lineNumber });

              // Store simple name with priority for highlighted functions
              if (isHighlighted || !functionMap.has(functionName)) {
                functionMap.set(functionName, { filePath: relativePath, lineNumber });
              }
            } else {
              // No class context
              const isHighlighted = highlights &&
                highlights.has(functionName) &&
                highlights.get(functionName)?.filePath === relativePath;

              // Store simple name with priority for highlighted functions
              if (isHighlighted || !functionMap.has(functionName)) {
                functionMap.set(functionName, { filePath: relativePath, lineNumber });
              }
            }
          }
        }

        for (let index = 0; index < rawLine.length; index++) {
          const char = rawLine[index];
          const nextChar = rawLine[index + 1];

          if (inBlockComment) {
            if (char === '*' && nextChar === '/') {
              inBlockComment = false;
              index++; // Skip closing '/'
            }
            continue;
          }

          if (inString) {
            if (char === '\\' && nextChar !== undefined) {
              index++; // Skip escaped character
              continue;
            }

            if (char === inString) {
              inString = null;
            }
            continue;
          }

          if (char === '/' && nextChar === '*') {
            inBlockComment = true;
            index++;
            continue;
          }

          if (char === '/' && nextChar === '/') {
            break;
          }

          if (char === '"' || char === '\'' || char === '`') {
            inString = char;
            continue;
          }

          if (char === '{') {
            if (pendingClassName) {
              contextStack.push('class');
              classStack.push(pendingClassName);
              pendingClassName = null;
            } else {
              contextStack.push('block');
            }
          } else if (char === '}') {
            const context = contextStack.pop();
            if (context === 'class') {
              classStack.pop();
            }
          }
        }

        if (pendingClassName && line.endsWith(';')) {
          pendingClassName = null;
        }
      }
    } catch (error) {
      // Silently skip files that can't be read
    }
  }

  private async generateAllThemes(args: Map<string, string>): Promise<void> {
    console.log(chalk.green('✅ Generating all themes'));
    this.isMultiTheme = true;

    // Check for sequential flag
    if (args.has('sequential')) {
      this.forceSequential = true;
      this.processingMode = 'sequential';
      console.log(chalk.cyan('📋 Processing mode: Sequential (--sequential flag)'));
    } else {
      console.log(chalk.cyan('📋 Processing mode: Parallel (default)'));
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
      const customDir = args.get('log-llm-output-dir');
      if (customDir) {
        this.logLlmOutputDir = customDir;
      }
      console.log(chalk.green(`✅ LLM output logging: enabled (${this.logLlmOutputDir})`));
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

    // Copy shared assets to avoid duplication across themes
    const assetManager = await this.getAssetManager();
    assetManager.copySharedNavigator(this.outputDir);
    assetManager.copyGlobalAssets(this.outputDir);

    // Copy all images once to the root assets directory using AssetManager
    console.log(chalk.green(`✅ Copying images to shared assets directory`));
    assetManager.copyImages(this.outputDir, true);

    // Generate each theme in its own subdirectory
    const themes: AdventureTheme[] = ['space', 'mythical', 'ancient', 'developer'];

    // Generate initial homepage early for --theme all to ensure it exists even if process is interrupted
    console.log(chalk.yellow('🏠 Creating initial homepage (will be updated after theme generation)...'));
    try {
      this.generateHomepageIndex();
      console.log(chalk.green('✅ Initial homepage index.html created'));
    } catch (homepageError) {
      console.log(chalk.yellow(`⚠️  Could not create initial homepage: ${homepageError}`));
    }

    // Process themes based on current mode
    try {
      if (this.processingMode === 'sequential') {
        await this.generateThemesSequentially(themes);
      } else {
        await this.generateThemesInParallel(themes);
      }
    } catch (error) {
      // Check if this is any rate limit error that needs recovery
      if (error instanceof RateLimitError &&
          (error.type === RateLimitType.TOKEN_RATE_EXCEEDED || error.type === RateLimitType.REQUEST_RATE_LIMIT)) {
        await this.handleTokenRateLimitAndRetry(themes, error);
      } else {
        // Log the error but continue to generate homepage
        console.log(chalk.yellow(`⚠️  Theme generation encountered errors: ${error}`));
        console.log(chalk.yellow('🏠 Continuing with homepage generation...'));
      }
    } finally {
      // Always generate homepage index.html when using --theme all
      // This ensures navigation is available even if some themes fail
      console.log(chalk.yellow('\n🏠 Generating homepage...'));
      try {
        this.generateHomepageIndex();
        console.log(chalk.green('✅ Homepage index.html created successfully'));
      } catch (homepageError) {
        console.log(chalk.red(`❌ Failed to generate homepage: ${homepageError}`));
      }

      // Global assets are already copied in generateAllThemes for multi-theme mode
      // Single-theme mode needs to copy global assets
      if (!this.isMultiTheme) {
        try {
          const assetManager = await this.getAssetManager();
          assetManager.copyGlobalAssets(this.outputDir);
        } catch (assetError) {
          console.log(chalk.yellow(`⚠️  Failed to copy some assets: ${assetError}`));
        }
      }
    }

    console.log();
    console.log(chalk.green.bold('🎉 All themes generated successfully!'));
    console.log(chalk.cyan(`📁 Location: ${this.outputDir}`));

    if (this.serve) {
      await this.startHttpServer();
    } else {
      console.log(chalk.cyan(`🌐 Open: ${path.join(this.outputDir, 'index.html')}`));
    }
  }

  private async generateThemesInParallel(themes: AdventureTheme[]): Promise<void> {
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
      // Images are now shared at root level, no need for theme-specific images directory
      
      // Create a new generator instance for this theme to avoid state conflicts
      const themeGenerator = new HTMLAdventureGenerator();
      
      try {
        themeGenerator['selectedTheme'] = theme;
        themeGenerator['outputDir'] = themeDir;
        themeGenerator['maxQuests'] = this.maxQuests;
        themeGenerator['logLlmOutput'] = this.logLlmOutput;
        themeGenerator['logLlmOutputDir'] = this.logLlmOutputDir;
        themeGenerator['isMultiTheme'] = this.isMultiTheme;

        // Track which theme is being processed
        this.currentProcessingTheme = theme;

        await themeGenerator.generateAdventure();

        // Mark theme as completed
        this.completedThemes.add(theme);
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        progress.completed++;
        console.log(chalk.green(`✅ [${progress.completed}/${progress.total}] ${theme} theme completed in ${duration}s`));
        
        return { theme, success: true };
      } catch (error) {
        // Check if this is any rate limit error OR a quest failure - if so, propagate it up
        if (error instanceof RateLimitError &&
            (error.type === RateLimitType.TOKEN_RATE_EXCEEDED || error.type === RateLimitType.REQUEST_RATE_LIMIT)) {
          throw error; // This will trigger sequential mode
        }

        // Check if this is a quest failure (fail-fast strategy)
        if (error instanceof Error && error.message.includes('Quest generation failed')) {
          console.log(chalk.yellow(`\n⚠️  Quest failure detected in ${theme} theme`));
          throw new RateLimitError(
            RateLimitType.REQUEST_RATE_LIMIT,
            60,
            'Quest generation failed - switching to sequential mode for consistency',
            error
          ); // Reuse rate limit error to trigger sequential mode
        }

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

    // CRITICAL: Check if any theme hit a rate limit and re-throw to trigger sequential fallback
    const rateLimitRejection = results.find(
      result =>
        result.status === 'rejected' &&
        result.reason instanceof RateLimitError &&
        (result.reason.type === RateLimitType.TOKEN_RATE_EXCEEDED ||
          result.reason.type === RateLimitType.REQUEST_RATE_LIMIT)
    );

    if (rateLimitRejection && rateLimitRejection.status === 'rejected') {
      // Re-throw the rate limit error so it can be caught by generateAllThemes
      // and trigger the automatic sequential retry mechanism
      throw rateLimitRejection.reason;
    }
  }

  /**
   * Handle rate limit errors by waiting and switching to sequential mode
   */
  private async handleTokenRateLimitAndRetry(
    themes: AdventureTheme[],
    error: RateLimitError
  ): Promise<void> {
    // User messaging: Explain what happened
    console.log();

    // Check if this is actually a quest failure (fail-fast strategy)
    if (error.message.includes('Quest generation failed')) {
      console.log(chalk.yellow('⚠️  Quest generation failed during parallel processing'));
      console.log(chalk.yellow('📋 To ensure consistency across all themes, switching to sequential mode...'));
    } else if (error.type === RateLimitType.TOKEN_RATE_EXCEEDED) {
      console.log(chalk.yellow('⚠️  Token rate limit exceeded (200K tokens/60s window for Azure S0 tier)'));
    } else {
      console.log(chalk.yellow('⚠️  Request rate limit exceeded (Azure S0 tier limitations)'));
    }
    console.log(chalk.dim(`    Error details: ${error.originalMessage}`));

    // Identify remaining themes (those not completed)
    const remainingThemes = themes.filter(theme => !this.completedThemes.has(theme));

    if (remainingThemes.length === 0) {
      console.log(chalk.green('✅ All themes were completed before the rate limit was hit'));
      return;
    }

    // Show progress so far
    console.log();
    console.log(chalk.blue('📊 Progress Status:'));
    console.log(chalk.green(`  ✅ Completed: ${this.completedThemes.size} themes`));
    this.completedThemes.forEach(theme => {
      console.log(chalk.dim(`    ✓ ${theme}`));
    });
    console.log(chalk.yellow(`  ⏳ Remaining: ${remainingThemes.length} themes`));
    remainingThemes.forEach(theme => {
      console.log(chalk.dim(`    • ${theme}`));
    });

    // Wait for the rate limit window to reset
    const waitSeconds = (error instanceof RateLimitError) ? error.waitSeconds : 60;
    console.log();
    console.log(chalk.cyan(`⏳ Waiting ${waitSeconds} seconds for rate limit window to reset...`));

    // Show countdown
    for (let i = waitSeconds; i > 0; i--) {
      process.stdout.write(`\r${chalk.cyan(`⏳ Time remaining: ${i} seconds  `)}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear the line

    // Switch to sequential processing mode
    console.log(chalk.blue('🔄 Switching to sequential processing mode to avoid further rate limits'));
    console.log(chalk.dim('   Processing will continue more slowly but reliably'));

    this.processingMode = 'sequential';
    this.tokenRateLimitEncountered = true;

    // Process remaining themes sequentially
    console.log();
    console.log(chalk.green(`✅ Continuing with remaining ${remainingThemes.length} themes...`));
    await this.generateThemesSequentially(remainingThemes);

    // Show helpful tip for future runs
    console.log();
    console.log(chalk.cyan('💡 Tip: Use --sequential flag next time for large theme sets with Azure S0'));
    console.log(chalk.dim('   Example: repo-adventure --theme all --sequential --output ./public'));
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

    // Define theme data
    const themes = [
      {
        dir: 'space',
        image: 'space.png',
        title: 'Space Explorer',
        altText: 'Space Explorer Preview',
        description: 'Embark on cosmic adventures through code galaxies and starship protocols.'
      },
      {
        dir: 'mythical',
        image: 'mythical.png',
        title: 'Enchanted Kingdom',
        altText: 'Enchanted Kingdom Preview',
        description: 'Journey through ancient codebases in a realm of parchment and magic.'
      },
      {
        dir: 'ancient',
        image: 'ancient.png',
        title: 'Ancient Explorer',
        altText: 'Ancient Explorer Preview',
        description: 'Discover sacred coding wisdom in mystical temples and ancient halls.'
      },
      {
        dir: 'developer',
        image: 'developer.png',
        title: 'Developer',
        altText: 'Developer Preview',
        description: 'Navigate modern development workflows with professional precision.'
      }
    ];

    // Generate theme cards using template
    const themeCards = themes.map(theme => {
      const themeCardVariables = {
        THEME_DIR: theme.dir,
        THEME_IMAGE: theme.image,
        THEME_TITLE: theme.title,
        THEME_ALT_TEXT: theme.altText,
        THEME_DESCRIPTION: theme.description
      };
      return this.templateEngine.renderTemplate('theme-card.html', themeCardVariables);
    }).join('\n');

    // Generate homepage using template
    const variables = {
      REPO_NAME: repoName,
      REPO_URL: repoUrl,
      THEME_CARDS: themeCards
    };

    const html = this.templateEngine.renderTemplate('homepage-template.html', variables);
    const indexPath = path.join(this.outputDir, 'index.html');
    fs.writeFileSync(indexPath, html);
    console.log(chalk.green('✅ Homepage index.html created'));
  }


  private prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(chalk.bold(question), resolve);
    });
  }

  /**
   * Check if an error is a rate limit error that should trigger sequential retry
   * Recognizes RateLimitError instances from the LLM client
   */
  private isTokenRateLimitError(error: any): boolean {
    if (!error) return false;

    // Check for RateLimitError instances from LLM client
    if (error instanceof RateLimitError) {
      // Handle both TOKEN_RATE_EXCEEDED and REQUEST_RATE_LIMIT
      return error.type === RateLimitType.TOKEN_RATE_EXCEEDED ||
             error.type === RateLimitType.REQUEST_RATE_LIMIT;
    }

    // Not a recognized rate limit error
    return false;
  }

  /**
   * Generate themes sequentially to avoid rate limits
   */
  private async generateThemesSequentially(themes: AdventureTheme[]): Promise<void> {
    console.log(chalk.blue(`\n🎯 Starting sequential generation of ${themes.length} themes...`));
    console.log(chalk.dim('Themes will be generated one at a time to avoid rate limits'));

    const results: { theme: string; success: boolean; error?: any }[] = [];

    for (let i = 0; i < themes.length; i++) {
      const theme = themes[i];
      let retryCount = 0;
      const maxRetries = 3; // Prevent infinite retry loops
      let themeCompleted = false;

      while (!themeCompleted && retryCount < maxRetries) {
        const startTime = Date.now();
        const attemptNumber = retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : '';
        console.log(chalk.yellow(`\n📝 [${i + 1}/${themes.length}] Generating ${theme} theme${attemptNumber}...`));

        // Create theme-specific directory
        const themeDir = path.join(this.outputDir, theme);
        fs.mkdirSync(themeDir, { recursive: true });
        fs.mkdirSync(path.join(themeDir, 'assets'), { recursive: true });

        // Create a new generator instance for this theme
        const themeGenerator = new HTMLAdventureGenerator();

        try {
          themeGenerator['selectedTheme'] = theme;
          themeGenerator['outputDir'] = themeDir;
          themeGenerator['maxQuests'] = this.maxQuests;
          themeGenerator['logLlmOutput'] = this.logLlmOutput;
          themeGenerator['logLlmOutputDir'] = this.logLlmOutputDir;
          themeGenerator['isMultiTheme'] = this.isMultiTheme;

          await themeGenerator.generateAdventure();

          // Mark theme as completed
          this.completedThemes.add(theme);
          themeCompleted = true;

          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(chalk.green(`✅ ${theme} theme completed in ${duration}s`));
          results.push({ theme, success: true });
        } catch (error) {
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);

          // Check for token rate limit error
          if (this.isTokenRateLimitError(error)) {
            console.log(chalk.yellow(`⚠️ ${theme} theme hit token rate limit after ${duration}s`));

            // Extract wait time from RateLimitError or use default
            const waitSeconds = (error instanceof RateLimitError) ? error.waitSeconds : 60;
            console.log(chalk.cyan(`⏳ Waiting ${waitSeconds} seconds for rate limit window to reset...`));

            // Show countdown
            for (let j = waitSeconds; j > 0; j--) {
              process.stdout.write(`\r${chalk.cyan(`⏳ Time remaining: ${j} seconds  `)}`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear the line

            console.log(chalk.green(`✅ Rate limit window reset. Retrying ${theme} theme...`));
            retryCount++;
            // Continue to retry the same theme
          } else {
            // Non-rate-limit error, don't retry
            console.log(chalk.red(`❌ ${theme} theme failed after ${duration}s:`, error instanceof Error ? error.message : error));
            results.push({ theme, success: false, error });
            break; // Exit retry loop for non-rate-limit errors
          }
        } finally {
          // Clean up
          try {
            themeGenerator['rl'].close();
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
        }
      }

      // If we exhausted retries, mark as failed
      if (!themeCompleted && retryCount >= maxRetries) {
        console.log(chalk.red(`❌ ${theme} theme failed after ${maxRetries} retries due to rate limits`));
        results.push({ theme, success: false, error: 'Exceeded maximum retries due to rate limits' });
      }
    }

    // Show summary
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    console.log(chalk.blue('\n📊 Generation Summary:'));
    console.log(chalk.green(`  ✅ Successful: ${successful}/${themes.length}`));
    if (failed > 0) {
      console.log(chalk.red(`  ❌ Failed: ${failed}/${themes.length}`));
    }

    results.forEach(result => {
      if (result.success) {
        console.log(chalk.dim(`    ✓ ${result.theme}`));
      } else {
        console.log(chalk.dim(`    ✗ ${result.theme} - generation failed`));
      }
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
      if (arg.includes('=')) {
        // Handle --key=value format
        const [key, ...valueParts] = arg.substring(2).split('=');
        const value = valueParts.join('='); // In case value contains =
        argMap.set(key, value);
      } else {
        // Handle --key value format
        const key = arg.substring(2);
        const nextArg = args[i + 1];
        const value = nextArg && !nextArg.startsWith('--') ? nextArg : 'true';
        argMap.set(key, value);
        if (value !== 'true') i++; // Skip next arg if it was used as value
      }
    }
  }
  
  // Check for help flag
  if (argMap.has('help') || argMap.has('h')) {
    console.log(`
${chalk.bgBlue.white.bold(' AI Repo Adventures HTML Generator ')}
Generate a complete HTML adventure website from your codebase!

Usage:
  npm run generate-html [options]

Options:
  --theme <theme>        Theme: space, mythical, ancient, developer, custom, or all
  --output <dir>         Output directory (default: ./public)
  --overwrite           Overwrite existing files without prompting
  --sequential          Process themes sequentially to avoid rate limits (for --theme all)
  --max-quests <num>    Limit number of quests to generate (default: all)
  --log-llm-output      Save raw LLM output for debugging
  --log-llm-output-dir <dir>  Directory for LLM output logs (default: .ai-repo-adventures/llm-output)
  --serve               Start HTTP server and open browser after generation
  --help, -h            Show this help message

Examples:
  npm run generate-html --theme space --output ./docs --overwrite
  npm run generate-html --theme mythical
  npm run generate-html --theme all --output public --overwrite
  npm run generate-html --theme all --sequential --output public  # Avoid rate limits
  npm run generate-html (interactive mode - includes "Generate All Themes" option)
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
