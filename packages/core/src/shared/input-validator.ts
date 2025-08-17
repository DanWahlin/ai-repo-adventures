/**
 * Simplified input validation
 */

import { getAllThemes, isValidTheme, parseTheme } from './theme.js';

// Simple validation functions instead of complex class
export function validateAdventureChoice(input: string): string {
  if (!input?.trim()) {
    throw new Error('Choice is required');
  }
  
  if (input.length > 200) {
    throw new Error('Choice too long (max 200 characters)');
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
  
  if (input.length > 500) {
    throw new Error('Project path too long (max 500 characters)');
  }
  
  if (input.includes('\0')) {
    throw new Error('Project path contains invalid characters');
  }
  
  return input.trim();
}

export function sanitizeForDisplay(input: string, maxLength = 1000): string {
  if (!input) return '';
  
  return input
    .replace(/[<>{}"`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}