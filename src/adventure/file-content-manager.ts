import { readFile } from 'fs/promises';
import type { ProjectInfo } from '../analyzer/index.js';
import { ADVENTURE_CONFIG } from '../shared/config.js';

/**
 * FileContentManager - Handles file reading and content preparation
 * Extracted from AdventureManager to follow single responsibility principle
 */
export class FileContentManager {
  private fileIndex: Map<string, string> = new Map();

  /**
   * Build file index for efficient lookups
   */
  buildFileIndex(projectInfo: ProjectInfo): void {
    this.fileIndex.clear();
    
    // Index all source files
    [...projectInfo.structure.sourceFiles, ...projectInfo.structure.configFiles].forEach(filePath => {
      // Index by full path
      this.fileIndex.set(filePath, filePath);
      
      // Also index by filename only for convenience
      const filename = filePath.split('/').pop() || '';
      if (filename && !this.fileIndex.has(filename)) {
        this.fileIndex.set(filename, filePath);
      }
    });
  }

  /**
   * Find file in index efficiently
   */
  findFileInIndex(file: string): string | undefined {
    // Direct lookup first
    if (this.fileIndex.has(file)) {
      return this.fileIndex.get(file);
    }
    
    // Try partial match
    for (const [key, value] of this.fileIndex.entries()) {
      if (key.includes(file) || file.includes(key)) {
        return value;
      }
    }
    
    return undefined;
  }

  /**
   * Prepare code content for LLM analysis
   */
  async prepareCodeContent(codeFiles: string[], projectInfo: ProjectInfo): Promise<string> {
    if (!projectInfo || codeFiles.length === 0) {
      return 'No specific files to explore - general project analysis.';
    }

    const fileContents: string[] = [];
    
    for (const file of codeFiles.slice(0, ADVENTURE_CONFIG.MAX_FILES_PER_ADVENTURE)) { // Limit files to avoid overwhelming the LLM
      try {
        const filePath = this.findFileInIndex(file);
        if (filePath) {
          // Try to read the file content
          const content = await readFile(filePath, 'utf-8');
          
          // Truncate very long files to avoid overwhelming the LLM
          const lines = content.split('\n');
          const maxLines = ADVENTURE_CONFIG.MAX_FILE_LINES_FOR_LLM;
          const truncatedContent = lines.slice(0, maxLines).join('\n');
          const truncatedNote = lines.length > maxLines ? `\n... (file continues for ${lines.length - maxLines} more lines)` : '';
          
          fileContents.push(`**File: ${file}**
\`\`\`${this.getFileExtension(filePath)}
${truncatedContent}${truncatedNote}
\`\`\``);
        } else {
          fileContents.push(`**File: ${file}** - Not found in project structure`);
        }
      } catch (error) {
        // Use debug instead of warn since file read failures during adventure generation are expected
        // when the LLM references files that don't exist in the specific project structure
        console.debug(`Could not read file ${file}:`, error instanceof Error ? error.message : String(error));
        fileContents.push(`**File: ${file}** - Could not read file content`);
      }
    }

    return `Files to explore in this adventure:

${fileContents.join('\n\n')}

Project structure context:
- Total files: ${projectInfo.fileCount}
- Main technologies: ${projectInfo.mainTechnologies.join(', ')}
- Has tests: ${projectInfo.hasTests}
- Has API: ${projectInfo.hasApi}
- Has database: ${projectInfo.hasDatabase}
- Entry points: ${projectInfo.codeAnalysis.entryPoints.join(', ')}`;
  }

  /**
   * Get file extension for syntax highlighting
   */
  private getFileExtension(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (!ext) return '';
    
    const fullExt = `.${ext}`;
    // Simple extension to language mapping
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript', 
      '.tsx': 'typescript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c'
    };
    return languageMap[fullExt] || 'text';
  }

  /**
   * Read file content with error handling
   */
  async readFileContent(filePath: string): Promise<string | null> {
    try {
      return await readFile(filePath, 'utf-8');
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Truncate content to specified number of lines
   */
  truncateContent(content: string, maxLines: number): string {
    const lines = content.split('\n');
    if (lines.length <= maxLines) {
      return content;
    }
    return lines.slice(0, maxLines).join('\n') + `\n... (${lines.length - maxLines} more lines)`;
  }

  /**
   * Check if file exists in index
   */
  hasFile(fileName: string): boolean {
    return this.fileIndex.has(fileName) || 
           Array.from(this.fileIndex.keys()).some(key => 
             key.includes(fileName) || fileName.includes(key)
           );
  }

  /**
   * Get all indexed files
   */
  getAllFiles(): string[] {
    return Array.from(new Set(this.fileIndex.values()));
  }

  /**
   * Clear the file index
   */
  clearIndex(): void {
    this.fileIndex.clear();
  }

  /**
   * Get index statistics
   */
  getIndexStats(): { totalEntries: number; uniqueFiles: number } {
    return {
      totalEntries: this.fileIndex.size,
      uniqueFiles: new Set(this.fileIndex.values()).size
    };
  }
}