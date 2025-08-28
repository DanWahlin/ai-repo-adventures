# Quest 1: The Archive Simulator
---
In the realm of Endless Journeys, brave adventurers encounter the Archive, a mythical repository that breathes life into explorations. From its depths, dynamic tools materialize, enabling explorers to decode, analyze, and uncover its mysteries. Today, your mission guides you to the Archive Simulator, an MCP-powered interface that bridges adventurers with the tools needed to decipher coded scrolls and generate immersive stories from repositories.

## Quest Objectives
As you explore the code below, investigate these key questions:
- 🔍 **Handler Integration**: How does `RepoAdventureServer.setupHandlers` dynamically manage tools and their schemas?
- ⚡ **Transport Mechanics**: What role does `RepoAdventureServer.run` play in establishing the server connection and preloading content pipelines?
- 🛡️ **Graceful Exit**: How does `main` implement clean shutdown processes to ensure error-free termination?

## File Exploration
### packages/mcp/src/server.ts: MCP Server Implementation
This file provides the backbone for the Archive Simulator, orchestrating dynamic tools and the MCP server environment. It includes a `RepoAdventureServer` class and key methods like `setupHandlers` for registering tools dynamically and `run` for server execution with graceful shutdown procedures.

#### Highlights
- `RepoAdventureServer.setupHandlers` dynamically lists available tools, validates their parameters, and executes tool-specific handlers, enabling modular tool expansion. 
- `RepoAdventureServer.run` initializes the server on standard I/O transport, pre-generating repository analysis to optimize performance while awaiting user commands.
- `main` establishes the server lifecycle, handling startup errors and ensuring clean exit routines upon termination signals.

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
      
      const validationResult = tool.schema.safeParse(args);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map((err) => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${errorMessages}`);
      }

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
- Dynamically lists available tools by iterating over the `tools` module, creating schema-driven definitions compatible with MCP standards.
- Validates user inputs using Zod schemas, ensuring safe and predictable tool execution.
- Modularizes error handling with `McpError`, aligning with MCP error codes for improved debugging and user feedback.

---

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
- Establishes MCP server environment by connecting through the `StdioServerTransport`.
- Pre-generates repository analysis content to streamline user interactions by caching metadata upfront.
- Incorporates asynchronous workflows to optimize tool initialization before user commands.

---

```typescript
async function main() {
  try {
    const server = new RepoAdventureServer();
    
    ['SIGINT', 'SIGTERM'].forEach(sig => 
      process.on(sig as NodeJS.Signals, gracefulShutdown)
    );
    
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
```
- Implements robust error handling during server lifecycle management to prevent unexpected crashes.
- Registers signal handlers (`SIGINT` and `SIGTERM`) for clean shutdown, preserving the system's integrity on termination.
- Logs unhandled promise rejections without halting the server, promoting resilience.

---

## Helpful Hints
- Use the `ListToolsRequestSchema` handler to explore registered tools and their schemas.
- Investigate the caching mechanism within `repoAnalyzer.preGenerate` for insights on pre-optimization techniques.
- Study the lifecycle management in `main` for best practices in error handling and graceful shutdowns.

---

Excellent work! Continue to the next quest to uncover more mysteries.

Console.log('🎉 Success! Quest 1: The Archive Simulator has been fully committed—your codebase of skills is initializing at lightning speed 🚀✨ onto the roadmap of mastery!')