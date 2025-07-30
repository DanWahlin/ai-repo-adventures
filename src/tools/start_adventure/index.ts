import { StartAdventureSchema, type StartAdventureInput } from '../schemas.js';
import { optimizedAnalyzer, storyGenerator } from '../../shared/instances.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export const start_adventure = {
  description: 'Begin your code repository adventure! Analyzes the project and presents theme options.',
  schema: StartAdventureSchema,
  handler: async (args: StartAdventureInput) => {
    try {
      const projectPath = args.projectPath || process.cwd();
      const projectInfo = await optimizedAnalyzer.analyzeProject(projectPath);
      storyGenerator.setProject(projectInfo);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `🌟 **Welcome to Repo Adventure!** 🌟

You've discovered a mysterious codebase that holds many secrets! This ${projectInfo.type} project contains ${projectInfo.fileCount} files and uses fascinating technologies like ${projectInfo.mainTechnologies.join(', ')}.

Your mission, should you choose to accept it, is to explore this digital realm and understand its inner workings through an epic adventure!

**Choose Your Story Theme:**

🚀 **Space Exploration** - Journey through cosmic codebases where data flows like stardust and APIs connect distant galaxies
🏰 **Enchanted Kingdom** - Explore magical realms where databases are dragon hoards and functions are powerful spells  
🏺 **Ancient Civilization** - Discover lost temples of code where algorithms are ancient wisdom and APIs are trade routes

Use the \`choose_theme\` tool with your preferred theme (space, medieval, or ancient) to begin your adventure!`
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to start adventure: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
};