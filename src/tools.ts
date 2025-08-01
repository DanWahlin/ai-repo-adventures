import { z } from 'zod';
import { optimizedAnalyzer } from './shared/instances.js';
import { AdventureManager } from './adventure/AdventureManager.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { formatErrorForUser } from './shared/errors.js';

// Create a single shared adventure manager instance
const adventureManager = new AdventureManager();

// Schema types
type StartAdventureArgs = z.infer<typeof startAdventureSchema>;
type ChooseThemeArgs = z.infer<typeof chooseThemeSchema>;
type ExplorePathArgs = z.infer<typeof explorePathSchema>;
type ProgressArgs = z.infer<typeof progressSchema>;

// Schemas
const startAdventureSchema = z.object({
  projectPath: z.string().optional().describe('Path to the project directory (defaults to current directory)')
});

const chooseThemeSchema = z.object({
  theme: z.enum(['space', 'medieval', 'ancient'] as const).describe('The story theme to use for your adventure')
});

const explorePathSchema = z.object({
  choice: z.string().describe('The adventure choice - can be adventure number (1, 2, 3) or adventure title')
});

const progressSchema = z.object({});

// Start Adventure Tool
export const start_adventure = {
  description: 'Begin your code repository adventure! Analyzes the project and presents theme options to the user.',
  schema: startAdventureSchema,
  handler: async (args: StartAdventureArgs) => {
    const projectPath = args.projectPath || process.cwd();
    
    try {
      // Analyze the project
      const projectInfo = await optimizedAnalyzer.analyzeProject(projectPath);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `🌟 **Welcome to Repo Adventures!** 🌟

You've discovered a mysterious codebase containing ${projectInfo.fileCount} files of digital wisdom! This ${projectInfo.type} project harnesses the power of ${projectInfo.mainTechnologies.slice(0, 3).join(', ')}${projectInfo.mainTechnologies.length > 3 ? ` and ${projectInfo.mainTechnologies.length - 3} other technologies` : ''}.

📊 **Initial Scan Results:**
• ${projectInfo.codeAnalysis.functions.length} functions discovered
• ${projectInfo.codeAnalysis.classes.length} classes detected
• ${projectInfo.codeAnalysis.dependencies.length} dependencies connected
• Entry point: ${projectInfo.codeAnalysis.entryPoints[0] || 'Unknown'}

Your mission: Transform into a digital explorer and uncover the secrets of this codebase through an immersive, LLM-generated adventure! Every story, character, and code insight is dynamically created based on your actual project structure.

**Choose Your Story Theme:**

🚀 **Space Exploration** - Journey through cosmic codebases where data flows like stardust and APIs connect distant galaxies
🏰 **Enchanted Kingdom** - Explore magical realms where databases are dragon hoards and functions are powerful spells  
🏺 **Ancient Civilization** - Discover lost temples of code where algorithms are ancient wisdom and APIs are trade routes

Use the \`choose_theme\` tool with your preferred theme to begin your adventure!`
          }
        ]
      };
    } catch (error) {
      const context = { projectPath, step: 'project_analysis' };
      const formattedError = formatErrorForUser(error instanceof Error ? error : new Error(String(error)), context);
      
      throw new McpError(
        ErrorCode.InternalError,
        formattedError
      );
    }
  }
};

// Choose Theme Tool - Now uses LLM to generate story + adventures
export const choose_theme = {
  description: 'Select your adventure theme and generate a custom story with adventures based on your project.',
  schema: chooseThemeSchema,
  handler: async (args: ChooseThemeArgs) => {
    try {
      // Get the current project info
      const projectPath = process.cwd();
      const projectInfo = await optimizedAnalyzer.analyzeProject(projectPath);
      
      // Initialize adventure with LLM-generated content
      const storyWithAdventures = await adventureManager.initializeAdventure(projectInfo, args.theme);
      
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

// Explore Path Tool - Now handles both numbered choices and adventure titles
export const explore_path = {
  description: 'Choose your adventure path to explore different aspects of the codebase. Use adventure numbers (1, 2, 3) or adventure titles.',
  schema: explorePathSchema,
  handler: async (args: ExplorePathArgs) => {
    try {
      // AdventureManager now handles numbered choices, titles, and IDs automatically
      const result = await adventureManager.exploreAdventure(args.choice);
      
      let responseText = result.narrative;
      
      // Add progress update if available
      if (result.progressUpdate) {
        responseText += `\n\n**${result.progressUpdate}**`;
      }
      
      // Add available choices
      if (result.choices && result.choices.length > 0) {
        responseText += `\n\n**Available Adventures:**\n${result.choices.map((choice: string, i: number) => `${i + 1}. ${choice}`).join('\n')}\n\nUse \`explore_path\` with your choice to continue your journey!`;
      }
      
      return {
        content: [
          {
            type: 'text' as const,
            text: responseText
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to explore path: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
};

// Progress Tool - Show current adventure progress
export const view_progress = {
  description: 'View your current adventure progress and see completed adventures.',
  schema: progressSchema,
  handler: async (_args: ProgressArgs) => {
    try {
      const progress = adventureManager.getProgress();
      
      let responseText = progress.narrative;
      
      // Add available choices
      if (progress.choices && progress.choices.length > 0) {
        responseText += `\n\n**Available Adventures:**\n${progress.choices.map((choice: string, i: number) => `${i + 1}. ${choice}`).join('\n')}\n\nUse \`explore_path\` with your choice to continue!`;
      }
      
      return {
        content: [
          {
            type: 'text' as const,
            text: responseText
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to view progress: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
};

// Export all tools for easy registration
export const tools = {
  start_adventure,
  choose_theme,
  explore_path,
  view_progress
};