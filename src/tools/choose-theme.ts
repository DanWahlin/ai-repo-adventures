/**
 * Choose Theme Tool
 * 
 * Creates a complete themed adventure experience using advanced LLM prompt 
 * engineering and optional adventure.config.json guidance.
 */

import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { repoAnalyzer } from '../analyzer/repo-analyzer.js';
import { AdventureManager } from '../adventure/adventure-manager.js';
import { parseTheme, getAllThemes } from '../shared/theme.js';
import { validateTheme } from '../shared/input-validator.js';
import { createProjectInfo, generateThemeExamples } from './shared.js';

// Create a shared adventure manager instance (imported from main tools.ts)
let adventureManager: AdventureManager;
export function setAdventureManager(manager: AdventureManager) {
  adventureManager = manager;
}

// Schema
const chooseThemeSchema = z.object({
  theme: z.string().describe(`The story theme - use theme names or numbers: ${getAllThemes().map(t => `"${t.key}"`).join('/')} or ${getAllThemes().map(t => t.id).join('/')}`),
  customTheme: z.object({
    name: z.string().describe('Custom theme name (e.g., "Cyberpunk", "Pirate Adventure")'),
    description: z.string().describe('Custom theme description explaining the style and setting'),
    keywords: z.array(z.string()).describe('Array of keywords that define the theme vocabulary (e.g., ["cyber", "neon", "matrix", "digital"])')
  }).optional().describe('Custom theme data - required only when theme is "custom"')
});

// Types
type ChooseThemeArgs = z.infer<typeof chooseThemeSchema>;

// Tool Definition
export const chooseTheme = {
  description: `Creates a complete themed adventure experience using advanced LLM prompt engineering and optional adventure.config.json guidance. This tool takes the selected theme and generates a cohesive narrative that weaves actual codebase details into an immersive story. The LLM receives the full repomix content plus structured guidance about important functions and code areas, then transforms technical concepts into theme-appropriate metaphors. Generates 2-6 dynamic adventures targeting key system areas: MCP Tool Interface, Adventure Generation Engine, Code Analysis Pipeline, Configuration & Themes, and Foundation & Utilities. Each adventure includes specific files to explore, code snippets to discover, and workshop-style learning objectives. Supports custom themes with user-defined vocabulary. The result is a personalized learning journey unique to each codebase. INVOKE after start_adventure when user selects theme: ${generateThemeExamples()}.`,
  schema: chooseThemeSchema,
  handler: async (args: ChooseThemeArgs) => {
    console.log('🎯 choose_theme handler called with theme:', args.theme);
    if (!adventureManager) {
      console.error('❌ Adventure manager is not initialized in choose-theme.ts');
      throw new McpError(ErrorCode.InternalError, 'Adventure manager not initialized');
    }
    console.log('✅ Adventure manager is available');

    try {
      // Validate theme input
      let validatedTheme: string;
      try {
        validatedTheme = validateTheme(args.theme);
      } catch (error) {
        throw new McpError(ErrorCode.InvalidParams, error instanceof Error ? error.message : 'Invalid theme');
      }
      
      // Parse the theme input (handles numbers, full names, partial matches)
      const selectedTheme = parseTheme(validatedTheme);
      
      if (!selectedTheme) {
        const allThemes = getAllThemes();
        const validOptions = [...allThemes.map(t => `'${t.key}'`), ...allThemes.map(t => t.id.toString())];
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid theme: ${args.theme}. Please choose ${validOptions.join(', ')}.`
        );
      }

      // Handle custom theme validation
      if (selectedTheme === 'custom') {
        if (!args.customTheme) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Custom theme data is required when selecting custom theme. Please provide customTheme with name, description, and keywords.'
          );
        }
        
        // Validate custom theme data
        if (!args.customTheme.name?.trim()) {
          throw new McpError(ErrorCode.InvalidParams, 'Custom theme name is required');
        }
        if (!args.customTheme.description?.trim()) {
          throw new McpError(ErrorCode.InvalidParams, 'Custom theme description is required');
        }
        if (!args.customTheme.keywords || args.customTheme.keywords.length === 0) {
          throw new McpError(ErrorCode.InvalidParams, 'Custom theme keywords array is required');
        }
      }
      
      // Generate repomix content and create minimal ProjectInfo
      const projectPath = process.cwd();
      const repomixContent = await repoAnalyzer.generateRepomixContext(projectPath);
      const projectInfo = createProjectInfo(repomixContent);
      
      // Initialize adventure with LLM-generated content
      const storyWithAdventures = await adventureManager.initializeAdventure(
        projectInfo, 
        selectedTheme, 
        projectPath,
        args.customTheme
      );
      
      return {
        content: [
          {
            type: 'text' as const,
            text: storyWithAdventures
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to choose theme: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
};