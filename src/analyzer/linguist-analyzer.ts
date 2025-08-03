/**
 * LinguistAnalyzer - Language detection and code statistics using linguist-js
 * Provides GitHub Linguist-based language analysis to complement regex-based code parsing
 */

import linguist from 'linguist-js';
import { detectLanguageForLinguist, getLanguageCompatibility } from './language-mapping.js';
import type { AnalysisConfig } from './types.js';

export interface LanguageStats {
  [language: string]: {
    bytes: number;
    files: number;
    percentage: number;
    color?: string;
    type?: string;
  };
}

export interface LinguistResult {
  totalBytes: number;
  totalFiles: number;
  languages: LanguageStats;
  primaryLanguage: string;
  languageCount: number;
  detectedLanguages: string[];
  languageDistribution: Array<{
    language: string;
    percentage: number;
    bytes: number;
    files: number;
  }>;
}

export class LinguistAnalyzer {
  private static instance: LinguistAnalyzer | null = null;

  constructor(_config: AnalysisConfig) {
    // Config may be used for future enhancements
  }

  /**
   * Get or create singleton instance
   */
  static async getInstance(config: AnalysisConfig): Promise<LinguistAnalyzer> {
    if (!LinguistAnalyzer.instance) {
      LinguistAnalyzer.instance = new LinguistAnalyzer(config);
    }
    return LinguistAnalyzer.instance;
  }

  /**
   * Analyze directory for language statistics using GitHub Linguist
   */
  async analyzeDirectory(directoryPath: string): Promise<LinguistResult> {
    try {
      // Use linguist-js to analyze the directory
      const analysis = await linguist(directoryPath, {
        offline: false, // Allow network requests for language data
        quick: false, // Full analysis
        categories: ['programming'], // Focus on programming languages
      });

      return this.transformLinguistResults(analysis);
    } catch (error) {
      console.warn('LinguistAnalyzer: Failed to analyze directory:', error);
      return this.createEmptyResult();
    }
  }

  /**
   * Analyze a single file for language detection
   */
  async analyzeFile(filePath: string, _content?: string): Promise<string | null> {
    try {
      // For single file analysis, we'll use the directory analysis
      // but filter for the specific file
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
      const analysis = await linguist(dirPath, {
        offline: false,
        quick: true, // Quick analysis for single file
        categories: ['programming'],
      });

      // Extract the most likely language for this file type
      const extension = filePath.split('.').pop()?.toLowerCase();
      if (extension && analysis.files) {
        // Find files with same extension and get their detected language
        for (const [language, stats] of Object.entries(analysis.files)) {
          if (typeof stats === 'object' && stats !== null && 'files' in stats) {
            // This is a simplification - linguist-js doesn't provide per-file breakdown
            // in the public API, so we return the most prominent language
            return language;
          }
        }
      }

      // Fallback to extension-based detection
      return detectLanguageForLinguist(extension || '');
    } catch (error) {
      console.warn('LinguistAnalyzer: Failed to analyze file:', error);
      return detectLanguageForLinguist(filePath.split('.').pop() || '');
    }
  }

  /**
   * Get language compatibility info for CodeAnalyzer integration
   */
  getLanguageCompatibility(language: string): {
    isSupported: boolean;
    codeAnalyzerLanguage: string | null;
    confidence: 'high' | 'medium' | 'low';
  } {
    return getLanguageCompatibility(language);
  }

  /**
   * Get project insights based on language distribution
   */
  getProjectInsights(result: LinguistResult): {
    projectType: string;
    complexity: 'low' | 'medium' | 'high';
    recommendations: string[];
    techStack: string[];
  } {
    const languages = result.detectedLanguages;
    
    let projectType = 'Unknown';
    let complexity: 'low' | 'medium' | 'high' = 'low';
    const recommendations: string[] = [];
    const techStack: string[] = [];

    // Determine project type
    if (languages.includes('JavaScript') || languages.includes('TypeScript')) {
      if (languages.includes('HTML') || languages.includes('CSS')) {
        projectType = 'Web Application';
        techStack.push('Frontend');
      } else {
        projectType = 'Node.js Application';
        techStack.push('Backend');
      }
    } else if (languages.includes('Python')) {
      projectType = 'Python Application';
      techStack.push('Python');
    } else if (languages.includes('Java')) {
      projectType = 'Java Application';
      techStack.push('Java');
    } else if (languages.includes('C#')) {
      projectType = '.NET Application';
      techStack.push('.NET');
    }

    // Determine complexity
    if (result.languageCount > 5) {
      complexity = 'high';
      recommendations.push('Consider code organization due to high language diversity');
    } else if (result.languageCount > 2) {
      complexity = 'medium';
    }

    // Add recommendations based on language mix
    if (languages.includes('TypeScript') && languages.includes('JavaScript')) {
      recommendations.push('Consider migrating remaining JavaScript to TypeScript for consistency');
    }

    if (result.totalFiles > 100) {
      recommendations.push('Large codebase detected - consider modular architecture');
    }

    // Add detected tech stack items
    if (languages.includes('SQL')) techStack.push('Database');
    if (languages.includes('Dockerfile')) techStack.push('Docker');
    if (languages.includes('YAML') || languages.includes('JSON')) techStack.push('Configuration');

    return {
      projectType,
      complexity,
      recommendations,
      techStack,
    };
  }

  /**
   * Transform linguist-js results to our format
   */
  private transformLinguistResults(analysis: any): LinguistResult {
    const languages: LanguageStats = {};
    let totalBytes = 0;
    let totalFiles = 0;
    let primaryLanguage = 'Unknown';
    let maxBytes = 0;

    // Process language statistics
    if (analysis.files) {
      for (const [language, stats] of Object.entries(analysis.files)) {
        if (typeof stats === 'object' && stats !== null) {
          const langStats = stats as any;
          const bytes = langStats.bytes || 0;
          const files = langStats.files || 0;

          languages[language] = {
            bytes,
            files,
            percentage: 0, // Will calculate after total is known
            color: langStats.color,
            type: langStats.type,
          };

          totalBytes += bytes;
          totalFiles += files;

          if (bytes > maxBytes) {
            maxBytes = bytes;
            primaryLanguage = language;
          }
        }
      }
    }

    // Calculate percentages
    for (const language in languages) {
      if (languages[language]) {
        languages[language].percentage = totalBytes > 0 
          ? Math.round((languages[language].bytes / totalBytes) * 100 * 100) / 100
          : 0;
      }
    }

    // Create sorted distribution array
    const languageDistribution = Object.entries(languages)
      .map(([language, stats]) => ({
        language,
        percentage: stats.percentage,
        bytes: stats.bytes,
        files: stats.files,
      }))
      .sort((a, b) => b.bytes - a.bytes);

    return {
      totalBytes,
      totalFiles,
      languages,
      primaryLanguage,
      languageCount: Object.keys(languages).length,
      detectedLanguages: Object.keys(languages),
      languageDistribution,
    };
  }

  /**
   * Create empty result for error cases
   */
  private createEmptyResult(): LinguistResult {
    return {
      totalBytes: 0,
      totalFiles: 0,
      languages: {},
      primaryLanguage: 'Unknown',
      languageCount: 0,
      detectedLanguages: [],
      languageDistribution: [],
    };
  }


  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    LinguistAnalyzer.instance = null;
  }
}