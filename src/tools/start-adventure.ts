/**
 * Start Adventure Tool
 * 
 * Transforms any codebase into an interactive adventure using repomix analysis 
 * and LLM-powered storytelling.
 */

import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { repoAnalyzer } from '../analyzer/repo-analyzer.js';
import { formatErrorForUser } from '../shared/errors.js';
import { validateProjectPath } from '../shared/input-validator.js';
import { createProjectInfo, formatInitialResponse } from './shared.js';

// Schema
const startAdventureSchema = z.object({
  projectPath: z.string().optional().describe('Path to the project directory (defaults to current directory)')
});

// Types
type StartAdventureArgs = z.infer<typeof startAdventureSchema>;

// Tool Definition
export const startAdventure = {
  description: `Transforms any codebase into an interactive adventure using repomix analysis and LLM-powered storytelling. This tool analyzes the entire project structure, counting files, detecting technologies, and preparing comprehensive context for adventure generation. It uses repomix to capture complete codebase content, then presents 5 immersive theme options (🚀 Space, 🏰 Medieval, 🏛️ Ancient, 📚 Developer, ✨ Custom). Each theme transforms technical concepts into narrative elements - classes become starships or castles, functions become spells or protocols, APIs become communication channels. The system optionally loads adventure.config.json to guide story generation toward important code areas. Perfect for code onboarding, educational exploration, team building, or making code reviews engaging. INVOKE when users want to gamify codebase exploration: "start adventure", "explore this codebase", "help me understand this project", "make coding fun", "onboard me", "show me around this code", "turn this into a story".`,
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
      // Generate repomix content and create minimal ProjectInfo
      const repomixContent = await repoAnalyzer.generateRepomixContext(projectPath);
      const projectInfo = createProjectInfo(repomixContent);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: formatInitialResponse(projectInfo)
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