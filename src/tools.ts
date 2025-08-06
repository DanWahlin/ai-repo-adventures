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
import { repoAnalyzer } from './analyzer/repo-analyzer.js';
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

// Choose Theme Tool - Now uses LLM to generate story + adventures
export const choose_theme = {
  description: `Creates a complete themed adventure experience using advanced LLM prompt engineering and optional adventure.config.json guidance. This tool takes the selected theme and generates a cohesive narrative that weaves actual codebase details into an immersive story. The LLM receives the full repomix content plus structured guidance about important functions and code areas, then transforms technical concepts into theme-appropriate metaphors. Generates 2-6 dynamic adventures targeting key system areas: MCP Tool Interface, Adventure Generation Engine, Code Analysis Pipeline, Configuration & Themes, and Foundation & Utilities. Each adventure includes specific files to explore, code snippets to discover, and workshop-style learning objectives. Supports custom themes with user-defined vocabulary. The result is a personalized learning journey unique to each codebase. INVOKE after start_adventure when user selects theme: ${generateThemeExamples()}.`,
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
      const repomixContent = await repoAnalyzer.generateRepomixContext(projectPath);
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
  description: `Delivers deep, workshop-style code exploration through LLM-generated themed content with adventure.config.json guidance. This tool accepts adventure numbers (1-5) or partial titles and creates detailed educational experiences that blend actual code analysis with immersive storytelling. Uses targeted repomix content for specific files plus workshop highlights that guide users through key functions step-by-step. The LLM transforms technical function names into theme-appropriate metaphors while maintaining educational value - constructors become "initialization rituals", handlers become "communication protocols", analyzers become "scanning systems". Each exploration includes real code snippets, architectural insights, dependency explanations, and practical hints wrapped in engaging narrative. Tracks completion progress and suggests logical next steps. Perfect for learning complex codebases through structured, gamified exploration. INVOKE to dive into specific code areas: "explore 1", "adventure 2", "visit the command center", "enter the temple", "explore MCP tools", "dive into story generation".`,
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
  description: `Provides comprehensive adventure progress dashboard showing your learning journey through the codebase. Displays completion percentage, lists completed adventures with their themed titles, shows remaining exploration areas, and offers contextual encouragement based on your progress. This tool helps you understand which system components you've mastered (MCP Tools, Adventure Engine, Code Pipeline, Configuration, Foundation) and strategically plan your next learning steps. Perfect for tracking educational progress in complex codebases and ensuring comprehensive understanding. Shows both technical areas covered and themed adventure titles completed. Automatically adapts to your adventure path and provides personalized recommendations for continued exploration. No parameters needed - maintains state across all adventure sessions. INVOKE when you want to assess your journey: "view progress", "show my progress", "where am I", "what's completed", "learning status", "adventure status", "how much left to explore".`,
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