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
import { parseTheme, getAllThemes, AdventureTheme } from '../shared/theme.js';
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

/**
 * Validate and parse the theme input
 */
function validateAndParseTheme(themeInput: string): AdventureTheme {
  let validatedTheme: string;
  try {
    validatedTheme = validateTheme(themeInput);
  } catch (error) {
    throw new McpError(ErrorCode.InvalidParams, error instanceof Error ? error.message : 'Invalid theme');
  }
  
  const selectedTheme = parseTheme(validatedTheme);
  
  if (!selectedTheme) {
    const allThemes = getAllThemes();
    const validOptions = [...allThemes.map(t => `'${t.key}'`), ...allThemes.map(t => t.id.toString())];
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid theme: ${themeInput}. Please choose ${validOptions.join(', ')}.`
    );
  }

  return selectedTheme;
}

/**
 * Validate custom theme data
 */
function validateCustomTheme(selectedTheme: AdventureTheme, customThemeData?: { name: string; description: string; keywords: string[] }): void {
  if (selectedTheme !== 'custom') return;

  if (!customThemeData) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Custom theme data is required when selecting custom theme. Please provide customTheme with name, description, and keywords.'
    );
  }
  
  if (!customThemeData.name?.trim()) {
    throw new McpError(ErrorCode.InvalidParams, 'Custom theme name is required');
  }
  if (!customThemeData.description?.trim()) {
    throw new McpError(ErrorCode.InvalidParams, 'Custom theme description is required');
  }
  if (!customThemeData.keywords || customThemeData.keywords.length === 0) {
    throw new McpError(ErrorCode.InvalidParams, 'Custom theme keywords array is required');
  }
}

/**
 * Generate project info from repomix content
 */
async function generateProjectInfo(): Promise<{ projectPath: string; projectInfo: any }> {
  const projectPath = process.cwd();
  const repomixContent = await repoAnalyzer.generateRepomixContext(projectPath);
  const projectInfo = createProjectInfo(repomixContent);
  
  return { projectPath, projectInfo };
}

// Tool Definition
export const chooseTheme = {
  description: `Creates a complete themed quest experience using advanced LLM prompt engineering and optional adventure.config.json guidance. This tool takes the selected theme and generates a cohesive narrative that weaves actual codebase details into an immersive story. The LLM receives the full repomix content plus structured guidance about important functions and code areas, then transforms technical concepts into theme-appropriate metaphors. Generates 2-6 dynamic quests targeting key system areas: MCP Tool Interface, Adventure Generation Engine, Code Analysis Pipeline, Configuration & Themes, and Foundation & Utilities. Each quest includes specific files to explore, code snippets to discover, and workshop-style learning objectives. Supports custom themes with user-defined vocabulary. The result is a personalized learning journey unique to each codebase. INVOKE after start_adventure when user selects theme: ${generateThemeExamples()}.`,
  schema: chooseThemeSchema,
  handler: async (args: ChooseThemeArgs) => {
    if (!adventureManager) {
      throw new McpError(ErrorCode.InternalError, 'Adventure manager not initialized');
    }

    try {
      const selectedTheme = validateAndParseTheme(args.theme);
      validateCustomTheme(selectedTheme, args.customTheme);
      
      const { projectPath, projectInfo } = await generateProjectInfo();
      
      const storyWithQuests = await adventureManager.initializeAdventure(
        projectInfo, 
        selectedTheme, 
        projectPath,
        args.customTheme
      );
      
      return {
        content: [
          {
            type: 'text' as const,
            text: storyWithQuests
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