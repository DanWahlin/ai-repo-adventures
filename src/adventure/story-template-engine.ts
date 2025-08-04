/**
 * StoryTemplateEngine - Handles template-based story generation
 * Extracted from StoryGenerator to follow single responsibility principle
 */

import type { ProjectInfo } from '../analyzer/repomix-analyzer.js';
import { AdventureTheme } from '../shared/theme.js';
import { AdventurePathGenerator } from './adventure-path-generator.js';
import { ThemeManager } from './theme-manager.js';
import type { Adventure, Story, StoryResponse } from '../adventure/story-generator.js';

export class StoryTemplateEngine {
  private themeManager = new ThemeManager();
  private pathGenerator = new AdventurePathGenerator();

  /**
   * Generate story and adventures using templates (no LLM)
   */
  generateWithTemplates(projectInfo: ProjectInfo, theme: AdventureTheme): StoryResponse {
    const story = this.generateTemplateStory(projectInfo, theme);
    const adventures = this.generateTemplateAdventures(projectInfo, theme);
    
    return { story, adventures };
  }

  /**
   * Generate template-based story
   */
  private generateTemplateStory(projectInfo: ProjectInfo, theme: AdventureTheme): Story {
    const intro = this.getThemeIntroduction(theme, projectInfo);
    const missionStatement = "🗺️ **Your Mission Awaits** - Choose your path wisely, brave adventurer!";
    
    return {
      content: `${intro}\n\n${missionStatement}`,
      theme,
      setting: '' // ThemeManager doesn't have getThemeSetting anymore
    };
  }

  /**
   * Generate template-based adventures
   */
  private generateTemplateAdventures(projectInfo: ProjectInfo, _theme: AdventureTheme): Adventure[] {
    const paths = this.pathGenerator.generatePaths(projectInfo);
    
    return paths.map(path => ({
      id: path.id,
      title: path.name,  // AdventurePath uses 'name' not 'title'
      description: path.description,
      completed: false,
      codeFiles: []  // AdventurePath doesn't have codeFiles
    }));
  }

  /**
   * Generate theme-specific introduction
   */
  private getThemeIntroduction(theme: AdventureTheme, projectInfo: ProjectInfo): string {
    const entryPoint = projectInfo.codeAnalysis.entryPoints[0] || 'main entry point';
    const topFunctions = this.filterMeaningfulFunctions(projectInfo.codeAnalysis.functions)
      .slice(0, 3);
    const topDeps = projectInfo.codeAnalysis?.dependencies?.slice(0, 3).map(d => d.name) || [];
    
    switch (theme) {
      case 'space':
        return this.createSpaceIntegratedStory(projectInfo, entryPoint, topFunctions, topDeps);
      case 'mythical':
        return this.createMythicalIntegratedStory(projectInfo, entryPoint, topFunctions, topDeps);
      case 'ancient':
        return this.createAncientIntegratedStory(projectInfo, entryPoint, topFunctions, topDeps);
      default:
        return this.createSpaceIntegratedStory(projectInfo, entryPoint, topFunctions, topDeps);
    }
  }

  /**
   * Filter out common meaningless function names
   */
  private filterMeaningfulFunctions(functions: { name: string }[]): string[] {
    const boringPatterns = [
      /^_/, /^get[A-Z]/, /^set[A-Z]/, /^is[A-Z]/, /^has[A-Z]/,
      /^on[A-Z]/, /toString/, /valueOf/, /constructor/
    ];
    
    return functions
      .filter(f => !boringPatterns.some(pattern => pattern.test(f.name)))
      .map(f => f.name);
  }

  private createSpaceIntegratedStory(projectInfo: ProjectInfo, entryPoint: string, topFunctions: string[], topDeps: string[]): string {
    const techString = projectInfo.mainTechnologies.join(', ');
    const functionList = topFunctions.length > 0 ? 
      `powered by critical systems like ${topFunctions.join(', ')}` : 
      'containing unexplored systems';
    const depString = topDeps.length > 0 ?
      `The ship's supply chain depends on ${topDeps.join(', ')} from allied fleets.` :
      '';
    
    return `🚀 **Welcome to the Starship ${projectInfo.type}**

In the vast cosmos of code, the starship "${projectInfo.type}" orbits through ${projectInfo.fileCount} star systems, each powered by technologies like ${techString}. The ship's command center at \`${entryPoint}\` coordinates operations, ${functionList}. ${depString}

Your mission as Space Explorer is to navigate these systems, uncovering the secrets hidden within each module and ensuring all systems operate in harmony.`;
  }

