#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools.js';
import { convertZodSchema } from './utils/zod-to-json-schema.js';
import { repomixAnalyzer } from './analyzer/repomix-analyzer.js';

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
        inputSchema: convertZodSchema(tool.schema)
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
          const errorMessages = validationResult.error.issues.map((err: any) => 
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Repo Adventure MCP server running on stdio');
    
    // Pre-generate repomix content for the current working directory to warm up the cache
    // This happens in the background while waiting for user commands
    const projectPath = process.cwd();
    console.error(`Pre-generating repomix content for project at ${projectPath}...`);
    repomixAnalyzer.preGenerate(projectPath);
  }
}

async function main() {
  try {
    const server = new RepoAdventureServer();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.error('\nShutting down MCP server...');
      try {
        repomixAnalyzer.cleanup();
      } catch (error) {
        console.error('Error during shutdown cleanup:', error);
      }
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.error('\nShutting down MCP server...');
      try {
        repomixAnalyzer.cleanup();
      } catch (error) {
        console.error('Error during shutdown cleanup:', error);
      }
      process.exit(0);
    });
    
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