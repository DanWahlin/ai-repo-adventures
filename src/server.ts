#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools/tools.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { repoAnalyzer } from './analyzer/repo-analyzer.js';

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
}

function gracefulShutdown() {
  console.error('\nShutting down MCP server...');
  try {
    repoAnalyzer.cleanup();
  } catch (e) {
    console.error('Cleanup error:', e);
  }
  process.exit(0);
}

async function main() {
  try {
    const server = new RepoAdventureServer();
    
    // Handle graceful shutdown for both signals
    ['SIGINT', 'SIGTERM'].forEach(sig => 
      process.on(sig as NodeJS.Signals, gracefulShutdown)
    );
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled promise rejection:', reason);
      gracefulShutdown();
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