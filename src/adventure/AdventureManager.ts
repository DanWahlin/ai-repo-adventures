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
  discoveries: string[];
  hintsRevealed: number;
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
    adventureProgress: 0,
    discoveries: [],
    hintsRevealed: 0
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
    this.state.discoveries = [];
    this.state.hintsRevealed = 0;
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
    } else if (lowerChoice.includes('testing grounds')) {
      return this.exploreTestingGrounds();
    } else if (lowerChoice.includes('api gateway')) {
      return this.exploreAPIGateway();
    } else if (lowerChoice.includes('hint')) {
      return this.provideHint();
    } else if (lowerChoice.includes('discoveries')) {
      return this.showDiscoveries();
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
    
    this.state.exploredAreas.add('configuration');
    this.state.adventureProgress += 15;
    
    return {
      narrative: narratives[theme as keyof typeof narratives] || narratives.space,
      choices: this.generateDynamicChoices()
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

    this.state.exploredAreas.add('main');
    this.state.adventureProgress += 20;
    
    return {
      narrative: narratives[theme as keyof typeof narratives] || narratives.space,
      choices: this.generateDynamicChoices()
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

    this.state.exploredAreas.add('dependencies');
    this.state.adventureProgress += 15;
    
    return {
      narrative: narratives[theme as keyof typeof narratives] || narratives.space,
      choices: this.generateDynamicChoices()
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

    this.state.exploredAreas.add('characters');
    this.state.adventureProgress += 10;
    
    return {
      narrative: narratives[theme as keyof typeof narratives] || narratives.space,
      choices: this.generateDynamicChoices()
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
      
      // Add code discovery based on character's technology
      let codeInsight = '';
      if (this.context.projectInfo && character.technology) {
        const relevantFunction = this.context.projectInfo.codeAnalysis.functions.find(f => 
          f.summary.toLowerCase().includes(character.technology.toLowerCase()) ||
          f.fileName.toLowerCase().includes(character.technology.toLowerCase())
        );
        
        if (relevantFunction) {
          codeInsight = `\n\n📜 **Code Discovery**: ${character.name} shows you the \`${relevantFunction.name}\` function:\n\`\`\`\n${relevantFunction.name}(${relevantFunction.parameters.join(', ')})\n// ${relevantFunction.summary}\n// Located in: ${relevantFunction.fileName}\n\`\`\``;
          this.state.discoveries.push(`Function: ${relevantFunction.name} - ${relevantFunction.summary}`);
        }
      }
      
      return {
        narrative: `You meet **${character.name}**. ${character.description}${codeInsight}`,
        characterMet: character,
        choices: ['Ask about their specific expertise', 'Learn about their connections', 'Continue exploring']
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

  private async exploreTestingGrounds(): Promise<AdventureResult> {
    if (!this.context.projectInfo) {
      return {
        narrative: "You need to analyze a project first!",
        choices: []
      };
    }

    const theme = this.context.currentTheme || 'space';
    const testFiles = this.context.projectInfo.structure.sourceFiles.filter(f => 
      f.includes('test') || f.includes('spec')
    );
    
    const narratives = {
      space: `🚀 **The Testing Bay**

You enter the ship's testing facility where quality assurance protocols ensure safe space travel. ${testFiles.length} testing modules are active:

${testFiles.slice(0, 5).map(file => `• **${file}** - Automated safety check`).join('\n')}

The testing systems validate every component before deployment.`,

      medieval: `🏰 **The Proving Grounds**

You discover the training grounds where brave knights test their skills. ${testFiles.length} trials await:

${testFiles.slice(0, 5).map(file => `• **${file}** - Combat trial`).join('\n')}

Here, all magical artifacts are tested before use in the kingdom.`,

      ancient: `🏺 **The Trial Chambers**

You find the ancient testing chambers where artifacts were proven worthy. ${testFiles.length} trials remain:

${testFiles.slice(0, 5).map(file => `• **${file}** - Sacred trial`).join('\n')}

Only the most reliable artifacts passed these rigorous tests.`
    };

    this.state.exploredAreas.add('tests');
    this.state.adventureProgress += 15;
    this.state.discoveries.push('Testing Framework: Ensuring code quality through automated tests');
    
    return {
      narrative: narratives[theme as keyof typeof narratives] || narratives.space,
      choices: this.generateDynamicChoices()
    };
  }

  private async exploreAPIGateway(): Promise<AdventureResult> {
    if (!this.context.projectInfo) {
      return {
        narrative: "You need to analyze a project first!",
        choices: []
      };
    }

    const theme = this.context.currentTheme || 'space';
    const apiFiles = this.context.projectInfo.structure.sourceFiles.filter(f => 
      f.includes('api') || f.includes('route') || f.includes('controller')
    );
    
    const narratives = {
      space: `🚀 **The Communication Array**

You approach the ship's massive communication array. Here, ${apiFiles.length} channels connect your vessel to the galaxy:

${apiFiles.slice(0, 5).map(file => `• **${file}** - Subspace frequency`).join('\n')}

Data flows in and out through these carefully managed channels.`,

      medieval: `🏰 **The Royal Messenger Tower**

You climb the messenger tower where royal decrees are sent across the realm. ${apiFiles.length} message routes are maintained:

${apiFiles.slice(0, 5).map(file => `• **${file}** - Messenger route`).join('\n')}

Each route ensures secure communication throughout the kingdom.`,

      ancient: `🏺 **The Signal Fires**

You discover the ancient communication network of signal fires. ${apiFiles.length} beacon points remain:

${apiFiles.slice(0, 5).map(file => `• **${file}** - Sacred beacon`).join('\n')}

These beacons once connected the entire civilization.`
    };

    this.state.exploredAreas.add('api');
    this.state.adventureProgress += 20;
    this.state.discoveries.push('API Architecture: Communication pathways that connect different parts of the system');
    
    return {
      narrative: narratives[theme as keyof typeof narratives] || narratives.space,
      choices: this.generateDynamicChoices()
    };
  }

  private async provideHint(): Promise<AdventureResult> {
    const hints = [
      "💡 **Hint**: Try exploring areas related to the main technologies in this project. Each technology has its own guardian character!",
      "💡 **Hint**: Configuration files often hold the secrets to how a project is structured. Have you visited the Configuration Cavern?",
      "💡 **Hint**: Dependencies are like allies - they provide special powers to your project. The Dependency Nexus reveals these relationships.",
      "💡 **Hint**: The entry point file is where every adventure begins. Following the code flow from there reveals the project's true nature."
    ];

    const hint = hints[this.state.hintsRevealed % hints.length];
    this.state.hintsRevealed++;
    
    return {
      narrative: hint + "\n\nThis insight might help guide your next steps!",
      choices: this.generateDynamicChoices()
    };
  }

  private async showDiscoveries(): Promise<AdventureResult> {
    if (this.state.discoveries.length === 0) {
      return {
        narrative: "📜 **Your Adventure Journal**\n\nYou haven't made any discoveries yet. Keep exploring to uncover the secrets of this codebase!",
        choices: this.generateDynamicChoices()
      };
    }

    const progress = Math.min(100, this.state.adventureProgress);
    const narrative = `📜 **Your Adventure Journal**

**Progress**: ${progress}% complete
**Areas Explored**: ${this.state.exploredAreas.size}
**Characters Met**: ${this.state.visitedCharacters.size}

**Discoveries**:
${this.state.discoveries.map((d, i) => `${i + 1}. ${d}`).join('\n')}

${progress >= 80 ? '\n🎉 You\'re close to mastering this codebase!' : '\nKeep exploring to uncover more secrets!'}`;

    return {
      narrative,
      choices: this.generateDynamicChoices()
    };
  }

  // Generate dynamic choices based on exploration state
  private generateDynamicChoices(): string[] {
    const choices: string[] = [];
    
    if (!this.state.currentStory || !this.context.projectInfo) {
      return ['Begin your adventure'];
    }

    // Add character-based choices for unmet characters
    const unmetCharacters = this.state.currentStory.characters.filter(
      char => !this.state.visitedCharacters.has(char.name)
    );
    if (unmetCharacters.length > 0 && choices.length < 3) {
      const char = unmetCharacters[0];
      if (char) {
        choices.push(`Meet ${char.name} (${char.technology || 'General'} expert)`);
      }
    }

    // Add exploration choices based on project structure
    if (!this.state.exploredAreas.has('configuration') && this.context.projectInfo.structure.configFiles.length > 0) {
      choices.push('Explore the Configuration Cavern');
    }
    
    if (!this.state.exploredAreas.has('dependencies') && this.context.projectInfo.codeAnalysis.dependencies.length > 0) {
      choices.push('Visit the Dependency Nexus');
    }

    if (!this.state.exploredAreas.has('tests') && this.context.projectInfo.hasTests) {
      choices.push('Enter the Testing Grounds');
    }

    if (!this.state.exploredAreas.has('api') && this.context.projectInfo.hasApi) {
      choices.push('Investigate the API Gateway');
    }

    // Add progress-based choices
    if (this.state.adventureProgress > 50 && !this.state.exploredAreas.has('core')) {
      choices.push('Unlock the Core Secrets');
    }

    // Add hint option if stuck
    if (this.state.hintsRevealed < 3 && choices.length < 2) {
      choices.push('Request a helpful hint');
    }

    // Always have a fallback
    if (choices.length === 0) {
      choices.push('Continue exploring', 'Return to the main path', 'Review your discoveries');
    }

    return choices.slice(0, 4); // Limit to 4 choices for better UX
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