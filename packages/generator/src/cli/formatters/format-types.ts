/**
 * Type definitions for formatter dependencies
 */

export interface QuestInfo {
  id: string;
  title: string;
  filename: string;
}

/**
 * Interface for HTML builder that generates HTML content from templates
 */
export interface HtmlBuilder {
  /**
   * Build the index HTML page
   */
  buildIndexHTML(): string;

  /**
   * Build a quest HTML page
   * @param questInfo - Quest metadata
   * @param content - Generated quest content
   * @param index - Quest index for navigation
   */
  buildQuestHTML(questInfo: QuestInfo, content: string, index: number): string;

  /**
   * Build the summary HTML page
   * @param keyConcepts - HTML string of key concepts learned
   */
  buildSummaryHTML(keyConcepts: string): Promise<string>;

  /**
   * List of quests being generated
   */
  quests: QuestInfo[];
}

/**
 * Interface for asset manager that handles CSS and static file copying
 */
export interface AssetManager {
  /**
   * Copy quest navigator files to output directory
   * @param outputDir - Directory where files should be copied
   */
  copyQuestNavigator(outputDir: string): void;

  /**
   * Copy images to output directory
   * @param outputDir - Directory where images should be copied
   * @param isMultiTheme - Whether this is a multi-theme generation
   */
  copyImages(outputDir: string, isMultiTheme: boolean): void;

  /**
   * Load theme-specific CSS
   * @param theme - Theme name
   */
  loadThemeCSS(theme: string): string;

  /**
   * Load base CSS
   */
  loadBaseCSS(): string;

  /**
   * Load animations CSS
   */
  loadAnimationsCSS(): string;
}
