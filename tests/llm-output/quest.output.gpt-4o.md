# Quest 1: The MCP Command Deck – Activating the Protocol Nodes
---
As the **Starbound Fleet** moves through a glittering expanse of fragmented code, the command deck is alive with anticipation. Your objective is to harness the MCP Protocol Nodes scattered across the stars. The crew's energy channels into unlocking tools of immense computational power by sequencing the right commands and stabilizing cosmic anomalies. But communication lines are fragile, requiring expert navigation through the interconnected pathways. The fate of the mission hinges on your ability to decode and activate the protocols as the repository grows brighter on the cosmic horizon.

## File Exploration

### packages/mcp/src/server.ts: MCP server protocol implementation
This file is the beating heart of the adventure’s interface—a fully operational MCP server tasked with hosting the interactive storytelling engine. The `RepoAdventureServer` class handles command sequences for listing tools, validating input data, and processing user requests. Its `setupHandlers()` method is where the adventure begins—defining how the MCP communicates with the tools. Incoming requests are intercepted, and arguments parsed with the precision of star-charted calculations. Meanwhile, `run()` activates the server, integrates I/O transport through stdin/stdout, and warms up the repository analysis system in the background.

Preparedness is woven deeply into the server’s design. The `main()` entry point orchestrates error handling and graceful shutdowns, monitoring cosmic signals like SIGINT to keep the ship stable under duress. The file strikes a balance between operational robustness and dynamic adaptability, enabling smooth tool integration. This balance creates a modular system primed for the code explorations ahead.

#### Highlights
- `RepoAdventureServer.setupHandlers` dynamically registers commands for tools using elegant schema validation.
- `RepoAdventureServer.run` initializes critical components, such as stdio transport and repository pre-analysis.
- `main` ensures smooth operation with resilient error handling and shutdown protocols.

### packages/mcp/src/tools.ts: Core MCP tools entry point
This file defines the four powerful tools used to interface with the "gamified" adventure mechanics. Each tool facilitates a step in the story: from initializing the repository exploration in `start_adventure`, to choosing themes, exploring quests, and viewing progress. These tools encapsulate distinct yet interconnected functions, serving as mission-critical instruments for your starship crew.

The tools leverage `zod` schemas for input validation, ensuring each move adheres to strict protocols. With the shared `adventureManager` at the center, they weave a cohesive narrative system. The file highlights the modular nature of the MCP server, allowing tools to be easily registered, modified, or expanded in the pursuit of galactic storytelling.

#### Highlights
- `start_adventure` serves as the first interface for users, analyzing repositories and presenting theme options.
- `explore_quest.handler` connects story progression with actionable tasks.
- Modular design keeps tools flexible and extendable.

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
}
```
This class acts as the "nerve center," linking user inputs to core tools while ensuring a fail-safe environment.

### packages/mcp/src/tools.ts
```typescript
import { adventureManager } from '@ai-repo-adventures/core/adventure';
import { startAdventure } from './tools/start-adventure.js';
import { chooseTheme } from './tools/choose-theme.js';
import { exploreQuest } from './tools/explore-quest.js';
import { viewProgress } from './tools/view-progress.js';

export const start_adventure = startAdventure;
export const choose_theme = chooseTheme;
export const explore_quest = exploreQuest;
export const view_progress = viewProgress;

// Export all tools for easy registration
export const tools = {
  start_adventure,
  choose_theme,
  explore_quest,
  view_progress
};
```
This code functions like a toolbox, organizing key instruments for advancing galactic stories under a unified interface.

## Helpful Hints
- Focus on understanding how `setupHandlers()` connects user inputs to tool logic.
- Experiment with modifying tool descriptions to gain insight into how they appear in the story.
- Next, explore `packages/core/src/adventure/story-generator.ts` to see how tools and themes integrate into narratives.

---

Mission accomplished, Cadet! Quest 1 is locked and loaded – the Protocol Nodes are firing like cosmic engines, propelling you to stellar new horizons! 🚀⚡💎