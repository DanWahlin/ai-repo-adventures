#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult, TextContent, Tool } from '@modelcontextprotocol/sdk/types.js';
import * as readline from 'readline';
import * as path from 'path';
import chalk from 'chalk';


class InteractiveMCPClient {
  private client: Client;
  private transport?: StdioClientTransport;
  private tools: Map<string, Tool> = new Map();
  private rl: readline.Interface;
  private currentProject: string = process.cwd();
  private adventureStarted: boolean = false;
  private currentTheme?: string;
  private awaitingCustomTheme: boolean = false;
  private customThemeData: { name?: string; description?: string; keywords?: string[] } = {};

  constructor() {
    this.client = new Client(
      { name: 'interactive-test-client', version: '1.0.0' },
      { capabilities: {} }
    );

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private async connectToServer(): Promise<void> {
    console.log(chalk.cyan('🔌 Connecting to MCP Repo Adventure Server...'));
    
    this.transport = new StdioClientTransport({
      command: 'node',
      args: [path.join(process.cwd(), 'packages/mcp/dist/server.js')],
      env: process.env as Record<string, string>,
    });

    await this.client.connect(this.transport);
    
    // Get available tools
    const result = await this.client.listTools();
    result.tools.forEach(tool => {
      this.tools.set(tool.name, tool);
    });

    console.log(chalk.green('✅ Connected successfully!'));
    console.log(chalk.dim(`Available tools: ${Array.from(this.tools.keys()).join(', ')}`) + '\n');
  }

  private async handleCustomTheme(): Promise<void> {
    console.log(chalk.cyan('\n✨ Creating a Custom Theme Adventure!\n'));
    
    // Collect custom theme data interactively
    const customTheme = await new Promise<{ name: string; description: string; keywords: string[] }>((resolve) => {
      const themeData: { name?: string; description?: string; keywords?: string[] } = {};
      
      // Step 1: Get theme name
      this.rl.question(chalk.bold('Theme Name (e.g., "Pirate Adventure", "Cyberpunk"): '), (name) => {
        themeData.name = name.trim();
        
        // Step 2: Get theme description
        this.rl.question(chalk.bold('Theme Description (e.g., "A swashbuckling journey across the seven seas of code"): '), (desc) => {
          themeData.description = desc.trim();
          
          // Step 3: Get keywords
          this.rl.question(chalk.bold('Keywords (comma-separated, e.g., "pirate, ship, treasure, ocean"): '), (keywordsInput) => {
            themeData.keywords = keywordsInput.split(',').map(k => k.trim()).filter(k => k.length > 0);
            
            // Validate we have all required data
            if (!themeData.name || !themeData.description || !themeData.keywords || themeData.keywords.length === 0) {
              console.log(chalk.red('\n❌ Custom theme requires a name, description, and at least one keyword. Please try again.\n'));
              this.handleCustomTheme(); // Retry
              return;
            }
            
            resolve(themeData as { name: string; description: string; keywords: string[] });
          });
        });
      });
    });
    
    // Display what we're creating
    console.log(chalk.green('\n✅ Creating custom theme:'));
    console.log(chalk.dim(`  Name: ${customTheme.name}`));
    console.log(chalk.dim(`  Description: ${customTheme.description}`));
    console.log(chalk.dim(`  Keywords: ${customTheme.keywords.join(', ')}`));
    console.log();
    
    // Call the tool with custom theme data
    const response = await this.callTool('choose_theme', {
      theme: 'custom',
      customTheme
    });
    
    this.currentTheme = 'custom';
    console.log(this.formatText(response));
    console.log('\n' + chalk.dim('─'.repeat(60)) + '\n');
  }

  private formatText(text: string): string {
    // Format markdown-style text for terminal
    let formatted = text;
    
    // First, protect template literals by temporarily replacing them
    const templateLiterals: string[] = [];
    formatted = formatted.replace(/`[^`]*\$\{[^}]*\}[^`]*`/g, (match) => {
      const placeholder = `__TEMPLATE_LITERAL_${templateLiterals.length}__`;
      templateLiterals.push(match);
      return placeholder;
    });
    
    // Now safely process markdown formatting
    formatted = formatted
      .replace(/\*\*(.*?)\*\*/g, (_, p1) => chalk.bold(p1)) // Bold
      .replace(/```(?:[a-zA-Z]*\n)?([\s\S]*?)\n```/g, (_, p1) => chalk.gray(p1)) // Code blocks
      .replace(/`([^`\n]+)`/g, (_, p1) => chalk.cyan(p1)) // Inline code (now safe)
      .replace(/^(#{1,3}) (.*)$/gm, (_, p1, p2) => chalk.yellow(p2)) // Headers
      .replace(/^🚀/gm, chalk.blue('🚀')) // Space emoji
      .replace(/^🏰/gm, chalk.magenta('🏰')) // Castle emoji
      .replace(/^🏺/gm, chalk.yellow('🏺')); // Ancient emoji
    
    // Restore template literals
    templateLiterals.forEach((literal, index) => {
      formatted = formatted.replace(`__TEMPLATE_LITERAL_${index}__`, literal);
    });
    
    return formatted;
  }

  private async callTool(toolName: string, args: Record<string, any>): Promise<string> {
    // Display what operation is happening
    const operationMap: Record<string, string> = {
      'start_adventure': '🚀 Analyzing project and generating theme options',
      'choose_theme': '📖 Generating themed story and quest adventures',
      'explore_quest': '🗺️ Exploring quest and generating walkthrough',
      'view_progress': '📊 Checking adventure progress'
    };
    
    const operation = operationMap[toolName] || `🔧 Executing ${toolName}`;
    console.log(chalk.dim(`${operation}...`));
    
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
      return chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  private parseUserInput(input: string): { intent: string; params: any } {
    const lower = input.toLowerCase();

    // Start adventure
    if (lower.includes('start') && (lower.includes('adventure') || lower.includes('repo'))) {
      const pathMatch = input.match(/(?:for|at|in)\s+(.+)$/);
      let projectPath = this.currentProject;
      
      if (pathMatch && pathMatch[1]) {
        const matchedPath = pathMatch[1].trim();
        // Handle "this project" or "this"
        if (matchedPath === 'this' || matchedPath === 'this project') {
          projectPath = this.currentProject;
        } else {
          projectPath = matchedPath;
        }
      }
      
      return {
        intent: 'start_adventure',
        params: { projectPath }
      };
    }

    // Choose theme
    if (lower.includes('space') || lower.includes('mythical') || lower.includes('ancient') || lower.includes('developer') || lower.includes('custom')) {
      const theme = lower.includes('space') ? 'space' : 
                    lower.includes('mythical') ? 'mythical' :
                    lower.includes('ancient') ? 'ancient' :
                    lower.includes('developer') ? 'developer' : 'custom';
      return {
        intent: 'choose_theme',
        params: { theme }
      };
    }
    
    // Check if this is a numeric theme selection (adventure started but no theme chosen)
    if (this.adventureStarted && !this.currentTheme && /^[1-5]$/.test(input.trim())) {
      return {
        intent: 'choose_theme',
        params: { theme: input.trim() }  // Pass the number directly, the tool will handle conversion
      };
    }

    // Meet character
    if (lower.includes('meet') || lower.includes('talk')) {
      const afterMeet = input.substring(input.toLowerCase().indexOf('meet') + 4).trim();
      const afterTalk = input.substring(input.toLowerCase().indexOf('talk') + 4).trim();
      const characterName = (afterMeet || afterTalk).replace(/^to\s+/, '');
      return {
        intent: 'meet_character',
        params: { characterName }
      };
    }

    // Explore path
    if (lower.includes('explore') || lower.includes('go') || lower.includes('choose')) {
      return {
        intent: 'explore_quest',
        params: { choice: input }
      };
    }

    // Default behavior: if adventure started but no theme chosen, treat as theme selection
    if (this.adventureStarted && !this.currentTheme) {
      // Assume user is trying to select a theme
      return {
        intent: 'choose_theme',
        params: { theme: input }
      };
    }
    
    // Otherwise default to exploration
    return {
      intent: 'explore_quest',
      params: { choice: input }
    };
  }

  private async handleUserInput(input: string): Promise<void> {
    const { intent, params } = this.parseUserInput(input);

    let response: string;
    
    switch (intent) {
      case 'start_adventure':
        response = await this.callTool('start_adventure', params);
        // Check if it was successful
        if (!response.includes('Error') && !response.includes('Failed')) {
          this.adventureStarted = true;
        } else if (response.includes('not a valid directory')) {
          response += `\n\n${chalk.yellow('💡 Tip: Use /project to set a valid project path, or just press Enter during setup to use this project.')}`;
        }
        break;
        
      case 'choose_theme':
        if (!this.adventureStarted) {
          console.log(chalk.yellow('💡 Let me start the adventure first...\n'));
          await this.callTool('start_adventure', { projectPath: this.currentProject });
          this.adventureStarted = true;
        }
        
        // Handle custom theme specially
        if (params.theme === 'custom' || params.theme === '5') {
          await this.handleCustomTheme();
          return; // handleCustomTheme will handle the response
        }
        
        response = await this.callTool('choose_theme', params);
        this.currentTheme = params.theme;
        break;
        
      case 'meet_character':
        response = await this.callTool('meet_character', params);
        break;
        
      case 'explore_quest':
        response = await this.callTool('explore_quest', params);
        break;
        
      default:
        response = "I'm not sure what you'd like to do. Try 'start adventure', 'choose space theme', 'meet [character]', or 'explore [area]'.";
    }

    console.log(this.formatText(response));
    console.log('\n' + chalk.dim('─'.repeat(60)) + '\n');
  }

  private async setupProject(): Promise<void> {
    return new Promise((resolve) => {
      console.log(`
${chalk.yellow('📁 Project Setup')}
Current directory: ${chalk.cyan(this.currentProject)}

Would you like to:
  1. Analyze current directory: ${chalk.dim(process.cwd())}
  2. Enter a different project path

${chalk.green('Press Enter for option 1 (default)')}
`);

      this.rl.question(chalk.bold('Choose (1-2 or path)> '), async (input) => {
        const trimmed = input.trim();
        
        if (!trimmed || trimmed === '1') {
          // Default to current directory
          this.currentProject = process.cwd();
          console.log(chalk.green(`✓ Using current directory: ${this.currentProject}`));
        } else if (trimmed === '2') {
          // Ask for path
          this.rl.question(chalk.bold('Enter project path> '), (path) => {
            this.currentProject = path.trim() || process.cwd();
            console.log(chalk.green(`✓ Project set to: ${this.currentProject}`));
            console.log('\n' + chalk.cyan('Ready! Type "start adventure" to begin exploring.') + '\n');
            resolve();
          });
          return;
        } else {
          // Assume they entered a path
          this.currentProject = trimmed;
          console.log(chalk.green(`✓ Project set to: ${this.currentProject}`));
        }
        
        console.log('\n' + chalk.cyan('Ready! Type "start adventure" to begin exploring.') + '\n');
        resolve();
      });
    });
  }

  private showHelp(): void {
    console.log(`
${chalk.bold('🎮 MCP Repo Adventure - Interactive Commands')}

${chalk.yellow('Starting:')}
  • "Start a repo adventure" - Begin analyzing current directory
  • "Start adventure for /path/to/project" - Analyze specific directory

${chalk.yellow('Themes:')}
  • "I choose the space theme" / "space" / "1" - Space exploration theme
  • "Mythical theme please" / "mythical" / "2" - Mythical fantasy theme
  • "Let's go ancient" / "ancient" / "3" - Ancient civilization theme
  • "Developer documentation" / "developer" / "4" - Technical documentation style
  • "Custom theme" / "custom" / "5" - Create your own personalized theme

${chalk.yellow('Exploration:')}
  • "Meet [character name]" - Meet a specific character
  • "Explore [area/path]" - Explore a part of the codebase
  • "Go to [location]" - Navigate to a location
  • Just type the choice text shown in the story

${chalk.yellow('New Features:')}
  • "Review my discoveries" - See your progress and discoveries
  • "Request a hint" - Get helpful guidance
  • "Explore the Configuration Cavern" - Visit configuration files
  • "Enter the Testing Grounds" - Explore test files
  • "Investigate the API Gateway" - Check API routes

${chalk.yellow('Commands:')}
  • ${chalk.cyan('/help')} - Show this help
  • ${chalk.cyan('/tools')} - List available MCP tools
  • ${chalk.cyan('/clear')} - Clear the screen
  • ${chalk.cyan('/project [path]')} - Change project directory
  • ${chalk.cyan('/progress')} - Quick progress check
  • ${chalk.cyan('/exit')} or ${chalk.cyan('/quit')} - Exit the client
`);
  }

  async start(): Promise<void> {
    console.clear();
    console.log(`
${chalk.bgBlue.white.bold(' 🚀 MCP Repo Adventure - Interactive Test Client ')}
${chalk.dim('─'.repeat(48))}

Welcome! This is an interactive client for testing the MCP Repo Adventure server.

${chalk.yellow('✨ NEW FEATURES:')}
• Dynamic choices based on exploration
• Progress tracking and discoveries journal
• Hint system for guidance
• Code snippets when meeting characters
• New areas: Testing Grounds, API Gateway, Configuration Cavern

Type ${chalk.cyan('/help')} for available commands, or just start chatting!
`);

    await this.connectToServer();

    // Ask for project path or use default
    await this.setupProject();

    // Auto-start the adventure
    console.log(chalk.cyan('🚀 Starting adventure automatically...\n'));
    await this.handleUserInput('start adventure');

    // Main interaction loop
    const prompt = () => {
      this.rl.question(chalk.bold('You> '), async (input) => {
        const trimmed = input.trim();

        // Handle special commands
        if (trimmed.startsWith('/')) {
          const command = trimmed.toLowerCase();
          
          if (command === '/help') {
            this.showHelp();
          } else if (command === '/tools') {
            console.log('\n' + chalk.yellow('Available MCP Tools:'));
            this.tools.forEach((tool, name) => {
              console.log(`  • ${chalk.cyan(name)} - ${tool.description}`);
            });
            console.log();
          } else if (command === '/clear') {
            console.clear();
          } else if (command.startsWith('/project')) {
            const newPath = trimmed.substring(8).trim() || process.cwd();
            this.currentProject = newPath;
            console.log(chalk.green(`✓ Project directory set to: ${newPath}`) + '\n');
          } else if (command === '/progress') {
            // Quick progress check
            const response = await this.callTool('view_progress', {});
            console.log(this.formatText(response));
            console.log('\n' + chalk.dim('─'.repeat(60)) + '\n');
          } else if (command === '/exit' || command === '/quit') {
            await this.cleanup();
            return;
          } else {
            console.log(chalk.red('Unknown command. Type /help for available commands.') + '\n');
          }
        } else if (trimmed) {
          // Handle normal conversation
          await this.handleUserInput(trimmed);
        }

        prompt(); // Continue the conversation
      });
    };

    prompt();
  }

  private async cleanup(): Promise<void> {
    console.log('\n' + chalk.cyan('Thanks for exploring! Goodbye! 👋') + '\n');
    this.rl.close();
    if (this.transport) {
      await this.transport.close();
    }
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nReceived interrupt signal...');
  process.exit(0);
});

// Start the interactive client
async function main() {
  const client = new InteractiveMCPClient();
  await client.start();
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});