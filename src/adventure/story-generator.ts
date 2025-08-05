import type { ProjectInfo } from '../shared/types.js';
import { AdventureTheme } from '../shared/theme.js';
import { LLM_REQUEST_TIMEOUT, DEFAULT_THEME } from '../shared/config.js';
import { isValidTheme, THEMES } from '../shared/theme.js';
import { LLMClient } from '../llm/llm-client.js';
import { ThemeManager } from './theme-manager.js';
import { StoryTemplateEngine } from './story-template-engine.js';
import { ProjectInsightGenerator } from './project-insight-generator.js';

export interface Adventure {
  id: string;
  title: string;
  description: string;
  codeFiles?: string[];
}

export interface Story {
  content: string;
  theme: AdventureTheme;
  setting: string;
}

export interface StoryResponse {
  story: string | Story;
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
  private templateEngine: StoryTemplateEngine;
  private insightGenerator: ProjectInsightGenerator;
  private currentProject?: ProjectInfo;

  constructor() {
    this.llmClient = new LLMClient();
    this.themeManager = new ThemeManager();
    this.templateEngine = new StoryTemplateEngine();
    this.insightGenerator = new ProjectInsightGenerator();
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

    return {
      theme,
      content: typeof response.story === 'string' ? response.story : response.story.content,
      setting: `A ${theme}-themed exploration of your codebase`
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
   * Generate with fallback templates (delegates to template engine)
   */
  private generateWithTemplates(projectInfo: ProjectInfo, theme: AdventureTheme): StoryResponse {
    return this.templateEngine.generateWithTemplates(projectInfo, theme);
  }


  /**
   * Generate fallback adventure content (delegates to template engine)
   */
  private generateAdventureContentFallback(
    adventure: Adventure,
    theme: AdventureTheme,
    codeContent: string
  ): AdventureContent {
    // Use currentProject if available, otherwise create minimal project info
    const projectInfo = this.currentProject || ({
      type: 'Unknown',
      mainTechnologies: [],
      fileCount: 0,
      structure: { directories: [], sourceFiles: [], configFiles: [] },
      hasTests: false,
      hasDatabase: false,
      hasApi: false,
      hasFrontend: false,
      codeAnalysis: {
        functions: [],
        classes: [],
        entryPoints: [],
        dependencies: [],
        patterns: []
      }
    } as unknown as ProjectInfo);
    
    const fallbackContent = this.templateEngine.generateAdventureContentFallback(
      adventure, 
      theme, 
      projectInfo,
      codeContent
    );
    
    // Add code snippets if available
    fallbackContent.codeSnippets = this.extractCodeSnippets(codeContent);
    
    return fallbackContent;
  }

  /**
   * Generate fallback completion summary (delegates to template engine)
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
    const projectAnalysis = this.insightGenerator.createProjectAnalysisPrompt(projectInfo);
    const themeGuidelines = this.themeManager.getThemeGuidelines(theme);
    const projectInsights = this.insightGenerator.generateProjectInsights(theme, projectInfo);
    
    return `You are a technical education specialist creating immersive code exploration experiences.
Transform this codebase into an engaging ${theme}-themed narrative that weaves project details into the story.

## Project Analysis
${projectAnalysis}

${themeGuidelines}

## Key Project Elements to Integrate
${projectInsights}

## Critical Instructions
1. First, INFER what type of project this is based on the analysis (e.g., "Web Application", "API Service", "CLI Tool", "Library", "Mobile App", "Game", "Data Pipeline", etc.) - be specific and descriptive
2. Create a ${theme}-themed narrative that INTEGRATES the project details naturally into the story
3. DO NOT create generic stories - weave in specific technologies, file names, and project characteristics
4. The story should be 2-3 paragraphs (250-350 words) that tells a cohesive narrative
5. Naturally incorporate the project elements above into the storyline
6. Make the reader understand what this specific codebase does through the narrative
7. End with "🗺️ **Your Mission Awaits** - Choose your path wisely, brave adventurer!"

## Example Integration Style
Instead of: "In a galaxy far away, starships travel..."
Write: "In the cosmic realm of [YOUR INFERRED PROJECT TYPE], the advanced Starship '${projectInfo.mainTechnologies[0]}' navigates through ${projectInfo.fileCount} star systems, each powered by technologies like ${projectInfo.mainTechnologies.join(', ')}. The ship's command center at \`${projectInfo.codeAnalysis.entryPoints[0] || 'main'}\` coordinates complex operations..."

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

## CRITICAL: Code Authenticity Requirements
- Use ONLY the code provided in the "Code Files" section above
- DO NOT create, modify, or invent any code examples
- If no code is available, say "No code available for this file"
- Show actual imports, actual function names, actual technologies from the files

## Response Format (JSON)
{
  "adventure": "1-2 paragraphs (max 150 words) continuing the narrative",
  "fileExploration": "Interactive quest section with specific tasks",
  "codeSnippets": [
    {
      "file": "filename",
      "snippet": "EXACT code from the files provided above - DO NOT invent or modify code",
      "explanation": "Clear explanation of the actual code shown"
    }
  ],
  "hints": ["Practical tip", "Next steps"]
}`;
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

}

// For backward compatibility with DynamicStoryGenerator usage
export { StoryGenerator as DynamicStoryGenerator };