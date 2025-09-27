/**
 * Parser Factory for Content Parser Strategy Selection
 *
 * This factory manages parser instances and selects the appropriate
 * parser based on content characteristics or configuration.
 */

import { ContentParser, TruncatingParser, ParserCapabilities } from './content-parser.js';
import { RegexParser } from './regex-parser.js';

/**
 * Parser type identifiers
 */
export enum ParserType {
  REGEX = 'regex',
  REMARK = 'remark',  // Future: AST-based parser
  AUTO = 'auto'       // Auto-detect best parser
}

/**
 * Parser selection options
 */
export interface ParserOptions {
  /** Preferred parser type */
  type?: ParserType;
  /** Whether to use caching for parser instances */
  useCache?: boolean;
  /** Custom parser implementation */
  customParser?: ContentParser;
}

/**
 * Parser factory for creating and managing content parsers
 */
export class ParserFactory {
  private static instance: ParserFactory;
  private parsers: Map<string, ContentParser> = new Map();
  private defaultParser: ParserType = ParserType.REGEX;

  /**
   * Get singleton instance of ParserFactory
   */
  static getInstance(): ParserFactory {
    if (!ParserFactory.instance) {
      ParserFactory.instance = new ParserFactory();
    }
    return ParserFactory.instance;
  }

  /**
   * Create or get a parser instance
   */
  getParser(options: ParserOptions = {}): ContentParser {
    const { type = this.defaultParser, useCache = true, customParser } = options;

    // Return custom parser if provided
    if (customParser) {
      return customParser;
    }

    // Check cache
    if (useCache && this.parsers.has(type)) {
      return this.parsers.get(type)!;
    }

    // Create new parser
    const parser = this.createParser(type);

    // Cache if requested
    if (useCache) {
      this.parsers.set(type, parser);
    }

    return parser;
  }

  /**
   * Get a truncating parser (with truncation support)
   */
  getTruncatingParser(options: ParserOptions = {}): TruncatingParser {
    const parser = this.getParser(options);

    // Check if parser supports truncation
    if (this.isTruncatingParser(parser)) {
      return parser;
    }

    // Wrap non-truncating parser with truncation adapter
    return this.wrapWithTruncationAdapter(parser);
  }

  /**
   * Auto-detect best parser for content
   */
  autoDetectParser(content: string): ContentParser {
    // For now, we only have RegexParser
    // In future, this could analyze content characteristics
    // and choose between regex, remark, or other parsers

    const contentSize = content.length;
    const hasComplexNesting = this.detectComplexNesting(content);
    const hasMixedFormats = this.detectMixedFormats(content);

    // Future logic:
    // if (hasComplexNesting || hasMixedFormats) {
    //   return this.createParser(ParserType.REMARK);
    // }

    // For now, always use regex parser
    return this.createParser(ParserType.REGEX);
  }

  /**
   * Get capabilities of all available parsers
   */
  getAvailableParsers(): ParserCapabilities[] {
    const capabilities: ParserCapabilities[] = [];

    // Add RegexParser capabilities
    const regexParser = new RegexParser();
    capabilities.push(regexParser.getCapabilities());

    // Future: Add other parser capabilities
    // const remarkParser = new RemarkParser();
    // capabilities.push(remarkParser.getCapabilities());

    return capabilities;
  }

  /**
   * Set default parser type
   */
  setDefaultParser(type: ParserType): void {
    this.defaultParser = type;
  }

  /**
   * Clear parser cache
   */
  clearCache(): void {
    this.parsers.clear();
  }

  /**
   * Create a parser instance by type
   */
  private createParser(type: ParserType | string): ContentParser {
    switch (type) {
      case ParserType.REGEX:
        return new RegexParser();

      case ParserType.REMARK:
        // Future implementation
        console.warn('RemarkParser not yet implemented, falling back to RegexParser');
        return new RegexParser();

      case ParserType.AUTO:
        // This shouldn't be called directly, but handle it anyway
        return new RegexParser();

      default:
        console.warn(`Unknown parser type: ${type}, using RegexParser`);
        return new RegexParser();
    }
  }

  /**
   * Check if parser supports truncation
   */
  private isTruncatingParser(parser: ContentParser): parser is TruncatingParser {
    return 'truncate' in parser && 'truncateFiles' in parser;
  }

  /**
   * Wrap a basic parser with truncation capabilities
   */
  private wrapWithTruncationAdapter(parser: ContentParser): TruncatingParser {
    // For now, all our parsers support truncation
    // This is future-proofing for parsers that might not
    return parser as TruncatingParser;
  }

  /**
   * Detect if content has complex nesting
   */
  private detectComplexNesting(content: string): boolean {
    // Simple heuristic: check for nested code blocks or deep indentation
    const nestedCodeBlocks = /```[\s\S]*?```[\s\S]*?```/m.test(content);
    const deepIndentation = /^[ \t]{8,}/m.test(content);
    return nestedCodeBlocks || deepIndentation;
  }

  /**
   * Detect if content has mixed formats
   */
  private detectMixedFormats(content: string): boolean {
    const formats = [
      /^#{1,6}\s*File:/m,
      /^#{1,6}\s*file:/m,
      /^#{1,6}\s*Source:/m,
      /^#{1,6}\s*Path:/m
    ];

    const detectedFormats = formats.filter(pattern => pattern.test(content));
    return detectedFormats.length > 1;
  }
}

/**
 * Convenience function to get a parser
 */
export function getParser(options?: ParserOptions): ContentParser {
  return ParserFactory.getInstance().getParser(options);
}

/**
 * Convenience function to get a truncating parser
 */
export function getTruncatingParser(options?: ParserOptions): TruncatingParser {
  return ParserFactory.getInstance().getTruncatingParser(options);
}

/**
 * Convenience function to auto-detect parser
 */
export function autoDetectParser(content: string): ContentParser {
  return ParserFactory.getInstance().autoDetectParser(content);
}