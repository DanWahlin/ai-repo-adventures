import * as fs from 'fs';
import * as path from 'path';

export interface AdventureHighlight {
  name: string;
  description: string;
}

export interface AdventureFile {
  path: string;
  description: string;
  highlights: AdventureHighlight[];
}

export interface AdventureDefinition {
  title: string;
  description: string;
  files: AdventureFile[];
}

export interface AdventureConfig {
  adventures: AdventureDefinition[];
}

/**
 * Load adventure configuration from adventure.config.json if it exists
 */
export function loadAdventureConfig(projectPath: string): AdventureConfig | null {
  try {
    const configPath = path.join(projectPath, 'adventure.config.json');
    
    if (!fs.existsSync(configPath)) {
      return null;
    }
    
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent) as AdventureConfig;
    
    // Basic validation
    if (!config.adventures || !Array.isArray(config.adventures)) {
      console.warn('Invalid adventure.config.json: adventures must be an array');
      return null;
    }
    
    return config;
  } catch (error) {
    console.warn(`Failed to load adventure.config.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Find adventure definition by title (case-insensitive partial match)
 */
export function findAdventureByTitle(config: AdventureConfig, title: string): AdventureDefinition | null {
  const lowerTitle = title.toLowerCase();
  return config.adventures.find(adventure => 
    adventure.title.toLowerCase().includes(lowerTitle) ||
    lowerTitle.includes(adventure.title.toLowerCase())
  ) || null;
}

/**
 * Format adventure config for LLM prompt
 */
export function formatConfigForPrompt(config: AdventureConfig): string {
  return config.adventures.map(adventure => {
    const filesText = adventure.files.map(file => {
      const highlightsText = file.highlights.map(h => 
        `      - ${h.name}: ${h.description}`
      ).join('\n');
      
      return `    File: ${file.path}
    Description: ${file.description}
    Key Functions:
${highlightsText}`;
    }).join('\n\n');
    
    return `Adventure: "${adventure.title}"
Description: ${adventure.description}
Files:
${filesText}`;
  }).join('\n\n---\n\n');
}

/**
 * Extract highlights for a specific adventure and file paths
 */
export function extractHighlightsForFiles(config: AdventureConfig, adventureTitle: string, filePaths: string[]): AdventureHighlight[] {
  const adventure = findAdventureByTitle(config, adventureTitle);
  if (!adventure) return [];
  
  const highlights: AdventureHighlight[] = [];
  
  for (const filePath of filePaths) {
    const file = adventure.files.find(f => f.path === filePath);
    if (file) {
      highlights.push(...file.highlights);
    }
  }
  
  return highlights;
}