import type { ProjectInfo } from '../analyzer/repomix-analyzer.js';
import type { AdventureTheme } from '../shared/theme.js';
import { StoryGenerator, Adventure, StoryResponse, AdventureContent } from './story-generator.js';
import { FileContentManager } from './file-content-manager.js';
import { StoryGenerationError } from '../shared/error-handling.js';
import { validateAdventureChoice } from '../shared/input-validator.js';

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
  }
}

export class AdventureManager {
  private state: AdventureState = new AdventureState();
  private storyGenerator: StoryGenerator;
  private fileContentManager: FileContentManager;

  constructor() {
    this.storyGenerator = new StoryGenerator();
    this.fileContentManager = new FileContentManager();
  }




  /**
   * Initialize the adventure with project context and generate story + adventures
   */
  async initializeAdventure(projectInfo: ProjectInfo, theme: AdventureTheme): Promise<string> {
    // Reset state for new adventure
    this.state.reset();
    this.state.projectInfo = projectInfo;
    this.state.currentTheme = theme;
    
    // Build file index for efficient lookups
    this.fileContentManager.buildFileIndex(projectInfo);

    // Generate the overall story and adventures using LLM
    const storyResponse = await this.storyGenerator.generateStoryAndAdventures(projectInfo, theme);
    
    this.state.story = storyResponse.story;
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
    let adventure: Adventure | undefined;
    
    // Try to match by number (1, 2, 3, etc.)
    const choiceNumber = parseInt(sanitizedChoice);
    if (!isNaN(choiceNumber) && choiceNumber > 0) {
      adventure = this.state.adventures[choiceNumber - 1];
    }
    
    // Try to match by ID or title if number didn't work
    if (!adventure) {
      adventure = this.state.adventures.find(a => 
        a.id === sanitizedChoice || 
        a.title.toLowerCase().includes(sanitizedChoice.toLowerCase()) ||
        sanitizedChoice.toLowerCase().includes(a.title.toLowerCase())
      );
    }
    
    if (!adventure) {
      return {
        narrative: "Adventure not found. Please choose from the available adventures.",
        choices: this.getAvailableAdventureChoices()
      };
    }

    if (!this.state.projectInfo) {
      throw new StoryGenerationError('No project context available', {
        operation: 'generateHints'
      });
    }

    // Prepare code content for the adventure
    const codeContent = await this.fileContentManager.prepareCodeContent(
      adventure.codeFiles || [],
      this.state.projectInfo
    );

    // Generate adventure content using LLM
    const adventureContent = await this.storyGenerator.generateAdventureContent(
      adventure,
      this.state.currentTheme!,
      this.state.projectInfo,
      codeContent
    );
    
    // Mark adventure as completed
    this.state.completedAdventures.add(adventure.id);

    if (!this.state.currentTheme) {
      throw new StoryGenerationError('No theme selected', {
        operation: 'getCompletionSummary'
      });
    }

    // Generate completion summary
    const completionSummary = await this.storyGenerator.generateCompletionSummary(
      adventure,
      this.state.currentTheme,
      this.state.completedAdventures.size + 1,
      this.state.adventures.length
    );

    return {
      narrative: this.formatAdventureResult(adventureContent, completionSummary),
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

Choose an adventure by using the \`explore_path\` tool with the adventure number (1, 2, 3, etc.) or adventure title.`;
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