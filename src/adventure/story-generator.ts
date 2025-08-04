import type { ProjectInfo } from '../analyzer/repomix-analyzer.js';
import { AdventureTheme } from '../shared/theme.js';
import { LLM_REQUEST_TIMEOUT, DEFAULT_THEME } from '../shared/config.js';
import { isValidTheme, THEMES } from '../shared/theme.js';
import { Character, Story } from '../shared/types.js';
import { LLMClient } from '../llm/llm-client.js';
import { ThemeManager } from './theme-manager.js';
import { AdventurePathGenerator } from './adventure-path-generator.js';

export interface Adventure {
  id: string;
  title: string;
  description: string;
  codeFiles?: string[];
}

export interface StoryResponse {
  story: string;
  adventures: Adventure[];
}

export interface AdventureContent {
  adventure: string;
  fileExploration?: string;
  codeSnippets: CodeSnippet[];
  hints: string[];
}

export interface CodeSnippet {
  file: string;
  snippet: string;
  explanation: string;
}

// Export story themes for backward compatibility with tests
export const STORY_THEMES = {
  SPACE: THEMES.SPACE.key,
  MYTHICAL: THEMES.MYTHICAL.key,
  ANCIENT: THEMES.ANCIENT.key
} as const;

export type StoryTheme = AdventureTheme;

/**
 * Consolidated StoryGenerator - Combines the best of both implementations
 * - JSON-based LLM responses for reliability
 * - Fallback templates when LLM is unavailable
 * - Adventure path generation for smart exploration
 * - Clean, maintainable code structure
 */
export class StoryGenerator {
  private llmClient: LLMClient;
  private themeManager: ThemeManager;
  private pathGenerator: AdventurePathGenerator;
  private currentProject?: ProjectInfo;

  constructor() {
    this.llmClient = new LLMClient();
    this.themeManager = new ThemeManager();
    this.pathGenerator = new AdventurePathGenerator();
  }

  /**
   * Set the current project for story generation
   */
  setProject(projectInfo: ProjectInfo): void {
    this.currentProject = projectInfo;
  }

  /**
   * Generate the initial story and adventures
   * Attempts to use LLM first, falls back to templates if unavailable
   */
  async generateStoryAndAdventures(projectInfo: ProjectInfo, theme: AdventureTheme): Promise<StoryResponse> {
    this.currentProject = projectInfo;
    const validatedTheme = this.validateTheme(theme);

    // Check if LLM is available
    if (this.llmClient.isAvailable()) {
      try {
        return await this.generateWithLLM(projectInfo, validatedTheme);
      } catch (error) {
        console.warn('LLM generation failed, falling back to templates:', error);
      }
    }

    // Fallback to template-based generation
    return this.generateWithTemplates(projectInfo, validatedTheme);
  }

  /**
   * Generate story - for backward compatibility with tests
   * Maps to generateStoryAndAdventures but returns a Story object
   */
  async generateStory(theme: AdventureTheme): Promise<Story> {
    if (!this.currentProject) {
      throw new Error('No project information available. Please analyze a project first.');
    }

    const response = await this.generateStoryAndAdventures(this.currentProject, theme);
    
    // Convert StoryResponse to Story format for backward compatibility
    const characters = this.generateDefaultCharacters(theme);
    const adventurePaths = this.pathGenerator.generatePaths(this.currentProject);
    const initialChoices = adventurePaths.length > 0 
      ? adventurePaths.map(path => path.name)
      : response.adventures.map(a => `Explore ${a.title}`);

    return {
      theme,
      title: `${theme} Code Adventure`,
      introduction: response.story,
      setting: `A ${theme}-themed exploration of your codebase`,
      characters,
      initialChoices
    };
  }

