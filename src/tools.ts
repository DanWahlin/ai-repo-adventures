import { z } from 'zod';
import { optimizedAnalyzer, storyGenerator, adventureManager } from './shared/instances.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { AnalysisError, formatErrorForUser } from './shared/errors.js';

// Start Adventure Tool
export const start_adventure = {
  description: 'Begin your code repository adventure! Analyzes the project and presents theme options to the user.',
  schema: z.object({
    projectPath: z.string().optional().describe('Path to the project directory (defaults to current directory)')
  }),
  handler: async (args: any) => {
    const projectPath = args.projectPath || process.cwd();
    
    try {
      // Note: The actual scanning happens here immediately, before theme selection
      const projectInfo = await optimizedAnalyzer.analyzeProject(projectPath);
      
      try {
        storyGenerator.setProject(projectInfo);
      } catch (error) {
        throw AnalysisError(
          'Failed to initialize story generator with project info',
          { projectPath, step: 'story_initialization' },
          error instanceof Error ? error : new Error(String(error))
        );
      }
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `
🌟 **Welcome to Repo Adventures!** 🌟

You've discovered a mysterious codebase and want to unlock it's secrets! This ${projectInfo.type} project uses fascinating technologies like ${projectInfo.mainTechnologies.join(', ')} that you can explore.

Your mission, should you choose to accept it, is to explore this digital realm and understand its inner workings through an epic adventure! To get started, choose a theme for your adventure.

**Choose Your Story Theme:**

🚀 **Space Exploration** - Journey through cosmic codebases where data flows like stardust and APIs connect distant galaxies
🏰 **Enchanted Kingdom** - Explore magical realms where databases are dragon hoards and functions are powerful spells  
🏺 **Ancient Civilization** - Discover lost temples of code where algorithms are ancient wisdom and APIs are trade routes

What story theme would you like to explore?`
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

// Choose Theme Tool
export const choose_theme = {
  description: 'Select your adventure theme after starting.',
  schema: z.object({
    theme: z.enum(['space', 'medieval', 'ancient']).describe('The story theme to use for your adventure')
  }),
  handler: async (args: any) => {
    try {
      // Get the current project info (should be cached from start_adventure)
      const projectPath = process.cwd();
      const projectInfo = await optimizedAnalyzer.analyzeProject(projectPath);
      
      const story = await storyGenerator.generateStory(args.theme);
      adventureManager.setCurrentStory(story);
      
      // Set project context for enhanced adventure features
      adventureManager.setContext(projectInfo, args.theme);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: story.introduction
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

// Explore Path Tool
export const explore_path = {
  description: 'Choose your adventure path to explore different aspects of the codebase.',
  schema: z.object({
    choice: z.string().describe('The exploration choice you want to make')
  }),
  handler: async (args: any) => {
    try {
      const result = await adventureManager.makeChoice(args.choice);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: result.narrative + (result.choices && result.choices.length > 0 
              ? `\n\n**Your choices:**\n${result.choices.map((choice: string, i: number) => `${i + 1}. ${choice}`).join('\n')}\n\nUse \`explore_path\` with your choice to continue!`
              : '')
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

// Meet Character Tool
export const meet_character = {
  description: 'Interact with a specific character to learn about a technology or component.',
  schema: z.object({
    characterName: z.string().describe('Name of the character you want to meet')
  }),
  handler: async (args: any) => {
    try {
      const character = await adventureManager.getCharacterInfo(args.characterName);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `**${character.name}** approaches you with a warm smile.

"${character.greeting}"

**About ${character.name}:**
${character.description}

**What they do:**
${character.role}

**Fun fact:** ${character.funFact}

Would you like to explore their domain or continue your adventure elsewhere?`
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to meet character: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
};

// Export all tools for easy registration
export const tools = {
  start_adventure,
  choose_theme,
  explore_path,
  meet_character
};