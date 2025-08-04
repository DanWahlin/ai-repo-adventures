/**
 * Simplified configuration for the MCP Repo Adventure system
 */

import { config } from 'dotenv';

// Load environment variables
config();

// Simple constants instead of complex nested objects
export const LLM_API_KEY = process.env.LLM_API_KEY || '';
export const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
export const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';
export const LLM_API_VERSION = process.env.LLM_API_VERSION || '2023-12-01-preview';
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// Timeouts in milliseconds
export const FILE_READ_TIMEOUT = 10000;
export const FILE_ANALYSIS_TIMEOUT = 30000;
export const LLM_REQUEST_TIMEOUT = 30000; // Increased from 15s to 30s for more reliable LLM responses
export const LLM_CACHE_TTL = 300000; // 5 minutes

// Analysis limits
export const MAX_SCAN_DEPTH = 3;
export const MAX_FILE_SIZE_MB = 10;
export const KEY_SOURCE_FILES = 10;
export const TOP_FUNCTIONS = 20;
export const TOP_CLASSES = 5;

// Cache settings
export const LLM_CACHE_SIZE = parseInt(process.env.LLM_CACHE_SIZE || '100');

// Adventure settings
export const MAX_ACTIVE_ADVENTURES = 5;
export const DEFAULT_THEME = 'space' as const;
export const MAX_FILE_LINES_FOR_LLM = 100;
export const MAX_FILES_PER_ADVENTURE = 3;

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

// Valid project types
export const VALID_PROJECT_TYPES = [
  'Web Application',
  'Mobile App', 
  'Desktop Application',
  'Library/Package',
  'API Service',
  'CLI Tool',
  'Data Science',
  'Game',
  'Unknown'
] as const;

export const isValidProjectType = (type: string): type is typeof VALID_PROJECT_TYPES[number] => {
  return VALID_PROJECT_TYPES.includes(type as any);
};