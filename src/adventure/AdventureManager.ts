import { Story, Character } from '../shared/types.js';
import { ProjectInfo } from '../analyzer/ProjectAnalyzer.js';

export interface AdventureChoice {
  id: string;
  text: string;
  description: string;
  target: string; // character name, area, or special action
}

export interface AdventureResult {
  narrative: string;
  choices?: string[];
  characterMet?: Character;
  completed?: boolean;
}

export interface AdventureState {
  currentStory?: Story;
  visitedCharacters: Set<string>;
  exploredAreas: Set<string>;
  currentLocation: string;
  adventureProgress: number;
}

interface AdventureContext {
  projectInfo?: ProjectInfo;
  currentTheme?: string;
  visitedLocations: Set<string>;
}

export class AdventureManager {
  private state: AdventureState = {
    visitedCharacters: new Set(),
    exploredAreas: new Set(),
    currentLocation: 'entrance',
    adventureProgress: 0
  };

  private context: AdventureContext = {
    visitedLocations: new Set()
  };

  setCurrentStory(story: Story) {
    this.state.currentStory = story;
    this.state.visitedCharacters.clear();
    this.state.exploredAreas.clear();
    this.state.currentLocation = 'entrance';
    this.state.adventureProgress = 0;
  }

  setContext(projectInfo: ProjectInfo, theme: string) {
    this.context.projectInfo = projectInfo;
    this.context.currentTheme = theme;
  }

  async makeChoice(choice: string): Promise<AdventureResult> {
    if (!this.state.currentStory) {
      throw new Error('No story is currently active. Please choose a theme first.');
    }

    // Handle specific adventure paths first (enhanced functionality)
    const lowerChoice = choice.toLowerCase();
    
    if (lowerChoice.includes('configuration cavern') || lowerChoice === '1') {
      return this.exploreConfiguration();
    } else if (lowerChoice.includes('main quest') || lowerChoice === '2') {
      return this.exploreMainQuest();
    } else if (lowerChoice.includes('dependency nexus')) {
      return this.exploreDependencies();
    } else if (lowerChoice.includes('character gallery')) {
      return this.exploreCharacters();
    }

    // Fall back to basic choice parsing (original functionality)
    const action = this.parseChoice(choice);
    
    switch (action.type) {
      case 'meet_character':
        return await this.handleMeetCharacter(action.target);
      case 'explore_area':
        return await this.handleExploreArea(action.target);
      case 'investigate':
        return await this.handleInvestigate(action.target);
      default:
        return this.handleGenericChoice(choice);
    }
  }

  async getCharacterInfo(characterName: string): Promise<Character> {
    if (!this.state.currentStory) {
      throw new Error('No story is currently active.');
    }

    const character = this.state.currentStory.characters.find(
      c => c.name.toLowerCase().includes(characterName.toLowerCase()) ||
           characterName.toLowerCase().includes(c.name.toLowerCase())
    );

    if (!character) {
      throw new Error(`Character "${characterName}" not found in the current story.`);
    }

    this.state.visitedCharacters.add(character.name);
    return character;
  }

  // Enhanced adventure exploration methods
  private async exploreConfiguration(): Promise<AdventureResult> {
    if (!this.context.projectInfo) {
      return {
        narrative: "The mists of uncertainty cloud your vision. You must first analyze a project!",
        choices: []
      };
    }

    const configFiles = this.context.projectInfo.structure.configFiles;
    const theme = this.context.currentTheme || 'space';
    
    const narratives = {
      space: `🚀 **The Configuration Nebula**

You drift into a shimmering cloud of cosmic data streams. Here, the fundamental laws of your starship are defined. Floating before you are ${configFiles.length} crystalline data cores:

${configFiles.slice(0, 5).map(file => `• **${file}** - A ${this.getConfigDescription(file, 'space')}`).join('\n')}

The configuration systems hum with power, ready to reveal their secrets.`,

      medieval: `🏰 **The Configuration Caverns**

You descend into ancient stone chambers where magical scrolls determine the kingdom's fate. Here lie ${configFiles.length} mystical parchments:

${configFiles.slice(0, 5).map(file => `• **${file}** - A ${this.getConfigDescription(file, 'medieval')}`).join('\n')}

The magical energies pulse through these ancient texts.`,

      ancient: `🏺 **The Configuration Temple**

You enter a sacred temple where stone tablets hold the laws of the realm. Before you are ${configFiles.length} carved monuments:

${configFiles.slice(0, 5).map(file => `• **${file}** - A ${this.getConfigDescription(file, 'ancient')}`).join('\n')}

The ancient wisdom emanates from these sacred artifacts.`
    };

    this.context.visitedLocations.add('configuration');
    
    return {
      narrative: narratives[theme as keyof typeof narratives] || narratives.space,
      choices: [
        'Examine the primary configuration',
        'Investigate dependency management',
        'Return to the main quest'
      ]
    };
  }

