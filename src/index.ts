#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { repoAdventureTools, type ToolName } from './tools/tools.js';
import { convertZodSchema } from './utils/zodToJsonSchema.js';

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
      const tools = Object.entries(repoAdventureTools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: convertZodSchema(tool.schema)
      }));

      return { tools };
    });

    // Dynamic tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        const toolName = name as ToolName;

        if (!(toolName in repoAdventureTools)) {
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        const tool = repoAdventureTools[toolName];
        if (!tool) {
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
        
        // Validate arguments using the tool's Zod schema
        const validationResult = tool.schema.safeParse(args);
        if (!validationResult.success) {
          const errorMessages = validationResult.error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          ).join(', ');
          throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${errorMessages}`);
        }

        // Execute the tool handler with validated arguments
        return await tool.handler(validationResult.data);

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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Repo Adventure MCP server running on stdio');
  }
}

async function main() {
  try {
    const server = new RepoAdventureServer();
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