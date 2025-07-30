import { MeetCharacterSchema, type MeetCharacterInput } from '../schemas.js';
import { adventureManager } from '../../shared/instances.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export const meet_character = {
  description: 'Interact with a specific character to learn about a technology or component.',
  schema: MeetCharacterSchema,
  handler: async (args: MeetCharacterInput) => {
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