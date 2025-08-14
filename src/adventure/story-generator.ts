import type { ProjectInfo } from '../shared/types.js';
import { AdventureTheme, CustomThemeData } from '../shared/theme.js';
import { LLM_REQUEST_TIMEOUT, DEFAULT_THEME, LLM_MAX_TOKENS_STORY, LLM_MAX_TOKENS_QUEST } from '../shared/config.js';
import { isValidTheme } from '../shared/theme.js';
import { LLMClient } from '../llm/llm-client.js';
import { loadAdventureConfig } from '../shared/adventure-config.js';
import { loadStoryGenerationPrompt, loadQuestContentPrompt, loadCompletionPrompt } from '../shared/prompt-loader.js';
import { marked } from 'marked';
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
  title: string;
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
  title: z.string(),
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
 * Parse markdown response to extract structured data
 */
function parseMarkdownToStoryResponse(markdownContent: string): StoryResponse {
  const tokens = marked.lexer(markdownContent);
  let title = '';
  let story = '';
  const quests: Quest[] = [];
  
  let currentSection = '';
  let currentQuest: Partial<Quest> = {};
  
  for (const token of tokens) {
    if (token.type === 'heading') {
      if (token.depth === 1) {
        title = token.text;
      } else if (token.depth === 2) {
        currentSection = token.text.toLowerCase();
        if (currentSection === 'story' || currentSection === 'adventure') {
          // Next paragraphs will be story content
        } else if (currentSection === 'quests' || currentSection === 'adventures') {
          // Next sections will be quests
        }
      } else if (token.depth === 3 && (currentSection === 'quests' || currentSection === 'adventures')) {
        // Save previous quest if exists
        if (currentQuest.title && currentQuest.description) {
          quests.push({
            id: `quest-${quests.length + 1}`,
            title: currentQuest.title,
            description: currentQuest.description,
            codeFiles: currentQuest.codeFiles || []
          });
        }
        // Start new quest
        currentQuest = { title: token.text, description: '', codeFiles: [] };
      }
    } else if (token.type === 'paragraph') {
      if (currentSection === 'story' || currentSection === 'adventure') {
        story += token.text + '\n\n';
      } else if (currentQuest.title) {
        currentQuest.description += token.text + '\n\n';
      }
    } else if (token.type === 'list' && currentQuest.title) {
      // Extract code files from list items
      for (const item of token.items) {
        if (item.text.includes('.') && (item.text.includes('/') || item.text.match(/\.(ts|js|py|java|cpp|c|rs|go)$/))) {
          currentQuest.codeFiles = currentQuest.codeFiles || [];
          currentQuest.codeFiles.push(item.text.trim());
        }
      }
    }
  }
  
  // Add final quest if exists
  if (currentQuest.title && currentQuest.description) {
    quests.push({
      id: `quest-${quests.length + 1}`,
      title: currentQuest.title,
      description: currentQuest.description.trim(),
      codeFiles: currentQuest.codeFiles || []
    });
  }
  
  return {
    title: title || 'Adventure',
    story: story.trim() || 'Welcome to your coding adventure!',
    quests
  };
}

/**
 * Parse markdown response to extract quest content
 */
function parseMarkdownToQuestContent(markdownContent: string): QuestContent {
  const tokens = marked.lexer(markdownContent);
  let adventure = '';
  let fileExploration = '';
  const codeSnippets: CodeSnippet[] = [];
  const hints: string[] = [];
  
  let currentSection = '';
  let currentCodeSnippet: Partial<{ file: string; snippet: string; explanation: string }> = {};
  
  for (const token of tokens) {
    if (token.type === 'heading') {
      if (token.depth === 1) {
        currentSection = token.text.toLowerCase();
      } else if (token.depth === 2) {
        if (currentSection.includes('code') || currentSection.includes('snippet')) {
          // Start new code snippet - H2 under "Code Snippets" section
          if (currentCodeSnippet.file && currentCodeSnippet.snippet) {
            codeSnippets.push({
              file: currentCodeSnippet.file,
              snippet: currentCodeSnippet.snippet,
              explanation: currentCodeSnippet.explanation || ''
            });
          }
          currentCodeSnippet = { file: token.text, snippet: '', explanation: '' };
        } else {
          // Regular H2 section
          currentSection = token.text.toLowerCase();
        }
      }
    } else if (token.type === 'paragraph') {
      if (currentSection.includes('adventure') || currentSection.includes('story')) {
        adventure += token.text + '\n\n';
      } else if (currentSection.includes('exploration') || currentSection.includes('file')) {
        fileExploration += token.text + '\n\n';
      } else if (currentCodeSnippet.file && !currentCodeSnippet.explanation) {
        currentCodeSnippet.explanation = token.text;
      }
    } else if (token.type === 'code') {
      if (currentCodeSnippet.file) {
        currentCodeSnippet.snippet = token.text;
      }
    } else if (token.type === 'list') {
      // Extract hints from list items
      for (const item of token.items) {
        hints.push(item.text.trim());
      }
    }
  }
  
  // Add final code snippet if exists
  if (currentCodeSnippet.file && currentCodeSnippet.snippet) {
    codeSnippets.push({
      file: currentCodeSnippet.file,
      snippet: currentCodeSnippet.snippet,
      explanation: currentCodeSnippet.explanation || ''
    });
  }
  
  return {
    adventure: adventure.trim() || 'Explore this code adventure!',
    fileExploration: fileExploration.trim(),
    codeSnippets,
    hints
  };
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
      this.llmClient.generateResponse(prompt, { maxTokens: LLM_MAX_TOKENS_QUEST })
    );
    
    if (!response.content || response.content.trim() === '') {
      throw new Error('LLM returned empty response for quest content');
    }
    
    let parsed;
    try {
      // Preprocess response to remove markdown code block wrapper if present
      let cleanContent = response.content.trim();
      if (cleanContent.startsWith('```markdown')) {
        cleanContent = cleanContent.replace(/^```markdown\s*/, '').replace(/\s*```$/, '');
      }
      
      parsed = parseMarkdownToQuestContent(cleanContent);
      // Validate with Zod schema for safety
      QuestContentSchema.parse(parsed);
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
      this.llmClient.generateResponse(prompt, { maxTokens: LLM_MAX_TOKENS_STORY })
    );
    
    if (!response.content || response.content.trim() === '') {
      throw new Error('LLM returned empty response');
    }
    
    let parsed;
    try {
      // Preprocess response to remove markdown code block wrapper if present
      let cleanContent = response.content.trim();
      if (cleanContent.startsWith('```markdown')) {
        cleanContent = cleanContent.replace(/^```markdown\s*/, '').replace(/\s*```$/, '');
      }
      
      parsed = parseMarkdownToStoryResponse(cleanContent);
      // Validate with Zod schema for safety
      StoryResponseSchema.parse(parsed);
    } catch (error) {
      console.error('💥 Parsing error:', error instanceof Error ? error.message : 'Unknown error');
      console.error('💥 Full response:', response.content);
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