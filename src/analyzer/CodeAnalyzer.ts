/**
 * CodeAnalyzer - Multi-language code parser using comprehensive regex patterns
 * Supports JavaScript, TypeScript, Python, Java, C#, and more
 */

import * as path from 'path';
import type { FunctionInfo, ClassInfo, ParseResult, AnalysisConfig } from './types.js';

export class CodeAnalyzer {
  private static instance: CodeAnalyzer | null = null;

  constructor(_config: AnalysisConfig) {
    // Config may be used for future enhancements
  }

  /**
   * Get or create singleton instance
   */
  static async getInstance(config: AnalysisConfig): Promise<CodeAnalyzer> {
    if (!CodeAnalyzer.instance) {
      CodeAnalyzer.instance = new CodeAnalyzer(config);
    }
    return CodeAnalyzer.instance;
  }

  /**
   * Analyze any file using multi-language regex parsing
   */
  async analyzeFile(content: string, fileName: string): Promise<ParseResult> {
    const language = this.detectLanguage(fileName);
    if (!language) {
      return { functions: [], classes: [] };
    }

    // Use comprehensive regex-based extraction for all languages
    return this.extractCodeElements(content, fileName, language);
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(fileName: string): string | null {
    const ext = path.extname(fileName).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.mjs': 'javascript',
      '.py': 'python',
      '.pyi': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust'
    };
    return languageMap[ext] || null;
  }

