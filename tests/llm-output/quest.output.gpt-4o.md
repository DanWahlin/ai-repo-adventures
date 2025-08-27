# Quest 1: Cosmic Interfaces of the Starship (MCP Tool Interface)
---
Aboard the *Code Voyager*, the starship hums with activity as the crew prepares for its next galactic mission through the nebulous source files of the universe. Guided by the **Galactic Repo Analyzer** and powered by the LLM Reactor Core, your task is to inspect the core integrations anchoring the MCP Tool Interface. This system will serve as the central instrument for engaging with the onboard AI to decode repositories. Your first stop is the interface bridge, where key handlers and tools await exploration. Buckle up, explorer, as we venture into the cosmic architecture of dynamic tool integration and execution.

## Quest Objectives
As you explore the code below, investigate these key questions:
- 🔍 **Schema Orbit Mapping**: How does the `setupHandlers` method dynamically compile available tools and validate input arguments?
- ⚡ **Execution Pathways**: What steps are executed in the `run` method to initiate the MCP server for repo exploration, and how does it support preemptive analysis?
- 🛡️ **Signal Integrity**: How does the `main` method orchestrate server startup and ensure graceful shutdown procedures for error scenarios?

## File Exploration
### packages/mcp/src/server.ts: Core MCP Server Implementation
This file contains the backbone of the MCP Tool Interface. It defines a dedicated `RepoAdventureServer` class responsible for managing tools, validating input, and facilitating the execution of server-side commands. Special attention is given to dynamic schema validation of tools via the Zod library and handling diverse edge cases. The `run` function adds additional layers of optimization by pre-warming caches for future tasks. The `main` function connects the pieces, ensuring that the server operates reliably while capturing unhandled errors for reporting.

#### Highlights
- `RepoAdventureServer.setupHandlers` dynamically lists all tools and validates their parameters using Zod schemas. This is essential for ensuring tools align with their expected input structures.
- `RepoAdventureServer.run` activates the MCP server using the Stdio transport and optimizes performance via pre-generation of repository content.
- `main` orchestrates the complete server lifecycle, including graceful shutdown attempts and recovery from unhandled promise rejections.

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
- This code dynamically registers tools, exposing their metadata and schemas for validation.
- Zod validation ensures that all tool arguments meet their expected structures, improving reliability and reducing runtime errors.
- The design separates tool management from server logic, paving the way for modularity and ease of maintenance.
- Errors are consistently handled with proper `McpError` codes for debugging and client responses.

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
- The `run` method uses Stdio transport for server communication, showcasing a flexible and lightweight interface.
- Pre-caching repository analysis reduces latency during tool execution, enabling smoother workflows for users.
- By keeping tasks like pre-generation asynchronous, the system remains responsive during first-time usage.

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
- The `main` function serves as the entry point, initializing the server and listening for shutdown signals.
- It demonstrates robust error handling, ensuring clean-up procedures execute during unexpected errors.
- By isolating server start logic from other functions, maintainability and clarity are improved.

---

## Helpful Hints
- Investigate Zod's schema validation capabilities to understand how tool arguments are validated dynamically.
- Observe how the `run` function optimizes workflows by pre-warming caches for repository analysis.
- Consider the `main` method's clean design and signal handling as a model for other long-running processes.

---
Excellent work! Continue to the next quest to uncover more mysteries.

Mission accomplished, star navigator—Quest 1 complete! You've unlocked the first cosmic key to commanding the MCP Interface—your journey to the stars is off to a stellar start! 🚀💎📡