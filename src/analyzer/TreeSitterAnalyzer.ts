/**
 * TreeSitterAnalyzer - Universal code parser using tree-sitter for all languages
 * Provides comprehensive code analysis for JavaScript, TypeScript, Python, Java, C#, and more
 */

import * as Parser from 'web-tree-sitter';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { FunctionInfo, ClassInfo, ParseResult, AnalysisConfig } from './types.js';

// Type declarations for web-tree-sitter
type SyntaxNode = any;
type Language = any;

// Language configuration with tree-sitter queries
const LANGUAGE_CONFIG = {
  javascript: {
    wasmFile: 'tree-sitter-javascript.wasm',
    extensions: ['.js', '.jsx', '.mjs'],
    functionQuery: `
      (function_declaration name: (identifier) @name) @function
      (variable_declarator
        name: (identifier) @name
        value: [(arrow_function) (function_expression)]) @function
      (method_definition name: (property_identifier) @name) @function
    `,
    classQuery: `
      (class_declaration name: (identifier) @name) @class
    `
  },
  typescript: {
    wasmFile: 'tree-sitter-typescript.wasm',
    extensions: ['.ts', '.tsx'],
    functionQuery: `
      (function_declaration name: (identifier) @name) @function
      (variable_declarator
        name: (identifier) @name
        value: [(arrow_function) (function_expression)]) @function
      (method_definition name: (property_identifier) @name) @function
    `,
    classQuery: `
      (class_declaration name: (identifier) @name) @class
      (interface_declaration name: (type_identifier) @name) @interface
    `
  },
  python: {
    wasmFile: 'tree-sitter-python.wasm',
    extensions: ['.py', '.pyi'],
    functionQuery: `
      (function_definition name: (identifier) @name) @function
      (decorated_definition
        definition: (function_definition name: (identifier) @name)) @function
    `,
    classQuery: `
      (class_definition name: (identifier) @name) @class
    `
  },
  java: {
    wasmFile: 'tree-sitter-java.wasm',
    extensions: ['.java'],
    functionQuery: `
      (method_declaration name: (identifier) @name) @function
      (constructor_declaration name: (identifier) @name) @constructor
    `,
    classQuery: `
      (class_declaration name: (identifier) @name) @class
      (interface_declaration name: (identifier) @name) @interface
      (enum_declaration name: (identifier) @name) @enum
    `
  },
  csharp: {
    wasmFile: 'tree-sitter-csharp.wasm',
    extensions: ['.cs'],
    functionQuery: `
      (method_declaration name: (identifier) @name) @function
      (constructor_declaration name: (identifier) @name) @constructor
      (property_declaration name: (identifier) @name) @property
    `,
    classQuery: `
      (class_declaration name: (identifier) @name) @class
      (interface_declaration name: (identifier) @name) @interface
      (struct_declaration name: (identifier) @name) @struct
      (enum_declaration name: (identifier) @name) @enum
    `
  }
};

export class TreeSitterAnalyzer {
  private static instance: TreeSitterAnalyzer | null = null;
  private parsers: Map<string, any> = new Map();
  private languages: Map<string, Language> = new Map();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(_config: AnalysisConfig) {
    // Config may be used for future enhancements
  }

  /**
   * Get or create singleton instance
   */
  static async getInstance(config: AnalysisConfig): Promise<TreeSitterAnalyzer> {
    if (!TreeSitterAnalyzer.instance) {
      TreeSitterAnalyzer.instance = new TreeSitterAnalyzer(config);
      await TreeSitterAnalyzer.instance.initialize();
    }
    return TreeSitterAnalyzer.instance;
  }

