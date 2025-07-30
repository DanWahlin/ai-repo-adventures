import { Story, Character } from '../story/types.js';

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

export class AdventureManager {
  private state: AdventureState = {
    visitedCharacters: new Set(),
    exploredAreas: new Set(),
    currentLocation: 'entrance',
    adventureProgress: 0
  };

  setCurrentStory(story: Story) {
    this.state.currentStory = story;
    this.state.visitedCharacters.clear();
    this.state.exploredAreas.clear();
    this.state.currentLocation = 'entrance';
    this.state.adventureProgress = 0;
  }

  async makeChoice(choice: string): Promise<AdventureResult> {
    if (!this.state.currentStory) {
      throw new Error('No story is currently active. Please choose a theme first.');
    }

    // Parse the choice to determine the action
    const action = this.parseChoice(choice);
    
    switch (action.type) {
      case 'meet_character':
        return await this.handleMeetCharacter(action.target);
      case 'explore_area':
        return await this.handleExploreArea(action.target);
      case 'investigate':
        return await this.handleInvestigation(action.target);
      default:
        return await this.handleGeneralChoice(choice);
    }
  }

  async getCharacterInfo(characterName: string): Promise<Character> {
    if (!this.state.currentStory) {
      throw new Error('No story is currently active.');
    }

    const character = this.state.currentStory.characters.find(c => 
      c.name.toLowerCase().includes(characterName.toLowerCase()) ||
      characterName.toLowerCase().includes(c.name.toLowerCase())
    );

    if (!character) {
      throw new Error(`Character '${characterName}' not found in the current story.`);
    }

    // Mark character as visited
    this.state.visitedCharacters.add(character.name);
    this.updateProgress();

    return character;
  }

  private parseChoice(choice: string): { type: string; target: string } {
    const lowerChoice = choice.toLowerCase();
    
    if (lowerChoice.includes('meet') || lowerChoice.includes('talk') || lowerChoice.includes('visit')) {
      const characterNames = this.state.currentStory!.characters.map(c => c.name.toLowerCase());
      const foundCharacter = characterNames.find(name => lowerChoice.includes(name));
      return { type: 'meet_character', target: foundCharacter || '' };
    }
    
    if (lowerChoice.includes('explore') || lowerChoice.includes('go to')) {
      return { type: 'explore_area', target: this.extractAreaFromChoice(choice) };
    }
    
    if (lowerChoice.includes('investigate') || lowerChoice.includes('examine')) {
      return { type: 'investigate', target: choice };
    }
    
    return { type: 'general', target: choice };
  }

  private extractAreaFromChoice(choice: string): string {
    const areas = ['database', 'api', 'frontend', 'backend', 'testing', 'architecture', 'configuration'];
    const lowerChoice = choice.toLowerCase();
    
    for (const area of areas) {
      if (lowerChoice.includes(area)) {
        return area;
      }
    }
    
    return 'unknown';
  }

  private async handleMeetCharacter(characterName: string): Promise<AdventureResult> {
    if (!characterName) {
      return {
        narrative: "I'm not sure which character you'd like to meet. Could you be more specific?",
        choices: this.state.currentStory!.characters.map(c => `Meet ${c.name}`)
      };
    }

    try {
      const character = await this.getCharacterInfo(characterName);
      const narrative = this.generateCharacterMeetingNarrative(character);
      
      return {
        narrative,
        characterMet: character,
        choices: this.generatePostCharacterChoices(character)
      };
    } catch (error) {
      return {
        narrative: `I couldn't find a character matching '${characterName}'. Let me show you who's available to meet.`,
        choices: this.state.currentStory!.characters.map(c => `Meet ${c.name}`)
      };
    }
  }

  private async handleExploreArea(area: string): Promise<AdventureResult> {
    this.state.exploredAreas.add(area);
    this.state.currentLocation = area;
    this.updateProgress();

    const narrative = this.generateAreaExplorationNarrative(area);
    const choices = this.generateAreaChoices(area);

    return {
      narrative,
      choices
    };
  }

  private async handleInvestigation(target: string): Promise<AdventureResult> {
    const narrative = this.generateInvestigationNarrative(target);
    const choices = this.generateInvestigationChoices();

    return {
      narrative,
      choices
    };
  }

  private async handleGeneralChoice(choice: string): Promise<AdventureResult> {
    // Handle general adventure progression
    const narrative = `You decide to ${choice.toLowerCase()}. ` + this.generateGeneralNarrative();
    const choices = this.generateGeneralChoices();

    return {
      narrative,
      choices
    };
  }

