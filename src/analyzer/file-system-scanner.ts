/**
 * FileSystemScanner - Handles directory scanning and file discovery
 * Extracted from ProjectAnalyzer to focus on filesystem operations
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ANALYSIS_LIMITS, TIMEOUTS, TECH_PATTERNS } from '../shared/index.js';
import type { ProjectStructure, ScanResult, AnalysisConfig } from './types.js';

export class FileSystemScanner {
  private config: AnalysisConfig;

  constructor(config?: Partial<AnalysisConfig>) {
    this.config = {
      maxDepth: ANALYSIS_LIMITS.MAX_SCAN_DEPTH,
      maxFileSizeMB: ANALYSIS_LIMITS.MAX_FILE_SIZE_MB,
      timeoutMs: TIMEOUTS.FILE_ANALYSIS,
      keySourceFiles: ANALYSIS_LIMITS.KEY_SOURCE_FILES,
      topFunctions: ANALYSIS_LIMITS.TOP_FUNCTIONS,
      topClasses: ANALYSIS_LIMITS.TOP_CLASSES,
      topDependencies: ANALYSIS_LIMITS.TOP_DEPENDENCIES,
      summaryLines: ANALYSIS_LIMITS.SUMMARY_LINES,
      ...config
    };
  }

  /**
   * Validate and normalize project path
   */
  private validateProjectPath(projectPath: string): string {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('Project path must be a non-empty string');
    }

    const resolvedPath = path.resolve(projectPath);
    
    // Security check: prevent path traversal attacks
    if (resolvedPath.includes('..') || resolvedPath.includes('~')) {
      throw new Error('Invalid project path: path traversal detected');
    }

    // Validate it's not a dangerous system directory
    // Allow /var since temp directories are often there (e.g., /var/folders on macOS)
    const systemDirs = ['/bin', '/usr/bin', '/usr/sbin', '/etc', '/sys', '/proc'];
    if (systemDirs.some(dir => resolvedPath === dir || resolvedPath.startsWith(dir + '/'))) {
      throw new Error('Invalid project path: system directory not allowed');
    }

    return resolvedPath;
  }

  /**
   * Check if path exists and is accessible
   */
  private async isValidProjectPath(projectPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(projectPath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * Main scanning method - orchestrates the scanning process
   */
  async scanProject(projectPath: string): Promise<ScanResult> {

    try {
      const validatedPath = this.validateProjectPath(projectPath);
      
      if (!(await this.isValidProjectPath(validatedPath))) {
        throw new Error(`Project path does not exist or is not accessible: ${validatedPath}`);
      }

      // Scan directory structure
      const structure = await this.scanDirectory(validatedPath, this.config.maxDepth);
      
      // Count total files
      const fileCount = await this.countFiles(validatedPath, this.config.maxDepth);
      
      // Identify technologies from file structure
      const technologies = this.identifyTechnologies(structure);

      return {
        structure,
        fileCount,
        technologies
      };
    } catch (error) {
      throw new Error(`Failed to scan project: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Recursively scan directory structure
   */
  private async scanDirectory(dirPath: string, maxDepth = this.config.maxDepth, currentDepth = 0): Promise<ProjectStructure> {
    const structure: ProjectStructure = {
      directories: [],
      importantFiles: [],
      configFiles: [],
      sourceFiles: []
    };

    if (currentDepth >= maxDepth) {
      return structure;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (this.shouldSkip(entry.name)) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(process.cwd(), fullPath);

        if (entry.isDirectory()) {
          structure.directories.push(relativePath);
          
          // Recursively scan subdirectories
          const subStructure = await this.scanDirectory(fullPath, maxDepth, currentDepth + 1);
          structure.directories.push(...subStructure.directories);
          structure.importantFiles.push(...subStructure.importantFiles);
          structure.configFiles.push(...subStructure.configFiles);
          structure.sourceFiles.push(...subStructure.sourceFiles);
        } else if (entry.isFile()) {
          if (this.isImportantFile(entry.name)) {
            structure.importantFiles.push(relativePath);
          }
          
          if (this.isConfigFile(entry.name)) {
            structure.configFiles.push(relativePath);
          }
          
          if (this.isSourceFile(entry.name)) {
            structure.sourceFiles.push(relativePath);
          }
        }
      }
    } catch (error) {
      // Log warning but continue scanning
      console.warn(`Warning: Could not scan directory ${dirPath}:`, error instanceof Error ? error.message : String(error));
    }

    return structure;
  }

  /**
   * Count total files in project
   */
  private async countFiles(dirPath: string, maxDepth = this.config.maxDepth, currentDepth = 0): Promise<number> {
    if (currentDepth >= maxDepth) {
      return 0;
    }

    let count = 0;
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (this.shouldSkip(entry.name)) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          count += await this.countFiles(fullPath, maxDepth, currentDepth + 1);
        } else if (entry.isFile()) {
          count++;
        }
      }
    } catch (error) {
      // Silently continue on permission errors
    }

    return count;
  }

  /**
   * Identify technologies based on file patterns and names
   */
  private identifyTechnologies(structure: ProjectStructure): string[] {
    const technologies: Set<string> = new Set();
    const allFiles = [...structure.sourceFiles, ...structure.configFiles, ...structure.importantFiles];

    for (const [tech, indicators] of Object.entries(TECH_PATTERNS)) {
      for (const indicator of (indicators as readonly string[])) {
        const found = allFiles.some(file => 
          file.toLowerCase().includes(indicator.toLowerCase()) ||
          path.basename(file).toLowerCase().includes(indicator.toLowerCase())
        );
        
        if (found) {
          technologies.add(tech);
          break; // Found this tech, no need to check other indicators
        }
      }
    }

    return Array.from(technologies);
  }

  /**
   * Check if file/directory should be skipped
   */
  private shouldSkip(name: string): boolean {
    const skipPatterns = [
      'node_modules', '.git', '.svn', '.hg', '.bzr',
      'dist', 'build', 'coverage', '.nyc_output',
      'tmp', 'temp', '.cache', '.DS_Store',
      'Thumbs.db', '*.log', '.env.local', '.env.*.local'
    ];

    return skipPatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(name);
      }
      return name === pattern || name.startsWith(pattern);
    });
  }

  /**
   * Check if file is considered important for analysis
   */
  private isImportantFile(filename: string): boolean {
    const important = [
      'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
      'README.md', 'readme.md', 'README.txt', 'CHANGELOG.md',
      'LICENSE', 'LICENSE.md', 'LICENSE.txt',
      'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
      '.gitignore', '.npmignore', '.dockerignore'
    ];
    return important.includes(filename.toLowerCase());
  }

  /**
   * Check if file is a configuration file
   */
  private isConfigFile(filename: string): boolean {
    const config = [
      'tsconfig.json', 'jsconfig.json', 'webpack.config.js', 'webpack.config.ts',
      'babel.config.js', 'babel.config.json', '.babelrc', '.babelrc.json',
      'eslint.config.js', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml',
      'prettier.config.js', '.prettierrc', '.prettierrc.json',
      'jest.config.js', 'jest.config.ts', 'jest.config.json',
      'rollup.config.js', 'vite.config.js', 'vite.config.ts',
      'next.config.js', 'nuxt.config.js', 'vue.config.js',
      '.env', '.env.example', '.env.template'
    ];
    return config.includes(filename.toLowerCase()) || 
           filename.endsWith('.config.js') || 
           filename.endsWith('.config.ts') ||
           filename.endsWith('.config.json');
  }

  /**
   * Check if file is a source code file
   */
  private isSourceFile(filename: string): boolean {
    const sourceExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
      '.py', '.java', '.go', '.rs', '.cpp', '.c', '.cs',
      '.php', '.rb', '.swift', '.kt', '.dart', '.scala'
    ];
    return sourceExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  /**
   * Get current configuration
   */
  getConfig(): AnalysisConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}