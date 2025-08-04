/**
 * Repomix-based Project Analyzer
 * 
 * This analyzer leverages repomix to generate compressed codebase context
 * and uses LLM analysis for intelligent project understanding.
 * Replaces the complex custom analysis with a simpler, more effective approach.
 */

import { runCli, type CliOptions } from 'repomix';
import * as fs from 'fs/promises';
import * as path from 'path';
import { LLMClient } from '../llm/llm-client.js';

// Core types used by RepomixAnalyzer
export interface FunctionInfo {
  name: string;
  summary: string;
  parameters: string[];
  isAsync: boolean;
  isExported: boolean;
  fileName: string;
  source: 'regex';
}

export interface ClassInfo {
  name: string;
  summary: string;
  methods: string[];
  properties: string[];
  isExported: boolean;
  fileName: string;
  source: 'regex';
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'dependency';
  category: string;
}

export interface CodeAnalysis {
  functions: FunctionInfo[];
  classes: ClassInfo[];
  dependencies: DependencyInfo[];
  entryPoints: string[];
  keyFiles: Array<{ path: string; content: string; summary: string }>;
  codeFlow?: {
    entryPoint: string;
    relationships: Array<{
      from: string;
      to: string;
      type: string;
      fileName: string;
    }>;
    modules: string[];
    executionOrder?: string[];
  };
}

export interface ProjectStructure {
  directories: string[];
  importantFiles: string[];
  configFiles: string[];
  sourceFiles: string[];
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
  llmContextSummary?: string;
}

export interface RepomixOptions {
  compress?: boolean;
  includeTests?: boolean;
  maxTokens?: number;
  style?: 'xml' | 'markdown' | 'plain';
}

export class RepomixAnalyzer {
  private llmClient: LLMClient | null = null;
  private tempDir: string;

  constructor() {
    this.tempDir = '/tmp/repomix-analysis';
  }

  private getLLMClient(): LLMClient {
    if (!this.llmClient) {
      this.llmClient = new LLMClient();
    }
    return this.llmClient;
  }


  /**
   * Main analysis method using repomix + LLM
   */
  async analyzeProject(projectPath: string, options: RepomixOptions = {}): Promise<ProjectInfo> {
    const startTime = Date.now();
    
    // Ensure temp directory exists
    await fs.mkdir(this.tempDir, { recursive: true });
    
    // Generate repomix context
    const repoContext = await this.generateRepomixContext(projectPath, options);
    
    // Perform lightweight basic analysis
    const basicInfo = await this.performBasicAnalysis(projectPath, repoContext);
    
    // Use LLM for intelligent analysis if available
    let llmInsights = null;
    if (this.getLLMClient().isAvailable()) {
      try {
        llmInsights = await this.getLLMInsights(repoContext, basicInfo);
      } catch (error) {
        console.warn('LLM analysis failed, using basic analysis only:', error);
      }
    }
    
    // Combine results
    const projectInfo: ProjectInfo = {
      ...basicInfo,
      llmContextSummary: llmInsights || this.generateFallbackSummary(basicInfo, repoContext)
    };

    console.log(`✅ Repomix analysis completed in ${Date.now() - startTime}ms`);
    return projectInfo;
  }

