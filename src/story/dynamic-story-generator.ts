import { ProjectInfo } from '../analyzer/project-analyzer.js';
import { LLMClient } from '../llm/llm-client.js';
import { Character, Story } from '../shared/types.js';
import { AdventurePathGenerator } from '../adventure/adventure-path-generator.js';
import { AdventureTheme, THEMES } from '../shared/theme.js';

// Theme keys for internal use
export const STORY_THEMES = {
  SPACE: THEMES.SPACE.key,
  MYTHICAL: THEMES.MYTHICAL.key,
  ANCIENT: THEMES.ANCIENT.key
} as const;

export type StoryTheme = AdventureTheme;

// Analysis limits
const STORY_LIMITS = {
  TOP_FUNCTIONS: 8,
  TOP_CLASSES: 5,
  TOP_DEPENDENCIES_PER_CATEGORY: 3,
  TOP_DIRECTORIES: 8,
  TOP_SOURCE_FILES: 10,
  TOP_EXECUTION_FLOW: 5
} as const;

export class DynamicStoryGenerator {
  private llmClient: LLMClient;
  private currentProject?: ProjectInfo;
  private pathGenerator: AdventurePathGenerator;

  constructor() {
    this.llmClient = new LLMClient();
    this.pathGenerator = new AdventurePathGenerator();
  }

  setProject(projectInfo: ProjectInfo): void {
    this.currentProject = projectInfo;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }

  async generateStory(theme: AdventureTheme): Promise<Story> {
    // Validate theme
    if (!Object.values(STORY_THEMES).includes(theme as StoryTheme)) {
      console.warn(`Invalid theme '${theme}', defaulting to ${STORY_THEMES.SPACE} theme`);
      theme = STORY_THEMES.SPACE;
    }
    if (!this.currentProject) {
      const error = new Error('No project information available. Please analyze a project first.');
      console.error('generateStory error:', error.message);
      throw error;
    }

    const projectAnalysis = this.createProjectAnalysis();
    const enhancedPrompt = this.createEnhancedStoryPrompt(theme, projectAnalysis);
    const storyPrompt = enhancedPrompt;
    
    try {
      // Add timeout to LLM call to prevent MCP timeouts (15 seconds)
      const timeoutMs = 15000;
      const llmResponse = await this.withTimeout(
        this.llmClient.generateResponse(storyPrompt),
        timeoutMs
      );
      return this.parseStoryResponse(llmResponse.content, theme);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to generate dynamic story:', errorMessage);
      
      // Log additional context for debugging
      if (error instanceof Error && error.stack) {
        console.debug('Story generation error stack:', error.stack);
      }
      
      throw new Error(`Unable to generate story for ${theme} theme: ${errorMessage}. Please ensure your LLM configuration is correct and the service is available.`);
    }
  }

