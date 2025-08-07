import type { ProjectInfo } from '../shared/types.js';
import type { AdventureTheme, CustomThemeData } from '../shared/theme.js';
import { StoryGenerator, Quest, StoryResponse, QuestContent } from './story-generator.js';
// Simple inline error for the two places we need it
class StoryGenerationError extends Error {
  constructor(message: string, _context?: Record<string, unknown>) {
    super(message);
    this.name = 'StoryGenerationError';
  }
}
import { validateAdventureChoice } from '../shared/input-validator.js';
import { repoAnalyzer } from '../analyzer/repo-analyzer.js';

// Re-export interfaces from story-generator
export type { Quest, StoryResponse, QuestContent, CodeSnippet } from './story-generator.js';

export interface AdventureResult {
  narrative: string;
  choices?: string[];
  completed?: boolean;
  progressUpdate?: string;
}

export class AdventureState {
  story: string | undefined = undefined;
  quests: Quest[] = [];
  completedQuests: Set<string> = new Set();
  questContentCache: Map<string, { content: QuestContent; summary: string }> = new Map();
  currentTheme: AdventureTheme | null = null;
  projectInfo: ProjectInfo | undefined = undefined;
  projectPath: string | undefined = undefined;


  get progressPercentage(): number {
    return this.quests.length > 0 
      ? Math.round((this.completedQuests.size / this.quests.length) * 100)
      : 0;
  }

  reset() {
    this.story = undefined;
    this.quests = [];
    this.completedQuests.clear();
    this.questContentCache.clear();
    this.currentTheme = null;
    this.projectInfo = undefined;
    this.projectPath = undefined;
  }
}

export class AdventureManager {
  private state: AdventureState = new AdventureState();
  private storyGenerator: StoryGenerator;

  constructor() {
    this.storyGenerator = new StoryGenerator();
  }

  /**
   * Initialize the adventure with project context and generate story + quests
   */
  async initializeAdventure(
    projectInfo: ProjectInfo, 
    theme: AdventureTheme, 
    projectPath?: string,
    customThemeData?: CustomThemeData
  ): Promise<string> {
    // Reset state for new adventure
    this.state.reset();
    this.state.projectInfo = projectInfo;
    this.state.currentTheme = theme;
    this.state.projectPath = projectPath || process.cwd();
    
    // Set custom theme data if provided
    if (theme === 'custom' && customThemeData) {
      this.storyGenerator.setCustomTheme(customThemeData);
    }

    // Generate the overall story and quests using LLM
    const storyResponse = await this.storyGenerator.generateStoryAndQuests(projectInfo, theme, this.state.projectPath);
    
    this.state.story = typeof storyResponse.story === 'string' ? storyResponse.story : storyResponse.story.content;
    this.state.quests = storyResponse.quests;

    // Return the story with available quests
    return this.formatStoryWithQuests(storyResponse);
  }

