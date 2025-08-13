/**
 * View Progress Tool
 * 
 * Provides comprehensive quest progress dashboard showing your learning 
 * journey through the codebase.
 */

import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { adventureManager } from '../adventure/state.js';

// Schema
const progressSchema = z.object({});

// Types
type ProgressArgs = z.infer<typeof progressSchema>;

// Tool Definition
export const viewProgress = {
  description: `Show quest completion progress and remaining adventures. Displays percentage complete and available next steps.`,
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
        responseText += `\n\n**Available Quests:**\n${progress.choices.map((choice: string) => `${choice}`).join('\n')}\n\nUse \`explore_quest\` with your choice to continue!`;
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