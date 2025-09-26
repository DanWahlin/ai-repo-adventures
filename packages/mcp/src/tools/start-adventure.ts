/**
 * Start Adventure Tool
 * 
 * Transforms any codebase into an interactive adventure using repomix analysis 
 * and LLM-powered storytelling.
 */

import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { repoAnalyzer } from '@codewithdan/ai-repo-adventures-core/analyzer';
import { formatErrorForUser, validateProjectPath, extractUniqueFilePaths } from '@codewithdan/ai-repo-adventures-core/shared';
import { createProjectInfo } from '@codewithdan/ai-repo-adventures-core';
import { formatInitialResponse } from './shared.js';

// Schema
const startAdventureSchema = z.object({
  projectPath: z.string().optional().describe('Path to the project directory (defaults to current directory)')
});

// Types
type StartAdventureArgs = z.infer<typeof startAdventureSchema>;

// Tool Definition
export const startAdventure = {
  description: `Analyze codebase and present 5 themed adventure options (🚀 Space, 🏰 Medieval, 🏛️ Ancient, 📚 Developer, ✨ Custom) for gamified code exploration.`,
  schema: startAdventureSchema,
  handler: async (args: StartAdventureArgs) => {
    // Validate project path input
    let projectPath: string;
    try {
      projectPath = validateProjectPath(args.projectPath);
    } catch (error) {
      throw new McpError(ErrorCode.InvalidParams, error instanceof Error ? error.message : 'Invalid project path');
    }
    
    try {
      // Check if we're using targeted analysis
      const configuredFiles = extractUniqueFilePaths(projectPath);
      const isUsingConfig = configuredFiles.length > 0;
      
      // Generate repomix content and create minimal ProjectInfo
      const repomixContent = await repoAnalyzer.generateRepomixContext(projectPath);
      const projectInfo = createProjectInfo(repomixContent);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: formatInitialResponse(projectInfo, isUsingConfig)
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