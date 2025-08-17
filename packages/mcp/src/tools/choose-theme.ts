/**
 * Choose Theme Tool
 * 
 * Creates a complete themed adventure experience using advanced LLM prompt 
 * engineering and optional adventure.config.json guidance.
 */

import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { repoAnalyzer } from '@ai-repo-adventures/core/analyzer';
import { parseTheme, getAllThemes, AdventureTheme, validateTheme } from '@ai-repo-adventures/core/shared';
import { createProjectInfo } from '@ai-repo-adventures/core';
import { adventureManager } from '@ai-repo-adventures/core/adventure';
import { formatThemeResponse } from './shared.js';

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
    // Provide helpful guidance for custom theme creation
    const helpMessage = `
✨ **Creating a Custom Theme**

To create a custom themed adventure, please call choose_theme again with:

\`\`\`json
{
  "theme": "custom",
  "customTheme": {
    "name": "Your Theme Name",
    "description": "Description of your theme's style and setting",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  }
}
\`\`\`

**Examples:**

🌊 **Pirate Adventure:**
\`\`\`json
{
  "theme": "custom",
  "customTheme": {
    "name": "Pirate Adventure",
    "description": "A swashbuckling journey across the seven seas of code",
    "keywords": ["pirate", "ship", "treasure", "ocean", "captain", "crew"]
  }
}
\`\`\`

🌆 **Cyberpunk:**
\`\`\`json
{
  "theme": "custom",
  "customTheme": {
    "name": "Cyberpunk",
    "description": "Navigate neon-lit digital streets where code is power",
    "keywords": ["cyber", "neon", "hacker", "matrix", "digital", "tech"]
  }
}
\`\`\`

🕵️ **Detective Mystery:**
\`\`\`json
{
  "theme": "custom",
  "customTheme": {
    "name": "Detective Mystery",
    "description": "Solve coding mysteries as a detective investigating bugs",
    "keywords": ["detective", "mystery", "clue", "investigate", "case", "evidence"]
  }
}
\`\`\``;
    
    throw new McpError(
      ErrorCode.InvalidParams,
      helpMessage
    );
  }
  
  if (!customThemeData.name?.trim()) {
    throw new McpError(ErrorCode.InvalidParams, 'Custom theme name is required');
  }
  if (!customThemeData.description?.trim()) {
    throw new McpError(ErrorCode.InvalidParams, 'Custom theme description is required');
  }
  if (!customThemeData.keywords || customThemeData.keywords.length === 0) {
    throw new McpError(ErrorCode.InvalidParams, 'Custom theme keywords array is required (provide at least 3 keywords)');
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
  description: `Generate themed story and quests for selected adventure theme. Creates immersive narrative with codebase-specific learning objectives.`,
  schema: chooseThemeSchema,
  handler: async (args: ChooseThemeArgs) => {
    if (!adventureManager) {
      throw new McpError(ErrorCode.InternalError, 'Adventure manager not initialized');
    }

    try {
      const selectedTheme = validateAndParseTheme(args.theme);
      validateCustomTheme(selectedTheme, args.customTheme);
      
      // Check if we already have project info from start-adventure
      let projectInfo = adventureManager.getProjectInfo();
      let projectPath = adventureManager.getProjectPath();
      
      // Only regenerate if not already initialized (e.g., if choose-theme is called directly)
      if (!projectInfo || !projectPath) {
        const generated = await generateProjectInfo();
        projectPath = generated.projectPath;
        projectInfo = generated.projectInfo;
      }
      
      // Ensure we have valid project info and path
      if (!projectInfo || !projectPath) {
        throw new McpError(ErrorCode.InternalError, 'Failed to generate project information');
      }
      
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