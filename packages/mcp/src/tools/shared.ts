/**
 * Shared utilities for MCP tools
 */

import { ProjectInfo } from '@codewithdan/ai-repo-adventures-core/shared';

export function formatInitialResponse(projectInfo: ProjectInfo, isUsingConfig: boolean = false): string {
  const configMessage = isUsingConfig 
    ? "\n🎯 Using adventure.config.json for guided exploration" 
    : "";
    
  return `🌟 **Welcome to AI Repo Adventures!**

You've discovered **${projectInfo.fileCount} files** of digital wisdom!${configMessage}

**Choose Your Adventure Theme:**
🚀 **1. Space Exploration** - Navigate through cosmic codebases as a space explorer
🏰 **2. Mythical Kingdom** - Journey through magical realms of code  
🏛️ **3. Ancient Civilization** - Explore mystical programming temples
💻 **4. Developer Journey** - Modern tech-focused code exploration

*Next step: Use the 'choose_theme' tool with your preferred theme (1-4 or theme name)*`;
}

export function formatThemeResponse(story: string, questTitles: string[]): any {
  return {
    theme_selected: true,
    story,
    available_quests: questTitles,
    next_step: "Use the 'explore_quest' tool to begin your first quest"
  };
}

export function formatQuestResponse(result: any): any {
  return {
    quest_completed: true,
    narrative: result.narrative,
    files_explored: result.filesExplored,
    progress: result.progress,
    next_step: result.remainingQuests > 0 
      ? "Use 'explore_quest' tool to continue your adventure or 'view_progress' to check your status"
      : "Congratulations! You've completed all quests. Use 'view_progress' to see your final results."
  };
}

export function formatProgressResponse(progress: any): any {
  return {
    progress_summary: progress
  };
}