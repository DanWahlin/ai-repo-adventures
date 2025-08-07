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