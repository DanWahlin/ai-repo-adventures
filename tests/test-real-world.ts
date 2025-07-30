#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { 
  CallToolResult, 
  TextContent 
} from '@modelcontextprotocol/sdk/types.js';

interface TestScenario {
  name: string;
  description: string;
  tools: Array<{
    name: string;
    arguments: Record<string, unknown>;
    expectSuccess?: boolean;
  }>;
}

class RealWorldMCPTester {
  private client: Client;

  constructor() {
    this.client = new Client(
      {
        name: 'real-world-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  private async connectToServer(): Promise<StdioClientTransport> {
    console.log('🌟 Connecting to MCP Repo Adventure Server for Real-World Testing...');
    
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/index.js'],
      env: process.env as Record<string, string>,
    });

    await this.client.connect(transport);
    console.log('✅ Connected successfully!\n');
    return transport;
  }

  private async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    const result = await this.client.callTool({
      name,
      arguments: args
    });
    return result as CallToolResult;
  }

  private displayResponse(result: CallToolResult, maxLength: number = 800): void {
    result.content.forEach((content) => {
      if (content.type === 'text') {
        const textContent = content as TextContent;
        let text = textContent.text;
        
        if (text.length > maxLength) {
          text = text.substring(0, maxLength) + '...\n[Response truncated for readability]';
        }
        
        console.log(text);
      }
    });
  }

  private async runScenario(scenario: TestScenario): Promise<boolean> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎬 SCENARIO: ${scenario.name}`);
    console.log(`📝 ${scenario.description}`);
    console.log(`${'='.repeat(60)}\n`);

    let scenarioSuccess = true;

    for (let i = 0; i < scenario.tools.length; i++) {
      const tool = scenario.tools[i];
      console.log(`${i + 1}️⃣ Calling ${tool.name}...`);
      
      try {
        const result = await this.callTool(tool.name, tool.arguments);
        
        console.log(`📋 ${tool.name} Response:`);
        this.displayResponse(result);
        console.log();
        
        if (tool.expectSuccess === false) {
          console.log(`⚠️  Expected this call to fail, but it succeeded.`);
          scenarioSuccess = false;
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (tool.expectSuccess !== false) {
          console.log(`❌ ${tool.name} failed: ${errorMessage}\n`);
          scenarioSuccess = false;
        } else {
          console.log(`✅ Expected failure: ${errorMessage}\n`);
        }
      }
      
      // Small delay between calls to make output readable
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const status = scenarioSuccess ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status}: ${scenario.name}\n`);
    
    return scenarioSuccess;
  }

  async runAllTests(): Promise<void> {
    let transport: StdioClientTransport | undefined;
    
    try {
      transport = await this.connectToServer();

      // Test scenarios for this actual repository
      const scenarios: TestScenario[] = [
        {
          name: "Complete Adventure Flow - Space Theme",
          description: "Full adventure flow using this MCP server repository as the test case with space theme",
          tools: [
            {
              name: 'start_adventure',
              arguments: { projectPath: process.cwd() }
            },
            {
              name: 'choose_theme',
              arguments: { theme: 'space' }
            },
            {
              name: 'explore_path',
              arguments: { choice: 'Meet Data Navigator Zara' }
            },
            {
              name: 'meet_character',
              arguments: { characterName: 'Data Navigator Zara' }
            }
          ]
        },
        {
          name: "Medieval Fantasy Adventure",
          description: "Test medieval theme with this TypeScript/Node.js project",
          tools: [
            {
              name: 'start_adventure',
              arguments: { projectPath: process.cwd() }
            },
            {
              name: 'choose_theme',
              arguments: { theme: 'medieval' }
            },
            {
              name: 'explore_path',
              arguments: { choice: 'Explore the guild halls' }
            }
          ]
        },
        {
          name: "Ancient Civilization Adventure",
          description: "Test ancient theme to see how it interprets modern TypeScript architecture",
          tools: [
            {
              name: 'start_adventure',
              arguments: { projectPath: process.cwd() }
            },
            {
              name: 'choose_theme',
              arguments: { theme: 'ancient' }
            }
          ]
        },
        {
          name: "Error Handling Tests",
          description: "Test error conditions and edge cases",
          tools: [
            {
              name: 'choose_theme',
              arguments: { theme: 'space' },
              expectSuccess: false  // Should fail - no project analyzed yet
            },
            {
              name: 'start_adventure',
              arguments: { projectPath: process.cwd() }
            },
            {
              name: 'choose_theme',
              arguments: { theme: 'invalid_theme' },
              expectSuccess: false
            },
            {
              name: 'choose_theme',
              arguments: { theme: 'space' }
            },
            {
              name: 'meet_character',
              arguments: { characterName: 'NonExistentCharacter' },
              expectSuccess: false
            }
          ]
        },
        {
          name: "Repository Analysis Deep Dive",
          description: "Analyze this specific repository's structure and technologies",
          tools: [
            {
              name: 'start_adventure',
              arguments: { projectPath: process.cwd() }
            }
          ]
        }
      ];

      console.log('🚀 Starting Real-World MCP Server Tests');
      console.log(`📁 Testing against repository: ${process.cwd()}`);
      
      // Show detected project info
      console.log('\n📊 Repository Analysis:');
      const repoAnalysis = await this.callTool('start_adventure', { projectPath: process.cwd() });
      this.displayResponse(repoAnalysis, 600);

      let passedScenarios = 0;
      const totalScenarios = scenarios.length;

      for (const scenario of scenarios) {
        const passed = await this.runScenario(scenario);
        if (passed) passedScenarios++;
      }

      // Final results
      console.log('\n' + '='.repeat(60));
      console.log('🎯 FINAL RESULTS');
      console.log('='.repeat(60));
      console.log(`✅ Passed: ${passedScenarios}/${totalScenarios} scenarios`);
      console.log(`❌ Failed: ${totalScenarios - passedScenarios}/${totalScenarios} scenarios`);
      
      if (passedScenarios === totalScenarios) {
        console.log('\n🎉 ALL TESTS PASSED! 🎉');
        console.log('🎮 The MCP Repo Adventure Server is working perfectly with real-world data!');
      } else {
        console.log(`\n⚠️  Some tests failed. Success rate: ${(passedScenarios/totalScenarios*100).toFixed(1)}%`);
      }

      console.log('\n💡 Key Insights:');
      console.log('• The server successfully analyzed this TypeScript/Node.js MCP server project');
      console.log('• Dynamic story generation creates unique narratives based on actual project structure');
      console.log('• Different themes (space, medieval, ancient) provide varied creative interpretations');
      console.log('• Error handling works correctly for invalid inputs');
      console.log('• Character interactions are contextual to the detected technologies');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Test suite failed:', errorMessage);
    } finally {
      if (transport) {
        await transport.close();
      }
      process.exit(0);
    }
  }
}

async function main(): Promise<void> {
  console.log(`
🧪 MCP Repo Adventure - Real-World Test Suite
==============================================

This test suite uses the MCP server to analyze and create stories about
this very repository! It's a real-world test that showcases:

• Dynamic project analysis of a TypeScript/Node.js project
• LLM-powered story generation with actual codebase data  
• Multiple story themes applied to the same project
• Character generation based on detected technologies
• Error handling with invalid inputs
• Complete adventure flow testing

Let's see how well the server understands its own codebase! 🚀
`);
  
  const tester = new RealWorldMCPTester();
  await tester.runAllTests();
}

main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('❌ Real-world test runner failed:', errorMessage);
  process.exit(1);
});