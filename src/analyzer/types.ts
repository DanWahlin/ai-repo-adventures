/**
 * Shared types and interfaces for the analyzer system
 */

export interface FunctionInfo {
  name: string;
  summary: string;
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  fileName: string;
  lineNumber?: number;
  source: 'regex';
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
  source: 'regex';
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
  relationships: CallRelationship[];
  modules: string[];
  executionOrder?: string[];
  callGraph?: CallRelationship[];
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
  llmContextSummary?: string;
}

export interface ProjectStructure {
  directories: string[];
  importantFiles: string[];
  configFiles: string[];
  sourceFiles: string[];
}

// Analysis configuration interface
export interface AnalysisConfig {
  maxDepth: number;
  maxFileSizeMB: number;
  timeoutMs: number;
  keySourceFiles: number;
  topFunctions: number;
  topClasses: number;
  topDependencies: number;
  summaryLines: number;
}

// Scanner-specific types
export interface ScanResult {
  structure: ProjectStructure;
  fileCount: number;
  technologies: string[];
}

// Parser-specific types
export interface ParseResult {
  functions: FunctionInfo[];
  classes: ClassInfo[];
}

// Analysis context for error reporting
export interface AnalysisContext {
  currentFile?: string;
  currentOperation?: string;
  startTime?: number;
}