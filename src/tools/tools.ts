import { start_adventure } from './start_adventure/index.js';
import { choose_theme } from './choose_theme/index.js';
import { explore_path } from './explore_path/index.js';
import { meet_character } from './meet_character/index.js';
import { z } from 'zod';

// Base tool interface
export interface Tool<T = any> {
  description: string;
  schema: z.ZodSchema<T>;
  handler: (args: T) => Promise<any>;
}

export const repoAdventureTools: Record<string, Tool> = {
  start_adventure,
  choose_theme,
  explore_path,
  meet_character
};

export type ToolName = keyof typeof repoAdventureTools;