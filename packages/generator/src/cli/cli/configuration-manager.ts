import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { AdventureTheme } from '@codewithdan/ai-repo-adventures-core/shared';
import { DEFAULT_PATHS } from '../constants.js';
import { OutputFormat, FormatExporter } from '../formatters/format-exporter.js';

interface ConfigurationOptions {
  theme?: AdventureTheme;
  outputDir: string;
  overwrite: boolean;
  maxQuests?: number;
  logLlmOutput: boolean;
  logLlmOutputDir: string;
  serve: boolean;
  format: OutputFormat;
}

/**
 * Handles command-line argument parsing and configuration management
 */
export class ConfigurationManager {
  /**
   * Parse theme argument and return theme or 'all' for multi-theme mode
   */
  parseThemeArg(themeArg: string): AdventureTheme | 'all' | null {
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

  /**
   * Configure theme from command-line arguments
   * @returns true if all themes should be generated, false for single theme
   */
  configureTheme(args: Map<string, string>): { theme?: AdventureTheme; isAllThemes: boolean } {
    const themeArg = args.get('theme');
    if (!themeArg) {
      return { isAllThemes: false };
    }

    const theme = this.parseThemeArg(themeArg);
    if (!theme) {
      throw new Error(`Invalid theme: ${themeArg}. Valid themes: space, mythical, ancient, developer, custom, all`);
    }

    if (theme === 'all') {
      return { isAllThemes: true };
    }

    console.log(chalk.green(`✅ Theme: ${themeArg}`));
    return { theme, isAllThemes: false };
  }

  /**
   * Configure output directory from command-line arguments
   */
  configureOutputDirectory(args: Map<string, string>): string {
    const outputArg = args.get('output');
    const outputDir = outputArg || DEFAULT_PATHS.OUTPUT_DIR;
    console.log(chalk.green(`✅ Output: ${outputDir}`));
    return outputDir;
  }

  /**
   * Configure additional options from command-line arguments
   */
  configureOptions(args: Map<string, string>): Omit<ConfigurationOptions, 'theme' | 'outputDir'> {
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
    }

    // Configure logging
    const logLlmOutput = args.has('log-llm-output');
    let logLlmOutputDir: string = DEFAULT_PATHS.LLM_LOG_DIR;
    if (logLlmOutput) {
      const logValue = args.get('log-llm-output');
      // If value is not 'true', treat it as a custom directory path
      if (logValue && logValue !== 'true') {
        logLlmOutputDir = logValue;
      }
      console.log(chalk.green(`✅ LLM output logging: enabled (${logLlmOutputDir})`));
    }

    // Configure serving
    const serve = args.has('serve');
    if (serve) {
      console.log(chalk.green('✅ HTTP server: will start after generation'));
    }

    // Configure format
    const formatArg = args.get('format') || 'html';
    if (!FormatExporter.isValidFormat(formatArg)) {
      const validFormats = FormatExporter.getSupportedFormats().join(', ');
      console.error(chalk.red(`Invalid format specified. Valid formats are: ${validFormats}`));
      process.exit(1);
    }
    const format = formatArg as OutputFormat;
    console.log(chalk.green(`✅ Output format: ${format}`));

    return {
      overwrite,
      maxQuests,
      logLlmOutput,
      logLlmOutputDir,
      serve,
      format
    };
  }

  /**
   * Setup output directories with overwrite handling
   */
  setupOutputDirectories(outputDir: string, overwrite: boolean, format: string): void {
    // Check if output directory exists and handle overwrite
    if (fs.existsSync(outputDir) && !overwrite) {
      const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.html'));
      if (files.length > 0) {
        throw new Error(`Output directory ${outputDir} contains HTML files. Use --overwrite to replace them.`);
      }
    }

    // Create directories if they don't exist or if overwrite is enabled
    if (overwrite && fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

    // Create output directories
    fs.mkdirSync(outputDir, { recursive: true });

    // Create additional folders for HTML format
    if (format === 'html') {
      fs.mkdirSync(path.join(outputDir, 'assets'), { recursive: true });
      fs.mkdirSync(path.join(outputDir, 'assets', 'images'), { recursive: true });
    }
  }
}

export type { ConfigurationOptions };
