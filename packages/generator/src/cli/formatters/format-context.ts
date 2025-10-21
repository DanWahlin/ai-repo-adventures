import * as path from 'path';
import * as fs from 'fs';
import { AdventureManager } from '@codewithdan/ai-repo-adventures-core/adventure';
import type { OutputFormat, AdventureData } from './format-strategy.js';
import { FormatStrategyFactory } from './format-factory.js';
import { HtmlStrategy } from './strategies/html-strategy.js';

/**
 * Context for format generation - coordinates all format strategies
 * This is the main entry point for generating adventures in any format
 */
export class FormatContext {
  private adventureManager: AdventureManager;
  private outputDir: string;
  private theme: string;
  private projectPath: string;
  private questContents: Map<string, string>;

  constructor(
    adventureManager: AdventureManager,
    outputDir: string,
    theme: string,
    projectPath: string,
    questContents: Map<string, string>
  ) {
    this.adventureManager = adventureManager;
    this.outputDir = outputDir;
    this.theme = theme;
    this.projectPath = projectPath;
    this.questContents = questContents;
  }

  /**
   * Generate adventure in the specified format
   */
  async generate(
    format: OutputFormat,
    htmlBuilder?: any,
    assetManager?: any,
    isMultiTheme: boolean = false
  ): Promise<void> {
    if (format === 'html') {
      // HTML requires special handling with multiple files
      if (!htmlBuilder || !assetManager) {
        throw new Error('HTML format requires htmlBuilder and assetManager');
      }

      const htmlStrategy = new HtmlStrategy(
        this.outputDir,
        this.theme,
        htmlBuilder,
        assetManager,
        this.questContents,
        isMultiTheme
      );

      await htmlStrategy.generateFiles();
    } else {
      // Other formats generate a single file
      const strategy = FormatStrategyFactory.createStrategy(format);
      if (!strategy) {
        throw new Error(`No strategy available for format: ${format}`);
      }

      const data = this.prepareAdventureData();
      const content = strategy.format(data);
      const filePath = path.join(this.outputDir, strategy.getFileName());

      console.log(`Writing adventure to ${filePath}...`);
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  }

  /**
   * Prepare adventure data for formatting
   */
  private prepareAdventureData(): AdventureData {
    return {
      title: this.adventureManager.getTitle() || 'AI Adventure',
      story: this.adventureManager.getStoryContent(),
      theme: this.adventureManager.getCurrentTheme() || 'unknown',
      quests: this.adventureManager.getAllQuests(),
      questContents: this.questContents
    };
  }

  /**
   * Get available formats
   */
  static getSupportedFormats(): OutputFormat[] {
    return FormatStrategyFactory.getSupportedFormats();
  }

  /**
   * Validate format
   */
  static isValidFormat(format: string): format is OutputFormat {
    return FormatStrategyFactory.isValidFormat(format);
  }
}

