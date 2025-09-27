/**
 * Content Truncator V2 - Using Parser Abstraction
 *
 * This is the refactored version of content-truncator that uses
 * the parser abstraction layer for better flexibility and maintainability.
 */

import {
  MAX_CODE_CONTENT_CHARS,
  ESTIMATED_TOKENS_PER_CHAR,
  TRUNCATION_MESSAGE,
  MAX_CONTEXT_TOKENS,
  AGGRESSIVE_TRUNCATION_LINES
} from './config.js';
import { getTruncatingParser, ParserType } from './parser-factory.js';
import { TruncateOptions } from './content-parser.js';

/**
 * Estimate the number of tokens in a text string
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length * ESTIMATED_TOKENS_PER_CHAR);
}

/**
 * Smart truncation using parser abstraction
 */
export function smartTruncateContent(
  content: string,
  configuredFilePaths?: string[],
  parserType: ParserType = ParserType.AUTO
): string {
  const contentLength = content.length;
  const estimatedTokens = estimateTokenCount(content);

  // Get appropriate parser
  const parser = getTruncatingParser({ type: parserType });

  // Validate format before processing (skip for very small content)
  if (contentLength > 100) {
    const validation = parser.validateFormat(content);
    if (!validation.isValid && contentLength > 1000) {
      console.warn('⚠️  Format validation issues detected:');
      validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
      console.warn('⚠️  Proceeding with truncation despite format issues - results may be unpredictable');
    }
  }

  // Quick return for small content
  if (contentLength <= MAX_CODE_CONTENT_CHARS && estimatedTokens <= MAX_CONTEXT_TOKENS * 0.8) {
    // If no priority files or content unchanged, return as-is
    if (!configuredFilePaths || configuredFilePaths.length === 0) {
      return content;
    }
  }

  // Calculate appropriate limit based on token pressure
  let targetLimit: number;
  let maxLinesPerFile: number = AGGRESSIVE_TRUNCATION_LINES;

  if (estimatedTokens > MAX_CONTEXT_TOKENS * 1.5) {
    // Very large content - use aggressive limits
    targetLimit = Math.floor(MAX_CODE_CONTENT_CHARS * 0.4);
    maxLinesPerFile = Math.floor(AGGRESSIVE_TRUNCATION_LINES * 0.5);
    console.log(`📉 Using aggressive truncation (target: ${targetLimit} chars, ${maxLinesPerFile} lines/file)`);
  } else if (estimatedTokens > MAX_CONTEXT_TOKENS * 1.2) {
    // Moderately large content - use moderate limits
    targetLimit = Math.floor(MAX_CODE_CONTENT_CHARS * 0.6);
    maxLinesPerFile = Math.floor(AGGRESSIVE_TRUNCATION_LINES * 0.75);
    console.log(`📊 Using moderate truncation (target: ${targetLimit} chars, ${maxLinesPerFile} lines/file)`);
  } else if (estimatedTokens > MAX_CONTEXT_TOKENS * 0.9) {
    // Just over limits - use conservative truncation
    targetLimit = Math.floor(MAX_CODE_CONTENT_CHARS * 0.8);
    maxLinesPerFile = AGGRESSIVE_TRUNCATION_LINES;
    console.log(`📋 Using conservative truncation (target: ${targetLimit} chars, ${maxLinesPerFile} lines/file)`);
  } else {
    // Content is within reasonable limits
    targetLimit = MAX_CODE_CONTENT_CHARS;
    maxLinesPerFile = AGGRESSIVE_TRUNCATION_LINES * 2;
  }

  // Prepare truncation options
  const truncateOptions: TruncateOptions = {
    maxChars: targetLimit,
    maxLinesPerFile,
    priorityFiles: configuredFilePaths,
    preserveCodeFences: true,
    truncationMessage: TRUNCATION_MESSAGE
  };

  // Use parser to truncate content
  const truncatedContent = parser.truncate(content, truncateOptions);

  // Log truncation details if content was reduced
  if (truncatedContent.length < contentLength) {
    const reduction = ((1 - truncatedContent.length / contentLength) * 100).toFixed(1);
    console.log(`📦 Content truncated: ${contentLength} → ${truncatedContent.length} chars (${reduction}% reduction)`);

    if (configuredFilePaths && configuredFilePaths.length > 0) {
      // Check if priority files were preserved
      const parseResult = parser.parse(truncatedContent);
      const priorityFiles = parser.findPriorityFiles(parseResult.files, configuredFilePaths);
      if (priorityFiles.length > 0) {
        console.log(`🎯 Preserved ${priorityFiles.length}/${configuredFilePaths.length} priority files`);
      }
    }
  }

  return truncatedContent;
}

/**
 * Simple truncation (backward compatibility)
 */
export function truncateContent(content: string, maxChars: number = MAX_CODE_CONTENT_CHARS): string {
  if (content.length <= maxChars) {
    return content;
  }

  console.log(`⚠️  Content is ${content.length} chars, truncating to ${maxChars} chars`);

  // Use parser for consistent truncation
  const parser = getTruncatingParser({ type: ParserType.REGEX });
  const truncateOptions: TruncateOptions = {
    maxChars,
    preserveCodeFences: true,
    truncationMessage: TRUNCATION_MESSAGE
  };

  return parser.truncate(content, truncateOptions);
}

/**
 * Estimate the total prompt size including all components
 */
export function estimatePromptSize(components: {
  basePrompt?: string;
  codeContent?: string;
  storyContent?: string;
  themeGuidelines?: string;
  additionalContent?: string;
}): number {
  const totalChars = Object.values(components)
    .filter(content => content)
    .reduce((sum, content) => sum + content!.length, 0);

  return Math.ceil(totalChars * ESTIMATED_TOKENS_PER_CHAR);
}

/**
 * Validate that content will fit within token limits before sending to LLM
 */
export function validateContentSize(
  basePrompt: string,
  codeContent: string,
  maxTokens: number = 120000
): { valid: boolean; estimatedTokens: number; recommendation?: string } {
  const estimatedTokens = estimatePromptSize({ basePrompt, codeContent });

  if (estimatedTokens <= maxTokens) {
    return { valid: true, estimatedTokens };
  }

  const excessTokens = estimatedTokens - maxTokens;
  const recommendedReduction = Math.ceil(excessTokens / ESTIMATED_TOKENS_PER_CHAR);

  return {
    valid: false,
    estimatedTokens,
    recommendation: `Content exceeds token limit by ${excessTokens} tokens. Consider reducing content by ${recommendedReduction} characters.`
  };
}

/**
 * Export parser-based validation functions for external use
 */
export function validateRepomixFormat(content: string, parserType: ParserType = ParserType.REGEX): boolean {
  const parser = getTruncatingParser({ type: parserType });
  const validation = parser.validateFormat(content);
  return validation.isValid;
}

export function detectRepomixFormat(content: string, parserType: ParserType = ParserType.REGEX): {
  name: string;
  isSupported: boolean;
  warningMessage?: string;
} {
  const parser = getTruncatingParser({ type: parserType });
  const parseResult = parser.parse(content, { validateFormat: true, maxFiles: 1 });

  return {
    name: parseResult.format.formatName,
    isSupported: parseResult.format.isValid,
    warningMessage: parseResult.format.warnings.join('; ')
  };
}

// Re-export types for backward compatibility
export type { RepomixFormat } from './content-truncator.js';