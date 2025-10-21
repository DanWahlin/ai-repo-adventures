#!/usr/bin/env node

/**
 * Standalone CLI tool for generating HTML adventure files
 * Refactored for simplicity and maintainability
 */

import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { marked } from 'marked';
import { repoAnalyzer } from '@codewithdan/ai-repo-adventures-core/analyzer';
import { AdventureManager } from '@codewithdan/ai-repo-adventures-core/adventure';
import { getAllThemes, getThemeByKey, AdventureTheme, parseAdventureConfig, LLM_MODEL } from '@codewithdan/ai-repo-adventures-core/shared';
import { RateLimitType, RateLimitError } from '@codewithdan/ai-repo-adventures-core/llm';
import { createProjectInfo } from '@codewithdan/ai-repo-adventures-core';
import { TemplateEngine } from './template-engine.js';
import { RETRY_CONFIG, SERVER_CONFIG, DEFAULT_PATHS, PARSING_CONFIG, THEME_ICONS, HOMEPAGE } from './constants.js';
import { ContentProcessor } from './processing/content-processor.js';
import { DevServer } from './server/dev-server.js';
import { CLIInterface, CustomThemeData } from './cli/cli-interface.js';
import { ConfigurationManager } from './cli/configuration-manager.js';
import { HTMLBuilder } from './generation/html-builder.js';
import { ContentGenerator } from './generation/content-generator.js';
import { ThemeOrchestrator } from './orchestration/theme-orchestrator.js';
import { FormatExporter, OutputFormat } from './formatters/format-exporter.js';

interface QuestInfo {
  id: string;
  title: string;
  filename: string;
}

class HTMLAdventureGenerator {
  private cliInterface: CLIInterface;
  private configManager: ConfigurationManager;
  private adventureManager: AdventureManager;
  private templateEngine: TemplateEngine;
  private contentProcessor!: ContentProcessor;
  private htmlBuilder!: HTMLBuilder;
  private contentGenerator!: ContentGenerator;
  private projectPath: string = process.cwd();
  private outputDir: string = '';
  private selectedTheme: AdventureTheme = 'space';
  private customThemeData?: CustomThemeData;
  private quests: QuestInfo[] = [];
  private repoUrl: string | null = null;
  private maxQuests?: number;
  private logLlmOutput: boolean = false;
  private logLlmOutputDir: string = DEFAULT_PATHS.LLM_LOG_DIR;
  private serve: boolean = false;
  private isMultiTheme: boolean = false;
  private format: OutputFormat = 'html';
  private questContentsMap: Map<string, string> = new Map();

  constructor() {
    this.cliInterface = new CLIInterface();
    this.configManager = new ConfigurationManager();
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
    this.cliInterface.printHeader();
    console.log(chalk.yellow('Generate a complete HTML adventure website from your codebase!'));
    console.log();

    try {
      const themeSelection = await this.cliInterface.selectTheme();
      this.selectedTheme = themeSelection.theme;
      this.customThemeData = themeSelection.customData;
      const shouldGenerateAllThemes = themeSelection.isAllThemes;

      this.outputDir = await this.cliInterface.selectOutputDirectory(this.format);

      if (shouldGenerateAllThemes) {

        if (this.format !== 'html') {
          console.error('Multi-theme generation is only supported for HTML format.');
          this.cliInterface.close();
          process.exit(1);
        }

        // Create theme orchestrator for multi-theme generation
        const themeOrchestrator = new ThemeOrchestrator(
          this.projectPath,
          this.outputDir,
          this.maxQuests,
          this.logLlmOutput,
          this.logLlmOutputDir,
          this.serve,
          'parallel' // Interactive mode uses parallel by default
        );

        // Generate all themes using orchestrator with isolated instances
        await themeOrchestrator.generateAllThemes(
          (theme, themeDir) => HTMLAdventureGenerator.generateSingleThemeStatic(
            theme,
            themeDir,
            this.maxQuests,
            this.logLlmOutput,
            this.logLlmOutputDir
          ),
          () => this.getAssetManager()
        );
      } else {
        // Generate single theme as usual
        await this.generateAdventure();

        this.cliInterface.printSuccessMessage(this.outputDir, this.serve, this.format);
      }

    } catch (error) {
      console.error(chalk.red('❌ Error generating adventure:'), error);
      this.cliInterface.close();
      process.exit(1);
    }

    this.cliInterface.close();
    process.exit(0);
  }

