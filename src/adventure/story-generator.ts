import type { ProjectInfo } from '../analyzer/index.js';
import { AdventureTheme } from '../shared/theme.js';
import { TIMEOUTS, ADVENTURE_CONFIG, isValidTheme, THEMES, Character, Story } from '../shared/index.js';
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
    
    return `You are a technical education specialist creating immersive code exploration experiences.
Transform this codebase into an engaging ${theme}-themed narrative.

## Project Analysis
${projectAnalysis}

${themeGuidelines}

## Response Format
Return a valid JSON object:
{
  "story": "A concise 1-2 paragraph opening (max 150 words) that establishes the ${theme} world.",
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
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number = TIMEOUTS.LLM_REQUEST): Promise<T> {
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
      console.warn(`Invalid theme '${theme}', defaulting to ${ADVENTURE_CONFIG.DEFAULT_THEME}`);
      return ADVENTURE_CONFIG.DEFAULT_THEME;
    }
    return theme;
  }

  /**
   * Get theme-specific introduction
   */
  private getThemeIntroduction(theme: AdventureTheme, projectInfo: ProjectInfo): string {
    const projectName = projectInfo.type || 'Codebase';
    const intros = {
      space: `🚀 Welcome aboard the Starship ${projectName}! This advanced vessel contains ${projectInfo.fileCount} modules powered by ${projectInfo.mainTechnologies.join(', ')} technology. Your mission: explore its systems and unlock its secrets.`,
      mythical: `🏰 Welcome to the Enchanted Kingdom of ${projectName}! This mystical realm spans ${projectInfo.fileCount} scrolls of wisdom, woven with ${projectInfo.mainTechnologies.join(', ')} magic. Your quest: discover its hidden powers.`,
      ancient: `🏺 Welcome to the Lost Temple of ${projectName}! These ancient halls contain ${projectInfo.fileCount} tablets inscribed with ${projectInfo.mainTechnologies.join(', ')} knowledge. Your journey: uncover its mysteries.`
    };

    return intros[theme as keyof typeof intros] || intros.space;
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