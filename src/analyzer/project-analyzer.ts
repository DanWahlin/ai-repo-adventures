/**
 * ProjectAnalyzer - Orchestrates project analysis using specialized analyzer classes
 * Refactored to use focused analyzer classes instead of a monolithic approach
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ANALYSIS_LIMITS, TIMEOUTS } from '../shared/index.js';
import { detectLanguageForDisplay } from './language-mapping.js';
import { FileSystemScanner } from './file-system-scanner.js';
import { CodeAnalyzer } from './code-analyzer.js';
import { DependencyParser } from './dependency-parser.js';
import { CodeFlowAnalyzer } from './code-flow-analyzer.js';
import { LinguistAnalyzer, type LinguistResult } from './linguist-analyzer.js';
import type { 
  ProjectInfo, 
  ProjectStructure, 
  CodeAnalysis, 
  AnalysisConfig, 
  AnalysisContext,
  ScanResult,
  FunctionInfo,
  ClassInfo,
  DependencyInfo,
  CodeFlowAnalysis,
  CallRelationship
} from './types.js';

// Re-export types for backward compatibility
export type {
  FunctionInfo,
  ClassInfo,
  DependencyInfo,
  CallRelationship,
  CodeFlowAnalysis,
  CodeAnalysis,
  ProjectInfo,
  ProjectStructure
};

const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  maxDepth: ANALYSIS_LIMITS.MAX_SCAN_DEPTH,
  maxFileSizeMB: ANALYSIS_LIMITS.MAX_FILE_SIZE_MB,
  timeoutMs: TIMEOUTS.FILE_ANALYSIS,
  keySourceFiles: ANALYSIS_LIMITS.KEY_SOURCE_FILES,
  topFunctions: ANALYSIS_LIMITS.TOP_FUNCTIONS,
  topClasses: ANALYSIS_LIMITS.TOP_CLASSES,
  topDependencies: ANALYSIS_LIMITS.TOP_DEPENDENCIES,
  summaryLines: ANALYSIS_LIMITS.SUMMARY_LINES
};

export class ProjectAnalyzer {
  private config: AnalysisConfig;
  private fileScanner: FileSystemScanner;
  private codeAnalyzer: CodeAnalyzer | null = null;
  private linguistAnalyzer: LinguistAnalyzer | null = null;
  private dependencyParser: DependencyParser;
  private codeFlowAnalyzer: CodeFlowAnalyzer;

  constructor(config: Partial<AnalysisConfig> = {}) {
    this.config = { ...DEFAULT_ANALYSIS_CONFIG, ...config };
    
    // Initialize specialized analyzers
    this.fileScanner = new FileSystemScanner(this.config);
    // CodeAnalyzer and LinguistAnalyzer will be initialized asynchronously when needed
    this.dependencyParser = new DependencyParser(this.config);
    this.codeFlowAnalyzer = new CodeFlowAnalyzer(this.config);
  }

  /**
   * Get or initialize the CodeAnalyzer
   */
  private async getCodeAnalyzer(): Promise<CodeAnalyzer> {
    if (!this.codeAnalyzer) {
      this.codeAnalyzer = await CodeAnalyzer.getInstance(this.config);
    }
    return this.codeAnalyzer;
  }

  /**
   * Get or initialize the LinguistAnalyzer
   */
  private async getLinguistAnalyzer(): Promise<LinguistAnalyzer> {
    if (!this.linguistAnalyzer) {
      this.linguistAnalyzer = await LinguistAnalyzer.getInstance(this.config);
    }
    return this.linguistAnalyzer;
  }

  /**
   * Main analysis method - orchestrates all analysis phases
   */
  async analyzeProject(projectPath: string): Promise<ProjectInfo> {
    const context: AnalysisContext = {
      currentOperation: 'project-analysis',
      startTime: Date.now()
    };

    try {
      // Phase 1: Scan filesystem structure
      context.currentOperation = 'filesystem-scan';
      const scanResult = await this.fileScanner.scanProject(projectPath);
      
      // Phase 2: Linguist language analysis (parallel with filesystem scan results)
      context.currentOperation = 'linguist-analysis';
      const linguistResult = await this.performLinguistAnalysis(projectPath);
      
      // Phase 3: Analyze code structure
      context.currentOperation = 'code-analysis';
      const codeAnalysis = await this.analyzeCode(projectPath, scanResult.structure, linguistResult);
      
      // Phase 4: Determine project characteristics (enhanced with linguist data)
      const projectType = this.determineProjectType(scanResult.technologies, scanResult.structure, linguistResult);
      const features = this.analyzeFeatures(scanResult.technologies, scanResult.structure);

      return {
        type: projectType,
        fileCount: scanResult.fileCount,
        mainTechnologies: scanResult.technologies,
        structure: scanResult.structure,
        hasTests: features.hasTests,
        hasDatabase: features.hasDatabase,
        hasApi: features.hasApi,
        hasFrontend: features.hasFrontend,
        codeAnalysis,
        llmContextSummary: this.generateLLMContextSummary(codeAnalysis, scanResult, linguistResult)
      };
    } catch (error) {
      throw new Error(`Project analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Perform linguist analysis on the project directory
   */
  private async performLinguistAnalysis(projectPath: string): Promise<LinguistResult | null> {
    try {
      const analyzer = await this.getLinguistAnalyzer();
      return await analyzer.analyzeDirectory(projectPath);
    } catch (error) {
      console.warn('Failed to perform linguist analysis:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Analyze code structure using specialized analyzers
   */
  private async analyzeCode(projectPath: string, structure: ProjectStructure, _linguistResult?: LinguistResult | null): Promise<CodeAnalysis> {
    const analysis: CodeAnalysis = {
      functions: [],
      classes: [],
      dependencies: [],
      entryPoints: [],
      keyFiles: []
    };

    // Parse dependencies
    analysis.dependencies = await this.dependencyParser.parseDependencies(projectPath);

    // Analyze key source files
    const keySourceFiles = structure.sourceFiles
      .filter(file => this.isKeyFile(file))
      .slice(0, this.config.keySourceFiles);

    for (const filePath of keySourceFiles) {
      const fullPath = path.join(projectPath, filePath);
      try {
        // Check file size before reading
        const stats = await fs.stat(fullPath);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        if (fileSizeMB > this.config.maxFileSizeMB) {
          console.warn(`Skipping large file ${filePath} (${fileSizeMB.toFixed(2)}MB > ${this.config.maxFileSizeMB}MB)`);
          continue;
        }
        
        const content = await fs.readFile(fullPath, 'utf-8');
        
        // Use CodeAnalyzer for ALL languages
        const analyzer = await this.getCodeAnalyzer();
        const fileAnalysis = await analyzer.analyzeFile(content, filePath);
        analysis.functions.push(...fileAnalysis.functions);
        analysis.classes.push(...fileAnalysis.classes);
        
        // Store key file content for LLM context
        if (this.isVeryImportantFile(filePath)) {
          analysis.keyFiles.push({
            path: filePath,
            content: this.truncateContent(content, 100), // Limit lines for LLM
            summary: this.generateFileSummary(content, filePath)
          });
        }
      } catch (error) {
        console.warn(`Failed to analyze file ${filePath}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Identify entry points
    analysis.entryPoints = this.findEntryPoints(structure);

    // Analyze code flow if we have entry points
    if (analysis.entryPoints.length > 0) {
      const codeFlow = await this.codeFlowAnalyzer.analyzeCodeFlow(projectPath, analysis);
      if (codeFlow) {
        analysis.codeFlow = codeFlow;
      }
    }

    return analysis;
  }

  /**
   * Determine project type based on technologies and structure
   */
  private determineProjectType(technologies: string[], _structure: ProjectStructure, linguistResult?: LinguistResult | null): string {
    // Enhanced project type detection with linguist data
    if (linguistResult) {
      
      // Use linguist primary language for more accurate detection
      const primaryLang = linguistResult.primaryLanguage;
      if (primaryLang === 'TypeScript' || primaryLang === 'JavaScript') {
        if (technologies.includes('React') || technologies.includes('Vue') || technologies.includes('Angular')) {
          return 'Web Application';
        }
        return linguistResult.detectedLanguages.includes('HTML') ? 'Web Application' : 'Node.js Application';
      }
      if (primaryLang === 'Python') {
        return 'Python Application';
      }
      if (primaryLang === 'Java') {
        return 'Java Application';
      }
      if (primaryLang === 'C#') {
        return '.NET Application';
      }
      if (primaryLang === 'Go') {
        return 'Go Application';
      }
      if (primaryLang === 'Rust') {
        return 'Rust Application';
      }
    }

    // Fallback to original logic
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

  /**
   * Analyze project features based on technologies and structure
   */
  private analyzeFeatures(technologies: string[], _structure: ProjectStructure): {
    hasTests: boolean;
    hasDatabase: boolean;
    hasApi: boolean;
    hasFrontend: boolean;
  } {
    return {
      hasTests: this.hasFeature('Testing', technologies),
      hasDatabase: this.hasFeature('Database', technologies),
      hasApi: this.hasFeature('API', technologies),
      hasFrontend: this.hasFrontendTech(technologies)
    };
  }

  /**
   * Find entry points in project structure with smart prioritization
   */
  private findEntryPoints(structure: ProjectStructure): string[] {
    const entryPoints: string[] = [];
    
    // Priority 1: Executable entry points across multiple languages
    const executablePatterns = [
      // JavaScript/TypeScript
      'server.js', 'server.ts', 'app.js', 'app.ts', 'main.js', 'main.ts',
      'src/server.js', 'src/server.ts', 'src/app.js', 'src/app.ts', 'src/main.js', 'src/main.ts',
      
      // Python
      'main.py', '__main__.py', 'app.py', 'run.py', 'server.py',
      'src/main.py', 'src/__main__.py', 'src/app.py', 'src/run.py', 'src/server.py',
      
      // Java
      'Main.java', 'Application.java', 'App.java', 'Server.java',
      'src/main/java/Main.java', 'src/Main.java', 'src/Application.java',
      
      // Go
      'main.go', 'cmd/main.go', 'cmd/server/main.go', 'cmd/app/main.go',
      
      // Rust
      'main.rs', 'src/main.rs', 'src/bin/main.rs',
      
      // C/C++
      'main.c', 'main.cpp', 'main.cc', 'app.c', 'app.cpp',
      'src/main.c', 'src/main.cpp', 'src/main.cc',
      
      // C#
      'Program.cs', 'Main.cs', 'Application.cs', 'App.cs', 'Startup.cs',
      'src/Program.cs', 'src/Main.cs', 'src/Application.cs', 'src/App.cs',
      'Program.Main.cs', 'ApplicationMain.cs', 'AppMain.cs',
      
      // PHP
      'index.php', 'app.php', 'main.php', 'server.php',
      'src/index.php', 'src/app.php',
      
      // Ruby
      'main.rb', 'app.rb', 'server.rb',
      'bin/main', 'bin/app', 'bin/server'
    ];
    
    // Priority 2: Module/Library entry points
    const modulePatterns = [
      // JavaScript/TypeScript
      'index.js', 'index.ts', 'src/index.js', 'src/index.ts',
      
      // Python
      '__init__.py', 'src/__init__.py',
      
      // Other languages typically use different module systems
    ];

    // Find executable entry points first (highest priority)
    executablePatterns.forEach(pattern => {
      const found = structure.sourceFiles.find(file => 
        file.endsWith(pattern) || file === pattern
      );
      if (found && !entryPoints.includes(found)) {
        entryPoints.push(found);
      }
    });
    
    // Only look for module entry points if no executable found
    if (entryPoints.length === 0) {
      modulePatterns.forEach(pattern => {
        const found = structure.sourceFiles.find(file => 
          file.endsWith(pattern) || file === pattern
        );
        if (found && !entryPoints.includes(found)) {
          entryPoints.push(found);
        }
      });
    }

    // Enhanced analysis: Check package.json for actual entry point
    const packageJsonEntry = this.getPackageJsonEntry(structure);
    if (packageJsonEntry && !entryPoints.includes(packageJsonEntry)) {
      entryPoints.unshift(packageJsonEntry); // Add to front (highest priority)
    }

    // Final fallback: use first source file if no clear entry point
    if (entryPoints.length === 0 && structure.sourceFiles.length > 0) {
      const firstFile = structure.sourceFiles[0];
      if (firstFile) {
        entryPoints.push(firstFile);
      }
    }

    return entryPoints;
  }

  /**
   * Extract entry point from package.json if available
   */
  private getPackageJsonEntry(structure: ProjectStructure): string | null {
    // Look for package.json in config files
    const packageJsonFile = structure.configFiles.find(file => 
      file.includes('package.json')
    );
    
    if (!packageJsonFile) return null;
    
    // For now, we can't read the file content here, but we can infer common patterns
    // If we find 'src/server.ts' or similar executable files, prioritize them
    const commonExecutables = ['src/server.ts', 'src/server.js', 'src/app.ts', 'src/app.js'];
    const found = structure.sourceFiles.find(file => 
      commonExecutables.some(executable => file.endsWith(executable))
    );
    
    return found || null;
  }

  /**
   * Generate LLM context summary for the project
   */
  private generateLLMContextSummary(codeAnalysis: CodeAnalysis, scanResult: ScanResult, linguistResult?: LinguistResult | null): string {
    const topFunctions = codeAnalysis.functions
      .slice(0, 5)
      .map(f => `${f.name}() - ${f.summary}`)
      .join(', ');

    const topClasses = codeAnalysis.classes
      .slice(0, 3)
      .map(c => `${c.name} - ${c.summary}`)
      .join(', ');

    let summary = `Project with ${scanResult.fileCount} files using ${scanResult.technologies.join(', ')}. `;

    // Enhanced with linguist data
    if (linguistResult) {
      const topLanguages = linguistResult.languageDistribution
        .slice(0, 3)
        .map(lang => `${lang.language} (${lang.percentage}%)`)
        .join(', ');
      
      summary += `Language distribution: ${topLanguages}. `;
      summary += `Primary language: ${linguistResult.primaryLanguage}. `;
    }

    // Add purpose and domain context from key files
    const purposeContext = this.extractPurposeContext(codeAnalysis, scanResult);
    if (purposeContext) {
      summary += `Project purpose: ${purposeContext}. `;
    }

    summary += `Key functions: ${topFunctions || 'None detected'}. `;
    summary += `Key classes: ${topClasses || 'None detected'}. `;
    summary += `Entry points: ${codeAnalysis.entryPoints.join(', ') || 'None detected'}. `;

    // Add design patterns and architectural insights
    const architecturalPatterns = this.detectArchitecturalPatterns(codeAnalysis, scanResult);
    if (architecturalPatterns.length > 0) {
      summary += `Patterns: ${architecturalPatterns.join(', ')}. `;
    }

    // Add code flow analysis information
    if (codeAnalysis.codeFlow) {
      const flow = codeAnalysis.codeFlow;
      summary += `Code flow: ${flow.modules.length} modules with ${flow.relationships.length} relationships. `;
      
      if (flow.executionOrder && flow.executionOrder.length > 0) {
        const orderPreview = flow.executionOrder.slice(0, 3).join(' → ');
        summary += `Execution flow: ${orderPreview}${flow.executionOrder.length > 3 ? '...' : ''}. `;
      }

      // Add dependency insights
      const importRelationships = flow.relationships.filter(r => r.type === 'import').length;
      const functionCalls = flow.relationships.filter(r => r.type === 'function-call').length;
      if (importRelationships > 0 || functionCalls > 0) {
        summary += `Dependencies: ${importRelationships} imports, ${functionCalls} function calls. `;
      }
    }

    // Add key dependencies with real-world context
    const keyDeps = codeAnalysis.dependencies
      .filter(d => d.type === 'dependency')
      .slice(0, 5)
      .map(d => `${d.name} (${d.category})`)
      .join(', ');
    if (keyDeps) {
      summary += `Key dependencies: ${keyDeps}. `;
    }

    return summary;
  }

  /**
   * Extract project purpose and domain context from README and key files
   */
  private extractPurposeContext(codeAnalysis: CodeAnalysis, scanResult: ScanResult): string | null {
    // Look for README files in structure
    const readmeFile = scanResult.structure.importantFiles.find(file => 
      file.toLowerCase().includes('readme')
    );
    
    if (readmeFile) {
      // Extract first meaningful line from README
      const readmeContent = codeAnalysis.keyFiles.find(kf => kf.path.includes('readme'));
      if (readmeContent) {
        const lines = readmeContent.content.split('\n').filter(line => line.trim().length > 0);
        const descriptionLine = lines.find(line => 
          !line.startsWith('#') && 
          !line.startsWith('[![') && 
          line.length > 20 &&
          !line.toLowerCase().includes('installation') &&
          !line.toLowerCase().includes('getting started')
        );
        if (descriptionLine) {
          return descriptionLine.trim().substring(0, 100);
        }
      }
    }

    // Fallback: analyze function names for domain clues
    const domainKeywords = codeAnalysis.functions
      .map(f => f.name.toLowerCase())
      .filter(name => 
        name.includes('user') || name.includes('auth') || name.includes('order') ||
        name.includes('payment') || name.includes('product') || name.includes('email') ||
        name.includes('game') || name.includes('player') || name.includes('score') ||
        name.includes('message') || name.includes('chat') || name.includes('post') ||
        name.includes('admin') || name.includes('dashboard') || name.includes('report')
      );

    if (domainKeywords.length > 0) {
      const primaryDomain = domainKeywords[0];
      if (primaryDomain.includes('user') || primaryDomain.includes('auth')) return 'User management system';
      if (primaryDomain.includes('order') || primaryDomain.includes('payment')) return 'E-commerce platform';
      if (primaryDomain.includes('game') || primaryDomain.includes('player')) return 'Gaming application';
      if (primaryDomain.includes('message') || primaryDomain.includes('chat')) return 'Communication platform';
      if (primaryDomain.includes('admin') || primaryDomain.includes('dashboard')) return 'Administrative dashboard';
    }

    return null;
  }

  /**
   * Detect architectural patterns from code structure
   */
  private detectArchitecturalPatterns(codeAnalysis: CodeAnalysis, scanResult: ScanResult): string[] {
    const patterns: string[] = [];

    // MVC pattern detection
    const hasMVC = scanResult.structure.directories.some(dir => 
      dir.includes('model') || dir.includes('view') || dir.includes('controller')
    ) || codeAnalysis.functions.some(f => 
      f.fileName.includes('controller') || f.fileName.includes('model') || f.fileName.includes('view')
    );
    if (hasMVC) patterns.push('MVC');

    // Repository pattern
    const hasRepository = codeAnalysis.classes.some(c => 
      c.name.toLowerCase().includes('repository') || c.name.toLowerCase().includes('dao')
    );
    if (hasRepository) patterns.push('Repository');

    // Service layer pattern
    const hasService = codeAnalysis.classes.some(c => 
      c.name.toLowerCase().includes('service') || c.name.toLowerCase().includes('manager')
    );
    if (hasService) patterns.push('Service Layer');

    // Factory pattern
    const hasFactory = codeAnalysis.functions.some(f => 
      f.name.toLowerCase().includes('create') || f.name.toLowerCase().includes('factory') ||
      f.name.toLowerCase().includes('builder')
    );
    if (hasFactory) patterns.push('Factory');

    // Observer/Event pattern
    const hasEvents = codeAnalysis.functions.some(f => 
      f.name.toLowerCase().includes('emit') || f.name.toLowerCase().includes('trigger') ||
      f.name.toLowerCase().includes('subscribe') || f.name.toLowerCase().includes('listen')
    );
    if (hasEvents) patterns.push('Observer/Events');

    // Middleware pattern
    const hasMiddleware = scanResult.structure.directories.some(dir => 
      dir.includes('middleware') || dir.includes('middlewares')
    ) || codeAnalysis.functions.some(f => f.fileName.includes('middleware'));
    if (hasMiddleware) patterns.push('Middleware');

    return patterns;
  }

  /**
   * Helper methods
   */
  private getLanguageFromExtension(filePath: string): string | null {
    return detectLanguageForDisplay(filePath);
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

  private hasFeature(feature: string, technologies: string[]): boolean {
    return technologies.includes(feature);
  }

  private hasFrontendTech(technologies: string[]): boolean {
    return technologies.some(tech => 
      ['React', 'Vue', 'Angular', 'JavaScript', 'TypeScript'].includes(tech)
    );
  }

  private truncateContent(content: string, maxLines: number): string {
    const lines = content.split('\n');
    if (lines.length <= maxLines) {
      return content;
    }
    return lines.slice(0, maxLines).join('\n') + `\n... (${lines.length - maxLines} more lines)`;
  }

  private generateFileSummary(content: string, filePath: string): string {
    const lines = content.split('\n');
    const firstComment = lines.find(line => line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*'));
    
    if (firstComment) {
      return firstComment.replace(/^[\s/*]+/, '').trim();
    }
    
    // Fallback: describe based on file name and size
    const fileName = path.basename(filePath);
    return `${fileName} - ${lines.length} lines of ${this.getLanguageFromExtension(filePath) || 'code'}`;
  }

  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    // Clean up CodeAnalyzer if initialized
    if (this.codeAnalyzer) {
      await this.codeAnalyzer.cleanup();
      this.codeAnalyzer = null;
    }
    
    // Clean up LinguistAnalyzer if initialized
    if (this.linguistAnalyzer) {
      await this.linguistAnalyzer.cleanup();
      this.linguistAnalyzer = null;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AnalysisConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update analyzer configurations
    this.fileScanner.updateConfig(this.config);
  }
}