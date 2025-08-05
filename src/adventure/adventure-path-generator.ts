import type { ProjectInfo } from '../shared/types.js';
import type { AdventureTheme } from '../shared/theme.js';
import { THEME_EMOJIS } from '../shared/theme.js';

export interface AdventurePath {
  id: string;
  name: string;
  description: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  prerequisites?: string[];
}

export class AdventurePathGenerator {
  generatePaths(projectInfo: ProjectInfo): AdventurePath[] {
    const paths: AdventurePath[] = [];

    // Each method handles one type of adventure path
    this.addMainQuestPaths(paths, projectInfo);
    this.addConfigurationPaths(paths, projectInfo);
    this.addTestPaths(paths, projectInfo);
    this.addApiPaths(paths, projectInfo);
    this.addDatabasePaths(paths, projectInfo);
    this.addCharacterPaths(paths, projectInfo);
    this.addDependencyPaths(paths, projectInfo);
    this.addArchitecturePaths(paths, projectInfo);
    this.addErrorHandlingPaths(paths, projectInfo);

    return this.sortByComplexity(paths);
  }

  private addMainQuestPaths(paths: AdventurePath[], projectInfo: ProjectInfo): void {
    const entryPoints = projectInfo.codeAnalysis.entryPoints;
    const hasMultipleEntries = entryPoints.length > 1;

    if (entryPoints.length > 0) {
      const mainEntry = entryPoints[0];
      paths.push({
        id: 'main-quest',
        name: 'The Main Quest',
        description: `Follow the primary journey from ${mainEntry} through the core systems`,
        complexity: hasMultipleEntries ? 'intermediate' : 'beginner',
        estimatedTime: hasMultipleEntries ? '15-20 minutes' : '10-15 minutes'
      });

      // For multiple entry points, add exploration of each
      if (hasMultipleEntries) {
        paths.push({
          id: 'main-quest-chapter-2',
          name: 'The Main Quest - Chapter 2',
          description: `Continue deeper into the system's heart`,
          complexity: 'intermediate',
          estimatedTime: '10-15 minutes',
          prerequisites: ['main-quest']
        });
      }
    }
  }

  private addConfigurationPaths(paths: AdventurePath[], projectInfo: ProjectInfo): void {
    // Always add configuration path since most projects have config
    if (projectInfo.fileCount > 5) {
      paths.push({
        id: 'configuration-caverns',
        name: 'Configuration Caverns',
        description: `Explore the ancient scrolls that control the realm's behavior`,
        complexity: 'beginner',
        estimatedTime: '5-10 minutes'
      });
    }
  }

  private addTestPaths(paths: AdventurePath[], projectInfo: ProjectInfo): void {
    if (projectInfo.hasTests) {
      const testFunctions = projectInfo.codeAnalysis.functions.filter(f => 
        f.fileName.includes('test') || f.fileName.includes('spec')
      ).length;
      
      paths.push({
        id: 'test-chamber-trials',
        name: 'Test Chamber Trials',
        description: `Prove your understanding through ${testFunctions} automated challenges`,
        complexity: 'intermediate',
        estimatedTime: '10-15 minutes'
      });
    }
  }

  private addApiPaths(paths: AdventurePath[], projectInfo: ProjectInfo): void {
    if (projectInfo.hasApi) {
      paths.push({
        id: 'api-gateway-expedition',
        name: 'API Gateway Expedition',
        description: 'Master the art of interdimensional communication',
        complexity: 'intermediate',
        estimatedTime: '10-15 minutes'
      });
    }
  }

  private addDatabasePaths(paths: AdventurePath[], projectInfo: ProjectInfo): void {
    if (projectInfo.hasDatabase) {
      paths.push({
        id: 'database-depths',
        name: 'Database Depths',
        description: 'Descend into the data vaults where all knowledge is stored',
        complexity: 'intermediate',
        estimatedTime: '10-15 minutes'
      });
    }
  }

  private addCharacterPaths(paths: AdventurePath[], projectInfo: ProjectInfo): void {
    const totalCharacters = projectInfo.codeAnalysis.classes.length + 
                           projectInfo.codeAnalysis.functions.length;
    
    if (totalCharacters > 5) {
      paths.push({
        id: 'character-gallery',
        name: 'Character Gallery',
        description: `Meet the ${totalCharacters} key inhabitants of this digital realm`,
        complexity: 'beginner',
        estimatedTime: '15-25 minutes'
      });
    }
  }

  private addDependencyPaths(paths: AdventurePath[], projectInfo: ProjectInfo): void {
    const externalDeps = projectInfo.codeAnalysis.dependencies.filter(d => d.type === 'dependency').length;
    if (externalDeps > 5) {
      paths.push({
        id: 'dependency-nexus',
        name: 'Dependency Nexus',
        description: `Visit the alliance hub where ${externalDeps} external powers converge`,
        complexity: 'advanced',
        estimatedTime: '15-20 minutes'
      });
    }
  }

  private addArchitecturePaths(paths: AdventurePath[], projectInfo: ProjectInfo): void {
    if (projectInfo.fileCount > 20) {
      paths.push({
        id: 'architecture-summit',
        name: 'Architecture Summit',
        description: 'Survey the entire kingdom from the highest tower',
        complexity: 'advanced',
        estimatedTime: '20-30 minutes'
      });
    }
  }

  private addErrorHandlingPaths(paths: AdventurePath[], projectInfo: ProjectInfo): void {
    const errorHandlingFunctions = projectInfo.codeAnalysis.functions.filter(f => 
      f.name.toLowerCase().includes('error') || 
      f.name.toLowerCase().includes('catch') ||
      f.summary.includes('handles') || 
      f.summary.includes('error')
    ).length;

    if (errorHandlingFunctions > 3) {
      paths.push({
        id: 'error-fortress',
        name: 'Error Handling Fortress',
        description: 'Learn the defensive arts of the code kingdom',
        complexity: 'advanced',
        estimatedTime: '10-15 minutes'
      });
    }
  }

  private sortByComplexity(paths: AdventurePath[]): AdventurePath[] {
    const order = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
    return paths.sort((a, b) => order[a.complexity] - order[b.complexity]);
  }

  generateAdventureChoicesText(paths: AdventurePath[], theme: AdventureTheme): string {
    const emoji = THEME_EMOJIS[theme] || '🎮';
    
    let text = `\n${emoji} **Choose Your Adventure Path:**\n\n`;
    
    paths.forEach((path, index) => {
      const difficultyIcon = {
        beginner: '🟢',
        intermediate: '🟡', 
        advanced: '🔴'
      }[path.complexity];
      
      text += `${index + 1}. **${path.name}** ${difficultyIcon}\n`;
      text += `   ${path.description}\n`;
      text += `   ⏱️ ${path.estimatedTime}\n`;
      if (path.prerequisites) {
        text += `   📋 Requires: ${path.prerequisites.join(', ')}\n`;
      }
      text += '\n';
    });

    text += `Use the \`explore_path\` tool with your chosen adventure name to begin!`;
    
    return text;
  }
}