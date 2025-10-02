import {
  ESTIMATED_TOKENS_PER_CHAR,
  MAX_CONTEXT_TOKENS,
  LLM_MAX_TOKENS_QUEST,
  CHUNKING_RESPONSE_TOKENS,
  CHUNKING_PROMPT_TOKENS,
  CHUNKING_CONTEXT_SUMMARY_TOKENS
} from './config.js';

// Reserve tokens for LLM response and base prompts
// Use the actual max tokens that will be requested for responses
const RESPONSE_TOKENS = Math.max(LLM_MAX_TOKENS_QUEST, CHUNKING_RESPONSE_TOKENS); // Account for actual response size requested
const PROMPT_TOKENS = CHUNKING_PROMPT_TOKENS; // Configurable prompt template tokens
const AVAILABLE_CONTENT_TOKENS = MAX_CONTEXT_TOKENS - RESPONSE_TOKENS - PROMPT_TOKENS;
const AVAILABLE_CONTENT_CHARS = Math.floor(AVAILABLE_CONTENT_TOKENS / ESTIMATED_TOKENS_PER_CHAR);

// For subsequent chunks, reserve space for previous context summary
const CONTEXT_SUMMARY_TOKENS = CHUNKING_CONTEXT_SUMMARY_TOKENS;
const SUBSEQUENT_CHUNK_TOKENS = AVAILABLE_CONTENT_TOKENS - CONTEXT_SUMMARY_TOKENS;
const SUBSEQUENT_CHUNK_CHARS = Math.floor(SUBSEQUENT_CHUNK_TOKENS / ESTIMATED_TOKENS_PER_CHAR);

