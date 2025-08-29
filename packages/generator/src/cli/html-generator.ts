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
import { getAllThemes, getThemeByKey, AdventureTheme, parseAdventureConfig, LLM_MODEL } from '@ai-repo-adventures/core/shared';
import { LLMClient } from '@ai-repo-adventures/core/llm';
import { createProjectInfo } from '@ai-repo-adventures/core';
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
  private serve: boolean = false;
  private isMultiTheme: boolean = false;

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
    console.log(chalk.bgBlue.white.bold(' 🌟 AI Repo Adventures HTML Generator 🌟 '));
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
      console.log(chalk.green('✅ LLM output logging: enabled'));
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
      this.copyQuestNavigator();
    }

    console.log(chalk.dim('🖼️ Copying images...'));
    this.copyImages();

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

  private copyImages(): void {
    // Skip copying images in multi-theme mode for individual themes
    // Images are copied once at the root level
    if (this.isMultiTheme) {
      return;
    }

    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const sourceImagesDir = path.join(__dirname, 'assets', 'images');
    const sourceSharedDir = path.join(__dirname, 'assets', 'shared');
    const targetImagesDir = path.join(this.outputDir, 'assets', 'images');
    const targetSharedDir = path.join(this.outputDir, 'assets', 'shared');

    try {
      // Copy theme-specific images
      if (fs.existsSync(sourceImagesDir)) {
        fs.mkdirSync(targetImagesDir, { recursive: true });
        const imageFiles = fs.readdirSync(sourceImagesDir);
        imageFiles.forEach(file => {
          const sourcePath = path.join(sourceImagesDir, file);
          const targetPath = path.join(targetImagesDir, file);
          fs.copyFileSync(sourcePath, targetPath);
        });
      }

      // Copy shared images 
      if (fs.existsSync(sourceSharedDir)) {
        fs.mkdirSync(targetSharedDir, { recursive: true });
        const sharedFiles = fs.readdirSync(sourceSharedDir);
        sharedFiles.forEach(file => {
          const sourcePath = path.join(sourceSharedDir, file);
          const targetPath = path.join(targetSharedDir, file);
          fs.copyFileSync(sourcePath, targetPath);
        });
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️ Warning: Could not copy images from source directory'));
    }
  }

  private copyQuestNavigator(): void {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const assetManager = new AssetManager(__dirname);
    assetManager.copyQuestNavigator(this.outputDir);
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
    // Fix grammar for quest count
    const questText = questCount === 1 ? 'quest' : 'quests';
    const questCountText = questCount === 1 ? 'one challenging quest' : `${questCount} challenging quests`;
    
    if (this.selectedTheme === 'developer') {
      return `Through ${questCountText}, you've analyzed the MCP (Model Context Protocol) architecture and learned how this repository powers AI-driven code exploration. You've examined server implementation, tool orchestration, and request handling patterns that enable dynamic storytelling from codebases.`;
    } else {
      return `Through ${questCountText}, you've journeyed through ${themeData.context} to uncover the secrets of the MCP architecture. Your ${themeData.journey} revealed the intricate systems that power AI-driven code exploration and transform repositories into interactive adventures.`;
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
    this.isMultiTheme = true;
    
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

    // Copy shared assets to avoid duplication across themes
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const assetManager = new (await import('./asset-manager.js')).AssetManager(__dirname);
    assetManager.copySharedNavigator(this.outputDir);
    assetManager.copyGlobalAssets(this.outputDir);
    
    // Copy all images once to the root assets directory
    const sourceImagesDir = path.join(__dirname, 'assets', 'images');
    const targetImagesDir = path.join(this.outputDir, 'assets', 'images');
    
    if (fs.existsSync(sourceImagesDir)) {
      fs.mkdirSync(targetImagesDir, { recursive: true });
      const imageFiles = fs.readdirSync(sourceImagesDir);
      console.log(chalk.green(`✅ Copying ${imageFiles.length} images to shared assets directory`));
      imageFiles.forEach(file => {
        const sourcePath = path.join(sourceImagesDir, file);
        const targetPath = path.join(targetImagesDir, file);
        fs.copyFileSync(sourcePath, targetPath);
      });
    }

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
      // Images are now shared at root level, no need for theme-specific images directory
      
      // Create a new generator instance for this theme to avoid state conflicts
      const themeGenerator = new HTMLAdventureGenerator();
      
      try {
        themeGenerator['selectedTheme'] = theme;
        themeGenerator['outputDir'] = themeDir;
        themeGenerator['maxQuests'] = this.maxQuests;
        themeGenerator['logLlmOutput'] = this.logLlmOutput;
        themeGenerator['isMultiTheme'] = this.isMultiTheme;
        
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

  private copyGlobalAssets(): void {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    
    // Copy the homepage theme CSS from the themes directory
    const homepageCSSSource = path.join(__dirname, 'themes', 'homepage.css');
    const homepageCSSContent = fs.readFileSync(homepageCSSSource, 'utf-8');

    const cssPath = path.join(this.outputDir, 'assets', 'theme.css');
    fs.writeFileSync(cssPath, homepageCSSContent);
    
    // Copy global images (ai-adventures.png and github icons)
    const sourceImagesDir = path.join(__dirname, 'assets', 'images');
    const targetImagesDir = path.join(this.outputDir, 'assets', 'images');

    try {
      if (fs.existsSync(sourceImagesDir)) {
        // Ensure target directory exists
        fs.mkdirSync(targetImagesDir, { recursive: true });
        
        // Copy global shared images to shared directory  
        const globalSharedDir = path.join(this.outputDir, 'assets', 'shared');
        fs.mkdirSync(globalSharedDir, { recursive: true });
        
        const globalImages = ['github-mark.svg', 'github-mark-white.svg'];
        globalImages.forEach(file => {
          const sourcePath = path.join(__dirname, 'assets', 'shared', file);
          if (fs.existsSync(sourcePath)) {
            const targetPath = path.join(globalSharedDir, file);
            fs.copyFileSync(sourcePath, targetPath);
          }
        });

        // Copy header image for theme selection page
        const headerImageSource = path.join(__dirname, 'assets', 'images', 'ai-adventures.png');
        if (fs.existsSync(headerImageSource)) {
          const headerImageTarget = path.join(targetImagesDir, 'ai-adventures.png');
          fs.copyFileSync(headerImageSource, headerImageTarget);
        }
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
${chalk.bgBlue.white.bold(' AI Repo Adventures HTML Generator ')}
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
  npm run generate-html --theme all --output public --overwrite
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