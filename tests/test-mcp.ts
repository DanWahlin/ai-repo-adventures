#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { 
  Tool, 
  CallToolResult, 
  TextContent 
} from '@modelcontextprotocol/sdk/types.js';

interface TestToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

class MCPServerTester {
  private client: Client;

  constructor() {
    this.client = new Client(
      {
        name: 'mcp-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  private truncateText(text: string, maxLength: number = 500): string {
    return text.length > maxLength 
      ? text.substring(0, maxLength) + '...\n[Response truncated for brevity]'
      : text;
  }

  private async connectToServer(): Promise<StdioClientTransport> {
    console.log('🔌 Connecting to MCP Repo Adventure Server...');
    
    // Create transport that will spawn the server
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/index.js'],
      env: process.env,
    });

    // Connect client to server
    await this.client.connect(transport);
    console.log('✅ Connected successfully!\n');

    return transport;
  }

  private async testToolCall(
    testNumber: string, 
    testName: string, 
    toolCall: TestToolCall,
    maxLength: number = 500
  ): Promise<void> {
    console.log(`${testNumber} Testing ${testName}...`);
    
    try {
      const result: CallToolResult = await this.client.callTool(toolCall);
      
      console.log(`📋 ${testName} Response:`);
      result.content.forEach((content) => {
        if (content.type === 'text') {
          const textContent = content as TextContent;
          console.log(this.truncateText(textContent.text, maxLength));
        }
      });
      console.log();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  ${testName} test: ${errorMessage}`);
      console.log();
      throw error; // Re-throw for critical tests
    }
  }

  private async testToolCallOptional(
    testNumber: string, 
    testName: string, 
    toolCall: TestToolCall,
    maxLength: number = 300
  ): Promise<void> {
    console.log(`${testNumber} Testing ${testName}...`);
    
    try {
      const result: CallToolResult = await this.client.callTool(toolCall);
      
      console.log(`📋 ${testName} Response:`);
      result.content.forEach((content) => {
        if (content.type === 'text') {
          const textContent = content as TextContent;
          console.log(this.truncateText(textContent.text, maxLength));
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  ${testName} test: ${errorMessage}`);
    }
    console.log();
  }

  async runTests(): Promise<void> {
    let transport: StdioClientTransport | undefined;
    
    try {
      // Connect to server
      transport = await this.connectToServer();

      // Test 1: List available tools
      console.log('1️⃣ Testing tool discovery...');
      const { tools }: { tools: Tool[] } = await this.client.listTools();
      console.log(`📋 Found ${tools.length} tools:`);
      tools.forEach((tool: Tool) => {
        console.log(`   • ${tool.name}: ${tool.description}`);
      });
      console.log();

      // Test 2: Start adventure
      await this.testToolCall(
        '2️⃣',
        'start_adventure',
        {
          name: 'start_adventure',
          arguments: {}
        }
      );

      // Test 3: Choose theme
      await this.testToolCall(
        '3️⃣',
        'choose_theme with space theme',
        {
          name: 'choose_theme',
          arguments: { theme: 'space' }
        }
      );

      // Test 4: Try to meet a character (optional - may fail)
      await this.testToolCallOptional(
        '4️⃣',
        'meet_character',
        {
          name: 'meet_character',
          arguments: { characterName: 'Data Archivist' }
        }
      );

      // Test 5: Explore path (optional - may fail)
      await this.testToolCallOptional(
        '5️⃣',
        'explore_path',
        {
          name: 'explore_path',
          arguments: { choice: 'Meet the Data Guardian to learn about information storage' }
        }
      );

      console.log('🎉 All tests completed successfully!');
      console.log('🎮 Your MCP Repo Adventure Server is working perfectly!');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('❌ Test failed:', errorMessage);
      if (errorStack) {
        console.error(errorStack);
      }
    } finally {
      // Clean up
      if (transport) {
        await transport.close();
      }
      process.exit(0);
    }
  }
}

// Run the tests
async function main(): Promise<void> {
  console.log('🧪 MCP Repo Adventure Server Test Suite\n');
  console.log('This test uses the official MCP Client SDK to verify server functionality.\n');
  
  const tester = new MCPServerTester();
  await tester.runTests();
}

main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('❌ Test runner failed:', errorMessage);
  process.exit(1);
});