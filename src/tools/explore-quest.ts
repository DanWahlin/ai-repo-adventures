/**
 * Explore Quest Tool
 * 
 * Delivers deep, workshop-style code exploration through LLM-generated 
 * themed content with adventure.config.json guidance.
 */

import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { validateAdventureChoice } from '../shared/input-validator.js';
import { adventureManager } from '../adventure/state.js';

// Schema
const exploreQuestSchema = z.object({
  choice: z.string().describe('The quest choice - can be quest number (1, 2, 3) or quest title')
});

// Types
type ExploreQuestArgs = z.infer<typeof exploreQuestSchema>;

// Tool Definition
export const exploreQuest = {
  description: `Delivers deep, workshop-style code exploration through LLM-generated themed content with adventure.config.json guidance. This tool accepts quest numbers or partial titles and creates detailed educational experiences that blend actual code analysis with immersive storytelling. Uses targeted repomix content for specific files plus workshop highlights that guide users through key functions step-by-step. The LLM transforms technical function names into theme-appropriate metaphors while maintaining educational value - constructors become "initialization rituals", handlers become "communication protocols", analyzers become "scanning systems". Each exploration includes real code snippets, architectural insights, dependency explanations, and practical hints wrapped in engaging narrative. Tracks completion progress and suggests logical next steps. Perfect for learning complex codebases through structured, gamified exploration. INVOKE to dive into specific quest areas: "explore 1", "quest 2", "visit the command center", "enter the temple", "explore MCP tools", "dive into story generation".`,
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

