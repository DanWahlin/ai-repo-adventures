import { ProjectInfo } from '../analyzer/index.js';
import { LLMClient } from '../llm/llm-client.js';
import { Character, Story, ANALYSIS_LIMITS, TIMEOUTS, ADVENTURE_CONFIG, isValidTheme, AdventureTheme, THEMES } from '../shared/index.js';
import { AdventurePathGenerator } from './adventure-path-generator.js';

// Theme keys for internal use
export const STORY_THEMES = {
  SPACE: THEMES.SPACE.key,
  MYTHICAL: THEMES.MYTHICAL.key,
  ANCIENT: THEMES.ANCIENT.key
} as const;

export type StoryTheme = AdventureTheme;

// Story-specific parsing patterns
const PARSING_PATTERNS = {
  SECTION_HEADERS: {
    TITLE: /title:|\*\*.*title.*\*\*/i,
    INTRODUCTION: /introduction:|\*\*.*introduction.*\*\*/i,
    CHARACTERS: /characters:|\*\*.*characters.*\*\*/i,
    CHOICES: /choices:|initial choices|adventure paths/i
  },
  LIST_ITEMS: /^[-\d\.\*]\s+/,
  PROPERTY_EXTRACTORS: {
    ROLE: /role:/i,
    GREETING: /greeting:/i,
    DESCRIPTION: /description:/i,
    FUN_FACT: /fun fact:/i
  }
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

  /**
   * Wraps a promise with a timeout to prevent hanging requests
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number = TIMEOUTS.LLM_REQUEST): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Generates a themed story based on project analysis
   */
  async generateStory(theme: AdventureTheme): Promise<Story> {
    const validatedTheme = this.validateAndNormalizeTheme(theme);
    this.ensureProjectIsSet();

    const projectAnalysis = this.createProjectAnalysis();
    const storyPrompt = this.createEnhancedStoryPrompt(validatedTheme, projectAnalysis);
    
    try {
      const llmResponse = await this.withTimeout(
        this.llmClient.generateResponse(storyPrompt)
      );
      return this.parseStoryResponse(llmResponse.content, validatedTheme);
    } catch (error) {
      this.logStoryGenerationError(error, validatedTheme);
      throw new Error(`Unable to generate story for ${validatedTheme} theme: ${this.getErrorMessage(error)}. Please ensure your LLM configuration is correct and the service is available.`);
    }
  }

  /**
   * Creates a comprehensive project analysis for story generation
   * 
   * This method orchestrates the creation of multiple analysis sections
   * to provide the LLM with rich context about the codebase structure.
   * 
   * Analysis sections include:
   * - Basic project information (type, file count, technologies)
   * - Architecture overview (database, API, frontend capabilities)
   * - Key functions and classes with descriptions
   * - Dependency categorization
   * - File structure and code flow patterns
   * 
   * @returns A formatted string containing all project analysis sections
   */
  private createProjectAnalysis(): string {
    if (!this.currentProject) return '';

    const analysis = this.currentProject.codeAnalysis;
    const sections = [
      this.createBasicInfoSection(),
      this.createArchitectureSection(),
      this.createFunctionsSection(analysis),
      this.createClassesSection(analysis),
      this.createDependenciesSection(analysis),
      this.createKeyFilesSection(analysis),
      this.createCodeStructureSection(),
      this.createCodeFlowSection(analysis),
      this.createCodePatternsSection(analysis)
    ];

    return [
      'PROJECT ANALYSIS:',
      '================',
      '',
      ...sections
    ].filter(Boolean).join('\n');
  }

  /**
   * Creates an enhanced prompt for LLM story generation
   * 
   * This method combines project analysis data with theme-specific requirements
   * to generate a comprehensive prompt that produces engaging, educational stories.
   * 
   * The prompt includes:
   * 1. Specific function examples from the actual codebase
   * 2. Project metadata (entry points, technologies, type)
   * 3. Theme-specific narrative requirements
   * 4. Educational objectives for character development
   * 
   * @param theme - The adventure theme (space, mythical, ancient)
   * @param projectAnalysis - Detailed project analysis summary
   * @returns A comprehensive prompt string for LLM story generation
   */
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

  /**
   * Extracts structured data from LLM story response
   */
  private extractStoryData(content: string): {
    title: string;
    introduction: string;
    characters: Partial<Character>[];
    initialChoices: string[];
  } {
    const lines = this.preprocessLines(content);
    const parser = new StoryContentParser();
    
    return parser.parse(lines);
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

  /**
   * Generates default characters for themes when LLM doesn't provide them
   */
  private generateDefaultCharacters(theme: AdventureTheme): Character[] {
    const characterTemplates = new CharacterTemplateGenerator();
    return characterTemplates.generateForTheme(theme);
  }

  private generateDefaultChoices(characters: Character[]): string[] {
    const choices = [`Meet ${characters[0]?.name || 'a mysterious character'}`];
    if (this.currentProject?.hasApi) choices.push('Explore the communication systems');
    if (this.currentProject?.hasFrontend) choices.push('Visit the user interface');
    if (this.currentProject?.hasTests) choices.push('Check the quality assurance protocols');
    return choices;
  }

  private generateDefaultIntroduction(_theme: AdventureTheme): string {
    const intros = {
      [STORY_THEMES.SPACE]: '🚀 Welcome to your digital starship! This vessel contains the technological marvels that power your mission through the code cosmos.',
      [STORY_THEMES.MYTHICAL]: '🏰 Welcome to the enchanted kingdom of code! This mystical realm holds the magical technologies that bring your digital world to life.',
      [STORY_THEMES.ANCIENT]: '🏺 Welcome to the lost temple of digital wisdom! These ancient halls contain the technological artifacts of a sophisticated civilization.'
    };
    
    return intros[_theme as keyof typeof intros] || intros[STORY_THEMES.SPACE];
  }

  // Helper methods for story generation
  private validateAndNormalizeTheme(theme: AdventureTheme): AdventureTheme {
    if (!isValidTheme(theme)) {
      console.warn(`Invalid theme '${theme}', defaulting to ${ADVENTURE_CONFIG.DEFAULT_THEME}`);
      return ADVENTURE_CONFIG.DEFAULT_THEME;
    }
    return theme;
  }

  private ensureProjectIsSet(): void {
    if (!this.currentProject) {
      const error = new Error('No project information available. Please analyze a project first.');
      console.error('generateStory error:', error.message);
      throw error;
    }
  }

  private logStoryGenerationError(error: unknown, _theme: AdventureTheme): void {
    const errorMessage = this.getErrorMessage(error);
    console.error('Failed to generate dynamic story:', errorMessage);
    
    if (error instanceof Error && error.stack) {
      console.debug('Story generation error stack:', error.stack);
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private preprocessLines(content: string): string[] {
    return content.split('\n').filter(line => line.trim());
  }

  // Project analysis section builders
  private createBasicInfoSection(): string {
    if (!this.currentProject) return '';
    const analysis = this.currentProject.codeAnalysis;
    
    return [
      'BASIC INFO:',
      `- Project Type: ${this.currentProject.type}`,
      `- File Count: ${this.currentProject.fileCount}`,
      `- Main Technologies: ${this.currentProject.mainTechnologies.join(', ')}`,
      `- Entry Points: ${analysis.entryPoints?.join(', ') || 'None detected'}`,
      ''
    ].join('\n');
  }

  private createArchitectureSection(): string {
    if (!this.currentProject) return '';
    
    return [
      'ARCHITECTURE:',
      `- Has Database: ${this.currentProject.hasDatabase}`,
      `- Has API: ${this.currentProject.hasApi}`,
      `- Has Frontend: ${this.currentProject.hasFrontend}`,
      `- Has Tests: ${this.currentProject.hasTests}`,
      ''
    ].join('\n');
  }

  private createFunctionsSection(analysis: any): string {
    const topFunctions = analysis.functions?.slice(0, ANALYSIS_LIMITS.STORY_TOP_FUNCTIONS).map((f: any) => 
      `  • ${f.name}() in ${f.fileName} - ${f.summary}`
    ).join('\n') || '  • No functions detected';

    return [
      'KEY FUNCTIONS (What the code actually does):',
      topFunctions,
      ''
    ].join('\n');
  }

  private createClassesSection(analysis: any): string {
    const topClasses = analysis.classes?.slice(0, ANALYSIS_LIMITS.STORY_TOP_CLASSES).map((c: any) =>
      `  • ${c.name} in ${c.fileName} - ${c.summary}`
    ).join('\n') || '  • No classes detected';

    return [
      'KEY CLASSES (Main components):',
      topClasses,
      ''
    ].join('\n');
  }

  private createDependenciesSection(analysis: any): string {
    const depsByCategory = analysis?.dependencies?.reduce((acc: any, dep: any) => {
      if (!acc[dep.category]) acc[dep.category] = [];
      acc[dep.category]!.push(dep.name);
      return acc;
    }, {} as Record<string, string[]>) ?? {};

    const depSummary = Object.entries(depsByCategory)
      .map(([category, deps]) => `  • ${category}: ${(deps as string[]).slice(0, ANALYSIS_LIMITS.STORY_TOP_DEPENDENCIES_PER_CATEGORY).join(', ')}`)
      .join('\n') || '  • No dependencies detected';

    return [
      'DEPENDENCIES BY CATEGORY:',
      depSummary,
      ''
    ].join('\n');
  }

  private createKeyFilesSection(analysis: any): string {
    const keyFilesSummary = analysis.keyFiles?.map((f: any) =>
      `  • ${f.path}: ${f.summary}`
    ).join('\n') || '  • No key files analyzed';

    return [
      'KEY FILES WITH CONTEXT:',
      keyFilesSummary,
      ''
    ].join('\n');
  }

  private createCodeStructureSection(): string {
    if (!this.currentProject) return '';
    
    return [
      'CODE STRUCTURE:',
      `- Directories: ${this.currentProject.structure.directories.slice(0, ANALYSIS_LIMITS.STORY_TOP_DIRECTORIES).join(', ')}`,
      `- Important Files: ${this.currentProject.structure.importantFiles.slice(0, ANALYSIS_LIMITS.STORY_TOP_DIRECTORIES).join(', ')}`,
      `- Source Files: ${this.currentProject.structure.sourceFiles.slice(0, ANALYSIS_LIMITS.STORY_TOP_SOURCE_FILES).join(', ')}`,
      ''
    ].join('\n');
  }

  private createCodeFlowSection(analysis: any): string {
    const flowInfo = analysis.codeFlow ? 
      `- Entry Point: ${analysis.codeFlow.entryPoint}\n- Execution Flow: ${analysis.codeFlow.executionOrder?.slice(0, ANALYSIS_LIMITS.STORY_TOP_EXECUTION_FLOW).join(' → ') || 'No execution order available'}\n- Call Relationships: ${analysis.codeFlow.callGraph?.length || 0} connections mapped` : 
      '- No flow analysis available';

    const suggestedOrder = analysis.codeFlow?.executionOrder?.length
      ? analysis.codeFlow.executionOrder.map((s: string, i: number) => `  ${i + 1}. ${s}`).join('\n')
      : '  • No suggested order available';

    return [
      'CODE FLOW ANALYSIS:',
      flowInfo,
      '',
      'SUGGESTED EXPLORATION ORDER:',
      suggestedOrder,
      ''
    ].join('\n');
  }

  private createCodePatternsSection(analysis: any): string {
    const asyncFunctions = analysis.functions?.filter((f: any) => f.isAsync) || [];
    const exportedFunctions = analysis.functions?.filter((f: any) => f.isExported) || [];
    
    const patterns = [
      asyncFunctions.length > 0 ? `  - Async functions: ${asyncFunctions.length}` : '',
      exportedFunctions.length > 0 ? `  - Exported functions: ${exportedFunctions.length}` : ''
    ].filter(Boolean);

    if (patterns.length === 0) return '';

    return [
      'CODE PATTERNS DETECTED:',
      ...patterns
    ].join('\n');
  }
}

/**
 * Simplified story content parser
 */
class StoryContentParser {
  private data = {
    title: 'Code Adventure',
    introduction: '',
    characters: [] as Partial<Character>[],
    initialChoices: [] as string[]
  };
  private currentSection = '';
  private currentCharacter: Partial<Character> = {};

  parse(lines: string[]) {
    for (const line of lines) {
      const trimmedLine = line.trim();
      this.updateCurrentSection(trimmedLine);
      this.processLine(trimmedLine);
    }

    this.saveCurrentCharacter();
    return this.data;
  }

  private updateCurrentSection(line: string): void {
    this.currentSection = this.detectSection(line) || this.currentSection;
  }

  private detectSection(line: string): string | null {
    const lowerLine = line.toLowerCase();
    
    if (PARSING_PATTERNS.SECTION_HEADERS.TITLE.test(lowerLine)) return 'title';
    if (PARSING_PATTERNS.SECTION_HEADERS.INTRODUCTION.test(lowerLine)) return 'introduction';
    if (PARSING_PATTERNS.SECTION_HEADERS.CHARACTERS.test(lowerLine)) return 'characters';
    if (PARSING_PATTERNS.SECTION_HEADERS.CHOICES.test(lowerLine)) return 'choices';
    
    return null;
  }

  private processLine(line: string): void {
    if (this.isSectionHeader(line)) return;

    switch (this.currentSection) {
      case 'title':
        this.data.title = this.extractTitle(line);
        break;
      case 'introduction':
        this.data.introduction += (this.data.introduction ? ' ' : '') + line;
        break;
      case 'characters':
        this.parseCharacterLine(line);
        break;
      case 'choices':
        if (this.isListItem(line)) {
          this.data.initialChoices.push(this.extractListItemText(line));
        }
        break;
    }
  }

  private parseCharacterLine(line: string): void {
    if (this.isListItem(line)) {
      this.saveCurrentCharacter();
      this.startNewCharacter(line);
    } else {
      this.updateCharacterProperty(line);
    }
  }

  private saveCurrentCharacter(): void {
    if (this.currentCharacter.name) {
      this.data.characters.push({ ...this.currentCharacter });
      this.currentCharacter = {};
    }
  }

  private startNewCharacter(line: string): void {
    this.currentCharacter.name = this.extractListItemText(line);
    this.currentCharacter.technology = this.inferTechnology(line);
  }

  private updateCharacterProperty(line: string): void {
    if (PARSING_PATTERNS.PROPERTY_EXTRACTORS.ROLE.test(line)) {
      this.currentCharacter.role = this.extractProperty(line, 'role');
    } else if (PARSING_PATTERNS.PROPERTY_EXTRACTORS.GREETING.test(line)) {
      this.currentCharacter.greeting = this.extractProperty(line, 'greeting').replace(/[""]/g, '');
    } else if (PARSING_PATTERNS.PROPERTY_EXTRACTORS.DESCRIPTION.test(line)) {
      this.currentCharacter.description = this.extractProperty(line, 'description');
    } else if (PARSING_PATTERNS.PROPERTY_EXTRACTORS.FUN_FACT.test(line)) {
      this.currentCharacter.funFact = this.extractProperty(line, 'fun fact');
    }
  }

  private extractProperty(line: string, property: string): string {
    const regex = new RegExp(`${property}:\\s*`, 'i');
    return line.replace(regex, '').replace(/\*\*/g, '');
  }

  private isSectionHeader(line: string): boolean {
    return line.includes(':') && (line.startsWith('**') || !!line.toLowerCase().match(/^(title|introduction|characters|choices):/));
  }

  private isListItem(line: string): boolean {
    return PARSING_PATTERNS.LIST_ITEMS.test(line);
  }

  private extractTitle(line: string): string {
    return line.replace(/^\*\*.*?:\*\*\s*/, '').replace(/^.*?:\s*/, '').replace(/\*\*/g, '');
  }

  private extractListItemText(line: string): string {
    return line.replace(PARSING_PATTERNS.LIST_ITEMS, '').replace(/\*\*/g, '');
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
}

/**
 * Character template generator for different themes
 */
class CharacterTemplateGenerator {
  private templates = {
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

  generateForTheme(theme: AdventureTheme): Character[] {
    const template = this.templates[theme as keyof typeof this.templates] || this.templates[STORY_THEMES.SPACE];
    return [template];
  }
}