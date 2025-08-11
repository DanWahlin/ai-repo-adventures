import type { ProjectInfo } from '../shared/types.js';
import { AdventureTheme, CustomThemeData } from '../shared/theme.js';
import { LLM_REQUEST_TIMEOUT, DEFAULT_THEME, LLM_MAX_TOKENS_STORY, LLM_MAX_TOKENS_QUEST } from '../shared/config.js';
import { isValidTheme } from '../shared/theme.js';
import { LLMClient } from '../llm/llm-client.js';
import { loadAdventureConfig } from '../shared/adventure-config.js';
import { loadStoryGenerationPrompt, loadQuestContentPrompt, loadCompletionPrompt } from '../shared/prompt-loader.js';

export interface Quest {
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
  quests: Quest[];
}

export interface QuestContent {
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
  private adventureConfigJson?: string | null;

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
   * Generate the initial story and quests using LLM
   */
  async generateStoryAndQuests(projectInfo: ProjectInfo, theme: AdventureTheme, projectPath?: string): Promise<StoryResponse> {
    this.currentProject = projectInfo;
    
    // Load adventure config if projectPath is provided
    if (projectPath) {
      this.adventureConfigJson = loadAdventureConfig(projectPath);
    }
    
    const validatedTheme = this.validateTheme(theme);
    return await this.generateWithLLM(projectInfo, validatedTheme);
  }

  /**
   * Generate story - for backward compatibility with tests
   * Maps to generateStoryAndQuests but returns a Story object
   */
  async generateStory(theme: AdventureTheme): Promise<Story> {
    if (!this.currentProject) {
      throw new Error('No project information available. Please analyze a project first.');
    }

    const response = await this.generateStoryAndQuests(this.currentProject, theme);
    
    // Convert StoryResponse to Story format

    return {
      theme,
      content: typeof response.story === 'string' ? response.story : response.story.content,
      setting: `A ${theme}-themed exploration of your codebase`
    };
  }

  /**
   * Generate detailed quest content using LLM
   */
  async generateQuestContent(
    quest: Quest,
    theme: AdventureTheme,
    codeContent: string
  ): Promise<QuestContent> {
    // Include adventure config as context if available
    let adventureGuidance = '';
    if (this.adventureConfigJson) {
      adventureGuidance = `\n## Adventure Configuration Context
${this.adventureConfigJson}`;
    }

    const prompt = loadQuestContentPrompt({
      theme,
      adventureTitle: quest.title,
      codeContent,
      ...(adventureGuidance && { adventureGuidance }),
      ...(this.customThemeData && { customThemeData: this.customThemeData })
    });

    const response = await this.withTimeout(
      this.llmClient.generateResponse(prompt, { responseFormat: 'json_object', maxTokens: LLM_MAX_TOKENS_QUEST })
    );
    
    if (!response.content || response.content.trim() === '') {
      throw new Error('LLM returned empty response for quest content');
    }
    
    let parsed;
    try {
      parsed = JSON.parse(response.content);
    } catch (error) {
      throw new Error(`Invalid JSON response from LLM for quest content: ${error instanceof Error ? error.message : 'Unknown error'}. Response: ${response.content.substring(0, 200)}...`);
    }
    
    this.validateQuestContent(parsed);
    return parsed;
  }


  /**
   * Generate completion summary using LLM
   */
  async generateCompletionSummary(
    quest: Quest,
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
      adventureTitle: quest.title,
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
    
    // Add adventure config as context if available
    const adventureGuidance = this.adventureConfigJson 
      ? `\n## Adventure Configuration Context
${this.adventureConfigJson}
`
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
  private validateStoryResponse(parsed: unknown): parsed is StoryResponse {
    const candidate = parsed as any;
    
    if (!candidate.story || typeof candidate.story !== 'string') {
      throw new Error('Invalid response: missing or invalid story field');
    }
    
    // Validate quests array
    if (!Array.isArray(candidate.quests)) {
      throw new Error('Invalid response: quests must be an array');
    }
    
    candidate.quests.forEach((quest: any, i: number) => {
      if (!quest.id || !quest.title || !quest.description) {
        throw new Error(`Invalid quest at index ${i}: missing required fields`);
      }
    });
    
    return true;
  }

  /**
   * Validate quest content structure
   */
  private validateQuestContent(parsed: unknown): parsed is QuestContent {
    const candidate = parsed as any;
    
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

// Legacy export name for consistency
export { StoryGenerator as DynamicStoryGenerator };