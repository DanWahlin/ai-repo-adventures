/**
 * Shared utilities for all analyzer classes
 * 
 * This module provides common functions used across multiple analyzer classes
 * to eliminate code duplication and ensure consistent behavior.
 * 
 * Key functions:
 * - Identifier validation and naming convention checks
 * - Parameter extraction from function signatures
 * - Source code position and line number utilities
 * - Language-specific code parsing helpers
 * - Summary generation for functions and classes
 */

/**
 * Common keywords to filter out when validating identifiers
 */
const COMMON_KEYWORDS = [
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'return', 'function', 'class', 'interface', 'import', 'export', 'const',
  'let', 'var', 'new', 'this', 'super', 'extends', 'implements',
  // Python keywords
  'def', 'pass', 'lambda', 'with', 'as', 'try', 'except', 'finally',
  // Java/C# keywords
  'public', 'private', 'protected', 'static', 'final', 'abstract',
  'synchronized', 'volatile', 'transient', 'native'
];

/**
 * Validates whether a given string is a valid programming identifier
 * 
 * Checks that the identifier:
 * 1. Is not empty or null
 * 2. Is not a reserved keyword in common programming languages
 * 3. Follows standard naming conventions (starts with letter/underscore, contains only alphanumeric chars)
 * 
 * @param name - The identifier string to validate
 * @returns True if the identifier is valid, false otherwise
 * 
 * @example
 * isValidProgrammingIdentifier('myFunction') // true
 * isValidProgrammingIdentifier('function') // false (reserved keyword)
 * isValidProgrammingIdentifier('123invalid') // false (starts with number)
 */
export function isValidProgrammingIdentifier(name: string): boolean {
  // Keep backward compatibility
  return isValidIdentifierInternal(name);
}

// Legacy export for backward compatibility
export const isValidIdentifier = isValidProgrammingIdentifier;

function isValidIdentifierInternal(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  // Check if it's a reserved keyword
  if (COMMON_KEYWORDS.includes(name.toLowerCase())) {
    return false;
  }
  
  // Check if it follows naming conventions (letters, numbers, underscore, dollar sign)
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}

/**
 * Calculates the line number for a given character position in source code
 * 
 * This is useful for providing precise error locations and code navigation.
 * Line numbers are 1-based to match standard editor conventions.
 * 
 * @param content - The complete source code content
 * @param index - The character index (0-based) to find the line for
 * @returns The line number (1-based) where the character is located
 * 
 * @example
 * calculateLineNumberFromIndex('line1\nline2\nline3', 8) // returns 2
 */
export function calculateLineNumberFromIndex(content: string, index: number): number {
  return getLineNumberInternal(content, index);
}

// Legacy export for backward compatibility
export const getLineNumber = calculateLineNumberFromIndex;

function getLineNumberInternal(content: string, index: number): number {
  if (index < 0 || index >= content.length) {
    return 1;
  }
  return content.substring(0, index).split('\n').length;
}

/**
 * Extracts parameter names from a function signature based on language syntax
 * 
 * Supports multiple programming languages with different parameter syntax:
 * - JavaScript/TypeScript: function(param1, param2)
 * - Python: def function(param1, param2)
 * - Java/C#: type function(Type param1, Type param2)
 * 
 * @param matchText - The function signature text to parse
 * @param language - The programming language ('javascript', 'typescript', 'python', etc.)
 * @returns Array of parameter names extracted from the signature
 * 
 * @example
 * extractFunctionParameters('function test(name, age)', 'javascript') // ['name', 'age']
 * extractFunctionParameters('def calculate(x, y)', 'python') // ['x', 'y']
 */
export function extractFunctionParameters(matchText: string, language: string): string[] {
  return extractParametersInternal(matchText, language);
}

// Legacy export for backward compatibility
export const extractParameters = extractFunctionParameters;

function extractParametersInternal(matchText: string, language: string): string[] {
  const params: string[] = [];
  const paramMatch = matchText.match(/\(([^)]*)\)/);
  
  if (!paramMatch || !paramMatch[1] || !paramMatch[1].trim()) {
    return params;
  }
  
  const paramString = paramMatch[1];
  let depth = 0;
  let current = '';
  
  // Split by comma, but handle nested structures
  for (const char of paramString) {
    if (char === '(' || char === '[' || char === '{') {
      depth++;
    } else if (char === ')' || char === ']' || char === '}') {
      depth--;
    } else if (char === ',' && depth === 0) {
      if (current.trim()) {
        params.push(cleanParameter(current.trim(), language));
      }
      current = '';
      continue;
    }
    current += char;
  }
  
  if (current.trim()) {
    params.push(cleanParameter(current.trim(), language));
  }
  
  return params;
}

