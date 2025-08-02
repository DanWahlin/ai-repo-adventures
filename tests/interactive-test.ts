#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult, TextContent, Tool } from '@modelcontextprotocol/sdk/types.js';
import * as readline from 'readline';
import * as path from 'path';

// ANSI color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
};

class InteractiveMCPClient {
  private client: Client;
  private transport?: StdioClientTransport;
  private tools: Map<string, Tool> = new Map();
  private rl: readline.Interface;
  private currentProject: string = process.cwd();
  private adventureStarted: boolean = false;
  private currentTheme?: string;

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
    console.log(`${colors.cyan}🔌 Connecting to MCP Repo Adventure Server...${colors.reset}`);
    
    this.transport = new StdioClientTransport({
      command: 'node',
      args: [path.join(process.cwd(), 'dist/index.js')],
      env: process.env as Record<string, string>,
    });

    await this.client.connect(this.transport);
    
    // Get available tools
    const result = await this.client.listTools();
    result.tools.forEach(tool => {
      this.tools.set(tool.name, tool);
    });

    console.log(`${colors.green}✅ Connected successfully!${colors.reset}`);
    console.log(`${colors.dim}Available tools: ${Array.from(this.tools.keys()).join(', ')}${colors.reset}\n`);
  }

  private formatText(text: string): string {
    // Format markdown-style text for terminal
    return text
      .replace(/\*\*(.*?)\*\*/g, `${colors.bright}$1${colors.reset}`) // Bold
      .replace(/`(.*?)`/g, `${colors.cyan}$1${colors.reset}`) // Code
      .replace(/^(#{1,3}) (.*)$/gm, `${colors.yellow}$2${colors.reset}`) // Headers
      .replace(/^🚀/gm, `${colors.blue}🚀${colors.reset}`) // Space emoji
      .replace(/^🏰/gm, `${colors.magenta}🏰${colors.reset}`) // Castle emoji
      .replace(/^🏺/gm, `${colors.yellow}🏺${colors.reset}`); // Ancient emoji
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
      return `${colors.red}Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}`;
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
    if (lower.includes('space') || lower.includes('mythical') || lower.includes('ancient')) {
      const theme = lower.includes('space') ? 'space' : 
                    lower.includes('mythical') ? 'mythical' : 'ancient';
      return {
        intent: 'choose_theme',
        params: { theme }
      };
    }
    
    // Check if this is a numeric theme selection (adventure started but no theme chosen)
    if (this.adventureStarted && !this.currentTheme && /^[1-3]$/.test(input.trim())) {
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
        intent: 'explore_path',
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
      intent: 'explore_path',
      params: { choice: input }
    };
  }

  private async handleUserInput(input: string): Promise<void> {
    const { intent, params } = this.parseUserInput(input);

    console.log(`${colors.dim}[Processing: ${intent}]${colors.reset}\n`);

    let response: string;
    
    switch (intent) {
      case 'start_adventure':
        response = await this.callTool('start_adventure', params);
        // Check if it was successful
        if (!response.includes('Error') && !response.includes('Failed')) {
          this.adventureStarted = true;
        } else if (response.includes('not a valid directory')) {
          response += `\n\n${colors.yellow}💡 Tip: Use /project to set a valid project path, or just press Enter during setup to use this project.${colors.reset}`;
        }
        break;
        
      case 'choose_theme':
        if (!this.adventureStarted) {
          console.log(`${colors.yellow}💡 Let me start the adventure first...${colors.reset}\n`);
          await this.callTool('start_adventure', { projectPath: this.currentProject });
          this.adventureStarted = true;
        }
        response = await this.callTool('choose_theme', params);
        this.currentTheme = params.theme;
        break;
        
      case 'meet_character':
        response = await this.callTool('meet_character', params);
        break;
        
      case 'explore_path':
        response = await this.callTool('explore_path', params);
        break;
        
      default:
        response = "I'm not sure what you'd like to do. Try 'start adventure', 'choose space theme', 'meet [character]', or 'explore [area]'.";
    }

    console.log(this.formatText(response));
    console.log('\n' + colors.dim + '─'.repeat(60) + colors.reset + '\n');
  }

  private async setupProject(): Promise<void> {
    return new Promise((resolve) => {
      console.log(`
${colors.yellow}📁 Project Setup${colors.reset}
Current directory: ${colors.cyan}${this.currentProject}${colors.reset}

Would you like to:
  1. Analyze current directory: ${colors.dim}${process.cwd()}${colors.reset}
  2. Enter a different project path

${colors.green}Press Enter for option 1 (default)${colors.reset}
`);

      this.rl.question(`${colors.bright}Choose (1-2 or path)>${colors.reset} `, async (input) => {
        const trimmed = input.trim();
        
        if (!trimmed || trimmed === '1') {
          // Default to current directory
          this.currentProject = process.cwd();
          console.log(`${colors.green}✓ Using current directory: ${this.currentProject}${colors.reset}`);
        } else if (trimmed === '2') {
          // Ask for path
          this.rl.question(`${colors.bright}Enter project path>${colors.reset} `, (path) => {
            this.currentProject = path.trim() || process.cwd();
            console.log(`${colors.green}✓ Project set to: ${this.currentProject}${colors.reset}`);
            console.log(`\n${colors.cyan}Ready! Type "start adventure" to begin exploring.${colors.reset}\n`);
            resolve();
          });
          return;
        } else {
          // Assume they entered a path
          this.currentProject = trimmed;
          console.log(`${colors.green}✓ Project set to: ${this.currentProject}${colors.reset}`);
        }
        
        console.log(`\n${colors.cyan}Ready! Type "start adventure" to begin exploring.${colors.reset}\n`);
        resolve();
      });
    });
  }

  private showHelp(): void {
    console.log(`
${colors.bright}🎮 MCP Repo Adventure - Interactive Commands${colors.reset}

${colors.yellow}Starting:${colors.reset}
  • "Start a repo adventure" - Begin analyzing current directory
  • "Start adventure for /path/to/project" - Analyze specific directory

${colors.yellow}Themes:${colors.reset}
  • "I choose the space theme" / "space" - Space exploration theme
  • "Mythical theme please" / "mythical" - Mythical fantasy theme
  • "Let's go ancient" / "ancient" - Ancient civilization theme

${colors.yellow}Exploration:${colors.reset}
  • "Meet [character name]" - Meet a specific character
  • "Explore [area/path]" - Explore a part of the codebase
  • "Go to [location]" - Navigate to a location
  • Just type the choice text shown in the story

${colors.yellow}New Features:${colors.reset}
  • "Review my discoveries" - See your progress and discoveries
  • "Request a hint" - Get helpful guidance
  • "Explore the Configuration Cavern" - Visit configuration files
  • "Enter the Testing Grounds" - Explore test files
  • "Investigate the API Gateway" - Check API routes

${colors.yellow}Commands:${colors.reset}
  • ${colors.cyan}/help${colors.reset} - Show this help
  • ${colors.cyan}/tools${colors.reset} - List available MCP tools
  • ${colors.cyan}/clear${colors.reset} - Clear the screen
  • ${colors.cyan}/project [path]${colors.reset} - Change project directory
  • ${colors.cyan}/progress${colors.reset} - Quick progress check
  • ${colors.cyan}/exit${colors.reset} or ${colors.cyan}/quit${colors.reset} - Exit the client
`);
  }

  async start(): Promise<void> {
    console.clear();
    console.log(`
${colors.bgBlue}${colors.white}${colors.bright} 🚀 MCP Repo Adventure - Interactive Test Client ${colors.reset}
${colors.dim}────────────────────────────────────────────────${colors.reset}

Welcome! This is an interactive client for testing the MCP Repo Adventure server.

${colors.yellow}✨ NEW FEATURES:${colors.reset}
• Dynamic choices based on exploration
• Progress tracking and discoveries journal
• Hint system for guidance
• Code snippets when meeting characters
• New areas: Testing Grounds, API Gateway, Configuration Cavern

Type ${colors.cyan}/help${colors.reset} for available commands, or just start chatting!
`);

    await this.connectToServer();

    // Ask for project path or use default
    await this.setupProject();

    // Main interaction loop
    const prompt = () => {
      this.rl.question(`${colors.bright}You>${colors.reset} `, async (input) => {
        const trimmed = input.trim();

        // Handle special commands
        if (trimmed.startsWith('/')) {
          const command = trimmed.toLowerCase();
          
          if (command === '/help') {
            this.showHelp();
          } else if (command === '/tools') {
            console.log(`\n${colors.yellow}Available MCP Tools:${colors.reset}`);
            this.tools.forEach((tool, name) => {
              console.log(`  • ${colors.cyan}${name}${colors.reset} - ${tool.description}`);
            });
            console.log();
          } else if (command === '/clear') {
            console.clear();
          } else if (command.startsWith('/project')) {
            const newPath = trimmed.substring(8).trim() || process.cwd();
            this.currentProject = newPath;
            console.log(`${colors.green}✓ Project directory set to: ${newPath}${colors.reset}\n`);
          } else if (command === '/progress') {
            // Quick progress check
            const response = await this.callTool('explore_path', { choice: 'Review your discoveries' });
            console.log(this.formatText(response));
            console.log('\n' + colors.dim + '─'.repeat(60) + colors.reset + '\n');
          } else if (command === '/exit' || command === '/quit') {
            await this.cleanup();
            return;
          } else {
            console.log(`${colors.red}Unknown command. Type /help for available commands.${colors.reset}\n`);
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
    console.log(`\n${colors.cyan}Thanks for exploring! Goodbye! 👋${colors.reset}\n`);
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
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});