  async startWithArgs(args: Map<string, string>): Promise<void> {
    this.cliInterface.printHeader();

    try {
      // Handle theme configuration
      const themeConfig = this.configManager.configureTheme(args);
      if (themeConfig.isAllThemes) {
        // Configure shared options
        this.outputDir = this.configManager.configureOutputDirectory(args);
        const options = this.configManager.configureOptions(args);

        // Apply options
        this.maxQuests = options.maxQuests;
        this.logLlmOutput = options.logLlmOutput;
        this.logLlmOutputDir = options.logLlmOutputDir;
        this.serve = options.serve;

        // Setup directories
        this.configManager.setupOutputDirectories(this.outputDir, options.overwrite, this.format);

        // Determine processing mode
        const processingMode = args.has('sequential') ? 'sequential' : 'parallel';

        // Create theme orchestrator
        const themeOrchestrator = new ThemeOrchestrator(
          this.projectPath,
          this.outputDir,
          this.maxQuests,
          this.logLlmOutput,
          this.logLlmOutputDir,
          this.serve,
          processingMode
        );

        // Generate all themes using orchestrator with isolated instances
        await themeOrchestrator.generateAllThemes(
          (theme, themeDir) => HTMLAdventureGenerator.generateSingleThemeStatic(
            theme,
            themeDir,
            this.maxQuests,
            this.logLlmOutput,
            this.logLlmOutputDir
          ),
          () => this.getAssetManager()
        );
      } else {
        // Configure output and options
        if (themeConfig.theme) {
          this.selectedTheme = themeConfig.theme;
        }
        this.outputDir = this.configManager.configureOutputDirectory(args);
        const options = this.configManager.configureOptions(args);

        // Apply options
        this.maxQuests = options.maxQuests;
        this.logLlmOutput = options.logLlmOutput;
        this.logLlmOutputDir = options.logLlmOutputDir;
        this.serve = options.serve;
        this.format = options.format;

        // Setup directories and generate
        this.configManager.setupOutputDirectories(this.outputDir, options.overwrite, this.format);
        await this.generateAdventure();

        this.cliInterface.printSuccessMessage(this.outputDir, this.serve, this.format);

        if (this.serve) {
          const devServer = new DevServer(this.outputDir);
          await devServer.start();
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ Error generating adventure:'), error);
      this.cliInterface.close();
      process.exit(1);
    }

    // Cleanup and exit (runs for both single theme and all themes)
    this.cliInterface.close();

    // Only exit if not serving (server keeps process alive)
    if (!this.serve) {
      process.exit(0);
    }
  }

  /**
   * Static factory method to generate a single theme with isolated state
   * Creates a fresh generator instance to avoid concurrent state corruption
   */
  static async generateSingleThemeStatic(
    theme: AdventureTheme,
    themeDir: string,
    maxQuests: number | undefined,
    logLlmOutput: boolean,
    logLlmOutputDir: string
  ): Promise<void> {
    // Create a new isolated generator instance for this theme
    const themeGenerator = new HTMLAdventureGenerator();
    themeGenerator.selectedTheme = theme;
    themeGenerator.outputDir = themeDir;
    themeGenerator.maxQuests = maxQuests;
    themeGenerator.logLlmOutput = logLlmOutput;
    themeGenerator.logLlmOutputDir = logLlmOutputDir;
    themeGenerator.isMultiTheme = true;

    try {
      await themeGenerator.generateAdventure();
    } finally {
      // Always cleanup the CLI interface
      themeGenerator.cliInterface.close();
    }
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

    // Initialize content processor with project path and repo URL
    this.contentProcessor = new ContentProcessor(this.projectPath, this.repoUrl);

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

    // Step 3.5: Trim quests array if max-quests is specified (BEFORE initializing builders)
    const questsToGenerate = this.maxQuests !== undefined ? Math.min(this.maxQuests, this.quests.length) : this.quests.length;
    if (questsToGenerate < this.quests.length) {
      this.quests = this.quests.slice(0, questsToGenerate);
    }

    // Initialize HTML builder after quests are extracted and trimmed
    this.htmlBuilder = new HTMLBuilder(
      this.adventureManager,
      this.templateEngine,
      this.contentProcessor,
      this.projectPath,
      this.selectedTheme,
      this.isMultiTheme,
      this.quests
    );

    // Initialize Content Generator
    this.contentGenerator = new ContentGenerator(
      this.adventureManager,
      this.htmlBuilder,
      this.projectPath,
      this.outputDir,
      this.selectedTheme,
      this.quests,
      this.isMultiTheme,
      this.saveLlmOutput.bind(this),
      this.questContentsMap
    );

    // Step 4: Generate quest content (fills questContentsMap)
    console.log(chalk.dim('📖 Generating quest content...'));
    await this.contentGenerator.generateQuestContent();

    // Step 5: Generate all output files using the format strategy
    console.log(chalk.dim(`💾 Generating ${this.format.toUpperCase()} format...`));
    const assetManager = await this.getAssetManager();
    
    await FormatExporter.export(
      this.adventureManager,
      this.format,
      this.outputDir,
      this.questContentsMap,
      this.htmlBuilder,
      assetManager,
      this.isMultiTheme
    );
  }

  private extractQuestInfo(): void {
    this.quests = this.adventureManager.getAllQuests().map((quest: any, index: number) => ({
      filename: `quest-${index + 1}.${this.format}`,
      id: quest.id,
      title: quest.title,
    }));
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
  --format <format>      Output format: html (default), md, txt, json, xml
  --overwrite           Overwrite existing files without prompting
  --sequential          Process themes sequentially to avoid rate limits (for --theme all)
  --max-quests <num>    Limit number of quests to generate (default: all)
  --log-llm-output [dir]  Save raw LLM output for debugging (default: .ai-repo-adventures/llm-output)
  --serve               Start HTTP server and open browser after generation (HTML format only)
  --help, -h            Show this help message

Examples:
  npm run generate-html --theme space --output ./docs --overwrite
  npm run generate-html --theme mythical --format md
  npm run generate-html --theme all --output public --overwrite --format html
  npm run generate-html --theme all --sequential --output public  # Avoid rate limits
  npm run generate-html --theme space --format json --output ./exports
  npm run generate-html (interactive mode - includes "Generate All Themes" option)
`);
    return;
  }

  // Run CLI args validation
  if (argMap.has('serve') && argMap.get('format') !== 'html') {
    console.error('❌ Error: --serve is only supported for HTML format.');
    process.exit(1);
  }

  if (argMap.has('theme') && argMap.get('format') !== 'html') {
    console.error('❌ Error: --theme option is only supported for HTML format.');
    process.exit(1);
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
