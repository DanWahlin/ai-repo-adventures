# Quest 1: Navigating the Command Deck

---

The Starship Omniflux hums with the quiet rhythm of precision as its crew steps into the command deck, hearts beating in sync with the pulsating glow of the MCP Core. The task ahead is monumental: the scattered repositories floating across the Helios System must be tamed. This is no ordinary cosmic voyage—this mission is the keystone that will organize the galaxy's chaotic streams of data. With the Repomix Navigator at their fingertips, the crew prepares to tackle the mysteries hidden within the source code. All systems are go; let the adventure begin.

## File Exploration

### packages/mcp/src/server.ts: MCP Server Protocol Implementation

The `server.ts` file is the beating heart of the Starship Omniflux’s command systems, hosting the critical MCP server protocol that brings adventure tools to life. At its helm is the `RepoAdventureServer` class, skillfully designed to handle protocol interactions such as "ListTools" and "CallTool" requests. Within its core, the `setupHandlers` function dynamically registers tools for exploration, ensuring the system is always equipped with the most up-to-date resources. The `run` method connects the server to the Repomix Navigator via the stdio transport—establishing seamless communication—and kicks off a cache warm-up sequence by analyzing the ship’s current "project galaxy."

The `main` function is the entry point, ensuring smooth takeoff and a safe mission even under duress. With graceful shutdown handlers for signals like `SIGINT` and robust error recovery for unhandled promise rejections, this file ensures that the ship’s systems remain stable and the crew’s journey uninterrupted.

#### Highlights

- Handles "ListTools" and "CallTool" request schemas for dynamic protocol integration.
- Starts the MCP server and pre-generates Repomix content for seamless cache handling.
- Implements error recovery and shutdown routines to ensure mission stability.

## Code

### packages/mcp/src/server.ts

```typescript
private setupHandlers() {
  // Dynamic tool listing
  this.server.setRequestHandler(ListToolsRequestSchema, async () => {
    const toolList = Object.entries(tools).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.schema, { 
        target: 'jsonSchema7',
        $refStrategy: 'none'
      })
    }));

    return { tools: toolList };
  });

  // Dynamic tool execution
  this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;

      if (!(name in tools)) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }

      const tool = tools[name as keyof typeof tools];
      
      // Validate arguments using the tool's Zod schema
      const validationResult = tool.schema.safeParse(args);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map((err) => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${errorMessages}`);
      }

      // Execute the tool handler with validated arguments
      return await tool.handler(validationResult.data as any);

    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
}
```

This function functions like a multipurpose console onboard the ship, dynamically validating tools and commands before executing them.

```typescript
async run() {
  const transport = new StdioServerTransport();
  await this.server.connect(transport);
  console.error('Repo Adventure MCP server running on stdio');
  
  // Pre-generate repomix content for the current working directory to warm up the cache
  // This happens in the background while waiting for user commands
  const projectPath = process.cwd();
  console.error(`Pre-generating repomix content for project at ${projectPath}...`);
  repoAnalyzer.preGenerate(projectPath);
}
```

This method is like preparing a starship’s navigation systems before liftoff, ensuring smooth operation for the journey.

```typescript
async function main() {
  try {
    const server = new RepoAdventureServer();
    
    // Handle graceful shutdown for both signals
    ['SIGINT', 'SIGTERM'].forEach(sig => 
      process.on(sig as NodeJS.Signals, gracefulShutdown)
    );
    
    // Handle unhandled promise rejections - log but don't shutdown during normal operation
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled promise rejection:', reason);
      console.error('MCP server continuing to run. Please report this error.');
      // Don't call gracefulShutdown() here as it may be a recoverable error
    });
    
    await server.run();
  } catch (error) {
    console.error('Fatal error starting MCP server:', error);
    process.exit(1);
  }
}
```

This function is the commander's seat, where every fail-safe measure is initialized for a secure voyage.

---

### packages/mcp/src/tools.ts: MCP Tools for Repo Adventure System

The `tools.ts` file functions as the utility belt of the Starship Omniflux. Diving into this file reveals the core MCP tools underpinning the adventurous questing system: `start_adventure`, `choose_theme`, `explore_quest`, and `view_progress`. Each tool is expertly crafted to facilitate its specific role in transforming repositories into dynamic exploration themes and tracking progress as quests are completed.

Notably, this file serves as a central export hub, combining individual tools and providing a consistent interface for the MCP server. The seamless integration with the `adventureManager` ensures that state, themes, and user progress are always synchronized across the journey. With its comprehensive structure, this file is a testament to how modular design enables scalability and adaptability for vast galactic missions.

#### Highlights

- Organizes core user-facing tools with dynamically loaded capabilities.
- Simplifies theme selection and quest exploration through modular design.
- Integrates tightly with `adventureManager` for shared state synchronization.

## Code

### packages/mcp/src/tools.ts

```typescript
/**
 * MCP Repo Adventure Tools - Main Entry Point
 * 
 * These tools provide an interactive, gamified way to explore and understand codebases.
 * The typical flow is:
 * 1. start_adventure - Analyzes the codebase and presents theme options
 * 2. choose_theme - Generates a custom story and quests based on the selected theme
 * 3. explore_quest - Explores individual quests (can be called multiple times)
 * 4. view_progress - Check completion status and see remaining quests
 * 
 * Each tool has detailed descriptions to help MCP clients understand when to use them
 * rather than relying on their base LLM for responses.
 * 
 * Tools are now organized in separate files for better maintainability.
 */

import { adventureManager } from '@ai-repo-adventures/core/adventure';
import { startAdventure } from './tools/start-adventure.js';
import { chooseTheme } from './tools/choose-theme.js';
import { exploreQuest } from './tools/explore-quest.js';
import { viewProgress } from './tools/view-progress.js';

// Export the shared adventure manager for tools that need it
export { adventureManager };

// Re-export tools with MCP naming convention
export const start_adventure = startAdventure;
export const choose_theme = chooseTheme;
export const explore_quest = exploreQuest;
export const view_progress = viewProgress;


// Export all tools for easy registration
export const tools = {
  start_adventure,
  choose_theme,
  explore_quest,
  view_progress
};
```

This file assembles each tool like an engineer assembling a toolbox for interstellar repairs, ensuring each tool is labeled and ready for deployment.

---

## Helpful Hints

- Understanding `server.ts` provides insight into how tools integrate seamlessly with the MCP protocol.
- Explore modular design patterns in `tools.ts` to see how reusability is achieved across the adventure system.
- To deepen your understanding, follow the `adventureManager` to observe how quests are synchronized across tools.

---

Mission accomplished, Commander—your mastery of the Command Deck has fueled the starship’s systems and set you on a stellar trajectory toward the cosmos! 🚀⭐⚡