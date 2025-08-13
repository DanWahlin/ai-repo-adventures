/**
 * Shared helper functions and utilities for all tools
 */

import type { ProjectInfo } from '../shared/types.js';
import { getFormattedThemeOptions, getAllThemes } from '../shared/theme.js';

/**
 * Create minimal ProjectInfo with repomix content
 */
export function createProjectInfo(repomixContent: string): ProjectInfo {
  return {
    type: 'Software Project', // LLM will infer the real type during story generation
    fileCount: (repomixContent.match(/## File:/g) || []).length,
    mainTechnologies: [], // LLM will detect these during story generation
    hasTests: repomixContent.toLowerCase().includes('test'),
    hasDatabase: false, // LLM will detect during story generation
    hasApi: false, // LLM will detect during story generation
    hasFrontend: false, // LLM will detect during story generation
    repomixContent, // This is the gold - rich context for story generation
    llmContextSummary: 'Raw repomix content available for LLM analysis during story generation.'
  };
}

/**
 * Format the initial adventure response
 */
export function formatInitialResponse(projectInfo: ProjectInfo, isUsingConfig: boolean = false): string {
  return `🌟 **Welcome to Repo Adventures!** 🌟

You've discovered a mysterious codebase awaiting your exploration through immersive storytelling!

📊 **Initial Scan Results:**
• ${isUsingConfig 
    ? `Analyzing ${projectInfo.fileCount} key files from adventure configuration` 
    : projectInfo.fileCount > 0 
      ? `Analyzed ${projectInfo.fileCount} files in the codebase`
      : 'Full codebase analysis prepared'}
• ${projectInfo.hasTests ? 'Testing framework detected' : 'No test files found'}
• Rich codebase context prepared for adventure generation
• Ready for LLM-powered analysis and story generation

Your mission: Transform into a digital explorer and uncover the secrets of this codebase through an immersive, LLM-generated adventure! Every story, character, and code insight is dynamically created based on your actual project structure.

**Choose Your Story Theme:**

${getFormattedThemeOptions()}

Use the \`choose_theme\` tool with your preferred theme (name or number) to begin your adventure!`;
}

/**
 * Generate dynamic theme examples for tool descriptions
 */
export function generateThemeExamples(): string {
  const themes = getAllThemes();
  const examples = themes.map(theme => 
    `"${theme.id}", "${theme.key} theme", "choose ${theme.key}", "select ${theme.key}", "I want ${theme.key}"`
  ).join(', ');
  return examples;
}