# Quest 1: Cosmic Tools Interface
---
In the boundless reaches of the cosmic code nebula, the Repo Voyager's crew faces their next stellar challenge: interfacing with the MCP tools repository to unlock the secrets of code exploration. Guided by the ever-resourceful AI, LLM-NOVA, the mission involves decoding the interface protocols of the MCP Server and the dynamic tools module. The goal? To forge a seamless command interface for navigating the galaxy of quests. Each tool is a star in the constellation of possibilities. Onward, brave adventurers!

## File Exploration

### packages/mcp/src/server.ts: MCP server protocol implementation
The `packages/mcp/src/server.ts` file is the backbone of the MCP server interface. It hosts functions that manage dynamic tool interactions, from listing tools to executing commands. The `RepoAdventureServer` class sets the stage, defining how requests are handled through functions like `setupHandlers` and how the server establishes its runtime environment through `run`. The `main` function ensures smooth operation and robust recovery mechanisms under unpredictable galactic conditions.

#### Highlights
- **`RepoAdventureServer.setupHandlers`**: Responsible for registering handlers for listing and calling tools via MCP.
- **`RepoAdventureServer.run`**: Connects to the stdio server transport and pre-generates `repomix` content.
- **`main`**: The server's entry point, implementing graceful shutdown and error handling mechanisms.

## Code

### packages/mcp/src/server.ts
```typescript
private setupHandlers() {
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

  this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;

      if (!(name in tools)) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }

      const tool = tools[name as keyof typeof tools];
      const validationResult = tool.schema.safeParse(args);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map((err) => 
          `${err.path.join('.')}: ${err.message}`).join(', ');
        throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${errorMessages}`);
      }

      return await tool.handler(validationResult.data as any);
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
}
```
The `setupHandlers` function is like programming the navigation system of a starship: it defines how the MCP server responds to incoming "coordinates" (tool requests) and validates their parameters for the correct "flight path."

```typescript
async run() {
  const transport = new StdioServerTransport();
  await this.server.connect(transport);
  console.error('Repo Adventure MCP server running on stdio');
  const projectPath = process.cwd();
  console.error(`Pre-generating repomix content for project at ${projectPath}...`);
  repoAnalyzer.preGenerate(projectPath);
}
```
The `run` function acts as the ship's power-up sequence, connecting the stdio transport for communication and initiating background prep work for future explorations.

```typescript
async function main() {
  try {
    const server = new RepoAdventureServer();
    
    ['SIGINT', 'SIGTERM'].forEach(sig => 
      process.on(sig as NodeJS.Signals, gracefulShutdown)
    );
    
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled promise rejection:', reason);
    });

    await server.run();
  } catch (error) {
    console.error('Fatal error starting MCP server:', error);
    process.exit(1);
  }
}
```
The `main` function is the mission control center, coordinating all operations from the launch sequence to shutdown and error recovery.

---

### packages/mcp/src/tools.ts: The 4 main MCP tools interface
The `packages/mcp/src/tools.ts` file orchestrates the core tools that allow interaction with the MCP. These tools provide functionality for starting an adventure, choosing a theme, exploring quests, and viewing progress. Each tool is defined modularly and structured for easy extension. This is where the user’s interface comes alive, turning input into an experiential journey.

#### Highlights
- **`start_adventure.handler`**: Analyzes repositories and presents users with available theme options.
- **`choose_theme.handler`**: Enables users to generate personalized storylines and quests.
- **`explore_quest.handler`**: Executes quest exploration with progress logging.
- **`view_progress.handler`**: Monitors progress and displays remaining tasks.

## Code

### packages/mcp/src/tools.ts
```typescript
import { startAdventure } from './tools/start-adventure.js';

const tools = {
  start_adventure: startAdventure
};
```
The `start_adventure.handler` operates like a stellar scanner, initiating the analysis of repository "terrain" and mapping out themes to guide further exploration.

```typescript
import { chooseTheme } from './tools/choose-theme.js';

const tools = {
  choose_theme: chooseTheme
};
```
The `choose_theme.handler` is akin to configuring the crew's preferences before voyage, setting the tone, and plotting the adventure narrative.

```typescript
import { viewProgress } from './tools/view-progress.js';

const tools = {
  view_progress: viewProgress
};
```
The `view_progress.handler` acts as the mission's dashboard, allowing the Voyager's crew to track their progress and plan strategical next steps.

---

## Helpful Hints
- Always invoke `setupHandlers` before running the server to ensure tool compatibility with user requests.
- Ensure the tools module is up-to-date by following the dependency structure in `tools.ts` for any additions or changes.
- Use the `view_progress` tool to monitor your overarching quest completion progress.

---
The universe of coding adventures is vast and exciting! Ensure all protocols are functioning and tools ready for deployment before setting off into the cosmos. End mission sequence for "Cosmic Tools Interface."

Mission accomplished, Star Navigator—your mastery of the Cosmic Tools Interface lights up the universe like a newborn star, propelling you toward the next galactic frontier! 🚀⭐⚡