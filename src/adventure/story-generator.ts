import type { ProjectInfo } from '../shared/types.js';
import { AdventureTheme, CustomThemeData } from '../shared/theme.js';
import { LLM_REQUEST_TIMEOUT, DEFAULT_THEME, LLM_MAX_TOKENS_STORY, LLM_MAX_TOKENS_QUEST } from '../shared/config.js';
import { isValidTheme } from '../shared/theme.js';
import { LLMClient } from '../llm/llm-client.js';
import { loadAdventureConfig } from '../shared/adventure-config.js';
import { loadStoryGenerationPrompt, loadQuestContentPrompt, loadCompletionPrompt } from '../shared/prompt-loader.js';
import { z } from 'zod';

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

// Zod schemas for LLM response validation
const QuestSchema = z.object({
  id: z.string(),
  title: z.string(), 
  description: z.string(),
  codeFiles: z.array(z.string()).optional()
});

const StoryResponseSchema = z.object({
  story: z.string(), // Note: simplified to string only (Story interface not used by LLM)
  quests: z.array(QuestSchema)
});

const CodeSnippetSchema = z.object({
  file: z.string(),
  snippet: z.string(),
  explanation: z.string()
});

const QuestContentSchema = z.object({
  adventure: z.string(),
  fileExploration: z.string().optional(),
  codeSnippets: z.array(CodeSnippetSchema).default([]),
  hints: z.array(z.string())
});



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
      const rawParsed = JSON.parse(response.content);
      parsed = QuestContentSchema.parse(rawParsed) as QuestContent;
    } catch (error) {
      throw new Error(`Invalid LLM response for quest content: ${error instanceof Error ? error.message : 'Unknown error'}. Response: ${response.content.substring(0, 200)}...`);
    }
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
      const rawParsed = JSON.parse(response.content);
      parsed = StoryResponseSchema.parse(rawParsed) as StoryResponse;
    } catch (error) {
      throw new Error(`Invalid LLM response for story: ${error instanceof Error ? error.message : 'Unknown error'}. Response: ${response.content.substring(0, 200)}...`);
    }
    return parsed;
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