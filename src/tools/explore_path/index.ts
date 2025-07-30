import { ExplorePathSchema, type ExplorePathInput } from '../schemas.js';
import { adventureManager } from '../../shared/instances.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export const explore_path = {
  description: 'Choose your adventure path to explore different aspects of the codebase.',
  schema: ExplorePathSchema,
  handler: async (args: ExplorePathInput) => {
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