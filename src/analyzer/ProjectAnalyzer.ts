/**
 * ProjectAnalyzer - Orchestrates project analysis using specialized analyzer classes
 * Refactored to use focused analyzer classes instead of a monolithic approach
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { CONFIG } from '../shared/config.js';
import { FileSystemScanner } from './FileSystemScanner.js';
import { CodeAnalyzer } from './CodeAnalyzer.js';
import { DependencyParser } from './DependencyParser.js';
import { CodeFlowAnalyzer } from './CodeFlowAnalyzer.js';
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
  maxDepth: CONFIG.ANALYSIS.MAX_DEPTH,
  maxFileSizeMB: CONFIG.ANALYSIS.MAX_FILE_SIZE_MB,
  timeoutMs: CONFIG.ANALYSIS.TIMEOUT_MS,
  keySourceFiles: CONFIG.ANALYSIS.KEY_SOURCE_FILES_LIMIT,
  topFunctions: CONFIG.ANALYSIS.TOP_FUNCTIONS,
  topClasses: CONFIG.ANALYSIS.TOP_CLASSES,
  topDependencies: CONFIG.ANALYSIS.TOP_DEPENDENCIES,
  summaryLines: CONFIG.ANALYSIS.SUMMARY_LINES
};

export class ProjectAnalyzer {
  private config: AnalysisConfig;
  private fileScanner: FileSystemScanner;
  private codeAnalyzer: CodeAnalyzer | null = null;
  private dependencyParser: DependencyParser;
  private codeFlowAnalyzer: CodeFlowAnalyzer;

  constructor(config: Partial<AnalysisConfig> = {}) {
    this.config = { ...DEFAULT_ANALYSIS_CONFIG, ...config };
    
    // Initialize specialized analyzers
    this.fileScanner = new FileSystemScanner(this.config);
    // CodeAnalyzer will be initialized asynchronously when needed
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
      
      // Phase 2: Analyze code structure
      context.currentOperation = 'code-analysis';
      const codeAnalysis = await this.analyzeCode(projectPath, scanResult.structure);
      
      // Phase 3: Determine project characteristics
      const projectType = this.determineProjectType(scanResult.technologies, scanResult.structure);
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
        llmContextSummary: this.generateLLMContextSummary(codeAnalysis, scanResult)
      };
    } catch (error) {
      throw new Error(`Project analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Analyze code structure using specialized analyzers
   */
  private async analyzeCode(projectPath: string, structure: ProjectStructure): Promise<CodeAnalysis> {
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
   * Find entry points in project structure
   */
  private findEntryPoints(structure: ProjectStructure): string[] {
    const entryPoints: string[] = [];
    const entryPatterns = [
      'index.js', 'index.ts', 'main.js', 'main.ts',
      'app.js', 'app.ts', 'server.js', 'server.ts',
      'src/index.js', 'src/index.ts', 'src/main.js', 'src/main.ts',
      'src/app.js', 'src/app.ts'
    ];

    entryPatterns.forEach(pattern => {
      const found = structure.sourceFiles.find(file => 
        file.endsWith(pattern) || file.includes(pattern)
      );
      if (found && !entryPoints.includes(found)) {
        entryPoints.push(found);
      }
    });

    // Fallback: use first source file if no clear entry point
    if (entryPoints.length === 0 && structure.sourceFiles.length > 0) {
      const firstFile = structure.sourceFiles[0];
      if (firstFile) {
        entryPoints.push(firstFile);
      }
    }

    return entryPoints;
  }

  /**
   * Generate LLM context summary for the project
   */
  private generateLLMContextSummary(codeAnalysis: CodeAnalysis, scanResult: ScanResult): string {
    const topFunctions = codeAnalysis.functions
      .slice(0, 5)
      .map(f => `${f.name}() - ${f.summary}`)
      .join(', ');

    const topClasses = codeAnalysis.classes
      .slice(0, 3)
      .map(c => `${c.name} - ${c.summary}`)
      .join(', ');

    return `Project with ${scanResult.fileCount} files using ${scanResult.technologies.join(', ')}. ` +
           `Key functions: ${topFunctions || 'None detected'}. ` +
           `Key classes: ${topClasses || 'None detected'}. ` +
           `Entry points: ${codeAnalysis.entryPoints.join(', ') || 'None detected'}.`;
  }

  /**
   * Helper methods
   */
  private getLanguageFromExtension(filePath: string): string | null {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust'
    };
    return languageMap[ext] || null;
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