  /**
   * Initialize tree-sitter with all language parsers
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.performInitialization();
    await this.initPromise;
    this.initialized = true;
  }

  private async performInitialization(): Promise<void> {
    try {
      // Note: Parser.init() is for browser environments. Node.js doesn't need it.
      // We'll try to initialize anyway but continue if it fails
      try {
        if (typeof (Parser as any).init === 'function') {
          await (Parser as any).init();
        }
      } catch (initError) {
        // In Node.js environment, init might not be available or needed
        console.log('Note: Parser.init() not available (running in Node.js)');
      }
      
      // Load all language parsers
      for (const [langName, config] of Object.entries(LANGUAGE_CONFIG)) {
        try {
          // Check if WASM file exists
          const fullPath = path.join(process.cwd(), 'public', 'tree-sitter', config.wasmFile);
          try {
            await fs.access(fullPath);
          } catch {
            console.warn(`Tree-sitter WASM file not found for ${langName}: ${fullPath}`);
            continue;
          }

          // Create parser instance
          const parser = new (Parser as any)();
          
          // Load the language WASM file
          // In Node.js, we need to read the file and pass it as a buffer
          const wasmBuffer = await fs.readFile(fullPath);
          const language = await (Parser as any).Language.load(wasmBuffer);
          parser.setLanguage(language);
          
          this.parsers.set(langName, parser);
          this.languages.set(langName, language);
          
          console.log(`✅ Loaded tree-sitter parser for ${langName}`);
        } catch (error) {
          console.warn(`Failed to load tree-sitter for ${langName}:`, error);
        }
      }

      if (this.parsers.size === 0) {
        console.warn('No tree-sitter parsers could be loaded - falling back to regex parsing');
        // Don't throw error - we'll fall back to regex parsing
      }
    } catch (error) {
      console.error('Failed to initialize tree-sitter:', error);
      // Don't throw - allow fallback to regex parsing
    }
  }

  /**
   * Analyze any file using multi-language parsing
   */
  async analyzeFile(content: string, fileName: string): Promise<ParseResult> {
    await this.initialize();

    const language = this.detectLanguage(fileName);
    if (!language) {
      return { functions: [], classes: [] };
    }

    // Try tree-sitter first if available
    const parser = this.parsers.get(language);
    if (parser) {
      try {
        // Parse the code
        const tree = parser.parse(content);
        const rootNode = tree.rootNode;

        // Extract functions and classes using tree queries
        const functions = this.extractFunctions(rootNode, fileName, language, content);
        const classes = this.extractClasses(rootNode, fileName, language, content);

        // If we got good results, return them
        if (functions.length > 0 || classes.length > 0) {
          return { functions, classes };
        }
      } catch (error) {
        // Fall through to regex parsing
      }
    }

    // Use comprehensive regex-based extraction
    return this.comprehensiveExtraction(content, fileName, language);
  }

  /**
   * Extract function information from AST
   */
  private extractFunctions(rootNode: SyntaxNode, fileName: string, language: string, content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const lines = content.split('\n');

    // Traverse the tree to find function nodes
    const visit = (node: SyntaxNode) => {
      // Check if this is a function-like node based on language
      if (this.isFunctionNode(node, language)) {
        const funcInfo = this.extractFunctionInfo(node, fileName, language, lines);
        if (funcInfo) {
          functions.push(funcInfo);
        }
      }

      // Recursively visit children
      for (const child of node.children) {
        visit(child);
      }
    };

    visit(rootNode);
    return functions;
  }

  /**
   * Extract class information from AST
   */
  private extractClasses(rootNode: SyntaxNode, fileName: string, language: string, content: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const lines = content.split('\n');

    // Traverse the tree to find class nodes
    const visit = (node: SyntaxNode) => {
      // Check if this is a class-like node based on language
      if (this.isClassNode(node, language)) {
        const classInfo = this.extractClassInfo(node, fileName, language, lines);
        if (classInfo) {
          classes.push(classInfo);
        }
      }

      // Recursively visit children
      for (const child of node.children) {
        visit(child);
      }
    };

    visit(rootNode);
    return classes;
  }

  /**
   * Check if node represents a function
   */
  private isFunctionNode(node: SyntaxNode, language: string): boolean {
    const functionTypes: Record<string, string[]> = {
      javascript: ['function_declaration', 'arrow_function', 'function_expression', 'method_definition'],
      typescript: ['function_declaration', 'arrow_function', 'function_expression', 'method_definition', 'function_signature'],
      python: ['function_definition', 'lambda'],
      java: ['method_declaration', 'constructor_declaration'],
      csharp: ['method_declaration', 'constructor_declaration', 'property_declaration', 'local_function_statement']
    };

    const types = functionTypes[language] || [];
    return types.includes(node.type);
  }

