/**
 * Centralized configuration for the MCP Repo Adventure system
 * All timeouts, limits, and constants are defined here for easy maintenance
 */

import { config } from 'dotenv';

// Load environment variables
config();

// Environment configuration
export const ENV_CONFIG = {
  // LLM Configuration
  LLM_API_KEY: process.env.LLM_API_KEY || '',
  LLM_BASE_URL: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
  LLM_MODEL: process.env.LLM_MODEL || 'gpt-4o-mini',
  LLM_API_VERSION: process.env.LLM_API_VERSION || '2023-12-01-preview',
  
  // GitHub Configuration
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
} as const;

// Timeout configuration (in milliseconds)
export const TIMEOUTS = {
  // File operations
  FILE_READ: 10000,
  FILE_ANALYSIS: 30000,
  
  // LLM operations
  LLM_REQUEST: 15000,
  LLM_CACHE: 300000, // 5 minutes
  
  // Network operations
  NETWORK_REQUEST: 10000,
} as const;

// Cache configuration to prevent memory leaks
export const CACHE_CONFIG = {
  LLM_MAX_SIZE: parseInt(process.env.LLM_CACHE_SIZE || '100'),
  LLM_CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  // Other cache configurations can be added here
} as const;

// Analysis limits and constraints
export const ANALYSIS_LIMITS = {
  // File system scanning
  MAX_SCAN_DEPTH: 3,
  MAX_FILE_SIZE_MB: 10,
  
  // Code analysis
  KEY_SOURCE_FILES: 10,
  TOP_FUNCTIONS: 20,
  TOP_CLASSES: 5,
  TOP_DEPENDENCIES: 20,
  SUMMARY_LINES: 10,
  
  // Story generation specific limits
  STORY_TOP_FUNCTIONS: 8,
  STORY_TOP_CLASSES: 5,
  STORY_TOP_DEPENDENCIES_PER_CATEGORY: 3,
  STORY_TOP_DIRECTORIES: 8,
  STORY_TOP_SOURCE_FILES: 10,
  STORY_TOP_EXECUTION_FLOW: 5,
} as const;

// File patterns for technology detection
export const TECH_PATTERNS = {
  REACT: ['react', 'jsx', 'tsx', '.jsx', '.tsx'],
  VUE: ['vue', '.vue', '@vue'],
  ANGULAR: ['@angular', 'angular.json', 'ng-cli', 'ng-serve', 'ng-build'],
  DATABASE: ['database', 'db', 'sql', 'mongodb', 'postgres', 'mysql', 'sqlite'],
  API: ['api', 'rest', 'graphql', 'routes', 'controllers', 'endpoints'],
  TESTING: ['test', 'spec', 'jest', 'mocha', 'cypress', 'playwright'],
  TYPESCRIPT: ['typescript', 'ts', '.ts', 'tsconfig'],
  JAVASCRIPT: ['javascript', 'js', '.js', 'package.json'],
  PYTHON: ['python', 'py', '.py', 'requirements.txt', 'setup.py'],
  DOCKER: ['docker', 'dockerfile', 'compose', '.dockerignore'],
  BUILD_TOOLS: ['webpack', 'vite', 'rollup', 'parcel', 'esbuild'],
} as const;

// Directory patterns to ignore during scanning
export const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'coverage',
  '.nyc_output',
  'logs',
  '*.log',
  '.env',
  '.DS_Store',
  'Thumbs.db',
] as const;

// Adventure system configuration
export const ADVENTURE_CONFIG = {
  // Maximum number of adventures a user can have active
  MAX_ACTIVE_ADVENTURES: 5,
  
  // Default theme if none specified 
  // Note: Should match the first theme in THEMES object in theme.ts
  DEFAULT_THEME: 'space' as const,
  
  // Progress tracking
  MIN_EXPLORATION_FOR_PROGRESS: 3,
  
  // Character generation
  MAX_CHARACTERS_PER_STORY: 8,
  DEFAULT_CHARACTERS_COUNT: 3,
  
  // File content processing
  MAX_FILE_LINES_FOR_LLM: 100,
  MAX_FILES_PER_ADVENTURE: 3,
} as const;

// Error handling configuration
export const ERROR_CONFIG = {
  // Maximum error message length for user display
  MAX_ERROR_MESSAGE_LENGTH: 200,
  
  // Whether to include stack traces in error responses
  INCLUDE_STACK_TRACES: process.env.NODE_ENV === 'development',
  
  // Default error messages
  DEFAULT_MESSAGES: {
    LLM_UNAVAILABLE: 'LLM service is currently unavailable. Please check your configuration.',
    ANALYSIS_FAILED: 'Failed to analyze the project. Please ensure the path is valid.',
    THEME_INVALID: 'Invalid theme specified. Using default theme.',
    FILE_NOT_FOUND: 'The requested file could not be found.',
    PERMISSION_DENIED: 'Permission denied accessing the specified path.',
  },
} as const;

// Validation patterns
export const VALIDATION = {
  // Theme validation is now handled by src/shared/theme.ts
  
  // Project type validation
  VALID_PROJECT_TYPES: [
    'Web Application',
    'Mobile App', 
    'Desktop Application',
    'Library/Package',
    'API Service',
    'CLI Tool',
    'Data Science',
    'Game',
    'Unknown'
  ] as const,
} as const;

// Export helper functions for configuration access
export const getTimeout = (operation: keyof typeof TIMEOUTS): number => {
  return TIMEOUTS[operation];
};

export const getLimit = (limit: keyof typeof ANALYSIS_LIMITS): number => {
  return ANALYSIS_LIMITS[limit];
};


export const isValidProjectType = (type: string): type is typeof VALIDATION.VALID_PROJECT_TYPES[number] => {
  return VALIDATION.VALID_PROJECT_TYPES.includes(type as any);
};