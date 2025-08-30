# Quest 5: Configuration & Theme System
---
The culmination of your exploration into this dynamic adventure engine leads you to the heart of customization—unveiling the architecture that controls configuration and themes. This quest delves into the fundamental components that bring adaptability and personalization to developer-driven storytelling. The files you will explore govern user-configurable options, theme definitions, and validation rules, working together to create a seamless experience for both developers and users.

## Quest Objectives
As you explore the code below, investigate these key questions:
- 🔍 **System Customization**: How does the configuration system allow for environment-specific adjustments and user overrides?
- ⚡ **Theme Data Flow**: How are theme definitions structured, retrieved, and validated across the system?
- 🛡️ **Validation Mechanisms**: What safeguards ensure user inputs (like themes or paths) are valid and sanitized?

## File Exploration
### `packages/core/src/shared/config.ts`: Global Configuration Management
This file centralizes system-wide configuration options, ensuring ease of customization and maintainability. It leverages `dotenv` for environment variable loading and defines constants to control behavior such as API timeouts, file limits, and caching.

#### Highlights
- `LLM_REQUEST_TIMEOUT`: Configures the timeout for language model requests, critical for handling long operations efficiently.
- `MAX_FILE_SIZE_MB`: Determines the file size threshold for analysis, preventing excessive memory usage.
- `REPOMIX_CACHE_TTL`: Defines the cache duration for Repomix subprocess outputs, balancing performance and freshness of data.

### `packages/core/src/shared/theme.ts`: Theme Definitions and Operations
This file is the single source of truth for theme-related data. It manages predefined themes, utility functions for validation and parsing, and facilitates theme-based customization of the adventure system.

#### Highlights
- `THEMES`: A constant object that defines all available themes, their attributes, and metadata.
- `isValidTheme`: Validates if a given theme key exists within the predefined themes.
- `getAllThemes`: Retrieves the full array of themes for use in the system, aiding in consistent access.

### `packages/generator/src/cli/theme-manager.ts`: Theme-Specific CSS Management
The `ThemeManager` class handles theme-specific operations, including generating CSS files and managing theme-based assets. This ensures that the application's visual presentation aligns with selected themes.

#### Highlights
- `generateThemeCSS`: Compiles and writes the combined CSS for a specific theme, enabling customization of the visual experience.
- `getGitHubLogo`: Determines the appropriate GitHub logo (dark or light) to use based on the current theme.
- `getThemeIcons`: Provides theme-relevant icons for UI elements like templates and quests for better accessibility.

---

## Code
### `packages/core/src/shared/config.ts`
```typescript
export const LLM_REQUEST_TIMEOUT = parseInt(process.env.LLM_REQUEST_TIMEOUT || '60000'); // 60 seconds for complex story generation with large prompts, configurable via env
export const MAX_FILE_SIZE_MB = 10; // Skip files larger than this to avoid memory issues and focus on source code
export const REPOMIX_CACHE_TTL = parseInt(process.env.REPOMIX_CACHE_TTL || '60000'); // 60 seconds, configurable via env
```
- This code establishes defaults while allowing overrides via environment variables.
- It prevents excessive wait times and resource usage, ensuring efficient operation.
- The use of constants simplifies maintenance and promotes a clear separation of configuration concerns.
- Integrates seamlessly with the overall system by providing predictable behavior.

---

### `packages/core/src/shared/theme.ts`
```typescript
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
  }
};
```
- This snippet defines theme attributes such as `id`, `key`, `displayName`, `emoji`, and more.
- The use of keywords ensures flexible matching for user inputs.
- Writing clear, descriptive metadata enhances usability and readability.
- Enables easy extension by simply adding more theme objects.

```typescript
export function isValidTheme(theme: string): theme is AdventureTheme {
  return THEMES_ARRAY.some(t => t.key === theme);
}
```
- A type-safe validation function that checks theme existence.
- Ensures robust error handling downstream when working with theme-dependent features.
- Maintains central validation logic for consistent behavior across the application.

---

### `packages/generator/src/cli/theme-manager.ts`
```typescript
generateThemeCSS(theme: AdventureTheme, outputDir: string): void {
  const cssFiles = [
    path.join(this.themesDir, 'base.css'),
    path.join(this.themesDir, 'homepage.css'), 
    path.join(this.themesDir, 'animations.css'),
    path.join(this.themesDir, `${theme}.css`)
  ];
  
  let combinedCSS = '';

  cssFiles.forEach(cssFile => {
    if (fs.existsSync(cssFile)) {
      combinedCSS += fs.readFileSync(cssFile, 'utf8') + '\\n\\n';
    }
  });
  
  const cssPath = path.join(outputDir, 'assets', 'theme.css');
  fs.writeFileSync(cssPath, combinedCSS);
}
```
- This method combines theme-specific CSS files into a single output file.
- Ensures that only existing files are included, preventing runtime errors.
- Provides a straightforward and maintainable solution for theme-based customization.
- Highlights the use of `fs` and `path` modules to handle file and path operations.

---

## Helpful Hints
- Use the `THEMES` constant as a reference guide for building new themes.
- Examine the `validateThemeInput` function for insights into enforcing consistent user input.
- Experiment with modifying `REPOMIX_CACHE_TTL` to test its impact on performance.

---
You have mastered all the secrets of this dynamic adventure system! Your adventure is complete.

🎉 System.out.println("Achievement Unlocked: Quest 5 – Configuration & Theme System successfully deployed; you're refactoring your skills like a pro, and the final milestone is within reach! 🚀⚡💎");