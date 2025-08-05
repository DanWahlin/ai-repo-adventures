/**
 * Simple Repomix Wrapper
 * 
 * This analyzer runs repomix to get the codebase context and returns it.
 * No complex analysis - just pure repomix output for the LLM to use directly.
 */

import type { CliOptions } from 'repomix';
import * as path from 'path';
import { spawn } from 'child_process';
import { REPOMIX_CACHE_TTL } from '../shared/config.js';

export interface RepomixOptions {
  compress?: boolean;
  includeTests?: boolean;
  style?: 'xml' | 'markdown' | 'plain';
}

export class RepomixAnalyzer {
  private cache = new Map<string, { content: string; timestamp: number }>();

  constructor() {}

  /**
   * Validate project path for security
   */
  private validateProjectPath(projectPath: string): void {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('Project path must be a non-empty string');
    }

    const trimmedPath = projectPath.trim();
    if (!trimmedPath) {
      throw new Error('Project path must be a non-empty string');
    }

    // Check for dangerous system directories
    const dangerousPaths = [
      '/etc/', '/bin/', '/usr/bin/', '/sbin/', '/usr/sbin/',
      '/root/', '/boot/', '/dev/', '/proc/', '/sys/'
    ];

    const normalizedPath = path.resolve(trimmedPath);
    for (const dangerous of dangerousPaths) {
      if (normalizedPath.startsWith(dangerous)) {
        throw new Error(`Project path cannot access system directory: ${dangerous}`);
      }
    }

    if (trimmedPath.includes('..')) {
      throw new Error('Project path cannot contain path traversal sequences (..)');
    }
  }

  /**
   * Generate repomix context for a project
   */
  async generateRepomixContext(projectPath: string, options: RepomixOptions = {}): Promise<string> {
    this.validateProjectPath(projectPath);
    
    // Create cache key from path and options
    const cacheKey = `${path.resolve(projectPath)}:${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < REPOMIX_CACHE_TTL) {
      console.log('📋 Using cached repomix content');
      return cached.content;
    }
    
    const startTime = Date.now();
    
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
        compress: options.compress || false,
        ignore: ignorePatterns.join(','),
        removeComments: true,
        removeEmptyLines: true,
        noDirectoryStructure: true
      };

      // Capture stdout during repomix execution
      const context = await this.captureRepomixStdout(['.'], projectPath, cliOptions);
      
      // Cache the result
      this.cache.set(cacheKey, { content: context, timestamp: Date.now() });
      
      console.log(`✅ Repomix context generation completed in ${Date.now() - startTime}ms`);
      
      return context;
    } catch (error) {
      throw new Error(`Repomix execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Use repomix CLI as subprocess to capture stdout
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
      
      // Spawn repomix as subprocess
      const repomix = spawn('npx', ['repomix', ...args], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      repomix.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      repomix.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      repomix.on('close', (code) => {
        if (code === 0 && stdout.length > 100) {
          resolve(stdout);
        } else {
          reject(new Error(`Repomix subprocess failed (exit code: ${code}). Stdout: ${stdout.substring(0, 200)}. Stderr: ${stderr.substring(0, 200)}`));
        }
      });
      
      repomix.on('error', (error) => {
        reject(new Error(`Failed to spawn repomix subprocess: ${error.message}`));
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
export const repomixAnalyzer = new RepomixAnalyzer();