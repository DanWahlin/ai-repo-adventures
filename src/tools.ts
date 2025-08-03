/**
 * MCP Repo Adventure Tools
 * 
 * These tools provide an interactive, gamified way to explore and understand codebases.
 * The typical flow is:
 * 1. start_adventure - Analyzes the codebase and presents theme options
 * 2. choose_theme - Generates a custom story and adventures based on the selected theme
 * 3. explore_path - Explores individual adventures (can be called multiple times)
 * 4. view_progress - Check completion status and see remaining adventures
 * 
 * Each tool has detailed descriptions to help MCP clients understand when to use them
 * rather than relying on their base LLM for responses.
 */

import { z } from 'zod';
import { optimizedAnalyzer } from './shared/instances.js';
import { AdventureManager } from './adventure/adventure-manager.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { formatErrorForUser } from './shared/errors.js';
import { parseTheme, getFormattedThemeOptions } from './shared/theme.js';
import { InputValidator } from './shared/input-validator.js';

// Create a single shared adventure manager instance
const adventureManager = new AdventureManager();

// Schema types
type StartAdventureArgs = z.infer<typeof startAdventureSchema>;
type ChooseThemeArgs = z.infer<typeof chooseThemeSchema>;
type ExplorePathArgs = z.infer<typeof explorePathSchema>;
type ProgressArgs = z.infer<typeof progressSchema>;

// Schemas
const startAdventureSchema = z.object({
  projectPath: z.string().optional().describe('Path to the project directory (defaults to current directory)')
});

const chooseThemeSchema = z.object({
  theme: z.string().describe('The story theme - use "space"/"mythical"/"ancient" or numbers 1/2/3')
});

const explorePathSchema = z.object({
  choice: z.string().describe('The adventure choice - can be adventure number (1, 2, 3) or adventure title')
});

const progressSchema = z.object({});