  /**
   * Generate detailed adventure content using LLM
   */
  async generateAdventureContent(
    adventure: Adventure,
    theme: AdventureTheme,
    projectInfo: ProjectInfo,
    codeContent: string
  ): Promise<AdventureContent> {
    if (!this.llmClient.isAvailable()) {
      return this.generateAdventureContentFallback(adventure, theme, codeContent);
    }

    const prompt = this.buildAdventureContentPrompt(adventure, theme, projectInfo, codeContent);

    try {
      const response = await this.withTimeout(
        this.llmClient.generateResponse(prompt, { responseFormat: 'json_object' })
      );
      
      const parsed = JSON.parse(response.content);
      this.validateAdventureContent(parsed);
      return parsed;
    } catch (error) {
      console.warn('LLM adventure content generation failed, using fallback:', error);
      return this.generateAdventureContentFallback(adventure, theme, codeContent);
    }
  }

  /**
   * Generate completion summary using LLM
   */
  async generateCompletionSummary(
    adventure: Adventure,
    theme: AdventureTheme,
    progress: number,
    total: number
  ): Promise<string> {
    const percentComplete = Math.round((progress / total) * 100);
    
    if (!this.llmClient.isAvailable()) {
      return this.generateCompletionSummaryFallback(adventure, theme, percentComplete);
    }

    const prompt = `Generate a ${theme}-themed completion celebration for: "${adventure.title}"

**Context:**
- Adventure completed: ${adventure.title}
- Progress: ${progress}/${total} adventures (${percentComplete}% complete)
- Theme: ${theme}
- Theme vocabulary: ${this.themeManager.getThemeVocabulary(theme)}

**Requirements:**
- Write 1-2 sentences using ${theme} terminology
- Celebrate the specific learning achievement
- Use encouraging, triumphant tone

Generate ONLY the celebration message, no extra text.`;

    try {
      const response = await this.llmClient.generateResponse(prompt);
      return response.content.trim();
    } catch (error) {
      console.warn('LLM completion summary failed, using fallback:', error);
      return this.generateCompletionSummaryFallback(adventure, theme, percentComplete);
    }
  }

  // ============= Private Methods =============

  /**
   * Generate with LLM
   */
  private async generateWithLLM(projectInfo: ProjectInfo, theme: AdventureTheme): Promise<StoryResponse> {
    const prompt = this.buildStoryGenerationPrompt(projectInfo, theme);

    const response = await this.withTimeout(
      this.llmClient.generateResponse(prompt, { responseFormat: 'json_object' })
    );
    
    const parsed = JSON.parse(response.content);
    this.validateStoryResponse(parsed);
    return parsed;
  }

  /**
   * Generate with fallback templates
   */
  private generateWithTemplates(projectInfo: ProjectInfo, theme: AdventureTheme): StoryResponse {
    const intro = this.getThemeIntroduction(theme, projectInfo);
    const adventures = this.generateTemplateAdventures(projectInfo, theme);

    return {
      story: intro,
      adventures
    };
  }

  /**
   * Generate template-based adventures
   */
  private generateTemplateAdventures(projectInfo: ProjectInfo, theme: AdventureTheme): Adventure[] {
    const adventures: Adventure[] = [];
    const paths = this.pathGenerator.generatePaths(projectInfo);
    
    // Convert paths to adventures
    paths.forEach((path, index) => {
      adventures.push({
        id: String(index + 1),
        title: `${this.getThemeEmoji(theme)} ${path.name}`,
        description: path.description,
        codeFiles: this.selectRelevantFiles(projectInfo, path.id)
      });
    });

    // Ensure we have at least 2 adventures
    if (adventures.length === 0) {
      adventures.push(
        {
          id: '1',
          title: `${this.getThemeEmoji(theme)} System Overview`,
          description: 'Explore the overall architecture and main components',
          codeFiles: projectInfo.codeAnalysis.entryPoints
        },
        {
          id: '2',
          title: `${this.getThemeEmoji(theme)} Core Logic`,
          description: 'Discover the main business logic and algorithms',
          codeFiles: projectInfo.codeAnalysis.functions.slice(0, 3).map(f => f.fileName)
        }
      );
    }

    return adventures;
  }

