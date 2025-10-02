import type { ProjectInfo } from '../shared/types.js';
import { AdventureTheme, CustomThemeData } from '../shared/theme.js';
import { LLM_REQUEST_TIMEOUT, DEFAULT_THEME, LLM_MAX_TOKENS_STORY, LLM_MAX_TOKENS_QUEST } from '../shared/config.js';
import { isValidTheme } from '../shared/theme.js';
import { LLMClient } from '../llm/llm-client.js';
import { formatAdventureConfigForPrompt, extractCustomInstructions } from '../shared/adventure-config.js';
import { ChunkResult } from '../shared/content-chunker.js';
import { loadStoryGenerationPrompt, loadQuestContentPrompt, loadCompletionPrompt } from '../shared/prompt-loader.js';
import { marked, Token } from 'marked';
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

export interface QuestGenerationConfig {
  quest: Quest;
  theme: AdventureTheme;
  chunkResult: ChunkResult;
  questPosition?: number;
  totalQuests?: number;
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
 * Extract title from markdown tokens
 */
function extractTitle(tokens: Token[]): string {
  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 1) {
      return token.text;
    }
  }
  return 'Adventure';
}

/**
 * Determine if current section is a quest section
 */
function isQuestSection(section: string): boolean {
  return section === 'quests' || section === 'adventures' || section === 'choose a quest';
}

/**
 * Determine if current section is a story section
 */
function isStorySection(section: string, titleFound: boolean): boolean {
  return section === 'story' || section === 'adventure' || (titleFound && section === 'story');
}

/**
 * Extract code files from a list token
 */
function extractCodeFilesFromList(listToken: any, quest: Partial<Quest>): void {
  if (listToken.items) {
    for (const item of listToken.items) {
      const isCodeFile = item.text.includes('.') && 
        (item.text.includes('/') || item.text.match(/\.(ts|js|py|java|cpp|c|rs|go)$/));
      
      if (isCodeFile) {
        quest.codeFiles = quest.codeFiles || [];
        quest.codeFiles.push(item.text.trim());
      }
    }
  }
}

/**
 * Create a quest object from partial quest data
 */
function createQuest(questData: Partial<Quest>, questIndex: number): Quest {
  return {
    id: `quest-${questIndex + 1}`,
    title: questData.title!,
    description: questData.description!.trim(),
    codeFiles: questData.codeFiles || []
  };
}

/**
 * Parse markdown response to extract structured data
 * Handles multiple quest formats:
 * 1. H3 headings: ### Quest 1: Title
 * 2. Bold headings: **Quest 1: Title** - Description
 * 3. Numbered lists: 1. **Quest Title** – Description
 */