  private createMythicalIntegratedStory(projectInfo: ProjectInfo, entryPoint: string, topFunctions: string[], topDeps: string[]): string {
    const techString = projectInfo.mainTechnologies.join(', ');
    const functionList = topFunctions.length > 0 ?
      `Ancient spells like ${topFunctions.join(', ')} maintain the realm's magic.` :
      'Mysterious incantations await discovery.';
    const depString = topDeps.length > 0 ?
      `The kingdom trades with allied realms: ${topDeps.join(', ')}.` :
      '';
    
    return `🏰 **Enter the Kingdom of ${projectInfo.type}**

In the mystical realm of code, the kingdom of "${projectInfo.type}" spans ${projectInfo.fileCount} provinces, each defended by magical artifacts forged from ${techString}. The throne room at \`${entryPoint}\` rules over all domains. ${functionList} ${depString}

As a brave knight, you must explore these lands, master the ancient spells, and restore balance to the kingdom.`;
  }

  private createAncientIntegratedStory(projectInfo: ProjectInfo, entryPoint: string, topFunctions: string[], topDeps: string[]): string {
    const techString = projectInfo.mainTechnologies.join(', ');
    const functionList = topFunctions.length > 0 ?
      `Sacred rituals like ${topFunctions.join(', ')} channel divine power.` :
      'Hidden ceremonies await your discovery.';
    const depString = topDeps.length > 0 ?
      `The temple receives offerings from ${topDeps.join(', ')}.` :
      '';
    
    return `🏛️ **Discover the Temple of ${projectInfo.type}**

Within the ancient temple of "${projectInfo.type}", ${projectInfo.fileCount} sacred chambers hold the wisdom of civilizations past, inscribed in ${techString}. The inner sanctum at \`${entryPoint}\` connects all chambers. ${functionList} ${depString}

As an archaeologist-priest, decipher the hieroglyphs, perform the rituals, and unlock the temple's ancient power.`;
  }

  /**
   * Generate fallback adventure content
   */
  generateAdventureContentFallback(
    adventure: Adventure,
    theme: AdventureTheme,
    _projectInfo: ProjectInfo,
    _codeContent?: string
  ): any {
    return {
      adventure: `Welcome to "${adventure.title}"! ${adventure.description} 
                  Let's explore the code using our ${theme} lens.`,
      fileExploration: `📍 Quest Action Required: Open the following files in your editor and explore the code structure. 
                        Look for patterns, connections, and how different parts work together.`,
      codeSnippets: [],  // Template version doesn't parse code
      hints: [
        `Practical: Look for the main functions and understand their purpose in this ${theme} context.`,
        `Next Steps: After exploring these files, consider looking at related test files or configuration.`
      ]
    };
  }

  /**
   * Generate fallback completion summary
   */
  generateCompletionSummaryFallback(
    theme: AdventureTheme,
    completedCount: number,
    totalCount: number
  ): string {
    const percentage = Math.round((completedCount / totalCount) * 100);
    const emoji = this.getThemeEmoji(theme);
    
    if (percentage === 100) {
      return `\n\n${emoji} **QUEST COMPLETE!** You've mastered all ${totalCount} adventures and fully explored the codebase! You are now a true ${theme} master! 🎉`;
    }
    
    const encouragement = percentage > 75 ? "You're almost there!" :
                          percentage > 50 ? "You're making great progress!" :
                          percentage > 25 ? "Keep exploring!" :
                          "Your journey has just begun!";
    
    return `\n\n${emoji} **Progress: ${percentage}% complete** (${completedCount}/${totalCount} adventures finished). ${encouragement}`;
  }

  private getThemeEmoji(theme: AdventureTheme): string {
    switch (theme) {
      case 'space': return '🚀';
      case 'mythical': return '🏰';
      case 'ancient': return '🏛️';
      default: return '🌟';
    }
  }
}