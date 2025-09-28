import { ESTIMATED_TOKENS_PER_CHAR, MAX_CONTEXT_TOKENS, LLM_MAX_TOKENS_QUEST } from './config.js';

// Reserve tokens for LLM response and base prompts
// Use the actual max tokens that will be requested for responses
const RESPONSE_TOKENS = Math.max(LLM_MAX_TOKENS_QUEST, 10000); // Account for actual response size requested
const PROMPT_TOKENS = 3000; // Increased to account for prompt template and instructions
const AVAILABLE_CONTENT_TOKENS = MAX_CONTEXT_TOKENS - RESPONSE_TOKENS - PROMPT_TOKENS;
const AVAILABLE_CONTENT_CHARS = Math.floor(AVAILABLE_CONTENT_TOKENS / ESTIMATED_TOKENS_PER_CHAR);

// For subsequent chunks, reserve space for previous context summary
const CONTEXT_SUMMARY_TOKENS = 8000;
const SUBSEQUENT_CHUNK_TOKENS = AVAILABLE_CONTENT_TOKENS - CONTEXT_SUMMARY_TOKENS;
const SUBSEQUENT_CHUNK_CHARS = Math.floor(SUBSEQUENT_CHUNK_TOKENS / ESTIMATED_TOKENS_PER_CHAR);

export interface ContentChunk {
  content: string;
  metadata: {
    chunkIndex: number;
    totalChunks: number;
    strategy: 'single' | 'module-based' | 'file-split';
    modules?: string[];
    files: string[];
    estimatedTokens: number;
  };
}

export interface ChunkResult {
  chunks: ContentChunk[];
  totalEstimatedTokens: number;
}

/**
 * Estimate the number of tokens in a text string
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length * ESTIMATED_TOKENS_PER_CHAR);
}

/**
 * ContentChunker handles intelligent splitting of repository content
 * into optimal chunks for LLM processing without information loss
 */
export class ContentChunker {
  /**
   * Split content into chunks using hybrid strategy:
   * 1. Try to fit everything in one chunk (ideal case)
   * 2. Group files by directory/module
   * 3. Split large files when necessary
   */
  static chunkContent(content: string): ChunkResult {
    const totalTokens = estimateTokenCount(content);

    console.log(`📊 Content size: ${content.length} chars, estimated ${totalTokens} tokens`);
    console.log(`📊 Available for content: ${AVAILABLE_CONTENT_CHARS} chars (${AVAILABLE_CONTENT_TOKENS} tokens)`);
    console.log(`📊 Reserved for response: ${RESPONSE_TOKENS} tokens, prompt: ${PROMPT_TOKENS} tokens`);

    // If content fits in first chunk, use it as-is
    if (content.length <= AVAILABLE_CONTENT_CHARS) {
      console.log(`✅ Content fits in single chunk`);
      return {
        chunks: [{
          content,
          metadata: {
            chunkIndex: 0,
            totalChunks: 1,
            strategy: 'single',
            files: this.extractFileList(content),
            estimatedTokens: totalTokens
          }
        }],
        totalEstimatedTokens: totalTokens
      };
    }

    // Content is too large, use hybrid chunking
    console.log(`🔄 Content too large, using hybrid chunking`);
    return this.createHybridChunks(content);
  }