  /**
   * Generate fallback adventure content
   */
  private generateAdventureContentFallback(
    adventure: Adventure,
    theme: AdventureTheme,
    codeContent: string
  ): AdventureContent {
    const themeVocab = this.themeManager.getThemeVocabulary(theme);
    
    return {
      adventure: `Welcome to "${adventure.title}"! ${adventure.description} 
                  Let's explore the code using our ${theme} lens. ${themeVocab}`,
      fileExploration: `📍 Quest Action Required: Open the following files in your editor and explore the code structure. 
                        Look for patterns, connections, and how different parts work together.`,
      codeSnippets: this.extractCodeSnippets(codeContent),
      hints: [
        `Practical: Look for the main functions and understand their purpose in this ${theme} context.`,
        `Next Steps: After exploring these files, consider looking at related test files or configuration.`
      ]
    };
  }

  /**
   * Generate fallback completion summary
   */
  private generateCompletionSummaryFallback(
    adventure: Adventure,
    theme: AdventureTheme,
    percentComplete: number
  ): string {
    const celebrations = {
      space: `🚀 Mission accomplished! You've successfully navigated "${adventure.title}" (${percentComplete}% complete).`,
      mythical: `⚔️ Victory! You've conquered "${adventure.title}" (${percentComplete}% of your quest complete).`,
      ancient: `🏺 The Oracle smiles! You've unlocked the secrets of "${adventure.title}" (${percentComplete}% wisdom gained).`
    };

    return celebrations[theme as keyof typeof celebrations] || 
           `🎉 Adventure "${adventure.title}" completed! (${percentComplete}% progress)`;
  }

  /**
   * Build story generation prompt
   */
  private buildStoryGenerationPrompt(projectInfo: ProjectInfo, theme: AdventureTheme): string {
    const projectAnalysis = this.createProjectAnalysisPrompt(projectInfo);
    const themeGuidelines = this.themeManager.getThemeGuidelines(theme);
    const projectInsights = this.generateProjectInsights(theme, projectInfo);
    
    return `You are a technical education specialist creating immersive code exploration experiences.
Transform this codebase into an engaging ${theme}-themed narrative that weaves project details into the story.

## Project Analysis
${projectAnalysis}

${themeGuidelines}

## Key Project Elements to Integrate
${projectInsights}

## Critical Instructions
1. Create a ${theme}-themed narrative that INTEGRATES the project details naturally into the story
2. DO NOT create generic stories - weave in specific technologies, file names, and project characteristics
3. The story should be 2-3 paragraphs (250-350 words) that tells a cohesive narrative
4. Naturally incorporate the project elements above into the storyline
5. Make the reader understand what this specific codebase does through the narrative
6. End with "🗺️ **Your Mission Awaits** - Choose your path wisely, brave adventurer!"

## Example Integration Style
Instead of: "In a galaxy far away, starships travel..."
Write: "In the cosmic realm of ${projectInfo.type}, the advanced Starship '${projectInfo.mainTechnologies[0]}' navigates through ${projectInfo.fileCount} star systems, each powered by technologies like ${projectInfo.mainTechnologies.join(', ')}. The ship's command center at \`${projectInfo.codeAnalysis.entryPoints[0] || 'main'}\` coordinates complex operations..."

## Response Format
Return a valid JSON object:
{
  "story": "Integrated narrative that weaves in project specifics + ending with mission statement",
  "adventures": [
    {
      "id": "1",
      "title": "📍 Theme-appropriate title",
      "description": "One sentence explaining what this covers",
      "codeFiles": ["actual-file-names"]
    }
  ]
}

Create 2-6 adventures based on project complexity.`;
  }

  /**
   * Build adventure content prompt
   */
  private buildAdventureContentPrompt(
    adventure: Adventure,
    theme: AdventureTheme,
    projectInfo: ProjectInfo,
    codeContent: string
  ): string {
    return `Continue the ${theme}-themed exploration for: "${adventure.title}"

**Context:**
- Project: ${projectInfo.type} using ${projectInfo.mainTechnologies.join(', ')}
- Theme vocabulary: ${this.themeManager.getThemeVocabulary(theme)}

**Code Files:**
${codeContent}

## Response Format (JSON)
{
  "adventure": "1-2 paragraphs (max 150 words) continuing the narrative",
  "fileExploration": "Interactive quest section with specific tasks",
  "codeSnippets": [
    {
      "file": "filename",
      "snippet": "15-25 lines of ACTUAL code",
      "explanation": "Clear explanation of the code"
    }
  ],
  "hints": ["Practical tip", "Next steps"]
}`;
  }

