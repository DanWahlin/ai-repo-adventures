import type { ProjectInfo } from '../shared/types.js';
import { AdventureTheme } from '../shared/theme.js';
import { LLM_REQUEST_TIMEOUT, DEFAULT_THEME } from '../shared/config.js';
import { isValidTheme, THEMES } from '../shared/theme.js';
import { LLMClient } from '../llm/llm-client.js';

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
  private currentProject?: ProjectInfo;

  constructor() {
    this.llmClient = new LLMClient();
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

**Requirements:**
- Write 1-2 sentences using ${theme} terminology
- Celebrate the specific learning achievement
- Use encouraging, triumphant tone
- For space: use starship/mission/cosmic terms
- For mythical: use kingdom/quest/heroic terms  
- For ancient: use temple/wisdom/sacred terms

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
   * Generate simple fallback story when LLM is unavailable
   */
  private generateWithTemplates(projectInfo: ProjectInfo, theme: AdventureTheme): StoryResponse {
    const story = `🌟 **Welcome to your ${theme} adventure!**\n\nThis ${projectInfo.type} contains ${projectInfo.fileCount} files ready for exploration.\n\n*Note: This is a basic fallback story. For rich, dynamic narratives, configure an LLM provider.*`;
    
    const adventures: Adventure[] = [
      {
        id: 'explore-architecture',
        title: 'Explore the Architecture',
        description: 'Discover the overall structure and design patterns',
        codeFiles: []
      },
      {
        id: 'explore-core-logic',
        title: 'Explore Core Logic',
        description: 'Dive into the main business logic and algorithms',
        codeFiles: []
      },
      {
        id: 'explore-configuration',
        title: 'Explore Configuration',
        description: 'Understand the setup and configuration files',
        codeFiles: []
      }
    ];
    
    return { story, adventures };
  }


  /**
   * Generate simple fallback adventure content when LLM is unavailable
   */
  private generateAdventureContentFallback(
    adventure: Adventure,
    theme: AdventureTheme,
    codeContent: string
  ): AdventureContent {
    const content = `🌟 **${adventure.title}**\n\n${adventure.description}\n\nThis adventure explores the codebase structure and reveals insights about the project architecture.\n\n*Note: This is a basic fallback. For rich, dynamic narratives with code analysis, configure an LLM provider.*`;
    
    return {
      adventure: content,
      fileExploration: codeContent ? 'Code content available for exploration.' : 'No specific code content provided.',
      codeSnippets: this.extractCodeSnippets(codeContent),
      hints: [
        'Configure an LLM provider for detailed code analysis',
        'The repomix content contains comprehensive project information',
        'Adventure content is dynamically generated based on your actual codebase'
      ]
    };
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
   * Build story generation prompt with repomix content
   */
  private buildStoryGenerationPrompt(projectInfo: ProjectInfo, theme: AdventureTheme): string {
    const repomixContent = projectInfo.repomixContent || 'No repomix content available';
    const themeGuidelines = this.getThemeGuidelines(theme);
    
    return `You are a technical education specialist creating immersive code exploration experiences.
Transform this codebase into an engaging ${theme}-themed narrative that weaves project details into the story.

## Complete Codebase Analysis
${repomixContent}

${themeGuidelines}

## Critical Instructions
1. First, ANALYZE the repomix content above to INFER what type of project this is (e.g., "Web Application", "API Service", "CLI Tool", "Library", "Mobile App", "Game", "Data Pipeline", etc.) - be specific and descriptive
2. Create a ${theme}-themed narrative that INTEGRATES the project details naturally into the story
3. DO NOT create generic stories - weave in specific technologies, file names, and project characteristics from the repomix content
4. The story should be 2-3 paragraphs (250-350 words) that tells a cohesive narrative
5. Naturally incorporate actual file names, technologies, and patterns from the repomix analysis
6. Make the reader understand what this specific codebase does through the narrative
7. End with "🗺️ **Your Mission Awaits** - Choose your path wisely, brave adventurer!"

## Example Integration Style
Instead of: "In a galaxy far away, starships travel..."
Write: "In the cosmic realm of [YOUR INFERRED PROJECT TYPE], the advanced Starship navigates through interconnected systems, powered by the technologies revealed in the repomix analysis. The ship's command center coordinates complex operations..."

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

Create 2-6 adventures based on the project complexity revealed in the repomix content.`;
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
    const themeGuidelines = this.getThemeGuidelines(theme);
    
    return `Continue the ${theme}-themed exploration for: "${adventure.title}"

${themeGuidelines}

**Complete Codebase Context:**
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
   * Get theme-specific guidelines for story generation
   */
  private getThemeGuidelines(theme: AdventureTheme): string {
    const themeRestrictions = {
      space: '(space ships, galaxies, astronauts - NOT kingdoms or magic)',
      mythical: '(castles, knights, magic, mythical creatures - NOT space ships or ancient temples)',
      ancient: '(temples, pyramids, ancient wisdom - NOT space ships or mythical castles)'
    } as const;
    
    const restriction = themeRestrictions[theme as keyof typeof themeRestrictions] || themeRestrictions.space;
    
    return `## Theme Guidelines

**${theme.toUpperCase()} THEME VOCABULARY:**
- For space: use starship/mission/cosmic/navigation/crew/galaxy terms
- For mythical: use kingdom/quest/heroic/castle/knight/magic terms
- For ancient: use temple/wisdom/sacred/pyramid/priest/ritual terms

**Story Requirements:**
- Create an overarching narrative that connects all adventures
- Each adventure should feel like a chapter in a larger story
- Use ${theme} metaphors that make technical concepts intuitive
- Reference actual file names and technologies from the analysis
- Make the story educational but entertaining
- IMPORTANT: Stay strictly within the ${theme} theme - no mixing of themes!
  ${restriction}`;
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