function getChunkCharLimit(chunkIndex: number): number {
  return chunkIndex === 0 ? AVAILABLE_CONTENT_CHARS : SUBSEQUENT_CHUNK_CHARS;
}

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

    // If content fits in first chunk, use it as-is
    if (content.length <= AVAILABLE_CONTENT_CHARS) {
      console.log(`📦 Content: ${content.length.toLocaleString()} chars (~${totalTokens.toLocaleString()} tokens) - fits in single chunk`);
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

    console.log(`📂 Found ${fileBlocks.length} files in ${moduleGroups.length} modules:`);
    moduleGroups.forEach(group => {
      const totalSize = group.blocks.reduce((sum, block) => sum + block.content.length, 0);
      console.log(`  - ${group.moduleName}: ${group.blocks.length} files, ${totalSize} chars`);
    });

    // Combine modules into chunks to maximize space usage
    let currentChunkContent = '';
    let currentChunkModules: string[] = [];
    let currentChunkFiles: string[] = [];
    let currentChunkTokens = 0;

    for (const moduleGroup of moduleGroups) {
      const moduleContent = moduleGroup.blocks.map(block => block.content).join('\n\n');
      const moduleTokens = estimateTokenCount(moduleContent);

      // Determine chunk size limit (first chunk gets more space)
      const currentChunkIndex = chunks.length;
      const chunkLimit = getChunkCharLimit(currentChunkIndex);

      // Check if this module fits in the current chunk
      const combinedContent = currentChunkContent ? `${currentChunkContent}\n\n${moduleContent}` : moduleContent;
      const combinedSize = combinedContent.length;

      if (combinedSize <= chunkLimit) {
        // Add module to current chunk
        currentChunkContent = combinedContent;
        currentChunkModules.push(moduleGroup.moduleName);
        currentChunkFiles.push(...moduleGroup.blocks.map(block => block.filePath));
        currentChunkTokens += moduleTokens;
      } else {
        // Finalize current chunk if it has content
        if (currentChunkContent) {
          chunks.push({
            content: currentChunkContent,
            metadata: {
              chunkIndex: chunks.length,
              totalChunks: 0, // Will be updated later
              strategy: 'module-based',
              modules: [...currentChunkModules],
              files: [...currentChunkFiles],
              estimatedTokens: currentChunkTokens
            }
          });
          totalEstimatedTokens += currentChunkTokens;
        }

        // Start new chunk with current module
        const nextChunkLimit = getChunkCharLimit(chunks.length);

        if (moduleContent.length <= nextChunkLimit) {
          // Module fits in new chunk
          currentChunkContent = moduleContent;
          currentChunkModules = [moduleGroup.moduleName];
          currentChunkFiles = moduleGroup.blocks.map(block => block.filePath);
          currentChunkTokens = moduleTokens;
        } else {
          // Module is too large, split it
          const splitChunks = this.splitLargeModule(moduleGroup, nextChunkLimit, chunks.length);
          chunks.push(...splitChunks);
          totalEstimatedTokens += splitChunks.reduce((sum, chunk) => sum + chunk.metadata.estimatedTokens, 0);

          // Reset current chunk
          currentChunkContent = '';
          currentChunkModules = [];
          currentChunkFiles = [];
          currentChunkTokens = 0;
        }
      }
    }

    // Add final chunk if there's remaining content
    if (currentChunkContent) {
      chunks.push({
        content: currentChunkContent,
        metadata: {
          chunkIndex: chunks.length,
          totalChunks: 0, // Will be updated later
          strategy: 'module-based',
          modules: [...currentChunkModules],
          files: [...currentChunkFiles],
          estimatedTokens: currentChunkTokens
        }
      });
      totalEstimatedTokens += currentChunkTokens;
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
   * Extract module name from file path (directory-based with intelligent grouping)
   */
  private static extractModuleName(filePath: string): string {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');

    // For files in root, use 'root' as module
    if (parts.length <= 1) {
      return 'root';
    }

    // Use broader grouping to avoid too many tiny modules
    // Look for top-level directories like 'src', 'lib', 'packages', etc.
    const topLevelDirs = ['src', 'lib', 'packages', 'components', 'modules', 'app', 'pages'];

    for (let i = 0; i < parts.length - 1; i++) {
      if (topLevelDirs.includes(parts[i])) {
        // If we find a top-level dir, use the next directory level for grouping
        if (i + 1 < parts.length - 1) {
          return `${parts[i]}/${parts[i + 1]}`;
        } else {
          return parts[i];
        }
      }
    }

    // Fallback: use broader grouping by taking only the first 2 directory levels
    if (parts.length > 2) {
      return `${parts[0]}/${parts[1]}`;
    }

    // For shallow paths, use the parent directory
    return parts[parts.length - 2];
  }

  /**
   * Split a large module into smaller chunks
   */
  private static splitLargeModule(
    moduleGroup: { moduleName: string; blocks: Array<{ filePath: string; content: string }> },
    initialChunkLimit: number,
    startingChunkIndex: number
  ): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    let currentChunkContent: string[] = [];
    let currentChunkFiles: string[] = [];
    let currentChunkSize = 0;

    for (const block of moduleGroup.blocks) {
      const blockSize = block.content.length;

      // Recalculate chunk limit based on current chunk index
      const currentChunkIndex = startingChunkIndex + chunks.length;
      const chunkLimit = getChunkCharLimit(currentChunkIndex);

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

        // Recalculate chunk limit after pushing previous chunk
        const newChunkIndex = startingChunkIndex + chunks.length;
        const newChunkLimit = getChunkCharLimit(newChunkIndex);

        // If single block is too large for the new chunk, split the file itself
        if (blockSize > newChunkLimit) {
          const fileChunks = this.splitLargeFile(block, newChunkLimit, moduleGroup.moduleName, startingChunkIndex + chunks.length);
          chunks.push(...fileChunks);
        } else {
          currentChunkContent.push(block.content);
          currentChunkFiles.push(block.filePath);
          currentChunkSize += blockSize;
        }
      } else {
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
    initialChunkLimit: number,
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

      // Recalculate chunk limit based on current chunk index
      const currentChunkIndex = startingChunkIndex + chunks.length;
      const chunkLimit = getChunkCharLimit(currentChunkIndex);

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

        // Recalculate chunk limit for the new chunk
        const newChunkIndex = startingChunkIndex + chunks.length;
        const newChunkLimit = getChunkCharLimit(newChunkIndex);

        // Check if the current line fits in the new chunk with updated limit
        if (currentSize + lineSize <= newChunkLimit) {
          currentChunk.push(line);
          currentSize += lineSize;
        } else {
          // Line is too large even for the new chunk - this is very rare but handle gracefully
          // Add the line anyway but log a warning
          console.warn(`Warning: Line ${i} exceeds chunk limit (${lineSize} chars > ${newChunkLimit - currentSize} available)`);
          currentChunk.push(line);
          currentSize += lineSize;
        }
      } else {
        currentChunk.push(line);
        currentSize += lineSize;
      }
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