  /**
   * Create project analysis prompt section
   */
  private createProjectAnalysisPrompt(projectInfo: ProjectInfo): string {
    // Use the rich LLM context summary from analyzer if available
    if (projectInfo.llmContextSummary) {
      return `**Comprehensive Project Analysis:**
${projectInfo.llmContextSummary}

**Additional Architecture Details:**
- Database: ${projectInfo.hasDatabase ? 'Yes' : 'No'}
- API: ${projectInfo.hasApi ? 'Yes' : 'No'}
- Frontend: ${projectInfo.hasFrontend ? 'Yes' : 'No'}
- Tests: ${projectInfo.hasTests ? 'Yes' : 'No'}
- Structure: ${projectInfo.structure.directories.slice(0, 5).join(', ')}`;
    }

    // Fallback to basic analysis if no LLM context summary
    const fileCount = projectInfo.fileCount;
    const complexity = fileCount < 20 ? 'Simple' : fileCount < 50 ? 'Medium' : 'Complex';

    const topFunctions = projectInfo.codeAnalysis.functions
      .slice(0, 5)
      .map(f => `  • ${f.name}() in ${f.fileName}`)
      .join('\n') || '  • No functions detected';

    return `**Project Overview:**
- Type: ${projectInfo.type}
- Complexity: ${complexity} (${fileCount} files)
- Technologies: ${projectInfo.mainTechnologies.join(', ')}
- Entry points: ${projectInfo.codeAnalysis.entryPoints.join(', ') || 'None'}

**Architecture:**
- Database: ${projectInfo.hasDatabase ? 'Yes' : 'No'}
- API: ${projectInfo.hasApi ? 'Yes' : 'No'}
- Frontend: ${projectInfo.hasFrontend ? 'Yes' : 'No'}
- Tests: ${projectInfo.hasTests ? 'Yes' : 'No'}

**Key Functions:**
${topFunctions}

**Structure:**
- Directories: ${projectInfo.structure.directories.slice(0, 5).join(', ')}`;
  }

  /**
   * Validate story response structure
   */
  private validateStoryResponse(parsed: any): void {
    if (!parsed.story || typeof parsed.story !== 'string') {
      throw new Error('Invalid response: missing or invalid story field');
    }
    
    if (!Array.isArray(parsed.adventures)) {
      throw new Error('Invalid response: adventures must be an array');
    }
    
    parsed.adventures.forEach((adventure: any, i: number) => {
      if (!adventure.id || !adventure.title || !adventure.description) {
        throw new Error(`Invalid adventure at index ${i}: missing required fields`);
      }
    });
  }

  /**
   * Validate adventure content structure
   */
  private validateAdventureContent(parsed: any): void {
    if (!parsed.adventure || typeof parsed.adventure !== 'string') {
      throw new Error('Invalid content: missing adventure field');
    }
    
    if (!Array.isArray(parsed.hints)) {
      throw new Error('Invalid content: hints must be an array');
    }
    
    if (!Array.isArray(parsed.codeSnippets)) {
      parsed.codeSnippets = [];
    }
  }

  /**
   * Helper to wrap promises with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number = LLM_REQUEST_TIMEOUT): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Validate and normalize theme
   */
  private validateTheme(theme: AdventureTheme): AdventureTheme {
    if (!isValidTheme(theme)) {
      console.warn(`Invalid theme '${theme}', defaulting to ${DEFAULT_THEME}`);
      return DEFAULT_THEME;
    }
    return theme;
  }

