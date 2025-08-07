import * as fs from 'fs';
import * as path from 'path';

/**
 * Load adventure configuration from adventure.config.json if it exists
 * Returns the raw JSON content to pass to LLM as context
 */
export function loadAdventureConfig(projectPath: string): string | null {
  try {
    const configPath = path.join(projectPath, 'adventure.config.json');
    
    if (!fs.existsSync(configPath)) {
      return null;
    }
    
    const configContent = fs.readFileSync(configPath, 'utf-8');
    
    // Basic validation - just ensure it's valid JSON
    JSON.parse(configContent);
    
    return configContent;
  } catch (error) {
    console.warn(`Failed to load adventure.config.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}