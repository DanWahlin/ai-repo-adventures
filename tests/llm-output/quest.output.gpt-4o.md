# Quest 1: Navigating the MCP Tool Interface
---
The year is 2247, and aboard the Starship Refactoria, the crew receives a transmission from the Repository Nebula’s central core—a mysterious energy anomaly has interfered with navigation protocols. To restore proper function and chart the code galaxy ahead, the crew must decode and operate the MCP Tool Interface. By exploring and activating key protocols, they will secure new pathways into the nebula's fragmented data constellations. The interface holds vital tools to turn chaos into order, but it requires precise calibration and deft command to unlock its potential.

## File Exploration
### packages/mcp/src/server.ts: Server Initialization and Handler Setup
This file sets the operational backbone of the MCP Tool Interface. It highlights the construction of the `RepoAdventureServer`, a critical server instance, alongside the setup of input-output communication protocols. Notable is the `RepoAdventureServer.setupHandlers` method, which dynamically configures key functions like tool listing and execution. Additionally, the `RepoAdventureServer.run` method activates the interface, connecting the server and preparing it for user interaction. Finally, the top-level `main` function ensures the system gracefully handles unexpected terminations and initializes the server under defined conditions. These components form the stellar foundation for MCP operations in the ship.

#### Highlights
- `RepoAdventureServer.setupHandlers`: Configures tool listing and dynamic execution.
- `RepoAdventureServer.run`: Activates the transport setup and preloads content.
- `main`: Initializes the server and implements shutdown protocols.

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

      const validationResult = tools[name as keyof typeof tools].schema.safeParse(args);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map((err) => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${errorMessages}`);
      }

      return await tools[name].handler(validationResult.data as any);

    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error}`);
    }
  });
}
```
Analogous to calibrating navigation systems, this dynamically sets up protocols for interaction with MCP tools.

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
This resembles activating core systems and performing a diagnostic pre-launch check.

```typescript
async function main() {
  const server = new RepoAdventureServer();
  ['SIGINT', 'SIGTERM'].forEach(sig => 
    process.on(sig as NodeJS.Signals, gracefulShutdown)
  );
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
  });

  await server.run();
}
```
Much like a launch sequence, this ensures proper initialization and recovery during anomalies.

### packages/mcp/src/tools.ts: Tools and Handlers Registration
This file registers the MCP’s primary tools, enabling advanced operations for navigating quests. Each function focuses on a distinct interaction, like starting an adventure (`start_adventure.handler`), selecting themes (`choose_theme.handler`), or exploring quests (`explore_quest.handler`). This organizational structure keeps operations modular and accessible within the MCP Tool Interface framework.

#### Highlights
- `start_adventure.handler`: Analyzes the codebase and begins adventure initialization.
- `choose_theme.handler`: Generates a custom narrative based on selected themes.
- `explore_quest.handler`: Enables comprehensive exploration of individual quests.
- `view_progress.handler`: Monitors progress and identifies unexplored quests.

## Code
### packages/mcp/src/tools.ts
```typescript
export const start_adventure = startAdventure;
```
Akin to launching exploratory probes, this initializes an adventure into the unknown.

```typescript
export const choose_theme = chooseTheme;
```
Like selecting a flight path, this determines the narrative theme for quests.

```typescript
export const explore_quest = exploreQuest;
```
Comparable to plotting precise coordinates, this allows for in-depth exploration of specific targets.

```typescript
export const view_progress = viewProgress;
```
Similar to mission control updates, this provides status reports.

## Helpful Hints
- Use `start_adventure` as the first tool to initialize mapping tasks before diving into themes.
- Familiarize yourself with `setupHandlers` in the server file to understand dynamic request handling.
- Once quests are unlocked, move between exploration and progress tools for efficient task management.

---
**Success!** You’ve mastered the MCP Tool Interface, gaining access to tools necessary for navigating the Repository Nebula. Chart your course wisely, captain!

🌟 Stellar navigation, cadet! You've masterfully charted your way through the MCP Tool Interface, proving you're ready to pilot the learning starship toward 100% cosmic success! 🚀💎⚡