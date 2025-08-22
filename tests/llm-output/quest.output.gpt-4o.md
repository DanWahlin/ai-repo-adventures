# Quest 1: Galactic Interface Deployment
---
In the depths of the galaxy aboard the starship *Repomix Explorer*, the crew receives cosmic directives to interface with the Galactic Command's Repository Consortium. This mysterious MCP tool repository can dynamically unlock mission-critical functions for their exploration through nebulous fields. As the crew of Repomix Explorer, your undertaking begins with deciphering the interface's key mechanisms, forging the tools that will guide your stellar journey. Brace yourselves for uncharted frontiers; the galaxy awaits your investigative prowess.

## Quest Objectives
As you explore the code below, investigate these key questions:
- 🔍 **Tool Calibration**: How does the `setupHandlers` function validate and dynamically list tools before execution?
- ⚡ **Orbital Initialization**: What mechanisms enable the `run` function to prepare the server for operational readiness?
- 🛡️ **Cosmic Fail-safes**: How does the `main` function ensure the server handles errors and operates with resilience?

## File Exploration
### packages/mcp/src/server.ts: Server setup and interaction handlers
This file houses the core configuration and operational mechanics for the MCP server, enabling tool registration, dynamic validation, and interactive execution. The `setupHandlers` function lays the groundwork for listing tools and executing tool commands. The `run` function ensures initialization and provides pre-generation cache capabilities essential for repository interactions. Finally, the `main` function handles the overall lifecycle and shutdown logic for the server's peace of mind amidst cosmic uncertainty.

#### Highlights
- `setupHandlers`: Establishes MCP tool handling for listing available tools and executing specific tool commands with validations.
- `run`: Prepares the server for interaction, including setting up transports and pre-generating repository cache content.
- `main`: Orchestrates server handling including graceful shutdowns, error logging, and signal handling.

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
Like mapping star coordinates, the `setupHandlers` method ensures each tool is correctly validated and aligns the crew with secure functionality.

```typescript
async run() {
  const transport = new StdioServerTransport();
  await this.server.connect(transport);
  console.error('Repo Adventure MCP server running on stdio');
  
  // Pre-generate repomix content for the current working directory to warm up the cache
  const projectPath = process.cwd();
  console.error(`Pre-generating repomix content for project at ${projectPath}...`);
  repoAnalyzer.preGenerate(projectPath);
}
```
The `run` function acts as a stellar ignition sequence, connecting the server transport and warming up repository caches for navigation. 

```typescript
async function main() {
  try {
    const server = new RepoAdventureServer();
    
    // Handle graceful shutdown for both signals
    ['SIGINT', 'SIGTERM'].forEach(sig => 
      process.on(sig as NodeJS.Signals, gracefulShutdown)
    );
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled promise rejection:', reason);
      console.error('MCP server continuing to run. Please report this error.');
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
Just as shield protocols are crucial for interstellar safety, the `main` function ensures error resilience through logging and signal management.

---

### packages/mcp/src/tools.ts: Central repository for MCP tools
This file offers insight into tool implementation, leveraging `adventureManager` for interactivity. Each tool—ranging from initiating adventures to monitoring quest progress—provides a step forward in the galactic expedition. The `start_adventure`, `choose_theme`, `explore_quest`, and `view_progress` tools execute critical operations, aligning theme selection and quest navigation for stellar exploration.

#### Highlights
- `start_adventure.handler`: Analyzes codebases and prepares options for thematic story integration.
- `choose_theme.handler`: Generates contextual adventures based on theme selection.
- `explore_quest.handler`: Executes individual quest operations and content analysis.
- `view_progress.handler`: Tracks mission completeness and pending quests.

## Code
### packages/mcp/src/tools.ts
```typescript
export const start_adventure = startAdventure;
export const choose_theme = chooseTheme;
export const explore_quest = exploreQuest;
export const view_progress = viewProgress;

export const tools = {
  start_adventure,
  choose_theme,
  explore_quest,
  view_progress
};
```
Just as a starship relies on its instruments, MCP tools are modular instruments for repository exploration and narrative creation.

---

## Helpful Hints
- Use `setupHandlers` to decipher tool validation schemas for seamless deployment.
- Investigate `run` for insights into transport initialization and caching strategies.
- Understand `main` for server lifecycle, signal handling, and error management.
- In tools, compare handlers for thematic story generation workflows in MCP.

---

Gear up, *Repomix Explorer*! Galactic mysteries within MCP tool interfaces await your exploration—chart your course to interstellar mastery.

Mission accomplished, Galactic Interface Deployment is a stellar success—your cosmic journey has ignited with quantum brilliance, Commander! 🚀⚡⭐