import { AdventureManager } from '@codewithdan/ai-repo-adventures-core/adventure';
import type { OutputFormat } from './format-strategy.js';
import { FormatContext } from './format-context.js';
import type { HtmlBuilder, AssetManager } from './format-types.js';

/**
 * FormatExporter - Facade for exporting adventures in various formats
 * Delegates to FormatContext which uses Strategy pattern internally
 */
export class FormatExporter {
  /**
   * Export adventure data in the specified format using the appropriate strategy
   */
  static async export(
    adventureManager: AdventureManager,
    format: OutputFormat,
    outputDir: string,
    questContents: Map<string, string>,
    htmlBuilder?: HtmlBuilder,
    assetManager?: AssetManager,
    isMultiTheme: boolean = false,
    keyConcepts?: string
  ): Promise<void> {
    const context = new FormatContext(
      adventureManager,
      outputDir,
      adventureManager.getCurrentTheme() || 'unknown',
      adventureManager.getProjectPath() || process.cwd(),
      questContents
    );

    await context.generate(format, htmlBuilder, assetManager, isMultiTheme, keyConcepts);
  }

  /**
   * Validate format string
   */
  static isValidFormat(format: string): format is OutputFormat {
    return FormatContext.isValidFormat(format);
  }

  /**
   * Get supported formats
   */
  static getSupportedFormats(): OutputFormat[] {
    return FormatContext.getSupportedFormats();
  }
}

// Re-export types for convenience
export type { OutputFormat } from './format-strategy.js';
