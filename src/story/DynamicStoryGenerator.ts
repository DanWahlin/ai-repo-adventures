import { ProjectInfo } from '../analyzer/ProjectAnalyzer.js';
import { LLMClient } from '../llm/LLMClient.js';
import { Character, Story } from './types.js';
import { AdventurePathGenerator } from '../adventure/AdventurePathGenerator.js';

export class DynamicStoryGenerator {
  private llmClient: LLMClient;
  private currentProject?: ProjectInfo;
  private pathGenerator: AdventurePathGenerator;

  constructor() {
    this.llmClient = new LLMClient();
    this.pathGenerator = new AdventurePathGenerator();
  }

  setProject(projectInfo: ProjectInfo): void {
    this.currentProject = projectInfo;
  }

  async generateStory(theme: string): Promise<Story> {
    if (!this.currentProject) {
      throw new Error('No project information available. Please analyze a project first.');
    }

    const projectAnalysis = this.createProjectAnalysis();
    const storyPrompt = this.createStoryPrompt(theme, projectAnalysis);
    
    try {
      const llmResponse = await this.llmClient.generateResponse(storyPrompt);
      return this.parseStoryResponse(llmResponse.content, theme);
    } catch (error) {
      console.warn('Failed to generate dynamic story, using fallback:', error);
      return this.generateFallbackStory(theme);
    }
  }

  private createProjectAnalysis(): string {
    if (!this.currentProject) return '';

    const analysis = this.currentProject.codeAnalysis;
    
    // Create function summaries
    const topFunctions = analysis.functions?.slice(0, 8).map(f => 
      `  • ${f.name}() in ${f.fileName} - ${f.summary}`
    ).join('\n') || '';

    // Create class summaries  
    const topClasses = analysis.classes?.slice(0, 5).map(c =>
      `  • ${c.name} in ${c.fileName} - ${c.summary}`
    ).join('\n') || '';

    // Create dependency categories
    const depsByCategory = analysis?.dependencies?.reduce((acc, dep) => {
      if (!acc[dep.category]) acc[dep.category] = [];
      acc[dep.category]!.push(dep.name);
      return acc;
    }, {} as Record<string, string[]>) ?? {};

    const depSummary = Object.entries(depsByCategory)
      .map(([category, deps]) => `  • ${category}: ${deps.slice(0, 3).join(', ')}`)
      .join('\n');

    // Key files with content
    const keyFilesSummary = analysis.keyFiles?.map(f =>
      `  • ${f.path}: ${f.summary}`
    ).join('\n') || '';

    return `
PROJECT ANALYSIS:
================

BASIC INFO:
- Project Type: ${this.currentProject.type}
- File Count: ${this.currentProject.fileCount}
- Main Technologies: ${this.currentProject.mainTechnologies.join(', ')}
- Entry Points: ${analysis.entryPoints?.join(', ') || 'None detected'}

ARCHITECTURE:
- Has Database: ${this.currentProject.hasDatabase}
- Has API: ${this.currentProject.hasApi}
- Has Frontend: ${this.currentProject.hasFrontend}
- Has Tests: ${this.currentProject.hasTests}

KEY FUNCTIONS (What the code actually does):
${topFunctions || '  • No functions detected'}

KEY CLASSES (Main components):
${topClasses || '  • No classes detected'}

DEPENDENCIES BY CATEGORY:
${depSummary || '  • No dependencies detected'}

KEY FILES WITH CONTEXT:
${keyFilesSummary || '  • No key files analyzed'}

CODE STRUCTURE:
- Directories: ${this.currentProject.structure.directories.slice(0, 8).join(', ')}
- Important Files: ${this.currentProject.structure.importantFiles.slice(0, 8).join(', ')}
- Source Files: ${this.currentProject.structure.sourceFiles.slice(0, 10).join(', ')}

CODE FLOW ANALYSIS:
${analysis.codeFlow ? `- Entry Point: ${analysis.codeFlow.entryPoint}
- Execution Flow: ${analysis.codeFlow.executionOrder.slice(0, 5).join(' → ')}
- Call Relationships: ${analysis.codeFlow.callGraph.length} connections mapped` : '- No flow analysis available'}
    `.trim();
  }

