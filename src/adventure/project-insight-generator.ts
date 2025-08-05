/**
 * ProjectInsightGenerator - Generates project analysis and insights
 * Extracted from StoryGenerator to follow single responsibility principle
 */

import type { ProjectInfo } from '../shared/types.js';
import { AdventureTheme } from '../shared/theme.js';

export class ProjectInsightGenerator {

  /**
   * Create comprehensive project analysis prompt
   */
  createProjectAnalysisPrompt(projectInfo: ProjectInfo): string {
    // Use the rich LLM context summary from analyzer if available
    if (projectInfo.llmContextSummary) {
      return this.createRichAnalysisPrompt(projectInfo);
    }
    
    // Fallback to basic analysis if no LLM context summary
    return this.createBasicAnalysisPrompt(projectInfo);
  }

  /**
   * Generate project insights themed for the adventure
   */
  generateProjectInsights(theme: AdventureTheme, projectInfo: ProjectInfo): string {
    const insights: string[] = [];
    // Simplified character generation without getThemeCharacters
    const chars = projectInfo.mainTechnologies.slice(0, 3).map(tech => ({
      technology: tech,
      character: `${tech} Master`
    }));
    
    // Entry points as key locations
    if (projectInfo.codeAnalysis.entryPoints.length > 0) {
      const entryPoint = projectInfo.codeAnalysis.entryPoints[0];
      if (entryPoint) {
        insights.push(this.formatEntryPointInsight(theme, entryPoint));
      }
    }
    
    // Technologies as characters/elements
    if (projectInfo.mainTechnologies.length > 0) {
      insights.push(this.formatTechnologyInsight(theme, projectInfo.mainTechnologies, chars));
    }
    
    // Architecture insights
    insights.push(...this.generateArchitectureInsights(theme, projectInfo));
    
    // Complexity insight
    insights.push(this.formatComplexityInsight(theme, projectInfo));
    
    return insights.join('\n');
  }

  /**
   * Infer the project's purpose from its structure and technologies
   */
  inferProjectPurpose(projectInfo: ProjectInfo): string {
    const purposes = [];
    
    if (projectInfo.hasApi) purposes.push('serving API endpoints');
    if (projectInfo.hasFrontend) purposes.push('rendering user interfaces');
    if (projectInfo.hasDatabase) purposes.push('managing data persistence');
    if (projectInfo.hasTests) purposes.push('maintaining quality through testing');
    
    if (purposes.length === 0) {
      return `This ${projectInfo.type} processes data and executes business logic`;
    }
    
    return `This ${projectInfo.type} specializes in ${purposes.join(', ')}`;
  }

  private createRichAnalysisPrompt(projectInfo: ProjectInfo): string {
    return `**Comprehensive Project Analysis:**
${projectInfo.llmContextSummary}

**Additional Architecture Details:**
- Database: ${projectInfo.hasDatabase ? 'Yes' : 'No'}
- API: ${projectInfo.hasApi ? 'Yes' : 'No'}
- Frontend: ${projectInfo.hasFrontend ? 'Yes' : 'No'}
- Tests: ${projectInfo.hasTests ? 'Yes' : 'No'}
- Entry Points: ${projectInfo.codeAnalysis.entryPoints.join(', ') || 'None detected'}`;
  }

  private createBasicAnalysisPrompt(projectInfo: ProjectInfo): string {
    const fileCount = projectInfo.fileCount;
    const complexity = this.getComplexityLevel(fileCount);
    const topFunctions = this.formatTopFunctions(projectInfo.codeAnalysis.functions);
    
    return `**Project Overview:**
- Type: ${projectInfo.type}
- Complexity: ${complexity} (${fileCount} files)
- Technologies: ${projectInfo.mainTechnologies.join(', ')}
- Entry points: ${projectInfo.codeAnalysis.entryPoints.join(', ') || 'None'}

**Architecture:**
- Database: ${projectInfo.hasDatabase ? 'Yes' : 'No'}
- API: ${projectInfo.hasApi ? 'Yes' : 'No'}
- Frontend: ${projectInfo.hasFrontend ? 'Yes' : 'No'}
- Tests: ${projectInfo.hasTests ? 'Yes' : 'No'}

**Key Functions:**
${topFunctions}

**Entry Points:**
- Main files: ${projectInfo.codeAnalysis.entryPoints.join(', ') || 'None detected'}`;
  }