  private generateCharacterMeetingNarrative(character: Character): string {
    const theme = this.state.currentStory!.theme;
    const settings = {
      space: `You float through the pristine corridors of the starship and arrive at ${character.name}'s station. The area hums with technological energy.`,
      medieval: `You walk through the ancient stone corridors and find ${character.name} in their chamber, surrounded by mystical artifacts.`,
      ancient: `You make your way through the marble halls and discover ${character.name} in their sacred workspace, tending to ancient wisdoms.`
    };

    const baseSetting = settings[theme as keyof typeof settings] || settings.space;
    
    return `${baseSetting}

**${character.name}** notices your approach and turns to greet you.

"${character.greeting}"

**About their role:**
${character.role}

**${character.name} shares:** "${character.funFact}"

You sense that ${character.name} has much wisdom to share about the ${character.technology} systems that power this realm.`;
  }

  private generateAreaExplorationNarrative(area: string): string {
    const theme = this.state.currentStory!.theme;
    const narratives = {
      database: {
        space: "You enter the vast Data Vault, where crystalline storage units stretch infinitely in all directions. Information flows like rivers of light between the storage nodes.",
        medieval: "You descend into the dragon's treasure cavern, where mountains of glowing data crystals are carefully organized and guarded.",
        ancient: "You step into the Great Library, where countless scrolls and tablets contain the accumulated wisdom of ages."
      },
      api: {
        space: "You arrive at the Communications Hub, where holographic displays show data streams connecting to distant star systems.",
        medieval: "You visit the Royal Messenger Station, where magical portals allow instant communication across the kingdom.",
        ancient: "You explore the Trade Routes Center, where merchants coordinate the flow of goods and information between cities."
      },
      frontend: {
        space: "You enter the Bridge, where elegant control panels and displays create an intuitive interface for ship operations.",
        medieval: "You walk through the Royal Court, beautifully decorated with tapestries and designed for welcoming visitors.",
        ancient: "You admire the Palace Architecture, with its stunning columns and layouts designed for both beauty and function."
      }
    };

    const areaData = narratives[area as keyof typeof narratives];
    if (areaData) {
      return areaData[theme as keyof typeof areaData] || areaData.space;
    }

    return `You explore the ${area} area and discover fascinating systems at work.`;
  }

  private generatePostCharacterChoices(character: Character): string[] {
    return [
      `Ask ${character.name} to explain their technology in more detail`,
      `Request a tour of ${character.name}'s domain`,
      `Learn about how ${character.name} collaborates with other characters`,
      'Continue exploring other areas of the project'
    ];
  }

  private generateAreaChoices(area: string): string[] {
    const baseChoices = [
      'Meet the character who manages this area',
      'Examine the technical architecture in detail',
      'Look for connections to other areas',
      'Return to the main hub'
    ];

    // Add area-specific choices
    if (area === 'database') {
      baseChoices.unshift('Investigate data flow patterns');
    } else if (area === 'api') {
      baseChoices.unshift('Trace communication pathways');
    } else if (area === 'frontend') {
      baseChoices.unshift('Study user interface design');
    }

    return baseChoices;
  }

  private generateInvestigationNarrative(target: string): string {
    return `You begin investigating ${target}. Your analytical skills reveal interesting patterns and connections that weren't immediately obvious. This deeper understanding will help you navigate the codebase more effectively.`;
  }

  private generateInvestigationChoices(): string[] {
    return [
      'Document your findings',
      'Share discoveries with a character',
      'Investigate related components',
      'Continue your main adventure'
    ];
  }

  private generateGeneralNarrative(): string {
    const narratives = [
      'Your journey through this digital realm continues to reveal new insights.',
      'Each step forward unveils more about how this system operates.',
      'The interconnected nature of this project becomes clearer with each discovery.',
      'You gain deeper appreciation for the elegant design of this codebase.'
    ];
    
    return narratives[Math.floor(Math.random() * narratives.length)] ?? narratives[0] ?? 'Your adventure continues...';
  }

  private generateGeneralChoices(): string[] {
    if (!this.state.currentStory) return [];

    const unvisitedCharacters = this.state.currentStory.characters.filter(c => 
      !this.state.visitedCharacters.has(c.name)
    );

    const choices = [];
    
    if (unvisitedCharacters.length > 0) {
      choices.push(`Meet ${unvisitedCharacters[0]?.name}`);
    }
    
    choices.push('Explore project architecture');
    choices.push('View adventure progress');
    
    if (this.state.adventureProgress > 50) {
      choices.push('Prepare to conclude your adventure');
    }

    return choices;
  }

  private updateProgress() {
    if (!this.state.currentStory) return;

    const totalCharacters = this.state.currentStory.characters.length;
    const visitedCount = this.state.visitedCharacters.size;
    const exploredCount = this.state.exploredAreas.size;
    
    // Calculate progress based on characters met and areas explored
    this.state.adventureProgress = Math.min(100, 
      ((visitedCount / totalCharacters) * 60) + 
      ((exploredCount / 5) * 40)
    );
  }

  getAdventureProgress(): number {
    return this.state.adventureProgress;
  }

  getVisitedCharacters(): string[] {
    return Array.from(this.state.visitedCharacters);
  }

  getExploredAreas(): string[] {
    return Array.from(this.state.exploredAreas);
  }
}