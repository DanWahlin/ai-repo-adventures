import { ProjectInfo } from '../analyzer/ProjectAnalyzer.js';
import { LLMClient } from '../llm/LLMClient.js';
import { readFile } from 'fs/promises';
import { AdventureTheme, THEMES, THEME_EMOJIS } from '../shared/theme.js';

// Core interfaces for LLM-driven adventures
export interface Adventure {
  id: string;
  title: string;
  description: string;
  codeFiles?: string[]; // files this adventure will explore
}

export interface StoryResponse {
  story: string;
  adventures: Adventure[];
}

export interface CodeSnippet {
  file: string;
  snippet: string;
  explanation: string;
}

export interface AdventureContent {
  adventure: string;  // Contains the story with analogies woven throughout
  codeSnippets: CodeSnippet[];
  hints: string[];
}

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
  private llmClient: LLMClient;
  private fileIndex: Map<string, string> = new Map();

  constructor() {
    this.llmClient = new LLMClient();
  }



  /**
   * Build the story generation prompt
   */
  private buildStoryGenerationPrompt(projectInfo: ProjectInfo, theme: AdventureTheme): string {
    const projectAnalysis = this.createProjectAnalysisPrompt(projectInfo);
    const adventureRules = this.getAdventureCreationRules();
    const themeGuidelines = this.getThemeGuidelines(theme);
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
- Simple projects (<50 files, <3 technologies): 2-3 adventures
- Medium projects (50-200 files, 3-5 technologies): 3-4 adventures  
- Complex projects (>200 files, >5 technologies): 5-6 adventures

**Required Adventure Types** (adapt to available project components):
1. **Architecture Overview** - Overall system design and entry points
2. **Configuration & Setup** - How the project is configured and initialized
3. **Core Logic** - Main business logic and algorithms
4. **Data Layer** - Database, storage, or data management (if present)
5. **API/Interface** - External interfaces, APIs, or user interactions (if present)
6. **Testing & Quality** - Testing setup and quality assurance (if present)`;
  }

  /**
   * Get theme-specific guidelines
   */
  private getThemeGuidelines(theme: AdventureTheme): string {
    const THEME_RESTRICTIONS = {
      [THEMES.SPACE.key]: '(space ships, galaxies, astronauts - NOT kingdoms or magic)',
      [THEMES.MYTHICAL.key]: '(castles, knights, magic, mythical creatures - NOT space ships or ancient temples)',
      [THEMES.ANCIENT.key]: '(temples, pyramids, ancient wisdom - NOT space ships or mythical castles)'
    } as const;
    
    const themeRestrictions = THEME_RESTRICTIONS[theme] || THEME_RESTRICTIONS[THEMES.SPACE.key];
    
    return `## Theme Guidelines

**${theme.toUpperCase()} THEME VOCABULARY:**
${this.getThemeVocabulary(theme)}

**Story Requirements:**
- Create an overarching narrative that connects all adventures
- Each adventure should feel like a chapter in a larger story
- Use ${theme} metaphors that make technical concepts intuitive
- Reference actual file names and technologies from the analysis
- Make the story educational but entertaining
- IMPORTANT: Stay strictly within the ${theme} theme - no mixing of themes!
  ${themeRestrictions}`;
  }

  /**
   * Get story response format
   */
  private getStoryResponseFormat(theme: AdventureTheme): string {
    return `## Response Format

Your response must be a valid JSON object matching the structure below.

IMPORTANT: 
1. Adventure IDs MUST be simple integers starting from "1", "2", "3", etc.
2. Adventure titles MUST follow the format "Theme-Specific Title: Brief Description" 
Examples:
- "Starship Design: An Overview of the Codebase Architecture"
- "Temple Complex Architecture: Understanding the Sacred Layout"
- "Castle Design: Exploring the Kingdom Layout"

{
  "story": "A concise 1-2 paragraph opening (max 150 words) that establishes the ${theme} world and introduces the codebase. Keep it engaging but brief. Reference 1-2 key technologies.",
  "adventures": [
    {
      "id": "1",
      "title": "${theme}-themed title in format 'Adventure Name: What It Covers' (e.g., 'Starship Design: An Overview of the Codebase Architecture')",
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
   * Initialize the adventure with project context and generate story + adventures
   */
  async initializeAdventure(projectInfo: ProjectInfo, theme: AdventureTheme): Promise<string> {
    // Reset state for new adventure
    this.state.reset();
    this.state.projectInfo = projectInfo;
    this.state.currentTheme = theme;
    
    // Build file index for efficient lookups
    this.buildFileIndex(projectInfo);

    // Generate the overall story and adventures using LLM
    const storyResponse = await this.generateStoryAndAdventures(projectInfo, theme);
    
    this.state.story = storyResponse.story;
    this.state.adventures = storyResponse.adventures;

    // Return the story with available adventures
    return this.formatStoryWithAdventures(storyResponse);
  }

  /**
   * Sanitize user input for adventure selection
   * This is used for matching adventure IDs, titles, or numbers - not for code input
   */
  private sanitizeUserInput(input: string): string {
    // For adventure selection, we need to allow:
    // - Numbers (1, 2, 3)
    // - Adventure IDs (architecture-overview, core-logic)
    // - Parts of adventure titles (which may contain : and /)
    // But prevent obvious injection attempts
    return input
      .replace(/[<>{}"`$\\]/g, '') // Remove only dangerous characters for prompts
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .slice(0, 200); // Limit length to prevent DOS
  }

  /**
   * Execute a chosen adventure by ID, number, or title
   */
  async exploreAdventure(choice: string): Promise<AdventureResult> {
    const sanitizedChoice = this.sanitizeUserInput(choice);
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

    // Generate adventure content using LLM
    const adventureContent = await this.generateAdventureContent(adventure);
    
    // Mark adventure as completed
    this.state.completedAdventures.add(adventure.id);

    // Generate completion summary
    const completionSummary = await this.generateCompletionSummary(adventure);

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
   * Generate the initial story and adventures using LLM
   */
  private async generateStoryAndAdventures(projectInfo: ProjectInfo, theme: AdventureTheme): Promise<StoryResponse> {
    const prompt = this.buildStoryGenerationPrompt(projectInfo, theme);

    try {
      const response = await this.llmClient.generateResponse(prompt, { responseFormat: 'json_object' });
      
      // With json_object format, the response should already be valid JSON, but let's be safe
      let parsed;
      try {
        parsed = JSON.parse(response.content);
      } catch (parseError) {
        throw new Error(`Failed to parse LLM response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      
      // Type-safe validation with detailed error messages
      if (!parsed.story || typeof parsed.story !== 'string') {
        throw new Error('Invalid LLM response: missing or invalid story field');
      }
      
      if (!Array.isArray(parsed.adventures)) {
        throw new Error('Invalid LLM response: adventures must be an array');
      }
      
      // Validate each adventure has required fields
      for (let i = 0; i < parsed.adventures.length; i++) {
        const adventure = parsed.adventures[i];
        if (!adventure.id || !adventure.title || !adventure.description) {
          throw new Error(`Invalid adventure at index ${i}: missing required fields (id, title, description)`);
        }
      }

      return parsed;
    } catch (error) {
      console.warn(`LLM story generation failed for theme "${theme}", project type "${projectInfo.type}":`, {
        error: error instanceof Error ? error.message : String(error),
        projectFileCount: projectInfo.fileCount,
        technologies: projectInfo.mainTechnologies,
        timestamp: new Date().toISOString()
      });
      return this.generateFallbackStory(projectInfo, theme);
    }
  }

  /**
   * Generate detailed adventure content using LLM
   */
  private async generateAdventureContent(adventure: Adventure): Promise<AdventureContent> {
    if (!this.state.projectInfo) {
      throw new Error('No project context available');
    }

    // Prepare code content if specific files are mentioned
    const codeContent = await this.prepareCodeContent(adventure.codeFiles || []);
    
    const prompt = `You are continuing the ${this.state.currentTheme}-themed code exploration adventure. Create immersive content for: "${adventure.title}"

**Adventure Context:**
- Description: ${adventure.description}
- Project Type: ${this.state.projectInfo.type} using ${this.state.projectInfo.mainTechnologies.join(', ')}
- Theme Vocabulary: ${this.state.currentTheme ? this.getThemeVocabulary(this.state.currentTheme) : 'Not selected'}

**Code Files to Explore:**
${codeContent}

## Content Requirements

**Adventure Story:**
- Write 1-2 concise paragraphs (max 150 words total)
- Continue the ${this.state.currentTheme} narrative efficiently
- Use clear ${this.state.currentTheme} metaphors for technical concepts
- Reference 1-2 specific files or technologies

**Code Snippets (2-3 required):**
- Extract and show 5-10 lines of ACTUAL code from the files provided above
- DO NOT create fictional or example code - use only real code from the project
- Focus on key patterns or core functionality from the actual files
- Keep explanations brief but clear

**Hints (exactly 2 required):**
1. **Practical**: How to work with this code
2. **Next Steps**: What to explore next

## Response Format

Your response must be a valid JSON object matching the structure below.

{
  "adventure": "1-2 concise paragraphs (max 150 words) ${this.state.currentTheme}-themed story that continues the overarching narrative while teaching about the specific code components. Must weave analogies naturally throughout and reference actual file names.",
  "codeSnippets": [
    {
      "file": "actual-filename-from-project",
      "snippet": "5-10 lines of ACTUAL code from the files provided above (not fictional examples)",
      "explanation": "Clear explanation of what this code does, why it matters, and how it fits into the system"
    }
  ],
  "hints": [
    "Practical: How to work with this code",
    "Next Steps: What to explore next"
  ]
}`;

    try {
      const response = await this.llmClient.generateResponse(prompt, { responseFormat: 'json_object' });
      
      // With json_object format, the response should already be valid JSON, but let's be safe
      let parsed;
      try {
        parsed = JSON.parse(response.content);
      } catch (parseError) {
        throw new Error(`Failed to parse adventure content as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      // Type-safe validation with detailed error messages
      if (!parsed.adventure || typeof parsed.adventure !== 'string') {
        throw new Error('Invalid adventure content: missing or invalid adventure field');
      }
      
      if (!Array.isArray(parsed.hints)) {
        throw new Error('Invalid adventure content: hints must be an array');
      }
      
      if (!Array.isArray(parsed.codeSnippets)) {
        parsed.codeSnippets = []; // Default to empty array if missing
      }

      return parsed;
    } catch (error) {
      console.warn(`LLM adventure content generation failed for adventure "${adventure.title}", theme "${this.state.currentTheme}":`, {
        error: error instanceof Error ? error.message : String(error),
        adventureId: adventure.id,
        codeFilesCount: adventure.codeFiles?.length || 0,
        timestamp: new Date().toISOString()
      });
      return this.generateFallbackAdventureContent(adventure);
    }
  }

  /**
   * Generate completion summary using LLM
   */
  private async generateCompletionSummary(adventure: Adventure): Promise<string> {
    const progress = this.state.completedAdventures.size + 1;
    const total = this.state.adventures.length;
    const percentComplete = Math.round((progress / total) * 100);
    
    const prompt = `Generate a ${this.state.currentTheme}-themed completion celebration for: "${adventure.title}"

**Context:**
- Adventure completed: ${adventure.title}
- Progress: ${progress}/${total} adventures (${percentComplete}% complete)
- Theme: ${this.state.currentTheme}
- Theme vocabulary: ${this.state.currentTheme ? this.getThemeVocabulary(this.state.currentTheme) : 'Not selected'}

**Requirements:**
- Write 1-2 sentences using ${this.state.currentTheme} terminology
- Celebrate the specific learning achievement of this adventure
- Reference what code concepts were mastered
- Use encouraging, triumphant tone
- Connect to the overarching ${this.state.currentTheme} narrative

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
   * Get theme-specific vocabulary and examples
   */
  private getThemeVocabulary(theme: AdventureTheme): string {
    const vocabularies = {
      [THEMES.SPACE.key]: `
- Architecture → "Starship Design" or "Orbital Platform"
- Configuration → "Navigation Control Center" or "Command Bridge"
- APIs → "Interstellar Communication Hub" or "Quantum Data Relay"
- Database → "Data Archive Constellation" or "Information Nebula"
- Functions → "Navigation Protocols" or "System Procedures"
- Classes → "Crew Modules" or "Ship Components"
- Tests → "System Diagnostics" or "Mission Simulation Chamber"
- Dependencies → "Allied Fleet" or "Support Network"`,
      
      [THEMES.MYTHICAL.key]: `
- Architecture → "Castle Design" or "Kingdom Layout"  
- Configuration → "Enchanted Armory" or "Royal Treasury"
- APIs → "Royal Messenger Network" or "Diplomatic Embassy"
- Database → "Ancient Knowledge Vault" or "Dragon's Hoard"
- Functions → "Magical Spells" or "Mythical Incantations"
- Classes → "Guild Houses" or "Noble Orders"
- Tests → "Trial by Combat" or "Wisdom Challenges"
- Dependencies → "Allied Kingdoms" or "Mythical Alliances"`,
      
      [THEMES.ANCIENT.key]: `
- Architecture → "Temple Complex" or "Pyramid Structure"
- Configuration → "Sacred Ritual Chamber" or "Oracle's Sanctum"
- APIs → "Trade Route Network" or "Messenger Papyrus System"
- Database → "Sacred Scroll Library" or "Stone Tablet Archive"
- Functions → "Ancient Rituals" or "Sacred Ceremonies"
- Classes → "Priest Orders" or "Craftsman Guilds"
- Tests → "Divine Trials" or "Wisdom Examinations"
- Dependencies → "Trade Alliances" or "Tribute Networks"`
    };
    
    return vocabularies[theme as keyof typeof vocabularies] || vocabularies.space;
  }


  /**
   * Build file index for efficient lookups
   */
  private buildFileIndex(projectInfo: ProjectInfo): void {
    this.fileIndex.clear();
    
    // Index all source files
    [...projectInfo.structure.sourceFiles, ...projectInfo.structure.configFiles].forEach(filePath => {
      // Index by full path
      this.fileIndex.set(filePath, filePath);
      
      // Also index by filename only for convenience
      const filename = filePath.split('/').pop() || '';
      if (filename && !this.fileIndex.has(filename)) {
        this.fileIndex.set(filename, filePath);
      }
    });
  }

  /**
   * Find file in index efficiently
   */
  private findFileInIndex(file: string): string | undefined {
    // Direct lookup first
    if (this.fileIndex.has(file)) {
      return this.fileIndex.get(file);
    }
    
    // Try partial match
    for (const [key, value] of this.fileIndex.entries()) {
      if (key.includes(file) || file.includes(key)) {
        return value;
      }
    }
    
    return undefined;
  }

  /**
   * Prepare code content for LLM analysis
   */
  private async prepareCodeContent(codeFiles: string[]): Promise<string> {
    if (!this.state.projectInfo || codeFiles.length === 0) {
      return 'No specific files to explore - general project analysis.';
    }

    const fileContents: string[] = [];
    
    for (const file of codeFiles.slice(0, 3)) { // Limit to 3 files to avoid overwhelming the LLM
      try {
        const filePath = this.findFileInIndex(file);
        if (filePath) {
          // Try to read the file content
          const content = await readFile(filePath, 'utf-8');
          
          // Truncate very long files (keep first 100 lines)
          const lines = content.split('\n');
          const truncatedContent = lines.slice(0, 100).join('\n');
          const truncatedNote = lines.length > 100 ? `\n... (file continues for ${lines.length - 100} more lines)` : '';
          
          fileContents.push(`**File: ${file}**
\`\`\`${this.getFileExtension(filePath)}
${truncatedContent}${truncatedNote}
\`\`\``);
        } else {
          fileContents.push(`**File: ${file}** - Not found in project structure`);
        }
      } catch (error) {
        console.warn(`Could not read file ${file}:`, error instanceof Error ? error.message : String(error));
        fileContents.push(`**File: ${file}** - Could not read file content`);
      }
    }

    return `Files to explore in this adventure:

${fileContents.join('\n\n')}

Project structure context:
- Total files: ${this.state.projectInfo.fileCount}
- Main technologies: ${this.state.projectInfo.mainTechnologies.join(', ')}
- Has tests: ${this.state.projectInfo.hasTests}
- Has API: ${this.state.projectInfo.hasApi}
- Has database: ${this.state.projectInfo.hasDatabase}
- Entry points: ${this.state.projectInfo.codeAnalysis.entryPoints.join(', ')}`;
  }

  /**
   * Get file extension for syntax highlighting
   */
  private getFileExtension(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    // Map extensions to common syntax highlighting languages
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'tsx': 'tsx',
      'jsx': 'jsx',
      'json': 'json',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml',
      'toml': 'toml',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'sh': 'bash'
    };
    return langMap[ext || ''] || ext || '';
  }

  /**
   * Create formatted project analysis for LLM
   */
  private createProjectAnalysisPrompt(projectInfo: ProjectInfo): string {
    // Determine complexity level
    const fileCount = projectInfo.fileCount;
    const techCount = projectInfo.mainTechnologies.length;
    let complexityLevel = 'Simple';
    if (fileCount >= 200 || techCount > 5) {
      complexityLevel = 'Complex';
    } else if (fileCount >= 50 || techCount >= 3) {
      complexityLevel = 'Medium';
    }

    // Get top functions for better context
    const topFunctions = projectInfo.codeAnalysis.functions
      .slice(0, 5)
      .map(f => `  • ${f.name}() in ${f.fileName} - ${f.summary}`)
      .join('\n') || '  • No functions detected';

    // Get top classes for better context  
    const topClasses = projectInfo.codeAnalysis.classes
      .slice(0, 3)
      .map(c => `  • ${c.name} in ${c.fileName} - ${c.summary}`)
      .join('\n') || '  • No classes detected';

    // Categorize dependencies
    const depsByCategory = projectInfo.codeAnalysis.dependencies.reduce((acc, dep) => {
      if (!acc[dep.category]) acc[dep.category] = [];
      acc[dep.category]!.push(dep.name);
      return acc;
    }, {} as Record<string, string[]>);

    const depSummary = Object.entries(depsByCategory)
      .map(([category, deps]) => `  • ${category}: ${deps.slice(0, 3).join(', ')}`)
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
- Source files: ${projectInfo.structure.sourceFiles.slice(0, 8).join(', ')}
- Config files: ${projectInfo.structure.configFiles.join(', ')}
- Important files: ${projectInfo.structure.importantFiles.slice(0, 5).join(', ')}

**Directory Layout:**
${projectInfo.structure.directories.slice(0, 6).map(dir => `- ${dir}`).join('\n')}

**Recommended Adventure Focus Areas:**
${this.getRecommendedAdventureFocus(projectInfo)}`;
  }

  /**
   * Get recommended adventure focus areas based on project analysis
   */
  private getRecommendedAdventureFocus(projectInfo: ProjectInfo): string {
    const focusAreas = [];
    
    // Always include architecture overview for entry points
    if (projectInfo.codeAnalysis.entryPoints.length > 0) {
      focusAreas.push('• Architecture Overview - Explore main entry points and system flow');
    }
    
    // Configuration if config files exist
    if (projectInfo.structure.configFiles.length > 0) {
      focusAreas.push('• Configuration Setup - Understand project configuration and initialization');
    }
    
    // Core logic based on functions
    if (projectInfo.codeAnalysis.functions.length > 0) {
      focusAreas.push('• Core Logic - Dive into main business logic and key algorithms');
    }
    
    // Data layer if database present
    if (projectInfo.hasDatabase) {
      focusAreas.push('• Data Management - Explore database integration and data flow');
    }
    
    // API layer if APIs detected
    if (projectInfo.hasApi) {
      focusAreas.push('• API Interface - Understand external communication and endpoints');
    }
    
    // Frontend if present
    if (projectInfo.hasFrontend) {
      focusAreas.push('• User Interface - Explore frontend components and user interactions');
    }
    
    // Testing if present
    if (projectInfo.hasTests) {
      focusAreas.push('• Quality Assurance - Review testing strategies and quality measures');
    }
    
    // Dependencies if significant
    if (projectInfo.codeAnalysis.dependencies.length > 5) {
      focusAreas.push('• Dependency Network - Understand external libraries and integrations');
    }
    
    return focusAreas.length > 0 ? focusAreas.join('\n') : '• General Code Exploration - Basic project structure and patterns';
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
    const codeSnippetsText = content.codeSnippets.length > 0 
      ? `\n\n**📜 Code Discoveries:**\n${content.codeSnippets.map(snippet => 
          `**${snippet.file}:**\n\`\`\`\n${snippet.snippet}\n\`\`\`\n*${snippet.explanation}*`
        ).join('\n\n')}`
      : '';

    const hintsText = content.hints.length > 0 
      ? `\n\n**💡 Helpful Hints:**\n${content.hints.map(hint => `• ${hint}`).join('\n')}`
      : '';

    return `${content.adventure}${codeSnippetsText}${hintsText}\n\n---\n\n${completionSummary}`;
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

  /**
   * Fallback story generation when LLM fails
   */
  private generateFallbackStory(projectInfo: ProjectInfo, theme: AdventureTheme): StoryResponse {
    const emoji = THEME_EMOJIS[theme] || '✨';

    return {
      story: `${emoji} Welcome to your ${theme} code adventure! This ${projectInfo.type} project contains ${projectInfo.fileCount} files using ${projectInfo.mainTechnologies.join(', ')}. Let's explore it together through an engaging ${theme} journey!`,
      adventures: [
        {
          id: 'main-exploration',
          title: 'Main Code Exploration',
          description: 'Explore the core functionality and architecture',
          codeFiles: projectInfo.codeAnalysis.entryPoints
        },
        {
          id: 'config-adventure',
          title: 'Configuration Quest',
          description: 'Discover how the project is configured and set up',
          codeFiles: projectInfo.structure.configFiles
        }
      ]
    };
  }

  /**
   * Fallback adventure content when LLM fails
   */
  private generateFallbackAdventureContent(adventure: Adventure): AdventureContent {
    return {
      adventure: `You embark on the "${adventure.title}" adventure. ${adventure.description}. This is an important part of understanding how the system works.`,
      codeSnippets: [],
      hints: [
        'Explore the code structure to understand the patterns used',
        'Look for connections between different parts of the system'
      ]
    };
  }
}