# Quest 1: Mapping the Tool Universe
---
Aboard the starship CodeExplorer, the Adventure Manager AI issues its first stellar command: “Begin mapping the Tool Universe.” Your mission: to chart the constellations of code that power the Tool Interface. Within the swirling data streams of `server.ts` and `tools.ts`, essential tools await your discovery. As cosmic cartographers, you will unravel how tools are registered, validated, and orchestrated—forming the backbone of interactive storytelling in the Codeverse. Ready your scanners, astronaut. The Tool Universe holds untold revelations.

## Quest Objectives
As you explore the code below, investigate these key questions:
- 🔍 **Dynamic Tool Mapping**: How does the `setupHandlers` function dynamically configure and validate tools for the server?
- ⚡ **Lifecycle Alignment**: What are the initialization steps in `run` and their role in resource preparation or error resilience?
- 🛡️ **Orchestration Blueprint**: How are tools like `start_adventure` and `explore_quest` structured, and what principles ensure their integration into the server?

## File Exploration
### packages/mcp/src/server.ts: Server setup and tool management
This file forms the operational hub of the Tool Universe, defining the `RepoAdventureServer` class. Within, the `setupHandlers` function dynamically registers tools based on schemas and handlers defined elsewhere. Key error-handling mechanisms enforce strict schema validation to ensure input fidelity. The `run` function establishes communication through `StdioServerTransport`, pre-generates content using `repoAnalyzer`, and sets up graceful shutdown protocols. Together, these components create a robust lifecycle for connecting tools with storytelling.

#### Highlights
- `setupHandlers` dynamically registers tools and validates input schemas
- `run` initializes the server transport and prepares the repo analysis cache
- `main` configures shutdown signals and ensures runtime error management

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
In this galactic map-maker, `setupHandlers` registers routes to chart tool usage and safeguards against misaligned schemas.

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
Navigation begins with `run`, ensuring resources like `StdioServerTransport` and pre-generated analytic caches are ready.

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
`main` serves as a stellar captain, ensuring smooth signal handling and runtime resilience to keep the ship operational.

---

### packages/mcp/src/tools.ts: Tool definitions and export
This file constitutes the registry of tools for the Tool Interface. It integrates key operations such as `start_adventure`, `choose_theme`, and `explore_quest`, mapping them to handlers while maintaining clean modularity. Tools are exported using a strict interface, with shared instances like `adventureManager` aiding in state tracking. This provides a cohesive architecture, balancing functionality with maintainability.

#### Highlights
- `start_adventure.handler`: Entry analysis for starting story-driven adventures
- `choose_theme.handler`: Middleware for generating themes and aligning configurations
- `explore_quest.handler`, `view_progress.handler`: Individual quest exploration and progress visibility

## Code
### packages/mcp/src/tools.ts
```typescript
export const start_adventure = startAdventure;
// Tool entry point - conducts repository analysis and launches adventure setup
```
`start_adventure` initiates cosmic voyages, analyzing vast repositories to construct generative storyscapes.

```typescript
export const choose_theme = chooseTheme;
// Middleware for selecting themes and aligning Codeverse adventures to style guidelines
```
`choose_theme` serves as the navigation compass, aligning quests to selected artistic themes.

```typescript
export const explore_quest = exploreQuest;
export const view_progress = viewProgress;
// Mapping exploration to journey milestones and monitoring progress through diverse quests
```
`explore_quest` delves into cosmic tasks, while `view_progress` ensures navigators can track their stellar trajectories.

## Helpful Hints
- Use the `setupHandlers` implementation as a roadmap to trace tool registration and schema interaction.
- Compare the modular structure of `tools.ts` functions with their usage in `setupHandlers` to understand integration points.
- Experiment with extending tools by mimicking the handler structure to aid in future cosmic missions.

---
Mission accomplished! You successfully charted the Tool Universe, unlocking the potential of the Tool Interface and setting the stage for future adventures. Prepare for the next cosmic challenge!

Congratulations, Star Mapper! 🚀 You’ve charted the cosmic coordinates of the Tool Universe, igniting the thrusters for your interstellar learning journey—stellar work! ⭐💎📡