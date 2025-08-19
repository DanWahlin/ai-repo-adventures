# Quest 1: Starship Command Deck—The MCP Protocol Control Unit

---

The starship *Refactor-1* glides steadily through the geometric currents of the **Codex Singularity**. On the Command Deck, Captain Yara appears calm despite the swirling chaos of untamed data streams just outside the hull. The crew gathers around the holographic MCP Protocol Control Unit, its interface cycling with alien configurations. Today’s mission? To decipher the functionality of critical onboard systems—protocol stabilizers connecting tools for interstellar exploration, powered by adaptive AI logic. Every component in this cyber starship has a story to tell, so let’s delve deeper into its sophisticated inner workings.

## File Exploration

### packages/mcp/src/server.ts: MCP Server Protocol Implementation

The file `packages/mcp/src/server.ts` serves as the backbone of the MCP server, coordinating how tools and requests flow across the system. It’s where the `RepoAdventureServer` class is built to handle critical operations, such as registering protocol handlers for tools (`ListToolsRequestSchema`) and executing dynamic tool logic (`CallToolRequestSchema`). Here, the server is designed with portability in mind, leveraging `StdioServerTransport` for inter-process communication. 

The `run()` method is particularly noteworthy for connecting the server to the transport layer and pre-generating `repomix` content for the targeted workspace. This ensures the MCP server has a cache of code analysis ready before user commands are issued, reducing latency during exploration quests. Meanwhile, the `main()` function oversees initialization, graceful shutdown during events like `SIGINT`, and robust error handling. Sophisticated logging throughout ensures that even unexpected issues during tool executions are recorded for debugging.

#### Highlights

- `RepoAdventureServer.setupHandlers()` enables dynamic listing and invocation of tools based on user commands.
- `RepoAdventureServer.run()` connects the MCP server and prepares analysis content ahead of time.
- Signal handling in `main()` ensures proper shutdown processes during interruptions (e.g., `SIGINT`).

### packages/mcp/src/tools.ts: MCP Adventure Tools Entry Point

The file `packages/mcp/src/tools.ts` introduces the essential tools fueling the MCP system’s gamified exploration of codebases. Tools like `start_adventure`, `choose_theme`, `explore_quest`, and `view_progress` are exported here, giving the user interactive control over story creation and progress tracking. Each tool leverages the `adventureManager` class to coordinate storytelling tasks and generate prompts, ensuring consistency across themed adventures like the one unfolding within the **Repository Nebula**.

For instance, `start_adventure.handler()` scans a codebase and offers theme options based on an initial analysis. Following a theme selection, `choose_theme.handler()` builds unique quests and narratives shaped by user preferences. Progress tracking is handled by `view_progress.handler()`, while users can directly execute story chapters using the `explore_quest.handler()` tool for deeper code analysis. This file stands as the interface between AI-powered narratives and human-guided decision-making.

#### Highlights

- Exports core MCP tools (`start_adventure`, `choose_theme`, `explore_quest`, `view_progress`) for interactive storytelling.
- Tools rely on `adventureManager` for orchestration and state management across quests.
- Each tool bridges technical tasks with narrative-driven energy, enabling themed exploration.

## Code

### packages/mcp/src/server.ts

```typescript
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
}
```

The `RepoAdventureServer` acts as the starship captain’s translator, making protocols understandable and execution seamless.

### packages/mcp/src/tools.ts

```typescript
export const tools = {
  start_adventure,
  choose_theme,
  explore_quest,
  view_progress
};
```

The `tools` object is the crew’s toolkit, ready to decode mysteries in the galactic repository.

## Helpful Hints

- Focus on `run()` to understand the role of pre-generating context for reduced latency during analysis.
- Investigate `setupHandlers()` to see how tool requests are validated and managed dynamically.
- Study `tools.ts` to grasp how user commands are mapped to interactive storytelling actions.

---

Quest accomplished, Commander—your mastery of the MCP Protocol Control Unit has powered up the mission's core systems; onward to the stars! 🚀⚡⭐