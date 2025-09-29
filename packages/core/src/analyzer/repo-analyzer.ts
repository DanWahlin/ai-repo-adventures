/**
 * Simple Repomix Wrapper
 * 
 * This analyzer runs repomix to get the codebase context and returns it.
 * No complex analysis - just pure repomix output for the LLM to use directly.
 */

import type { CliOptions } from 'repomix';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { REPOMIX_CACHE_TTL, REPOMIX_SUBPROCESS_TIMEOUT, REPOMIX_GRACEFUL_TIMEOUT, REPOMIX_MAX_BUFFER_SIZE } from '../shared/config.js';
import { extractUniqueFilePaths } from '../shared/adventure-config.js';

export interface RepomixOptions {
  compress?: boolean;
  includeTests?: boolean;
  style?: 'xml' | 'markdown' | 'plain';
}

interface OptimizationState {
  optimized: string[];
  currentFunction: string[];
  braceDepth: number;
  inFunction: boolean;
  functionName: string;
}

export class RepoAnalyzer {
  private cache = new Map<string, { content: string; timestamp: number }>();

  constructor() {}

  /**
   * Extract README.md content for project overview
   * Returns the first 100 lines or until first major section ends
   */
  private extractReadmeContent(projectPath: string, maxLines: number = 100): string {
    const readmePaths = [
      path.join(projectPath, 'README.md'),
      path.join(projectPath, 'readme.md'),
      path.join(projectPath, 'Readme.md')
    ];

    for (const readmePath of readmePaths) {
      if (fs.existsSync(readmePath)) {
        try {
          const fullContent = fs.readFileSync(readmePath, 'utf-8');
          const lines = fullContent.split('\n');

          // Smart extraction: include up to maxLines or until we hit a second ## heading
          let extractedLines: string[] = [];
          let majorSectionCount = 0;

          for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
            const line = lines[i];

            // Count major sections (## headings)
            if (line.startsWith('## ')) {
              majorSectionCount++;
              // Stop after including 2-3 major sections
              if (majorSectionCount > 3) {
                break;
              }
            }

            extractedLines.push(line);
          }

          return extractedLines.join('\n');
        } catch (error) {
          console.warn(`Failed to read README at ${readmePath}:`, error);
        }
      }
    }