function parseMarkdownToStoryResponse(markdownContent: string): StoryResponse {
  const tokens = marked.lexer(markdownContent);

  const title = extractTitle(tokens);
  let story = '';
  const quests: Quest[] = [];

  let currentSection = '';
  let currentQuest: Partial<Quest> = {};
  let titleFound = false;

  for (const token of tokens) {
    if (token.type === 'heading') {
      if (token.depth === 1) {
        titleFound = true;
        currentSection = 'story';
      } else if (token.depth === 2) {
        currentSection = token.text.toLowerCase();
      } else if (token.depth === 3 && isQuestSection(currentSection)) {
        // Save previous quest if valid
        if (currentQuest.title && currentQuest.description) {
          quests.push(createQuest(currentQuest, quests.length));
        }
        // Start new quest
        currentQuest = { title: token.text, description: '', codeFiles: [] };
      }
    } else if (token.type === 'paragraph') {
      // Check if paragraph contains bold quest format: **Quest 1: Title** - Description
      const boldQuestMatch = token.text.match(/^\*\*Quest\s+\d+:\s*(.+?)\*\*\s*[-–—]\s*(.+)$/);

      if (boldQuestMatch && isQuestSection(currentSection)) {
        // Save previous quest if valid
        if (currentQuest.title && currentQuest.description) {
          quests.push(createQuest(currentQuest, quests.length));
        }
        // Extract quest from bold format - create complete quest immediately
        const newQuest = {
          title: boldQuestMatch[1].trim(),
          description: boldQuestMatch[2].trim(),
          codeFiles: []
        };
        // Push immediately since description is complete
        quests.push(createQuest(newQuest, quests.length));
        // Reset current quest
        currentQuest = {};
      } else if (isStorySection(currentSection, titleFound)) {
        story += token.text + '\n\n';
      } else if (currentQuest.title) {
        currentQuest.description += token.text + '\n\n';
      }
    } else if (token.type === 'list') {
      // Check if this is a numbered quest list format: 1. **Quest Title** – Description
      // Only treat as quest list if at least one item matches the pattern
      let isQuestList = false;
      if (token.items && isQuestSection(currentSection)) {
        // First, check if ANY item matches the quest pattern
        for (const item of token.items) {
          const listQuestMatch = item.text.match(/^\*\*([^*]+)\*\*\s*[-–—]\s*(.+)$/s);
          if (listQuestMatch) {
            isQuestList = true;
            break;
          }
        }

        // If it's a quest list, process all matching items
        if (isQuestList) {
          for (const item of token.items) {
            // Match pattern: **Quest Title** – Description
            // Use [^*] to match title (anything except asterisks), then match the rest
            const listQuestMatch = item.text.match(/^\*\*([^*]+)\*\*\s*[-–—]\s*(.+)$/s);

            if (listQuestMatch) {
              // Save previous quest if valid
              if (currentQuest.title && currentQuest.description) {
                quests.push(createQuest(currentQuest, quests.length));
              }
              // Extract quest from numbered list format - create complete quest immediately
              const newQuest = {
                title: listQuestMatch[1].trim(),
                description: listQuestMatch[2].trim(),
                codeFiles: []
              };
              // Push immediately since description is complete
              quests.push(createQuest(newQuest, quests.length));
              // Reset current quest
              currentQuest = {};
            }
          }
        }
      }

      // If NOT a quest list, extract code files from existing quest (H3 format)
      if (!isQuestList && currentQuest.title) {
        extractCodeFilesFromList(token, currentQuest);
      }
    }
  }

  // Add final quest if valid
  if (currentQuest.title && currentQuest.description) {
    quests.push(createQuest(currentQuest, quests.length));
  }

  return {
    title,
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

  /**
   * Quest format instructions appended to prompts to ensure consistent markdown output.
   * These instructions align with the quest-content-prompt.md template and are used
   * in both single-chunk and multi-chunk quest generation paths.
   */
  private readonly QUEST_FORMAT_INSTRUCTIONS = `

IMPORTANT: Respond with ONLY markdown content between explicit delimiters.

Format your response EXACTLY like this:

---BEGIN MARKDOWN---
[Your markdown content following the Required Format template above EXACTLY]
---END MARKDOWN---

CRITICAL FORMAT REQUIREMENTS:
- Start with # Quest X: [Title] (plain text, no emojis) followed by ---
- Include 75-100 word themed narrative paragraph immediately after ---
- Include ## Key Takeaways section (NO Quest Objectives section - this is forbidden)
- Include ## File Exploration section with ### File: [filepath] subsections
- Each file must have: description paragraph → #### Highlights → #### Code with snippets
- Add 3-5 educational bullet points after EACH code snippet
- Use --- separators between code blocks
- Include ## Helpful Hints section with 3 practical tips
- Include ## Try This section with 2-3 hands-on experiments (NO emoji in heading)
- End with themed completion message after final ---
- Do NOT add "Chapter" headings or "Quest Objectives" section
- Do NOT write generic code examples - extract real code from the Complete Codebase section`;

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
  async generateQuestContent(config: QuestGenerationConfig): Promise<QuestContent> {
    const { quest, theme, chunkResult, questPosition, totalQuests } = config;
    // Include formatted adventure config as context if available
    let adventureGuidance = '';
    let customInstructions = '';
    
    if (this.projectPath) {
      const formattedConfig = formatAdventureConfigForPrompt(this.projectPath);
      if (formattedConfig) {
        adventureGuidance = formattedConfig;
      }
      
      const customInstructionsFromConfig = extractCustomInstructions(this.projectPath);
      if (customInstructionsFromConfig) {
        customInstructions = customInstructionsFromConfig;
      }
    }

    // Handle chunked content processing
    let response;

    if (chunkResult.chunks.length === 1) {
      // Single chunk - direct processing
      const prompt = loadQuestContentPrompt({
        theme,
        adventureTitle: quest.title,
        codeContent: chunkResult.chunks[0].content,
        storyContent: this.currentStoryContent || 'No story context available.',
        adventureGuidance: adventureGuidance || '',
        ...(customInstructions && { customInstructions }),
        questPosition,
        totalQuests,
        ...(this.customThemeData && { customThemeData: this.customThemeData })
      }) + this.QUEST_FORMAT_INSTRUCTIONS;

      response = await this.llmClient.generateResponse(prompt, { maxTokens: LLM_MAX_TOKENS_QUEST, context: 'quest content' });

      if (!response.content || response.content.trim() === '') {
        throw new Error('LLM returned empty response for quest content');
      }
    } else {
      // Multiple chunks - iterative processing
      console.log(`🔄 Processing ${chunkResult.chunks.length} chunks iteratively`);
      return await this.processChunkedQuestContent(quest, theme, chunkResult, adventureGuidance, customInstructions, questPosition, totalQuests);
    }
    
    // Clean and process the LLM response
    let cleanContent = response.content.trim();
    
    // Enhanced markdown extraction with better error handling
    const beginMarker = '---BEGIN MARKDOWN---';
    const endMarker = '---END MARKDOWN---';
    const beginIndex = cleanContent.indexOf(beginMarker);
    const endIndex = cleanContent.indexOf(endMarker);

    if (beginIndex !== -1 && endIndex !== -1 && endIndex > beginIndex) {
      // Extract content between markers
      const extracted = cleanContent.substring(
        beginIndex + beginMarker.length,
        endIndex
      ).trim();

      // Verify extraction worked (should not contain the markers)
      if (!extracted.includes(beginMarker) && !extracted.includes(endMarker)) {
        cleanContent = extracted;
      } else {
        console.warn(`⚠️ Markdown extraction failed - markers still present`);
      }
    }
    
    // Additional safety check - if markers are still present, remove them manually
    if (cleanContent.includes(beginMarker) || cleanContent.includes(endMarker)) {
      cleanContent = cleanContent
        .replace(beginMarker, '')
        .replace(endMarker, '')
        .trim();
    }
    
    // Fallback: Remove markdown code fences if present
    if (cleanContent.startsWith('```markdown')) {
      cleanContent = cleanContent.replace(/^```markdown\s*/, '').replace(/\s*```$/, '');
    }
    
    // Remove common LLM meta-commentary patterns that shouldn't appear in the final content
    cleanContent = this.removeLLMMetaCommentary(cleanContent);
    
    // Return the content as a simple QuestContent structure with everything in adventure field
    return {
      adventure: cleanContent,
      fileExploration: '',
      codeSnippets: [],
      hints: []
    };
  }

  /**
   * Process quest content using multiple chunks iteratively
   */
  private async processChunkedQuestContent(
    quest: Quest,
    theme: AdventureTheme,
    chunkResult: ChunkResult,
    adventureGuidance: string,
    customInstructions: string,
    questPosition?: number,
    totalQuests?: number
  ): Promise<QuestContent> {
    let accumulatedContent = '';
    let contextSummary = '';

    for (let i = 0; i < chunkResult.chunks.length; i++) {
      const chunk = chunkResult.chunks[i];
      const isFirstChunk = i === 0;
      const isLastChunk = i === chunkResult.chunks.length - 1;

      console.log(`📦 Processing chunk ${i + 1}/${chunkResult.chunks.length} (${chunk.metadata.estimatedTokens} tokens)`);

      let prompt: string;

      if (isFirstChunk) {
        // First chunk - establish the story foundation
        prompt = loadQuestContentPrompt({
          theme,
          adventureTitle: quest.title,
          codeContent: chunk.content,
          storyContent: this.currentStoryContent || 'No story context available.',
          adventureGuidance: adventureGuidance || '',
          ...(customInstructions && { customInstructions }),
          questPosition,
          totalQuests,
          ...(this.customThemeData && { customThemeData: this.customThemeData })
        }) + `\n\nThis is the first part of a large codebase (${chunkResult.chunks.length} parts total). Generate a comprehensive quest adventure that establishes the foundation. More code context will be provided in subsequent parts to enhance and expand the adventure.`;
      } else if (isLastChunk) {
        // Last chunk - finalize the story
        prompt = `You are continuing to generate quest content for "${quest.title}" with a ${theme} theme.

Previous story context: ${contextSummary}

Here is the final part of the codebase:
${chunk.content}

Please enhance and finalize the adventure story based on this additional context. Ensure the story feels complete and cohesive with all the code you've seen. This is the final part (${i + 1}/${chunkResult.chunks.length}).

${adventureGuidance ? `Adventure Configuration:\n${adventureGuidance}` : ''}
${customInstructions ? `Custom Instructions: ${customInstructions}` : ''}`;
      } else {
        // Middle chunk - continue building the story
        prompt = `You are continuing to generate quest content for "${quest.title}" with a ${theme} theme.

Previous story context: ${contextSummary}

Here is part ${i + 1} of ${chunkResult.chunks.length} of the codebase:
${chunk.content}

Please enhance and expand the adventure story based on this additional context. Keep building on the previous content while incorporating insights from this new code. More parts will follow.

${adventureGuidance ? `Adventure Configuration:\n${adventureGuidance}` : ''}
${customInstructions ? `Custom Instructions: ${customInstructions}` : ''}`;
      }

      prompt += this.QUEST_FORMAT_INSTRUCTIONS;

      const response = await this.llmClient.generateResponse(prompt, { maxTokens: LLM_MAX_TOKENS_QUEST, context: 'quest chunk' });

      if (!response.content || response.content.trim() === '') {
        console.warn(`⚠️ Empty response for chunk ${i + 1}, using accumulated content`);
        continue;
      }

      // Process the response
      let chunkContent = this.extractMarkdownContent(response.content);

      if (isFirstChunk) {
        accumulatedContent = chunkContent;
      } else {
        // For subsequent chunks, we replace the accumulated content with the enhanced version
        accumulatedContent = chunkContent;
      }

      // Generate summary for next iteration (except for last chunk)
      if (!isLastChunk) {
        contextSummary = await this.generateContextSummary(accumulatedContent, theme, i + 1, chunkResult.chunks.length);
      }
    }

    return {
      adventure: accumulatedContent,
      fileExploration: '',
      codeSnippets: [],
      hints: []
    };
  }

  /**
   * Extract markdown content from LLM response
   */
  private extractMarkdownContent(content: string): string {
    let cleanContent = content.trim();

    // Enhanced markdown extraction with better error handling
    const beginMarker = '---BEGIN MARKDOWN---';
    const endMarker = '---END MARKDOWN---';
    const beginIndex = cleanContent.indexOf(beginMarker);
    const endIndex = cleanContent.indexOf(endMarker);

    if (beginIndex !== -1 && endIndex !== -1 && endIndex > beginIndex) {
      const extracted = cleanContent.substring(
        beginIndex + beginMarker.length,
        endIndex
      ).trim();

      if (!extracted.includes(beginMarker) && !extracted.includes(endMarker)) {
        cleanContent = extracted;
      }
    }

    // Remove any remaining markers
    cleanContent = cleanContent
      .replace(/---BEGIN MARKDOWN---/g, '')
      .replace(/---END MARKDOWN---/g, '')
      .trim();

    // Remove markdown code fences if present
    if (cleanContent.startsWith('```markdown')) {
      cleanContent = cleanContent.replace(/^```markdown\s*/, '').replace(/\s*```$/, '');
    }

    // Remove LLM meta-commentary
    return this.removeLLMMetaCommentary(cleanContent);
  }

  /**
   * Generate a concise summary of current content for next chunk
   */
  private async generateContextSummary(content: string, theme: AdventureTheme, chunkNumber: number, totalChunks: number): Promise<string> {
    const prompt = `Summarize the following quest adventure content in 2-3 sentences for context in continuing the story. Focus on the main narrative, key discoveries, and current adventure state:

${content}

Provide a concise summary that will help continue the ${theme}-themed adventure coherently.`;

    try {
      const response = await this.llmClient.generateResponse(prompt, { maxTokens: 500, context: 'context summary' });

      return response.content?.trim() || `${theme}-themed quest adventure exploring the codebase (part ${chunkNumber}/${totalChunks}).`;
    } catch (error) {
      console.warn(`⚠️ Failed to generate context summary: ${error}`);
      return `${theme}-themed quest adventure exploring the codebase (part ${chunkNumber}/${totalChunks}).`;
    }
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

    const response = await this.llmClient.generateResponse(prompt, { context: 'completion' });
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
    let customInstructions = '';
    
    if (this.projectPath) {
      const formattedConfig = formatAdventureConfigForPrompt(this.projectPath);
      if (formattedConfig) {
        adventureGuidance = formattedConfig;
      }
      
      const customInstructionsFromConfig = extractCustomInstructions(this.projectPath);
      if (customInstructionsFromConfig) {
        customInstructions = customInstructionsFromConfig;
      }
    }

    const prompt = loadStoryGenerationPrompt({
      theme,
      repomixContent,
      ...(adventureGuidance && { adventureGuidance }),
      ...(customInstructions && { customInstructions }),
      ...(this.customThemeData && { customThemeData: this.customThemeData })
    });

    const response = await this.llmClient.generateResponse(prompt, { maxTokens: LLM_MAX_TOKENS_STORY, context: 'story & quests' });
    
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