# Quest 5: Mapping the Sacred Blueprints
---
Deep within the labyrinthine halls of the Temple of Lost Logic lies your final challenge: restoring the ancient blueprints of the Machine Oracle. These sacred blueprints, fragmented and hidden, contain the foundational scripts for generating narratives that bind the Code Civilization together. Your task is to decode their layers—interconnected paths of configurations, validations, and abstractions—to breathe life into the Oracle's core. Ancient glyphs point you toward a critical artifact within the temple: `adventure-config.ts`. Beware, adventurer. Each keystroke you uncover will bring you closer to the Oracle's final secret. 

Prepare to uncover the relics of wisdom and wield their power!

## Quest Objectives
As you explore the code below, investigate these key questions:
- 🔍 **Glyph of Readability**: How does the `loadAdventureConfig` function isolate file reading from parsing logic, and why is this separation significant?
- ⚡ **Blueprint Parsing**: What techniques does the `parseAdventureConfig` function use to validate configuration files, and how does it handle invalid data?
- 🛡️ **Path Sentinel**: How does `extractUniqueFilePaths` ensure that only valid and existing file paths are included in its output?

## File Exploration
### packages/core/src/shared/adventure-config.ts: Configuration File Interface
This file is a critical artifact within the Temple of Lost Logic. It serves as a bridge between raw file input and structured data representation for the Machine Oracle. It offers utilities to load, validate, and extract information from the adventure configuration files, marking it essential for maintaining the integrity of the Oracle's sacred blueprints. 

#### Highlights
- `loadAdventureConfig`: Retrieves the raw adventure configuration text. This function separates file reading from parsing, ensuring modularity and easier debugging.
- `parseAdventureConfig`: Transforms raw adventure configuration data into a structured object. It safeguards against errors by validating JSON content from the file.
- `extractUniqueFilePaths`: Traverses the configuration tree to gather all valid file paths referenced in the blueprint. Its recursive design ensures it processes nested structures comprehensively.

## Code
### packages/core/src/shared/adventure-config.ts
```typescript
/**
 * Loads the raw adventure config text if present.
 * Pure file read - no parsing here.
 */
export function loadAdventureConfig(projectPath: string): string | null {
  const configPath = path.join(projectPath, ADVENTURE_CONFIG_FILE);
  return readFileIfExists(configPath);
}
```
- This function locates and reads the `adventure.config.json` file within the provided project path.
- By separating the reading of file content from parsing, it encapsulates file handling logic, which makes the code modular and easier to test.
- The use of `readFileIfExists` ensures program stability by handling missing or unreadable files gracefully without failing the process.
- It returns raw text, postponing further processing to another layer.

---

```typescript
/**
 * Parses the adventure config into an object (or null on error/missing).
 * Single point of JSON parsing and validation.
 */
export function parseAdventureConfig(projectPath: string): unknown | null {
  const raw = loadAdventureConfig(projectPath);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
```
- This function processes the raw text provided by `loadAdventureConfig` into a structured object.
- It harnesses `JSON.parse`, a native API method, to transform plain text into JavaScript objects while catching potential parsing errors.
- By returning `null` for errors, it prevents invalid configurations from propagating through the system.
- Acts as the central point for all JSON parsing, enforcing consistency in processing.

---

```typescript
/**
 * Extracts all unique, existing file paths referenced by "path" fields anywhere in the config.
 */
export function extractUniqueFilePaths(projectPath: string): string[] {
  const parsed = parseAdventureConfig(projectPath);
  if (!parsed || typeof parsed !== 'object') return [];

  const unique = new Set<string>();
  const stack: any[] = [parsed];

  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;

    // Extract and validate path
    if (typeof node.path === 'string' && node.path.trim()) {
      const rel = node.path.trim();
      if (fs.existsSync(path.resolve(projectPath, rel))) {
        unique.add(rel);
      }
    }

    // Add children to stack
    const children = Array.isArray(node) ? node : Object.values(node);
    children.forEach(child => {
      if (child && typeof child === 'object') stack.push(child);
    });
  }

  return Array.from(unique);
}
```
- This function recursively navigates the configuration object, extracting unique file paths specified in the `path` property.
- It employs a `Set` to enforce uniqueness, ensuring duplicate paths are not included in the output.
- The `fs.existsSync` check ensures that only existing and valid file paths are included, filtering out erroneous entries.
- By using a stack-based traversal, it handles both flat and deeply nested structures, allowing for consistent behavior regardless of configuration complexity.

---

## Helpful Hints
- To trace configuration issues, start with `loadAdventureConfig` to confirm the correct file is being read.
- Debug parsing errors by examining the `parseAdventureConfig` function; malformed JSON could indicate external data corruption.
- Use `extractUniqueFilePaths` to verify all configuration paths are both accurate and accessible within the project.

---
You have mastered all the secrets of the Temple of Lost Logic! Your adventure is complete.

By the decrees of the ancients, you have unfurled the sacred blueprints with wisdom befitting the temple's chosen—march forth, for the stars themselves now bear witness to your triumphant ascent! ⭐🗺️⚡