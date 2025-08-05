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
import { repomixAnalyzer } from './analyzer/repomix-analyzer.js';
import type { ProjectInfo } from './shared/types.js';
import { AdventureManager } from './adventure/adventure-manager.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { formatErrorForUser } from './shared/errors.js';
import { parseTheme, getFormattedThemeOptions, getAllThemes } from './shared/theme.js';
import { validateProjectPath, validateTheme, validateAdventureChoice } from './shared/input-validator.js';

// Create a single shared adventure manager instance
const adventureManager = new AdventureManager();

// Helper functions to reduce handler complexity

/**
 * Create minimal ProjectInfo with repomix content
 */
function createProjectInfo(repomixContent: string): ProjectInfo {
  return {
    type: 'Software Project', // LLM will infer the real type during story generation
    fileCount: (repomixContent.match(/## File:/g) || []).length,
    mainTechnologies: [], // LLM will detect these during story generation
    hasTests: repomixContent.toLowerCase().includes('test'),
    hasDatabase: false, // LLM will detect during story generation
    hasApi: false, // LLM will detect during story generation
    hasFrontend: false, // LLM will detect during story generation
    codeAnalysis: {
      functions: [], // LLM will extract during story generation
      classes: [], // LLM will extract during story generation
      dependencies: [], // LLM will extract during story generation
      entryPoints: [] // LLM will detect during story generation
    },
    repomixContent, // This is the gold - rich context for story generation
    llmContextSummary: 'Raw repomix content available for LLM analysis during story generation.'
  };
}

/**
 * Format the initial adventure response
 */
function formatInitialResponse(projectInfo: ProjectInfo): string {
  return `🌟 **Welcome to Repo Adventures!** 🌟

You've discovered a mysterious codebase containing ${projectInfo.fileCount} files of digital wisdom! This project awaits your exploration through immersive storytelling.

📊 **Initial Scan Results:**
• ${projectInfo.fileCount} files discovered
• ${projectInfo.hasTests ? 'Testing framework detected' : 'No test files found'}
• Rich codebase context prepared for adventure generation
• Ready for LLM-powered analysis and story generation

Your mission: Transform into a digital explorer and uncover the secrets of this codebase through an immersive, LLM-generated adventure! Every story, character, and code insight is dynamically created based on your actual project structure.

**Choose Your Story Theme:**

${getFormattedThemeOptions()}

Use the \`choose_theme\` tool with your preferred theme (name or number) to begin your adventure!`;
}

// Helper function to generate dynamic theme examples for tool descriptions
function generateThemeExamples(): string {
  const themes = getAllThemes();
  const examples = themes.map(theme => 
    `"${theme.id}", "${theme.key} theme", "choose ${theme.key}", "select ${theme.key}", "I want ${theme.key}"`
  ).join(', ');
  return examples;
}

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
  theme: z.string().describe(`The story theme - use theme names or numbers: ${getAllThemes().map(t => `"${t.key}"`).join('/')} or ${getAllThemes().map(t => t.id).join('/')}`),
  customTheme: z.object({
    name: z.string().describe('Custom theme name (e.g., "Cyberpunk", "Pirate Adventure")'),
    description: z.string().describe('Custom theme description explaining the style and setting'),
    keywords: z.array(z.string()).describe('Array of keywords that define the theme vocabulary (e.g., ["cyber", "neon", "matrix", "digital"])')
  }).optional().describe('Custom theme data - required only when theme is "custom"')
});

const explorePathSchema = z.object({
  choice: z.string().describe('The adventure choice - can be adventure number (1, 2, 3) or adventure title')
});

const progressSchema = z.object({});

// Start Adventure Tool
export const start_adventure = {
  description: `Analyzes a code repository and begins an interactive, gamified exploration experience. This tool performs deep project analysis including file counting, technology detection, dependency mapping, and code structure analysis. It identifies functions, classes, entry points, and architectural patterns. After analysis, it presents five immersive theme options (space, mythical, ancient, developer, custom) for the user to choose from. Each theme will transform the codebase exploration into a narrative adventure where code elements become story elements. Use this tool when users want to explore, understand, or learn about a codebase in an engaging way. Perfect for onboarding, code reviews, or educational purposes. INVOKE THIS TOOL when users say things like: "start adventure", "begin adventure", "explore this codebase", "help me understand this project", "analyze this repository", "gamify this code", "make this code fun", "adventure story", "code adventure", "explore repository", "understand codebase", "learn about this project", "onboard me", "show me around", "tour this code", "discover this project".`,
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
      const repomixContent = await repomixAnalyzer.generateRepomixContext(projectPath);
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

// Choose Theme Tool - Now uses LLM to generate story + adventures
export const choose_theme = {
  description: `Generates a personalized, LLM-powered narrative adventure based on the analyzed codebase and selected theme. This tool transforms technical project structure into an immersive story where code elements become thematic story elements. Available themes: space exploration, mythical kingdoms, ancient civilizations, developer documentation, or custom user-defined themes. The LLM creates 3-6 contextual adventures based on project complexity, each mapping to different code areas like architecture, configuration, core logic, data layer, or testing. Adventures follow a "Chapter Title: Technical Description" format. The generated content is unique to each project, incorporating actual file names, technologies, and code patterns into the narrative. For custom themes, provide theme name, description, and keywords. Use after start_adventure when user selects their preferred theme. INVOKE THIS TOOL when users say: ${generateThemeExamples()}.`,
  schema: chooseThemeSchema,
  handler: async (args: ChooseThemeArgs) => {
    try {
      // Validate theme input
      let validatedTheme: string;
      try {
        validatedTheme = validateTheme(args.theme);
      } catch (error) {
        throw new McpError(ErrorCode.InvalidParams, error instanceof Error ? error.message : 'Invalid theme');
      }
      
      // Parse the theme input (handles numbers, full names, partial matches)
      const selectedTheme = parseTheme(validatedTheme);
      
      if (!selectedTheme) {
        const allThemes = getAllThemes();
        const validOptions = [...allThemes.map(t => `'${t.key}'`), ...allThemes.map(t => t.id.toString())];
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid theme: ${args.theme}. Please choose ${validOptions.join(', ')}.`
        );
      }

      // Handle custom theme validation
      if (selectedTheme === 'custom') {
        if (!args.customTheme) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Custom theme data is required when selecting custom theme. Please provide customTheme with name, description, and keywords.'
          );
        }
        
        // Validate custom theme data
        if (!args.customTheme.name?.trim()) {
          throw new McpError(ErrorCode.InvalidParams, 'Custom theme name is required');
        }
        if (!args.customTheme.description?.trim()) {
          throw new McpError(ErrorCode.InvalidParams, 'Custom theme description is required');
        }
        if (!args.customTheme.keywords || args.customTheme.keywords.length === 0) {
          throw new McpError(ErrorCode.InvalidParams, 'Custom theme keywords array is required');
        }
      }
      
      // Generate repomix content and create minimal ProjectInfo
      const projectPath = process.cwd();
      const repomixContent = await repomixAnalyzer.generateRepomixContext(projectPath);
      const projectInfo = createProjectInfo(repomixContent);
      
      // Initialize adventure with LLM-generated content
      const storyWithAdventures = await adventureManager.initializeAdventure(
        projectInfo, 
        selectedTheme, 
        projectPath,
        args.customTheme
      );
      
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