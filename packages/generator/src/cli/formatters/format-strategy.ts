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
   */
  format(data: AdventureData): string;

  /**
   * Get the file extension for this format
   */
  getFileExtension(): string;

  /**
   * Get the output filename
   */
  getFileName(): string;
}

/**
 * Base abstract class for format strategies with common utilities
 */
export abstract class BaseFormatStrategy implements FormatStrategy {
  abstract format(data: AdventureData): string;
  abstract getFileExtension(): string;

  getFileName(): string {
    return `index.${this.getFileExtension()}`;
  }

  protected getQuestContent(quest: Quest, data: AdventureData): string | null {
    return data.questContents.get(quest.id) || null;
  }
}
