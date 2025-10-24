import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { getAllThemes, getThemeByKey, AdventureTheme } from '@codewithdan/ai-repo-adventures-core/shared';
import { HOMEPAGE } from '../constants.js';

interface CustomThemeData {
  name: string;
  description: string;
  keywords: string[];
}

/**
 * Handles all CLI user interface interactions
 */
export class CLIInterface {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Close the readline interface
   */
  close(): void {
    this.rl.close();
  }

  /**
   * Display the header
   */
  printHeader(): void {
    console.log(chalk.bgBlue.white.bold(' 🌟 AI Repo Adventures HTML Generator 🌟 '));
    console.log(chalk.dim('─'.repeat(50)));
    console.log();
  }

  /**
   * Display success message after generation
   */
  printSuccessMessage(outputDir: string, serve: boolean, format: string): void {
    console.log();
    console.log(chalk.green.bold('🎉 Adventure website generated successfully!'));
    console.log(chalk.cyan(`📁 Location: ${outputDir}`));

    if (!serve) {
      console.log(chalk.cyan(`🌐 Open: ${path.join(outputDir, 'index')}.${format}`));
    }
  }

  /**
   * Prompt the user with a question
   */
  async prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(chalk.bold(question), resolve);
    });
  }

  /**
   * Select theme interactively
   * @returns true if "all themes" selected, false for single theme
   */
  async selectTheme(): Promise<{ theme: AdventureTheme; customData?: CustomThemeData; isAllThemes: boolean }> {
    console.log(chalk.yellow.bold('📚 Choose Your Adventure:'));
    console.log();

    const themes = getAllThemes();
    const allThemesId = themes.length + 1;

    themes.forEach((theme: any) => {
      console.log(`${theme.emoji} ${chalk.bold(theme.id.toString())}. ${theme.displayName} - ${theme.description}`);
    });

    // Add "all themes" option
    console.log(`🌈 ${chalk.bold(allThemesId.toString())}. Generate All Themes - Create adventures in all available themes simultaneously`);
    console.log(chalk.dim('   Note: Multi-theme generation is only supported for HTML format'));
    console.log();

    const choice = await this.prompt('Enter theme number or name (or "all" for all themes): ');

    // Parse theme choice
    const cleanChoice = choice.trim().toLowerCase();
    const themeNumber = parseInt(choice.trim());

    // Check if user selected "all themes"
    if (cleanChoice === 'all' || themeNumber === allThemesId) {
      console.log(chalk.green('✅ Selected: Generate All Themes'));
      console.log();
      return { theme: 'space', isAllThemes: true }; // theme doesn't matter when isAllThemes is true
    }

    // Handle regular theme selection
    let selectedTheme: AdventureTheme = 'space';

    if (!isNaN(themeNumber)) {
      const theme = themes.find((t: any) => t.id === themeNumber);
      if (theme) {
        selectedTheme = theme.key as AdventureTheme;
      } else {
        console.log(chalk.red('Invalid theme number. Using space theme.'));
      }
    } else {
      const theme = getThemeByKey(cleanChoice);
      if (theme) {
        selectedTheme = theme.key as AdventureTheme;
      } else {
        console.log(chalk.red('Invalid theme name. Using space theme.'));
      }
    }

    // Handle custom theme
    let customData: CustomThemeData | undefined;
    if (selectedTheme === 'custom') {
      customData = await this.createCustomTheme();
      if (!customData) {
        selectedTheme = 'space'; // Fall back to space if custom theme creation failed
      }
    }

    const selectedThemeInfo = getThemeByKey(selectedTheme);
    console.log(chalk.green(`✅ Selected: ${selectedThemeInfo?.displayName || selectedTheme}`));
    console.log();

    return { theme: selectedTheme, customData, isAllThemes: false };
  }

  /**
   * Create custom theme interactively
   */
  async createCustomTheme(): Promise<CustomThemeData | undefined> {
    console.log(chalk.cyan('\n🎨 Creating Custom Theme...'));
    console.log();

    const name = await this.prompt('Theme name (e.g., "Cyberpunk", "Pirate Adventure"): ');
    const description = await this.prompt('Theme description: ');
    const keywordsInput = await this.prompt('Keywords (comma-separated): ');

    const keywords = keywordsInput.split(',').map(k => k.trim()).filter(k => k.length > 0);

    if (!name.trim() || !description.trim() || keywords.length === 0) {
      console.log(chalk.red('❌ Invalid custom theme data. Using space theme instead.'));
      return undefined;
    }

    console.log(chalk.green('✅ Custom theme created!'));

    return {
      name: name.trim(),
      description: description.trim(),
      keywords
    };
  }

  /**
   * Select output directory interactively
   */
  async selectOutputDirectory(format: string): Promise<string> {
    console.log(chalk.yellow.bold('📁 Output Directory:'));
    console.log(chalk.dim(`Current directory: ${process.cwd()}`));
    console.log();

    const dir = await this.prompt('Enter output directory (or press Enter for ./public): ');
    const outputDir = dir.trim() || path.join(process.cwd(), 'public');

    // Check if directory exists and has content
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      if (files.length > 0) {
        console.log(chalk.yellow(`⚠️  Directory '${outputDir}' already exists and contains files.`));
        console.log(chalk.dim('Files found:'));
        files.slice(0, HOMEPAGE.FILE_PREVIEW_LIMIT).forEach(file => {
          console.log(chalk.dim(`  - ${file}`));
        });
        if (files.length > HOMEPAGE.FILE_PREVIEW_LIMIT) {
          console.log(chalk.dim(`  ... and ${files.length - HOMEPAGE.FILE_PREVIEW_LIMIT} more files`));
        }
        console.log();

        const overwrite = await this.prompt('Do you want to overwrite this directory? (y/N): ');
        if (!overwrite.toLowerCase().startsWith('y')) {
          console.log(chalk.red('❌ Operation cancelled.'));
          process.exit(0);
        }

        console.log(chalk.yellow('🗑️  Clearing existing directory...'));
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    }

    // Create directories
    fs.mkdirSync(outputDir, { recursive: true });

    // Create additional folders for HTML format
    if (format === 'html') {
      fs.mkdirSync(path.join(outputDir, 'assets'), { recursive: true });
      fs.mkdirSync(path.join(outputDir, 'assets', 'images'), { recursive: true });
    }

    console.log(chalk.green(`✅ Output directory: ${outputDir}`));
    console.log();

    return outputDir;
  }
}

export type { CustomThemeData };