  private createProjectAnalysis(): string {
    // Add code snippets for richer LLM context
    if (!this.currentProject) return '';

    const analysis = this.currentProject.codeAnalysis;

    // Create function summaries
    const topFunctions = analysis.functions?.slice(0, STORY_LIMITS.TOP_FUNCTIONS).map(f => 
      `  • ${f.name}() in ${f.fileName} - ${f.summary}`
    ).join('\n') || '';

    // Create class summaries  
    const topClasses = analysis.classes?.slice(0, STORY_LIMITS.TOP_CLASSES).map(c =>
      `  • ${c.name} in ${c.fileName} - ${c.summary}`
    ).join('\n') || '';

    // Create dependency categories
    const depsByCategory = analysis?.dependencies?.reduce((acc, dep) => {
      if (!acc[dep.category]) acc[dep.category] = [];
      acc[dep.category]!.push(dep.name);
      return acc;
    }, {} as Record<string, string[]>) ?? {};

    const depSummary = Object.entries(depsByCategory)
      .map(([category, deps]) => `  • ${category}: ${deps.slice(0, STORY_LIMITS.TOP_DEPENDENCIES_PER_CATEGORY).join(', ')}`)
      .join('\n');

    // Key files with content
    const keyFilesSummary = analysis.keyFiles?.map(f =>
      `  • ${f.path}: ${f.summary}`
    ).join('\n') || '';

    // Suggested Exploration Order
    const suggestedOrder = analysis.codeFlow?.executionOrder?.length
      ? analysis.codeFlow.executionOrder.map((s, i) => `  ${i + 1}. ${s}`).join('\n')
      : '';

    // Async and Exported Functions
    const asyncFunctions = analysis.functions?.filter(f => f.isAsync) || [];
    const exportedFunctions = analysis.functions?.filter(f => f.isExported) || [];

    // Suggested Exploration Order (matches test output)
    return [
      'PROJECT ANALYSIS:',
      '================',
      '',
      'BASIC INFO:',
      `- Project Type: ${this.currentProject.type}`,
      `- File Count: ${this.currentProject.fileCount}`,
      `- Main Technologies: ${this.currentProject.mainTechnologies.join(', ')}`,
      `- Entry Points: ${analysis.entryPoints?.join(', ') || 'None detected'}`,
      '',
      'ARCHITECTURE:',
      `- Has Database: ${this.currentProject.hasDatabase}`,
      `- Has API: ${this.currentProject.hasApi}`,
      `- Has Frontend: ${this.currentProject.hasFrontend}`,
      `- Has Tests: ${this.currentProject.hasTests}`,
      '',
      'KEY FUNCTIONS (What the code actually does):',
      topFunctions || '  • No functions detected',
      '',
      'KEY CLASSES (Main components):',
      topClasses || '  • No classes detected',
      '',
      'DEPENDENCIES BY CATEGORY:',
      depSummary || '  • No dependencies detected',
      '',
      'KEY FILES WITH CONTEXT:',
      keyFilesSummary || '  • No key files analyzed',
      '',
      'CODE STRUCTURE:',
      `- Directories: ${this.currentProject.structure.directories.slice(0, STORY_LIMITS.TOP_DIRECTORIES).join(', ')}`,
      `- Important Files: ${this.currentProject.structure.importantFiles.slice(0, STORY_LIMITS.TOP_DIRECTORIES).join(', ')}`,
      `- Source Files: ${this.currentProject.structure.sourceFiles.slice(0, STORY_LIMITS.TOP_SOURCE_FILES).join(', ')}`,
      '',
      'CODE FLOW ANALYSIS:',
      (analysis.codeFlow ? `- Entry Point: ${analysis.codeFlow.entryPoint}\n- Execution Flow: ${analysis.codeFlow.executionOrder?.slice(0, STORY_LIMITS.TOP_EXECUTION_FLOW).join(' → ') || 'No execution order available'}\n- Call Relationships: ${analysis.codeFlow.callGraph?.length || 0} connections mapped` : '- No flow analysis available'),
      '',
      'SUGGESTED EXPLORATION ORDER:',
      suggestedOrder || '  • No suggested order available',
      '',
      'CODE PATTERNS DETECTED:',
      (asyncFunctions.length > 0 ? `  - Async functions: ${asyncFunctions.length}` : ''),
      (exportedFunctions.length > 0 ? `  - Exported functions: ${exportedFunctions.length}` : ''),
    ].filter(Boolean).join('\n');
  }

  private createEnhancedStoryPrompt(theme: AdventureTheme, projectAnalysis: string): string {
    const keyFunctions = this.currentProject?.codeAnalysis.functions.slice(0, 3) || [];
    const functionExamples = keyFunctions.map(f => 
      `- ${f.name}(${f.parameters.join(', ')}) - ${f.summary}`
    ).join('\n');

    return `Theme: ${theme}

${projectAnalysis}

IMPORTANT STORY REQUIREMENTS:

1. Create vivid character personalities that represent these actual functions:
${functionExamples}

2. Use these specific project details in your narrative:
   - The main entry point is: ${this.currentProject?.codeAnalysis.entryPoints[0] || 'src/index'}
   - Key technologies to personify: ${this.currentProject?.mainTechnologies.slice(0, 3).join(', ')}
   - Project type: ${this.currentProject?.type}

3. Structure your response with:
   - A compelling title that references the project type
   - An introduction that sets up the ${theme} world while hinting at the actual project structure
   - Characters that embody specific technologies or components found in the analysis
   - Initial adventure choices that map to real areas of the codebase

4. Make the story educational by:
   - Using analogies that explain what each component does
   - Creating character interactions that mirror actual code relationships
   - Designing locations that represent real project directories

Remember: The goal is to make learning about this codebase fun and memorable through creative storytelling!`;
  }

  private parseStoryResponse(content: string, theme: AdventureTheme): Story {
    try {
      const parsedData = this.extractStoryData(content);
      return this.buildStoryFromParsedData(parsedData, theme);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to parse story response:', errorMessage);
      throw new Error(`Unable to parse LLM story response: ${errorMessage}. The response may not have followed the expected format.`);
    }
  }