  /**
   * Create chunks using hybrid strategy: module-based with file splitting fallback
   */
  private static createHybridChunks(content: string): ChunkResult {
    const fileBlocks = this.parseFileBlocks(content);
    const moduleGroups = this.groupFilesByModule(fileBlocks);
    const chunks: ContentChunk[] = [];
    let totalEstimatedTokens = 0;

    for (const moduleGroup of moduleGroups) {
      const moduleContent = moduleGroup.blocks.map(block => block.content).join('\n\n');
      const moduleTokens = estimateTokenCount(moduleContent);

      // Determine chunk size limit (first chunk gets more space)
      const chunkLimit = chunks.length === 0 ? AVAILABLE_CONTENT_CHARS : SUBSEQUENT_CHUNK_CHARS;

      if (moduleContent.length <= chunkLimit) {
        // Module fits in one chunk
        chunks.push({
          content: moduleContent,
          metadata: {
            chunkIndex: chunks.length,
            totalChunks: 0, // Will be updated later
            strategy: 'module-based',
            modules: [moduleGroup.moduleName],
            files: moduleGroup.blocks.map(block => block.filePath),
            estimatedTokens: moduleTokens
          }
        });
        totalEstimatedTokens += moduleTokens;
      } else {
        // Module is too large, split it
        const splitChunks = this.splitLargeModule(moduleGroup, chunkLimit, chunks.length);
        chunks.push(...splitChunks);
        totalEstimatedTokens += splitChunks.reduce((sum, chunk) => sum + chunk.metadata.estimatedTokens, 0);
      }
    }

    // Update total chunks count
    chunks.forEach(chunk => chunk.metadata.totalChunks = chunks.length);

    return { chunks, totalEstimatedTokens };
  }

  /**
   * Parse content into file blocks using repomix format
   */
  private static parseFileBlocks(content: string): Array<{ filePath: string; content: string }> {
    const fileBlocks: Array<{ filePath: string; content: string }> = [];
    const lines = content.split('\n');
    let currentFile: { filePath: string; content: string } | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      const fileHeaderMatch = line.match(/^#{1,6}\s*File:\s*(.+)$/);

      if (fileHeaderMatch) {
        // Save previous file if exists
        if (currentFile) {
          currentFile.content = currentContent.join('\n');
          fileBlocks.push(currentFile);
        }

        // Start new file
        currentFile = { filePath: fileHeaderMatch[1].trim(), content: '' };
        currentContent = [line]; // Include the header
      } else if (currentFile) {
        currentContent.push(line);
      }
    }

    // Save the last file
    if (currentFile) {
      currentFile.content = currentContent.join('\n');
      fileBlocks.push(currentFile);
    }

    return fileBlocks;
  }

  /**
   * Group file blocks by directory (module)
   */
  private static groupFilesByModule(fileBlocks: Array<{ filePath: string; content: string }>): Array<{
    moduleName: string;
    blocks: Array<{ filePath: string; content: string }>;
  }> {
    const moduleMap = new Map<string, Array<{ filePath: string; content: string }>>();

    for (const block of fileBlocks) {
      const moduleName = this.extractModuleName(block.filePath);

      if (!moduleMap.has(moduleName)) {
        moduleMap.set(moduleName, []);
      }
      moduleMap.get(moduleName)!.push(block);
    }

    return Array.from(moduleMap.entries()).map(([moduleName, blocks]) => ({
      moduleName,
      blocks
    }));
  }

  /**
   * Extract module name from file path (directory-based)
   */
  private static extractModuleName(filePath: string): string {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');

    // For files in root, use 'root' as module
    if (parts.length <= 1) {
      return 'root';
    }

    // For nested files, use the immediate parent directory
    // e.g., "packages/core/src/adventure/story.ts" -> "adventure"
    // e.g., "src/components/Button.tsx" -> "components"
    return parts[parts.length - 2];
  }

  /**
   * Split a large module into smaller chunks
   */
  private static splitLargeModule(
    moduleGroup: { moduleName: string; blocks: Array<{ filePath: string; content: string }> },
    chunkLimit: number,
    startingChunkIndex: number
  ): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    let currentChunkContent: string[] = [];
    let currentChunkFiles: string[] = [];
    let currentChunkSize = 0;