  private async exploreMainQuest(): Promise<AdventureResult> {
    if (!this.context.projectInfo) {
      return {
        narrative: "You need to analyze a project first!",
        choices: []
      };
    }

    const theme = this.context.currentTheme || 'space';
    const entryPoint = this.context.projectInfo.codeAnalysis.entryPoints[0] || 'src/index.ts';
    
    const narratives = {
      space: `🚀 **The Core Systems**

You navigate to the heart of the starship's operations. The main reactor (**${entryPoint}**) pulses with energy, coordinating all ship systems. From here, data flows to ${this.context.projectInfo.codeAnalysis.functions.length} operational subroutines.

The ship's neural network processes ${this.context.projectInfo.mainTechnologies.join(', ')} technologies in perfect harmony.`,

      medieval: `🏰 **The Great Hall**

You enter the kingdom's grand hall where the main quest begins. The central command (**${entryPoint}**) coordinates ${this.context.projectInfo.codeAnalysis.functions.length} loyal subjects in their duties.

The realm operates through the magical arts of ${this.context.projectInfo.mainTechnologies.join(', ')}.`,

      ancient: `🏺 **The Central Chamber**

You discover the civilization's nerve center. The primary control (**${entryPoint}**) orchestrates ${this.context.projectInfo.codeAnalysis.functions.length} ceremonial processes.

This advanced society mastered ${this.context.projectInfo.mainTechnologies.join(', ')} long ago.`
    };

    return {
      narrative: narratives[theme as keyof typeof narratives] || narratives.space,
      choices: [
        'Examine the entry point',
        'Explore the function network',
        'Investigate the data flow'
      ]
    };
  }

  private async exploreDependencies(): Promise<AdventureResult> {
    if (!this.context.projectInfo) {
      return {
        narrative: "You need to analyze a project first!",
        choices: []
      };
    }

    const dependencies = this.context.projectInfo.codeAnalysis.dependencies;
    const theme = this.context.currentTheme || 'space';
    
    const narratives = {
      space: `🚀 **The Alliance Network**

You access the starship's alliance database. Connected to your vessel are ${dependencies.length} allied systems:

${dependencies.slice(0, 8).map(dep => `• **${dep.name}** - ${dep.type} alliance`).join('\n')}

These partnerships provide essential resources and capabilities.`,

      medieval: `🏰 **The Trade Network**

You examine the kingdom's trade relationships. The realm maintains ${dependencies.length} important alliances:

${dependencies.slice(0, 8).map(dep => `• **${dep.name}** - ${dep.type} trading partner`).join('\n')}

These alliances strengthen the kingdom's capabilities.`,

      ancient: `🏺 **The Network of Knowledge**

You discover the civilization's knowledge network. They maintained ${dependencies.length} connections:

${dependencies.slice(0, 8).map(dep => `• **${dep.name}** - ${dep.type} knowledge source`).join('\n')}

These connections enabled their advanced society.`
    };

    return {
      narrative: narratives[theme as keyof typeof narratives] || narratives.space,
      choices: [
        'Examine critical dependencies',
        'Investigate version compatibility',
        'Return to exploration'
      ]
    };
  }