  /**
   * Get theme-specific introduction with project insights
   */
  private getThemeIntroduction(theme: AdventureTheme, projectInfo: ProjectInfo): string {
    // Create an integrated story that weaves in project details naturally
    const entryPoint = projectInfo.codeAnalysis.entryPoints[0] || 'main';
    const topFunctions = this.filterMeaningfulFunctions(projectInfo.codeAnalysis.functions).slice(0, 2);
    const topDeps = projectInfo.codeAnalysis.dependencies.slice(0, 2).map(d => d.name);
    
    const integratedStories = {
      space: this.createSpaceIntegratedStory(projectInfo, entryPoint, topFunctions, topDeps),
      mythical: this.createMythicalIntegratedStory(projectInfo, entryPoint, topFunctions, topDeps),
      ancient: this.createAncientIntegratedStory(projectInfo, entryPoint, topFunctions, topDeps)
    };
    
    const story = integratedStories[theme as keyof typeof integratedStories] || integratedStories.space;
    
    return `${story}

🗺️ **Your Mission Awaits** - Choose your path wisely, brave adventurer!`;
  }

  /**
   * Create space-themed integrated story
   */
  private createSpaceIntegratedStory(projectInfo: ProjectInfo, entryPoint: string, topFunctions: string[], topDeps: string[]): string {
    const techList = projectInfo.mainTechnologies.slice(0, 3).join(', ');
    const functionList = topFunctions.length > 0 ? topFunctions.join(', ') : 'advanced algorithms';
    const depList = topDeps.length > 0 ? topDeps.join(', ') : 'cutting-edge modules';
    
    return `🚀 In the vast digital cosmos, the advanced Starship '${projectInfo.type}' serves as a beacon of innovation, housing ${projectInfo.fileCount} interconnected modules powered by ${techList} technology. The ship's sophisticated command bridge, located at \`${entryPoint}\`, orchestrates a symphony of computational processes that would make even the most seasoned space captains marvel.

The vessel's core systems rely on powerful algorithms like \`${functionList}\` to navigate through complex data streams and coordinate mission-critical operations. These systems work in harmony with trusted companion modules such as \`${depList}\`, forming an intricate network of technological excellence that enables the ship to ${this.inferProjectPurpose(projectInfo)}.

Each deck of this remarkable vessel tells a story of engineering prowess - ${projectInfo.hasApi ? 'communication arrays facilitate interstellar data exchange' : 'internal processing cores handle computational tasks'}, while ${projectInfo.hasDatabase ? 'deep within the ship\'s core lie vast data archives storing the accumulated knowledge of countless digital civilizations' : 'the ship\'s memory banks efficiently manage operational data flows'}${projectInfo.hasTests ? ', with quality assurance protocols ensuring mission success' : ''}. The ship's architecture represents the pinnacle of digital craftsmanship, ready to embark on extraordinary computational voyages.`;
  }

  /**
   * Create mythical-themed integrated story
   */
  private createMythicalIntegratedStory(projectInfo: ProjectInfo, entryPoint: string, topFunctions: string[], topDeps: string[]): string {
    const techList = projectInfo.mainTechnologies.slice(0, 3).join(', ');
    const functionList = topFunctions.length > 0 ? topFunctions.join(', ') : 'ancient spells';
    const depList = topDeps.length > 0 ? topDeps.join(', ') : 'mystical artifacts';
    
    return `🏰 Welcome to the Enchanted Kingdom of ${projectInfo.type}, a realm where ${projectInfo.fileCount} scrolls of digital wisdom are woven together using the mystical arts of ${techList}. At the heart of this magical domain stands the Grand Castle, its gates opening at \`${entryPoint}\`, where the kingdom's most powerful enchantments come to life.

Within these ancient walls, powerful incantations such as \`${functionList}\` channel the raw forces of computation, while wise magical allies like \`${depList}\` lend their mystical powers to ${this.inferProjectPurpose(projectInfo)}. The castle's architecture reflects centuries of accumulated wisdom, each chamber serving a sacred purpose in the greater magical tapestry.

The kingdom flourishes through ${projectInfo.hasApi ? 'crystal communication towers that enable discourse with distant realms' : 'internal magical conduits that maintain harmony'}, while ${projectInfo.hasDatabase ? 'deep beneath the castle lie the Vaults of Eternal Memory, where all the kingdom\'s knowledge is preserved in crystalline archives' : 'the castle\'s memory halls efficiently organize the realm\'s magical essence'}${projectInfo.hasTests ? ', with ancient rituals ensuring the purity of each spell' : ''}. This enchanted realm stands as a testament to the fusion of ancient wisdom and modern digital sorcery.`;
  }

