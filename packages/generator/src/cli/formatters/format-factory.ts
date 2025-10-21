import type { OutputFormat, FormatStrategy } from './format-strategy.js';
import { 
  MarkdownStrategy, 
  TextStrategy, 
  JsonStrategy, 
  XmlStrategy 
} from './strategies/index.js';

/**
 * Factory for creating format strategies
 */
export class FormatStrategyFactory {
  private static strategies: Map<OutputFormat, () => FormatStrategy> = new Map([
    ['md', () => new MarkdownStrategy()],
    ['txt', () => new TextStrategy()],
    ['json', () => new JsonStrategy()],
    ['xml', () => new XmlStrategy()]
  ]);

  /**
   * Create a format strategy for the given format
   */
  static createStrategy(format: OutputFormat): FormatStrategy | null {
    // HTML is handled separately by the existing HTML generator
    if (format === 'html') {
      return null;
    }

    const strategyFactory = this.strategies.get(format);
    if (!strategyFactory) {
      throw new Error(`No strategy found for format: ${format}`);
    }

    return strategyFactory();
  }

  /**
   * Check if a format is valid
   */
  static isValidFormat(format: string): format is OutputFormat {
    return ['html', 'md', 'txt', 'json', 'xml'].includes(format);
  }

  /**
   * Get all supported formats
   */
  static getSupportedFormats(): OutputFormat[] {
    return ['html', 'md', 'txt', 'json', 'xml'];
  }

  /**
   * Register a custom format strategy
   */
  static registerStrategy(format: OutputFormat, strategyFactory: () => FormatStrategy): void {
    this.strategies.set(format, strategyFactory);
  }
}
