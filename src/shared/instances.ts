import { ProjectAnalyzer, ProjectInfo } from '../analyzer/ProjectAnalyzer.js';
import { DynamicStoryGenerator } from '../story/DynamicStoryGenerator.js';
import { AdventureManager } from '../adventure/AdventureManager.js';
import { LRUCache } from './cache.js';

// Analysis state management with improved caching
class OptimizedAnalyzer {
  private analyzer = new ProjectAnalyzer();
  private cache = new LRUCache(50, 300000); // 50 entries, 5min TTL
  private activeAnalysis: Map<string, Promise<ProjectInfo>> = new Map();

  async analyzeProject(projectPath: string): Promise<ProjectInfo> {
    // Check cache first
    const cached = this.cache.get<ProjectInfo>(projectPath);
    if (cached) {
      console.log('📋 Using cached analysis for', projectPath);
      return cached;
    }

    // Check if analysis is already in progress
    const ongoing = this.activeAnalysis.get(projectPath);
    if (ongoing) {
      console.log('⏳ Analysis already in progress for', projectPath);
      return ongoing;
    }

    // Start new analysis
    console.log('🔍 Starting fresh analysis for', projectPath);
    const analysisPromise = this.analyzer.analyzeProject(projectPath).then(result => {
      this.cache.set(projectPath, result);
      this.activeAnalysis.delete(projectPath);
      return result;
    }).catch(error => {
      this.activeAnalysis.delete(projectPath);
      throw error;
    });

    this.activeAnalysis.set(projectPath, analysisPromise);
    return analysisPromise;
  }

  // Pre-trigger analysis without waiting
  preAnalyze(projectPath: string): void {
    if (!this.cache.has(projectPath) && !this.activeAnalysis.has(projectPath)) {
      this.analyzeProject(projectPath).catch(error => {
        console.error(`Pre-analysis failed for ${projectPath}:`, error instanceof Error ? error.message : String(error));
        // Clear from active analysis on error to allow retry
        this.activeAnalysis.delete(projectPath);
        // Could implement exponential backoff retry here if needed
      });
    }
  }

  // Cleanup resources
  async cleanup(): Promise<void> {
    try {
      this.cache.cleanup();
      await this.analyzer.cleanup();
      
      // Cancel any active analysis operations
      for (const [projectPath, analysisPromise] of this.activeAnalysis.entries()) {
        console.warn(`Canceling active analysis for ${projectPath} during cleanup`);
        // Mark as cancelled but don't await to avoid hanging
        analysisPromise.catch(() => {}); // Suppress unhandled rejection
      }
      this.activeAnalysis.clear();
    } catch (error) {
      console.error('Error during cleanup:', error instanceof Error ? error.message : String(error));
    }
  }
}

// Shared instances to maintain state across tools
export const optimizedAnalyzer = new OptimizedAnalyzer();
export const storyGenerator = new DynamicStoryGenerator();
export const adventureManager = new AdventureManager();