  private getComplexityLevel(fileCount: number): string {
    if (fileCount < 20) return 'Simple';
    if (fileCount < 50) return 'Medium';
    return 'Complex';
  }

  private formatTopFunctions(functions: Array<{name: string, fileName: string}>): string {
    return functions
      .slice(0, 5)
      .map(f => `  • ${f.name}() in ${f.fileName}`)
      .join('\n') || '  • No functions detected';
  }

  private formatEntryPointInsight(theme: AdventureTheme, entryPoint: string): string {
    switch (theme) {
      case 'space':
        return `- The command bridge at \`${entryPoint}\` controls all starship operations`;
      case 'mythical':
        return `- The throne room at \`${entryPoint}\` governs the entire kingdom`;
      case 'ancient':
        return `- The inner sanctum at \`${entryPoint}\` channels the temple's power`;
      default:
        return `- The central hub at \`${entryPoint}\` coordinates all operations`;
    }
  }

  private formatTechnologyInsight(theme: AdventureTheme, technologies: string[], characters: any[]): string {
    const techChars = characters.slice(0, 3).map(c => c.character).join(', ');
    
    switch (theme) {
      case 'space':
        return `- Technologies ${technologies.join(', ')} power the ship's systems, with crew members ${techChars} maintaining operations`;
      case 'mythical':
        return `- Magical artifacts ${technologies.join(', ')} empower heroes ${techChars} in their quests`;
      case 'ancient':
        return `- Sacred technologies ${technologies.join(', ')} are guarded by priests ${techChars}`;
      default:
        return `- Technologies ${technologies.join(', ')} power the system with support from ${techChars}`;
    }
  }

  private generateArchitectureInsights(theme: AdventureTheme, projectInfo: ProjectInfo): string[] {
    const insights: string[] = [];
    
    if (projectInfo.hasDatabase) {
      insights.push(this.formatDatabaseInsight(theme));
    }
    
    if (projectInfo.hasApi) {
      insights.push(this.formatApiInsight(theme));
    }
    
    if (projectInfo.hasFrontend) {
      insights.push(this.formatFrontendInsight(theme));
    }
    
    if (projectInfo.hasTests) {
      insights.push(this.formatTestingInsight(theme));
    }
    
    return insights;
  }

  private formatDatabaseInsight(theme: AdventureTheme): string {
    switch (theme) {
      case 'space':
        return '- The Data Core maintains all ship records and navigation logs';
      case 'mythical':
        return '- The Crystal Archives store ancient knowledge and kingdom records';
      case 'ancient':
        return '- The Sacred Scrolls preserve wisdom from ages past';
      default:
        return '- The data storage maintains all system records';
    }
  }

  private formatApiInsight(theme: AdventureTheme): string {
    switch (theme) {
      case 'space':
        return '- Communication arrays enable contact with other starships';
      case 'mythical':
        return '- Magical portals connect to allied kingdoms';
      case 'ancient':
        return '- Divine channels allow communion with other temples';
      default:
        return '- Communication interfaces connect to external systems';
    }
  }

  private formatFrontendInsight(theme: AdventureTheme): string {
    switch (theme) {
      case 'space':
        return '- Holographic displays show real-time ship status';
      case 'mythical':
        return '- Enchanted mirrors reveal the kingdom to visitors';
      case 'ancient':
        return '- Sacred murals tell the temple\'s story';
      default:
        return '- User interfaces display system information';
    }
  }

  private formatTestingInsight(theme: AdventureTheme): string {
    switch (theme) {
      case 'space':
        return '- Diagnostic systems ensure all components function properly';
      case 'mythical':
        return '- Trial chambers test the worthiness of heroes';
      case 'ancient':
        return '- Ritual validations confirm the temple\'s integrity';
      default:
        return '- Testing frameworks ensure system reliability';
    }
  }

  private formatComplexityInsight(theme: AdventureTheme, projectInfo: ProjectInfo): string {
    const fileCount = projectInfo.fileCount;
    const complexity = this.getComplexityLevel(fileCount);
    
    switch (theme) {
      case 'space':
        return `- This ${complexity.toLowerCase()} starship contains ${fileCount} interconnected systems`;
      case 'mythical':
        return `- This ${complexity.toLowerCase()} kingdom spans ${fileCount} mystical territories`;
      case 'ancient':
        return `- This ${complexity.toLowerCase()} temple holds ${fileCount} sacred chambers`;
      default:
        return `- This ${complexity.toLowerCase()} system contains ${fileCount} interconnected modules`;
    }
  }
}