/**
 * Clean parameter string to extract just the parameter name
 */
export function cleanParameter(param: string, language: string): string {
  // Remove type annotations and default values based on language
  switch (language) {
    case 'typescript':
    case 'javascript':
      // Remove type annotations (: type) and default values (= value)
      param = param.replace(/:\s*[^=,]+/, '').replace(/=.*$/, '');
      break;
    case 'python':
      // Remove type hints (: type) and default values (= value)
      param = param.replace(/:\s*[^=,]+/, '').replace(/=.*$/, '');
      break;
    case 'java':
    case 'csharp':
      // For Java/C#, parameter format is usually "Type name"
      const javaMatch = param.match(/\w+\s+(\w+)$/);
      if (javaMatch && javaMatch[1]) {
        return javaMatch[1];
      }
      break;
  }
  
  // Extract just the parameter name using regex
  const nameMatch = param.match(/(\w+)/);
  return nameMatch && nameMatch[1] ? nameMatch[1] : 'param';
}

/**
 * Extract return type from function signature
 */
export function extractReturnType(matchText: string, language: string): string | undefined {
  switch (language) {
    case 'typescript':
      const tsReturnMatch = matchText.match(/\)\s*:\s*([^{;]+)/);
      return tsReturnMatch && tsReturnMatch[1] ? tsReturnMatch[1].trim() : undefined;
    case 'python':
      const pyReturnMatch = matchText.match(/->\s*([^:]+)/);
      return pyReturnMatch && pyReturnMatch[1] ? pyReturnMatch[1].trim() : undefined;
    case 'java':
    case 'csharp':
      // For Java/C#, return type is usually before the method name
      const javaReturnMatch = matchText.match(/(?:public|private|protected|static|\s)+\s+(\w+)\s+\w+\s*\(/);
      return javaReturnMatch && javaReturnMatch[1] ? javaReturnMatch[1].trim() : undefined;
    default:
      return undefined;
  }
}

/**
 * Generate human-readable function summary
 */
export function generateFunctionSummary(name: string, params: string[], language: string): string {
  const paramCount = params.length;
  const action = inferFunctionAction(name);
  const langSuffix = language === 'python' ? ' function' : '';
  
  return `${action} ${name}${paramCount > 0 ? ` with ${paramCount} parameter${paramCount > 1 ? 's' : ''}` : ''}${langSuffix}`;
}

/**
 * Infer function action from name using common naming patterns
 */
export function inferFunctionAction(name: string): string {
  const lowerName = name.toLowerCase();
  
  if (lowerName.startsWith('get') || lowerName.startsWith('fetch') || lowerName.startsWith('find') || lowerName.startsWith('read')) {
    return 'retrieves';
  } else if (lowerName.startsWith('set') || lowerName.startsWith('update') || lowerName.startsWith('save') || lowerName.startsWith('write')) {
    return 'updates';
  } else if (lowerName.startsWith('create') || lowerName.startsWith('add') || lowerName.startsWith('insert') || lowerName.startsWith('new')) {
    return 'creates';
  } else if (lowerName.startsWith('delete') || lowerName.startsWith('remove') || lowerName.startsWith('clear') || lowerName.startsWith('destroy')) {
    return 'removes';
  } else if (lowerName.startsWith('calculate') || lowerName.startsWith('compute') || lowerName.startsWith('process') || lowerName.startsWith('transform')) {
    return 'processes';
  } else if (lowerName.startsWith('validate') || lowerName.startsWith('check') || lowerName.startsWith('verify') || lowerName.startsWith('test')) {
    return 'validates';
  } else if (lowerName.startsWith('init') || lowerName.startsWith('setup') || lowerName.startsWith('configure')) {
    return 'initializes';
  } else if (lowerName.startsWith('handle') || lowerName.startsWith('on') || lowerName.endsWith('handler')) {
    return 'handles';
  } else {
    return 'processes';
  }
}

/**
 * Generate human-readable class summary
 */
export function generateClassSummary(name: string, methods: string[], properties: string[], language: string): string {
  const methodCount = methods.length;
  const propertyCount = properties.length;
  
  // Determine class type based on language and name patterns
  let type = 'Class';
  if (language === 'typescript') {
    if (name.endsWith('Interface') || name.startsWith('I') && name.length > 1 && name[1]?.toUpperCase() === name[1]) {
      type = 'Interface';
    } else if (name.endsWith('Type') || name.endsWith('Enum')) {
      type = 'Type';
    }
  } else if (language === 'java' || language === 'csharp') {
    if (name.endsWith('Interface') || (language === 'csharp' && name.startsWith('I') && name.length > 1)) {
      type = 'Interface';
    }
  }
  
  const parts = [`${type} ${name}`];
  
  if (methodCount > 0 || propertyCount > 0) {
    const details = [];
    if (methodCount > 0) {
      details.push(`${methodCount} method${methodCount > 1 ? 's' : ''}`);
    }
    if (propertyCount > 0) {
      details.push(`${propertyCount} propert${propertyCount > 1 ? 'ies' : 'y'}`);
    }
    parts.push(`implements ${name.toLowerCase()} with ${details.join(' and ')}`);
  } else {
    parts.push(`manages ${name.toLowerCase()}`);
  }
  
  return parts.join(' - ');
}

/**
 * Find the end of a code block (class, function, etc.) considering nested structures
 */
export function findCodeBlockEnd(content: string, startIndex: number, language: string): number | null {
  const substring = content.substring(startIndex);
  
  // For Python, use indentation-based detection
  if (language === 'python') {
    return findPythonBlockEnd(substring, startIndex);
  }
  
  // For brace-based languages, count braces
  return findBraceBlockEnd(substring, startIndex);
}

/**
 * Find end of Python code block using indentation
 */
function findPythonBlockEnd(substring: string, startIndex: number): number | null {
  const lines = substring.split('\n');
  if (lines.length === 0) return null;
  
  // Find the base indentation level
  let baseIndent = -1;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.trim()) {
      const indent = line.length - line.trimStart().length;
      if (baseIndent === -1) {
        baseIndent = indent;
      } else if (indent <= baseIndent && !line.trimStart().startsWith('#')) {
        // Found a line at the same or lower indentation level
        return startIndex + lines.slice(0, i).join('\n').length;
      }
    }
  }
  
  return null;
}

