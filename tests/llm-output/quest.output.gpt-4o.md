# Quest 1: Bridge Control – Activating the Galactic Toolset
---

The *Codestar Phoenix* had approached the Stardock Outpost, a vast repository shrouded in the glimmering remnants of an ancient star. Alerts echoed through the cockpit—the outpost's core systems were fragmented, its encrypted data cores scattered like constellations waiting to be reconnected. Your first mission: take control of the bridge by repairing the tool management protocols. The *Codestar Phoenix*'s onboard systems, including the powerful MCP (Model Context Protocol) server, will be your guide in bringing this galactic toolset into operational alignment.

## File Exploration

### packages/mcp/src/server.ts: MCP Server Protocol Implementation
The `packages/mcp/src/server.ts` file is the heart of the MCP server, ensuring seamless communication between the *Codestar Phoenix* and Stardock Repository systems. Its mission is to host and manage the adventure tools, a critical part of exploring and restoring the repository. Within the `RepoAdventureServer` class, you'll find the setup handlers that define how tools are listed and executed using the MCP protocol. The `run()` function initializes the `StdioServerTransport` connection while triggering data analysis to warm up the *repomix* cache. Meanwhile, the `main()` function acts as the story’s starting point, setting up graceful shutdowns for unexpected turbulence and handling potential errors.

The brilliance of this file lies in its design—each component is modular and intuitive, allowing flexibility for future tool integrations. The handlers ensure that requests to list or execute tools are dynamically processed, verifying inputs while managing execution failures gracefully. By connecting the `StdioServerTransport`, the file listens for user inputs, creating an interactive, real-time experience for adventurers onboard the server.

#### Highlights
- The `RepoAdventureServer.setupHandlers()` function registers handlers for listing and executing tools dynamically.
- The `RepoAdventureServer.run()` function connects the server to stdio and pre-generates codebase content for smooth operation.
- The `main()` function ensures proper setup, including graceful handling of terminations and unexpected rejections.

### packages/mcp/src/tools.ts: MCP Toolset Entry Point
The `packages/mcp/src/tools.ts` file acts as the central hub for launching MCP tools. It brings the adventure to life through its perfectly orchestrated cycle: analyzing codebases (`start_adventure`), generating galactic stories (`choose_theme`), exploring coded quests (`explore_quest`), and monitoring mission progress (`view_progress`). These tools, defined with precision, allow easy maintenance and intuitive integration with the overarching storylines.

By organizing tools into a single manageable export, this file achieves operational clarity. A highlight is its `tools` object, which collects and registers the four distinct tools in one place. Behind this simplicity lies significant power—the tools sync with the `adventureManager`, ensuring a consistent and immersive experience for the user.

#### Highlights
- The `start_adventure.handler` tool kickstarts your journey by analyzing repositories and presenting users with quest themes.
- The `choose_theme.handler` generates themed narratives and determines the tone of the adventure.
- The `explore_quest.handler` unravels quest content in actionable segments with built-in progress tracking.
- The `view_progress.handler` provides reports on completed and remaining quests, ensuring no mission is missed.

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
Just as a captain charts courses for multiple missions, this function efficiently handles incoming requests to use the right tools for the job.

### packages/mcp/src/tools.ts
```typescript
export const tools = {
  start_adventure,
  choose_theme,
  explore_quest,
  view_progress
};
```
This acts as a space station's control panel, consolidating essential buttons needed to explore and understand the repository galaxy.

## Helpful Hints

- Always validate inputs using schemas to prevent unexpected crashes during tool execution.
- Explore the `choose_theme` tool to add a more vibrant narrative layer to your quests.
- Consider enhancing the `view_progress` tool with visual metrics for quest completion rates.

---

Mission accomplished, Commander—Quest 1 complete: the galactic toolset is online, the starship systems are charging forward, and the cosmos awaits your brilliance! 🚀⚡⭐