import { AdventureTheme } from './theme.js';

// Minimal interfaces for actual usage

export interface ProjectInfo {
  type: string;
  fileCount: number;
  mainTechnologies: string[];
  hasTests: boolean;
  hasDatabase: boolean;
  hasApi: boolean;
  hasFrontend: boolean;
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