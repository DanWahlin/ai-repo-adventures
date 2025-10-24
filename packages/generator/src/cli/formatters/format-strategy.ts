import type { Quest } from '@codewithdan/ai-repo-adventures-core/adventure';

export type OutputFormat = 'html' | 'md' | 'txt' | 'json' | 'xml';

export interface AdventureData {
  title: string;
  story: string;
  theme: string;
  quests: Quest[];
  questContents: Map<string, string>;
}

/**
 * Strategy interface for formatting adventure data
 */
export interface FormatStrategy {
  /**
   * Format the adventure data according to the strategy
   * Optional for multi-file formats that use generateFiles() instead
   */
  format?(data: AdventureData): string;

  /**
   * Generate files for multi-file formats (e.g., HTML with multiple pages)
   * Optional for single-file formats that use format() instead
   */
  generateFiles?(): Promise<void>;

  /**
   * Get the file extension for this format
   */
  getFileExtension(): string;

  /**
   * Get the output filename
   * Not applicable for multi-file formats
   */
  getFileName(): string;

  /**
   * Check if this strategy generates multiple files
   */
  isMultiFile(): boolean;
}

/**
 * Base abstract class for format strategies with common utilities
 */
export abstract class BaseFormatStrategy implements FormatStrategy {
  format?(data: AdventureData): string;
  generateFiles?(): Promise<void>;
  abstract getFileExtension(): string;

  getFileName(): string {
    return `index.${this.getFileExtension()}`;
  }

  isMultiFile(): boolean {
    return false; // Default to single file, override in multi-file strategies
  }

  protected getQuestContent(quest: Quest, data: AdventureData): string | null {
    return data.questContents.get(quest.id) || null;
  }
}
