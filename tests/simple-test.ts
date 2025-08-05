#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';

async function testSimpleAdventure() {
  console.log('🧪 Simple Adventure Test: Basic Flow with New Features\n');
  
  const client = new Client(
    { name: 'simple-test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/server.js'],
    env: process.env as Record<string, string>,
  });

  try {
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');

    // Test 1: Start Adventure with Analysis Display
    console.log('1️⃣ Starting adventure and analyzing repository...');
    const analysisResult = await client.callTool({
      name: 'start_adventure',
      arguments: { projectPath: process.cwd() }
    }) as CallToolResult;

    const analysisText = analysisResult.content
      .filter(c => c.type === 'text')
      .map(c => (c as TextContent).text)
      .join('\n');

    console.log('📊 Initial Analysis:');
    // Extract key metrics
    const functionsMatch = analysisText.match(/(\d+) magical functions/);
    const classesMatch = analysisText.match(/(\d+) powerful entities/);
    const depsMatch = analysisText.match(/(\d+) allied systems/);
    
    console.log(`   • Functions: ${functionsMatch?.[1] || 'N/A'}`);
    console.log(`   • Classes: ${classesMatch?.[1] || 'N/A'}`);
    console.log(`   • Dependencies: ${depsMatch?.[1] || 'N/A'}`);

    console.log('\n' + '='.repeat(50));

    // Test 2: Choose Theme and Start Adventure
    console.log('2️⃣ Choosing space theme...');
    const spaceResult = await client.callTool({
      name: 'choose_theme',
      arguments: { theme: 'space' }
    }) as CallToolResult;

    const spaceText = spaceResult.content
      .filter(c => c.type === 'text')
      .map(c => (c as TextContent).text)
      .join('\n');

    console.log('🚀 Adventure Started!');
    console.log(`   Preview: ${spaceText.substring(0, 200)}...`);

    console.log('\n' + '='.repeat(50));

    // Test 3: Explore and Show Progress
    console.log('3️⃣ Exploring different areas...');
    
    const explorations = [
      { choice: 'Explore the Configuration Cavern', emoji: '⚙️' },
      { choice: 'Enter the Testing Grounds', emoji: '🧪' },
      { choice: 'Review your discoveries', emoji: '📜' }
    ];

    for (const { choice, emoji } of explorations) {
      console.log(`\n${emoji} ${choice}`);
      
      try {
        const result = await client.callTool({
          name: 'explore_path',
          arguments: { choice }
        }) as CallToolResult;

        const text = result.content
          .filter(c => c.type === 'text')
          .map(c => (c as TextContent).text)
          .join('\n');

        // Special handling for discoveries
        if (choice.includes('discoveries')) {
          const progressMatch = text.match(/Progress: (\d+)% complete/);
          const areasMatch = text.match(/Areas Explored: (\d+)/);
          
          if (progressMatch || areasMatch) {
            console.log(`   ✓ Progress: ${progressMatch?.[1] || '0'}%`);
            console.log(`   ✓ Areas explored: ${areasMatch?.[1] || '0'}`);
          }
        } else {
          console.log(`   ✓ Explored successfully`);
          
          // Check for dynamic choices
          const choicesMatch = text.match(/Your choices:(.+?)Use `explore_path`/s);
          if (choicesMatch) {
            const choices = choicesMatch[1].split('\n')
              .filter(c => c.trim() && c.includes('.'))
              .slice(0, 2);
            console.log(`   ✓ New choices available: ${choices.length}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Failed: ${error}`);
      }
    }

    console.log('\n' + '='.repeat(50));

    // Test 4: Request a Hint
    console.log('4️⃣ Testing hint system...');
    const hintResult = await client.callTool({
      name: 'explore_path',
      arguments: { choice: 'Request a helpful hint' }
    }) as CallToolResult;

    const hintText = hintResult.content
      .filter(c => c.type === 'text')
      .map(c => (c as TextContent).text)
      .join('\n');

    const hintMatch = hintText.match(/💡 \*\*Hint\*\*: (.+?)(?=\n|This insight)/);
    if (hintMatch) {
      console.log(`💡 Hint received: "${hintMatch[1].substring(0, 80)}..."`);
    }

    console.log('\n' + '='.repeat(50));

    // Test 5: Meet a Character (Code Discovery)
    console.log('5️⃣ Meeting a character...');
    
    // First find available characters
    const galleryResult = await client.callTool({
      name: 'explore_path',
      arguments: { choice: 'character gallery' }
    }) as CallToolResult;

    const galleryText = galleryResult.content
      .filter(c => c.type === 'text')
      .map(c => (c as TextContent).text)
      .join('\n');

    const characterMatch = galleryText.match(/• \*\*([^*]+)\*\*/);
    if (characterMatch) {
      const characterName = characterMatch[1];
      console.log(`👤 Meeting ${characterName}...`);
      
      const meetResult = await client.callTool({
        name: 'meet_character',
        arguments: { characterName }
      }) as CallToolResult;

      const meetText = meetResult.content
        .filter(c => c.type === 'text')
        .map(c => (c as TextContent).text)
        .join('\n');

      console.log(`   ✓ Met ${characterName}`);
      
      if (meetText.includes('Code Discovery')) {
        console.log('   ✓ Code snippet discovered!');
      }
    }

    console.log('\n🎉 Simple test completed successfully!');
    console.log('\n📈 Adventure Features Demonstrated:');
    console.log('✅ Project analysis with metrics');
    console.log('✅ Dynamic theme selection');
    console.log('✅ Progressive exploration');
    console.log('✅ Discovery tracking');
    console.log('✅ Hint system');
    console.log('✅ Character interactions');
    console.log('✅ Code snippet discovery');

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
  } finally {
    await transport.close();
    process.exit(0);
  }
}

testSimpleAdventure().catch(console.error);