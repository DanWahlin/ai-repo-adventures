import type { ProjectInfo } from '../shared/types.js';
import { AdventureTheme, CustomThemeData } from '../shared/theme.js';
import { LLM_REQUEST_TIMEOUT, DEFAULT_THEME, LLM_MAX_TOKENS_STORY, LLM_MAX_TOKENS_QUEST } from '../shared/config.js';
import { isValidTheme, THEMES } from '../shared/theme.js';
import { LLMClient } from '../llm/llm-client.js';
import { loadAdventureConfig, formatConfigForPrompt, extractHighlightsForFiles, type AdventureConfig } from '../shared/adventure-config.js';
import { loadStoryGenerationPrompt, loadQuestContentPrompt, loadCompletionPrompt } from '../shared/prompt-loader.js';

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

// Internal interfaces for validation
interface ParsedStoryResponse {
  story: string;
  adventures: ParsedAdventure[];
}

interface ParsedAdventure {
  id: string;
  title: string;
  description: string;
  codeFiles?: string[];
}

interface ParsedAdventureContent {
  adventure: string;
  fileExploration?: string;
  codeSnippets: ParsedCodeSnippet[];
  hints: string[];
}

interface ParsedCodeSnippet {
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
  private customThemeData?: CustomThemeData;
  private adventureConfig?: AdventureConfig | null;

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
   * Set custom theme data for custom theme stories
   */
  setCustomTheme(customThemeData: CustomThemeData): void {
    this.customThemeData = customThemeData;
  }

  /**
   * Generate the initial story and adventures using LLM
   */
  async generateStoryAndAdventures(projectInfo: ProjectInfo, theme: AdventureTheme, projectPath?: string): Promise<StoryResponse> {
    this.currentProject = projectInfo;
    
    // Load adventure config if projectPath is provided
    if (projectPath) {
      this.adventureConfig = loadAdventureConfig(projectPath);
    }
    
    const validatedTheme = this.validateTheme(theme);
    return await this.generateWithLLM(projectInfo, validatedTheme);
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
    codeContent: string
  ): Promise<AdventureContent> {
    // Find matching adventure config and extract highlights
    let workshopHighlights = '';
    if (this.adventureConfig && adventure.codeFiles) {
      const highlights = extractHighlightsForFiles(this.adventureConfig, adventure.title, adventure.codeFiles);
      if (highlights.length > 0) {
        workshopHighlights = `\n## Workshop Highlights (Technical Reference Only)
These are the technical functions to explore - but present them in ${theme} terms:

${highlights.map(h => `- **${h.name}**: ${h.description}`).join('\n')}

IMPORTANT: Do NOT mention these function names directly in your narrative! Instead, create the themed
narrative around these concepts. You can include the actual file or function name in parentheses next to
the appropriate place in the story/narrative.

Instead, describe them using ${theme}-appropriate metaphors:
- Constructor → Space: "Ship initialization sequence" / Medieval: "Castle foundation ritual"
- Handler → Space: "Communication protocol" / Medieval: "Message courier system"
Transform the technical concepts into your themed story while exploring the actual code.
`;
      }
    }

    const prompt = loadQuestContentPrompt({
      theme,
      adventureTitle: adventure.title,
      codeContent,
      ...(workshopHighlights && { workshopHighlights }),
      ...(this.customThemeData && { customThemeData: this.customThemeData })
    });

    const response = await this.withTimeout(
      this.llmClient.generateResponse(prompt, { responseFormat: 'json_object', maxTokens: LLM_MAX_TOKENS_QUEST })
    );
    
    if (!response.content || response.content.trim() === '') {
      throw new Error('LLM returned empty response for adventure content');
    }
    
    let parsed;
    try {
      parsed = JSON.parse(response.content);
    } catch (error) {
      throw new Error(`Invalid JSON response from LLM for adventure content: ${error instanceof Error ? error.message : 'Unknown error'}. Response: ${response.content.substring(0, 200)}...`);
    }
    
    this.validateAdventureContent(parsed);
    return parsed;
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
    
    let themeDescription: string = theme;
    let vocabularyHint = '';
    
    if (theme === 'custom' && this.customThemeData) {
      themeDescription = this.customThemeData.name;
      vocabularyHint = `Use these custom theme keywords: ${this.customThemeData.keywords.join(', ')}`;
    } else if (theme === 'developer') {
      vocabularyHint = 'Use professional technical documentation language';
    } else {
      const vocabularyMap = {
        space: 'starship/mission/cosmic terms',
        mythical: 'kingdom/quest/heroic terms',
        ancient: 'temple/wisdom/sacred terms'
      } as const;
      vocabularyHint = `Use ${vocabularyMap[theme as keyof typeof vocabularyMap] || 'appropriate theme terms'}`;
    }
    
    const prompt = loadCompletionPrompt({
      themeDescription,
      adventureTitle: adventure.title,
      progress,
      total,
      percentComplete,
      vocabularyHint
    });

    const response = await this.llmClient.generateResponse(prompt);
    return response.content.trim();
  }

