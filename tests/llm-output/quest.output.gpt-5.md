# Quest 5: Plot the Adventure Flight Plan
---
Your helm glows with starmaps as the Aurora prepares to plot the Adventure Flight Plan. The crew needs a compact, navigable briefing distilled from raw mission charts. You align scanners toward configuration nebulae, where paths to code constellations await extraction and formatting. With the LLM reactor humming, your task is to parse the mission config, chart unique file trajectories, and compress the plan into a prompt-friendly star chart. Stay sharp: one misread path could throw the expedition off orbit.

## Quest Objectives
As you explore the code below, investigate these key questions:
- 🔍 Scanner Calibration: How does `parseAdventureConfig` centralize JSON parsing so other systems avoid duplicating parsing logic?
- ⚡ Chart Compression: In `formatAdventureConfigForPrompt`, what techniques trim verbose config into a minimal, prompt-ready flight plan?
- 🛡️ Path Integrity Shields: How does `extractUniqueFilePaths` validate referenced `path` entries and avoid false positives or missing files?

## File Exploration
### packages/core/src/shared/adventure-config.ts: Core navigational instruments for loading, parsing, distilling, and extracting adventure configuration
This module equips the Aurora with precise instruments for mission configuration handling. At launch, `loadAdventureConfig` performs a pure file read of `adventure.config.json`, delegating all parsing to `parseAdventureConfig`. That separation prevents accidental coupling between I/O and validation while allowing upstream systems to treat missing or malformed data as non-fatal. The `parseAdventureConfig` function is the single waypoint for JSON interpretation, returning `null` on any anomaly, which simplifies flow control for callers that just need a yes/no readiness signal.

For route plotting, `extractUniqueFilePaths` traverses the entire parsed config graph iteratively, looking for any `path` fields. Each candidate is trimmed, resolved relative to the project root, and verified with `fs.existsSync` before inclusion. This ensures only physically valid routes are placed on the star map, eliminating phantom references. Finally, `formatAdventureConfigForPrompt` compresses adventures into a concise format capturing just quest titles, file paths, and function names. This compression aligns with LLM prompt constraints, minimizing noise while preserving essential navigation cues for downstream generators. Together, these instruments transform raw configuration dust into actionable star charts that the crew can follow across the code galaxy.

#### Highlights
- `parseAdventureConfig` centralizes JSON parsing and validation, returning `null` on errors so callers can fail gracefully without throwing.
- `extractUniqueFilePaths` performs a graph walk to find all `path` fields, resolves and validates them with the filesystem, and returns de-duplicated routes.
- `formatAdventureConfigForPrompt` converts rich config into a minimal, LLM-optimized briefing listing quest titles, file paths, and function names.

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
- Establishes a single point for JSON parsing, ensuring consistent error handling by returning `null` instead of throwing.
- Separates concerns: file reading happens in `loadAdventureConfig`, while parsing and validation live here.
- Encourages defensive calling patterns, allowing higher layers to branch on presence/absence without try/catch.
- Simplifies integration with other modules that expect a clean `object | null` result for system flow decisions.
- Avoids leaky abstractions by not exposing parsing exceptions to the rest of the navigation stack.

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
- Iteratively walks the entire config graph to find `path` occurrences, preventing missed references nested in arrays or objects.
- Validates each discovered path with `fs.existsSync` after resolving to an absolute path, ensuring only real files are charted.
- Uses a `Set` to de-duplicate routes, keeping the flight plan concise and free of redundant waypoints.
- Employs a stack-based traversal to avoid recursion depth issues, providing robustness for large configs.
- Returns a stable array of unique, validated file paths ready for downstream analyzers and mission planners.

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
- Produces a compact, LLM-friendly overview by listing quest titles, file paths, and function names without verbose prose.
- Validates structure at each step, returning an empty string for missing or malformed data to prevent noisy prompts.
- Applies a clear separation between data extraction and presentation, aiding maintainability and testability.
- Uses `flatMap` on highlights to collect function names efficiently, ensuring coverage of all file-level highlights.
- Aligns with prompt token budgets, improving reliability of downstream generation within resource constraints.

## Helpful Hints
- Start by checking `parseAdventureConfig` results before invoking path extraction or formatting to avoid null flows.
- Compare the output of `extractUniqueFilePaths` against your workspace to verify the navigator’s integrity.
- Use `formatAdventureConfigForPrompt` to preview your mission brief and ensure it lists only essential coordinates.

---
You have mastered all the secrets of this project! Your adventure is complete.

Mission accomplished, cadet—your stellar success in Quest 5: Plot the Adventure Flight Plan has locked in a precise trajectory for our starship’s next burn, pushing you to 80% mission completion and priming your cosmic instruments for a triumphant final orbit—keep those thrusters hot and sensors aligned! 🚀⭐📡