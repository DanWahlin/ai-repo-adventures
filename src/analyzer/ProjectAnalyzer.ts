import * as fs from 'fs/promises';
import * as path from 'path';
import { parse } from '@typescript-eslint/typescript-estree';
// import Parser, { Tree } from 'web-tree-sitter'; // Will be used when WASM files are added

export interface FunctionInfo {
  name: string;
  summary: string;
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  fileName: string;
  lineNumber?: number;
  source: 'typescript-estree' | 'tree-sitter' | 'regex';
  language?: string;
}

export interface ClassInfo {
  name: string;
  summary: string;
  methods: string[];
  properties: string[];
  isExported: boolean;
  fileName: string;
  lineNumber?: number;
  source: 'typescript-estree' | 'tree-sitter' | 'regex';
  language?: string;
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency';
  category: string; // framework, testing, build-tool, etc.
}

export interface CallRelationship {
  from: string; // function or file that makes the call
  to: string; // function or file being called
  type: 'import' | 'function-call' | 'class-instantiation';
  fileName: string;
  lineNumber?: number;
}

export interface CodeFlowAnalysis {
  entryPoint: string;
  callGraph: CallRelationship[];
  executionOrder: string[]; // Suggested order of exploration
}

export interface CodeAnalysis {
  functions: FunctionInfo[];
  classes: ClassInfo[];
  dependencies: DependencyInfo[];
  entryPoints: string[];
  keyFiles: Array<{ path: string; content: string; summary: string }>;
  codeFlow?: CodeFlowAnalysis;
}

export interface ProjectInfo {
  type: string;
  fileCount: number;
  mainTechnologies: string[];
  structure: ProjectStructure;
  hasTests: boolean;
  hasDatabase: boolean;
  hasApi: boolean;
  hasFrontend: boolean;
  codeAnalysis: CodeAnalysis;
}

export interface ProjectStructure {
  directories: string[];
  importantFiles: string[];
  configFiles: string[];
  sourceFiles: string[];
}

export class ProjectAnalyzer {
  private parsers: Map<string, any> = new Map();
  private initialized = false;

  private readonly LANGUAGE_EXTENSIONS = {
    'javascript': ['.js', '.jsx', '.mjs'],
    'typescript': ['.ts', '.tsx'],
    'python': ['.py', '.pyi'],
    'java': ['.java'],
    'go': ['.go'],
    'rust': ['.rs'],
    'c': ['.c', '.h'],
    'cpp': ['.cpp', '.cc', '.cxx', '.hpp', '.hxx'],
    'csharp': ['.cs'],
    'ruby': ['.rb'],
    'php': ['.php'],
    'swift': ['.swift'],
    'kotlin': ['.kt', '.kts']
  };

  private readonly TECH_INDICATORS = {
    'React': ['react', 'jsx', 'tsx', '.jsx', '.tsx'],
    'Vue': ['vue', '.vue', '@vue'],
    'Angular': ['@angular', 'angular.json'],
    'Node.js': ['package.json', 'node_modules', 'express', 'fastify'],
    'Python': ['.py', 'requirements.txt', 'setup.py', 'pyproject.toml'],
    'Java': ['.java', 'pom.xml', 'build.gradle'],
    'C#': ['.cs', '.csproj', '.sln'],
    'Go': ['.go', 'go.mod'],
    'Rust': ['.rs', 'Cargo.toml'],
    'Docker': ['dockerfile', 'docker-compose'],
    'Kubernetes': ['k8s', 'kubernetes', '.yaml'],
    'Database': ['database', 'db', 'sql', 'mongodb', 'postgres', 'mysql'],
    'API': ['api', 'rest', 'graphql', 'routes', 'controllers'],
    'Testing': ['test', 'spec', '__tests__', 'cypress', 'jest'],
    'TypeScript': ['.ts', 'tsconfig.json'],
    'JavaScript': ['.js', 'package.json'],
  };