  private extractStoryData(content: string): {
    title: string;
    introduction: string;
    characters: Partial<Character>[];
    initialChoices: string[];
  } {
    const lines = content.split('\n').filter(line => line.trim());
    const data = {
      title: 'Code Adventure',
      introduction: '',
      characters: [] as Partial<Character>[],
      initialChoices: [] as string[]
    };

    let currentSection = '';
    let currentCharacter: Partial<Character> = {};

    for (const line of lines) {
      const trimmedLine = line.trim();
      currentSection = this.detectSection(trimmedLine, currentSection);

      switch (currentSection) {
        case 'title':
          if (!this.isSectionHeader(trimmedLine)) {
            data.title = this.extractTitle(trimmedLine);
          }
          break;
        case 'introduction':
          if (!this.isSectionHeader(trimmedLine)) {
            data.introduction += (data.introduction ? ' ' : '') + trimmedLine;
          }
          break;
        case 'characters':
          this.parseCharacterLine(trimmedLine, currentCharacter, data.characters);
          break;
        case 'choices':
          if (this.isListItem(trimmedLine)) {
            data.initialChoices.push(this.extractListItemText(trimmedLine));
          }
          break;
      }
    }

    // Save last character if exists
    if (currentCharacter.name) {
      data.characters.push(currentCharacter);
    }

    return data;
  }

