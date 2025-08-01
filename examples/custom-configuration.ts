#!/usr/bin/env node

/**
 * Example: Using Custom Configuration for Analysis Timeouts and Limits
 * 
 * This example demonstrates how to customize the analysis behavior
 * for different project sizes and requirements.
 */

import { ProjectAnalyzer } from '../src/analyzer/ProjectAnalyzer.js';
import type { AnalysisConfig } from '../src/shared/types.js';

// Example 1: Configuration for Large Projects
const largeProjectConfig: Partial<AnalysisConfig> = {
  maxDepth: 4, // Deeper analysis
  timeouts: {
    parserCleanup: 10000,    // 10 seconds for complex parsers
    fileRead: 20000,         // 20 seconds for large files
    analysis: 60000          // 1 minute for thorough analysis
  },
  limits: {
    maxFileSizeMB: 25,       // Allow larger files
    keySourceFiles: 20,      // Analyze more files
    topFunctions: 50,        // Include more functions
    topClasses: 15,          // Include more classes
    topDependencies: 50,     // List more dependencies
    summaryLines: 20,        // Longer README summaries
    fileReadLines: 5000,     // Read more lines per file
    lineCharacters: 5000     // Longer line limits
  }
};

// Example 2: Configuration for Quick Analysis (CI/CD)
const quickAnalysisConfig: Partial<AnalysisConfig> = {
  maxDepth: 2, // Shallow analysis
  timeouts: {
    parserCleanup: 2000,     // 2 seconds cleanup
    fileRead: 5000,          // 5 seconds file read
    analysis: 15000          // 15 seconds total
  },
  limits: {
    maxFileSizeMB: 5,        // Smaller file limit
    keySourceFiles: 5,       // Fewer files
    topFunctions: 10,        // Fewer functions
    topClasses: 3,           // Fewer classes
    topDependencies: 10,     // Fewer dependencies
    summaryLines: 5,         // Shorter summaries
    fileReadLines: 1000,     // Fewer lines
    lineCharacters: 1000     // Shorter lines
  }
};

// Example 3: Configuration for Memory-Constrained Environments
const memoryOptimizedConfig: Partial<AnalysisConfig> = {
  maxDepth: 2,
  cacheTimeout: 60000, // 1 minute cache (shorter)
  timeouts: {
    parserCleanup: 3000,     // Quick cleanup
    fileRead: 8000,          // Moderate file read time
    analysis: 20000          // Moderate analysis time
  },
  limits: {
    maxFileSizeMB: 2,        // Very strict file size
    keySourceFiles: 3,       // Minimal files
    topFunctions: 5,         // Minimal functions
    topClasses: 2,           // Minimal classes
    topDependencies: 5,      // Minimal dependencies
    summaryLines: 3,         // Very short summaries
    fileReadLines: 500,      // Minimal lines
    lineCharacters: 500      // Short lines
  }
};

async function demonstrateConfigurations() {
  console.log('🔧 Configuration Examples\n');

  // Large project analyzer
  console.log('📊 Large Project Configuration:');
  const largeAnalyzer = new ProjectAnalyzer(largeProjectConfig);
  console.log(`- Parser cleanup timeout: ${largeProjectConfig.timeouts?.parserCleanup}ms`);
  console.log(`- Max file size: ${largeProjectConfig.limits?.maxFileSizeMB}MB`);
  console.log(`- Key source files: ${largeProjectConfig.limits?.keySourceFiles}`);
  await largeAnalyzer.cleanup();

  // Quick analysis
  console.log('\n⚡ Quick Analysis Configuration:');
  const quickAnalyzer = new ProjectAnalyzer(quickAnalysisConfig);
  console.log(`- Parser cleanup timeout: ${quickAnalysisConfig.timeouts?.parserCleanup}ms`);
  console.log(`- Max file size: ${quickAnalysisConfig.limits?.maxFileSizeMB}MB`);
  console.log(`- Key source files: ${quickAnalysisConfig.limits?.keySourceFiles}`);
  await quickAnalyzer.cleanup();

  // Memory optimized
  console.log('\n🧠 Memory-Optimized Configuration:');
  const memoryAnalyzer = new ProjectAnalyzer(memoryOptimizedConfig);
  console.log(`- Parser cleanup timeout: ${memoryOptimizedConfig.timeouts?.parserCleanup}ms`);
  console.log(`- Max file size: ${memoryOptimizedConfig.limits?.maxFileSizeMB}MB`);
  console.log(`- Cache timeout: ${memoryOptimizedConfig.cacheTimeout}ms`);
  await memoryAnalyzer.cleanup();

  console.log('\n✅ Configuration examples completed!');
}

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateConfigurations().catch(console.error);
}

export { largeProjectConfig, quickAnalysisConfig, memoryOptimizedConfig };