    for (const block of moduleGroup.blocks) {
      const blockSize = block.content.length;

      // If adding this block would exceed the limit, finalize current chunk
      if (currentChunkSize > 0 && currentChunkSize + blockSize > chunkLimit) {
        chunks.push({
          content: currentChunkContent.join('\n\n'),
          metadata: {
            chunkIndex: startingChunkIndex + chunks.length,
            totalChunks: 0, // Will be updated by caller
            strategy: 'module-based',
            modules: [moduleGroup.moduleName],
            files: [...currentChunkFiles],
            estimatedTokens: estimateTokenCount(currentChunkContent.join('\n\n'))
          }
        });

        currentChunkContent = [];
        currentChunkFiles = [];
        currentChunkSize = 0;
      }

      // If single block is too large, split the file itself
      if (blockSize > chunkLimit) {
        const fileChunks = this.splitLargeFile(block, chunkLimit, moduleGroup.moduleName, startingChunkIndex + chunks.length);
        chunks.push(...fileChunks);
      } else {
        currentChunkContent.push(block.content);
        currentChunkFiles.push(block.filePath);
        currentChunkSize += blockSize;
      }
    }

    // Add final chunk if there's remaining content
    if (currentChunkContent.length > 0) {
      chunks.push({
        content: currentChunkContent.join('\n\n'),
        metadata: {
          chunkIndex: startingChunkIndex + chunks.length,
          totalChunks: 0, // Will be updated by caller
          strategy: 'module-based',
          modules: [moduleGroup.moduleName],
          files: [...currentChunkFiles],
          estimatedTokens: estimateTokenCount(currentChunkContent.join('\n\n'))
        }
      });
    }

    return chunks;
  }

  /**
   * Split a single large file into multiple chunks
   */
  private static splitLargeFile(
    fileBlock: { filePath: string; content: string },
    chunkLimit: number,
    moduleName: string,
    startingChunkIndex: number
  ): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    const lines = fileBlock.content.split('\n');
    const headerLine = lines[0]; // The "## File: ..." line
    let currentChunk: string[] = [];
    let currentSize = 0;

    // Always start with the file header
    currentChunk.push(headerLine);
    currentSize += headerLine.length;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const lineSize = line.length + 1; // +1 for newline

      // If adding this line would exceed limit, finalize current chunk
      if (currentSize + lineSize > chunkLimit && currentChunk.length > 1) {
        // Close any open code blocks
        const chunkContent = this.ensureCodeBlocksClosed(currentChunk.join('\n'));

        chunks.push({
          content: chunkContent,
          metadata: {
            chunkIndex: startingChunkIndex + chunks.length,
            totalChunks: 0, // Will be updated by caller
            strategy: 'file-split',
            modules: [moduleName],
            files: [fileBlock.filePath],
            estimatedTokens: estimateTokenCount(chunkContent)
          }
        });

        // Start new chunk with header
        currentChunk = [headerLine];
        currentSize = headerLine.length;
      }

      currentChunk.push(line);
      currentSize += lineSize;
    }

    // Add final chunk
    if (currentChunk.length > 1) {
      const chunkContent = this.ensureCodeBlocksClosed(currentChunk.join('\n'));
      chunks.push({
        content: chunkContent,
        metadata: {
          chunkIndex: startingChunkIndex + chunks.length,
          totalChunks: 0, // Will be updated by caller
          strategy: 'file-split',
          modules: [moduleName],
          files: [fileBlock.filePath],
          estimatedTokens: estimateTokenCount(chunkContent)
        }
      });
    }

    return chunks;
  }

  /**
   * Ensure code blocks are properly closed in chunk content
   */
  private static ensureCodeBlocksClosed(content: string): string {
    const codeBlockCount = (content.match(/^```/gm) || []).length;

    // If odd number of code blocks, we have an unclosed block
    if (codeBlockCount % 2 !== 0) {
      return content + '\n```';
    }

    return content;
  }

  /**
   * Extract list of files from content for metadata
   */
  private static extractFileList(content: string): string[] {
    const files: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const fileHeaderMatch = line.match(/^#{1,6}\s*File:\s*(.+)$/);
      if (fileHeaderMatch) {
        files.push(fileHeaderMatch[1].trim());
      }
    }

    return files;
  }
}