// Start Adventure Tool
export const start_adventure = {
  description: `Analyzes a code repository and begins an interactive, gamified exploration experience. This tool performs deep project analysis including file counting, technology detection, dependency mapping, and code structure analysis. It identifies functions, classes, entry points, and architectural patterns. After analysis, it presents three immersive theme options (space, mythical, ancient) for the user to choose from. Each theme will transform the codebase exploration into a narrative adventure where code elements become story elements. Use this tool when users want to explore, understand, or learn about a codebase in an engaging way. Perfect for onboarding, code reviews, or educational purposes. INVOKE THIS TOOL when users say things like: "start adventure", "begin adventure", "explore this codebase", "help me understand this project", "analyze this repository", "gamify this code", "make this code fun", "adventure story", "code adventure", "explore repository", "understand codebase", "learn about this project", "onboard me", "show me around", "tour this code", "discover this project".`,
  schema: startAdventureSchema,
  handler: async (args: StartAdventureArgs) => {
    // Validate project path input
    const pathValidation = InputValidator.validateProjectPath(args.projectPath);
    if (!pathValidation.isValid) {
      throw new McpError(ErrorCode.InvalidParams, pathValidation.error || 'Invalid project path');
    }
    const projectPath = pathValidation.sanitized;
    
    try {
      // Analyze the project
      const projectInfo = await optimizedAnalyzer.analyzeProject(projectPath);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `🌟 **Welcome to Repo Adventures!** 🌟

You've discovered a mysterious codebase containing ${projectInfo.fileCount} files of digital wisdom! This ${projectInfo.type} project harnesses the power of ${projectInfo.mainTechnologies.slice(0, 3).join(', ')}${projectInfo.mainTechnologies.length > 3 ? ` and ${projectInfo.mainTechnologies.length - 3} other technologies` : ''}.

📊 **Initial Scan Results:**
• ${projectInfo.codeAnalysis.functions.length} functions discovered
• ${projectInfo.codeAnalysis.classes.length} classes detected
• ${projectInfo.codeAnalysis.dependencies.length} dependencies connected
• Entry point: ${projectInfo.codeAnalysis.entryPoints[0] || 'Unknown'}

Your mission: Transform into a digital explorer and uncover the secrets of this codebase through an immersive, LLM-generated adventure! Every story, character, and code insight is dynamically created based on your actual project structure.

**Choose Your Story Theme:**

${getFormattedThemeOptions()}

Use the \`choose_theme\` tool with your preferred theme (name or number) to begin your adventure!`
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

// Choose Theme Tool - Now uses LLM to generate story + adventures
export const choose_theme = {
  description: `Generates a personalized, LLM-powered narrative adventure based on the analyzed codebase and selected theme. This tool transforms technical project structure into an immersive story where: databases become dragon hoards (mythical) or data crystals (space), APIs transform into trade routes (ancient) or communication channels (space), functions become spells (mythical) or ship systems (space). The LLM creates 3-6 contextual adventures based on project complexity, each mapping to different code areas like architecture, configuration, core logic, data layer, or testing. Adventures follow a "Chapter Title: Technical Description" format. The generated content is unique to each project, incorporating actual file names, technologies, and code patterns into the narrative. Use after start_adventure when user selects their preferred theme. INVOKE THIS TOOL when users say: "1", "2", "3" (for numbered themes), "space theme", "mythical theme", "ancient theme", "choose space", "select mythical", "pick ancient", "I want space", "let's do mythical", "give me ancient", "space adventure", "castle adventure", "temple adventure", "sci-fi theme", "fantasy theme", "historical theme", "space exploration", "enchanted kingdom", "ancient civilization", "choose 1", "select 2", "pick 3".`,
  schema: chooseThemeSchema,
  handler: async (args: ChooseThemeArgs) => {
    try {
      // Validate theme input with whitelist-based security
      const themeValidation = InputValidator.validateTheme(args.theme);
      if (!themeValidation.isValid) {
        throw new McpError(ErrorCode.InvalidParams, themeValidation.error || 'Invalid theme');
      }
      
      // Parse the theme input (handles numbers, full names, partial matches)
      const selectedTheme = parseTheme(themeValidation.sanitized);
      
      if (!selectedTheme) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid theme: ${args.theme}. Please choose 'space', 'mythical', 'ancient', or use numbers 1-3.`
        );
      }
      
      // Get the current project info
      const projectPath = process.cwd();
      const projectInfo = await optimizedAnalyzer.analyzeProject(projectPath);
      
      // Initialize adventure with LLM-generated content
      const storyWithAdventures = await adventureManager.initializeAdventure(projectInfo, selectedTheme);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: storyWithAdventures
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

// Explore Path Tool - Now handles both numbered choices and adventure titles
export const explore_path = {
  description: `Executes a chosen adventure to explore specific parts of the codebase through LLM-generated narrative content. This tool accepts either adventure numbers (1, 2, 3, etc.) or partial/full adventure titles (e.g., "Core Logic" or "Castle Design: Exploring the Kingdom Layout"). It generates detailed, contextualized content that weaves actual code insights, file references, and technical concepts into the themed story. Each exploration reveals code snippets, architectural patterns, dependencies, and best practices wrapped in narrative form. The tool maintains adventure state, tracks progress (showing completion percentage), and suggests next adventures. Includes built-in input sanitization to prevent prompt injection while allowing legitimate adventure selection. Use this repeatedly to explore different code areas until all adventures are completed. INVOKE THIS TOOL when users say: "explore 1", "choose 1", "select 1", "go to 1", "adventure 1", "explore core logic", "visit architecture", "explore the castle", "enter the temple", "board the starship", "next adventure", "continue adventure", "explore path", "take path", "follow path", "enter adventure", "start chapter", numbers like "1", "2", "3", or adventure names.`,
  schema: explorePathSchema,
  handler: async (args: ExplorePathArgs) => {
    try {
      // Validate choice input with whitelist-based security
      // Note: The AdventureManager will do additional validation
      const choiceValidation = InputValidator.validateAdventureChoice(args.choice);
      if (!choiceValidation.isValid) {
        throw new McpError(ErrorCode.InvalidParams, choiceValidation.error || 'Invalid adventure choice');
      }
      
      // AdventureManager now handles numbered choices, titles, and IDs automatically
      const result = await adventureManager.exploreAdventure(choiceValidation.sanitized);
      
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

// Progress Tool - Show current adventure progress
export const view_progress = {
  description: `Displays comprehensive progress tracking for the code exploration adventure. Shows overall completion percentage, lists all completed adventures with their titles, displays remaining available adventures, and provides contextual encouragement. This tool helps users understand their learning journey through the codebase, see which code areas they've already explored (marked as completed chapters), and decide which parts to explore next. Essential for tracking progress in larger codebases with multiple adventures. No parameters required - automatically tracks state from previous tool calls. Use when users want to check their progress, see what's left to explore, or need guidance on next steps. INVOKE THIS TOOL when users say: "view progress", "show progress", "check progress", "my progress", "progress report", "status", "where am I", "what's left", "remaining adventures", "completed adventures", "how far along", "completion status", "adventure status", "chapters completed", "track progress", "progress check", "how much left", "what have I done", "list adventures", "show adventures".`,
  schema: progressSchema,
  handler: async (_args: ProgressArgs) => {
    try {
      const progress = adventureManager.getProgress();
      
      let responseText = progress.narrative;
      
      // Add available choices
      if (progress.choices && progress.choices.length > 0) {
        responseText += `\n\n**Available Adventures:**\n${progress.choices.map((choice: string, i: number) => `${i + 1}. ${choice}`).join('\n')}\n\nUse \`explore_path\` with your choice to continue!`;
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

// Export all tools for easy registration
export const tools = {
  start_adventure,
  choose_theme,
  explore_path,
  view_progress
};