  private createStoryPrompt(theme: string, projectAnalysis: string): string {
    const themeDescriptions = {
      space: 'a space exploration adventure where the codebase is a starship/space station',
      medieval: 'a medieval fantasy adventure where the codebase is a magical kingdom',
      ancient: 'an ancient civilization adventure where the codebase is a lost temple/city'
    };

    const themeDescription = themeDescriptions[theme as keyof typeof themeDescriptions] || themeDescriptions.space;

    return `Create an engaging story introduction and character list for ${themeDescription}.

${projectAnalysis}

Based on this project analysis, create:

1. **Story Title**: A compelling title that reflects both the theme and the specific project purpose

2. **Introduction**: A 2-3 paragraph story introduction that:
   - Sets the scene in the ${theme} theme
   - References actual functions, classes, and dependencies found in the code
   - Creates adventure paths around real code components (not just generic "technologies")
   - Uses the actual entry points, key files, and architecture patterns discovered

3. **Characters**: Create 3-6 characters based on ACTUAL CODE ELEMENTS. Map them to:
   - Real classes found in the analysis
   - Actual functions and their purposes
   - Specific dependencies used (frameworks, tools, libraries)
   - Each character should embody a real code component with their actual role/summary

4. **Character Details** (for each character):
   - Name that fits theme + actual code element
   - Role based on the actual function/class summary from analysis
   - Greeting that hints at their real technical purpose
   - Description connecting their actual code behavior to theme imagery
   - Fun fact about their real implementation details

5. **Initial Choices**: Adventure paths that follow the CODE FLOW:
   - Start from the entry point and follow the execution order
   - Create paths that match the actual call relationships
   - Use the flow analysis to guide the adventure narrative
   - Make the story progression match how the code actually executes

CRITICAL: Use the REAL CODE ANALYSIS and CODE FLOW data above. The adventure should follow the actual execution path from ${this.currentProject?.codeAnalysis.codeFlow?.entryPoint || 'the entry point'}. Make characters appear in the order they would be encountered during code execution!`;
  }

