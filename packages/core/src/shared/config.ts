/**
 * Simplified configuration for the MCP Repo Adventure system
 */

import { config } from 'dotenv';

// Load environment variables
config({ quiet: true });

// Simple constants instead of complex nested objects
export const LLM_API_KEY = process.env.LLM_API_KEY || '';
export const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
export const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';
export const LLM_API_VERSION = process.env.LLM_API_VERSION || '2023-12-01-preview';
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// Timeouts in milliseconds
export const FILE_READ_TIMEOUT = 10000;
export const FILE_ANALYSIS_TIMEOUT = 30000;
export const LLM_REQUEST_TIMEOUT = parseInt(process.env.LLM_REQUEST_TIMEOUT || '60000'); // 60 seconds for complex story generation with large prompts, configurable via env
export const LLM_CACHE_TTL = 300000; // 5 minutes
export const REPOMIX_CACHE_TTL = parseInt(process.env.REPOMIX_CACHE_TTL || '60000'); // 60 seconds, configurable via env
export const REPOMIX_SUBPROCESS_TIMEOUT = parseInt(process.env.REPOMIX_SUBPROCESS_TIMEOUT || '120000'); // 2 minutes, configurable via env
export const REPOMIX_GRACEFUL_TIMEOUT = 5000; // 5 seconds for graceful shutdown before SIGKILL
export const REPOMIX_MAX_BUFFER_SIZE = 100 * 1024 * 1024; // 100MB max buffer to prevent memory exhaustion

// Analysis limits
export const MAX_SCAN_DEPTH = 3; // Maximum directory depth to prevent infinite recursion and keep analysis focused
export const MAX_FILE_SIZE_MB = 10; // Skip files larger than this to avoid memory issues and focus on source code
export const KEY_SOURCE_FILES = 10; // Number of key files to highlight in adventure generation
export const TOP_FUNCTIONS = 20; // Maximum functions to include in code analysis summaries
export const TOP_CLASSES = 5; // Maximum classes to include in analysis to keep stories focused

// LLM settings
export const LLM_CACHE_SIZE = parseInt(process.env.LLM_CACHE_SIZE || '100');
export const LLM_TEMPERATURE = parseFloat(process.env.LLM_TEMPERATURE || '0.7');
export const LLM_MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS || '4000');
export const LLM_MAX_TOKENS_STORY = Math.max(LLM_MAX_TOKENS, 8000); // Maximum tokens for story generation (use env var if higher)
export const LLM_MAX_TOKENS_QUEST = Math.max(LLM_MAX_TOKENS, 6000); // Maximum tokens for individual quest exploration content (use env var if higher)
export const LLM_MAX_TOKENS_DEFAULT = LLM_MAX_TOKENS; // Use env var or default to 4000

// GPT-5 specific settings
export const GPT5_VERBOSITY = (process.env.GPT5_VERBOSITY as 'low' | 'medium' | 'high') || 'medium';
export const GPT5_REASONING_EFFORT = (process.env.GPT5_REASONING_EFFORT as 'minimal' | 'medium' | 'high') || 'medium';

// Cache settings

// Adventure settings
export const DEFAULT_THEME = 'space' as const;
export const MAX_FILES_PER_QUEST = 3; // Limit files per quest to maintain focus and readability

// Token management and chunking configuration
export const MAX_CONTEXT_TOKENS = 128000; // Full 128k context window
export const ESTIMATED_TOKENS_PER_CHAR = 0.25; // Rough estimation: 4 chars per token

// Error settings
export const MAX_ERROR_MESSAGE_LENGTH = 200;
export const INCLUDE_STACK_TRACES = process.env.NODE_ENV === 'development';

// Default error messages
export const ERROR_MESSAGES = {
  LLM_UNAVAILABLE: 'LLM service is currently unavailable. Please check your configuration.',
  ANALYSIS_FAILED: 'Failed to analyze the project. Please ensure the path is valid.',
  THEME_INVALID: 'Invalid theme specified. Using default theme.',
  FILE_NOT_FOUND: 'The requested file could not be found.',
  PERMISSION_DENIED: 'Permission denied accessing the specified path.',
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

// Prompt file paths (relative to package root)
export const PROMPT_PATHS = {
  STORY_GENERATION: 'prompts/story-generation-prompt.md',
  QUEST_CONTENT: 'prompts/quest-content-prompt.md',
  COMPLETION: 'prompts/completion-prompt.md',
  THEME_GUIDELINES: 'prompts/theme-guidelines.json'
} as const;