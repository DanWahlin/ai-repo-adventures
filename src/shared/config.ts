/**
 * Centralized configuration management to eliminate magic strings and numbers
 * throughout the codebase and provide a single source of truth for all settings.
 */

// Core system configuration - replaces scattered magic numbers
export const CONFIG = {
  // Analysis configuration (previously scattered across ProjectAnalyzer)
  ANALYSIS: {
    MAX_DEPTH: 3,
    MAX_FILE_SIZE_MB: 10,
    TIMEOUT_MS: 30000,
    KEY_SOURCE_FILES_LIMIT: 10,
    TOP_FUNCTIONS: 20,
    TOP_CLASSES: 5,
    TOP_DEPENDENCIES: 20,
    SUMMARY_LINES: 10,
  },

  // LLM client configuration (previously in LLMClient.ts)
  LLM: {
    TIMEOUT_MS: 15000,
    CACHE_TTL_MS: 300000, // 5 minutes
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
  },

  // Adventure system configuration (previously in AdventureManager.ts)
  ADVENTURE: {
    MAX_ADVENTURES: 6,
    MIN_ADVENTURES: 2,
    SIMPLE_PROJECT_FILES: 50,
    MEDIUM_PROJECT_FILES: 200,
    COMPLEX_PROJECT_TECHNOLOGIES: 5,
    STORY_MAX_WORDS: 150,
    DESCRIPTION_MAX_WORDS: 50,
  },
} as const;

// Technology indicators for project analysis (consolidates duplicate logic)
export const TECH_INDICATORS = {
  React: ['react', 'jsx', 'tsx', '.jsx', '.tsx'],
  Vue: ['vue', '.vue', 'vue-router', 'vuex'], 
  Angular: ['angular', '@angular', '.component.ts', '.service.ts'],
  Node: ['node', 'nodejs', 'express', 'koa', 'fastify'],
  Database: ['database', 'db', 'sql', 'mongodb', 'postgres', 'mysql', 'sqlite'],
  API: ['api', 'rest', 'graphql', 'routes', 'controllers', 'endpoints'],
  Testing: ['test', 'spec', 'jest', 'mocha', 'cypress', 'playwright'],
  TypeScript: ['typescript', '.ts', '.tsx', 'tsconfig'],
  JavaScript: ['javascript', '.js', '.jsx'],
  Python: ['python', '.py', 'django', 'flask', 'fastapi'],
  Java: ['java', '.java', 'spring', 'gradle', 'maven'],
  Go: ['golang', '.go', 'gin', 'fiber'],
  Rust: ['rust', '.rs', 'cargo'],
  Docker: ['docker', 'dockerfile', 'docker-compose'],
  Kubernetes: ['kubernetes', 'k8s', '.yaml', '.yml'],
} as const;

// File extension to language mapping (removes duplication)
export const FILE_EXTENSIONS = {
  '.ts': 'typescript',
  '.js': 'javascript',
  '.tsx': 'tsx', 
  '.jsx': 'jsx',
  '.json': 'json',
  '.md': 'markdown',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.toml': 'toml',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.cpp': 'cpp',
  '.c': 'c',
  '.cs': 'csharp',
  '.php': 'php',
  '.rb': 'ruby',
  '.sh': 'bash',
} as const;

// Helper functions for configuration access
export class ConfigManager {
  /**
   * Get configuration value with type safety
   */
  static get<T extends keyof typeof CONFIG>(section: T): typeof CONFIG[T] {
    return CONFIG[section];
  }

  /**
   * Check if a file extension is supported
   */
  static isSupportedExtension(extension: string): extension is keyof typeof FILE_EXTENSIONS {
    return extension in FILE_EXTENSIONS;
  }

  /**
   * Get language for file extension
   */
  static getLanguageForExtension(extension: string): string {
    return this.isSupportedExtension(extension) ? FILE_EXTENSIONS[extension] : extension.slice(1);
  }

  /**
   * Determine project complexity based on metrics
   */
  static determineProjectComplexity(fileCount: number, techCount: number): 'simple' | 'medium' | 'complex' {
    if (fileCount >= CONFIG.ANALYSIS.KEY_SOURCE_FILES_LIMIT * 20 || techCount > CONFIG.ADVENTURE.COMPLEX_PROJECT_TECHNOLOGIES) {
      return 'complex';
    }
    if (fileCount >= CONFIG.ADVENTURE.SIMPLE_PROJECT_FILES || techCount >= 3) {
      return 'medium';
    }
    return 'simple';
  }

  /**
   * Get adventure count based on project complexity
   */
  static getAdventureCount(complexity: 'simple' | 'medium' | 'complex'): { min: number; max: number } {
    switch (complexity) {
      case 'simple':
        return { min: 2, max: 3 };
      case 'medium':
        return { min: 3, max: 4 };
      case 'complex':
        return { min: 5, max: 6 };
      default:
        return { min: CONFIG.ADVENTURE.MIN_ADVENTURES, max: CONFIG.ADVENTURE.MAX_ADVENTURES };
    }
  }
}