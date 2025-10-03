import * as path from 'path';
import { AdventureManager } from '@codewithdan/ai-repo-adventures-core/adventure';
import { TemplateEngine } from '../template-engine.js';
import { ContentProcessor } from '../processing/content-processor.js';
import { AdventureTheme, parseAdventureConfig, extractMicrosoftClarityCode, extractGoogleAnalyticsCode } from '@codewithdan/ai-repo-adventures-core/shared';
import { THEME_ICONS } from '../constants.js';

interface QuestInfo {
  id: string;
  title: string;
  filename: string;
}

/**
 * Handles HTML generation for adventure pages
 */
export class HTMLBuilder {
  private adventureManager: AdventureManager;
  private templateEngine: TemplateEngine;
  private contentProcessor: ContentProcessor;
  private projectPath: string;
  private selectedTheme: AdventureTheme;
  private isMultiTheme: boolean;
  private quests: QuestInfo[];

  constructor(
    adventureManager: AdventureManager,
    templateEngine: TemplateEngine,
    contentProcessor: ContentProcessor,
    projectPath: string,
    selectedTheme: AdventureTheme,
    isMultiTheme: boolean,
    quests: QuestInfo[]
  ) {
    this.adventureManager = adventureManager;
    this.templateEngine = templateEngine;
    this.contentProcessor = contentProcessor;
    this.projectPath = projectPath;
    this.selectedTheme = selectedTheme;
    this.isMultiTheme = isMultiTheme;
    this.quests = quests;
  }

  /**
   * Build the index HTML page
   */
  buildIndexHTML(): string {
    const adventureQuests = this.adventureManager.getAllQuests();
    const questLinks = this.quests.map((quest, index) => {
      const questData = adventureQuests[index];
      let description = questData?.description || '';

      // Remove code files section from description
      if (description) {
        description = description.replace(/\*?\*?Code Files:.*$/si, '').trim();
      }

      const questLinkVariables = {
        QUEST_FILENAME: quest.filename,
        QUEST_TITLE: this.contentProcessor.formatInlineMarkdown(quest.title),
        QUEST_DESCRIPTION: description ? `<p>${this.contentProcessor.formatInlineMarkdown(description)}</p>` : ''
      };

      return this.templateEngine.renderTemplate('quest-link.html', questLinkVariables);
    }).join('\n');

    const cleanStoryContent = this.adventureManager.getStoryContent();

    const variables = {
      ...this.getCommonTemplateVariables(),
      PAGE_TITLE: this.adventureManager.getTitle(),
      STORY_CONTENT: this.contentProcessor.formatMarkdown(cleanStoryContent),
      QUEST_LINKS: questLinks
    };

    return this.templateEngine.renderPage('index-template.html', variables);
  }

  /**
   * Build a quest HTML page
   */
  buildQuestHTML(quest: QuestInfo, content: string, questIndex: number): string {
    const prevQuest = questIndex > 0 ? this.quests[questIndex - 1] : null;
    const nextQuest = questIndex < this.quests.length - 1 ? this.quests[questIndex + 1] : null;

    let bottomNavigation = '';
    const isLastQuest = questIndex === this.quests.length - 1;

    if (prevQuest || nextQuest || isLastQuest) {
      // Determine navigation CSS class based on which buttons are present
      let navClass = 'quest-navigation quest-navigation-bottom';
      const hasCompleteButton = isLastQuest; // Last quest always has complete button

      if (prevQuest && nextQuest) {
        // Both buttons present - use default space-between
      } else if (prevQuest && !nextQuest && !hasCompleteButton) {
        navClass += ' nav-prev-only';
      } else if (!prevQuest && nextQuest) {
        navClass += ' nav-next-only';
      } else if (!prevQuest && hasCompleteButton) {
        // Single quest with complete button only
        navClass += ' nav-next-only';
      }
      // Note: when hasCompleteButton is true with prevQuest, we use default space-between for proper alignment

      bottomNavigation = `
      <div class="${navClass}">`;

      if (prevQuest) {
        bottomNavigation += `
        <a href="${prevQuest.filename}" class="prev-quest-btn">← Previous: Quest ${questIndex}</a>`;
      }

      if (nextQuest) {
        bottomNavigation += `
        <a href="${nextQuest.filename}" class="next-quest-btn">Next: Quest ${questIndex + 2} →</a>`;
      } else if (isLastQuest) {
        // On the last quest, add a button to go to summary page
        bottomNavigation += `
        <a href="summary.html" class="next-quest-btn complete-btn">Complete Adventure →</a>`;
      }

      bottomNavigation += `
      </div>
    `;
    }

    const variables = {
      ...this.getCommonTemplateVariables(),
      PAGE_TITLE: this.contentProcessor.stripHTML(this.contentProcessor.formatInlineMarkdown(quest.title)),
      QUEST_CONTENT: this.contentProcessor.formatMarkdown(content),
      BOTTOM_NAVIGATION: bottomNavigation
    };

    return this.templateEngine.renderPage('quest-template.html', variables);
  }

