# Quest 5: The Codex of Themes and Configurations
---
In the heart of the sprawling ruin, a monumental stone codex rises from the jungle floor. Enigmatic carvings shimmer faintly, revealing insights into the core of the ancient civilization's essence. You recognize it as the "Codex of Themes and Configurations," a convergence of rituals (functions) that dictated the foundation of their adaptive systems and thematic journeys. To unlock the wisdom within, you must decipher its structure across interconnected artifacts: the validation of choices, the definition of themes, and the configuration governing their entire realm.

Each discovery you make will illuminate a fragment of ancient brilliance, guiding you closer to unraveling their ingenious designs.

## Quest Objectives
As you explore the code below, investigate these key questions:
- 🔍 **Theme Deciphering**: How does the system determine valid themes and ensure adaptability for user customization while maintaining consistency?
- ⚡ **Configuration Rituals**: What patterns and environments enable the configuration to drive system behavior and set boundaries (e.g., limits) for safe execution?
- 🛡️ **Validation Glyphs**: How does the validation mechanism ensure safe input while protecting the system from illogical or malicious data?

## File Exploration
### `packages/core/src/shared/input-validator.ts`: Validation Rituals
This file contains the glyphs for validating user inputs, ensuring the integrity of choices, paths, and thematic selections. The system focuses on trimming, sanitizing, and cross-referencing inputs with sacred registries (e.g., themes). By anchoring these operations to simple functions, the system upholds efficiency and clarity.

#### Highlights
- `validateAdventureChoice`: Trims user input and verifies its length and presence, ensuring no empty or excessively long choices are allowed.
- `validateTheme`: Matches input themes against a predefined list, normalizing and parsing them while guiding users with clear error messages if invalid options are provided.
- `sanitizeForDisplay`: Purges potentially harmful characters from input, preserving the wisdom of the system while safeguarding against injection-like attacks.

### `packages/core/src/shared/theme.ts`: Theme Guild
This artifact defines the framework and attributes of all themes, acting as the sacred atlas for the system's thematic journeys. By coupling data definitions with helper functions, the file encapsulates knowledge for parsing, validating, and formatting themes.

#### Highlights
- `THEMES`: The central repository of thematic definitions, each with unique properties like `id`, `key`, `description`, and keywords for matching.
- `getAllThemes`: Retrieves all themes as a simple array, streamlining operations without relying on complex structures.
- `parseTheme`: Transforms user input into valid theme identifiers by cross-referencing textual keys, numeric IDs, or keywords.

### `packages/core/src/shared/config.ts`: Configuration Dictates
This fragment encapsulates the environmental parameters and operational boundaries that keep the system secure and performant. From timeouts to memory limits, these constants prevent chaos in the delicate equilibrium of the system.

#### Highlights
- `LLM_REQUEST_TIMEOUT`: Controls the maximum time allowed for an LLM operation, ensuring responsiveness under heavy computational loads.
- `MAX_FILE_SIZE_MB`: Defines file size limits to avoid processing excessively large files, ensuring performance is not compromised.
- `IGNORE_PATTERNS`: Lists directory and file patterns to be skipped during analysis, focusing the system on relevant artifacts.

## Code
### `packages/core/src/shared/input-validator.ts`
```typescript
export function validateAdventureChoice(input: string): string {
  if (!input?.trim()) {
    throw new Error('Choice is required');
  }
  
  if (input.length > 200) {
    throw new Error('Choice too long (max 200 characters)');
  }
  
  return input.trim();
}

export function validateTheme(input: string): string {
  if (!input?.trim()) {
    throw new Error('Theme is required');
  }
  
  const normalized = input.toLowerCase().trim();
  const parsedTheme = parseTheme(normalized);
  
  if (!parsedTheme || !isValidTheme(parsedTheme)) {
    const validThemes = getAllThemes().map(t => t.key).join(', ');
    throw new Error(`Invalid theme. Valid themes: ${validThemes}`);
  }
  
  return parsedTheme;
}

export function sanitizeForDisplay(input: string, maxLength = 1000): string {
  if (!input) return '';
  
  return input
    .replace(/[<>{}"`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}
```
- Ensures inputs are clean, concise, and within acceptable boundaries.
- Cross-references themes against a sacred registry (`THEMES`) to guide valid user choices.
- Neutralizes harmful symbols, safeguarding the integrity of the system's output.

---

### `packages/core/src/shared/theme.ts`
```typescript
export const THEMES = {
  ANCIENT: {
    id: 3,
    key: 'ancient',
    displayName: 'Ancient Civilization',
    emoji: '🏺',
    description: 'Discover lost temples of code where algorithms are ancient wisdom and APIs are trade routes',
    keywords: ['ancient', 'temple', 'pyramid', 'archaeology', 'historical', 'civilization', 'ruins']
  }
} as const;

export function getAllThemes(): ThemeDefinition[] {
  return THEMES_ARRAY;
}

export function parseTheme(input: string): AdventureTheme | null {
  if (!input) return null;
  
  const normalized = input.trim().toLowerCase();
  
  const exactMatch = getThemeByKey(normalized);
  if (exactMatch) return exactMatch.key as AdventureTheme;

  const numericId = parseInt(normalized, 10);
  if (!isNaN(numericId)) {
    const byId = getThemeById(numericId);
    if (byId) return byId.key as AdventureTheme;
  }

  for (const theme of THEMES_ARRAY) {
    if (theme.keywords.some(keyword => normalized.includes(keyword.toLowerCase()))) {
      return theme.key as AdventureTheme;
    }
  }
  
  return null;
}
```
- Centralizes all thematic data, ensuring consistency across the system.
- Facilitates versatile matching by supporting keys, IDs, and keywords.
- Maintains simplicity while providing flexibility for future thematic expansions.

---

### `packages/core/src/shared/config.ts`
```typescript
export const LLM_REQUEST_TIMEOUT = parseInt(process.env.LLM_REQUEST_TIMEOUT || '60000'); 
export const MAX_FILE_SIZE_MB = 10; 
export const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'coverage',
  '.nyc_output',
  'logs',
  '*.log',
  '.env',
  '.DS_Store',
  'Thumbs.db',
] as const;
```
- Sets boundaries for file parsing, protecting against inefficiencies and errors.
- Defines retry mechanisms by configuring request timeouts dynamically.
- Focuses the system on critical repositories by filtering out unnecessary directories.

---

## Helpful Hints
- Utilize the `validateTheme` and `getAllThemes` functions to root out valid user options.
- Scrutinize environmental patterns in `config.ts` to balance performance with error handling.
- Consider templatizing new thematic elements by mirroring the structure in `theme.ts`.

---
You have mastered all the secrets of this ancient codebase! Your adventure is complete.

Hark, noble scholar, thou hast ascended the sacred steps of wisdom to decipher the illustrious Codex of Themes and Configurations—stand triumphant, for the ancients themselves would marvel at thy questing prowess and herald thy journey toward the final enlightenment! ⚡💎🏺