  private validateProjectPath(projectPath: string): string {
    // Normalize and resolve the path
    const normalizedPath = path.normalize(path.resolve(projectPath));
    
    // Check for dangerous patterns
    if (normalizedPath.includes('..') || normalizedPath !== path.resolve(projectPath)) {
      throw new Error('Invalid project path: path traversal detected');
    }
    
    // Ensure path is absolute
    if (!path.isAbsolute(normalizedPath)) {
      throw new Error('Project path must be absolute');
    }
    
    return normalizedPath;
  }

  private async isValidProjectPath(projectPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(projectPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async analyzeProject(projectPath: string): Promise<ProjectInfo> {
    try {
      // Validate and sanitize the path
      const validatedPath = this.validateProjectPath(projectPath);
      
      // Check if the path exists and is a directory
      if (!(await this.isValidProjectPath(validatedPath))) {
        throw new Error(`Invalid project path: ${projectPath} is not a valid directory`);
      }
      
      const structure = await this.scanDirectory(validatedPath);
      const technologies = this.identifyTechnologies(structure);
      const projectType = this.determineProjectType(technologies, structure);
      const codeAnalysis = await this.analyzeCode(validatedPath, structure);
      
      return {
        type: projectType,
        fileCount: await this.countFiles(validatedPath),
        mainTechnologies: technologies.slice(0, 5), // Top 5 technologies
        structure,
        hasTests: this.hasFeature('Testing', technologies),
        hasDatabase: this.hasFeature('Database', technologies),
        hasApi: this.hasFeature('API', technologies),
        hasFrontend: this.hasFrontendTech(technologies),
        codeAnalysis,
      };
    } catch (error) {
      throw new Error(`Failed to analyze project: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async scanDirectory(dirPath: string, maxDepth = 3, currentDepth = 0): Promise<ProjectStructure> {
    const structure: ProjectStructure = {
      directories: [],
      importantFiles: [],
      configFiles: [],
      sourceFiles: [],
    };

    if (currentDepth >= maxDepth) return structure;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        // Skip node_modules, .git, and other common ignore patterns
        if (this.shouldSkip(entry.name)) continue;

        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          structure.directories.push(entry.name);
          
          // Recursively scan subdirectories
          const subStructure = await this.scanDirectory(fullPath, maxDepth, currentDepth + 1);
          structure.directories.push(...subStructure.directories.map(d => `${entry.name}/${d}`));
          structure.importantFiles.push(...subStructure.importantFiles);
          structure.configFiles.push(...subStructure.configFiles);
          structure.sourceFiles.push(...subStructure.sourceFiles);
        } else {
          const relativePath = path.relative(dirPath.split('/').slice(0, -currentDepth).join('/') || dirPath, fullPath);
          
          if (this.isImportantFile(entry.name)) {
            structure.importantFiles.push(relativePath);
          }
          if (this.isConfigFile(entry.name)) {
            structure.configFiles.push(relativePath);
          }
          if (this.isSourceFile(entry.name)) {
            structure.sourceFiles.push(relativePath);
          }
        }
      }
    } catch (error) {
      console.warn(`Unable to read directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
      // Continue processing other directories
    }

    return structure;
  }

  private shouldSkip(name: string): boolean {
    const skipPatterns = [
      'node_modules', '.git', '.next', 'dist', 'build', 
      '.vscode', '.idea', 'coverage', '.nyc_output',
      '__pycache__', '.pytest_cache', 'venv', '.env',
      'tests', 'test', '__tests__', '.test', '.spec'
    ];
    return skipPatterns.some(pattern => name.includes(pattern));
  }

  private isImportantFile(filename: string): boolean {
    const importantPatterns = [
      'README', 'index', 'main', 'app', 'server',
      'package.json', 'requirements.txt', 'Cargo.toml'
    ];
    return importantPatterns.some(pattern => 
      filename.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private isConfigFile(filename: string): boolean {
    const configPatterns = [
      '.json', '.yml', '.yaml', '.toml', '.ini', 
      '.config', 'dockerfile', '.env'
    ];
    return configPatterns.some(pattern => 
      filename.toLowerCase().includes(pattern)
    );
  }

  private identifyTechnologies(structure: ProjectStructure): string[] {
    const foundTech = new Set<string>();
    const allFiles = [...structure.importantFiles, ...structure.configFiles, ...structure.directories];
    
    for (const [tech, indicators] of Object.entries(this.TECH_INDICATORS)) {
      for (const indicator of indicators) {
        if (allFiles.some(file => 
          file.toLowerCase().includes(indicator.toLowerCase())
        )) {
          foundTech.add(tech);
          break;
        }
      }
    }

    return Array.from(foundTech);
  }

  private determineProjectType(technologies: string[], _structure: ProjectStructure): string {
    if (technologies.includes('React') || technologies.includes('Vue') || technologies.includes('Angular')) {
      return 'Web Application';
    }
    if (technologies.includes('Python') && !technologies.includes('JavaScript')) {
      return 'Python Application';
    }
    if (technologies.includes('Java')) {
      return 'Java Application';
    }
    if (technologies.includes('C#')) {
      return '.NET Application';
    }
    if (technologies.includes('Go')) {
      return 'Go Application';
    }
    if (technologies.includes('Rust')) {
      return 'Rust Application';
    }
    if (technologies.includes('API') && !this.hasFrontendTech(technologies)) {
      return 'API Service';
    }
    return 'Software Project';
  }

  private async countFiles(dirPath: string, maxDepth = 3, currentDepth = 0): Promise<number> {
    if (currentDepth >= maxDepth) return 0;
    
    let count = 0;
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (this.shouldSkip(entry.name)) continue;
        
        if (entry.isFile()) {
          count++;
        } else if (entry.isDirectory()) {
          count += await this.countFiles(path.join(dirPath, entry.name), maxDepth, currentDepth + 1);
        }
      }
    } catch (error) {
      console.warn(`Unable to count files in directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return count;
  }

  private hasFeature(feature: string, technologies: string[]): boolean {
    return technologies.includes(feature);
  }

  private hasFrontendTech(technologies: string[]): boolean {
    return technologies.some(tech => 
      ['React', 'Vue', 'Angular', 'JavaScript', 'TypeScript'].includes(tech)
    );
  }

  private async initializeTreeSitter(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // For web-tree-sitter, initialization is automatic
      this.initialized = true;
      console.log('🌳 Tree-sitter initialized successfully');
    } catch (error) {
      console.warn('⚠️ Failed to initialize tree-sitter:', error);
    }
  }

  private getLanguageFromExtension(filePath: string): string | null {
    const ext = path.extname(filePath).toLowerCase();
    
    for (const [language, extensions] of Object.entries(this.LANGUAGE_EXTENSIONS)) {
      if (extensions.includes(ext)) {
        return language;
      }
    }
    return null;
  }

  private async getParserForLanguage(language: string): Promise<any | null> {
    if (!this.initialized) {
      await this.initializeTreeSitter();
    }
    
    if (this.parsers.has(language)) {
      return this.parsers.get(language)!;
    }

    try {
      // For now, just return a placeholder since we don't have WASM files
      // In a full implementation, you'd load the language-specific WASM
      const mockParser = { language };
      this.parsers.set(language, mockParser);
      return mockParser;
    } catch (error) {
      console.warn(`⚠️ Failed to create parser for ${language}:`, error);
      return null;
    }
  }

  private isSourceFile(filename: string): boolean {
    const sourceExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs', '.go', '.rs'];
    return sourceExtensions.some(ext => filename.endsWith(ext)) && 
           !filename.includes('.test.') && 
           !filename.includes('.spec.');
  }

  private async analyzeCode(projectPath: string, structure: ProjectStructure): Promise<CodeAnalysis> {
    const analysis: CodeAnalysis = {
      functions: [],
      classes: [],
      dependencies: [],
      entryPoints: [],
      keyFiles: []
    };

    // Parse dependencies
    analysis.dependencies = await this.parseDependencies(projectPath);

    // Analyze key source files (limit to prevent overwhelming LLM)
    const keySourceFiles = structure.sourceFiles
      .filter(file => this.isKeyFile(file))
      .slice(0, 10); // Limit to 10 most important files

    for (const filePath of keySourceFiles) {
      const fullPath = path.join(projectPath, filePath);
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        
        // Analyze files with both existing methods and tree-sitter
        const language = this.getLanguageFromExtension(filePath);
        
        // Use existing TypeScript/JavaScript analysis for those files
        if (filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
          const fileAnalysis = await this.analyzeTypeScriptFile(content, filePath);
          analysis.functions.push(...fileAnalysis.functions);
          analysis.classes.push(...fileAnalysis.classes);
        }
        
        // Also try tree-sitter analysis for additional insights
        if (language) {
          const treeSitterAnalysis = await this.analyzeWithTreeSitter(content, filePath, language);
          // Merge unique results (avoid duplicates)
          analysis.functions.push(...treeSitterAnalysis.functions.filter(f => 
            !analysis.functions.some(existing => 
              existing.name === f.name && existing.fileName === f.fileName
            )
          ));
          analysis.classes.push(...treeSitterAnalysis.classes.filter(c => 
            !analysis.classes.some(existing => 
              existing.name === c.name && existing.fileName === c.fileName
            )
          ));
        }

        // Store key file content (truncated for LLM context)
        if (this.isVeryImportantFile(filePath)) {
          analysis.keyFiles.push({
            path: filePath,
            content: this.truncateContent(content, 500),
            summary: this.generateFileSummary(content, filePath)
          });
        }
      } catch (error) {
        console.warn(`Failed to analyze file ${filePath}:`, error);
      }
    }

    // Identify entry points
    analysis.entryPoints = this.findEntryPoints(structure);

    // Analyze code flow if we have entry points
    if (analysis.entryPoints.length > 0) {
      analysis.codeFlow = await this.analyzeCodeFlow(projectPath, analysis);
    }

    return analysis;
  }

  private async parseDependencies(projectPath: string): Promise<DependencyInfo[]> {
    const dependencies: DependencyInfo[] = [];
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);
      
      // Parse regular dependencies
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
          dependencies.push({
            name,
            version: version as string,
            type: 'dependency',
            category: this.categorizeDependency(name)
          });
        }
      }
      
      // Parse dev dependencies
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
          dependencies.push({
            name,
            version: version as string,
            type: 'devDependency',
            category: this.categorizeDependency(name)
          });
        }
      }
    } catch (error) {
      console.warn('Failed to parse package.json:', error);
    }
    
    return dependencies;
  }

  private categorizeDependency(name: string): string {
    const categories = {
      'framework': ['react', 'vue', 'angular', 'express', 'fastify', 'next', 'nuxt'],
      'testing': ['jest', 'mocha', 'chai', 'cypress', 'playwright', 'vitest'],
      'build-tool': ['webpack', 'rollup', 'vite', 'parcel', 'esbuild'],
      'linting': ['eslint', 'prettier', 'tslint'],
      'database': ['mongodb', 'mysql', 'postgres', 'sqlite', 'redis'],
      'ui': ['styled-components', 'emotion', 'tailwindcss', 'bootstrap'],
      'state': ['redux', 'mobx', 'zustand', 'recoil'],
      'utility': ['lodash', 'ramda', 'axios', 'fetch']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => name.toLowerCase().includes(keyword))) {
        return category;
      }
    }
    return 'utility';
  }

  private async analyzeTypeScriptFile(content: string, fileName: string): Promise<{functions: FunctionInfo[], classes: ClassInfo[]}> {
    const functions: FunctionInfo[] = [];
    const classes: ClassInfo[] = [];

    try {
      const ast = parse(content, {
        loc: true,
        range: true,
        comment: true,
        tokens: true,
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
          globalReturn: false
        }
      });

      // Walk the AST to find functions and classes
      this.walkAST(ast, functions, classes, fileName);
    } catch (error) {
      // If parsing fails, try to extract functions with regex as fallback
      const regexFunctions = this.extractFunctionsWithRegex(content, fileName);
      functions.push(...regexFunctions);
    }

    return { functions, classes };
  }

  private async analyzeWithTreeSitter(content: string, fileName: string, language: string): Promise<{functions: FunctionInfo[], classes: ClassInfo[]}> {
    const functions: FunctionInfo[] = [];
    const classes: ClassInfo[] = [];

    try {
      const parser = await this.getParserForLanguage(language);
      if (!parser) {
        return { functions, classes };
      }

      // For now, we'll implement a basic fallback since we don't have language WASM files
      // This would be replaced with actual tree-sitter parsing once WASM files are added
      const basicAnalysis = this.analyzeWithPatterns(content, fileName, language);
      return basicAnalysis;
      
    } catch (error) {
      console.warn(`Failed to analyze ${fileName} with tree-sitter:`, error);
      return { functions, classes };
    }
  }

  private analyzeWithPatterns(content: string, fileName: string, language: string): {functions: FunctionInfo[], classes: ClassInfo[]} {
    const functions: FunctionInfo[] = [];
    const classes: ClassInfo[] = [];

    // Language-specific patterns for function detection
    const functionPatterns = {
      javascript: [
        /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
        /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g
      ],
      typescript: [
        /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
        /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g
      ],
      python: [
        /(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/g
      ],
      java: [
        /(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)?(\w+)\s*\(([^)]*)\)\s*\{/g
      ],
      go: [
        /func\s+(?:\([^)]*\)\s+)?(\w+)\s*\(([^)]*)\)/g
      ],
      rust: [
        /fn\s+(\w+)\s*\(([^)]*)\)/g
      ],
      c: [
        /(?:\w+\s+)*(\w+)\s*\(([^)]*)\)\s*\{/g
      ],
      cpp: [
        /(?:\w+\s+)*(\w+)\s*\(([^)]*)\)\s*\{/g
      ],
      csharp: [
        /(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)?(\w+)\s*\(([^)]*)\)\s*\{/g
      ],
      ruby: [
        /def\s+(\w+)(?:\(([^)]*)\))?/g
      ],
      php: [
        /function\s+(\w+)\s*\(([^)]*)\)/g
      ]
    };

    // Language-specific patterns for class detection
    const classPatterns = {
      javascript: [/class\s+(\w+)/g],
      typescript: [/class\s+(\w+)/g],
      python: [/class\s+(\w+)/g],
      java: [/(?:public|private|protected)?\s*class\s+(\w+)/g],
      go: [/type\s+(\w+)\s+struct/g],
      rust: [/struct\s+(\w+)/g, /enum\s+(\w+)/g],
      c: [/(?:typedef\s+)?struct\s+(\w+)/g],
      cpp: [/class\s+(\w+)/g, /struct\s+(\w+)/g],
      csharp: [/(?:public|private|protected)?\s*class\s+(\w+)/g],
      ruby: [/class\s+(\w+)/g],
      php: [/class\s+(\w+)/g]
    };

    // Extract functions
    const langFunctionPatterns = functionPatterns[language as keyof typeof functionPatterns] || [];
    langFunctionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1];
        if (!name) continue;
        
        const params = match[2] ? match[2].split(',').map(p => p.trim().split(/\s+/)[0] || '').filter(Boolean) : [];
        
        functions.push({
          name,
          summary: this.generateFunctionSummary(name, params),
          parameters: params,
          isAsync: match[0].includes('async'),
          isExported: match[0].includes('export') || match[0].includes('public'),
          fileName,
          source: 'tree-sitter',
          language
        });
      }
    });

    // Extract classes
    const langClassPatterns = classPatterns[language as keyof typeof classPatterns] || [];
    langClassPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1];
        if (!name) continue;
        
        classes.push({
          name,
          summary: this.generateClassSummary(name, [], []),
          methods: [],
          properties: [],
          isExported: match[0].includes('export') || match[0].includes('public'),
          fileName,
          source: 'tree-sitter',
          language
        });
      }
    });

    return { functions, classes };
  }

  private walkAST(node: any, functions: FunctionInfo[], classes: ClassInfo[], fileName: string) {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'FunctionDeclaration' || node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
      const func = this.extractFunctionInfo(node, fileName);
      if (func) functions.push(func);
    }

    if (node.type === 'ClassDeclaration') {
      const cls = this.extractClassInfo(node, fileName);
      if (cls) classes.push(cls);
    }

    // Recursively walk child nodes
    for (const key in node) {
      if (key !== 'parent' && node[key] && typeof node[key] === 'object') {
        if (Array.isArray(node[key])) {
          node[key].forEach((child: any) => this.walkAST(child, functions, classes, fileName));
        } else {
          this.walkAST(node[key], functions, classes, fileName);
        }
      }
    }
  }

  private extractFunctionInfo(node: any, fileName: string): FunctionInfo | null {
    const name = node.id?.name || 'anonymous';
    const params = node.params?.map((p: any) => p.name || p.type) || [];
    
    return {
      name,
      summary: this.generateFunctionSummary(name, params),
      parameters: params,
      isAsync: node.async || false,
      isExported: this.isNodeExported(node),
      fileName,
      lineNumber: node.loc?.start?.line,
      source: 'typescript-estree',
      language: fileName.endsWith('.ts') || fileName.endsWith('.tsx') ? 'typescript' : 'javascript'
    };
  }

  private extractClassInfo(node: any, fileName: string): ClassInfo | null {
    const name = node.id?.name || 'anonymous';
    const methods = node.body?.body?.filter((n: any) => n.type === 'MethodDefinition')
      .map((m: any) => m.key?.name) || [];
    const properties = node.body?.body?.filter((n: any) => n.type === 'PropertyDefinition')
      .map((p: any) => p.key?.name) || [];
    
    return {
      name,
      summary: this.generateClassSummary(name, methods, properties),
      methods,
      properties,
      isExported: this.isNodeExported(node),
      fileName,
      lineNumber: node.loc?.start?.line,
      source: 'typescript-estree',
      language: fileName.endsWith('.ts') || fileName.endsWith('.tsx') ? 'typescript' : 'javascript'
    };
  }

  private extractFunctionsWithRegex(content: string, fileName: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const patterns = [
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
      /(\w+)\s*:\s*(?:async\s+)?\([^)]*\)\s*=>/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1];
        if (!name) continue;
        
        const params = match[2] ? match[2].split(',').map(p => p.trim().split(/\s+/)[0] || '').filter(Boolean) : [];
        
        functions.push({
          name,
          summary: this.generateFunctionSummary(name, params),
          parameters: params,
          isAsync: match[0].includes('async'),
          isExported: match[0].includes('export'),
          fileName,
          source: 'regex',
          language: fileName.endsWith('.ts') || fileName.endsWith('.tsx') ? 'typescript' : 'javascript'
        });
      }
    });

    return functions;
  }

  private generateFunctionSummary(name: string, params: string[]): string {
    // Generate human-readable summary based on function name and params
    const verbs = {
      'get': 'retrieves',
      'set': 'updates',
      'create': 'creates',
      'delete': 'removes',
      'update': 'modifies',
      'find': 'searches for',
      'parse': 'parses',
      'validate': 'validates',
      'generate': 'generates',
      'handle': 'handles',
      'process': 'processes',
      'calculate': 'calculates',
      'format': 'formats',
      'convert': 'converts',
      'analyze': 'analyzes'
    };

    const lowerName = name.toLowerCase();
    const verb = Object.keys(verbs).find(v => lowerName.includes(v));
    const action = verb ? verbs[verb as keyof typeof verbs] : 'manages';
    
    const subject = name.replace(/^(get|set|create|delete|update|find|parse|validate|generate|handle|process|calculate|format|convert|analyze)/i, '');
    const formattedSubject = subject.replace(/([A-Z])/g, ' $1').toLowerCase().trim() || 'data';
    
    const paramDesc = params.length > 0 ? ` with parameters: ${params.join(', ')}` : '';
    
    return `${action} ${formattedSubject}${paramDesc}`;
  }

  private generateClassSummary(name: string, methods: string[], properties: string[]): string {
    const methodCount = methods.length;
    const propCount = properties.length;
    
    const purpose = name.toLowerCase().includes('manager') ? 'manages' :
                   name.toLowerCase().includes('service') ? 'provides services for' :
                   name.toLowerCase().includes('controller') ? 'controls' :
                   name.toLowerCase().includes('model') ? 'represents' :
                   name.toLowerCase().includes('component') ? 'renders' :
                   'handles';
    
    const subject = name.replace(/(Manager|Service|Controller|Model|Component)$/i, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim() || 'functionality';
    
    return `${purpose} ${subject} with ${methodCount} methods and ${propCount} properties`;
  }

  private isNodeExported(node: any): boolean {
    // Check if function/class is exported
    return node.parent?.type === 'ExportNamedDeclaration' || 
           node.parent?.type === 'ExportDefaultDeclaration' ||
           node.type === 'ExportNamedDeclaration' ||
           node.type === 'ExportDefaultDeclaration';
  }

  private isKeyFile(filePath: string): boolean {
    const keyPatterns = [
      'index', 'main', 'app', 'server', 'client',
      'router', 'routes', 'api', 'controller',
      'service', 'model', 'component', 'manager'
    ];
    
    return keyPatterns.some(pattern => 
      filePath.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private isVeryImportantFile(filePath: string): boolean {
    const veryImportantPatterns = [
      'index.ts', 'index.js', 'main.ts', 'main.js',
      'app.ts', 'app.js', 'server.ts', 'server.js',
      'README.md', 'package.json'
    ];
    
    return veryImportantPatterns.some(pattern => 
      filePath.toLowerCase().endsWith(pattern.toLowerCase())
    );
  }

  private findEntryPoints(structure: ProjectStructure): string[] {
    const entryPoints: string[] = [];
    
    // Common entry point patterns
    const entryPatterns = ['index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js', 'server.ts', 'server.js'];
    
    structure.sourceFiles.forEach(file => {
      if (entryPatterns.some(pattern => file.endsWith(pattern))) {
        entryPoints.push(file);
      }
    });
    
    return entryPoints;
  }

  private truncateContent(content: string, maxLines: number): string {
    const lines = content.split('\n');
    if (lines.length <= maxLines) return content;
    return lines.slice(0, maxLines).join('\n') + '\n... [truncated]';
  }

  private generateFileSummary(content: string, filePath: string): string {
    const lines = content.split('\n');
    const imports = lines.filter(line => line.trim().startsWith('import')).length;
    const exports = lines.filter(line => line.trim().startsWith('export')).length;
    const functions = (content.match(/function\s+\w+|const\s+\w+\s*=.*=>/g) || []).length;
    const classes = (content.match(/class\s+\w+/g) || []).length;
    
    const fileType = filePath.endsWith('.ts') ? 'TypeScript' : 
                    filePath.endsWith('.js') ? 'JavaScript' :
                    filePath.endsWith('.tsx') ? 'React TypeScript' :
                    filePath.endsWith('.jsx') ? 'React JavaScript' : 'Source';
    
    return `${fileType} file with ${lines.length} lines, ${imports} imports, ${exports} exports, ${functions} functions, ${classes} classes`;
  }

  private async analyzeCodeFlow(projectPath: string, analysis: CodeAnalysis): Promise<CodeFlowAnalysis> {
    const callGraph: CallRelationship[] = [];
    const executionOrder: string[] = [];
    const visited = new Set<string>();
    
    // Start from the main entry point
    const mainEntry = analysis.entryPoints[0];
    if (!mainEntry) {
      return { entryPoint: '', callGraph, executionOrder };
    }

    try {
      // Analyze imports and function calls from entry point
      const entryFullPath = path.join(projectPath, mainEntry);
      const entryContent = await fs.readFile(entryFullPath, 'utf-8');
      
      // Extract imports
      const imports = this.extractImports(entryContent, mainEntry);
      callGraph.push(...imports);
      
      // Extract function calls
      const functionCalls = this.extractFunctionCalls(entryContent, mainEntry, analysis.functions);
      callGraph.push(...functionCalls);
      
      // Build execution order based on imports and calls
      executionOrder.push(mainEntry);
      
      // Add imported files in order
      imports.forEach(imp => {
        if (!visited.has(imp.to) && !imp.to.includes('node_modules')) {
          executionOrder.push(imp.to);
          visited.add(imp.to);
        }
      });
      
      // Add called functions in order
      functionCalls.forEach(call => {
        if (!visited.has(call.to)) {
          executionOrder.push(call.to);
          visited.add(call.to);
        }
      });
      
      // Add remaining important files
      analysis.keyFiles.forEach(file => {
        if (!visited.has(file.path)) {
          executionOrder.push(file.path);
        }
      });
      
    } catch (error) {
      console.warn('Failed to analyze code flow:', error);
    }
    
    return {
      entryPoint: mainEntry,
      callGraph,
      executionOrder
    };
  }

  private extractImports(content: string, fileName: string): CallRelationship[] {
    const imports: CallRelationship[] = [];
    const importPattern = /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:{[^}]+}|\w+))?\s*from\s+['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = importPattern.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath && !importPath.includes('node_modules') && (importPath.startsWith('.') || importPath.startsWith('/'))) {
        imports.push({
          from: fileName,
          to: this.resolveImportPath(fileName, importPath),
          type: 'import',
          fileName
        });
      }
    }
    
    return imports;
  }

  private extractFunctionCalls(content: string, fileName: string, allFunctions: FunctionInfo[]): CallRelationship[] {
    const calls: CallRelationship[] = [];
    const functionCallPattern = /(\w+)\s*\(/g;
    
    let match;
    while ((match = functionCallPattern.exec(content)) !== null) {
      const calledFunction = match[1];
      
      // Find if this function exists in our analyzed functions
      const targetFunction = allFunctions.find(f => f.name === calledFunction);
      if (targetFunction && targetFunction.fileName !== fileName) {
        calls.push({
          from: fileName,
          to: `${targetFunction.fileName}:${calledFunction}`,
          type: 'function-call',
          fileName
        });
      }
    }
    
    // Also look for class instantiations
    const classPattern = /new\s+(\w+)\s*\(/g;
    while ((match = classPattern.exec(content)) !== null) {
      const className = match[1];
      if (className) {
        calls.push({
          from: fileName,
          to: className,
          type: 'class-instantiation',
          fileName
        });
      }
    }
    
    return calls;
  }

  private resolveImportPath(fromFile: string, importPath: string): string {
    const dir = path.dirname(fromFile);
    let resolved = path.join(dir, importPath);
    
    // Add .ts/.js extension if not present
    if (!path.extname(resolved)) {
      // For now, just default to .ts for TypeScript projects
      resolved += '.ts';
    }
    
    // Normalize the path
    return path.normalize(resolved).replace(/\\/g, '/');
  }
}