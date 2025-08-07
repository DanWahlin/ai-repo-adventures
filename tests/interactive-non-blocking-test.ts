#!/usr/bin/env node

/**
 * Non-interactive version of the interactive test for automated test runners
 * This validates the MCP client functionality without requiring user input
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult, TextContent, Tool } from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';

class NonInteractiveMCPClient {
  private client: Client;
  private transport?: StdioClientTransport;
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.client = new Client(
      { name: 'non-interactive-test-client', version: '1.0.0' },
      { capabilities: {} }
    );
  }

  private async connectToServer(): Promise<void> {
    console.log('🔌 Connecting to MCP server...');
    
    this.transport = new StdioClientTransport({
      command: 'node',
      args: [path.join(process.cwd(), 'dist/server.js')],
      env: process.env as Record<string, string>,
    });

    await this.client.connect(this.transport);
    
    // Get available tools
    const result = await this.client.listTools();
    result.tools.forEach(tool => {
      this.tools.set(tool.name, tool);
    });

    console.log('✅ Connected successfully!');
    console.log(`Available tools: ${Array.from(this.tools.keys()).join(', ')}`);
  }

  private async callTool(toolName: string, args: Record<string, any>): Promise<string> {
    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: args
      }) as CallToolResult;

      const texts: string[] = [];
      result.content.forEach(content => {
        if (content.type === 'text') {
          texts.push((content as TextContent).text);
        }
      });

      return texts.join('\n\n');
    } catch (error) {
      throw new Error(`Tool ${toolName} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async runTests(): Promise<void> {
    const currentProject = process.cwd();
    console.log(`\nTesting MCP Repo Adventure interactive functionality...`);

    try {
      // Test 1: Start adventure
      console.log('\n🎯 Test 1: Starting adventure...');
      const startResult = await this.callTool('start_adventure', { 
        projectPath: currentProject 
      });
      
      if (startResult.includes('Error') || startResult.includes('Failed')) {
        throw new Error('Adventure start failed');
      }
      console.log('✅ Adventure started successfully');

      // Test 2: Choose theme
      console.log('\n🎯 Test 2: Choosing space theme...');
      const themeResult = await this.callTool('choose_theme', { theme: 'space' });
      
      if (themeResult.includes('Error') || themeResult.includes('Failed')) {
        throw new Error('Theme selection failed');
      }
      console.log('✅ Theme selected successfully');

      // Test 3: View progress
      console.log('\n🎯 Test 3: Viewing progress...');
      const progressResult = await this.callTool('view_progress', {});
      
      if (progressResult.includes('Error') || progressResult.includes('Failed')) {
        throw new Error('Progress viewing failed');
      }
      console.log('✅ Progress viewed successfully');

      // Test 4: Explore path
      console.log('\n🎯 Test 4: Exploring path...');
      const exploreResult = await this.callTool('explore_quest', { 
        choice: 'Explore the main components' 
      });
      
      if (exploreResult.includes('Error') || exploreResult.includes('Failed')) {
        throw new Error('Path exploration failed');
      }
      console.log('✅ Path explored successfully');

      console.log('\n🎉 All interactive tests passed!');

    } catch (error) {
      console.error('❌ Interactive test failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
    }
  }

  async run(): Promise<void> {
    try {
      await this.connectToServer();
      await this.runTests();
      await this.cleanup();
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived interrupt signal...');
  process.exit(1);
});

// Run the test
async function main() {
  const timeout = setTimeout(() => {
    console.error('❌ Interactive test timed out after 30 seconds');
    process.exit(1);
  }, 30000);

  try {
    const client = new NonInteractiveMCPClient();
    await client.run();
    clearTimeout(timeout);
    console.log('Interactive functionality validation completed successfully');
    process.exit(0);
  } catch (error) {
    clearTimeout(timeout);
    console.error('Interactive test failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});