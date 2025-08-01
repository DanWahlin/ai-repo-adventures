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
  theme: string;
  title: string;
  introduction: string;
  setting: string;
  characters: Character[];
  initialChoices: string[];
}

// Tool input types
export interface StartAdventureInput {
  projectPath?: string;
}

export interface ChooseThemeInput {
  theme: 'space' | 'medieval' | 'ancient';
}

export interface ExplorePathInput {
  choice: string;
}

export interface MeetCharacterInput {
  characterName: string;
}

// Analysis configuration
export interface AnalysisConfig {
  maxDepth: number;
  maxFiles: number;
  contentTruncation: number;
  cacheTimeout: number;
  allowedExtensions: string[];
  excludePatterns: string[];
}

// Default configuration constants
export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  maxDepth: 3,
  maxFiles: 500,
  contentTruncation: 1000,
  cacheTimeout: 300000, // 5 minutes
  allowedExtensions: ['.ts', '.js', '.tsx', '.jsx', '.mjs', '.py', '.pyi', '.java', '.cs'],
  excludePatterns: ['node_modules', '.git', 'dist', 'build', '__pycache__', '.pytest_cache']
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