  // ============= Private Methods =============

  /**
   * Generate with LLM
   */
  private async generateWithLLM(projectInfo: ProjectInfo, theme: AdventureTheme): Promise<StoryResponse> {
    const repomixContent = projectInfo.repomixContent || 'No repomix content available';
    
    // Add adventure config guidance if available
    const adventureGuidance = this.adventureConfig 
      ? `\n## Adventure Guidance (Technical Reference Only)
The following predefined adventure structure identifies important code areas to explore:

${formatConfigForPrompt(this.adventureConfig)}

IMPORTANT: DO NOT use these titles or descriptions literally! They are technical references only.
You MUST transform them into ${theme}-themed adventures:
- "Core Server" → Space: "Command Bridge Protocol Systems" / Medieval: "Castle's Command Tower" 
- "File Management" → Space: "Navigation & Mission Control" / Medieval: "Quest Chronicles Hall"

Use the file paths and function highlights to understand what code areas to focus on,
but CREATE NEW themed titles and descriptions that fit the ${theme} narrative.\n`
      : '';

    const prompt = loadStoryGenerationPrompt({
      theme,
      repomixContent,
      ...(adventureGuidance && { adventureGuidance }),
      ...(this.customThemeData && { customThemeData: this.customThemeData })
    });

    const response = await this.withTimeout(
      this.llmClient.generateResponse(prompt, { responseFormat: 'json_object', maxTokens: LLM_MAX_TOKENS_STORY })
    );
    
    if (!response.content || response.content.trim() === '') {
      throw new Error('LLM returned empty response');
    }
    
    let parsed;
    try {
      parsed = JSON.parse(response.content);
    } catch (error) {
      throw new Error(`Invalid JSON response from LLM: ${error instanceof Error ? error.message : 'Unknown error'}. Response: ${response.content.substring(0, 200)}...`);
    }
    
    this.validateStoryResponse(parsed);
    return parsed;
  }





  /**
   * Validate story response structure
   */
  private validateStoryResponse(parsed: unknown): parsed is ParsedStoryResponse {
    const candidate = parsed as ParsedStoryResponse;
    
    if (!candidate.story || typeof candidate.story !== 'string') {
      throw new Error('Invalid response: missing or invalid story field');
    }
    
    if (!Array.isArray(candidate.adventures)) {
      throw new Error('Invalid response: adventures must be an array');
    }
    
    candidate.adventures.forEach((adventure, i: number) => {
      if (!adventure.id || !adventure.title || !adventure.description) {
        throw new Error(`Invalid adventure at index ${i}: missing required fields`);
      }
    });
    
    return true;
  }

  /**
   * Validate adventure content structure
   */
  private validateAdventureContent(parsed: unknown): parsed is ParsedAdventureContent {
    const candidate = parsed as ParsedAdventureContent;
    
    if (!candidate.adventure || typeof candidate.adventure !== 'string') {
      throw new Error('Invalid content: missing adventure field');
    }
    
    if (!Array.isArray(candidate.hints)) {
      throw new Error('Invalid content: hints must be an array');
    }
    
    if (!Array.isArray(candidate.codeSnippets)) {
      candidate.codeSnippets = [];
    }
    
    return true;
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








}

// For backward compatibility with DynamicStoryGenerator usage
export { StoryGenerator as DynamicStoryGenerator };