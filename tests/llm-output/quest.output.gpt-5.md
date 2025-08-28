# Quest 5: Cartography Annex
---
The command bridge hums as your research starship enters the Cartography Annex, where raw config signals are refined into star maps for the LLM core. Reactors funnel context while analyzers slice nebulae of JSON, and your onboard AI compiles a minimal chart for transmission. This chapter completes the stellar atlas: extracting viable file waypoints, validating signal integrity, and compressing guidance into mission-ready prompts. Study the Annex’s core routines to calibrate scanners and finalize navigation beacons for a fully mapped galaxy of your project.

## Quest Objectives
As you explore the code below, investigate these key questions:
- 🔍 Scanner Calibration: How does `parseAdventureConfig` centralize JSON decoding and error tolerance to keep the pipeline resilient against malformed inputs?
- ⚡ Waypoint Mapping: What traversal pattern does `extractUniqueFilePaths` use to discover `path` fields across arbitrarily nested structures, and how does it validate existence?
- 🛡️ Signal Compression: In `formatAdventureConfigForPrompt`, how are quest titles, file paths, and function names reduced to a compact structure while avoiding null or invalid entries?

## File Exploration
### packages/core/src/shared/adventure-config.ts: Annex utilities for loading, parsing, extracting, and formatting adventure configuration
This Annex module supplies four mission-critical routines that power your starship’s cartography workflow. First, `loadAdventureConfig` performs a pure file read of `adventure.config.json` under a given project path, delegating I/O to a guarded `readFileIfExists` that treats missing files as non-fatal. Next, `parseAdventureConfig` becomes the single decoding station: it calls `loadAdventureConfig`, attempts `JSON.parse`, and returns `null` on any parse error to prevent exception leaks into higher layers. With decoded data in hand, `extractUniqueFilePaths` navigates the entire object graph using an explicit stack, locating any `path` fields at any depth. It validates each candidate using `fs.existsSync(path.resolve(projectPath, rel))`, collecting only real, unique waypoints. Finally, `formatAdventureConfigForPrompt` condenses the data into a minimal, LLM-friendly signal: listing quest titles, file paths, and highlight function names while filtering empty structures. Together, these functions transform raw repository signals into navigable charts: robust reads, tolerant parsing, exhaustive traversal, and deliberate compression. This pattern ensures downstream story generators and analyzers receive clean, consistent inputs, enabling stable mission execution and predictable content assembly across the galaxy of your project.

#### Highlights
- `parseAdventureConfig` centralizes JSON parsing and shields upstream systems by returning `null` on unreadable or malformed configs, ensuring fault isolation.
- `extractUniqueFilePaths` performs a stack-based graph traversal to find `path` fields anywhere, validating existence and de-duplicating results for precise waypoints.
- `formatAdventureConfigForPrompt` compresses the adventure structure into a succinct prompt: quest titles, file paths, and function names only, minimizing token load.

## Code
### packages/core/src/shared/adventure-config.ts
```typescript
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
- Serves as the single point of JSON decoding, simplifying error handling across the system
- Uses a guard on missing raw content and a `try/catch` around `JSON.parse` for safety
- Returns `null` instead of throwing, keeping the pipeline resilient and predictable
- Decouples parsing from I/O by delegating read logic to `loadAdventureConfig`
- Encourages upstream callers to handle `null` as a non-fatal absence of configuration

---

```typescript
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
- Executes an explicit stack-based traversal over arbitrary nested objects and arrays
- Detects `path` fields anywhere in the structure and trims/validates candidates
- Uses `fs.existsSync` with `path.resolve` to ensure only real files become waypoints
- Employs a `Set` to de-duplicate paths, preventing redundant navigation targets
- Returns a stable array of unique, existing file paths for downstream analyzers

---

```typescript
export function formatAdventureConfigForPrompt(projectPath: string): string {
  const parsed = parseAdventureConfig(projectPath);
  if (!parsed || typeof parsed !== 'object') {
    return '';
  }

  const adventure = (parsed as any).adventure;
  if (!adventure || !Array.isArray(adventure.quests)) {
    return '';
  }

  let formatted = `## Quest Structure\n`;

  for (const quest of adventure.quests) {
    if (!quest.title || !Array.isArray(quest.files)) continue;

    formatted += `### ${quest.title}\n`;
    
    // Just file paths, no verbose descriptions
    const filePaths = quest.files.map((f: any) => f.path).filter(Boolean);
    formatted += `Files: ${filePaths.join(', ')}\n`;
    
    // Just function names, no descriptions
    const functions = quest.files
      .flatMap((f: any) => f.highlights || [])
      .map((h: any) => h.name)
      .filter(Boolean);
    formatted += `Functions: ${functions.join(', ')}\n\n`;
  }

  return formatted;
}
```
- Produces a compact prompt representation to reduce token usage for the LLM core
- Filters invalid quests and missing arrays to maintain well-formed output
- Extracts only file paths and function names, stripping verbose descriptions
- Iterates deterministically over quests and their files/highlights to build structure
- Returns an empty string when configuration is missing or malformed, preserving stability

## Helpful Hints
- Start with `parseAdventureConfig` to confirm whether your config is readable before exploring traversal or formatting.
- Compare the output of `extractUniqueFilePaths` to your repository layout to spot missing or misconfigured waypoints.
- Use `formatAdventureConfigForPrompt` output to sanity-check what the LLM core will actually ingest.

---
You have mastered all the secrets of your project context! Your adventure is complete.

Mission log update: You’ve charted the Cartography Annex like a star navigator and pushed your starship to 80% completion—Quest 5 secured with stellar precision, trajectory locked for the final frontier, full thrusters ahead! 🚀⭐📡🗺️