import {
  MAX_CODE_CONTENT_CHARS,
  ESTIMATED_TOKENS_PER_CHAR,
  LARGE_CODEBASE_THRESHOLD,
  AGGRESSIVE_TRUNCATION_LINES,
  TRUNCATION_MESSAGE,
  MAX_CONTEXT_TOKENS
} from './config.js';

const FILE_HEADER_REGEX = /^#{1,6}\s*File:\s*(.+)$/;

/**
 * Supported repomix format patterns and their characteristics
 */
interface RepomixFormat {
  name: string;
  fileHeaderPattern: RegExp;
  isSupported: boolean;
  warningMessage?: string;
}

/**
 * Detect the repomix format used in the content
 * Returns format details and whether it's supported
 */
function detectRepomixFormat(content: string): RepomixFormat {
  const formats: RepomixFormat[] = [
    {
      name: 'standard',
      fileHeaderPattern: /^#{1,6}\s*File:\s*/m,
      isSupported: true
    },
    {
      name: 'lowercase',
      fileHeaderPattern: /^#{1,6}\s*file:\s*/m,
      isSupported: false,
      warningMessage: 'Detected lowercase "file:" headers - expected "File:" with capital F'
    },
    {
      name: 'source-header',
      fileHeaderPattern: /^#{1,6}\s*Source:\s*/m,
      isSupported: false,
      warningMessage: 'Detected "Source:" headers instead of "File:" - format not supported'
    },
    {
      name: 'path-header',
      fileHeaderPattern: /^#{1,6}\s*Path:\s*/m,
      isSupported: false,
      warningMessage: 'Detected "Path:" headers instead of "File:" - format not supported'
    },
    {
      name: 'codeblock-header',
      fileHeaderPattern: /^```[^\n]*\n[^\n]*File:\s*/m,
      isSupported: false,
      warningMessage: 'Detected file headers inside code blocks - format not supported'
    }
  ];

  for (const format of formats) {
    if (format.fileHeaderPattern.test(content)) {
      return format;
    }
  }

  return {
    name: 'unknown',
    fileHeaderPattern: /(?!)/,  // Never matches
    isSupported: false,
    warningMessage: 'No recognized file header format found - content may not be from repomix'
  };
}

/**
 * Validate that the content matches expected repomix format
 * Returns true if valid, false otherwise (with console warnings)
 */
function validateRepomixFormat(content: string): boolean {
  // Quick validation for empty or very small content
  if (!content || content.length < 10) {
    return true; // Don't warn on empty content
  }

  const format = detectRepomixFormat(content);

  if (!format.isSupported) {
    console.warn(`⚠️  Unsupported repomix format detected: ${format.name}`);
    if (format.warningMessage) {
      console.warn(`   ${format.warningMessage}`);
    }
    console.warn('   Truncation may not work correctly. Please ensure content uses standard repomix format:');
    console.warn('   - File headers should be: "## File: path/to/file.ext"');
    console.warn('   - Code should be in triple-backtick code fences');
    return false;
  }

  // Additional validation checks for supported format
  const hasFileHeaders = format.fileHeaderPattern.test(content);
  const hasCodeFences = /^```/m.test(content);

  if (!hasFileHeaders) {
    console.warn('⚠️  No file headers found in content');
    console.warn('   Expected format: "## File: path/to/file.ext"');
    console.warn('   Truncation will treat entire content as a single block');
    return false;
  }

  // Check for potential format inconsistencies
  const fileHeaderMatches = content.match(/^#{1,6}\s*\w+:\s*/gm);
  if (fileHeaderMatches) {
    const uniquePatterns = new Set(
      fileHeaderMatches.map(h => h.replace(/^#+\s*/, '').replace(/\s*$/, '').toLowerCase())
    );
    if (uniquePatterns.size > 1) {
      console.warn('⚠️  Mixed header formats detected:', Array.from(uniquePatterns).join(', '));
      console.warn('   This may cause inconsistent truncation behavior');
    }
  }

  // Validate code fence balance (basic check)
  const codeFences = (content.match(/^```/gm) || []).length;
  if (codeFences % 2 !== 0) {
    console.warn('⚠️  Unbalanced code fences detected (odd number of ``` markers)');
    console.warn('   This may cause code fence tracking issues during truncation');
  }

  return true;
}

function findLastFileHeaderIndex(content: string): number {
  const headerRegex = /(^|\n)#{1,6}\s*File:/g;
  let lastIndex = -1;
  let match: RegExpExecArray | null;

  while ((match = headerRegex.exec(content)) !== null) {
    lastIndex = match.index;
  }

  return lastIndex;
}

/**
 * Estimate the number of tokens in a text string
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length * ESTIMATED_TOKENS_PER_CHAR);
}

/**
 * Truncate content to fit within token limits while preserving structure
 */
export function truncateContent(content: string, maxChars: number = MAX_CODE_CONTENT_CHARS): string {
  if (content.length <= maxChars) {
    return content;
  }

  console.log(`⚠️  Content is ${content.length} chars, truncating to ${maxChars} chars`);

  // Try to truncate at a sensible boundary (end of a file or section)
  const truncated = content.substring(0, maxChars);
  const lastFileMarker = findLastFileHeaderIndex(truncated);
  const lastSectionMarker = truncated.lastIndexOf('\n---');

  let cutoff = maxChars;
  if (lastFileMarker > maxChars * 0.8) {
    cutoff = lastFileMarker;
  } else if (lastSectionMarker > maxChars * 0.8) {
    cutoff = lastSectionMarker;
  }

  return content.substring(0, cutoff) + TRUNCATION_MESSAGE;
}

/**
 * Smart truncation that applies progressive limits based on actual token usage
 * and preserves important sections from adventure.config.json when possible
 */
export function smartTruncateContent(content: string, configuredFilePaths?: string[]): string {
  const contentLength = content.length;
  const estimatedTokens = estimateTokenCount(content);

  // Validate format before processing (skip validation for very small content)
  if (contentLength > 100) {
    const isValidFormat = validateRepomixFormat(content);
    if (!isValidFormat && contentLength > 1000) {
      console.warn('⚠️  Proceeding with truncation despite format issues - results may be unpredictable');
    }
  }

  // First, try normal truncation (handles content within reasonable limits)
  const normallyTruncated = truncateContent(content);
  const normalTokens = estimateTokenCount(normallyTruncated);

  // If normal truncation keeps us well within limits AND no priority files need preservation, use it
  if (normalTokens <= MAX_CONTEXT_TOKENS * 0.8 &&
      (!configuredFilePaths || configuredFilePaths.length === 0 || normallyTruncated.length === content.length)) {
    return normallyTruncated;
  }

  console.log(`🔄 Content approaching token limits (${estimatedTokens} estimated tokens), applying smart truncation`);

  // Calculate appropriate limit based on actual token pressure
  let targetLimit: number;
  if (estimatedTokens > MAX_CONTEXT_TOKENS * 1.5) {
    // Very large content - use aggressive limits
    targetLimit = Math.floor(MAX_CODE_CONTENT_CHARS * 0.4); // 40% of max chars
    console.log(`📉 Using aggressive truncation (target: ${targetLimit} chars)`);
  } else if (estimatedTokens > MAX_CONTEXT_TOKENS * 1.2) {
    // Moderately large content - use moderate limits
    targetLimit = Math.floor(MAX_CODE_CONTENT_CHARS * 0.6); // 60% of max chars
    console.log(`📊 Using moderate truncation (target: ${targetLimit} chars)`);
  } else {
    // Just slightly over limits - use conservative truncation
    targetLimit = Math.floor(MAX_CODE_CONTENT_CHARS * 0.8); // 80% of max chars
    console.log(`📋 Using conservative truncation (target: ${targetLimit} chars)`);
  }

  // Apply truncation with priority preservation if configured files are provided
  if (configuredFilePaths && configuredFilePaths.length > 0) {
    return smartTruncateWithPriority(content, targetLimit, configuredFilePaths);
  }

  // Apply truncation without priority files
  return applyAggressiveTruncation(content, targetLimit);
}

/**
 * Apply aggressive truncation with priority preservation for configured files
 */
function normalizePathForComparison(path: string): string {
  return path.replace(/\\/g, '/');
}

function isPriorityFile(filePath: string, priorityFiles: string[]): boolean {
  const normalizedFilePath = normalizePathForComparison(filePath);

  return priorityFiles.some(priorityFile => {
    const normalizedPriority = normalizePathForComparison(priorityFile);

    return (
      normalizedFilePath === normalizedPriority ||
      normalizedFilePath.endsWith(`/${normalizedPriority}`) ||
      normalizedPriority.endsWith(`/${normalizedFilePath}`)
    );
  });
}

function smartTruncateWithPriority(content: string, limit: number, priorityFiles: string[]): string {
  const lines = content.split('\n');
  const truncatedLines: string[] = [];
  let currentFileLines = 0;
  let inFile = false;
  let currentFilePath = '';
  let currentFileIsPriority = false;
  let runningLength = 0; // Track length incrementally to avoid O(n²) joins
  let inCodeFence = false; // Track code fence state to preserve closing backticks

  for (const line of lines) {
    const trimmedLine = line.trim();
    const isFenceLine = trimmedLine.startsWith('```');
    const wasInCodeFence = inCodeFence;
    let addedLine = false;

    // Track code fence state
    if (isFenceLine) {
      inCodeFence = !inCodeFence;
    }

    const isClosingFence = isFenceLine && wasInCodeFence && !inCodeFence;
    const fileHeaderMatch = trimmedLine.match(FILE_HEADER_REGEX);
    const isFileHeader = Boolean(fileHeaderMatch);

    // Detect file boundaries using repomix markdown format
    if (isFileHeader) {
      // Extract file path from line like "## File: path/to/file.js"
      currentFilePath = fileHeaderMatch?.[1] ?? '';
      currentFileIsPriority = isPriorityFile(currentFilePath, priorityFiles);

      inFile = true;
      currentFileLines = 0;
      inCodeFence = false; // Reset code fence state for new file
      truncatedLines.push(line);
      runningLength += line.length + 1; // +1 for newline
      addedLine = true;

      if (currentFileIsPriority) {
        console.log(`🎯 Preserving priority file: ${currentFilePath}`);
      }
    } else if (inFile) {
      const maxLinesForFile = currentFileIsPriority ? AGGRESSIVE_TRUNCATION_LINES * 2 : AGGRESSIVE_TRUNCATION_LINES;
      const shouldPreserveLine = currentFileIsPriority || currentFileLines < maxLinesForFile;
      const shouldAlwaysKeepLine = !trimmedLine || isFileHeader || isClosingFence;

      if (shouldPreserveLine) {
        truncatedLines.push(line);
        runningLength += line.length + 1; // +1 for newline
        currentFileLines++;
        addedLine = true;
      } else if (shouldAlwaysKeepLine) {
        // Always keep empty lines, file boundaries, and closing code fences
        truncatedLines.push(line);
        runningLength += line.length + 1; // +1 for newline
        addedLine = true;
      }
    } else {
      truncatedLines.push(line);
      runningLength += line.length + 1; // +1 for newline
      addedLine = true;
    }

    if (isClosingFence && addedLine) {
      inFile = false;
    }

    // Early exit if we're approaching the character limit
    if (addedLine && runningLength > limit) {
      break;
    }
  }

  // If we broke out of the loop while inside a code fence, close it
  if (inCodeFence) {
    truncatedLines.push('```');
  }

  const result = truncatedLines.join('\n');

  if (result.length > limit) {
    return result.substring(0, limit) + TRUNCATION_MESSAGE;
  }

  if (result.length < content.length) {
    return result + TRUNCATION_MESSAGE;
  }

  return result;
}

/**
 * Apply default aggressive truncation without priority files
 */
function applyAggressiveTruncation(content: string, limit: number): string {
  const lines = content.split('\n');
  const truncatedLines: string[] = [];
  let currentFileLines = 0;
  let inFile = false;
  let runningLength = 0; // Track length incrementally to avoid O(n²) joins
  let inCodeFence = false; // Track code fence state to preserve closing backticks

  for (const line of lines) {
    const trimmedLine = line.trim();
    const isFenceLine = trimmedLine.startsWith('```');
    const wasInCodeFence = inCodeFence;
    let addedLine = false;

    // Track code fence state
    if (isFenceLine) {
      inCodeFence = !inCodeFence;
    }

    const isClosingFence = isFenceLine && wasInCodeFence && !inCodeFence;
    const fileHeaderMatch = trimmedLine.match(FILE_HEADER_REGEX);
    const isFileHeader = Boolean(fileHeaderMatch);

    // Detect file boundaries using repomix markdown format
    if (isFileHeader) {
      // New file marker
      inFile = true;
      currentFileLines = 0;
      inCodeFence = false; // Reset code fence state for new file
      truncatedLines.push(line);
      runningLength += line.length + 1; // +1 for newline
      addedLine = true;
    } else if (inFile && currentFileLines >= AGGRESSIVE_TRUNCATION_LINES) {
      // Skip lines if we've reached the aggressive limit
      if (!trimmedLine || isFileHeader || isClosingFence) {
        // Always keep empty lines, file boundaries, and closing code fences
        truncatedLines.push(line);
        runningLength += line.length + 1; // +1 for newline
        addedLine = true;
      }
      // Don't increment counter for skipped lines
    } else {
      truncatedLines.push(line);
      runningLength += line.length + 1; // +1 for newline
      addedLine = true;
      if (inFile) {
        currentFileLines++;
      }
    }

    if (isClosingFence && addedLine) {
      inFile = false;
    }

    // Early exit if we're approaching the character limit
    if (addedLine && runningLength > limit) {
      break;
    }
  }

  // If we broke out of the loop while inside a code fence, close it
  if (inCodeFence) {
    truncatedLines.push('```');
  }

  const result = truncatedLines.join('\n');

  if (result.length > limit) {
    return result.substring(0, limit) + TRUNCATION_MESSAGE;
  }

  if (result.length < content.length) {
    return result + TRUNCATION_MESSAGE;
  }

  return result;
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
 * Export format detection and validation utilities for external use
 */
export { validateRepomixFormat, detectRepomixFormat };
export type { RepomixFormat };