  /**
   * Create ancient-themed integrated story
   */
  private createAncientIntegratedStory(projectInfo: ProjectInfo, entryPoint: string, topFunctions: string[], topDeps: string[]): string {
    const techList = projectInfo.mainTechnologies.slice(0, 3).join(', ');
    const functionList = topFunctions.length > 0 ? topFunctions.join(', ') : 'sacred ceremonies';
    const depList = topDeps.length > 0 ? topDeps.join(', ') : 'holy relics';
    
    return `🏺 Behold the Lost Temple of ${projectInfo.type}, an architectural marvel where ${projectInfo.fileCount} sacred tablets preserve the digital wisdom of an advanced civilization that mastered the arts of ${techList}. The temple's grand entrance, located at \`${entryPoint}\`, serves as the threshold between the mundane world and the realm of computational enlightenment.

Throughout the temple's hallowed halls, ancient ceremonies like \`${functionList}\` are performed with reverent precision, while blessed artifacts such as \`${depList}\` channel divine power to ${this.inferProjectPurpose(projectInfo)}. Each chamber within this sacred space has been carefully designed by master architects who understood the profound mysteries of digital creation.

The temple's sacred architecture features ${projectInfo.hasApi ? 'divine communication altars that facilitate communion with external realms' : 'internal meditation spaces for focused computation'}, while ${projectInfo.hasDatabase ? 'at its heart lies the Chamber of Eternal Records, where all knowledge is inscribed upon immortal stone tablets' : 'memory vaults preserve essential wisdom with ancient precision'}${projectInfo.hasTests ? ', with consecrated rituals maintaining the sanctity of each digital blessing' : ''}. This timeless monument stands as proof that the ancients understood the eternal principles underlying all computational endeavors.`;
  }

  /**
   * Infer project purpose from available information
   */
  private inferProjectPurpose(projectInfo: ProjectInfo): string {
    if (projectInfo.type.toLowerCase().includes('api')) return 'facilitate seamless communication between digital realms';
    if (projectInfo.type.toLowerCase().includes('web')) return 'create immersive digital experiences';
    if (projectInfo.type.toLowerCase().includes('cli')) return 'provide powerful command-line capabilities';
    if (projectInfo.type.toLowerCase().includes('library')) return 'offer reusable building blocks to fellow developers';
    if (projectInfo.hasApi && projectInfo.hasDatabase) return 'manage and serve data across digital networks';
    if (projectInfo.hasApi) return 'bridge connections between different systems';
    if (projectInfo.hasDatabase) return 'organize and safeguard valuable information';
    return 'solve complex computational challenges';
  }

