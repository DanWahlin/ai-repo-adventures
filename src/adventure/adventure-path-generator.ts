import { ProjectInfo } from '../analyzer/project-analyzer.js';
import { AdventureTheme, THEME_EMOJIS } from '../shared/theme.js';

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
    const codeFlow = projectInfo.codeAnalysis.codeFlow;
    const hasComplexFlow = codeFlow && codeFlow.executionOrder && codeFlow.executionOrder.length > 5;

    // 1. Always include the main quest
    if (codeFlow?.entryPoint) {
      paths.push({
        id: 'main-quest',
        name: 'The Main Quest',
        description: `Follow the primary journey from ${codeFlow.entryPoint} through the core systems`,
        complexity: hasComplexFlow ? 'intermediate' : 'beginner',
        estimatedTime: hasComplexFlow ? '15-20 minutes' : '10-15 minutes'
      });

      // For complex flows, break into chapters
      if (hasComplexFlow) {
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

    // 2. Configuration adventure
    const configFiles = projectInfo.structure.configFiles.length;
    if (configFiles > 0) {
      paths.push({
        id: 'configuration-caverns',
        name: 'Configuration Caverns',
        description: `Explore ${configFiles} ancient scrolls that control the realm's behavior`,
        complexity: 'beginner',
        estimatedTime: '5-10 minutes'
      });
    }

    // 3. Test chamber (if tests exist)
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

    // 4. API Gateway (if APIs detected)
    if (projectInfo.hasApi) {
      paths.push({
        id: 'api-gateway-expedition',
        name: 'API Gateway Expedition',
        description: 'Master the art of interdimensional communication',
        complexity: 'intermediate',
        estimatedTime: '10-15 minutes'
      });
    }

    // 5. Database depths (if database detected)
    if (projectInfo.hasDatabase) {
      paths.push({
        id: 'database-depths',
        name: 'Database Depths',
        description: 'Descend into the data vaults where all knowledge is stored',
        complexity: 'intermediate',
        estimatedTime: '10-15 minutes'
      });
    }

    // 6. Character meet & greet (for many classes/functions)
    const totalCharacters = projectInfo.codeAnalysis.classes.length + 
                           projectInfo.codeAnalysis.functions.filter(f => f.isExported).length;
    
    if (totalCharacters > 5) {
      paths.push({
        id: 'character-gallery',
        name: 'Character Gallery',
        description: `Meet the ${totalCharacters} key inhabitants of this digital realm`,
        complexity: 'beginner',
        estimatedTime: '15-25 minutes'
      });
    }

    // 7. Dependency nexus (for projects with many dependencies)
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

    // 8. Architecture overview (for large projects)
    if (projectInfo.fileCount > 20) {
      paths.push({
        id: 'architecture-summit',
        name: 'Architecture Summit',
        description: 'Survey the entire kingdom from the highest tower',
        complexity: 'advanced',
        estimatedTime: '20-30 minutes'
      });
    }

    // 9. Error handling fortress (if error patterns detected)
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

    return this.sortByComplexity(paths);
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