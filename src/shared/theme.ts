/**
 * Central theme definitions for the adventure system
 * Single source of truth for all theme-related data
 */

// Define the structure of a theme
export interface ThemeDefinition {
  readonly id: number;
  readonly key: string;
  readonly displayName: string;
  readonly emoji: string;
  readonly description: string;
  readonly keywords: readonly string[];  // For matching user input
}

// Custom theme data provided by user
export interface CustomThemeData {
  name: string;
  description: string;
  keywords: string[];
}

// Single source of truth for all themes
export const THEMES = {
  SPACE: {
    id: 1,
    key: 'space',
    displayName: 'Space Exploration',
    emoji: '🚀',
    description: 'Journey through cosmic codebases where data flows like stardust and APIs connect distant galaxies',
    keywords: ['space', 'cosmic', 'galaxy', 'starship', 'astronaut', 'sci-fi', 'futuristic']
  },
  MYTHICAL: {
    id: 2,
    key: 'mythical',
    displayName: 'Enchanted Kingdom',
    emoji: '🏰',
    description: 'Explore magical and mythical realms where databases are dragon hoards and functions are powerful spells',
    keywords: ['mythical', 'magic', 'enchanted', 'castle', 'dragon', 'fantasy', 'medieval', 'kingdom']
  },
  ANCIENT: {
    id: 3,
    key: 'ancient',
    displayName: 'Ancient Civilization',
    emoji: '🏺',
    description: 'Discover lost temples of code where algorithms are ancient wisdom and APIs are trade routes',
    keywords: ['ancient', 'temple', 'pyramid', 'archaeology', 'historical', 'civilization', 'ruins']
  },
  DEVELOPER: {
    id: 4,
    key: 'developer',
    displayName: 'Developer Documentation',
    emoji: '📖',
    description: 'Technical documentation approach with clear explanations, best practices, and code analysis',
    keywords: ['developer', 'code', 'technical', 'debug', 'guide', 'tutorial', 'binary']
  },
  CUSTOM: {
    id: 5,
    key: 'custom',
    displayName: 'Custom Theme',
    emoji: '🎨',
    description: 'Design your own adventure! You\'ll be prompted to provide theme name, description, and keywords',
    keywords: ['custom', 'personalized', 'unique', 'creative', 'personal']
  }
} as const;

// Extract the theme type from the keys
export type AdventureTheme = typeof THEMES[keyof typeof THEMES]['key'];

// Simple array of themes - no need for complex Maps with only 5 themes
const THEMES_ARRAY = Object.values(THEMES);

// Helper functions to access theme data using simple array iteration
export function getThemeById(id: number): ThemeDefinition | null {
  return THEMES_ARRAY.find(theme => theme.id === id) || null;
}

export function getThemeByKey(key: string): ThemeDefinition | null {
  return THEMES_ARRAY.find(theme => theme.key === key) || null;
}

export function getAllThemes(): ThemeDefinition[] {
  return THEMES_ARRAY;
}


// Type guard using simple find
export function isValidTheme(theme: string): theme is AdventureTheme {
  return THEMES_ARRAY.some(t => t.key === theme);
}

// Simple theme parser using basic string matching
export function parseTheme(input: string): AdventureTheme | null {
  if (!input) return null;
  
  const normalized = input.trim().toLowerCase();
  
  // Check for exact key match
  const exactMatch = getThemeByKey(normalized);
  if (exactMatch) return exactMatch.key as AdventureTheme;
  
  // Check for numeric ID
  const numericId = parseInt(normalized, 10);
  if (!isNaN(numericId)) {
    const byId = getThemeById(numericId);
    if (byId) return byId.key as AdventureTheme;
  }
  
  // Check keywords using simple includes check
  for (const theme of THEMES_ARRAY) {
    if (theme.keywords.some(keyword => normalized.includes(keyword.toLowerCase()))) {
      return theme.key as AdventureTheme;
    }
  }
  
  return null;
}

// Format theme for display with all its properties
export function formatThemeOption(theme: ThemeDefinition): string {
  return `${theme.emoji} **${theme.id}. ${theme.displayName}** - ${theme.description}`;
}

// Get formatted list of all theme options
export function getFormattedThemeOptions(): string {
  return getAllThemes()
    .sort((a, b) => a.id - b.id)
    .map(formatThemeOption)
    .join('\n');
}