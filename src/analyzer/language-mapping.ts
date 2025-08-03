/**
 * Language mapping utilities shared across analyzer components
 * Provides consistent file extension to language detection
 */

import * as path from 'path';

/**
 * Language mapping configuration for different output formats
 */
export interface LanguageMappingConfig {
  // For CodeAnalyzer regex patterns (lowercase keys)
  codeAnalyzer: Record<string, string>;
  
  // For LinguistAnalyzer (GitHub language names)
  linguist: Record<string, string>;
  
  // For ProjectAnalyzer display (lowercase keys)
  display: Record<string, string>;
}

/**
 * Master language mapping configuration
 * Single source of truth for all file extension mappings
 */
const LANGUAGE_EXTENSIONS: LanguageMappingConfig = {
  codeAnalyzer: {
    // JavaScript
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.es6': 'javascript',
    '.es': 'javascript',
    
    // TypeScript
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.mts': 'typescript',
    '.cts': 'typescript',
    '.d.ts': 'typescript',
    
    // Python
    '.py': 'python',
    '.pyi': 'python',
    '.pyw': 'python',
    '.pyx': 'python',
    
    // Java
    '.java': 'java',
    '.jsp': 'java',
    
    // C#
    '.cs': 'csharp',
    '.csx': 'csharp',
    '.cake': 'csharp',
    
    // Go
    '.go': 'go',
    
    // Rust
    '.rs': 'rust'
  },

  linguist: {
    // JavaScript
    'js': 'JavaScript',
    'jsx': 'JavaScript',
    'mjs': 'JavaScript',
    'cjs': 'JavaScript',
    'es6': 'JavaScript',
    'es': 'JavaScript',
    
    // TypeScript
    'ts': 'TypeScript',
    'tsx': 'TypeScript',
    'mts': 'TypeScript',
    'cts': 'TypeScript',
    
    // Python
    'py': 'Python',
    'pyi': 'Python',
    'pyw': 'Python',
    'pyx': 'Python',
    
    // Java
    'java': 'Java',
    'jsp': 'Java',
    
    // C#
    'cs': 'C#',
    'csx': 'C#',
    'cake': 'C#',
    
    // Go & Rust
    'go': 'Go',
    'rs': 'Rust',
    
    // Other languages for LinguistAnalyzer
    'cpp': 'C++',
    'c': 'C',
    'h': 'C',
    'hpp': 'C++',
    'php': 'PHP',
    'rb': 'Ruby',
    'swift': 'Swift',
    'kt': 'Kotlin',
    'scala': 'Scala',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'sass': 'Sass',
    'less': 'Less',
    'json': 'JSON',
    'xml': 'XML',
    'yaml': 'YAML',
    'yml': 'YAML',
    'md': 'Markdown',
    'sql': 'SQL',
    'sh': 'Shell',
    'bash': 'Shell',
    'zsh': 'Shell',
    'fish': 'Shell',
  },

  display: {
    // Same as codeAnalyzer but without dots for consistency
    'js': 'javascript',
    'jsx': 'javascript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    'es6': 'javascript',
    'es': 'javascript',
    
    'ts': 'typescript',
    'tsx': 'typescript',
    'mts': 'typescript',
    'cts': 'typescript',
    'd.ts': 'typescript',
    
    'py': 'python',
    'pyi': 'python',
    'pyw': 'python',
    'pyx': 'python',
    
    'java': 'java',
    'jsp': 'java',
    
    'cs': 'csharp',
    'csx': 'csharp',
    'cake': 'csharp',
    
    'go': 'go',
    'rs': 'rust'
  }
};

/**
 * Detect language from file extension for CodeAnalyzer (regex patterns)
 */
export function detectLanguageForCodeAnalyzer(fileName: string): string | null {
  const ext = path.extname(fileName).toLowerCase();
  return LANGUAGE_EXTENSIONS.codeAnalyzer[ext] || null;
}

/**
 * Detect language from file extension for LinguistAnalyzer (GitHub language names)
 */
export function detectLanguageForLinguist(extension: string): string | null {
  return LANGUAGE_EXTENSIONS.linguist[extension.toLowerCase()] || null;
}

/**
 * Detect language from file path for ProjectAnalyzer (display purposes)
 */
export function detectLanguageForDisplay(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  // Remove the dot for display mapping lookup
  const extWithoutDot = ext.startsWith('.') ? ext.slice(1) : ext;
  return LANGUAGE_EXTENSIONS.display[extWithoutDot] || null;
}

/**
 * Get all supported extensions for a given language type
 */
export function getSupportedExtensions(type: keyof LanguageMappingConfig): string[] {
  return Object.keys(LANGUAGE_EXTENSIONS[type]);
}

/**
 * Check if an extension is supported for code analysis
 */
export function isCodeAnalysisSupported(fileName: string): boolean {
  return detectLanguageForCodeAnalyzer(fileName) !== null;
}

/**
 * Get language compatibility between Linguist and CodeAnalyzer
 */
export function getLanguageCompatibility(linguistLanguage: string): {
  isSupported: boolean;
  codeAnalyzerLanguage: string | null;
  confidence: 'high' | 'medium' | 'low';
} {
  const languageMap: Record<string, { codeAnalyzer: string; confidence: 'high' | 'medium' | 'low' }> = {
    'JavaScript': { codeAnalyzer: 'javascript', confidence: 'high' },
    'TypeScript': { codeAnalyzer: 'typescript', confidence: 'high' },
    'Python': { codeAnalyzer: 'python', confidence: 'high' },
    'Java': { codeAnalyzer: 'java', confidence: 'high' },
    'C#': { codeAnalyzer: 'csharp', confidence: 'high' },
    'Go': { codeAnalyzer: 'go', confidence: 'medium' },
    'Rust': { codeAnalyzer: 'rust', confidence: 'medium' },
    'JSX': { codeAnalyzer: 'javascript', confidence: 'high' },
    'TSX': { codeAnalyzer: 'typescript', confidence: 'high' },
  };

  const mapping = languageMap[linguistLanguage];
  if (mapping) {
    return {
      isSupported: true,
      codeAnalyzerLanguage: mapping.codeAnalyzer,
      confidence: mapping.confidence,
    };
  }

  return {
    isSupported: false,
    codeAnalyzerLanguage: null,
    confidence: 'low',
  };
}

/**
 * Export the raw configuration for advanced usage
 */
export { LANGUAGE_EXTENSIONS };