  /**
   * Generate project-specific insights with thematic flavor
   */
  private generateProjectInsights(theme: AdventureTheme, projectInfo: ProjectInfo): string {
    const insights: string[] = [];
    
    // Architecture insight
    const entryPoint = projectInfo.codeAnalysis.entryPoints[0];
    if (entryPoint) {
      const themeMap = {
        space: `🛸 **Command Bridge**: The starship's control center is located at \`${entryPoint}\``,
        mythical: `🏰 **Castle Gates**: The kingdom's main entrance lies at \`${entryPoint}\``, 
        ancient: `🚪 **Temple Entrance**: The sacred portal opens at \`${entryPoint}\``
      };
      insights.push(themeMap[theme as keyof typeof themeMap] || themeMap.space);
    }

    // Functions insight
    if (projectInfo.codeAnalysis.functions.length > 0) {
      const meaningfulFunctions = this.filterMeaningfulFunctions(projectInfo.codeAnalysis.functions);
      if (meaningfulFunctions.length > 0) {
        const topFunctions = meaningfulFunctions.slice(0, 3).join(', ');
        const themeMap = {
          space: `⚙️ **Core Systems**: Advanced algorithms like \`${topFunctions}\` power critical operations`,
          mythical: `🔮 **Magical Spells**: Powerful incantations including \`${topFunctions}\` weave through the code`,
          ancient: `📜 **Sacred Rituals**: Ancient ceremonies such as \`${topFunctions}\` hold mystical powers`
        };
        insights.push(themeMap[theme as keyof typeof themeMap] || themeMap.space);
      }
    }

    // Dependencies insight  
    if (projectInfo.codeAnalysis.dependencies.length > 0) {
      const topDeps = projectInfo.codeAnalysis.dependencies.slice(0, 2).map(d => d.name).join(', ');
      const themeMap = {
        space: `🤖 **Allied Technologies**: Trusted companions \`${topDeps}\` join your cosmic journey`,
        mythical: `🧙 **Magical Allies**: Wise wizards \`${topDeps}\` offer their mystical assistance`,
        ancient: `🏺 **Sacred Artifacts**: Ancient relics \`${topDeps}\` provide divine guidance`
      };
      insights.push(themeMap[theme as keyof typeof themeMap] || themeMap.space);
    }

    // Architecture features insight - prioritize core functionality over testing
    const hasApi = projectInfo.hasApi;
    const hasDatabase = projectInfo.hasDatabase;
    const hasTests = projectInfo.hasTests;
    
    if (hasApi || hasDatabase || hasTests) {
      const features: string[] = [];
      // Add core features first
      if (hasApi) features.push('communication portals'); 
      if (hasDatabase) features.push('data vaults');
      // Add testing last as supporting feature
      if (hasTests) features.push('quality chambers');
      
      const themeMap = {
        space: `🛰️ **Special Facilities**: The ship contains ${features.join(', ')} for advanced operations`,
        mythical: `⚔️ **Sacred Chambers**: The castle houses ${features.join(', ')} with magical properties`,
        ancient: `🏛️ **Holy Sanctuaries**: The temple includes ${features.join(', ')} blessed by the ancients`
      };
      insights.push(themeMap[theme as keyof typeof themeMap] || themeMap.space);
    }

    return insights.join('\n');
  }


  /**
   * Filter functions to focus on meaningful project-specific functions
   */
  private filterMeaningfulFunctions(functions: { name: string }[]): string[] {
    // Built-in functions and constructors to exclude
    const builtInFunctions = new Set([
      'Set', 'Map', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp',
      'Promise', 'Error', 'console', 'JSON', 'Math', 'parseInt', 'parseFloat',
      'constructor', 'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf',
      'propertyIsEnumerable', 'toLocaleString', 'prototype', 'length', 'name',
      'apply', 'call', 'bind', 'slice', 'splice', 'push', 'pop', 'shift', 'unshift'
    ]);

    // Generic/common method names to exclude
    const genericMethods = new Set([
      'get', 'set', 'add', 'remove', 'delete', 'create', 'update', 'find', 'filter',
      'map', 'forEach', 'reduce', 'some', 'every', 'includes', 'indexOf', 'join',
      'split', 'trim', 'replace', 'match', 'search', 'substring', 'slice'
    ]);

    const filteredNames = functions
      .map(f => f.name)
      .filter(name => {
        // Exclude built-in functions
        if (builtInFunctions.has(name)) return false;
        
        // Exclude very generic method names
        if (genericMethods.has(name)) return false;
        
        // Exclude single letters or very short names
        if (name.length <= 2) return false;
        
        // Exclude names that start with underscore (private/internal)
        if (name.startsWith('_')) return false;
        
        // Exclude test-related functions
        if (name.includes('test') || name.includes('spec') || name.includes('mock')) return false;
        
        // Exclude utility/helper functions that aren't core business logic
        if (name.includes('detect') || name.includes('util') || name.includes('helper')) return false;
        
        return true;
      });

    // Remove duplicates using Set
    const uniqueNames = [...new Set(filteredNames)];
    
    // Prioritize functions by importance
    return uniqueNames.sort((a, b) => {
      // Highest priority: Exact matches for key project functions
      const keyFunctions = ['initializeAdventure', 'exploreAdventure', 'analyzeProject', 'generateStory', 'generateStoryAndAdventures'];
      const aIsKey = keyFunctions.includes(a);
      const bIsKey = keyFunctions.includes(b);
      
      if (aIsKey && !bIsKey) return -1;
      if (!aIsKey && bIsKey) return 1;
      
      // Second priority: Core business function patterns
      const coreFunctions = ['initialize', 'analyze', 'generate', 'explore', 'start', 'create'];
      const aIsCore = coreFunctions.some(word => a.toLowerCase().includes(word));
      const bIsCore = coreFunctions.some(word => b.toLowerCase().includes(word));
      
      if (aIsCore && !bIsCore) return -1;
      if (!aIsCore && bIsCore) return 1;
      
      // Third priority: Action words
      const actionWords = ['process', 'handle', 'manage', 'build', 'execute', 'run', 'setup'];
      const aHasAction = actionWords.some(word => a.toLowerCase().includes(word));
      const bHasAction = actionWords.some(word => b.toLowerCase().includes(word));
      
      if (aHasAction && !bHasAction) return -1;
      if (!aHasAction && bHasAction) return 1;
      
      // Fourth priority: Longer, more descriptive names
      return b.length - a.length;
    });
  }

