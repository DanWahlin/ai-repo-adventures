/**
 * Adventure module exports
 * Central place for all adventure and storytelling functionality
 */

// Core adventure management
export { AdventureManager } from './adventure-manager.js';
export type { AdventureResult, AdventureState } from './adventure-manager.js';

// Story generation (consolidated - DynamicStoryGenerator is now an alias)
export { StoryGenerator, DynamicStoryGenerator, STORY_THEMES } from './story-generator.js';
export type { Adventure, StoryResponse, AdventureContent, CodeSnippet, StoryTheme } from './story-generator.js';

// Supporting services
export { ThemeManager } from './theme-manager.js';
export { FileContentManager } from './file-content-manager.js';
export { AdventurePathGenerator } from './adventure-path-generator.js';