import { AdventureTheme } from './theme.js';

// Minimal interfaces for actual usage

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