  /**
   * Check if node represents a class
   */
  private isClassNode(node: SyntaxNode, language: string): boolean {
    const classTypes: Record<string, string[]> = {
      javascript: ['class_declaration'],
      typescript: ['class_declaration', 'interface_declaration', 'type_alias_declaration'],
      python: ['class_definition'],
      java: ['class_declaration', 'interface_declaration', 'enum_declaration', 'record_declaration'],
      csharp: ['class_declaration', 'interface_declaration', 'struct_declaration', 'enum_declaration', 'record_declaration']
    };

    const types = classTypes[language] || [];
    return types.includes(node.type);
  }

  /**
   * Extract detailed function information from node
   */
  private extractFunctionInfo(node: SyntaxNode, fileName: string, language: string, lines: string[]): FunctionInfo | null {
    // Find the name node
    const nameNode = this.findNameNode(node, language);
    if (!nameNode) return null;

    const name = nameNode.text;
    const parameters = this.extractParameters(node, language);
    const returnType = this.extractReturnType(node, language);
    const isAsync = this.isAsyncFunction(node, language);
    const isExported = this.isExported(node, language);

    // Get documentation comment if available
    const docComment = this.extractDocComment(node, lines);
    const summary = docComment || this.generateFunctionSummary(name, parameters, returnType);

    return {
      name,
      summary,
      parameters,
      ...(returnType && { returnType }),
      isAsync,
      isExported,
      fileName,
      lineNumber: node.startPosition.row + 1,
      source: 'tree-sitter',
      language
    };
  }

  /**
   * Extract detailed class information from node
   */
  private extractClassInfo(node: SyntaxNode, fileName: string, language: string, lines: string[]): ClassInfo | null {
    // Find the name node
    const nameNode = this.findNameNode(node, language);
    if (!nameNode) return null;

    const name = nameNode.text;
    const methods = this.extractClassMethods(node, language);
    const properties = this.extractClassProperties(node, language);
    const isExported = this.isExported(node, language);

    // Get documentation comment if available
    const docComment = this.extractDocComment(node, lines);
    const summary = docComment || this.generateClassSummary(name, methods, properties);

    return {
      name,
      summary,
      methods,
      properties,
      isExported,
      fileName,
      lineNumber: node.startPosition.row + 1,
      source: 'tree-sitter',
      language
    };
  }

  /**
   * Find the name node for a function or class
   */
  private findNameNode(node: SyntaxNode, language: string): SyntaxNode | null {
    // Direct name child
    const nameChild = node.childForFieldName('name');
    if (nameChild) return nameChild;

    // Language-specific patterns
    if (language === 'javascript' || language === 'typescript') {
      // For arrow functions in variable declarations
      if (node.type === 'variable_declarator') {
        return node.childForFieldName('name');
      }
      // For methods
      if (node.type === 'method_definition') {
        return node.childForFieldName('name');
      }
    }

    // Search for identifier nodes
    for (const child of node.children) {
      if (child.type === 'identifier' || child.type === 'property_identifier' || child.type === 'type_identifier') {
        return child;
      }
    }

    return null;
  }

  /**
   * Extract function parameters
   */
  private extractParameters(node: SyntaxNode, _language: string): string[] {
    const params: string[] = [];
    
    // Find parameters node
    const paramsNode = node.childForFieldName('parameters') || 
                      node.children.find((c: any) => c.type.includes('parameter'));

    if (!paramsNode) return params;

    // Extract parameter names
    const visit = (n: SyntaxNode) => {
      if (n.type === 'identifier' || n.type === 'rest_pattern') {
        params.push(n.text);
      } else if (n.type.includes('parameter')) {
        const nameNode = n.childForFieldName('name') || n.children.find((c: any) => c.type === 'identifier');
        if (nameNode) {
          params.push(nameNode.text);
        }
      }

      for (const child of n.children) {
        visit(child);
      }
    };

    visit(paramsNode);
    return params;
  }