  private async exploreCharacters(): Promise<AdventureResult> {
    if (!this.state.currentStory) {
      return {
        narrative: "No story is active!",
        choices: []
      };
    }

    const characters = this.state.currentStory.characters;
    const theme = this.context.currentTheme || 'space';
    
    const narratives = {
      space: `🚀 **The Crew Quarters**

You enter the crew quarters where the ship's inhabitants reside. ${characters.length} beings work together to maintain this cosmic vessel:

${characters.slice(0, 6).map(char => `• **${char.name}** - ${char.role}`).join('\n')}

Each crew member specializes in different aspects of the ship's operation.`,

      medieval: `🏰 **The Royal Court**

You arrive at the royal court where ${characters.length} important figures serve the realm:

${characters.slice(0, 6).map(char => `• **${char.name}** - ${char.role}`).join('\n')}

Each courtier has their own expertise and domain.`,

      ancient: `🏺 **The Council Chamber**

You discover the council chamber where ${characters.length} wise figures once gathered:

${characters.slice(0, 6).map(char => `• **${char.name}** - ${char.role}`).join('\n')}

Each member contributed their unique knowledge to the civilization.`
    };

    return {
      narrative: narratives[theme as keyof typeof narratives] || narratives.space,
      choices: characters.slice(0, 3).map(char => `Meet ${char.name}`)
    };
  }

  // Basic adventure methods (from original AdventureManager)
  private parseChoice(choice: string): { type: string; target: string } {
    const lowerChoice = choice.toLowerCase();
    
    if (lowerChoice.includes('meet') || lowerChoice.includes('talk')) {
      const target = choice.replace(/meet|talk to|with/gi, '').trim();
      return { type: 'meet_character', target };
    }
    
    if (lowerChoice.includes('explore') || lowerChoice.includes('go to')) {
      const target = choice.replace(/explore|go to/gi, '').trim();
      return { type: 'explore_area', target };
    }
    
    if (lowerChoice.includes('investigate') || lowerChoice.includes('examine')) {
      const target = choice.replace(/investigate|examine/gi, '').trim();
      return { type: 'investigate', target };
    }
    
    return { type: 'generic', target: choice };
  }

  private async handleMeetCharacter(characterName: string): Promise<AdventureResult> {
    try {
      const character = await this.getCharacterInfo(characterName);
      return {
        narrative: `You meet **${character.name}**. ${character.description}`,
        characterMet: character,
        choices: ['Continue conversation', 'Ask about their work', 'Leave']
      };
    } catch (error) {
      return {
        narrative: `You couldn't find anyone named "${characterName}". Try meeting someone else.`,
        choices: this.state.currentStory?.characters.slice(0, 3).map(c => `Meet ${c.name}`) || []
      };
    }
  }

  private async handleExploreArea(area: string): Promise<AdventureResult> {
    this.state.exploredAreas.add(area);
    this.state.adventureProgress += 10;
    
    return {
      narrative: `You explore the ${area}. It's an interesting place with many secrets to discover.`,
      choices: ['Look around more', 'Meet someone here', 'Go somewhere else']
    };
  }

  private async handleInvestigate(target: string): Promise<AdventureResult> {
    return {
      narrative: `You investigate ${target}. Your careful examination reveals interesting details about how this works.`,
      choices: ['Investigate further', 'Try something else', 'Ask for help']
    };
  }

  private async handleGenericChoice(choice: string): Promise<AdventureResult> {
    this.state.adventureProgress += 5;
    
    return {
      narrative: `You decide to ${choice}. The adventure continues with new possibilities ahead.`,
      choices: ['Keep exploring', 'Try a different approach', 'Seek guidance']
    };
  }

  // Helper methods
  private getConfigDescription(filename: string, theme: string): string {
    const descriptions = {
      space: {
        'package.json': 'primary ship manifest',
        'tsconfig.json': 'navigation protocol matrix',
        '.env': 'classified mission parameters',
        'webpack.config.js': 'cargo bay organization system',
        'vite.config.ts': 'energy distribution network',
        'default': 'cosmic configuration array'
      },
      medieval: {
        'package.json': 'royal decree scroll',
        'tsconfig.json': 'magical incantation rules',
        '.env': 'secret spell components',
        'webpack.config.js': 'fortress defense blueprint',
        'vite.config.ts': 'mystical energy conduit',
        'default': 'ancient enchanted scroll'
      },
      ancient: {
        'package.json': 'sacred law tablet',
        'tsconfig.json': 'ceremonial ritual guide',
        '.env': 'hidden temple secrets',
        'webpack.config.js': 'architectural blueprint',
        'vite.config.ts': 'power distribution map',
        'default': 'mysterious stone inscription'
      }
    };

    const themeDescriptions = descriptions[theme as keyof typeof descriptions] || descriptions.space;
    return themeDescriptions[filename as keyof typeof themeDescriptions] || themeDescriptions.default;
  }
}