  /**
   * Comprehensive regex-based extraction for all languages
   */
  private extractCodeElements(content: string, fileName: string, language: string): ParseResult {
    const functions: FunctionInfo[] = [];
    const classes: ClassInfo[] = [];

    // Comprehensive language-specific regex patterns
    const patterns: Record<string, { functions: RegExp[], classes: RegExp[] }> = {
      javascript: {
        functions: [
          // Function declarations
          /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/gm,
          // Arrow functions with const/let/var
          /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/gm,
          // Method definitions in objects
          /(\w+)\s*:\s*(?:async\s+)?function\s*\([^)]*\)/gm,
          // Shorthand methods in objects
          /(\w+)\s*\([^)]*\)\s*\{/gm,
          // Class methods
          /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/gm
        ],
        classes: [
          /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?/gm
        ]
      },
      typescript: {
        functions: [
          // Function declarations with types
          /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)(?:\s*:\s*[^{]+)?/gm,
          // Arrow functions with types
          /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*:\s*[^=]*=\s*(?:async\s+)?\([^)]*\)\s*=>/gm,
          // Simple arrow functions
          /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/gm,
          // Method signatures in interfaces
          /(\w+)\s*\([^)]*\)(?:\s*:\s*[^;]+)?[;}]/gm,
          // Class methods with types
          /(?:public|private|protected|static|\s)*(?:async\s+)?(\w+)\s*\([^)]*\)(?:\s*:\s*[^{]+)?/gm
        ],
        classes: [
          /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?/gm,
          /(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+[\w,\s]+)?/gm,
          /(?:export\s+)?type\s+(\w+)\s*=/gm,
          /(?:export\s+)?enum\s+(\w+)/gm
        ]
      },
      python: {
        functions: [
          // Regular function definitions
          /def\s+(\w+)\s*\([^)]*\)(?:\s*->\s*[^:]+)?:/gm,
          // Async function definitions
          /async\s+def\s+(\w+)\s*\([^)]*\)(?:\s*->\s*[^:]+)?:/gm,
          // Class methods (including @decorators)
          /(?:@\w+\s*\n\s*)?def\s+(\w+)\s*\([^)]*\)(?:\s*->\s*[^:]+)?:/gm
        ],
        classes: [
          /class\s+(\w+)(?:\([^)]*\))?:/gm
        ]
      },
      java: {
        functions: [
          // Method declarations
          /(?:public|private|protected|static|\s)+\s+\w+\s+(\w+)\s*\([^)]*\)/gm,
          // Constructor declarations
          /(?:public|private|protected|\s)+(\w+)\s*\([^)]*\)\s*\{/gm
        ],
        classes: [
          /(?:public|private|protected|\s)*class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?/gm,
          /(?:public|private|protected|\s)*interface\s+(\w+)(?:\s+extends\s+[\w,\s]+)?/gm,
          /(?:public|private|protected|\s)*enum\s+(\w+)/gm
        ]
      },
      csharp: {
        functions: [
          // Method declarations
          /(?:public|private|protected|internal|static|\s)+\s+\w+\s+(\w+)\s*\([^)]*\)/gm,
          // Property declarations
          /(?:public|private|protected|internal|static|\s)+\s+\w+\s+(\w+)\s*\{[^}]*\}/gm
        ],
        classes: [
          /(?:public|private|protected|internal|\s)*class\s+(\w+)(?:\s*:\s*[\w,\s]+)?/gm,
          /(?:public|private|protected|internal|\s)*interface\s+(\w+)(?:\s*:\s*[\w,\s]+)?/gm,
          /(?:public|private|protected|internal|\s)*struct\s+(\w+)(?:\s*:\s*[\w,\s]+)?/gm,
          /(?:public|private|protected|internal|\s)*enum\s+(\w+)/gm
        ]
      }
    };

    const langPatterns = patterns[language];
    if (!langPatterns) {
      console.warn(`No patterns defined for language: ${language}`);
      return { functions: [], classes: [] };
    }

    // Extract functions
    langPatterns.functions.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1];
        if (name && this.isValidIdentifier(name)) {
          const lineNumber = this.getLineNumber(content, match.index!);
          const params = this.extractParameters(match[0], language);
          
          const returnType = this.extractReturnType(match[0], language);
          functions.push({
            name,
            summary: this.generateFunctionSummary(name, params, language),
            parameters: params,
            ...(returnType && { returnType }),
            isAsync: /\basync\b/.test(match[0]),
            isExported: /\bexport\b/.test(match[0]),
            fileName,
            lineNumber,
            source: 'regex',
            language
          });
        }
      }
    });

    // Extract classes
    langPatterns.classes.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1];
        if (name && this.isValidIdentifier(name)) {
          const lineNumber = this.getLineNumber(content, match.index!);
          const classContent = this.extractClassContent(content, match.index!, language);
          const methods = this.extractClassMethods(classContent, language);
          const properties = this.extractClassProperties(classContent, language);

          classes.push({
            name,
            summary: this.generateClassSummary(name, methods, properties, language),
            methods,
            properties,
            isExported: /\bexport\b/.test(match[0]),
            fileName,
            lineNumber,
            source: 'regex',
            language
          });
        }
      }
    });

    return { functions, classes };
  }

  /**
   * Check if identifier is valid (not a keyword)
   */
  private isValidIdentifier(name: string): boolean {
    const keywords = ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 
                     'return', 'function', 'class', 'interface', 'import', 'export', 'const', 
                     'let', 'var', 'new', 'this', 'super', 'extends', 'implements'];
    return !keywords.includes(name.toLowerCase()) && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Extract function parameters from match
   */
  private extractParameters(matchText: string, language: string): string[] {
    const params: string[] = [];
    const paramMatch = matchText.match(/\(([^)]*)\)/);
    
    if (paramMatch && paramMatch[1] && paramMatch[1].trim()) {
      const paramString = paramMatch[1];
      // Split by comma, but handle nested structures
      let depth = 0;
      let current = '';
      
      for (const char of paramString) {
        if (char === '(' || char === '[' || char === '{') depth++;
        else if (char === ')' || char === ']' || char === '}') depth--;
        else if (char === ',' && depth === 0) {
          if (current.trim()) {
            params.push(this.cleanParameter(current.trim(), language));
          }
          current = '';
          continue;
        }
        current += char;
      }
      
      if (current.trim()) {
        params.push(this.cleanParameter(current.trim(), language));
      }
    }
    
    return params;
  }

  /**
   * Clean parameter string to extract just the name
   */
  private cleanParameter(param: string, language: string): string {
    // Remove type annotations and default values
    if (language === 'typescript' || language === 'javascript') {
      // Remove type annotations (: type)
      param = param.replace(/:\s*[^=,]+/, '');
      // Remove default values (= value)
      param = param.replace(/=.*$/, '');
    } else if (language === 'python') {
      // Remove type hints (: type)
      param = param.replace(/:\s*[^=,]+/, '');
      // Remove default values (= value)
      param = param.replace(/=.*$/, '');
    }
    
    // Extract just the parameter name
    const nameMatch = param.match(/(\w+)/);
    return nameMatch && nameMatch[1] ? nameMatch[1] : 'param';
  }

  /**
   * Extract return type from function signature
   */
  private extractReturnType(matchText: string, language: string): string | undefined {
    if (language === 'typescript') {
      const returnMatch = matchText.match(/\)\s*:\s*([^{;]+)/);
      return returnMatch && returnMatch[1] ? returnMatch[1].trim() : undefined;
    } else if (language === 'python') {
      const returnMatch = matchText.match(/->\s*([^:]+)/);
      return returnMatch && returnMatch[1] ? returnMatch[1].trim() : undefined;
    }
    return undefined;
  }

  /**
   * Generate function summary
   */
  private generateFunctionSummary(name: string, params: string[], _language: string): string {
    const paramCount = params.length;
    const action = this.inferFunctionAction(name);
    return `${action} ${name}${paramCount > 0 ? ` with ${paramCount} parameter${paramCount > 1 ? 's' : ''}` : ''}`;
  }

  /**
   * Infer function action from name
   */
  private inferFunctionAction(name: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.startsWith('get') || lowerName.startsWith('fetch') || lowerName.startsWith('find')) {
      return 'retrieves';
    } else if (lowerName.startsWith('set') || lowerName.startsWith('update') || lowerName.startsWith('save')) {
      return 'updates';
    } else if (lowerName.startsWith('create') || lowerName.startsWith('add') || lowerName.startsWith('insert')) {
      return 'creates';
    } else if (lowerName.startsWith('delete') || lowerName.startsWith('remove') || lowerName.startsWith('clear')) {
      return 'removes';
    } else if (lowerName.startsWith('calculate') || lowerName.startsWith('compute') || lowerName.startsWith('process')) {
      return 'processes';
    } else if (lowerName.startsWith('validate') || lowerName.startsWith('check') || lowerName.startsWith('verify')) {
      return 'validates';
    } else {
      return 'processes';
    }
  }

  /**
   * Extract class content between braces
   */
  private extractClassContent(content: string, startIndex: number, language: string): string {
    const classStart = content.indexOf('{', startIndex);
    if (classStart === -1) return '';
    
    const classEnd = this.findClassEnd(content, classStart, language);
    if (classEnd === null || classEnd === -1) return content.substring(classStart);
    
    return content.substring(classStart, classEnd + 1);
  }

  /**
   * Find the end of a class definition
   */
  private findClassEnd(content: string, startIndex: number, language: string): number | null {
    const substring = content.substring(startIndex);
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < substring.length; i++) {
      const char = substring[i];
      const prevChar = i > 0 ? substring[i - 1] : '';
      
      // Handle string literals
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
        continue;
      }
      
      if (inString) continue;
      
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          return startIndex + i;
        }
      }
      
      // For Python, find the next class/function at the same indentation level
      if (language === 'python') {
        if (char === '\n') {
          const nextLineMatch = substring.substring(i + 1).match(/^(\s*)(class|def|$)/);
          if (nextLineMatch && nextLineMatch[1] && nextLineMatch[1].length <= 0) {
            return startIndex + i;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Extract methods from class content
   */
  private extractClassMethods(classContent: string, language: string): string[] {
    const methods: string[] = [];
    
    const methodPatterns: Record<string, RegExp[]> = {
      javascript: [
        /(\w+)\s*\([^)]*\)\s*\{/g,
        /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g
      ],
      typescript: [
        /(?:public|private|protected|static|\s)*(?:async\s+)?(\w+)\s*\([^)]*\)/g
      ],
      python: [
        /def\s+(\w+)\s*\([^)]*\):/g
      ],
      java: [
        /(?:public|private|protected|static|\s)+\s+\w+\s+(\w+)\s*\([^)]*\)/g
      ],
      csharp: [
        /(?:public|private|protected|internal|static|\s)+\s+\w+\s+(\w+)\s*\([^)]*\)/g
      ]
    };
    
    const patterns = methodPatterns[language] || methodPatterns.javascript;
    
    if (patterns) {
      patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(classContent)) !== null) {
        const name = match[1];
        if (name && !methods.includes(name)) {
          methods.push(name);
        }
      }
    });
    }
    
    return methods;
  }

  /**
   * Extract properties from class content
   */
  private extractClassProperties(classContent: string, language: string): string[] {
    const properties: string[] = [];
    
    const propertyPatterns: Record<string, RegExp[]> = {
      javascript: [
        /(\w+)\s*[:=]/g,
        /this\.(\w+)\s*=/g
      ],
      typescript: [
        /(?:public|private|protected|static|\s)*(\w+)\s*[?]?\s*:/g,
        /(\w+)\s*[?]?\s*:/g
      ],
      python: [
        /self\.(\w+)\s*=/g,
        /(\w+)\s*:\s*\w+/g
      ],
      java: [
        /(?:public|private|protected|static|\s)+\s+\w+\s+(\w+)\s*[;=]/g
      ],
      csharp: [
        /(?:public|private|protected|internal|static|\s)+\s+\w+\s+(\w+)\s*[;={]/g
      ]
    };
    
    const patterns = propertyPatterns[language] || propertyPatterns.javascript;
    
    if (patterns) {
      patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(classContent)) !== null) {
        const name = match[1];
        if (name && !properties.includes(name) && !['if', 'for', 'while', 'return'].includes(name)) {
          properties.push(name);
        }
      }
    });
    }
    
    return properties;
  }

  /**
   * Generate class summary
   */
  private generateClassSummary(name: string, methods: string[], properties: string[], language: string): string {
    const methodCount = methods.length;
    const propertyCount = properties.length;
    
    let type = 'Class';
    if (language === 'typescript' && name[0] && name[0] === name[0].toUpperCase()) {
      // Could be interface, enum, or type
      type = 'Interface';
    }
    
    const parts = [`${type} ${name}`];
    
    if (methodCount > 0 || propertyCount > 0) {
      const details = [];
      if (methodCount > 0) details.push(`${methodCount} method${methodCount > 1 ? 's' : ''}`);
      if (propertyCount > 0) details.push(`${propertyCount} propert${propertyCount > 1 ? 'ies' : 'y'}`);
      parts.push(`implements ${name.toLowerCase()} with ${details.join(' and ')}`);
    } else {
      parts.push(`manages ${name.toLowerCase()}`);
    }
    
    return parts.join(' - ');
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // No cleanup needed for regex-based analyzer
    CodeAnalyzer.instance = null;
  }
}