  /**
   * Validate and sanitize user input for adventure selection
   */
  private validateAndSanitizeChoice(input: string): string {
    try {
      return validateAdventureChoice(input);
    } catch (error) {
      throw new Error(`Invalid adventure choice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a chosen quest by ID, number, or title
   */
  async exploreQuest(choice: string): Promise<AdventureResult> {
    const sanitizedChoice = this.validateAndSanitizeChoice(choice);
    
    // Check if this is a progress request
    if (this.isProgressRequest(sanitizedChoice)) {
      return this.getProgress();
    }
    
    // Find the quest based on the choice
    const quest = this.findQuest(sanitizedChoice);
    if (!quest) {
      return this.createNotFoundResult();
    }

    // Execute the quest
    return await this.executeQuest(quest);
  }

  /**
   * Check if the user is requesting progress view
   */
  private isProgressRequest(choice: string): boolean {
    // Check text-based progress request
    if (choice.toLowerCase().includes('progress') || 
        choice.toLowerCase().includes('view progress')) {
      return true;
    }
    
    // Check numeric progress request (last item in choices)
    const choiceNumber = parseInt(choice);
    if (!isNaN(choiceNumber) && choiceNumber > 0) {
      const choices = this.getAvailableQuestChoices();
      return choiceNumber === choices.length && 
             choices[choices.length - 1] === 'View progress';
    }
    
    return false;
  }

  /**
   * Find a quest by number, ID, or title
   */
  private findQuest(choice: string): Quest | undefined {
    // Try to find by number first
    const byNumber = this.findQuestByNumber(choice);
    if (byNumber) return byNumber;
    
    // Then try by ID or title
    return this.findQuestByIdOrTitle(choice);
  }
  

  /**
   * Find quest by numeric choice
   */
  private findQuestByNumber(choice: string): Quest | undefined {
    const choiceNumber = parseInt(choice);
    if (!isNaN(choiceNumber) && 
        choiceNumber > 0 && 
        choiceNumber <= this.state.quests.length) {
      return this.state.quests[choiceNumber - 1];
    }
    return undefined;
  }
  

  /**
   * Find quest by ID or title match - handles checkmark prefix for completed quests
   */
  private findQuestByIdOrTitle(choice: string): Quest | undefined {
    // Remove checkmark if present in the choice
    const cleanedChoice = choice.replace(/^✅\s*/, '').trim();
    const lowerChoice = cleanedChoice.toLowerCase();
    
    return this.state.quests.find(q => {
      // Clean the quest title for comparison (remove emoji)
      const cleanTitle = q.title.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, '').toLowerCase();
      
      return q.id === cleanedChoice || 
             q.title.toLowerCase().includes(lowerChoice) ||
             cleanTitle.includes(lowerChoice) ||
             lowerChoice.includes(cleanTitle);
    });
  }
  

  /**
   * Create result for when quest is not found
   */
  private createNotFoundResult(): AdventureResult {
    return {
      narrative: "Quest not found. Please choose from the available quests.",
      choices: this.getAvailableQuestChoices()
    };
  }

  /**
   * Execute the selected quest - uses cache for completed quests
   */
  private async executeQuest(quest: Quest): Promise<AdventureResult> {
    // Validate prerequisites
    this.validateQuestPrerequisites();

    let content: QuestContent;
    let summary: string;

    // Check if quest content is already cached (completed quest)
    const cached = this.state.questContentCache.get(quest.id);
    if (cached) {
      // Use cached content - no LLM calls needed  
      console.log(`🔄 Retrieving completed quest from cache...`);
      
      // Add a small delay to make the loading feel more natural
      await new Promise(resolve => setTimeout(resolve, 500));
      
      content = cached.content;
      summary = cached.summary;
      
      // Add visual indicator that this is cached content
      content = {
        ...content,
        adventure: `🔄 **[REVISITING COMPLETED QUEST]**\n\n${content.adventure}`
      };
    } else {
      // Generate new quest content (LLM call)
      console.log(`🎯 Generating new content for quest: ${quest.title}`);
      content = await this.generateQuestContent(quest);
      
      // Generate completion summary (LLM call)
      summary = await this.generateCompletionSummary(quest);
      
      // Cache the content for future access
      this.state.questContentCache.set(quest.id, { content, summary });
    }
    
    // Mark as completed (or update completion if revisiting)
    this.markQuestCompleted(quest);

    // Return formatted result
    return this.createQuestResult(content, summary, quest);
  }
  

  /**
   * Validate that all prerequisites for quest execution are met
   */
  private validateQuestPrerequisites(): void {
    if (!this.state.projectInfo) {
      throw new StoryGenerationError('No project context available', {
        operation: 'generateQuestContent'
      });
    }
    
    if (!this.state.currentTheme) {
      throw new StoryGenerationError('No theme selected', {
        operation: 'generateQuestContent'
      });
    }
  }
  

  /**
   * Generate content for the quest
   */
  private async generateQuestContent(quest: Quest): Promise<QuestContent> {
    let codeContent: string;
    
    // Use targeted content if quest has specific files, otherwise use full repomix content
    if (quest.codeFiles && quest.codeFiles.length > 0 && this.state.projectPath) {
      try {
        console.log(`🎯 Generating targeted content for ${quest.codeFiles.length} files`);
        codeContent = await repoAnalyzer.generateTargetedContent(
          this.state.projectPath,
          quest.codeFiles
        );
      } catch (error) {
        console.warn(`Failed to generate targeted content, falling back to full repomix content:`, error);
        codeContent = this.state.projectInfo!.repomixContent;
      }
    } else {
      // Fallback to full repomix content
      codeContent = this.state.projectInfo!.repomixContent;
    }

    return await this.storyGenerator.generateQuestContent(
      quest,
      this.state.currentTheme!,
      codeContent
    );
  }
  

  /**
   * Mark quest as completed
   */
  private markQuestCompleted(quest: Quest): void {
    this.state.completedQuests.add(quest.id);
  }
  

  /**
   * Generate completion summary for the quest
   */
  private async generateCompletionSummary(quest: Quest): Promise<string> {
    return await this.storyGenerator.generateCompletionSummary(
      quest,
      this.state.currentTheme!,
      this.state.completedQuests.size,
      this.state.quests.length
    );
  }

  /**
   * Create the final quest result
   */
  private createQuestResult(content: QuestContent, summary: string, quest: Quest): AdventureResult {
    return {
      narrative: this.formatQuestResult(content, summary, quest.title),
      choices: this.getAvailableQuestChoices(),
      completed: true,
      progressUpdate: `Progress: ${this.state.progressPercentage}% complete (${this.state.completedQuests.size}/${this.state.quests.length} quests finished)`
    };
  }
  

  /**
   * Get current progress and available quests
   */
  getProgress(): AdventureResult {
    const completedList = Array.from(this.state.completedQuests)
      .map(id => {
        const quest = this.state.quests.find(q => q.id === id);
        if (quest) {
          // Replace emoji with checkmark for completed quests
          const titleWithoutEmoji = quest.title.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, '');
          return `✅ ${titleWithoutEmoji}`;
        }
        return null;
      })
      .filter(Boolean);

    const narrative = `📊 **Quest Progress**

**Overall Progress**: ${this.state.progressPercentage}% complete
**Quests Completed**: ${this.state.completedQuests.size}/${this.state.quests.length}

${completedList.length > 0 ? `**Completed Quests:**
${completedList.map((title, i) => `${i + 1}. ${title}`).join('\n')}` : '**No quests completed yet.** Choose your first quest below!'}

${this.state.progressPercentage === 100 ? '🎉 **Congratulations!** You have successfully explored this codebase through your epic quests!' : 'Continue your journey by selecting another quest:'}`;

    return {
      narrative,
      choices: this.getAvailableQuestChoices()
    };
  }








  /**
   * Format story with quests for initial presentation
   */
  private formatStoryWithQuests(storyResponse: StoryResponse): string {
    const questsText = storyResponse.quests
      .map((quest) => `**${quest.title}** - ${quest.description}`)
      .join('\n');

    return `${storyResponse.story}

**🗺️ Available Quests:**

${questsText}
`;
  }
  

  /**
   * Format complete quest result
   */
  private formatQuestResult(content: QuestContent, completionSummary: string, questTitle: string): string {
    const fileExplorationText = content.fileExploration 
      ? `\n\n${content.fileExploration}`
      : '';

    const codeSnippetsText = content.codeSnippets.length > 0 
      ? `\n\n**📜 Code Discoveries:**\n${content.codeSnippets.map(snippet => 
          `**${snippet.file}:**\n\`\`\`\n${snippet.snippet}\n\`\`\`\n*${snippet.explanation}*`
        ).join('\n\n')}`
      : '';

    const hintsText = content.hints.length > 0 
      ? `\n\n**💡 Helpful Hints:**\n${content.hints.map(hint => `• ${hint}`).join('\n')}`
      : '';

    return `**${questTitle}**\n\n${content.adventure}${fileExplorationText}${codeSnippetsText}${hintsText}\n\n---\n\n${completionSummary}`;
  }
  

  /**
   * Get available quest choices for user - shows all quests with completion status
   */
  private getAvailableQuestChoices(): string[] {
    if (this.state.quests.length === 0) {
      return ['View progress', 'Start new quest'];
    }

    // Show all quests with checkmarks for completed ones
    const questChoices = this.state.quests.map((q, index) => {
      const questNumber = index + 1;
      if (this.state.completedQuests.has(q.id)) {
        // Replace the emoji at the start with a checkmark for completed quests
        const titleWithoutEmoji = q.title.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, '');
        return `  ${questNumber}. ✅ ${titleWithoutEmoji}`;
      }
      return `  ${questNumber}. ${q.title}`;
    });

    return [
      ...questChoices,
      'View progress'
    ];
  }


}