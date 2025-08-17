/**
 * Explore Quest Tool
 * 
 * Delivers deep, workshop-style code exploration through LLM-generated 
 * themed content with adventure.config.json guidance.
 */

import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { validateAdventureChoice } from '@ai-repo-adventures/core/shared';
import { adventureManager } from '@ai-repo-adventures/core/adventure';
import { formatQuestResponse } from './shared.js';

// Schema
const exploreQuestSchema = z.object({
  choice: z.string().describe('The quest choice - can be quest number (1, 2, 3) or quest title')
});

// Types
type ExploreQuestArgs = z.infer<typeof exploreQuestSchema>;

// Tool Definition
export const exploreQuest = {
  description: `Explore specific quest with detailed code analysis and themed narrative. Accepts quest numbers or titles for guided codebase learning.`,
  schema: exploreQuestSchema,
  handler: async (args: ExploreQuestArgs) => {
    if (!adventureManager) {
      throw new McpError(ErrorCode.InternalError, 'Adventure manager not initialized');
    }

    try {
      // Validate choice input
      let validatedChoice: string;
      try {
        validatedChoice = validateAdventureChoice(args.choice);
      } catch (error) {
        throw new McpError(ErrorCode.InvalidParams, error instanceof Error ? error.message : 'Invalid quest choice');
      }
      
      // AdventureManager now handles numbered choices, titles, and IDs automatically
      const result = await adventureManager.exploreQuest(validatedChoice);
      
      let responseText = result.narrative;
      
      // Add progress update if available
      if (result.progressUpdate) {
        responseText += `\n\n**${result.progressUpdate}**`;
      }
      
      // Add available choices
      if (result.choices && result.choices.length > 0) {
        const questChoices = result.choices.filter(c => !c.includes('View progress'));
        const hasProgress = result.choices.includes('View progress');
        
        responseText += `\n\n**🗺️ Available Quests:**\n${questChoices.join('\n')}`;
        
        if (hasProgress) {
          responseText += `\n\n**📊 Other Options:**\n  View progress`;
        }
        
        responseText += `\n\nUse \`explore_quest\` with your choice to continue your journey!`;
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

