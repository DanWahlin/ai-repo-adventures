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
      this.analyzeProject(projectPath).catch(console.error);
    }
  }

  // Cleanup resources
  cleanup(): void {
    this.cache.cleanup();
    this.analyzer.cleanup();
  }
}

// Shared instances to maintain state across tools
export const optimizedAnalyzer = new OptimizedAnalyzer();
export const storyGenerator = new DynamicStoryGenerator();
export const adventureManager = new AdventureManager();