    return '';
  }

  /**
   * Basic validation for project path - minimal checks for actual use case
   */
  private validateProjectPath(projectPath: string): void {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('Project path must be a non-empty string');
    }

    const trimmedPath = projectPath.trim();
    if (!trimmedPath) {
      throw new Error('Project path must be a non-empty string');
    }

    // Basic safety check for null bytes (can break file system operations)
    if (trimmedPath.includes('\0')) {
      throw new Error('Project path contains invalid null bytes');
    }
  }

  /**
   * Validate and normalize target files for security and reliability
   * Prevents path traversal, ensures files exist, deduplicates, and limits count
   */
  private validateAndNormalizeTargetFiles(projectPath: string, targetFiles: string[]): string[] {
    const MAX_TARGET_FILES = 50; // Reasonable limit to prevent resource exhaustion
    const projectRoot = path.resolve(projectPath);
    
    // Deduplicate, validate, and normalize target files
    const safeFiles = [...new Set(targetFiles)]
      .slice(0, MAX_TARGET_FILES) // Limit count early
      .map(file => {
        if (typeof file !== 'string' || !file.trim()) {
          return null; // Skip invalid entries
        }
        
        const trimmed = file.trim();
        
        // Basic security checks
        if (trimmed.includes('\0') || trimmed.includes('..')) {
          console.warn(`Rejecting potentially unsafe file path: ${trimmed}`);
          return null;
        }
        
        return trimmed;
      })
      .filter((file): file is string => file !== null)
      .map(file => {
        // Resolve to absolute path for security validation
        const fullPath = path.resolve(projectPath, file);
        
        // Security: Ensure file is within project directory
        if (!fullPath.startsWith(projectRoot + path.sep) && fullPath !== projectRoot) {
          console.warn(`Rejecting file outside project directory: ${file}`);
          return null;
        }
        
        // Reliability: Ensure file exists
        if (!fs.existsSync(fullPath)) {
          console.warn(`Skipping non-existent file: \`${file}\``);
          return null;
        }
        
        // Return relative path for consistent cache keys
        return path.relative(projectPath, fullPath);
      })
      .filter((file): file is string => file !== null)
      .sort(); // Sort for stable cache keys
    
    return safeFiles;
  }

  /**
   * Generate optimized function-focused content for specific files
   * Reduces token usage by extracting only essential functions and code patterns
   */
  async generateOptimizedContent(projectPath: string, targetFiles: string[], compress: boolean = true): Promise<string> {
    this.validateProjectPath(projectPath);
    
    if (!targetFiles || targetFiles.length === 0) {
      throw new Error('Target files array cannot be empty');
    }
    
    // Harden and validate target files
    const safeFiles = this.validateAndNormalizeTargetFiles(projectPath, targetFiles);
    if (safeFiles.length === 0) {
      throw new Error('No valid target files found after validation');
    }
    
    // Create stable cache key for optimized content
    const cacheKey = `${path.resolve(projectPath)}:optimized:${safeFiles.join(',')}:compress=${compress}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < REPOMIX_CACHE_TTL) {
      return cached.content;
    }
    
    try {
      // First, get full repomix content
      const fullContent = await this.generateTargetedContent(projectPath, targetFiles, compress);
      
      // Apply function-focused optimization
      const optimizedContent = this.extractFunctionFocusedContent(fullContent);

      // Prepend README content for context
      const readmeContent = this.extractReadmeContent(projectPath);
      let finalContent = optimizedContent;
      if (readmeContent) {
        finalContent = `# Project Overview (from README.md)\n\n${readmeContent}\n\n---\n\n# Repository Code\n\n${optimizedContent}`;
      }

      // Cache the optimized result
      this.cache.set(cacheKey, { content: finalContent, timestamp: Date.now() });

      return finalContent;
    } catch (error) {
      throw new Error(`Optimized content generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate targeted repomix content for specific files
   */
  async generateTargetedContent(projectPath: string, targetFiles: string[], compress: boolean = true): Promise<string> {
    this.validateProjectPath(projectPath);
    
    if (!targetFiles || targetFiles.length === 0) {
      throw new Error('Target files array cannot be empty');
    }
    
    // Harden and validate target files
    const safeFiles = this.validateAndNormalizeTargetFiles(projectPath, targetFiles);
    if (safeFiles.length === 0) {
      throw new Error('No valid target files found after validation');
    }
    
    // Create stable cache key from normalized files
    const cacheKey = `${path.resolve(projectPath)}:targeted:${safeFiles.join(',')}:compress=${compress}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < REPOMIX_CACHE_TTL) {
      return cached.content;
    }
    
    
    try {
      // Configure repomix options for targeted extraction
      const cliOptions: CliOptions = {
        style: 'markdown',
        stdout: true,
        compress: compress, // Configurable compression
        include: safeFiles.join(','), // Only include validated files
        removeComments: compress, // Remove comments if compressing
        removeEmptyLines: compress, // Remove empty lines if compressing
        noDirectoryStructure: true
      };

      // Capture stdout during repomix execution
      const context = await this.captureRepomixStdout(['.'], projectPath, cliOptions);
      
      // Cache the result
      this.cache.set(cacheKey, { content: context, timestamp: Date.now() });
      
      return context;
    } catch (error) {
      throw new Error(`Targeted repomix execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate repomix context for a project
   */
  async generateRepomixContext(projectPath: string, options: RepomixOptions = {}): Promise<string> {
    this.validateProjectPath(projectPath);
    
    // Check if adventure.config.json has specific files to include
    const configuredFiles = extractUniqueFilePaths(projectPath);
    
    if (configuredFiles.length > 0) {
      // Use configured files with optimized content generation
      console.log(`Using adventure.config.json: analyzing ${configuredFiles.length} configured files with optimization`);
      try {
        return await this.generateOptimizedContent(projectPath, configuredFiles);
      } catch (error) {
        console.warn(`Failed to generate optimized content, falling back to targeted content: ${error instanceof Error ? error.message : String(error)}`);
        try {
          return await this.generateTargetedContent(projectPath, configuredFiles);
        } catch (fallbackError) {
          console.warn(`Failed to generate targeted content, falling back to full repomix content: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
          // Fall through to full content generation
        }
      }
    }
    
    // Fallback: use existing behavior with all files (compressed)
    console.log('No adventure.config.json found: analyzing full codebase (compressed)');
    
    // Create cache key from path and options
    const cacheKey = `${path.resolve(projectPath)}:${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < REPOMIX_CACHE_TTL) {
      return cached.content;
    }
    
    
    try {
      // Build ignore patterns
      const ignorePatterns = [
        'node_modules', 'dist', 'build', '.git', 'coverage', '.nyc_output'
      ];
      
      if (!options.includeTests) {
        ignorePatterns.push('**/*.test.ts', '**/*.spec.ts', '**/tests/**', '**/test/**');
      }

      // Configure repomix options
      const cliOptions: CliOptions = {
        style: options.style || 'markdown',
        stdout: true,
        compress: options.compress !== false, // Default to true unless explicitly disabled
        ignore: ignorePatterns.join(','),
        removeComments: true,
        removeEmptyLines: true,
        noDirectoryStructure: true
      };

      // Capture stdout during repomix execution
      const context = await this.captureRepomixStdout(['.'], projectPath, cliOptions);
      
      // Cache the result
      this.cache.set(cacheKey, { content: context, timestamp: Date.now() });
      
      return context;
    } catch (error) {
      throw new Error(`Repomix execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Extract function-focused content from full repomix output
   * Optimizes token usage by keeping only essential code patterns
   */
  private extractFunctionFocusedContent(fullContent: string): string {
    const lines = fullContent.split('\n');
    const optimizedLines: string[] = [];
    let currentFile = '';
    let inCodeBlock = false;
    let codeBlockLanguage = '';
    let currentCodeBlock: string[] = [];
    let skipFile = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Track current file
      if (trimmedLine.startsWith('## File:') || trimmedLine.startsWith('# File:')) {
        currentFile = trimmedLine.replace(/^##?\s*File:\s*/, '');
        skipFile = this.shouldSkipFile(currentFile);
        
        if (!skipFile) {
          optimizedLines.push(line); // Keep file header
        }
        continue;
      }

      // Skip content for files we don't want
      if (skipFile) continue;

      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (!inCodeBlock) {
          // Starting a code block
          inCodeBlock = true;
          codeBlockLanguage = trimmedLine.replace('```', '');
          currentCodeBlock = [line];
        } else {
          // Ending a code block
          inCodeBlock = false;
          currentCodeBlock.push(line);
          
          // Process and add optimized code block
          const optimizedBlock = this.optimizeCodeBlock(currentCodeBlock, codeBlockLanguage);
          optimizedLines.push(...optimizedBlock);
          
          currentCodeBlock = [];
          codeBlockLanguage = '';
        }
        continue;
      }

      if (inCodeBlock) {
        currentCodeBlock.push(line);
        continue;
      }

      // For non-code content, apply basic filtering
      if (trimmedLine === '' || this.isUsefulNonCodeLine(trimmedLine)) {
        optimizedLines.push(line);
      }
    }

    return optimizedLines.join('\n');
  }

  /**
   * Check if we should skip processing this file entirely
   */
  private shouldSkipFile(filepath: string): boolean {
    const skipPatterns = [
      /\.test\./,
      /\.spec\./,
      /test\/|tests\//,
      /\.config\./,
      /\.json$/,
      /\.md$/,
      /node_modules/,
      /dist\/|build\//
    ];
    
    return skipPatterns.some(pattern => pattern.test(filepath));
  }

  /**
   * Check if a non-code line is useful to keep
   */
  private isUsefulNonCodeLine(line: string): boolean {
    // Keep headers, important descriptions, but skip verbose explanations
    return line.startsWith('#') || 
           line.includes('File:') ||
           line.includes('export') ||
           line.includes('import') ||
           (line.length > 0 && line.length < 100); // Keep short descriptive lines
  }

  /**
   * Optimize a code block by extracting essential functions and patterns
   */
  private shouldSkipLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed === '';
  }

  private updateBraceDepth(line: string, currentDepth: number): number {
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    return currentDepth + openBraces - closeBraces;
  }

  private processFunctionStart(line: string, trimmed: string, state: OptimizationState): void {
    if (state.inFunction && state.currentFunction.length > 0) {
      // Add previous function if it's important
      if (this.isImportantFunction(state.functionName)) {
        state.optimized.push(...state.currentFunction);
      }
    }
    
    // Start new function
    state.inFunction = true;
    state.functionName = this.extractFunctionName(trimmed);
    state.currentFunction = [line];
  }

  private processFunctionContent(line: string, trimmed: string, state: OptimizationState): void {
    state.currentFunction.push(line);
    
    // End function when we return to base level
    if (state.braceDepth === 0 && trimmed.includes('}')) {
      if (this.isImportantFunction(state.functionName)) {
        state.optimized.push(...state.currentFunction);
      }
      state.inFunction = false;
      state.currentFunction = [];
      state.functionName = '';
    }
  }

  private processTopLevelCode(line: string, trimmed: string, state: OptimizationState): void {
    // Keep top-level declarations, exports, imports
    if (this.isImportantTopLevel(trimmed)) {
      state.optimized.push(line);
    }
  }

  private optimizeCodeBlock(codeLines: string[], language: string): string[] {
    if (codeLines.length <= 2) return codeLines; // Keep short blocks as-is

    const state: OptimizationState = {
      optimized: [codeLines[0]], // Keep opening ```
      currentFunction: [],
      braceDepth: 0,
      inFunction: false,
      functionName: ''
    };
    
    const codeContent = codeLines.slice(1, -1); // Extract actual code

    for (const line of codeContent) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines for optimization
      if (this.shouldSkipLine(trimmed)) {
        continue;
      }

      // Track brace depth
      state.braceDepth = this.updateBraceDepth(line, state.braceDepth);

      // Detect function/method/class starts
      if (this.isFunctionStart(trimmed)) {
        this.processFunctionStart(line, trimmed, state);
        continue;
      }

      if (state.inFunction) {
        this.processFunctionContent(line, trimmed, state);
      } else {
        this.processTopLevelCode(line, trimmed, state);
      }
    }

    // Add any remaining function
    if (state.inFunction && state.currentFunction.length > 0 && this.isImportantFunction(state.functionName)) {
      state.optimized.push(...state.currentFunction);
    }

    state.optimized.push(codeLines[codeLines.length - 1]); // Keep closing ```
    return state.optimized;
  }

  /**
   * Check if a line starts a function, method, or class
   */
  private isFunctionStart(line: string): boolean {
    const functionPatterns = [
      /^(export\s+)?(async\s+)?function\s+/,
      /^(export\s+)?(default\s+)?class\s+/,
      /^(public|private|protected)\s+(async\s+)?[\w<>]+\s*\(/,
      /^\s*[\w<>]+\s*\([^)]*\)\s*\{/, // Arrow functions assigned to variables
      /^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(/, // Arrow functions
      /^(export\s+)?interface\s+/,
      /^(export\s+)?type\s+/
    ];
    
    return functionPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Extract function name from a function declaration line
   */
  private extractFunctionName(line: string): string {
    const matches = line.match(/(?:function\s+|class\s+|const\s+|interface\s+|type\s+)(\w+)/);
    return matches ? matches[1] : 'anonymous';
  }

  /**
   * Check if a function is important based on naming patterns
   */
  private isImportantFunction(name: string): boolean {
    const importantPatterns = [
      /^(setup|init|config|main|start|run|execute|handle|process|generate|analyze|parse|validate|create|build)/i,
      /^(get|set|load|save|read|write|update|delete|add|remove)/i,
      /(handler|manager|service|client|server|controller|processor|generator|analyzer)/i
    ];
    
    return importantPatterns.some(pattern => pattern.test(name)) || name.length <= 3; // Keep short names
  }

  /**
   * Check if a top-level line is important to keep
   */
  private isImportantTopLevel(line: string): boolean {
    return line.includes('export') ||
           line.includes('import') ||
           line.includes('interface') ||
           line.includes('type') ||
           line.includes('const') ||
           line.includes('let') ||
           line.includes('var');
  }

  /**
   * Use repomix CLI as subprocess to capture stdout with timeout and memory protection
   */
  private async captureRepomixStdout(directories: string[], cwd: string, options: CliOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      // Build repomix CLI arguments
      const args = [
        ...directories,
        '--stdout',
        '--style', options.style || 'markdown'
      ];
      
      if (options.compress) args.push('--compress');
      if (options.removeComments) args.push('--remove-comments');
      if (options.removeEmptyLines) args.push('--remove-empty-lines');
      if (options.noDirectoryStructure) args.push('--no-directory-structure');
      if (options.ignore) args.push('--ignore', options.ignore);
      if (options.include) args.push('--include', options.include);
      
      // Spawn repomix as subprocess
      const repomix = spawn('npx', ['repomix', ...args], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      let stdoutSize = 0;
      let isResolved = false;
      
      // Set up timeout with graceful then force kill
      const timeout = setTimeout(() => {
        if (!isResolved) {
          console.warn(`Repomix subprocess timeout (${REPOMIX_SUBPROCESS_TIMEOUT}ms), killing process...`);
          repomix.kill('SIGTERM');
          setTimeout(() => repomix.kill('SIGKILL'), REPOMIX_GRACEFUL_TIMEOUT);
          isResolved = true;
          reject(new Error(`Repomix subprocess timed out after ${REPOMIX_SUBPROCESS_TIMEOUT}ms (${cwd})`));
        }
      }, REPOMIX_SUBPROCESS_TIMEOUT);
      
      repomix.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdoutSize += chunk.length;
        
        // Memory protection
        if (stdoutSize > REPOMIX_MAX_BUFFER_SIZE) {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            repomix.kill('SIGKILL');
            reject(new Error(`Repomix output too large (${stdoutSize} bytes) for ${cwd}`));
          }
          return;
        }
        
        stdout += chunk;
      });
      
      repomix.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      repomix.on('close', (code) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          
          if (code === 0 && stdout.trim().length > 0) {
            resolve(stdout);
          } else {
            reject(new Error(`Repomix failed (exit ${code}): ${stderr.substring(0, 200)}`));
          }
        }
      });
      
      repomix.on('error', (error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          reject(new Error(`Repomix spawn failed: ${error.message}`));
        }
      });
    });
  }

  /**
   * Pre-trigger generation without waiting (for background preloading)
   */
  preGenerate(projectPath: string, options: RepomixOptions = {}): void {
    const cacheKey = `${path.resolve(projectPath)}:${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    
    // Only generate if not already cached
    if (!cached || (Date.now() - cached.timestamp) >= REPOMIX_CACHE_TTL) {
      this.generateRepomixContext(projectPath, options).catch(error => {
        console.error(`Pre-generation failed for ${projectPath}:`, error instanceof Error ? error.message : String(error));
      });
    }
  }

  /**
   * Cleanup resources (clear cache)
   */
  cleanup(): void {
    this.cache.clear();
  }
}

// Shared singleton instance to maintain cache state across the application
export const repoAnalyzer = new RepoAnalyzer();