  /**
   * Extract return type if available
   */
  private extractReturnType(node: SyntaxNode, language: string): string | undefined {
    // TypeScript/C#/Java have explicit return types
    const returnTypeNode = node.childForFieldName('return_type') ||
                          node.children.find((c: any) => c.type === 'type_annotation');
    
    if (returnTypeNode) {
      return returnTypeNode.text.replace(/^:\s*/, '');
    }

    // Python type hints
    if (language === 'python') {
      const returnAnnotation = node.children.find((c: any) => c.type === 'return_type');
      if (returnAnnotation) {
        return returnAnnotation.text.replace(/^->\s*/, '');
      }
    }

    return undefined;
  }

  /**
   * Check if function is async
   */
  private isAsyncFunction(node: SyntaxNode, language: string): boolean {
    // Check for async keyword
    const text = node.text.toLowerCase();
    
    if (language === 'javascript' || language === 'typescript') {
      return text.startsWith('async ') || text.includes(' async ');
    }
    
    if (language === 'python') {
      return text.startsWith('async def');
    }
    
    if (language === 'csharp') {
      return text.includes('async ') && text.includes('Task');
    }

    return false;
  }

  /**
   * Check if node is exported
   */
  private isExported(node: SyntaxNode, language: string): boolean {
    // Check parent for export statement
    let parent = node.parent;
    while (parent) {
      if (parent.type === 'export_statement' || parent.type === 'export_default_declaration') {
        return true;
      }
      parent = parent.parent;
    }

    // Check for export keyword in text
    const text = node.text;
    if (language === 'javascript' || language === 'typescript') {
      return text.startsWith('export ');
    }

    // Public visibility in other languages
    if (language === 'java' || language === 'csharp') {
      return text.includes('public ');
    }

    return false;
  }


