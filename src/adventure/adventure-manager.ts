import type { ProjectInfo } from '../shared/types.js';
import type { AdventureTheme, CustomThemeData } from '../shared/theme.js';
import { StoryGenerator, Adventure, StoryResponse, AdventureContent } from './story-generator.js';
// Simple inline error for the two places we need it
class StoryGenerationError extends Error {
  constructor(message: string, _context?: Record<string, unknown>) {
    super(message);
    this.name = 'StoryGenerationError';
  }
}
import { validateAdventureChoice } from '../shared/input-validator.js';
import { repoAnalyzer } from '../analyzer/repo-analyzer.js';

// Re-export interfaces from story-generator for backward compatibility
export type { Adventure, StoryResponse, AdventureContent, CodeSnippet } from './story-generator.js';

export interface AdventureResult {
  narrative: string;
  choices?: string[];
  completed?: boolean;
  progressUpdate?: string;
}

export class AdventureState {
  story: string | undefined = undefined;
  adventures: Adventure[] = [];
  completedAdventures: Set<string> = new Set();
  currentTheme: AdventureTheme | null = null;
  projectInfo: ProjectInfo | undefined = undefined;
  projectPath: string | undefined = undefined;

  get progressPercentage(): number {
    return this.adventures.length > 0 
      ? Math.round((this.completedAdventures.size / this.adventures.length) * 100)
      : 0;
  }

  reset() {
    this.story = undefined;
    this.adventures = [];
    this.completedAdventures.clear();
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
   * Initialize the adventure with project context and generate story + adventures
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

    // Generate the overall story and adventures using LLM
    const storyResponse = await this.storyGenerator.generateStoryAndAdventures(projectInfo, theme, this.state.projectPath);
    
    this.state.story = typeof storyResponse.story === 'string' ? storyResponse.story : storyResponse.story.content;
    this.state.adventures = storyResponse.adventures;

    // Return the story with available adventures
    return this.formatStoryWithAdventures(storyResponse);
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
   * Execute a chosen adventure by ID, number, or title
   */
  async exploreAdventure(choice: string): Promise<AdventureResult> {
    const sanitizedChoice = this.validateAndSanitizeChoice(choice);
    
    // Check if this is a progress request
    if (this.isProgressRequest(sanitizedChoice)) {
      return this.getProgress();
    }
    
    // Find the adventure based on the choice
    const adventure = this.findAdventure(sanitizedChoice);
    if (!adventure) {
      return this.createNotFoundResult();
    }

    // Execute the adventure
    return await this.executeAdventure(adventure);
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
      const choices = this.getAvailableAdventureChoices();
      return choiceNumber === choices.length && 
             choices[choices.length - 1] === 'View progress';
    }
    
    return false;
  }

  /**
   * Find an adventure by number, ID, or title
   */
  private findAdventure(choice: string): Adventure | undefined {
    // Try to find by number first
    const byNumber = this.findAdventureByNumber(choice);
    if (byNumber) return byNumber;
    
    // Then try by ID or title
    return this.findAdventureByIdOrTitle(choice);
  }

  /**
   * Find adventure by numeric choice
   */
  private findAdventureByNumber(choice: string): Adventure | undefined {
    const choiceNumber = parseInt(choice);
    if (!isNaN(choiceNumber) && 
        choiceNumber > 0 && 
        choiceNumber <= this.state.adventures.length) {
      return this.state.adventures[choiceNumber - 1];
    }
    return undefined;
  }

  /**
   * Find adventure by ID or title match
   */
  private findAdventureByIdOrTitle(choice: string): Adventure | undefined {
    const lowerChoice = choice.toLowerCase();
    return this.state.adventures.find(a => 
      a.id === choice || 
      a.title.toLowerCase().includes(lowerChoice) ||
      lowerChoice.includes(a.title.toLowerCase())
    );
  }

  /**
   * Create result for when adventure is not found
   */
  private createNotFoundResult(): AdventureResult {
    return {
      narrative: "Adventure not found. Please choose from the available adventures.",
      choices: this.getAvailableAdventureChoices()
    };
  }

  /**
   * Execute the selected adventure
   */
  private async executeAdventure(adventure: Adventure): Promise<AdventureResult> {
    // Validate prerequisites
    this.validateAdventurePrerequisites();

    // Generate adventure content
    const content = await this.generateAdventureContent(adventure);
    
    // Mark as completed and generate summary
    this.markAdventureCompleted(adventure);
    const summary = await this.generateCompletionSummary(adventure);

    // Return formatted result
    return this.createAdventureResult(content, summary);
  }

