# Quest 1: MCP Tool Interface
---
You step onto the bridge of the starship *RepoRanger*, your command console alive with swirling constellations of code. A signal crackles into your earpiece—a mysterious transmission from the heart of the uncharted Code Galaxy. The message is fragmented, almost indecipherable, but one thing is clear: to venture further, you must first master your Multi-Capability Protocol (MCP) Toolkit. The interface is your gateway to interacting with the untamed code clusters of the galaxy. This mission will train you to deploy, adapt, and control these stellar tools.

## Quest Objectives
As you explore the code below, investigate these key questions:
- 🔍 **Signal Mapping**: How are tools dynamically registered and validated in the MCP system?
- ⚡ **Launch Sequence**: What is the process for initializing and running the MCP server? 
- 🛡️ **Safety Protocols**: What mechanisms are used to handle errors or unexpected conditions during tool execution? 

## File Exploration
### packages/mcp/src/server.ts: Core MCP Server Implementation
This file orchestrates the operation of the MCP server, facilitating communication between the coder and the tools in your arsenal. The `RepoAdventureServer` class is central to the design, controlling the server's lifecycle, handling client requests, and ensuring dynamic extensibility. It links the underlying tools with request schemas and uses those links to validate and execute actions in real-time.

#### Highlights
- `RepoAdventureServer.setupHandlers`: Registers request handlers, enabling the dynamic listing and execution of tools. It ensures tools are invoked through schemas that are validated before execution.
- `RepoAdventureServer.run`: Initializes the server transport layer and pre-generates content for smoother user interactions, simulating cache-warming for high efficiency.
- `main`: The server's entry point where key processes like graceful shutdown and error monitoring are configured.

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
- Dynamically registers available tools, creating a scalable and adaptable system.
- Validates tool arguments using Zod schemas, enforcing precise input validation.
- Standardizes error responses through the `McpError` class for clarity and debugging efficiency.
- Bridges tool definitions from the `tools.ts` file to runtime functionality, making tools discoverable and executable.

---

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
- Configures the server to communicate over standard I/O, adapting to a variety of environments.
- Implements a pre-cache mechanism via `repoAnalyzer.preGenerate`, improving performance for subsequent operations.
- Logs server activities for transparency and troubleshooting, ensuring operational awareness.

---

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
- Manages system-level signal events like `SIGINT` to ensure smooth shutdowns.
- Captures unresolved promise rejections, enabling error recovery while preserving server uptime.
- Serves as the primary entry point for launching the MCP Server, bootstrapping necessary services.

## File Exploration
### packages/mcp/src/tools.ts: Tool Registry and Exporter
This file acts as the hub for all tools in the MCP suite. It consolidates individual tool handlers, assigns descriptive metadata, and bundles everything into a single exportable structure.

#### Highlights
- `start_adventure.handler`: Analyzes a codebase and initiates an exploration session.
- `choose_theme.handler`: Allows the user to select a story theme and adapt adventures accordingly.
- `explore_quest.handler`: Enables interaction with specific quests within the generated adventure.
- `view_progress.handler`: Tracks and reports on quest completion, presenting a clear view of progress.

---

```typescript
export const tools = {
  start_adventure,
  choose_theme,
  explore_quest,
  view_progress
};
```
- Aggregates all tools into a shared structure for registration and discoverability.
- Combines functionality with descriptive metadata to create a seamless integration point with the MCP Server.
- Simplifies tool maintenance by centralizing the export configuration in one location.

---

## Helpful Hints
- Understand the relationship between `tools.ts` and `server.ts`—the former defines tools, while the latter executes them dynamically.
- Pay close attention to error reporting in `setupHandlers`, which demonstrates how to handle invalid inputs gracefully.
- Use the `main` function as a reference for how to set up graceful shutdowns in your own projects.

---

Excellent work! Continue to the next quest to uncover more mysteries.

Quest 1: MCP Tool Interface complete—stellar work, Cadet! You've navigated through cosmic complexities with precision and are ready to ignite your thrusters for the next galactic mission! 🚀⚡⭐