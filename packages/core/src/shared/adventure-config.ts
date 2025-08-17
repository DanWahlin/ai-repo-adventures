import * as fs from 'fs';
import * as path from 'path';

const ADVENTURE_CONFIG_FILE = 'adventure.config.json';

function readFileIfExists(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    // Missing or unreadable file is non-fatal
    return null;
  }
}

/**
 * Loads the raw adventure config text if present.
 * Pure file read - no parsing here.
 */
export function loadAdventureConfig(projectPath: string): string | null {
  const configPath = path.join(projectPath, ADVENTURE_CONFIG_FILE);
  return readFileIfExists(configPath);
}

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

/**
 * Formats adventure config into a readable format for LLM prompts
 * This ensures structured sections always appear in quest content
 */
export function formatAdventureConfigForPrompt(projectPath: string): string {
  const parsed = parseAdventureConfig(projectPath);
  if (!parsed || typeof parsed !== 'object') {
    return '';
  }

  const adventure = (parsed as any).adventure;
  if (!adventure || !Array.isArray(adventure.quests)) {
    return '';
  }

  let formatted = `## Quest Structure Guidelines\n\n`;
  formatted += `**CRITICAL: Each quest MUST include dedicated file analysis sections**\n\n`;

  for (const quest of adventure.quests) {
    if (!quest.title || !Array.isArray(quest.files)) continue;

    formatted += `### ${quest.title}\n`;
    formatted += `${quest.description}\n\n`;
    formatted += `**Required File Analysis Sections:**\n`;

    for (const file of quest.files) {
      if (!file.path || !file.description) continue;

      formatted += `\n**File: \`${file.path}\`**\n`;
      formatted += `- Description: ${file.description}\n`;
      
      if (Array.isArray(file.highlights)) {
        formatted += `- Key Functions/Areas to Highlight:\n`;
        for (const highlight of file.highlights) {
          if (highlight.name && highlight.description) {
            formatted += `  • **${highlight.name}**: ${highlight.description}\n`;
          }
        }
      }
    }
    formatted += `\n`;
  }

  formatted += `\n**FORMATTING INSTRUCTIONS:**\n`;
  formatted += `- Each file mentioned in the quest structure above MUST have its own dedicated analysis section\n`;
  formatted += `- **MANDATORY**: Include at least 2-3 separate code snippet sections (## filename) with real code blocks\n`;
  formatted += `- Show actual function signatures, imports, class definitions, or key methods from the files\n`;
  formatted += `- Include real code snippets from the actual files (never invent code)\n`;
  formatted += `- Provide practical explanations using real-world analogies\n`;
  formatted += `- End with helpful hints and next steps\n`;

  return formatted;
}