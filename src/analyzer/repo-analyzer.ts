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

export class RepoAnalyzer {
  private cache = new Map<string, { content: string; timestamp: number }>();

  constructor() {}

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
      // Use configured files with targeted content generation
      console.log(`Using adventure.config.json: analyzing ${configuredFiles.length} configured files`);
      try {
        return await this.generateTargetedContent(projectPath, configuredFiles);
      } catch (error) {
        console.warn(`Failed to generate targeted content, falling back to full repomix content: ${error instanceof Error ? error.message : String(error)}`);
        // Fall through to full content generation
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