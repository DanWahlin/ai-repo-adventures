# Quest 1: MCP Beacon — The Protocol Interface
---
You stand on the bridge of the `Starfield`, eyes on the holo-display that maps how the `MCP` server registers and runs the adventure tools that keep the crew exploring repositories across the galaxy. The beacon pulse from the `repoAnalyzer` warms the aft core as `RepoAdventureServer` spins up `stdio` communications and pre-generates `repomix` context for the current `projectPath`. Your task is to chart `server.ts` and `tools.ts`, trace the command loop from `ListToolsRequestSchema` to `CallToolRequestSchema`, and log the safe-path validations and `Zod` schema checks that keep the voyage secure. Ready the navigation console and follow the protocol signals to map the interface that will guide future explorers.

## File Exploration

### packages/mcp/src/server.ts: MCP server protocol implementation that hosts the adventure tools
`packages/mcp/src/server.ts` implements the `RepoAdventureServer` that stands sentry as the `MCP` protocol endpoint for the repo-adventure system. The file imports `Server` and `StdioServerTransport` from the `@modelcontextprotocol/sdk` to create a `server` that advertises name, version, and description; it wires two critical request handlers via `server.setRequestHandler()` for `ListToolsRequestSchema` and `CallToolRequestSchema`. The `ListTools` handler dynamically enumerates the `tools` object exported from `packages/mcp/src/tools.ts`, converting each tool's `Zod` `schema` to `JSON` via `zodToJsonSchema` so MCP clients can introspect available commands. The `CallTool` handler performs runtime validation by calling `tool.schema.safeParse(request.params.arguments)` and either executes `tool.handler()` with the validated `data` or raises an `McpError` using the `ErrorCode` enum. The `run()` method connects the server to `stdio` using `StdioServerTransport`, logs startup to `stderr`, and warms the cache by calling `repoAnalyzer.preGenerate(projectPath)`. The file also defines `gracefulShutdown()` which invokes `repoAnalyzer.cleanup()`, and `main()` which constructs the server, binds signal handlers for `SIGINT` and `SIGTERM`, monitors `unhandledRejection`, and starts the server. This file is the mission control that ensures tools are discoverable, safely invoked, and that repomix analysis is pre-warmed for swift exploration.

#### Highlights
- `RepoAdventureServer.setupHandlers` registers `ListToolsRequestSchema` and `CallToolRequestSchema` handlers.
- `RepoAdventureServer.run` connects `StdioServerTransport`, logs startup, and calls `repoAnalyzer.preGenerate(projectPath)`.
- `main` sets up graceful shutdown for `SIGINT` and `SIGTERM`, and logs `unhandledRejection` without halting.
- Error handling converts validation failures into `McpError` using `ErrorCode`.
- Uses `zodToJsonSchema` to expose `Zod` schemas as `JSON` schemas for clients.

### packages/mcp/src/tools.ts: The 4 main MCP tools that provide the user interface to the adventure system
`packages/mcp/src/tools.ts` is the tool registry and the public entrypoint that binds the interactive tools used by MCP clients. It re-exports the shared `adventureManager` from `@ai-repo-adventures/core/adventure` and imports the concrete handlers from the local `tools` folder: `start-adventure.js`, `choose-theme.js`, `explore-quest.js`, and `view-progress.js`. The file documents the intended user flow: `start_adventure` analyzes the codebase and offers theme choices; `choose_theme` instructs the `StoryGenerator` to craft theme-driven narratives and quests; `explore_quest` runs a quest execution cycle while tracking progress; and `view_progress` reports completion metrics. It then maps these handlers to MCP-friendly export names and aggregates them in the `tools` object so that the `server.ts` `ListTools` handler can enumerate them. This file is the manifest that lets the `MCP` beacon advertise its available missions to passing clients, and the single source of truth for the tool names that the command loop will accept.

#### Highlights
- Exports `adventureManager` for shared state across tools.
- Re-exports `start_adventure`, `choose_theme`, `explore_quest`, and `view_progress`.
- Constructs the `tools` object used by `server.ts` to list and call tools.
- Documents the typical flow of starting an adventure through exploring quests.
- Keeps MCP naming convention in `start_adventure`, `choose_theme`, `explore_quest`, `view_progress`.

## Code

### packages/mcp/src/server.ts
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
This file is the mission control console that registers handlers, validates inputs, and warms the repomix cache so explorers can launch quests without delay.

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
This file is the ship's mission manifest that maps human-friendly commands to the adventure handlers so the `MCP` beacon can list and invoke missions.

## Helpful Hints
- Keep an eye on `repoAnalyzer.preGenerate(projectPath)` in `packages/mcp/src/server.ts` to ensure warm caches during cold starts, and consider instrumenting logs for large projects.
- Consider adding stricter schema descriptions in each tool module so `zodToJsonSchema(tool.schema)` produces richer `inputSchema` for clients; this improves discoverability in the `ListToolsRequestSchema` response.
- Next steps: trace `adventureManager` through `@ai-repo-adventures/core/adventure` to inspect how `start_adventure`, `choose_theme`, `explore_quest`, and `view_progress` manipulate state and generate `repomix` targets for quests.

---

Mission accomplished: your starship just completed Quest 1 — the MCP Beacon Protocol Interface, proving your crew can dock with the protocol core and chart a triumphant course through cosmic systems!