import { AdventureTheme } from './theme.js';

// Legacy interfaces - kept minimal for backward compatibility
// In the future, these should be removed as we move to LLM-first approach

export interface FunctionInfo {
  name: string;
  summary: string;
  fileName: string;
  source: 'llm';
}

export interface ClassInfo {
  name: string;
}

export interface DependencyInfo {
  name: string;
  type: 'dependency';
}

export interface CodeAnalysis {
  functions: FunctionInfo[];
  classes: ClassInfo[];
  dependencies: DependencyInfo[];
  entryPoints: string[];
}

export interface ProjectInfo {
  type: string;
  fileCount: number;
  mainTechnologies: string[];
  hasTests: boolean;
  hasDatabase: boolean;
  hasApi: boolean;
  hasFrontend: boolean;
  codeAnalysis: CodeAnalysis;
  repomixContent: string; // The raw repomix content - this is the important part
  llmContextSummary?: string;
}

// Story and Character types
export interface Character {
  name: string;
  role: string;
  description: string;
  greeting: string;
  funFact: string;
  technology: string;
}

export interface Story {
  theme: AdventureTheme;
  title: string;
  introduction: string;
  setting: string;
  characters: Character[];
  initialChoices: string[];
}


// Analysis configuration
export interface AnalysisConfig {
  maxDepth: number;
  maxFiles: number;
  contentTruncation: number;
  cacheTimeout: number;
  allowedExtensions: string[];
  excludePatterns: string[];
  // Timeout configurations (in milliseconds)
  timeouts: {
    fileRead: number;
    analysis: number;
  };
  // Analysis limits
  limits: {
    maxFileSizeMB: number;
    keySourceFiles: number;
    topFunctions: number;
    topClasses: number;
    topDependencies: number;
    summaryLines: number;
    fileReadLines: number;
    lineCharacters: number;
  };
}

// Default configuration constants
export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  maxDepth: 3,
  maxFiles: 500,
  contentTruncation: 1000,
  cacheTimeout: 300000, // 5 minutes
  allowedExtensions: ['.ts', '.js', '.tsx', '.jsx', '.mjs', '.py', '.pyi', '.java', '.cs'],
  excludePatterns: ['node_modules', '.git', 'dist', 'build', '__pycache__', '.pytest_cache'],
  timeouts: {
    fileRead: 10000,        // 10 seconds for file reading
    analysis: 30000         // 30 seconds for analysis operations
  },
  limits: {
    maxFileSizeMB: 10,
    keySourceFiles: 10,
    topFunctions: 20,
    topClasses: 5,
    topDependencies: 20,
    summaryLines: 10,
    fileReadLines: 2000,
    lineCharacters: 2000
  }
};

// Cache interface
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface AnalysisCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  has(key: string): boolean;
  clear(): void;
  size(): number;
}