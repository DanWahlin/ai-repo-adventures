/**
 * Analyzer module exports
 * Central place for all code analysis functionality
 * 
 * ProjectAnalyzer orchestrates RepomixAnalyzer for comprehensive analysis
 */

// Main analyzer orchestrator
export { ProjectAnalyzer } from './project-analyzer.js';

// Repomix-based analyzer (used internally by ProjectAnalyzer) and types
export { RepomixAnalyzer, type ProjectInfo, type CodeAnalysis, type ProjectStructure } from './repomix-analyzer.js';

// Default export for main usage
export { ProjectAnalyzer as DefaultAnalyzer } from './project-analyzer.js';