/**
 * Find end of brace-based code block
 */
function findBraceBlockEnd(substring: string, startIndex: number): number | null {
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  let inComment = false;
  
  for (let i = 0; i < substring.length; i++) {
    const char = substring[i];
    const prevChar = i > 0 ? substring[i - 1] : '';
    const nextChar = i < substring.length - 1 ? substring[i + 1] : '';
    
    // Handle single-line comments
    if (char === '/' && nextChar === '/' && !inString) {
      inComment = true;
      continue;
    }
    
    if (char === '\n') {
      inComment = false;
      continue;
    }
    
    if (inComment) continue;
    
    // Handle string literals
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\' && !inComment) {
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
    
    // Count braces
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        return startIndex + i;
      }
    }
  }
  
  return null;
}

/**
 * Safely extract content between start and end indices
 */
export function extractContent(content: string, startIndex: number, endIndex?: number): string {
  if (startIndex < 0 || startIndex >= content.length) {
    return '';
  }
  
  if (endIndex === undefined || endIndex === null || endIndex < startIndex) {
    return content.substring(startIndex);
  }
  
  return content.substring(startIndex, endIndex + 1);
}

/**
 * Normalize whitespace in code strings
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Check if a string looks like a constructor function
 */
export function isConstructor(name: string, language: string): boolean {
  switch (language) {
    case 'javascript':
    case 'typescript':
      return name === 'constructor';
    case 'python':
      return name === '__init__';
    case 'java':
    case 'csharp':
      // Constructor name matches class name (not detectable from function name alone)
      return false;
    default:
      return false;
  }
}

/**
 * Check if a string looks like a destructor function
 */
export function isDestructor(name: string, language: string): boolean {
  switch (language) {
    case 'python':
      return name === '__del__';
    case 'csharp':
      return name.startsWith('~');
    default:
      return false;
  }
}