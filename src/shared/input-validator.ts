/**
 * Comprehensive input validation system with whitelist-based security
 */

import { getAllThemes, THEME_NUMBER_MAP, isValidTheme, parseTheme } from './theme.js';

export interface ValidationResult {
  isValid: boolean;
  sanitized: string;
  error?: string;
}

export class InputValidator {
  
  /**
   * Validate adventure choice input (numbers, adventure IDs, or titles)
   */
  static validateAdventureChoice(input: string): ValidationResult {
    if (!input || typeof input !== 'string') {
      return { isValid: false, sanitized: '', error: 'Choice must be a non-empty string' };
    }

    // Whitelist approach: only allow safe characters for adventure selection
    // Allow: letters, numbers, spaces, hyphens, underscores, colons, forward slashes, periods, parentheses
    const safeCharacterPattern = /^[a-zA-Z0-9\s\-_:/.()]+$/;
    
    if (!safeCharacterPattern.test(input)) {
      return { 
        isValid: false, 
        sanitized: '', 
        error: 'Choice contains invalid characters. Only letters, numbers, spaces, and basic punctuation allowed.' 
      };
    }

    // Length validation to prevent DoS
    if (input.length > 200) {
      return { 
        isValid: false, 
        sanitized: '', 
        error: 'Choice is too long. Maximum 200 characters allowed.' 
      };
    }

    // Normalize whitespace and trim
    const sanitized = input.replace(/\s+/g, ' ').trim();
    
    // Additional security: reject if it looks like code injection attempts
    const dangerousPatterns = [
      /[<>]/,                    // HTML/XML tags
      /[{}]/,                    // Template literals or code blocks
      /["`]/,                    // String delimiters that could escape context
      /\$\{/,                    // Template literal syntax
      /javascript:/i,            // JavaScript protocol
      /data:/i,                  // Data URLs
      /eval\s*\(/i,             // Eval calls
      /function\s*\(/i,         // Function definitions
      /=\s*>/,                  // Arrow functions
      /import\s+/i,             // ES6 imports
      /require\s*\(/i,          // CommonJS requires
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized)) {
        return { 
          isValid: false, 
          sanitized: '', 
          error: 'Choice contains potentially dangerous content.' 
        };
      }
    }

    return { isValid: true, sanitized };
  }

  /**
   * Validate theme input using centralized theme system
   */
  static validateTheme(input: string): ValidationResult {
    if (!input || typeof input !== 'string') {
      return { isValid: false, sanitized: '', error: 'Theme must be a non-empty string' };
    }

    const normalized = input.toLowerCase().trim();

    // Get all valid themes and their IDs dynamically
    const allThemes = getAllThemes();
    const validThemeNames = allThemes.map(t => t.key);
    const validThemeNumbers = allThemes.map(t => t.id.toString());
    const allValidInputs = [...validThemeNames, ...validThemeNumbers];

    // Check if input matches any valid theme name or number
    if (!allValidInputs.includes(normalized)) {
      return { 
        isValid: false, 
        sanitized: '', 
        error: `Invalid theme. Must be one of: ${allValidInputs.join(', ')}` 
      };
    }

    // Use centralized parsing logic to convert input to theme key
    const parsedTheme = parseTheme(normalized);
    
    if (!parsedTheme) {
      return { 
        isValid: false, 
        sanitized: '', 
        error: 'Failed to parse theme from input' 
      };
    }

    // Final validation using centralized theme validation
    if (!isValidTheme(parsedTheme)) {
      return { 
        isValid: false, 
        sanitized: '', 
        error: 'Theme not supported by system' 
      };
    }

    return { isValid: true, sanitized: parsedTheme };
  }

  /**
   * Validate project path input (delegated to FileSystemScanner for path-specific security)
   */  
  static validateProjectPath(input: string | undefined): ValidationResult {
    // Allow undefined/empty for default to current directory
    if (!input || input.trim() === '') {
      return { isValid: true, sanitized: process.cwd() };
    }

    if (typeof input !== 'string') {
      return { isValid: false, sanitized: '', error: 'Project path must be a string' };
    }

    // Basic length check
    if (input.length > 500) {
      return { 
        isValid: false, 
        sanitized: '', 
        error: 'Project path is too long. Maximum 500 characters allowed.' 
      };
    }

    // Check for null bytes and other dangerous characters
    if (input.includes('\0') || input.includes('\x00')) {
      return { 
        isValid: false, 
        sanitized: '', 
        error: 'Project path contains illegal characters' 
      };
    }

    // Basic whitelist for path characters (the FileSystemScanner will do detailed validation)
    const pathCharacterPattern = /^[a-zA-Z0-9\s\-_./\\:~]+$/;
    if (!pathCharacterPattern.test(input)) {
      return { 
        isValid: false, 
        sanitized: '', 
        error: 'Project path contains invalid characters' 
      };
    }

    const sanitized = input.trim();
    return { isValid: true, sanitized };
  }

  /**
   * General purpose string sanitization for display purposes
   */
  static sanitizeForDisplay(input: string, maxLength: number = 1000): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/[<>]/g, '') // Remove HTML brackets
      .replace(/[{}]/g, '') // Remove template literal brackets  
      .replace(/["`]/g, '') // Remove string delimiters
      .replace(/\x00/g, '') // Remove null bytes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .slice(0, maxLength);
  }
}