  /**
   * Validate that all prerequisites for adventure execution are met
   */
  private validateAdventurePrerequisites(): void {
    if (!this.state.projectInfo) {
      throw new StoryGenerationError('No project context available', {
        operation: 'generateAdventureContent'
      });
    }
    
    if (!this.state.currentTheme) {
      throw new StoryGenerationError('No theme selected', {
        operation: 'generateAdventureContent'
      });
    }
  }

  /**
   * Generate content for the adventure
   */
  private async generateAdventureContent(adventure: Adventure): Promise<AdventureContent> {
    let codeContent: string;
    
    // Use targeted content if adventure has specific files, otherwise use full repomix content
    if (adventure.codeFiles && adventure.codeFiles.length > 0 && this.state.projectPath) {
      try {
        console.log(`🎯 Generating targeted content for ${adventure.codeFiles.length} files`);
        codeContent = await repoAnalyzer.generateTargetedContent(
          this.state.projectPath,
          adventure.codeFiles
        );
      } catch (error) {
        console.warn(`Failed to generate targeted content, falling back to full repomix content:`, error);
        codeContent = this.state.projectInfo!.repomixContent;
      }
    } else {
      // Fallback to full repomix content
      codeContent = this.state.projectInfo!.repomixContent;
    }

    return await this.storyGenerator.generateAdventureContent(
      adventure,
      this.state.currentTheme!,
      codeContent
    );
  }

  /**
   * Mark adventure as completed
   */
  private markAdventureCompleted(adventure: Adventure): void {
    this.state.completedAdventures.add(adventure.id);
  }

  /**
   * Generate completion summary for the adventure
   */
  private async generateCompletionSummary(adventure: Adventure): Promise<string> {
    return await this.storyGenerator.generateCompletionSummary(
      adventure,
      this.state.currentTheme!,
      this.state.completedAdventures.size,
      this.state.adventures.length
    );
  }

  /**
   * Create the final adventure result
   */
  private createAdventureResult(content: AdventureContent, summary: string): AdventureResult {
    return {
      narrative: this.formatAdventureResult(content, summary),
      choices: this.getAvailableAdventureChoices(),
      completed: true,
      progressUpdate: `Progress: ${this.state.progressPercentage}% complete (${this.state.completedAdventures.size}/${this.state.adventures.length} adventures finished)`
    };
  }

  /**
   * Get current progress and available adventures
   */
  getProgress(): AdventureResult {
    const completedList = Array.from(this.state.completedAdventures)
      .map(id => this.state.adventures.find(a => a.id === id)?.title)
      .filter(Boolean);

    const narrative = `📊 **Adventure Progress**

**Overall Progress**: ${this.state.progressPercentage}% complete
**Adventures Completed**: ${this.state.completedAdventures.size}/${this.state.adventures.length}

${completedList.length > 0 ? `**Completed Adventures:**
${completedList.map((title, i) => `${i + 1}. ${title}`).join('\n')}` : '**No adventures completed yet.** Choose your first adventure below!'}

${this.state.progressPercentage === 100 ? '🎉 **Congratulations!** You have successfully explored this codebase through your epic adventures!' : 'Continue your journey by selecting another adventure:'}`;

    return {
      narrative,
      choices: this.getAvailableAdventureChoices()
    };
  }








  /**
   * Format story with adventures for initial presentation
   */
  private formatStoryWithAdventures(storyResponse: StoryResponse): string {
    const adventuresText = storyResponse.adventures
      .map((adventure, index) => `${index + 1}. **${adventure.title}** - ${adventure.description}`)
      .join('\n');

    return `${storyResponse.story}

**🗺️ Available Adventures:**
${adventuresText}

Choose an adventure by using the \`explore_adventure_path\` tool with the adventure number (1, 2, 3, etc.) or adventure title.`;
  }

  /**
   * Format complete adventure result
   */
  private formatAdventureResult(content: AdventureContent, completionSummary: string): string {
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

    return `${content.adventure}${fileExplorationText}${codeSnippetsText}${hintsText}\n\n---\n\n${completionSummary}`;
  }

  /**
   * Get available adventure choices for user
   */
  private getAvailableAdventureChoices(): string[] {
    const incomplete = this.state.adventures.filter(a => !this.state.completedAdventures.has(a.id));
    
    if (incomplete.length === 0) {
      return ['View progress', 'Start new adventure'];
    }

    return [
      ...incomplete.slice(0, 4).map(a => a.title),
      'View progress'
    ];
  }

}