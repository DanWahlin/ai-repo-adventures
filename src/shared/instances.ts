import { ProjectAnalyzer, ProjectInfo } from '../analyzer/ProjectAnalyzer.js';
import { DynamicStoryGenerator } from '../story/DynamicStoryGenerator.js';
import { AdventureManager } from '../adventure/AdventureManager.js';

// Cache for analysis results to avoid re-analysis
class AnalysisCache {
  private cache: Map<string, { info: ProjectInfo; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  get(projectPath: string): ProjectInfo | null {
    const cached = this.cache.get(projectPath);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.info;
    }
    return null;
  }

  set(projectPath: string, info: ProjectInfo): void {
    this.cache.set(projectPath, { info, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Analysis state management
class OptimizedAnalyzer {
  private analyzer = new ProjectAnalyzer();
  private cache = new AnalysisCache();
  private activeAnalysis: Map<string, Promise<ProjectInfo>> = new Map();

  async analyzeProject(projectPath: string): Promise<ProjectInfo> {
    // Check cache first
    const cached = this.cache.get(projectPath);
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
    });

    this.activeAnalysis.set(projectPath, analysisPromise);
    return analysisPromise;
  }

  // Pre-trigger analysis without waiting
  preAnalyze(projectPath: string): void {
    if (!this.cache.get(projectPath) && !this.activeAnalysis.has(projectPath)) {
      this.analyzeProject(projectPath).catch(console.error);
    }
  }
}

// Shared instances to maintain state across tools
export const optimizedAnalyzer = new OptimizedAnalyzer();
export const storyGenerator = new DynamicStoryGenerator();
export const adventureManager = new AdventureManager();