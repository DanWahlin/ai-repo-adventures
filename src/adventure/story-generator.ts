import type { ProjectInfo } from '../analyzer/index.js';
import { AdventureTheme } from '../shared/theme.js';
import { ANALYSIS_LIMITS } from '../shared/index.js';
import { LLMClient } from '../llm/llm-client.js';
import { ThemeManager } from './theme-manager.js';

export interface Adventure {
  id: string;
  title: string;
  description: string;
  codeFiles?: string[];
}

export interface StoryResponse {
  story: string;
  adventures: Adventure[];
}

export interface AdventureContent {
  adventure: string;
  fileExploration?: string;
  codeSnippets: CodeSnippet[];
  hints: string[];
}

export interface CodeSnippet {
  file: string;
  snippet: string;
  explanation: string;
}

/**
 * StoryGenerator - Handles all story and adventure content generation using LLM
 * Extracted from AdventureManager to follow single responsibility principle
 */
export class StoryGenerator {
  private llmClient: LLMClient;
  private themeManager: ThemeManager;

  constructor() {
    this.llmClient = new LLMClient();
    this.themeManager = new ThemeManager();
  }

  /**
   * Generate the initial story and adventures using LLM
   */
  async generateStoryAndAdventures(projectInfo: ProjectInfo, theme: AdventureTheme): Promise<StoryResponse> {
    const prompt = this.buildStoryGenerationPrompt(projectInfo, theme);

    try {
      const response = await this.llmClient.generateResponse(prompt, { responseFormat: 'json_object' });
      
      let parsed;
      try {
        parsed = JSON.parse(response.content);
      } catch (parseError) {
        throw new Error(`Failed to parse LLM response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      
      // Type-safe validation
      if (!parsed.story || typeof parsed.story !== 'string') {
        throw new Error('Invalid LLM response: missing or invalid story field');
      }
      
      if (!Array.isArray(parsed.adventures)) {
        throw new Error('Invalid LLM response: adventures must be an array');
      }
      
      // Validate each adventure
      for (let i = 0; i < parsed.adventures.length; i++) {
        const adventure = parsed.adventures[i];
        if (!adventure.id || !adventure.title || !adventure.description) {
          throw new Error(`Invalid adventure at index ${i}: missing required fields (id, title, description)`);
        }
      }

      return parsed;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`LLM story generation failed for theme "${theme}", project type "${projectInfo.type}":`, {
        error: errorMessage,
        projectFileCount: projectInfo.fileCount,
        technologies: projectInfo.mainTechnologies,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Unable to generate adventure story: ${errorMessage}. Please ensure your LLM configuration is correct and the service is available.`);
    }
  }

  /**
   * Generate detailed adventure content using LLM
   */
  async generateAdventureContent(
    adventure: Adventure,
    theme: AdventureTheme,
    projectInfo: ProjectInfo,
    codeContent: string
  ): Promise<AdventureContent> {
    const prompt = `You are continuing the ${theme}-themed code exploration adventure. Create immersive content for: "${adventure.title}"

**Adventure Context:**
- Description: ${adventure.description}
- Project Type: ${projectInfo.type} using ${projectInfo.mainTechnologies.join(', ')}
- Theme Vocabulary: ${this.themeManager.getThemeVocabulary(theme)}

**Code Files to Explore:**
${codeContent}

## Content Requirements

**Adventure Story:**
- Write 1-2 concise paragraphs (max 150 words total)
- Continue the ${theme} narrative efficiently
- Use clear ${theme} metaphors for technical concepts
- Reference 1-2 specific files or technologies

**File Exploration Prompt (REQUIRED):**
Create an interactive "Quest Action Required" section that:
- Encourages opening specific files in their code editor
- Provides step-by-step navigation with line numbers
- Explains the code flow (what connects to what)
- Uses engaging ${theme} language
- Includes specific exploration tasks ("look for X", "trace from line Y to Z")
- Asks users to report back or type something when done

**Code Snippets (2-3 required):**
- Extract and show 15-25 lines of ACTUAL code from the files provided above
- DO NOT create fictional or example code - use only real code from the project
- Show function signatures AND implementations for better understanding
- Explain the data flow: what comes in, what gets processed, what goes out
- Connect this code to other parts of the system

**Hints (exactly 2 required):**
1. **Practical**: How to work with this code and what to look for when exploring
2. **Next Steps**: What specific files to explore next and what to look for there

## Response Format

Your response must be a valid JSON object matching the structure below.

{
  "adventure": "1-2 concise paragraphs (max 150 words) ${theme}-themed story that continues the overarching narrative while teaching about the specific code components. Must weave analogies naturally throughout and reference actual file names.",
  "fileExploration": "Interactive 'Quest Action Required' section with specific file exploration tasks, line number references, code flow explanation, and user engagement prompts using ${theme} language",
  "codeSnippets": [
    {
      "file": "actual-filename-from-project",
      "snippet": "15-25 lines of ACTUAL code from the files provided above showing function signatures and implementations",
      "explanation": "Clear explanation of data flow: what comes in, what gets processed, what goes out, and how this connects to other parts of the system"
    }
  ],
  "hints": [
    "Practical: How to work with this code and what to look for when exploring",
    "Next Steps: What specific files to explore next and what to look for there"
  ]
}`;

    try {
      const response = await this.llmClient.generateResponse(prompt, { responseFormat: 'json_object' });
      
      let parsed;
      try {
        parsed = JSON.parse(response.content);
      } catch (parseError) {
        throw new Error(`Failed to parse adventure content as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      // Type-safe validation
      if (!parsed.adventure || typeof parsed.adventure !== 'string') {
        throw new Error('Invalid adventure content: missing or invalid adventure field');
      }
      
      if (!Array.isArray(parsed.hints)) {
        throw new Error('Invalid adventure content: hints must be an array');
      }
      
      if (!Array.isArray(parsed.codeSnippets)) {
        parsed.codeSnippets = [];
      }

      return parsed;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`LLM adventure content generation failed for adventure "${adventure.title}", theme "${theme}":`, {
        error: errorMessage,
        adventureId: adventure.id,
        codeFilesCount: adventure.codeFiles?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Unable to generate content for adventure "${adventure.title}": ${errorMessage}. Please ensure your LLM configuration is correct and the service is available.`);
    }
  }

  /**
   * Generate completion summary using LLM
   */
  async generateCompletionSummary(
    adventure: Adventure,
    theme: AdventureTheme,
    progress: number,
    total: number
  ): Promise<string> {
    const percentComplete = Math.round((progress / total) * 100);
    
    const prompt = `Generate a ${theme}-themed completion celebration for: "${adventure.title}"

**Context:**
- Adventure completed: ${adventure.title}
- Progress: ${progress}/${total} adventures (${percentComplete}% complete)
- Theme: ${theme}
- Theme vocabulary: ${this.themeManager.getThemeVocabulary(theme)}

**Requirements:**
- Write 1-2 sentences using ${theme} terminology
- Celebrate the specific learning achievement of this adventure
- Reference what code concepts were mastered
- Use encouraging, triumphant tone
- Connect to the overarching ${theme} narrative

**Examples:**
SPACE: "🚀 Mission accomplished, Space Explorer! You've successfully navigated the Configuration Control Center and mastered the art of system initialization protocols."
MEDIEVAL: "⚔️ Victory is yours, brave Knight! You have conquered the Enchanted Armory and now wield the sacred knowledge of configuration spells."
ANCIENT: "🏺 The Oracle smiles upon you, Seeker! You have unlocked the secrets of the Sacred Configuration Chamber and gained wisdom of the initialization rituals."

Generate ONLY the celebration message, no extra text.`;

    try {
      const response = await this.llmClient.generateResponse(prompt);
      return response.content.trim();
    } catch (error) {
      console.warn('LLM completion summary failed, using fallback:', error);
      return `🎉 Adventure "${adventure.title}" completed! You've gained valuable insights into this part of the codebase.`;
    }
  }

  /**
   * Build the story generation prompt
   */
  private buildStoryGenerationPrompt(projectInfo: ProjectInfo, theme: AdventureTheme): string {
    const projectAnalysis = this.createProjectAnalysisPrompt(projectInfo);
    const adventureRules = this.getAdventureCreationRules();
    const themeGuidelines = this.themeManager.getThemeGuidelines(theme);
    const responseFormat = this.getStoryResponseFormat(theme);
    
    return `You are a technical education specialist who creates immersive code exploration experiences.
Your goal is to transform this codebase into an engaging ${theme}-themed narrative that helps developers understand the architecture through storytelling.

## Project Analysis
${projectAnalysis}

${adventureRules}

${themeGuidelines}

${responseFormat}
`;
  }

  /**
   * Get adventure creation rules
   */
  private getAdventureCreationRules(): string {
    return `## Adventure Creation Rules

**Adventure Title Format:**
Each adventure title MUST follow this pattern: "Theme-Specific Name: Technical Description"
- Space example: "Starship Design: An Overview of the Codebase Architecture"
- Medieval example: "Castle Design: Exploring the Kingdom Layout"
- Ancient example: "Temple Complex Architecture: Understanding the Sacred Layout"
- DO NOT COPY these examples directly - create unique titles that fit the theme and keep them positive and non-controversial.

**Adventure Count Logic:**
- Simple projects (<20 files, <3 technologies): 2-3 adventures
- Medium projects (20-50 files, 3-5 technologies): 3-4 adventures  
- Complex projects (>50 files, >5 technologies): 5-6 adventures

**Required Adventure Types** (adapt to available project components):
1. **Architecture Overview** - Overall system design and entry points
2. **Configuration & Setup** - How the project is configured and initialized
3. **Core Logic** - Main business logic and algorithms
4. **Data Layer** - Database, storage, or data management (if present)
5. **API/Interface** - External interfaces, APIs, or user interactions (if present)
6. **Testing & Quality** - Testing setup and quality assurance (if present)`;
  }

  /**
   * Get story response format
   */
  private getStoryResponseFormat(theme: AdventureTheme): string {
    return `## Response Format

Your response must be a valid JSON object matching the structure below.

IMPORTANT: 
1. Adventure IDs MUST be simple integers starting from "1", "2", "3", etc.
2. Adventure titles MUST follow the format "🎯 Theme-Specific Title: Brief Description" with appropriate emojis
Examples:
- "🚀 Starship Design: An Overview of the Codebase Architecture"
- "🏛️ Temple Complex Architecture: Understanding the Sacred Layout"
- "🏰 Castle Design: Exploring the Kingdom Layout"
3. Each adventure title MUST start with an appropriate emoji that matches both the theme and adventure type

{
  "story": "A concise 1-2 paragraph opening (max 150 words) that establishes the ${theme} world and introduces the codebase. Keep it engaging but brief. Reference 1-2 key technologies.",
  "adventures": [
    {
      "id": "1",
      "title": "📍 ${theme}-themed title in format 'Emoji Adventure Name: What It Covers' (e.g., '🚀 Starship Design: An Overview of the Codebase Architecture')",
      "description": "One concise sentence explaining what this adventure covers",
      "codeFiles": ["actual-file-names-from-analysis"]
    },
    {
      "id": "2",
      "title": "Second adventure title",
      "description": "Description",
      "codeFiles": ["files"]
    }
    // Continue with id "3", "4", etc. for remaining adventures
  ]
}`;
  }

  /**
   * Create formatted project analysis for LLM
   */
  private createProjectAnalysisPrompt(projectInfo: ProjectInfo): string {
    const fileCount = projectInfo.fileCount;
    const techCount = projectInfo.mainTechnologies.length;
    // Simple complexity determination
    const complexity = fileCount < 20 ? 'simple' : fileCount < 50 ? 'medium' : 'complex';
    const complexityLevel = complexity.charAt(0).toUpperCase() + complexity.slice(1);

    const topFunctions = projectInfo.codeAnalysis.functions
      .slice(0, ANALYSIS_LIMITS.TOP_FUNCTIONS)
      .map(f => `  • ${f.name}() in ${f.fileName} - ${f.summary}`)
      .join('\n') || '  • No functions detected';

    const topClasses = projectInfo.codeAnalysis.classes
      .slice(0, ANALYSIS_LIMITS.TOP_CLASSES)
      .map(c => `  • ${c.name} in ${c.fileName} - ${c.summary}`)
      .join('\n') || '  • No classes detected';

    const depsByCategory = projectInfo.codeAnalysis.dependencies.reduce((acc, dep) => {
      if (!acc[dep.category]) acc[dep.category] = [];
      acc[dep.category]!.push(dep.name);
      return acc;
    }, {} as Record<string, string[]>);

    const depSummary = Object.entries(depsByCategory)
      .map(([category, deps]) => `  • ${category}: ${deps.slice(0, ANALYSIS_LIMITS.TOP_DEPENDENCIES).join(', ')}`)
      .join('\n') || '  • No dependencies detected';

    return `**PROJECT ANALYSIS:**

**Complexity Assessment:** ${complexityLevel} project (${fileCount} files, ${techCount} technologies)

**Basic Info:**
- Project type: ${projectInfo.type}
- File count: ${projectInfo.fileCount}
- Main technologies: ${projectInfo.mainTechnologies.join(', ')}
- Entry points: ${projectInfo.codeAnalysis.entryPoints.join(', ') || 'None detected'}

**Architecture Components:**
- Database integration: ${projectInfo.hasDatabase ? 'Yes' : 'No'}
- API/HTTP endpoints: ${projectInfo.hasApi ? 'Yes' : 'No'}
- Frontend interface: ${projectInfo.hasFrontend ? 'Yes' : 'No'}
- Testing framework: ${projectInfo.hasTests ? 'Yes' : 'No'}

**Key Functions (most important):**
${topFunctions}

**Key Classes/Components:**
${topClasses}

**Dependencies by Category:**
${depSummary}

**File Structure:**
- Source files: ${projectInfo.structure.sourceFiles.slice(0, ANALYSIS_LIMITS.KEY_SOURCE_FILES).join(', ')}
- Config files: ${projectInfo.structure.configFiles.join(', ')}
- Important files: ${projectInfo.structure.importantFiles.slice(0, ANALYSIS_LIMITS.TOP_CLASSES).join(', ')}

**Directory Layout:**
${projectInfo.structure.directories.slice(0, ANALYSIS_LIMITS.KEY_SOURCE_FILES).map(dir => `- ${dir}`).join('\n')}

**Recommended Adventure Focus Areas:**
${this.getRecommendedAdventureFocus(projectInfo)}`;
  }

  /**
   * Get recommended adventure focus areas based on project analysis
   */
  private getRecommendedAdventureFocus(projectInfo: ProjectInfo): string {
    const focusAreas = [];
    
    if (projectInfo.codeAnalysis.entryPoints.length > 0) {
      focusAreas.push('• Architecture Overview - Explore main entry points and system flow');
    }
    
    if (projectInfo.structure.configFiles.length > 0) {
      focusAreas.push('• Configuration Setup - Understand project configuration and initialization');
    }
    
    if (projectInfo.codeAnalysis.functions.length > 0) {
      focusAreas.push('• Core Logic - Dive into main business logic and key algorithms');
    }
    
    if (projectInfo.hasDatabase) {
      focusAreas.push('• Data Management - Explore database integration and data flow');
    }
    
    if (projectInfo.hasApi) {
      focusAreas.push('• API Interface - Understand external communication and endpoints');
    }
    
    if (projectInfo.hasFrontend) {
      focusAreas.push('• User Interface - Explore frontend components and user interactions');
    }
    
    if (projectInfo.hasTests) {
      focusAreas.push('• Quality Assurance - Review testing strategies and quality measures');
    }
    
    if (projectInfo.codeAnalysis.dependencies.length > 5) {
      focusAreas.push('• Dependency Network - Understand external libraries and integrations');
    }
    
    return focusAreas.length > 0 ? focusAreas.join('\n') : '• General Code Exploration - Basic project structure and patterns';
  }
}