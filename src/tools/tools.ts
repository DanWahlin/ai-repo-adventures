/**
 * MCP Repo Adventure Tools - Main Entry Point
 * 
 * These tools provide an interactive, gamified way to explore and understand codebases.
 * The typical flow is:
 * 1. start_adventure - Analyzes the codebase and presents theme options
 * 2. choose_theme - Generates a custom story and quests based on the selected theme
 * 3. explore_quest - Explores individual quests (can be called multiple times)
 * 4. view_progress - Check completion status and see remaining quests
 * 
 * Each tool has detailed descriptions to help MCP clients understand when to use them
 * rather than relying on their base LLM for responses.
 * 
 * Tools are now organized in separate files for better maintainability.
 */

import { AdventureManager } from '../adventure/adventure-manager.js';
import { startAdventure } from './start-adventure.js';
import { chooseTheme, setAdventureManager as setChooseThemeManager } from './choose-theme.js';
import { exploreQuest, setAdventureManager as setExploreQuestManager } from './explore-quest.js';
import { viewProgress, setAdventureManager as setViewProgressManager } from './view-progress.js';

// Create a single shared adventure manager instance for tools that need it
const adventureManager = new AdventureManager();

// Initialize tools that need the adventure manager immediately
setChooseThemeManager(adventureManager);
setExploreQuestManager(adventureManager);
setViewProgressManager(adventureManager);

// Adventure manager initialized for all tools

// Re-export tools with MCP naming convention
export const start_adventure = startAdventure;
export const choose_theme = chooseTheme;
export const explore_quest = exploreQuest;
export const view_progress = viewProgress;


// Export all tools for easy registration
export const tools = {
  start_adventure,
  choose_theme,
  explore_quest,
  view_progress
};