  /**
   * Get theme-appropriate emoji
   */
  private getThemeEmoji(theme: AdventureTheme): string {
    const emojis = { space: '🚀', mythical: '⚔️', ancient: '🏺' };
    return emojis[theme as keyof typeof emojis] || '🎯';
  }

  /**
   * Select relevant files for an adventure path
   */
  private selectRelevantFiles(projectInfo: ProjectInfo, pathId: string): string[] {
    const analysis = projectInfo.codeAnalysis;
    
    switch (pathId) {
      case 'main-quest':
        return analysis.entryPoints.slice(0, 3);
      case 'configuration-caverns':
        return projectInfo.structure.configFiles.slice(0, 3);
      default:
        return analysis.functions.slice(0, 3).map(f => f.fileName);
    }
  }

  /**
   * Extract code snippets from content
   */
  private extractCodeSnippets(codeContent: string): CodeSnippet[] {
    const snippets: CodeSnippet[] = [];
    const lines = codeContent.split('\n');
    
    // Simple extraction - take first 20 lines as a snippet
    if (lines.length > 0) {
      snippets.push({
        file: 'current-file',
        snippet: lines.slice(0, Math.min(20, lines.length)).join('\n'),
        explanation: 'This code section shows the main structure and key functions.'
      });
    }
    
    return snippets;
  }

  /**
   * Generate default characters for themes
   */
  private generateDefaultCharacters(theme: AdventureTheme): Character[] {
    const templates = {
      space: {
        name: 'Data Navigator Zara',
        role: 'Chief Data Officer',
        description: 'A brilliant navigator who charts courses through data galaxies.',
        greeting: 'Welcome aboard, space traveler!',
        funFact: 'I can process stellar databases faster than light!',
        technology: 'Database'
      },
      mythical: {
        name: 'Keeper Magnus',
        role: 'Guardian of Code Archives',
        description: 'An ancient keeper who protects the scrolls of knowledge.',
        greeting: 'Hail, brave adventurer!',
        funFact: 'I have guarded these scrolls for centuries!',
        technology: 'Database'
      },
      ancient: {
        name: 'Oracle Pythia',
        role: 'Keeper of Digital Prophecies',
        description: 'A wise oracle who interprets patterns in code.',
        greeting: 'Seeker of knowledge, welcome!',
        funFact: 'I can divine the future from algorithms!',
        technology: 'Database'
      }
    };

    const template = templates[theme as keyof typeof templates] || templates.space;
    return [template];
  }
}

// For backward compatibility with DynamicStoryGenerator usage
export { StoryGenerator as DynamicStoryGenerator };