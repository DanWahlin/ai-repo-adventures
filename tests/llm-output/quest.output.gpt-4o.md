# Quest 1: MCP Tool Interface
---
As the Stellar Exploration Vessel *Codex Eternum* sails through the coding galaxy, it encounters a cosmic anomaly—a nebula packed with unknown data entities clinging to uncharted stars. Your mission revolves around unlocking the interface to your advanced MCP tools and navigating through the maze of stellar protocols. These tools are vital for aligning the starship's trajectory, decoding galactic messages, and uncovering the secrets hidden in the vast expanse. The fate of the crew depends on your ability to master the celestial mechanics of the MCP Tool Interface.

## File Exploration
### packages/mcp/src/server.ts: Server Initialization and MCP Handler Logic
This file is the central hub of the MCP tool server, which enables interactive exploration of code repositories via its storytelling-based gamified activities. Starting with the initialization of a cosmic MCP server, key operations include setting up dynamic handlers to list and execute tools. The server also manages background processes like pre-generating contextual data for smoother operations. Central functions include `setupHandlers` for tool interaction, `run` for initializing the server transport, and `main` for lifecycle management and error handling. These functions synchronize the ship's cosmic workflow and maintain its operational harmony.

#### Highlights
- `RepoAdventureServer.setupHandlers`: Configures dynamic tool listing and validation.
- `RepoAdventureServer.run`: Initializes server transport and pre-generates analysis data.
- `main`: Coordinates server lifecycle and error handling.

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
    const { name, arguments: args } = request.params;
    if (!(name in tools)) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    const tool = tools[name as keyof typeof tools];
    const validationResult = tool.schema.safeParse(args);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((err) => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${errorMessages}`);
    }
    return await tool.handler(validationResult.data as any);
  });
}
```
Think of this as the universal translator that converts cosmic energy into usable command structures for each tool.

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
This function is the warp drive powering the server, ensuring a seamless connection to the crew's requests and caching critical data for quick retrieval.

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
This is your command bridge, managing signals, errors, and ensuring the MCP server sails smoothly through the coding galaxy.

### packages/mcp/src/tools.ts: Tool Integration and Management
This file serves as the repository's MCP tool registry, consolidating necessary tools such as `start_adventure`, `choose_theme`, `explore_quest`, and `view_progress`. Each tool offers unique capabilities to explore quests and monitor progress within the storytelling framework. All tools integrate seamlessly with the MCP server and provide schema-driven data validation for cosmic adventures.

#### Highlights
- `start_adventure.handler`: Launches the adventure with codebase analysis.
- `choose_theme.handler`: Sets the mission's storytelling framework.
- `explore_quest.handler`: Executes individual quests based on user interaction.
- `view_progress.handler`: Monitors the completion status of ongoing quests.

## Code
### packages/mcp/src/tools.ts
```typescript
export const start_adventure = startAdventure;
```
Like igniting the main engines, this tool launches the exploration mission, analyzing the coding galaxy for potential adventures.

```typescript
export const choose_theme = chooseTheme;
```
This function charts a course through the multiverse of themes, aligning to a narrative compatible with the starship's journey.

```typescript
export const explore_quest = exploreQuest;
```
Think of this as dispatching agile drones to nearby planets, collecting data on the active quest status.

```typescript
export const view_progress = viewProgress;
```
This is your stellar diagnostic panel, showing real-time metrics on mission goals and remaining objectives.

## Helpful Hints
- Validate tool commands before execution to avoid runtime galactic errors.
- Use `view_progress` frequently to ensure crew motivation and monitor remaining quests.
- Experiment with themes to uncover unique stories and narrative branches.

---
The MCP Tool Interface is complete, and *Codex Eternum* stands ready to unlock the mysteries of the coding galaxy. Choose your next adventure boldly, explorer!

Mission accomplished, Star Explorer—Quest 1: MCP Tool Interface has been mastered with stellar precision, launching your learning journey into uncharted galaxies of achievement! ⭐🚀💎