  private detectSection(line: string, currentSection: string): string {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('title:') || (line.startsWith('**') && line.includes('Title'))) {
      return 'title';
    } else if (lowerLine.includes('introduction:') || (line.startsWith('**') && line.includes('Introduction'))) {
      return 'introduction';
    } else if (lowerLine.includes('characters:') || (line.startsWith('**') && line.includes('Characters'))) {
      return 'characters';
    } else if (lowerLine.includes('choices:') || line.includes('Initial Choices') || line.includes('adventure paths')) {
      return 'choices';
    }
    return currentSection;
  }

  private isSectionHeader(line: string): boolean {
    return line.includes(':') && (line.startsWith('**') || !!line.toLowerCase().match(/^(title|introduction|characters|choices):/));
  }

  private isListItem(line: string): boolean {
    return line.startsWith('-') || !!line.match(/^\d+\./);
  }

  private extractTitle(line: string): string {
    return line.replace(/^\*\*.*?:\*\*\s*/, '').replace(/^.*?:\s*/, '').replace(/\*\*/g, '');
  }

  private extractListItemText(line: string): string {
    return line.replace(/^[-\d\.]\s*/, '').replace(/\*\*/g, '');
  }

  private parseCharacterLine(line: string, currentCharacter: Partial<Character>, characters: Partial<Character>[]): void {
    if (this.isListItem(line)) {
      // Save previous character if exists
      if (currentCharacter.name) {
        characters.push({ ...currentCharacter });
        // Reset for new character
        Object.keys(currentCharacter).forEach(key => delete currentCharacter[key as keyof Character]);
      }
      // Start new character
      currentCharacter.name = this.extractListItemText(line);
      currentCharacter.technology = this.inferTechnology(line);
    } else if (line.includes('Role:') || line.includes('role:')) {
      currentCharacter.role = line.replace(/^.*?[Rr]ole:\s*/, '').replace(/\*\*/g, '');
    } else if (line.includes('Greeting:') || line.includes('greeting:')) {
      currentCharacter.greeting = line.replace(/^.*?[Gg]reeting:\s*/, '').replace(/[""]/g, '').replace(/\*\*/g, '');
    } else if (line.includes('Description:') || line.includes('description:')) {
      currentCharacter.description = line.replace(/^.*?[Dd]escription:\s*/, '').replace(/\*\*/g, '');
    } else if (line.includes('Fun fact:') || line.includes('fun fact:')) {
      currentCharacter.funFact = line.replace(/^.*?[Ff]un fact:\s*/, '').replace(/\*\*/g, '');
    }
  }

  private buildStoryFromParsedData(
    parsedData: { title: string; introduction: string; characters: Partial<Character>[]; initialChoices: string[] },
    theme: AdventureTheme
  ): Story {
    const { title, introduction, characters: partialCharacters, initialChoices } = parsedData;
    
    // Complete characters
    const characters = partialCharacters.length > 0 
      ? partialCharacters.map(char => this.completeCharacter(char))
      : this.generateDefaultCharacters(theme);
    
    // Generate smart adventure paths based on project analysis
    const adventurePaths = this.pathGenerator.generatePaths(this.currentProject!);
    const pathChoicesText = this.pathGenerator.generateAdventureChoicesText(adventurePaths, theme);
    
    // Use adventure paths as initial choices, fallback to default if needed
    if (adventurePaths.length > 0) {
      initialChoices.push(...adventurePaths.map(path => path.name));
    } else if (initialChoices.length === 0) {
      initialChoices.push(...this.generateDefaultChoices(characters));
    }

    // Append adventure path details to introduction
    const fullIntroduction = (introduction || this.generateDefaultIntroduction(theme)) + 
                             (adventurePaths.length > 0 ? '\n\n' + pathChoicesText : '');

    return {
      theme,
      title: title || `${theme} Code Adventure`,
      introduction: fullIntroduction,
      setting: `A ${theme}-themed exploration of your codebase`,
      characters,
      initialChoices
    };
  }

  private completeCharacter(partial: Partial<Character>): Character {
    return {
      name: partial.name || 'Unknown Entity',
      role: partial.role || 'System Guardian',
      description: partial.description || 'A mysterious figure who watches over the code.',
      greeting: partial.greeting || 'Welcome, traveler!',
      funFact: partial.funFact || 'I hold secrets of the digital realm!',
      technology: partial.technology || 'Unknown'
    };
  }

  private inferTechnology(text: string): string {
    const techKeywords = {
      'Database': ['database', 'data', 'storage', 'db'],
      'API': ['api', 'communication', 'interface', 'endpoint'],
      'Frontend': ['frontend', 'ui', 'interface', 'display'],
      'Backend': ['backend', 'server', 'core', 'engine'],
      'Testing': ['test', 'quality', 'validation']
    };

    for (const [tech, keywords] of Object.entries(techKeywords)) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        return tech;
      }
    }
    return 'General';
  }

  private generateDefaultCharacters(theme: AdventureTheme): Character[] {
    const templates = {
      [STORY_THEMES.SPACE]: {
        name: 'Data Navigator Zara',
        role: 'Chief Data Officer of the Starship',
        description: 'A brilliant navigator who charts courses through vast data galaxies.',
        greeting: 'Welcome aboard, space traveler! Ready to explore the data cosmos?',
        funFact: 'I can process stellar databases faster than light travel!',
        technology: 'Database'
      },
      [STORY_THEMES.MYTHICAL]: {
        name: 'Keeper Magnus',
        role: 'Guardian of the Code Archives',
        description: 'An ancient keeper who protects the sacred scrolls of knowledge.',
        greeting: 'Hail, brave adventurer! Seek ye wisdom from the great archives?',
        funFact: 'I have guarded these digital scrolls for centuries!',
        technology: 'Database'
      },
      [STORY_THEMES.ANCIENT]: {
        name: 'Oracle Pythia',
        role: 'Keeper of Digital Prophecies',
        description: 'A wise oracle who interprets the patterns written in stone tablets of code.',
        greeting: 'Seeker of knowledge, the digital spirits whisper to me of your quest.',
        funFact: 'I can divine the future of your code from ancient algorithms!',
        technology: 'Database'
      }
    };

    const template = templates[theme as keyof typeof templates] || templates[STORY_THEMES.SPACE];
    return [template];
  }

  private generateDefaultChoices(characters: Character[]): string[] {
    const choices = [`Meet ${characters[0]?.name || 'a mysterious character'}`];
    if (this.currentProject?.hasApi) choices.push('Explore the communication systems');
    if (this.currentProject?.hasFrontend) choices.push('Visit the user interface');
    if (this.currentProject?.hasTests) choices.push('Check the quality assurance protocols');
    return choices;
  }

  private generateDefaultIntroduction(theme: AdventureTheme): string {
    const intros = {
      [STORY_THEMES.SPACE]: '🚀 Welcome to your digital starship! This vessel contains the technological marvels that power your mission through the code cosmos.',
      [STORY_THEMES.MYTHICAL]: '🏰 Welcome to the enchanted kingdom of code! This mystical realm holds the magical technologies that bring your digital world to life.',
      [STORY_THEMES.ANCIENT]: '🏺 Welcome to the lost temple of digital wisdom! These ancient halls contain the technological artifacts of a sophisticated civilization.'
    };
    
    return intros[theme as keyof typeof intros] || intros[STORY_THEMES.SPACE];
  }

}