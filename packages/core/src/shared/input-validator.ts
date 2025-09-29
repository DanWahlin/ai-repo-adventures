/**
 * Simplified input validation
 */

import { getAllThemes, isValidTheme, parseTheme } from './theme.js';
import { VALIDATION_MAX_CHOICE_LENGTH, VALIDATION_MAX_PATH_LENGTH, VALIDATION_MAX_DISPLAY_LENGTH } from './config.js';

// Simple validation functions instead of complex class
export function validateAdventureChoice(input: string): string {
  if (!input?.trim()) {
    throw new Error('Choice is required');
  }
  
  if (input.length > VALIDATION_MAX_CHOICE_LENGTH) {
    throw new Error(`Choice too long (max ${VALIDATION_MAX_CHOICE_LENGTH} characters)`);
  }
  
  return input.trim();
}

export function validateTheme(input: string): string {
  if (!input?.trim()) {
    throw new Error('Theme is required');
  }
  
  const normalized = input.toLowerCase().trim();
  const parsedTheme = parseTheme(normalized);
  
  if (!parsedTheme || !isValidTheme(parsedTheme)) {
    const validThemes = getAllThemes().map(t => t.key).join(', ');
    throw new Error(`Invalid theme. Valid themes: ${validThemes}`);
  }
  
  return parsedTheme;
}

export function validateProjectPath(input?: string): string {
  if (!input?.trim()) {
    return process.cwd();
  }
  
  if (input.length > VALIDATION_MAX_PATH_LENGTH) {
    throw new Error(`Project path too long (max ${VALIDATION_MAX_PATH_LENGTH} characters)`);
  }
  
  if (input.includes('\0')) {
    throw new Error('Project path contains invalid characters');
  }
  
  return input.trim();
}

export function sanitizeForDisplay(input: string, maxLength = VALIDATION_MAX_DISPLAY_LENGTH): string {
  if (!input) return '';
  
  return input
    .replace(/[<>{}"`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}