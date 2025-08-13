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