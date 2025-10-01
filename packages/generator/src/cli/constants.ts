/**
 * Configuration constants for HTML Adventure Generator
 * Centralizes magic numbers and configuration values for better maintainability
 */

export const RETRY_CONFIG = {
  /** Maximum retry attempts for quest generation */
  MAX_QUEST_RETRIES: 3,
  /** Maximum retry attempts for theme generation in sequential mode */
  MAX_THEME_RETRIES: 3,
  /** Default wait time in seconds after hitting rate limit */
  RATE_LIMIT_WAIT_SECONDS: 60,
  /** Delay in milliseconds between retry attempts */
  RETRY_DELAY_MS: 2000,
} as const;

export const SERVER_CONFIG = {
  /** Default HTTP server port */
  DEFAULT_PORT: 8080,
  /** Delay before opening browser after server starts (ms) */
  BROWSER_OPEN_DELAY_MS: 1000,
} as const;

export const FILE_PATTERNS = {
  /** Supported file extensions for code linking */
  SUPPORTED_EXTENSIONS: ['ts', 'js', 'tsx', 'jsx', 'css', 'json', 'md', 'py', 'java', 'go', 'rs', 'cpp', 'c', 'h', 'hpp', 'php', 'rb', 'swift', 'kt', 'scala', 'clj', 'hs', 'ml', 'fs', 'ex', 'exs', 'elm', 'dart', 'lua', 'r', 'm', 'pl', 'sh', 'bat', 'ps1', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'properties'] as const,
} as const;

export const THEME_ICONS = {
  space: { theme: '🚀', quest: '⭐' },
  ancient: { theme: '🏛️', quest: '📜' },
  mythical: { theme: '🧙‍♂️', quest: '⚔️' },
  developer: { theme: '💻', quest: '📋' },
  custom: { theme: '🎨', quest: '⭐' }
} as const;

export const DEFAULT_PATHS = {
  /** Default output directory for generated HTML */
  OUTPUT_DIR: './public',
  /** Default directory for LLM output logs */
  LLM_LOG_DIR: '.ai-repo-adventures/llm-output',
} as const;

export const PARSING_CONFIG = {
  /** Keywords to skip when scanning for functions */
  SKIP_KEYWORDS: ['if', 'for', 'while', 'switch', 'catch', 'return', 'const', 'let', 'var'] as const,
} as const;