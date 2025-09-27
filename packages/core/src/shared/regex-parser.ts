/**
 * Regex-based implementation of ContentParser
 *
 * This parser uses regular expressions to parse repomix markdown format.
 * It's fast and lightweight but less robust than AST-based parsers.
 */

import {
  ContentParser,
  ParsedFile,
  ParseResult,
  ParseOptions,
  ParserCapabilities,
  TruncatingParser,
  TruncateOptions
} from './content-parser.js';
import {
  AGGRESSIVE_TRUNCATION_LINES,
  TRUNCATION_MESSAGE
} from './config.js';

/**
 * Regular expression patterns for parsing
 */
const PATTERNS = {
  fileHeader: /^#{1,6}\s*File:\s*(.+)$/gm,
  fileHeaderLine: /^#{1,6}\s*File:\s*(.+)$/,
  codeFence: /^```/gm,
  sectionSeparator: /^---$/gm,
  // Alternative formats we want to detect but not support
  lowercaseHeader: /^#{1,6}\s*file:\s*/m,
  sourceHeader: /^#{1,6}\s*Source:\s*/m,
  pathHeader: /^#{1,6}\s*Path:\s*/m
};

/**
 * Regex-based parser implementation
 */
export class RegexParser implements TruncatingParser {
  /**
   * Parse content into structured files
   */
  parse(content: string, options: ParseOptions = {}): ParseResult {
    const lines = content.split('\n');
    const files: ParsedFile[] = [];
    const warnings: string[] = [];

    // Validate format if requested
    if (options.validateFormat !== false) {
      const validation = this.validateFormat(content);
      warnings.push(...validation.warnings);
    }

    // Track current file being parsed
    let currentFile: Partial<ParsedFile> | null = null;
    let currentContent: string[] = [];
    let inCodeFence = false;
    let codeFenceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check for code fence
      if (trimmedLine.startsWith('```')) {
        inCodeFence = !inCodeFence;
        codeFenceCount++;
      }

      // Check for file header
      const headerMatch = trimmedLine.match(PATTERNS.fileHeaderLine);
      if (headerMatch) {
        // Save previous file if exists
        if (currentFile && currentFile.path) {
          currentFile.content = currentContent.join('\n');
          currentFile.endLine = i - 1;
          currentFile.codeFencesBalanced = this.checkCodeFenceBalance(currentFile.content);
          files.push(currentFile as ParsedFile);

          // Stop if we've reached max files
          if (options.maxFiles && files.length >= options.maxFiles) {
            break;
          }
        }

        // Start new file
        currentFile = {
          path: headerMatch[1],
          header: line,
          startLine: i,
          hasCodeFences: false,
          codeFencesBalanced: true
        };
        currentContent = [];
        inCodeFence = false; // Reset fence state for new file
      } else if (currentFile) {
        // Add line to current file content
        currentContent.push(line);
        if (trimmedLine.startsWith('```')) {
          currentFile.hasCodeFences = true;
        }
      }
    }

    // Save last file
    if (currentFile && currentFile.path) {
      currentFile.content = currentContent.join('\n');
      currentFile.endLine = lines.length - 1;
      currentFile.codeFencesBalanced = this.checkCodeFenceBalance(currentFile.content);
      files.push(currentFile as ParsedFile);
    }

    // Calculate stats
    const stats = {
      totalFiles: files.length,
      totalLines: lines.length,
      totalChars: content.length,
      hasCodeFences: codeFenceCount > 0,
      codeFenceBalance: codeFenceCount % 2 === 0 ? 0 : 1
    };

    return {
      files,
      format: {
        isValid: warnings.length === 0,
        formatName: this.detectFormatName(content),
        warnings
      },
      stats
    };
  }

  /**
   * Extract specific files by path pattern
   */
  extractFiles(content: string, pathPatterns: string[]): ParsedFile[] {
    const parseResult = this.parse(content);
    return parseResult.files.filter(file =>
      pathPatterns.some(pattern =>
        file.path.includes(pattern) || pattern.includes(file.path)
      )
    );
  }

  /**
   * Find files that match priority patterns
   */
  findPriorityFiles(files: ParsedFile[], priorityPaths: string[]): ParsedFile[] {
    return files.filter(file =>
      priorityPaths.some(pattern =>
        file.path.includes(pattern) || pattern.includes(file.path)
      )
    );
  }

  /**
   * Serialize parsed files back to markdown
   */
  serialize(files: ParsedFile[]): string {
    return files.map(file => {
      const content = file.content.trimEnd();
      return `${file.header}\n${content}\n\n---`;
    }).join('\n\n');
  }

  /**
   * Validate content format
   */
  validateFormat(content: string): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (!content || content.length < 10) {
      return { isValid: true, warnings };
    }

    // Check for unsupported formats
    if (PATTERNS.lowercaseHeader.test(content)) {
      warnings.push('Detected lowercase "file:" headers - expected "File:" with capital F');
    }
    if (PATTERNS.sourceHeader.test(content)) {
      warnings.push('Detected "Source:" headers instead of "File:" - format not supported');
    }
    if (PATTERNS.pathHeader.test(content)) {
      warnings.push('Detected "Path:" headers instead of "File:" - format not supported');
    }

    // Check for file headers
    const hasFileHeaders = PATTERNS.fileHeader.test(content);
    if (!hasFileHeaders) {
      warnings.push('No file headers found in content');
    }

    // Check code fence balance
    const fences = (content.match(PATTERNS.codeFence) || []).length;
    if (fences % 2 !== 0) {
      warnings.push(`Unbalanced code fences detected (${fences} markers)`);
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Get parser capabilities
   */
  getCapabilities(): ParserCapabilities {
    return {
      name: 'RegexParser',
      supportedFormats: ['## File:', '# File:', '### File:'],
      canAutoFix: true,
      preservesMarkdown: true,
      handlesNesting: false,
      performance: 'fast'
    };
  }

  /**
   * Truncate content while preserving structure
   */
  truncate(content: string, options: TruncateOptions): string {
    const parseResult = this.parse(content);
    const truncatedFiles = this.truncateFiles(parseResult.files, options);
    return this.serialize(truncatedFiles);
  }

  /**
   * Truncate parsed files to fit size limit
   */
  truncateFiles(files: ParsedFile[], options: TruncateOptions): ParsedFile[] {
    const { maxChars, maxLinesPerFile = AGGRESSIVE_TRUNCATION_LINES, priorityFiles = [] } = options;

    // Separate priority and regular files
    const priorityFileObjs = this.findPriorityFiles(files, priorityFiles);
    const regularFiles = files.filter(f => !priorityFileObjs.includes(f));

    // Calculate space for priority files
    let priorityChars = 0;
    const truncatedPriority = priorityFileObjs.map(file => {
      const lines = file.content.split('\n');
      const maxLines = maxLinesPerFile * 2; // Give priority files more space
      if (lines.length > maxLines) {
        const truncatedContent = lines.slice(0, maxLines).join('\n');
        priorityChars += file.header.length + truncatedContent.length + 10; // +10 for separators
        return {
          ...file,
          content: truncatedContent + '\n' + (options.truncationMessage || TRUNCATION_MESSAGE)
        };
      }
      priorityChars += file.header.length + file.content.length + 10;
      return file;
    });

    // Calculate remaining space for regular files
    const remainingChars = maxChars - priorityChars;
    let currentChars = 0;
    const truncatedRegular: ParsedFile[] = [];

    for (const file of regularFiles) {
      const fileSize = file.header.length + file.content.length + 10;

      if (currentChars + fileSize <= remainingChars) {
        // File fits completely
        truncatedRegular.push(file);
        currentChars += fileSize;
      } else if (currentChars < remainingChars) {
        // Truncate this file to fit
        const availableSpace = remainingChars - currentChars - file.header.length - 10;
        if (availableSpace > 0) {
          const lines = file.content.split('\n');
          const linesToKeep = Math.min(lines.length, maxLinesPerFile);
          let truncatedContent = lines.slice(0, linesToKeep).join('\n');

          // Ensure we don't exceed available space
          if (truncatedContent.length > availableSpace) {
            truncatedContent = truncatedContent.substring(0, availableSpace);
          }

          // Close any open code fences
          if (options.preserveCodeFences !== false) {
            truncatedContent = this.ensureCodeFenceClosure(truncatedContent);
          }

          truncatedRegular.push({
            ...file,
            content: truncatedContent + '\n' + (options.truncationMessage || TRUNCATION_MESSAGE)
          });
          currentChars += file.header.length + truncatedContent.length + 10;
        }
        break; // No more space
      } else {
        break; // No more space
      }
    }

    // Combine priority and regular files
    return [...truncatedPriority, ...truncatedRegular];
  }

  /**
   * Check if code fences are balanced in content
   */
  private checkCodeFenceBalance(content: string): boolean {
    const fences = (content.match(PATTERNS.codeFence) || []).length;
    return fences % 2 === 0;
  }

  /**
   * Ensure code fences are properly closed
   */
  private ensureCodeFenceClosure(content: string): string {
    const lines = content.split('\n');
    let inCodeFence = false;

    for (const line of lines) {
      if (line.trim().startsWith('```')) {
        inCodeFence = !inCodeFence;
      }
    }

    if (inCodeFence) {
      return content + '\n```';
    }

    return content;
  }

  /**
   * Detect the format name from content
   */
  private detectFormatName(content: string): string {
    if (PATTERNS.fileHeader.test(content)) return 'standard';
    if (PATTERNS.lowercaseHeader.test(content)) return 'lowercase';
    if (PATTERNS.sourceHeader.test(content)) return 'source-header';
    if (PATTERNS.pathHeader.test(content)) return 'path-header';
    return 'unknown';
  }
}