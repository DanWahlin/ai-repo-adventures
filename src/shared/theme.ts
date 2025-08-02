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
  }
} as const;

// Extract the theme type from the keys
export type AdventureTheme = typeof THEMES[keyof typeof THEMES]['key'];

// Pre-compute lookup structures for O(1) access (performance optimization)
const THEMES_ARRAY = Object.values(THEMES);
const THEME_BY_ID = new Map<number, ThemeDefinition>(THEMES_ARRAY.map(theme => [theme.id, theme]));
const THEME_BY_KEY = new Map<string, ThemeDefinition>(THEMES_ARRAY.map(theme => [theme.key, theme]));

// Pre-compile regex patterns for keyword matching (performance optimization)
const THEME_KEYWORD_PATTERNS = new Map<string, RegExp[]>(
  THEMES_ARRAY.map(theme => [
    theme.key,
    theme.keywords.map(keyword => new RegExp(`\\b${keyword}\\b`, 'i'))
  ])
);

// Helper functions to access theme data (now O(1) instead of O(n))
export function getThemeById(id: number): ThemeDefinition | null {
  return THEME_BY_ID.get(id) || null;
}

export function getThemeByKey(key: string): ThemeDefinition | null {
  return THEME_BY_KEY.get(key) || null;
}

export function getAllThemes(): ThemeDefinition[] {
  return THEMES_ARRAY;
}

// Build derived mappings using Object.fromEntries for better performance
export const THEME_DISPLAY_NAMES = Object.fromEntries(
  THEMES_ARRAY.map(theme => [theme.key, theme.displayName])
) as Record<AdventureTheme, string>;

export const THEME_EMOJIS = Object.fromEntries(
  THEMES_ARRAY.map(theme => [theme.key, theme.emoji])
) as Record<AdventureTheme, string>;

export const THEME_NUMBER_MAP = Object.fromEntries(
  THEMES_ARRAY.map(theme => [theme.id.toString(), theme.key])
) as Record<string, AdventureTheme>;

// Type guard to check if a string is a valid theme (now uses pre-computed Map)
export function isValidTheme(theme: string): theme is AdventureTheme {
  return THEME_BY_KEY.has(theme);
}

// Enhanced theme parser with keyword matching and better validation
export function parseTheme(input: string): AdventureTheme | null {
  if (!input) return null;
  
  const normalized = input.trim().toLowerCase();
  
  // Check for exact key match (now O(1) lookup)
  const exactMatch = getThemeByKey(normalized);
  if (exactMatch) return exactMatch.key as AdventureTheme;
  
  // Check for numeric ID with proper validation
  const numericId = parseInt(normalized, 10);
  if (!isNaN(numericId)) {
    const byId = getThemeById(numericId);
    if (byId) return byId.key as AdventureTheme;
  }
  
  // Check keywords with pre-compiled patterns for better accuracy and performance
  for (const theme of THEMES_ARRAY) {
    const patterns = THEME_KEYWORD_PATTERNS.get(theme.key)!;
    if (patterns.some(pattern => pattern.test(normalized))) {
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