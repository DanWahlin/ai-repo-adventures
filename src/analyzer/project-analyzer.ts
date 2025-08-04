/**
 * ProjectAnalyzer - Main orchestrator for project analysis
 * 
 * This analyzer orchestrates the RepomixAnalyzer to provide comprehensive
 * project analysis using repomix for context generation and LLM for insights.
 */

import { RepomixAnalyzer, type RepomixOptions, type ProjectInfo } from './repomix-analyzer.js';

export class ProjectAnalyzer {
  private repomixAnalyzer: RepomixAnalyzer;

  constructor() {
    this.repomixAnalyzer = new RepomixAnalyzer();
  }

  /**
   * Analyze project using RepomixAnalyzer
   */
  async analyzeProject(projectPath: string, options?: RepomixOptions): Promise<ProjectInfo> {
    try {
      // Delegate to RepomixAnalyzer for comprehensive analysis
      return await this.repomixAnalyzer.analyzeProject(projectPath, options || {});
    } catch (error) {
      throw new Error(`Project analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  async cleanup(): Promise<void> {
    await this.repomixAnalyzer.cleanup();
  }

}