  /**
   * Build the summary HTML page
   */
  async buildSummaryHTML(keyConcepts: string): Promise<string> {
    const lastQuest = this.quests[this.quests.length - 1];
    const questCount = this.quests.length;

    // Get theme-specific data
    const themeData = this.getThemeData();

    // Generate meaningful journey summary
    const journeySummary = this.generateJourneySummary(questCount, themeData);

    const variables = {
      ...this.getCommonTemplateVariables(),
      PAGE_TITLE: `${themeData.name} Adventure - Complete!`,
      JOURNEY_SUMMARY: journeySummary,
      QUEST_SUMMARY_LIST: keyConcepts,
      LAST_QUEST_FILENAME: lastQuest.filename,
      LAST_QUEST_TITLE: `Quest ${questCount}`
    };

    return this.templateEngine.renderTemplate('summary-template.html', variables);
  }

  /**
   * Get common template variables used across all pages
   */
  getCommonTemplateVariables(): { [key: string]: string } {
    const adventureTitle = this.adventureManager.getTitle();
    const config = parseAdventureConfig(this.projectPath);
    let repoName = 'Repository';
    let repoUrl = '#';

    if (config && typeof config === 'object' && 'adventure' in config) {
      const adventure = (config as any).adventure;
      if (adventure) {
        repoName = adventure.name || 'Repository';
        repoUrl = adventure.url || '#';
      }
    }

    // Use shared THEME_ICONS from constants
    const icons = (THEME_ICONS as any)[this.selectedTheme] || THEME_ICONS.space;

    // Add "Change Adventure" link only when in multi-theme mode
    const changeAdventureLink = this.isMultiTheme
      ? '<a href="../index.html" class="nav-link">Change Adventure</a>'
      : '';

    // Generate Microsoft Clarity tracking script if code is provided
    const clarityCode = extractMicrosoftClarityCode(this.projectPath);
    const clarityScript = clarityCode ? `
    <script type="text/javascript">
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${clarityCode}");
    </script>` : '';

    // Generate Google Analytics 4 (GA4) tracking script if measurement ID is provided
    const gaCode = extractGoogleAnalyticsCode(this.projectPath);
    const gaScript = gaCode ? `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${gaCode}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaCode}');
    </script>` : '';

    return {
      ADVENTURE_TITLE: adventureTitle,
      INDEX_LINK: 'index.html',
      CURRENT_THEME: this.selectedTheme,
      REPO_NAME: repoName,
      REPO_URL: repoUrl,
      THEME_ICON: icons.theme,
      QUEST_ICON: icons.quest,
      GITHUB_LOGO: this.getGitHubLogo(),
      CHANGE_ADVENTURE_LINK: changeAdventureLink,
      MICROSOFT_CLARITY_SCRIPT: clarityScript,
      GOOGLE_ANALYTICS_SCRIPT: gaScript,
      ASSETS_PATH: 'assets',
      NAVIGATOR_ASSETS_PATH: this.isMultiTheme ? '../assets/shared' : 'assets',
      TOGGLE_ASSETS_PATH: this.isMultiTheme ? '../assets' : 'assets',
      IMAGES_PATH: this.isMultiTheme ? '../assets/images' : 'assets/images',
      SHARED_PATH: this.isMultiTheme ? '../assets/shared' : 'assets/shared'
    };
  }

  /**
   * Determines if a theme is light-colored and requires dark GitHub logo
   */
  private isLightTheme(theme: AdventureTheme): boolean {
    // Light themes that need dark GitHub logo (github-mark.svg)
    const lightThemes: AdventureTheme[] = ['mythical', 'developer'];
    return lightThemes.includes(theme);
  }

  /**
   * Get appropriate GitHub logo based on theme brightness
   */
  private getGitHubLogo(): string {
    const sharedPath = this.isMultiTheme ? '../assets/shared' : 'assets/shared';
    return this.isLightTheme(this.selectedTheme)
      ? `${sharedPath}/github-mark.svg`          // Dark logo for light themes
      : `${sharedPath}/github-mark-white.svg`;   // White logo for dark themes
  }

  private getThemeData() {
    return this.selectedTheme === 'developer' ?
      {
        name: 'Developer',
        emoji: '💻',
        context: 'technical documentation and modern development practices',
        journey: 'development workflow'
      } :
      this.selectedTheme === 'space' ?
      {
        name: 'Space',
        emoji: '🚀',
        context: 'cosmic starship operations and galactic exploration systems',
        journey: 'interstellar mission'
      } :
      this.selectedTheme === 'mythical' ?
      {
        name: 'Mythical',
        emoji: '🏰',
        context: 'enchanted kingdoms and magical code artifacts',
        journey: 'mystical quest'
      } :
      this.selectedTheme === 'ancient' ?
      {
        name: 'Ancient',
        emoji: '🏛️',
        context: 'archaeological discoveries and ancient coding wisdom',
        journey: 'archaeological expedition'
      } :
      {
        name: 'Adventure',
        emoji: '⚔️',
        context: 'epic code exploration and discovery',
        journey: 'heroic adventure'
      };
  }

  private generateJourneySummary(questCount: number, themeData: any): string {
    if (this.selectedTheme === 'developer') {
      return `You've analyzed the MCP (Model Context Protocol) architecture and learned how this repository powers AI-driven code exploration. You've examined server implementation, tool orchestration, and request handling patterns that enable dynamic storytelling from codebases.`;
    } else {
      return `You've journeyed through ${themeData.context} to uncover the secrets of the MCP architecture. Your ${themeData.journey} revealed the intricate systems that power AI-driven code exploration and transform repositories into interactive adventures.`;
    }
  }
}
