import { z } from 'zod';

// Input schemas for tools
export const StartAdventureSchema = z.object({
  projectPath: z.string().optional().describe('Path to the project directory (defaults to current directory)')
});

export const ChooseThemeSchema = z.object({
  theme: z.enum(['space', 'medieval', 'ancient']).describe('The story theme to use for your adventure')
});

export const ExplorePathSchema = z.object({
  choice: z.string().describe('The exploration choice you want to make')
});

export const MeetCharacterSchema = z.object({
  characterName: z.string().describe('Name of the character you want to meet')
});

// Types for tool inputs
export type StartAdventureInput = z.infer<typeof StartAdventureSchema>;
export type ChooseThemeInput = z.infer<typeof ChooseThemeSchema>;
export type ExplorePathInput = z.infer<typeof ExplorePathSchema>;
export type MeetCharacterInput = z.infer<typeof MeetCharacterSchema>;