  /**
   * Generate compressed codebase context using repomix programmatic API
   */
  private async generateRepomixContext(projectPath: string, options: RepomixOptions): Promise<string> {
    const outputFile = path.join(this.tempDir, `repomix-${Date.now()}.md`);
    
    try {
      // Build ignore patterns
      const ignorePatterns = [
        'node_modules',
        'dist',
        'build', 
        '.git',
        'coverage',
        '.nyc_output'
      ];
      
      if (!options.includeTests) {
        ignorePatterns.push('**/*.test.ts', '**/*.spec.ts', '**/tests/**', '**/test/**');
      }

      // Configure repomix options
      const cliOptions: CliOptions = {
        style: options.style || 'markdown',
        output: outputFile,
        compress: options.compress || false,
        ignore: ignorePatterns.join(','),
        removeComments: true,
        removeEmptyLines: true,
        noDirectoryStructure: true
      };

      // Use repomix programmatic API
      await runCli(['.'], projectPath, cliOptions);

      // Verify file exists and read the generated context
      try {
        await fs.access(outputFile);
        const context = await fs.readFile(outputFile, 'utf-8');
        
        // Clean up temp file
        await fs.unlink(outputFile).catch(() => {}); // Ignore cleanup errors
        
        return context;
      } catch (fileError) {
        throw new Error(`Repomix output file not found at ${outputFile}: ${fileError instanceof Error ? fileError.message : String(fileError)}`);
      }
    } catch (error) {
      throw new Error(`Repomix API execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Perform lightweight analysis of basic project characteristics
   */
  private async performBasicAnalysis(_projectPath: string, repoContext: string): Promise<Omit<ProjectInfo, 'llmContextSummary'>> {
    // Extract basic metrics from repomix output
    const fileCount = this.extractFileCount(repoContext);
    const technologies = this.detectTechnologies(repoContext);
    const projectType = this.inferProjectType(repoContext, technologies);
    
    // Basic feature detection
    const hasTests = repoContext.toLowerCase().includes('test') || repoContext.toLowerCase().includes('spec');
    const hasApi = repoContext.includes('express') || repoContext.includes('fastify') || repoContext.includes('api');
    const hasDatabase = repoContext.includes('database') || repoContext.includes('prisma') || repoContext.includes('mongoose');
    const hasFrontend = technologies.some(tech => ['REACT', 'VUE', 'ANGULAR'].includes(tech));

    // Create basic code analysis from repomix context
    const codeAnalysis = this.extractCodeAnalysisFromContext(repoContext);

    // Create basic structure
    const structure = this.extractStructureFromContext(repoContext);

    return {
      type: projectType,
      fileCount,
      mainTechnologies: this.prioritizeTechnologies(technologies),
      structure,
      hasTests,
      hasDatabase,
      hasApi,
      hasFrontend,
      codeAnalysis
    };
  }

  /**
   * Get intelligent insights from LLM using repomix context
   */
  private async getLLMInsights(repoContext: string, basicInfo: Omit<ProjectInfo, 'llmContextSummary'>): Promise<string> {
    const prompt = `Analyze this codebase and provide a comprehensive summary for story generation.

**Codebase Context:**
${repoContext.substring(0, 15000)} // Limit context to avoid token limits

**Current Basic Analysis:**
- Type: ${basicInfo.type}
- Technologies: ${basicInfo.mainTechnologies.join(', ')}
- File Count: ${basicInfo.fileCount}
- Features: API(${basicInfo.hasApi}), Database(${basicInfo.hasDatabase}), Frontend(${basicInfo.hasFrontend}), Tests(${basicInfo.hasTests})

**Instructions:**
1. Identify the PRIMARY PURPOSE of this project in 1-2 sentences
2. List the 3-5 most important functions/features this codebase provides
3. Describe the architectural style and key patterns used
4. Identify the target domain (e.g., "MCP server for code exploration", "E-commerce platform", "CLI tool", etc.)
5. Highlight any unique or interesting aspects that should be emphasized in stories

**Response Format:**
Primary Purpose: [Brief description]
Key Features: [3-5 bullet points]
Architecture: [Brief architectural summary]
Domain: [Project domain/category]  
Unique Aspects: [Notable characteristics]

Keep response under 500 words and focus on elements that would make for engaging storytelling.`;

    const response = await this.getLLMClient().generateResponse(prompt);
    return response.content;
  }

  /**
   * Generate fallback summary when LLM is unavailable
   */
  private generateFallbackSummary(basicInfo: Omit<ProjectInfo, 'llmContextSummary'>, _repoContext: string): string {
    const keyElements = [];
    
    if (basicInfo.hasApi) keyElements.push('API endpoints');
    if (basicInfo.hasDatabase) keyElements.push('data persistence');  
    if (basicInfo.hasFrontend) keyElements.push('user interface');
    if (basicInfo.hasTests) keyElements.push('testing infrastructure');

    const mainFeatures = keyElements.length > 0 ? keyElements.join(', ') : 'core functionality';

    return `${basicInfo.type} with ${basicInfo.fileCount} files using ${basicInfo.mainTechnologies.slice(0, 3).join(', ')}. ` +
           `Primary features include ${mainFeatures}. ` + 
           `The project follows modern development practices and is structured for maintainability.`;
  }

  /**
   * Extract file count from repomix output
   */
  private extractFileCount(context: string): number {
    const match = context.match(/Total Files:\s*(\d+)/i);
    return match && match[1] ? parseInt(match[1], 10) : 0;
  }

  /**
   * Detect technologies from repomix context
   */
  private detectTechnologies(context: string): string[] {
    const technologies = new Set<string>();
    const lowerContext = context.toLowerCase();

    // Technology patterns
    const patterns: Record<string, string[]> = {
      'TYPESCRIPT': ['typescript', '.ts', 'tsconfig'],
      'JAVASCRIPT': ['javascript', '.js', 'package.json'],
      'REACT': ['react', 'jsx', 'tsx'],
      'VUE': ['vue', '.vue', '@vue'],
      'ANGULAR': ['@angular', 'angular.json'],
      'NODE': ['node', 'npm', 'package.json'],
      'EXPRESS': ['express'],
      'FASTIFY': ['fastify'],
      'PYTHON': ['.py', 'python', 'requirements.txt'],
      'JAVA': ['.java', 'maven', 'gradle'],
      'GO': ['.go', 'go.mod'],
      'RUST': ['.rs', 'cargo.toml'],
      'DATABASE': ['database', 'db', 'sql', 'mongodb', 'postgres'],
      'API': ['api', 'rest', 'graphql', 'routes'],
      'TESTING': ['test', 'spec', 'jest', 'mocha', 'cypress'],
      'DOCKER': ['docker', 'dockerfile'],
      'BUILD_TOOLS': ['webpack', 'vite', 'rollup']
    };

    for (const [tech, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => lowerContext.includes(keyword))) {
        technologies.add(tech);
      }
    }

    return Array.from(technologies);
  }

  /**
   * Infer project type from context and technologies
   */
  private inferProjectType(context: string, technologies: string[]): string {
    const lowerContext = context.toLowerCase();

    // MCP Server detection
    if (lowerContext.includes('@modelcontextprotocol') || lowerContext.includes('mcp')) {
      return 'MCP Server';
    }

    // Web application detection
    if (technologies.some(tech => ['REACT', 'VUE', 'ANGULAR'].includes(tech))) {
      return 'Web Application';
    }

    // API service detection  
    if (technologies.includes('API') && !technologies.some(tech => ['REACT', 'VUE', 'ANGULAR'].includes(tech))) {
      return 'API Service';
    }

    // CLI tool detection
    if (lowerContext.includes('cli') || lowerContext.includes('command') || lowerContext.includes('#!/usr/bin/env')) {
      return 'CLI Tool';
    }

    // Language-specific defaults
    if (technologies.includes('PYTHON')) return 'Python Application';
    if (technologies.includes('JAVA')) return 'Java Application';
    if (technologies.includes('GO')) return 'Go Application';
    if (technologies.includes('RUST')) return 'Rust Application';

    return 'Software Project';
  }

  /**
   * Prioritize technologies (core functionality over testing/infrastructure)
   */
  private prioritizeTechnologies(technologies: string[]): string[] {
    const priorityTiers = {
      core: ['TYPESCRIPT', 'JAVASCRIPT', 'PYTHON', 'JAVA', 'GO', 'RUST', 'REACT', 'VUE', 'ANGULAR'],
      infrastructure: ['API', 'DATABASE', 'DOCKER', 'BUILD_TOOLS'],
      support: ['TESTING']
    };

    const prioritized: string[] = [];
    const processed = new Set<string>();

    // Add technologies in priority order
    for (const techList of Object.values(priorityTiers)) {
      for (const tech of techList) {
        if (technologies.includes(tech) && !processed.has(tech)) {
          prioritized.push(tech);
          processed.add(tech);
        }
      }
    }

    // Add any remaining technologies
    for (const tech of technologies) {
      if (!processed.has(tech)) {
        prioritized.push(tech);
      }
    }

    return prioritized;
  }

  /**
   * Extract basic code analysis from repomix context
   */
  private extractCodeAnalysisFromContext(context: string): CodeAnalysis {
    // Extract function names from repomix compressed output
    const functionMatches = context.match(/(?:function|async function|const \w+ =|export (?:async )?function)\s+(\w+)/g) || [];
    const functions = functionMatches.map((match) => ({
      name: match.replace(/.*\s+(\w+).*/, '$1'),
      summary: 'Function extracted from codebase',
      parameters: [],
      isAsync: match.includes('async'),
      isExported: match.includes('export'),
      fileName: 'extracted',
      source: 'regex' as const
    })).slice(0, 10); // Limit to 10 functions

    // Extract class names
    const classMatches = context.match(/(?:class|export class)\s+(\w+)/g) || [];
    const classes = classMatches.map((match) => ({
      name: match.replace(/.*class\s+(\w+).*/, '$1'),
      summary: 'Class extracted from codebase',
      methods: [],
      properties: [],
      isExported: match.includes('export'),
      fileName: 'extracted',
      source: 'regex' as const
    })).slice(0, 5); // Limit to 5 classes

    // Extract dependencies from repomix output
    const depMatches = context.match(/import.*from\s+['"]([^'"]*)['"]/g) || [];
    const dependencies = depMatches
      .map(match => match.replace(/.*from\s+['"]([^'"]*)['"]/g, '$1'))
      .filter(dep => !dep.startsWith('.')) // Only external dependencies
      .slice(0, 10) // Limit to 10 deps
      .map(name => ({
        name,
        version: 'unknown',
        type: 'dependency' as const,
        category: 'extracted'
      }));

    // Find potential entry points
    const entryPoints = [];
    if (context.includes('src/server.ts') || context.includes('server.ts')) entryPoints.push('src/server.ts');
    if (context.includes('src/index.ts') || context.includes('index.ts')) entryPoints.push('src/index.ts');
    if (context.includes('src/main.ts') || context.includes('main.ts')) entryPoints.push('src/main.ts');

    return {
      functions,
      classes,
      dependencies,
      entryPoints,
      keyFiles: []
    };
  }

  /**
   * Extract basic structure from repomix context
   */
  private extractStructureFromContext(context: string): ProjectStructure {
    // Extract file paths from repomix output
    const fileMatches = context.match(/## File: ([^\n]+)/g) || [];
    const files = fileMatches.map(match => match.replace('## File: ', ''));
    
    // Categorize files
    const sourceFiles = files.filter(f => f.match(/\.(ts|js|py|java|go|rs|cpp|c)$/));
    const configFiles = files.filter(f => f.match(/\.(json|yaml|yml|toml|ini|config)$/));
    const directories = [...new Set(files.map(f => path.dirname(f) || '.').filter(d => d !== '.'))];

    return {
      sourceFiles,
      configFiles,
      directories,
      importantFiles: files.filter(f => f.toLowerCase().includes('readme') || f.includes('package.json'))
    };
  }


  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}