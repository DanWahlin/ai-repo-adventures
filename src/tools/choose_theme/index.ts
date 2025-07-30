import { ChooseThemeSchema, type ChooseThemeInput } from '../schemas.js';
import { storyGenerator, adventureManager } from '../../shared/instances.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export const choose_theme = {
  description: 'Select your adventure theme after starting.',
  schema: ChooseThemeSchema,
  handler: async (args: ChooseThemeInput) => {
    try {
      const story = await storyGenerator.generateStory(args.theme);
      adventureManager.setCurrentStory(story);
      
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