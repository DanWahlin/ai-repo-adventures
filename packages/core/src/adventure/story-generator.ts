import type { ProjectInfo } from '../shared/types.js';
import { AdventureTheme, CustomThemeData } from '../shared/theme.js';
import { LLM_REQUEST_TIMEOUT, DEFAULT_THEME, LLM_MAX_TOKENS_STORY, LLM_MAX_TOKENS_QUEST } from '../shared/config.js';
import { isValidTheme } from '../shared/theme.js';
import { LLMClient } from '../llm/llm-client.js';
import { formatAdventureConfigForPrompt } from '../shared/adventure-config.js';
import { loadStoryGenerationPrompt, loadQuestContentPrompt, loadCompletionPrompt } from '../shared/prompt-loader.js';
import { marked } from 'marked';
import { z } from 'zod';

export interface Quest {
  id: string;
  title: string;
  description: string;
  codeFiles?: string[];
}


export interface StoryResponse {
  title: string;
  story: string;
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
  let titleFound = false;
  
  for (const token of tokens) {
    if (token.type === 'heading') {
      if (token.depth === 1) {
        title = token.text;
        titleFound = true;
        currentSection = 'story'; // Assume content after H1 is story content
      } else if (token.depth === 2) {
        currentSection = token.text.toLowerCase();
        if (currentSection === 'story' || currentSection === 'adventure') {
          // Next paragraphs will be story content
        } else if (currentSection === 'quests' || currentSection === 'adventures' || currentSection === 'choose a quest') {
          // Next sections will be quests
        }
      } else if (token.depth === 3 && (currentSection === 'quests' || currentSection === 'adventures' || currentSection === 'choose a quest')) {
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
      if (currentSection === 'story' || currentSection === 'adventure' || (titleFound && currentSection === 'story')) {
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
    const quest = {
      id: `quest-${quests.length + 1}`,
      title: currentQuest.title,
      description: currentQuest.description.trim(),
      codeFiles: currentQuest.codeFiles || []
    };
    quests.push(quest);
  }
  
  return {
    title: title || 'Adventure',
    story: story.trim() || 'Welcome to your coding adventure!',
    quests
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
  private currentStoryContent?: string;
  private projectPath?: string | undefined;

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
    this.projectPath = projectPath;
    
    const validatedTheme = this.validateTheme(theme);
    return await this.generateWithLLM(projectInfo, validatedTheme);
  }

  /**
   * Generate story - for backward compatibility with tests
   * Maps to generateStoryAndQuests but returns simplified story object
   */
  async generateStory(theme: AdventureTheme): Promise<{ content: string; theme: AdventureTheme; setting: string }> {
    if (!this.currentProject) {
      throw new Error('No project information available. Please analyze a project first.');
    }

    const response = await this.generateStoryAndQuests(this.currentProject, theme);
    
    return {
      theme,
      content: response.story,
      setting: `A ${theme}-themed exploration of your codebase`
    };
  }

  /**
   * Generate detailed quest content using LLM
   */
  async generateQuestContent(
    quest: Quest,
    theme: AdventureTheme,
    codeContent: string,
    questPosition?: number,
    totalQuests?: number
  ): Promise<QuestContent> {
    // Include formatted adventure config as context if available
    let adventureGuidance = '';
    if (this.projectPath) {
      const formattedConfig = formatAdventureConfigForPrompt(this.projectPath);
      if (formattedConfig) {
        adventureGuidance = formattedConfig;
      }
    }

    const prompt = loadQuestContentPrompt({
      theme,
      adventureTitle: quest.title,
      codeContent,
      storyContent: this.currentStoryContent || 'No story context available.',
      adventureGuidance: adventureGuidance || '',
      questPosition,
      totalQuests,
      ...(this.customThemeData && { customThemeData: this.customThemeData })
    }) + '\n\nIMPORTANT: Respond with ONLY markdown content between explicit delimiters.\n\nFormat your response EXACTLY like this:\n\n---BEGIN MARKDOWN---\n[Your markdown content here starting with the quest title]\n---END MARKDOWN---\n\nDo NOT include any conversational text outside the delimiters. Start the content immediately with the quest title.';

    const response = await this.withTimeout(
      this.llmClient.generateResponse(prompt, { maxTokens: LLM_MAX_TOKENS_QUEST })
    );
    
    if (!response.content || response.content.trim() === '') {
      throw new Error('LLM returned empty response for quest content');
    }
    
    // Clean and process the LLM response
    let cleanContent = response.content.trim();
    
    // First, try to extract content between delimiters
    const beginMarker = '---BEGIN MARKDOWN---';
    const endMarker = '---END MARKDOWN---';
    const beginIndex = cleanContent.indexOf(beginMarker);
    const endIndex = cleanContent.indexOf(endMarker);
    
    if (beginIndex !== -1 && endIndex !== -1 && endIndex > beginIndex) {
      // Extract content between markers
      cleanContent = cleanContent.substring(
        beginIndex + beginMarker.length,
        endIndex
      ).trim();
    } else {
      // Fallback: Remove markdown code fences if present
      if (cleanContent.startsWith('```markdown')) {
        cleanContent = cleanContent.replace(/^```markdown\s*/, '').replace(/\s*```$/, '');
      }
      
      // Remove common LLM meta-commentary patterns that shouldn't appear in the final content
      cleanContent = this.removeLLMMetaCommentary(cleanContent);
    }
    
    // Return the content as a simple QuestContent structure with everything in adventure field
    return {
      adventure: cleanContent,
      fileExploration: '',
      codeSnippets: [],
      hints: []
    };
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
    // Remove surrounding quotes if the LLM added them
    const content = response.content.trim();
    return content.replace(/^["']|["']$/g, '');
  }

  // ============= Private Methods =============

  /**
   * Generate with LLM
   */
  private async generateWithLLM(projectInfo: ProjectInfo, theme: AdventureTheme): Promise<StoryResponse> {
    const repomixContent = projectInfo.repomixContent || 'No repomix content available';
    
    // Use formatted adventure config instead of raw JSON
    let adventureGuidance = '';
    if (this.projectPath) {
      const formattedConfig = formatAdventureConfigForPrompt(this.projectPath);
      if (formattedConfig) {
        adventureGuidance = formattedConfig;
      }
    }

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
      
      // Store the story content for consistency in quest generation
      this.currentStoryContent = parsed.story;
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

  /**
   * Remove LLM meta-commentary that shouldn't appear in the final content
   */
  private removeLLMMetaCommentary(content: string): string {
    // Split content into lines for processing
    const lines = content.split('\n');
    
    // Common patterns that indicate LLM meta-commentary
    const metaCommentaryPatterns = [
      /^Here is the continuation of/i,
      /^Based on the provided.*narrative/i,
      /^The markdown output.*constraints/i,
      /^Following the.*template/i,
      /^As requested.*format/i,
      /^I'll continue the.*themed/i,
      /^Let me generate/i,
      /^I understand you want/i,
      /^See http:\/\/localhost/i,  // Remove localhost references
      /^Sure! Below is the content/i,
      /^Below is the content generated/i,
      /^Here's the generated content/i,
      /^Here is.*content.*for.*Quest/i,
      /^I'll create.*content.*for/i,
      /^Certainly! Here.*is/i
    ];
    
    // Find the first line that doesn't match meta-commentary patterns
    let startIndex = 0;
    for (let i = 0; i < Math.min(lines.length, 10); i++) { // Check first 10 lines max
      const line = lines[i].trim();
      
      // Skip empty lines at the beginning
      if (line === '') continue;
      
      // Check if this line matches any meta-commentary pattern
      const isMetaCommentary = metaCommentaryPatterns.some(pattern => pattern.test(line));
      
      if (isMetaCommentary) {
        startIndex = i + 1;
      } else {
        // Found actual content, stop looking
        break;
      }
    }
    
    // Remove the meta-commentary lines and return clean content
    return lines.slice(startIndex).join('\n').trim();
  }

}

// Legacy export name for consistency
export { StoryGenerator as DynamicStoryGenerator };