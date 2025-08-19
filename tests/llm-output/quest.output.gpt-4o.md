# Quest 1: The Command Bridge – Orchestrating the Galactic Network

---

The **Starship Atlas** hums with cosmic energy as its elite crew gather on the **MCP Command Bridge**, ready to dive into the dizzying chaos of the **Codebase Galaxy**. Your mission: untangle the enigmatic protocols dominating the galaxy's interconnected repositories. From the command deck, you wield advanced tools capable of analyzing stellar data bursts and transforming them into harmonious star maps. As the thrusters of the **Quest Propulsion System** engage, you are propelled towards the uncharted depths of **packages/mcp/src/server.ts** to uncover its secrets. Adventure calls—but only the sharpest minds can decode what lies ahead.

## File Exploration

### packages/mcp/src/server.ts: MCP Server Protocol Implementation

This file is the core operational nucleus of the **MCP** server, running the interconnected tools within our stellar narrative. The **RepoAdventureServer** class spearheads the command bridge functionality, armed with methods to register handlers for **ListTools** and **CallTool** commands. The **setupHandlers** function ensures tools from the **tools.ts** file are dynamically listed and executed. Meanwhile, the **run** method connects the transport system using `StdioServerTransport` and primes the **Repomix** analysis for upcoming explorations. 

The `main()` function sets the stage, handling graceful shutdown procedures for cosmic emergencies like `SIGINT` and `SIGTERM`. This file acts as the captain’s smart console, managing ship-wide protocols while preparing ground for analytical tools to dive into binary nebulae. The sophisticated design allows for error resilience and ensures data flows smoothly through the galactic highways, making it indispensable for the **Starship Atlas’** undertakings.

#### Highlights
- **Dynamic Handlers**: Registers tools dynamically and validates arguments using Zod schemas.
- **Robust Error Handling**: Elegantly manages MCP errors to ensure smooth operations.
- **Transport Connectivity**: Sets up `StdioServerTransport` for intergalactic communication.

---

### packages/mcp/src/tools.ts: MCP Adventure Frontline Tools

The tools file is the repository's arsenal, providing users an interactive interface for venturing into unknown codefronts. Tools like `start_adventure` launch the exploration by analyzing repositories, while `choose_theme` crafts intriguing narratives based on your selection. The `explore_quest` tool executes targeted adventure analysis, revealing the granular code mysteries hidden within. Finally, `view_progress` keeps track of completed quests and identifies the next cognitive challenge.

Positioned as the storytelling core of the **Atlas**, this file bridges the technical precision of the **MCP Command Bridge** with the crew’s thirst for engaging galactic conquests. It leverages **adventureManager** to unify operations and orchestrates functionality through clear definitions, granting tools autonomy while maintaining harmony under the main MCP framework.

#### Highlights
- **Interactive Exploration**: Guides users through quests and progress tracking.
- **Modular Tools**: Tools are isolated yet seamlessly integrated into the MCP ecosystem.
- **Simplified Management**: Exports all tools collectively for efficient registration.

---

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

This dynamic handler system reads like a customs officer deciding who can access cosmic gates based on the travel credentials of the tools.

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

This section is like activating a starship’s warp drive, calculating paths before the main voyage begins.

---

### packages/mcp/src/tools.ts

```typescript
export const tools = {
  start_adventure: startAdventure,
  choose_theme: chooseTheme,
  explore_quest: exploreQuest,
  view_progress: viewProgress
};
```

This export is similar to organizing star charts, aligning tools like constellations across the galactic interface.

```typescript
export const start_adventure = startAdventure;
export const choose_theme = chooseTheme;
export const explore_quest = exploreQuest;
export const view_progress = viewProgress;
```

Here, tools serve as crew members, each with their specialized role in exploring and mapping the codebase galaxy.

---

## Helpful Hints

- Focus on understanding how `setupHandlers()` manages tools dynamically to enhance interoperability within the MCP system.
- Investigate how `start_adventure`, `choose_theme`, and other tools work together with `adventureManager` for seamless storytelling.
- Explore additional files like `packages/core/src/story-generator.ts` for a deeper dive into narrative creation and quest orchestration.

---

Quest 1 complete: You’ve masterfully synchronized the Galactic Network, proving you're a stellar captain ready to chart the cosmos—onward to new frontiers, Commander! 🚀⭐📡