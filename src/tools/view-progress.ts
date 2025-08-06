/**
 * View Progress Tool
 * 
 * Provides comprehensive adventure progress dashboard showing your learning 
 * journey through the codebase.
 */

import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { AdventureManager } from '../adventure/adventure-manager.js';

// Create a shared adventure manager instance (imported from main tools.ts)
let adventureManager: AdventureManager;
export function setAdventureManager(manager: AdventureManager) {
  adventureManager = manager;
}

// Schema
const progressSchema = z.object({});

// Types
type ProgressArgs = z.infer<typeof progressSchema>;

// Tool Definition
export const viewProgress = {
  description: `Provides comprehensive adventure progress dashboard showing your learning journey through the codebase. Displays completion percentage, lists completed adventures with their themed titles, shows remaining exploration areas, and offers contextual encouragement based on your progress. This tool helps you understand which system components you've mastered (MCP Tools, Adventure Engine, Code Pipeline, Configuration, Foundation) and strategically plan your next learning steps. Perfect for tracking educational progress in complex codebases and ensuring comprehensive understanding. Shows both technical areas covered and themed adventure titles completed. Automatically adapts to your adventure path and provides personalized recommendations for continued exploration. No parameters needed - maintains state across all adventure sessions. INVOKE when you want to assess your journey: "view progress", "show my progress", "where am I", "what's completed", "learning status", "adventure status", "how much left to explore".`,
  schema: progressSchema,
  handler: async (_args: ProgressArgs) => {
    if (!adventureManager) {
      throw new McpError(ErrorCode.InternalError, 'Adventure manager not initialized');
    }

    try {
      const progress = adventureManager.getProgress();
      
      let responseText = progress.narrative;
      
      // Add available choices
      if (progress.choices && progress.choices.length > 0) {
        responseText += `\n\n**Available Adventures:**\n${progress.choices.map((choice: string, i: number) => `${i + 1}. ${choice}`).join('\n')}\n\nUse \`explore_adventure_path\` with your choice to continue!`;
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