  private parseStoryResponse(content: string, theme: string): Story {
    // Parse the LLM response into our Story structure
    // This is a simplified parser - in production, you might want more robust parsing
    
    const lines = content.split('\n').filter(line => line.trim());
    let title = 'Code Adventure';
    let introduction = '';
    const characters: Character[] = [];
    const initialChoices: string[] = [];
    
    let currentSection = '';
    let currentCharacter: Partial<Character> = {};
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.toLowerCase().includes('title:') || trimmedLine.startsWith('**') && trimmedLine.includes('Title')) {
        title = trimmedLine.replace(/^\*\*.*?:\*\*\s*/, '').replace(/^.*?:\s*/, '').replace(/\*\*/g, '');
        currentSection = 'title';
      } else if (trimmedLine.toLowerCase().includes('introduction:') || trimmedLine.startsWith('**') && trimmedLine.includes('Introduction')) {
        currentSection = 'introduction';
      } else if (trimmedLine.toLowerCase().includes('characters:') || trimmedLine.startsWith('**') && trimmedLine.includes('Characters')) {
        currentSection = 'characters';
      } else if (trimmedLine.toLowerCase().includes('choices:') || trimmedLine.includes('Initial Choices') || trimmedLine.includes('adventure paths')) {
        currentSection = 'choices';
      } else if (currentSection === 'introduction' && trimmedLine && !trimmedLine.startsWith('**')) {
        introduction += (introduction ? ' ' : '') + trimmedLine;
      } else if (currentSection === 'characters') {
        if (trimmedLine.startsWith('-') || trimmedLine.match(/^\d+\./)) {
          // Save previous character if exists
          if (currentCharacter.name) {
            characters.push(this.completeCharacter(currentCharacter));
          }
          // Start new character
          currentCharacter = {
            name: trimmedLine.replace(/^[-\d\.]\s*/, '').replace(/\*\*/g, ''),
            technology: this.inferTechnology(trimmedLine)
          };
        } else if (trimmedLine.includes('Role:') || trimmedLine.includes('role:')) {
          currentCharacter.role = trimmedLine.replace(/^.*?[Rr]ole:\s*/, '').replace(/\*\*/g, '');
        } else if (trimmedLine.includes('Greeting:') || trimmedLine.includes('greeting:')) {
          currentCharacter.greeting = trimmedLine.replace(/^.*?[Gg]reeting:\s*/, '').replace(/[""]/g, '').replace(/\*\*/g, '');
        } else if (trimmedLine.includes('Description:') || trimmedLine.includes('description:')) {
          currentCharacter.description = trimmedLine.replace(/^.*?[Dd]escription:\s*/, '').replace(/\*\*/g, '');
        } else if (trimmedLine.includes('Fun fact:') || trimmedLine.includes('fun fact:')) {
          currentCharacter.funFact = trimmedLine.replace(/^.*?[Ff]un fact:\s*/, '').replace(/\*\*/g, '');
        }
      } else if (currentSection === 'choices' && trimmedLine && (trimmedLine.startsWith('-') || trimmedLine.match(/^\d+\./))) {
        initialChoices.push(trimmedLine.replace(/^[-\d\.]\s*/, '').replace(/\*\*/g, ''));
      }
    }
    
    // Save last character
    if (currentCharacter.name) {
      characters.push(this.completeCharacter(currentCharacter));
    }
    
    // Ensure we have at least some characters
    if (characters.length === 0) {
      characters.push(...this.generateDefaultCharacters(theme));
    }
    
    // Generate smart adventure paths based on project analysis
    const adventurePaths = this.pathGenerator.generatePaths(this.currentProject!);
    const pathChoicesText = this.pathGenerator.generateAdventureChoicesText(adventurePaths, theme);
    
    // Use adventure paths as initial choices, fallback to default if needed
    if (adventurePaths.length > 0) {
      initialChoices.push(...adventurePaths.map(path => path.name));
    } else if (initialChoices.length === 0) {
      initialChoices.push(...this.generateDefaultChoices(characters));
    }

    // Append adventure path details to introduction
    const fullIntroduction = (introduction || this.generateDefaultIntroduction(theme)) + 
                             (adventurePaths.length > 0 ? '\n\n' + pathChoicesText : '');

    return {
      theme,
      title: title || `${theme} Code Adventure`,
      introduction: fullIntroduction,
      setting: `A ${theme}-themed exploration of your codebase`,
      characters,
      initialChoices
    };
  }

  private completeCharacter(partial: Partial<Character>): Character {
    return {
      name: partial.name || 'Unknown Entity',
      role: partial.role || 'System Guardian',
      description: partial.description || 'A mysterious figure who watches over the code.',
      greeting: partial.greeting || 'Welcome, traveler!',
      funFact: partial.funFact || 'I hold secrets of the digital realm!',
      technology: partial.technology || 'Unknown'
    };
  }

  private inferTechnology(text: string): string {
    const techKeywords = {
      'Database': ['database', 'data', 'storage', 'db'],
      'API': ['api', 'communication', 'interface', 'endpoint'],
      'Frontend': ['frontend', 'ui', 'interface', 'display'],
      'Backend': ['backend', 'server', 'core', 'engine'],
      'Testing': ['test', 'quality', 'validation']
    };

    for (const [tech, keywords] of Object.entries(techKeywords)) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        return tech;
      }
    }
    return 'General';
  }

  private generateDefaultCharacters(theme: string): Character[] {
    const templates = {
      space: {
        name: 'Data Navigator Zara',
        role: 'Chief Data Officer of the Starship',
        description: 'A brilliant navigator who charts courses through vast data galaxies.',
        greeting: 'Welcome aboard, space traveler! Ready to explore the data cosmos?',
        funFact: 'I can process stellar databases faster than light travel!',
        technology: 'Database'
      },
      medieval: {
        name: 'Keeper Magnus',
        role: 'Guardian of the Code Archives',
        description: 'An ancient keeper who protects the sacred scrolls of knowledge.',
        greeting: 'Hail, brave adventurer! Seek ye wisdom from the great archives?',
        funFact: 'I have guarded these digital scrolls for centuries!',
        technology: 'Database'
      },
      ancient: {
        name: 'Oracle Pythia',
        role: 'Keeper of Digital Prophecies',
        description: 'A wise oracle who interprets the patterns written in stone tablets of code.',
        greeting: 'Seeker of knowledge, the digital spirits whisper to me of your quest.',
        funFact: 'I can divine the future of your code from ancient algorithms!',
        technology: 'Database'
      }
    };

    const template = templates[theme as keyof typeof templates] || templates.space;
    return [template];
  }

  private generateDefaultChoices(characters: Character[]): string[] {
    const choices = [`Meet ${characters[0]?.name || 'a mysterious character'}`];
    if (this.currentProject?.hasApi) choices.push('Explore the communication systems');
    if (this.currentProject?.hasFrontend) choices.push('Visit the user interface');
    if (this.currentProject?.hasTests) choices.push('Check the quality assurance protocols');
    return choices;
  }

  private generateDefaultIntroduction(theme: string): string {
    const intros = {
      space: '🚀 Welcome to your digital starship! This vessel contains the technological marvels that power your mission through the code cosmos.',
      medieval: '🏰 Welcome to the enchanted kingdom of code! This mystical realm holds the magical technologies that bring your digital world to life.',
      ancient: '🏺 Welcome to the lost temple of digital wisdom! These ancient halls contain the technological artifacts of a sophisticated civilization.'
    };
    
    return intros[theme as keyof typeof intros] || intros.space;
  }

  private generateFallbackStory(theme: string): Story {
    if (!this.currentProject) {
      throw new Error('No project information available');
    }

    const fallbackIntro = `Welcome to your ${theme} code adventure! This ${this.currentProject.type} project contains ${this.currentProject.fileCount} files and uses technologies like ${this.currentProject.mainTechnologies.join(', ')}. Let's explore it together!`;
    
    return {
      theme,
      title: `${theme} Code Adventure`,
      introduction: fallbackIntro,
      setting: `A ${theme}-themed exploration`,
      characters: this.generateDefaultCharacters(theme),
      initialChoices: ['Begin your adventure', 'Learn about the technologies', 'Explore the structure']
    };
  }
}