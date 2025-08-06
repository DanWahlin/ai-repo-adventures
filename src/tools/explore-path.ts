/**
 * Explore Path Tool
 * 
 * Delivers deep, workshop-style code exploration through LLM-generated 
 * themed content with adventure.config.json guidance.
 */

import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { AdventureManager } from '../adventure/adventure-manager.js';
import { validateAdventureChoice } from '../shared/input-validator.js';

// Create a shared adventure manager instance (imported from main tools.ts)
let adventureManager: AdventureManager;
export function setAdventureManager(manager: AdventureManager) {
  adventureManager = manager;
}

// Schema
const explorePathSchema = z.object({
  choice: z.string().describe('The adventure choice - can be adventure number (1, 2, 3) or adventure title')
});

// Types
type ExplorePathArgs = z.infer<typeof explorePathSchema>;

// Tool Definition
export const explorePath = {
  description: `Delivers deep, workshop-style code exploration through LLM-generated themed content with adventure.config.json guidance. This tool accepts adventure numbers (1-5) or partial titles and creates detailed educational experiences that blend actual code analysis with immersive storytelling. Uses targeted repomix content for specific files plus workshop highlights that guide users through key functions step-by-step. The LLM transforms technical function names into theme-appropriate metaphors while maintaining educational value - constructors become "initialization rituals", handlers become "communication protocols", analyzers become "scanning systems". Each exploration includes real code snippets, architectural insights, dependency explanations, and practical hints wrapped in engaging narrative. Tracks completion progress and suggests logical next steps. Perfect for learning complex codebases through structured, gamified exploration. INVOKE to dive into specific code areas: "explore 1", "adventure 2", "visit the command center", "enter the temple", "explore MCP tools", "dive into story generation".`,
  schema: explorePathSchema,
  handler: async (args: ExplorePathArgs) => {
    if (!adventureManager) {
      throw new McpError(ErrorCode.InternalError, 'Adventure manager not initialized');
    }

    try {
      // Validate choice input
      let validatedChoice: string;
      try {
        validatedChoice = validateAdventureChoice(args.choice);
      } catch (error) {
        throw new McpError(ErrorCode.InvalidParams, error instanceof Error ? error.message : 'Invalid adventure choice');
      }
      
      // AdventureManager now handles numbered choices, titles, and IDs automatically
      const result = await adventureManager.exploreAdventure(validatedChoice);
      
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