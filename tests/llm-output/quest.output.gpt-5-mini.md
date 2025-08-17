# Quest 1: Command Deck — MCP Protocol & Tool Registry
---

You step onto the `Starpath` command deck where consoles blink like distant stars, and the crew briefs you on the mission to map how code becomes quests. The `Quest Orchestrator` points to the `MCP` console while the `Story Engine` hums in the background; together with the `Analyzer` and the `Mission Protocol` you will inspect how `server.ts` wires the `MCP` protocol and how `tools.ts` exposes the four primary instruments that explorers invoke. Your task is to chart the data flow from `stdio` transport through `ListTools` and `CallTool` handlers, and to trace how `repoAnalyzer.preGenerate()` warms the cache so repomix content is ready when callers launch adventures.

## File Exploration

### packages/mcp/src/server.ts: MCP server protocol implementation that hosts the adventure tools
The `packages/mcp/src/server.ts` file is the command deck's main control program; it boots a `RepoAdventureServer` that registers `MCP` protocol handlers and manages lifecycle events for the `repo-adventure` service. Inside the `RepoAdventureServer` constructor the `Server` is instantiated with metadata such as `name`, `version`, and `description`, and an initial capabilities map that will be populated dynamically. The critical `setupHandlers()` method registers two `MCP` handlers: one for `ListToolsRequestSchema` which enumerates `tools` and converts `Zod` schemas to `JSON` with `zodToJsonSchema`, and one for `CallToolRequestSchema` which validates incoming `request.params` against each tool's `Zod` schema before invoking its `handler`. Error handling converts validation and runtime errors into `McpError` instances with `ErrorCode` values so the `MCP` client receives structured failures. The `run()` method binds the server to a `StdioServerTransport` with `server.connect(transport)` and then warms the repomix cache by calling `repoAnalyzer.preGenerate(projectPath)` while allowing explorers to issue tool calls. The module-level `main()` wires graceful shutdown for `SIGINT` and `SIGTERM`, logs `unhandledRejection` without stopping the ship, and ensures `repoAnalyzer.cleanup()` runs on shutdown. Reading this file is like standing at mission control: you can see how communication channels, validation gates, and background caching prepare the system to serve interactive adventures.

#### Highlights
- `RepoAdventureServer.setupHandlers()` registers `ListToolsRequestSchema` and `CallToolRequestSchema` handlers and performs `Zod` validation.
- `RepoAdventureServer.run()` connects `StdioServerTransport` and calls `repoAnalyzer.preGenerate()` to warm cache.
- `main()` sets up `SIGINT` and `SIGTERM` handlers, logs `unhandledRejection`, and handles startup errors.
- Error flows map to `McpError` and `ErrorCode` for consistent MCP responses.

### packages/mcp/src/tools.ts: The 4 main MCP tools that provide the user interface to the adventure system
The `packages/mcp/src/tools.ts` file functions like the ship's instrument panel, exporting the adventure tools that `MCP` clients list and invoke. It imports `adventureManager` from `@ai-repo-adventures/core/adventure` and re-exports four tool modules: `startAdventure`, `chooseTheme`, `exploreQuest`, and `viewProgress` from their respective `./tools/*.js` paths. Each exported constant is mapped to an MCP-friendly name: `start_adventure`, `choose_theme`, `explore_quest`, and `view_progress`, and the `tools` object aggregates them for registration by `server.ts`. Reading this file reveals how the `Story Engine` and `Analyzer` are surfaced to remote explorers through a simple registry, ensuring that `start_adventure.handler` will analyze repositories and present themes, `choose_theme.handler` will generate themed stories and quests, `explore_quest.handler` will run quest exploration and progress tracking, and `view_progress.handler` will report completion stats. The file is concise yet pivotal: it binds adventure logic to `MCP` entry points so requests validated and dispatched in `server.ts` can reach the story generation and quest execution code in the `core` package.

#### Highlights
- Exports `adventureManager` for tool implementations to share state.
- Maps domain functions to MCP-friendly names: `start_adventure`, `choose_theme`, `explore_quest`, `view_progress`.
- Aggregates `tools` object used by `server.ts` for `ListTools` output.
- Clearly documents typical tool flow sequence in comments.

## Code

### src/server.ts
```typescript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { repoAnalyzer } from '@ai-repo-adventures/core/analyzer';

class RepoAdventureServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'repo-adventure',
        version: '1.0.0',
        description: 'A gamified MCP server for exploring code repositories through interactive storytelling'
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

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
}

function gracefulShutdown() {
  console.error('\nShutting down MCP server...');
  try {
    repoAnalyzer.cleanup();
  } catch (e) {
    console.error('Cleanup error:', e);
  }
  process.exit(0);
}

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

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
```
This module is the ship's bridge wiring: it registers `MCP` handlers, connects `stdio`, and kicks off background `repoAnalyzer` caching so tools are ready when called.

### src/tools.ts
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
This registry is like the command deck map, labeling each instrument so `server.ts` can list and dispatch them to crew and visiting explorers.

## Helpful Hints
- Read `packages/mcp/src/server.ts` first to see how `ListToolsRequestSchema` and `CallToolRequestSchema` are handled before exploring individual tool handlers in `./tools`.
- Consider adding structured logging around `repoAnalyzer.preGenerate(projectPath)` to measure cache warm-up timings and surface repomix issues during startup.
- Next, inspect `packages/core/src/adventure/adventure-manager.ts` and `packages/core/src/analyzer/repo-analyzer.ts` to trace how `start_adventure.handler` and `explore_quest.handler` use generated repomix content for story creation and quest execution.

---

Mission control reports a triumphant liftoff: you’ve charted the Command Deck — MCP Protocol & Tool Registry, earning a stellar log entry as your starship advances on its cosmic mission!