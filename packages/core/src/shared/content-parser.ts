/**
 * Content Parser Abstraction Layer
 *
 * This module provides an abstraction for parsing repomix content,
 * allowing different parsing strategies (regex, AST, etc.) to be used
 * interchangeably without affecting the truncation logic.
 */

/**
 * Represents a single file extracted from repomix content
 */
export interface ParsedFile {
  /** The file path as specified in the header */
  path: string;
  /** The complete file header line */
  header: string;
  /** The file's content (code, comments, etc.) */
  content: string;
  /** Starting line number in the original content */
  startLine: number;
  /** Ending line number in the original content */
  endLine: number;
  /** Whether this file has code fences */
  hasCodeFences: boolean;
  /** Whether code fences are properly balanced */
  codeFencesBalanced: boolean;
}

/**
 * Parsing result with files and metadata
 */
export interface ParseResult {
  /** All files found in the content */
  files: ParsedFile[];
  /** Format validation information */
  format: {
    isValid: boolean;
    formatName: string;
    warnings: string[];
  };
  /** Statistics about the parsed content */
  stats: {
    totalFiles: number;
    totalLines: number;
    totalChars: number;
    hasCodeFences: boolean;
    codeFenceBalance: number; // 0 = balanced, positive = unclosed, negative = extra closes
  };
}

/**
 * Options for parsing content
 */
export interface ParseOptions {
  /** Whether to validate format during parsing */
  validateFormat?: boolean;
  /** Whether to fix common issues (like fence balance) */
  autoFix?: boolean;
  /** Maximum number of files to parse (for performance) */
  maxFiles?: number;
}

/**
 * Abstract interface for content parsers
 */
export interface ContentParser {
  /**
   * Parse repomix content into structured files
   */
  parse(content: string, options?: ParseOptions): ParseResult;

  /**
   * Extract specific files by path pattern
   */
  extractFiles(content: string, pathPatterns: string[]): ParsedFile[];

  /**
   * Find files that match priority patterns
   */
  findPriorityFiles(files: ParsedFile[], priorityPaths: string[]): ParsedFile[];

  /**
   * Serialize parsed files back to markdown format
   */
  serialize(files: ParsedFile[]): string;

  /**
   * Validate content format
   */
  validateFormat(content: string): { isValid: boolean; warnings: string[] };

  /**
   * Get parser capabilities
   */
  getCapabilities(): ParserCapabilities;
}

/**
 * Describes what a parser implementation can do
 */
export interface ParserCapabilities {
  /** Parser implementation name */
  name: string;
  /** Supported file header formats */
  supportedFormats: string[];
  /** Whether parser can auto-fix issues */
  canAutoFix: boolean;
  /** Whether parser preserves markdown structure */
  preservesMarkdown: boolean;
  /** Whether parser handles nested structures */
  handlesNesting: boolean;
  /** Performance characteristics */
  performance: 'fast' | 'moderate' | 'slow';
}

/**
 * Truncation options for parsed content
 */
export interface TruncateOptions {
  /** Maximum characters to keep */
  maxChars: number;
  /** Maximum lines per file */
  maxLinesPerFile?: number;
  /** Files to prioritize (keep complete) */
  priorityFiles?: string[];
  /** Whether to preserve code fence integrity */
  preserveCodeFences?: boolean;
  /** Truncation message to append */
  truncationMessage?: string;
}

/**
 * Extended parser interface with truncation support
 */
export interface TruncatingParser extends ContentParser {
  /**
   * Truncate content while preserving structure
   */
  truncate(content: string, options: TruncateOptions): string;

  /**
   * Truncate parsed files to fit size limit
   */
  truncateFiles(files: ParsedFile[], options: TruncateOptions): ParsedFile[];
}