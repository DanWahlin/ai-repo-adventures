/**
 * MCP Repo Adventure Tools - Main Entry Point
 * 
 * These tools provide an interactive, gamified way to explore and understand codebases.
 * The typical flow is:
 * 1. start_adventure - Analyzes the codebase and presents theme options
 * 2. choose_theme - Generates a custom story and adventures based on the selected theme
 * 3. explore_path - Explores individual adventures (can be called multiple times)
 * 4. view_progress - Check completion status and see remaining adventures
 * 
 * Each tool has detailed descriptions to help MCP clients understand when to use them
 * rather than relying on their base LLM for responses.
 * 
 * Tools are now organized in separate files for better maintainability.
 */

import { AdventureManager } from '../adventure/adventure-manager.js';
import { startAdventure } from './start-adventure.js';
import { chooseTheme, setAdventureManager as setChooseThemeManager } from './choose-theme.js';
import { explorePath, setAdventureManager as setExplorePathManager } from './explore-path.js';
import { viewProgress, setAdventureManager as setViewProgressManager } from './view-progress.js';

// Create a single shared adventure manager instance for tools that need it
const adventureManager = new AdventureManager();

// Initialize tools that need the adventure manager immediately
setChooseThemeManager(adventureManager);
setExplorePathManager(adventureManager);
setViewProgressManager(adventureManager);

// Verify initialization
console.log('🔧 Adventure manager initialized for all tools');

// Re-export tools with MCP naming convention
export const start_adventure = startAdventure;
export const choose_theme = chooseTheme;
export const explore_path = explorePath;
export const view_progress = viewProgress;

// Export all tools for easy registration
export const tools = {
  start_adventure,
  choose_theme,
  explore_path,
  view_progress
};