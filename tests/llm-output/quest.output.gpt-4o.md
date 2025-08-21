# Quest 1: Command Interface Systems
---
As the **Code Explorer** glides through the cosmic expanse toward a derelict station floating near a volatile nebula, the crew readies its systems. Your mission: establish communication with the ship’s command interface to enable tool operations for analyzing the ancient station's dormant databases. The success of this expedition hinges on your ability to configure handlers within the server’s core and ensure the tools activate seamlessly. The galaxy’s scattered knowledge awaits — it’s your time to bridge the stellar past with the crew’s capable exploration tools.

## File Exploration
### packages/mcp/src/server.ts: Core server for interactive command systems
This file structures the **RepoAdventureServer**, which serves as the command interface for managing dynamic connections and tool execution. By setting up handlers in the `RepoAdventureServer` class, the crew can list tools dynamically and execute them through specific schema validations. Critical methods like `setupHandlers` and `run` ensure the seamless processing of requests and maintain the overall stability of cosmic operations. The `main` function orchestrates the server's lifecycle, monitoring processes and preparing for unexpected conditions with proactive error management.

#### Highlights
- `setupHandlers`: Configures the server to manage tool listing and execution capabilities.
- `run`: Activates the server’s communication protocols and pre-generates repository data for smoother analyses.
- `main`: Initializes and sustains the server lifecycle while implementing error handling and shutdown procedures.

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
      if (!(name in tools)) throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
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
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
}
```
The `setupHandlers` function is the central navigator, ensuring all tool requests are precisely routed and validated before execution.

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
The `run` function acts as a launch protocol, preparing communication systems while initializing background resource generation.

```typescript
async function main() {
  try {
    const server = new RepoAdventureServer();
    
    ["SIGINT", "SIGTERM"].forEach(sig => 
      process.on(sig as NodeJS.Signals, gracefulShutdown)
    );
    process.on("unhandledRejection", (reason) => {
      console.error("Unhandled promise rejection:", reason);
      console.error("MCP server continuing to run. Please report this error.");
    });
    await server.run();
  } catch (error) {
    console.error("Fatal error starting MCP server:", error);
    process.exit(1);
  }
}
```
The `main` function oversees starship liftoff, stabilizing the system against signals and unforeseen turbulence.

### packages/mcp/src/tools.ts: Repository navigation tools
This file registers the interactive tools designed for the MCP system. Each tool is encapsulated in a handler exported under MCP-compatible names, allowing for structured engagement. The tools support storytelling and progress monitoring, utilizing the central `adventureManager` to synchronize their state. Among the functions, handlers like `start_adventure` and `explore_quest` define how the crew interacts with quests and explores the station-specific content.

#### Highlights
- `start_adventure.handler`: Initiates the exploration by analyzing the repository and preparing quests.
- `choose_theme.handler`: Generates quests tailored to the chosen theme.
- `explore_quest.handler`: Allows crews to navigate through individual quest content.
- `view_progress.handler`: Summarizes exploration progress and tracks remaining quests.

## Code
### packages/mcp/src/tools.ts
```typescript
import { startAdventure } from './tools/start-adventure.js';
```
The `start_adventure.handler` activates the cosmic analyzer, initiating exploration preparations.

```typescript
import { chooseTheme } from './tools/choose-theme.js';
```
The `choose_theme.handler` selects the narrative lens through which repositories are decoded.

```typescript
import { exploreQuest } from './tools/explore-quest.js';
```
The `explore_quest.handler` dives into the depths of data-rich quests within repositories.

```typescript
import { viewProgress } from './tools/view-progress.js';
```
The `view_progress.handler` offers a galactic map summarizing the mission's progress and remaining roads.

## Helpful Hints
- Explore handler chaining within `setupHandlers` for better tool modularity.
- Pre-generate repository data using `run` to speed up future analyses.
- Experiment with theme customization in `choose_theme.handler` to enhance quest uniqueness.

---
The command interface is ready and the tools are at your disposal. Proceed swiftly to establish contact with the next data archive, adventurer!

Mission accomplished, cadet! Quest 1: Command Interface Systems is now secure in your cosmic arsenal—stellar work propelling the starship of knowledge forward! 🚀⭐⚡