  /**
   * Extract documentation comment
   */
  private extractDocComment(node: SyntaxNode, lines: string[]): string | null {
    // Look for comment node before the current node
    const startLine = node.startPosition.row;
    if (startLine > 0) {
      const prevLine = lines[startLine - 1];
      if (!prevLine) return null;
      
      // JSDoc style
      if (prevLine.includes('/**') || prevLine.includes('*')) {
        const match = prevLine.match(/\*\s*(.*)/);
        if (match && match[1]) return match[1].trim();
      }
      
      // Python docstring
      if (prevLine.includes('"""') || prevLine.includes("'''")) {
        const match = prevLine.match(/['"]{3}\s*(.*?)\s*['"]{3}/);
        if (match && match[1]) return match[1].trim();
      }
      
      // Single line comments
      if (prevLine.includes('//')) {
        const match = prevLine.match(/\/\/\s*(.*)/);
        if (match && match[1]) return match[1].trim();
      }
      
      if (prevLine.includes('#')) {
        const match = prevLine.match(/#\s*(.*)/);
        if (match && match[1]) return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Generate function summary
   */
  private generateFunctionSummary(name: string, params: string[], returnType?: string): string {
    const verbs: Record<string, string> = {
      'get': 'retrieves',
      'set': 'updates',
      'create': 'creates',
      'delete': 'removes',
      'update': 'modifies',
      'find': 'searches for',
      'parse': 'parses',
      'validate': 'validates',
      'handle': 'handles',
      'process': 'processes',
      'calculate': 'calculates',
      'render': 'renders',
      'fetch': 'fetches',
      'save': 'saves',
      'load': 'loads',
      'init': 'initializes',
      'check': 'checks',
      'build': 'builds',
      'generate': 'generates',
      'extract': 'extracts',
      'transform': 'transforms',
      'convert': 'converts',
      'analyze': 'analyzes'
    };

    const lowerName = name.toLowerCase();
    let action = 'processes';
    
    for (const [verb, description] of Object.entries(verbs)) {
      if (lowerName.startsWith(verb)) {
        action = description;
        break;
      }
    }

    const subject = name.replace(/^(get|set|create|delete|update|find|parse|validate|handle|process|calculate|render|fetch|save|load|init|check|build|generate|extract|transform|convert|analyze)/i, '');
    const formattedSubject = subject.replace(/([A-Z])/g, ' $1').toLowerCase().trim() || 'data';
    
    let summary = `${action} ${formattedSubject}`;
    
    if (params.length > 0) {
      summary += ` with ${params.length} parameter${params.length > 1 ? 's' : ''}`;
    }
    
    if (returnType) {
      summary += ` returning ${returnType}`;
    }
    
    return summary;
  }

  /**
   * Generate class summary
   */
  private generateClassSummary(name: string, methods: string[], properties: string[]): string {
    const patterns: Record<string, string> = {
      'manager': 'manages',
      'service': 'provides services for',
      'controller': 'controls',
      'handler': 'handles',
      'provider': 'provides',
      'factory': 'creates instances of',
      'builder': 'builds',
      'validator': 'validates',
      'parser': 'parses',
      'analyzer': 'analyzes',
      'processor': 'processes',
      'generator': 'generates',
      'helper': 'helps with',
      'util': 'provides utilities for',
      'model': 'represents',
      'entity': 'represents',
      'component': 'renders',
      'view': 'displays',
      'repository': 'manages data for',
      'store': 'stores'
    };

    const lowerName = name.toLowerCase();
    let purpose = 'implements';
    
    for (const [pattern, description] of Object.entries(patterns)) {
      if (lowerName.includes(pattern)) {
        purpose = description;
        break;
      }
    }

    const subject = name.replace(/(Manager|Service|Controller|Handler|Provider|Factory|Builder|Validator|Parser|Analyzer|Processor|Generator|Helper|Util|Model|Entity|Component|View|Repository|Store)$/i, '');
    const formattedSubject = subject.replace(/([A-Z])/g, ' $1').toLowerCase().trim() || 'operations';
    
    let summary = `${purpose} ${formattedSubject}`;
    
    if (methods.length > 0 || properties.length > 0) {
      const parts = [];
      if (methods.length > 0) parts.push(`${methods.length} method${methods.length > 1 ? 's' : ''}`);
      if (properties.length > 0) parts.push(`${properties.length} propert${properties.length > 1 ? 'ies' : 'y'}`);
      summary += ` with ${parts.join(' and ')}`;
    }
    
    return summary;
  }

  /**
   * Detect language from file extension
   */
  private detectLanguage(fileName: string): string | null {
    const ext = path.extname(fileName).toLowerCase();
    
    for (const [language, config] of Object.entries(LANGUAGE_CONFIG)) {
      if (config.extensions.includes(ext)) {
        return language;
      }
    }
    
    return null;
  }

  /**
   * Comprehensive regex-based extraction for all languages
   */
  private comprehensiveExtraction(content: string, fileName: string, language: string): ParseResult {
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
          /(?:@\w+\s*\n\s*)*def\s+(\w+)\s*\([^)]*\)(?:\s*->\s*[^:]+)?:/gm
        ],
        classes: [
          /class\s+(\w+)(?:\([^)]*\))?:/gm
        ]
      },
      java: {
        functions: [
          // Methods with full signatures
          /(?:@\w+\s*\n\s*)*(?:public|private|protected|static|final|synchronized|native|abstract|\s)+\s+(\w+(?:<[^>]*>)?|\w+)\s+(\w+)\s*\([^)]*\)/gm,
          // Constructor patterns
          /(?:public|private|protected|\s)*(\w+)\s*\([^)]*\)\s*(?:throws\s+[^{]*)?{/gm
        ],
        classes: [
          /(?:public|final|abstract|\s)*class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?/gm,
          /(?:public|\s)*interface\s+(\w+)(?:\s+extends\s+[\w,\s]+)?/gm,
          /(?:public|\s)*enum\s+(\w+)/gm,
          /(?:public|\s)*@interface\s+(\w+)/gm
        ]
      },
      csharp: {
        functions: [
          // Methods with full signatures
          /(?:\[[\w\s,()="]*\]\s*)*(?:public|private|protected|internal|static|virtual|override|async|extern|\s)+\s+(\w+(?:<[^>]*>)?|\w+)\s+(\w+)\s*\([^)]*\)/gm,
          // Properties
          /(?:public|private|protected|internal|static|\s)+\s+(\w+)\s+(\w+)\s*\{\s*(?:get|set)/gm,
          // Events
          /(?:public|private|protected|internal|static|\s)+\s+event\s+\w+\s+(\w+)/gm
        ],
        classes: [
          /(?:public|internal|abstract|sealed|static|partial|\s)*class\s+(\w+)(?:\s*:\s*[\w,\s<>]+)?/gm,
          /(?:public|internal|\s)*interface\s+(\w+)(?:\s*:\s*[\w,\s<>]+)?/gm,
          /(?:public|internal|\s)*struct\s+(\w+)(?:\s*:\s*[\w,\s<>]+)?/gm,
          /(?:public|internal|\s)*enum\s+(\w+)/gm,
          /(?:public|internal|\s)*record\s+(\w+)/gm,
          /(?:public|internal|\s)*delegate\s+\w+\s+(\w+)/gm
        ]
      }
    };

    const langPatterns = patterns[language] || patterns.javascript;
    
    if (!langPatterns) {
      return { functions, classes };
    }

    // Extract functions with enhanced information
    langPatterns.functions.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        // Handle different capture groups for different languages
        let name = match[1] || match[2];
        if (!name || name.length < 1) continue;
        
        // Skip common non-function patterns
        if (['if', 'for', 'while', 'switch', 'catch', 'try'].includes(name.toLowerCase())) continue;
        
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const matchText = match[0];
        const lineContent = content.split('\n')[lineNumber - 1] || '';
        
        // Extract parameters from the match
        const paramMatch = matchText.match(/\(([^)]*)\)/);
        const params = paramMatch && paramMatch[1] 
          ? paramMatch[1].split(',').map(p => p.trim().split(/\s+/)[0] || '').filter(Boolean)
          : [];
        
        // Determine if async
        const isAsync = matchText.includes('async') || lineContent.includes('async');
        
        // Determine if exported/public
        const isExported = matchText.includes('export') || matchText.includes('public') || lineContent.includes('export');
        
        // Generate better summary
        const summary = this.generateFunctionSummary(name, params);
        
        functions.push({
          name,
          summary,
          parameters: params,
          isAsync,
          isExported,
          fileName,
          lineNumber,
          source: 'regex',
          language
        });
      }
    });

    // Extract classes with enhanced information
    langPatterns.classes.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1];
        if (!name || name.length < 1) continue;
        
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const matchText = match[0];
        
        // Determine type
        let type = 'class';
        if (matchText.includes('interface')) type = 'interface';
        else if (matchText.includes('enum')) type = 'enum';
        else if (matchText.includes('struct')) type = 'struct';
        else if (matchText.includes('type')) type = 'type alias';
        else if (matchText.includes('record')) type = 'record';
        
        // Check if exported/public
        const isExported = matchText.includes('export') || matchText.includes('public');
        
        // Try to find methods and properties within this class
        const classEndMatch = this.findClassEnd(content, match.index, language);
        const classContent = classEndMatch ? content.substring(match.index, classEndMatch) : '';
        const methods = this.extractClassMethods(classContent, language);
        const properties = this.extractClassProperties(classContent, language);
        
        // Generate better summary
        const summary = this.generateClassSummary(name, methods, properties);
        
        classes.push({
          name,
          summary: `${type.charAt(0).toUpperCase() + type.slice(1)} ${name} - ${summary}`,
          methods,
          properties,
          isExported,
          fileName,
          lineNumber,
          source: 'regex',
          language
        });
      }
    });

    return { functions, classes };
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
      
      // Count braces for languages that use them
      if (['javascript', 'typescript', 'java', 'csharp'].includes(language)) {
        if (char === '{') braceCount++;
        else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            return startIndex + i + 1;
          }
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
        /this\.(\w+)\s*=/g,
        /(\w+)\s*[:=]/g
      ],
      typescript: [
        /(?:public|private|protected|readonly|\s)*(\w+)\s*[:!?]/g,
        /this\.(\w+)\s*=/g
      ],
      python: [
        /self\.(\w+)\s*=/g,
        /(\w+)\s*:/g  // Type annotations
      ],
      java: [
        /(?:public|private|protected|static|final|\s)+\s+\w+\s+(\w+)\s*[;=]/g
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
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.parsers.clear();
    this.languages.clear();
    this.initialized = false;
    TreeSitterAnalyzer.instance = null;
  }
}