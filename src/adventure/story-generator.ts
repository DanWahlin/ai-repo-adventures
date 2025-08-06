import type { ProjectInfo } from '../shared/types.js';
import { AdventureTheme, CustomThemeData } from '../shared/theme.js';
import { LLM_REQUEST_TIMEOUT, DEFAULT_THEME } from '../shared/config.js';
import { isValidTheme, THEMES } from '../shared/theme.js';
import { LLMClient } from '../llm/llm-client.js';
import { loadAdventureConfig, formatConfigForPrompt, extractHighlightsForFiles, type AdventureConfig } from '../shared/adventure-config.js';

export interface Adventure {
  id: string;
  title: string;
  description: string;
  codeFiles?: string[];
}

export interface Story {
  content: string;
  theme: AdventureTheme;
  setting: string;
}

export interface StoryResponse {
  story: string | Story;
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

// Internal interfaces for validation
interface ParsedStoryResponse {
  story: string;
  adventures: ParsedAdventure[];
}

interface ParsedAdventure {
  id: string;
  title: string;
  description: string;
  codeFiles?: string[];
}

interface ParsedAdventureContent {
  adventure: string;
  fileExploration?: string;
  codeSnippets: ParsedCodeSnippet[];
  hints: string[];
}

interface ParsedCodeSnippet {
  file: string;
  snippet: string;
  explanation: string;
}

// Export story themes for backward compatibility with tests
export const STORY_THEMES = {
  SPACE: THEMES.SPACE.key,
  MYTHICAL: THEMES.MYTHICAL.key,
  ANCIENT: THEMES.ANCIENT.key
} as const;

export type StoryTheme = AdventureTheme;

/**
 * Consolidated StoryGenerator - Combines the best of both implementations
 * - JSON-based LLM responses for reliability
 * - Fallback templates when LLM is unavailable
 * - Adventure path generation for smart exploration
 * - Clean, maintainable code structure
 */
export class StoryGenerator {
  private llmClient: LLMClient;
  private currentProject?: ProjectInfo;
  private customThemeData?: CustomThemeData;
  private adventureConfig?: AdventureConfig | null;

  constructor() {
    this.llmClient = new LLMClient();
  }

  /**
   * Set the current project for story generation
   */
  setProject(projectInfo: ProjectInfo): void {
    this.currentProject = projectInfo;
  }

  /**
   * Set custom theme data for custom theme stories
   */
  setCustomTheme(customThemeData: CustomThemeData): void {
    this.customThemeData = customThemeData;
  }

  /**
   * Generate the initial story and adventures using LLM
   */
  async generateStoryAndAdventures(projectInfo: ProjectInfo, theme: AdventureTheme, projectPath?: string): Promise<StoryResponse> {
    this.currentProject = projectInfo;
    
    // Load adventure config if projectPath is provided
    if (projectPath) {
      this.adventureConfig = loadAdventureConfig(projectPath);
    }
    
    const validatedTheme = this.validateTheme(theme);
    return await this.generateWithLLM(projectInfo, validatedTheme);
  }

  /**
   * Generate story - for backward compatibility with tests
   * Maps to generateStoryAndAdventures but returns a Story object
   */
  async generateStory(theme: AdventureTheme): Promise<Story> {
    if (!this.currentProject) {
      throw new Error('No project information available. Please analyze a project first.');
    }

    const response = await this.generateStoryAndAdventures(this.currentProject, theme);
    
    // Convert StoryResponse to Story format for backward compatibility

    return {
      theme,
      content: typeof response.story === 'string' ? response.story : response.story.content,
      setting: `A ${theme}-themed exploration of your codebase`
    };
  }

  /**
   * Generate detailed adventure content using LLM
   */
  async generateAdventureContent(
    adventure: Adventure,
    theme: AdventureTheme,
    codeContent: string
  ): Promise<AdventureContent> {
    const prompt = this.buildAdventureContentPrompt(adventure, theme, codeContent);
    const response = await this.withTimeout(
      this.llmClient.generateResponse(prompt, { responseFormat: 'json_object' })
    );
    
    if (!response.content || response.content.trim() === '') {
      throw new Error('LLM returned empty response for adventure content');
    }
    
    let parsed;
    try {
      parsed = JSON.parse(response.content);
    } catch (error) {
      throw new Error(`Invalid JSON response from LLM for adventure content: ${error instanceof Error ? error.message : 'Unknown error'}. Response: ${response.content.substring(0, 200)}...`);
    }
    
    this.validateAdventureContent(parsed);
    return parsed;
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
    
    let themeDescription: string = theme;
    let vocabularyHint = '';
    
    if (theme === 'custom' && this.customThemeData) {
      themeDescription = this.customThemeData.name;
      vocabularyHint = `Use these custom theme keywords: ${this.customThemeData.keywords.join(', ')}`;
    } else if (theme === 'developer') {
      vocabularyHint = 'Use professional technical documentation language';
    } else {
      const vocabularyMap = {
        space: 'starship/mission/cosmic terms',
        mythical: 'kingdom/quest/heroic terms',
        ancient: 'temple/wisdom/sacred terms'
      } as const;
      vocabularyHint = `Use ${vocabularyMap[theme as keyof typeof vocabularyMap] || 'appropriate theme terms'}`;
    }
    
    const prompt = `Generate a ${themeDescription}-themed completion celebration for: "${adventure.title}"

**Context:**
- Adventure completed: ${adventure.title}
- Progress: ${progress}/${total} adventures (${percentComplete}% complete)
- Theme: ${themeDescription}

**Requirements:**
- Write 1 sentence using ${themeDescription} terminology
- Celebrate the specific learning achievement
- Use encouraging, triumphant tone
- ${vocabularyHint}

Generate ONLY the celebration message, no extra text.`;

    const response = await this.llmClient.generateResponse(prompt);
    return response.content.trim();
  }

  // ============= Private Methods =============

  /**
   * Generate with LLM
   */
  private async generateWithLLM(projectInfo: ProjectInfo, theme: AdventureTheme): Promise<StoryResponse> {
    const prompt = this.buildStoryGenerationPrompt(projectInfo, theme);

    const response = await this.withTimeout(
      this.llmClient.generateResponse(prompt, { responseFormat: 'json_object' })
    );
    
    if (!response.content || response.content.trim() === '') {
      throw new Error('LLM returned empty response');
    }
    
    let parsed;
    try {
      parsed = JSON.parse(response.content);
    } catch (error) {
      throw new Error(`Invalid JSON response from LLM: ${error instanceof Error ? error.message : 'Unknown error'}. Response: ${response.content.substring(0, 200)}...`);
    }
    
    this.validateStoryResponse(parsed);
    return parsed;
  }





  /**
   * Build story generation prompt with repomix content
   */
  private buildStoryGenerationPrompt(projectInfo: ProjectInfo, theme: AdventureTheme): string {
    const repomixContent = projectInfo.repomixContent || 'No repomix content available';
    const themeGuidelines = this.getThemeGuidelines(theme);
    
    // Add adventure config guidance if available
    const adventureGuidance = this.adventureConfig 
      ? `\n## Adventure Guidance (Technical Reference Only)
The following predefined adventure structure identifies important code areas to explore:

${formatConfigForPrompt(this.adventureConfig)}

IMPORTANT: DO NOT use these titles or descriptions literally! They are technical references only.
You MUST transform them into ${theme}-themed adventures:
- "Core Server" → Space: "Command Bridge Protocol Systems" / Medieval: "Castle's Command Tower" 
- "File Management" → Space: "Navigation & Mission Control" / Medieval: "Quest Chronicles Hall"

Use the file paths and function highlights to understand what code areas to focus on,
but CREATE NEW themed titles and descriptions that fit the ${theme} narrative.\n`
      : '';
    
    return `You are a technical education specialist creating story-based workshops that provide immersive code exploration experiences.
Transform this codebase into an engaging ${theme}-themed narrative that weaves project details into the story.

## Complete Codebase
${repomixContent}${adventureGuidance}

${themeGuidelines}

## Critical Instructions
1. First, ANALYZE the repomix content above to INFER what type of project this is (e.g., "Web Application", "API Service", "CLI Tool", "Library", "Mobile App", "Game", "Data Pipeline", etc.) - be specific and descriptive
2. Create a ${theme}-themed narrative that INTEGRATES the project details naturally into the story
3. **CRITICAL: ONLY reference files that actually exist in the "## Complete Codebase" content above.** 
   Look for "## File:" headers to identify real files.
4. **DO NOT invent, create, or hallucinate any file names.** If you reference a file, it MUST appear in the "## File:" sections above.
5. The story should be 1-2 paragraphs (75-100 words max) that tells a cohesive narrative
6. Reference actual technologies, patterns, and concepts from the real code, but avoid specific file names unless absolutely certain they exist in the repomix content
7. Make the reader understand what this specific codebase does through the narrative
8. End with "🗺️ **Your Quest Awaits** - Choose your path wisely, brave adventurer!"

## CRITICAL Story Integration Requirements
**STRUCTURE TEMPLATE ONLY - DO NOT COPY ANY TEXT:**
"In the vast expanse of the digital cosmos, a starship known as the *MCP Odyssey* embarks on a mission to explore and map uncharted systems of code. This state-of-the-art vessel, powered by TypeScript reactors and navigated by the Model Context Protocol, has a singular purpose: to transform sprawling codebases into coherent constellations of understanding. The crew, equipped with advanced LLM-assisted tools, must decode the mysteries of the *Adventure System*..."

⚠️ **CRITICAL: This is ONLY a structural template showing the integration pattern. DO NOT copy any phrases, words, or concepts. Create completely original content that follows the same integration approach but uses entirely different vocabulary, metaphors, and narrative elements.**

**WHAT MAKES THIS EXCELLENT:**
1. **Specific Technology Integration**: "TypeScript reactors", "Model Context Protocol", "LLM-assisted tools"
2. **Purpose Clarity**: "transform sprawling codebases into coherent constellations" (explains what the app does)
3. **Named Vessel**: "*MCP Odyssey*" (creative name tied to the actual tech stack)
4. **Mission Focus**: Clear goal that matches the actual codebase purpose

**YOUR STORY MUST BE COMPLETELY ORIGINAL:**
- Give the ${theme === 'space' ? 'starship/vessel' : theme === 'mythical' ? 'kingdom/realm' : theme === 'ancient' ? 'temple/civilization' : 'system'} a UNIQUE creative name that reflects the actual project (NOT "MCP Odyssey" or similar)
- Mention 3-4 actual technologies from the repomix content as ${theme} elements using YOUR OWN creative metaphors (NOT "reactors", "constellations", etc.)
- Clearly explain the project's real purpose through the ${theme} narrative using FRESH language and imagery
- Create a specific ${theme === 'space' ? 'mission' : theme === 'mythical' ? 'quest' : theme === 'ancient' ? 'discovery' : 'objective'} that mirrors what the codebase actually accomplishes with ORIGINAL phrasing
- Use italics for the main ${theme === 'space' ? 'vessel' : theme === 'mythical' ? 'kingdom' : theme === 'ancient' ? 'temple' : 'system'} name and key systems

🚫 **FORBIDDEN:** DO NOT use any phrases from the template like "vast expanse", "digital cosmos", "embarks on a mission", "coherent constellations", "decode the mysteries", etc. Create entirely new metaphors and descriptions.

## Adventures as Interactive Quests
CRITICAL: Adventures must form a cohesive narrative progression, like interconnected quests:
- Quest 1 should introduce the setting and begin the interactive journey
- Each subsequent quest should build on previous discoveries
- Quests should tell a progressive story while allowing choice and exploration
- The final quest should provide resolution or mastery achievement
- **DESCRIPTION REQUIREMENT: Each quest description MUST be exactly 1 sentence - concise and focused**

## Response Format
Return a valid JSON object:
{
  "story": "Integrated narrative that sets up an interactive quest-based journey through the codebase",
  "adventures": [
    {
      "id": "quest-1",
      "title": "Quest 1: [Theme-appropriate beginning title]",
      "description": "1 sentence max describing the core focus",
      "codeFiles": ["ONLY-files-that-appear-in-'## Complete Codebase' above"]
    },
    {
      "id": "quest-2", 
      "title": "Quest 2: [Progressive story continuation]",
      "description": "1 sentence max describing the core focus",
      "codeFiles": ["relevant-files"]
    }
  ]
}

**Important for codeFiles arrays:**
- ONLY include file paths that appear as "## File: path/filename" in the repomix content above
- Double-check each file path exists in the ## Complete Codebase content before including it
- It's better to have empty codeFiles arrays than incorrect file paths
- Use the exact file path as shown in the "## File:" headers from ## Complete Codebase
- **PRIORITIZE core files**: Choose core application files over utility/support files
- **Preferred file types for adventures**: main server files, core business logic, API endpoints, application entry points, key algorithms
- **Less preferred for adventures**: configuration files, utility classes, cache implementations, error handlers, type definitions

**Final Validation Step:**
Before returning your response, review your story and codeFiles arrays to ensure:
1. No file names are mentioned in the story unless they appear in "## File:" headers in ## Complete Codebase
2. All codeFiles entries match exactly with "## File:" headers in ## Complete Codebase
3. When in doubt, omit specific file references and focus on general concepts instead

**File Selection Strategy:**
- ✅ PREFER: Files that implement core business logic, main application flow, user-facing functionality
- ❌ AVOID: Files in /shared/, /utils/, /helpers/ directories, files with names like cache, config, error, types, constants

Create 3-5 chapter-like adventures that form a complete narrative arc:
- Begin with discovery/arrival (Chapter 1)
- Build through exploration and challenges (Chapters 2-3)
- Culminate in mastery or achievement (Final Chapter)
Each chapter should flow naturally into the next, creating a cohesive story journey through the codebase.`;
  }

  /**
   * Build adventure content prompt
   */
  private buildAdventureContentPrompt(
    adventure: Adventure,
    theme: AdventureTheme,
    codeContent: string
  ): string {
    const themeGuidelines = this.getThemeGuidelines(theme);
    
    // Find matching adventure config and extract highlights
    let workshopHighlights = '';
    if (this.adventureConfig && adventure.codeFiles) {
      const highlights = extractHighlightsForFiles(this.adventureConfig, adventure.title, adventure.codeFiles);
      if (highlights.length > 0) {
        workshopHighlights = `\n## Workshop Highlights (Technical Reference Only)
These are the technical functions to explore - but present them in ${theme} terms:

${highlights.map(h => `- **${h.name}**: ${h.description}`).join('\n')}

IMPORTANT: Do NOT mention these function names directly in your narrative! Instead, create the themed
narrative around these concepts. You can include the actual file or function name in parentheses next to
the appropriate place in the story/narrative.

Instead, describe them using ${theme}-appropriate metaphors:
- Constructor → Space: "Ship initialization sequence" / Medieval: "Castle foundation ritual"
- Handler → Space: "Communication protocol" / Medieval: "Message courier system"
Transform the technical concepts into your themed story while exploring the actual code.
`;
      }
    }
    
    return `Continue the ${theme}-themed narrative journey for: "${adventure.title}"

IMPORTANT: This is a chapter in an ongoing story. Maintain narrative continuity:
- Reference events from previous chapters if applicable
- Advance the overall story arc
- Build toward the journey's resolution
- Keep the narrative voice consistent

${themeGuidelines}

## Complete Codebase
${codeContent}${workshopHighlights}

## CRITICAL: Code Authenticity Requirements
- Use ONLY the code provided in the "## Complete Codebase" section above
- DO NOT create, modify, or invent any code examples
- If no code is available, say "No code available for this file"
- Show actual imports, actual function names, actual technologies from the files

## Real-World Analogy Guidelines
For code snippet explanations, use relatable analogies:
- Functions → Restaurant recipes, factory assembly lines, or instruction manuals
- Classes → Blueprints, templates, or cookie cutters
- APIs → Restaurant menus, hotel front desks, or customer service counters
- Event handlers → Doorbell systems, alarm clocks, or notification services
- Data structures → Filing cabinets, toolboxes, or organizational systems
- Always connect the analogy back to the specific code being shown

## Response Format (JSON)
{
  "adventure": "1 paragraph (75-100 words) continuing the themed narrative story only - keep brief",
  "fileExploration": "2-3 paragraphs (200-300 words) providing thorough walkthrough of code concepts, specific tasks, and technical exploration details",
  "codeSnippets": [
    {
      "file": "filename",
      "snippet": "EXACT code from the files provided above - DO NOT invent or modify code",
      "explanation": "Start with a real-world analogy (like 'This is like a restaurant menu that...'), then explain the actual code and how the analogy relates"
    }
  ],
  "hints": ["Practical tip", "Next steps"]
}`;
  }



  /**
   * Validate story response structure
   */
  private validateStoryResponse(parsed: unknown): parsed is ParsedStoryResponse {
    const candidate = parsed as ParsedStoryResponse;
    
    if (!candidate.story || typeof candidate.story !== 'string') {
      throw new Error('Invalid response: missing or invalid story field');
    }
    
    if (!Array.isArray(candidate.adventures)) {
      throw new Error('Invalid response: adventures must be an array');
    }
    
    candidate.adventures.forEach((adventure, i: number) => {
      if (!adventure.id || !adventure.title || !adventure.description) {
        throw new Error(`Invalid adventure at index ${i}: missing required fields`);
      }
    });
    
    return true;
  }

  /**
   * Validate adventure content structure
   */
  private validateAdventureContent(parsed: unknown): parsed is ParsedAdventureContent {
    const candidate = parsed as ParsedAdventureContent;
    
    if (!candidate.adventure || typeof candidate.adventure !== 'string') {
      throw new Error('Invalid content: missing adventure field');
    }
    
    if (!Array.isArray(candidate.hints)) {
      throw new Error('Invalid content: hints must be an array');
    }
    
    if (!Array.isArray(candidate.codeSnippets)) {
      candidate.codeSnippets = [];
    }
    
    return true;
  }

  /**
   * Helper to wrap promises with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number = LLM_REQUEST_TIMEOUT): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Validate and normalize theme
   */
  private validateTheme(theme: AdventureTheme): AdventureTheme {
    if (!isValidTheme(theme)) {
      console.warn(`Invalid theme '${theme}', defaulting to ${DEFAULT_THEME}`);
      return DEFAULT_THEME;
    }
    return theme;
  }






  /**
   * Get theme-specific guidelines for story generation
   */
  private getThemeGuidelines(theme: AdventureTheme): string {
    const themeGuidelinesMap = {
      space: {
        vocabulary: 'starship/mission/nebula/cosmic/navigation/crew/galaxy/stellar/orbit/command/exploration terms',
        restriction: '(space ships, galaxies, planets, aliens, astronauts - NOT kingdoms or magic or temples)',
        style: 'Create exciting space exploration narratives with technical missions'
      },
      mythical: {
        vocabulary: 'kingdom/quest/heroic/castle/knight/magic/mythical/mystic/spells/enchanted/dragon terms',
        restriction: '(castles, knights, magic, mythical creatures, spells - NOT space ships or ancient temples)',
        style: 'Create magical kingdom adventures with heroic quests'
      },
      ancient: {
        vocabulary: 'temple/wisdom/sacred/pyramid/jungle/ancient/archaeological/civilization/ritual/treasure terms',
        restriction: '(temples, pyramids, ancient wisdom - NOT space ships or mythical castles)',
        style: 'Create archaeological discoveries with ancient mysteries'
      },
      developer: {
        vocabulary: 'documentation/guide/tutorial/reference/best-practices/architecture/patterns/implementation terms',
        restriction: '(technical documentation style - NO fictional narratives or storytelling)',
        style: 'Write clear, professional technical documentation with practical examples'
      },
      custom: {
        vocabulary: 'user-defined theme vocabulary (will be provided separately)',
        restriction: '(use only the custom theme elements provided by the user)',
        style: 'Follow the custom theme guidelines provided by the user'
      }
    } as const;
    
    const guidelines = themeGuidelinesMap[theme as keyof typeof themeGuidelinesMap] || themeGuidelinesMap.space;
    
    if (theme === 'developer') {
      return `## Developer Documentation Guidelines

**DOCUMENTATION APPROACH:**
- Write in clear, professional technical documentation style
- Use headings, bullet points, and structured formatting
- Focus on practical implementation details and best practices
- Include code examples with explanations
- Avoid fictional narratives - keep it factual and educational
- Use terminology like: ${guidelines.vocabulary}

**Content Requirements:**
- Create comprehensive technical guides for each code area
- Each section should be like a chapter in technical documentation
- Use developer-friendly language and concepts
- Reference actual technologies, patterns, and architectural decisions
- Make the content educational and actionable
- IMPORTANT: ${guidelines.restriction}`;
    }

    if (theme === 'custom') {
      const customData = this.customThemeData;
      if (!customData) {
        throw new Error('Custom theme data not provided. Call setCustomTheme() before generating custom themed content.');
      }
      
      return `## Custom Theme Guidelines

**CUSTOM THEME: "${customData.name}"**
- Theme Description: ${customData.description}
- Keywords to use: ${customData.keywords.join(', ')}

**CUSTOM THEME APPROACH:**
- Use ONLY the custom theme vocabulary: ${customData.keywords.join(', ')}
- Stay strictly within the "${customData.name}" theme as described: ${customData.description}
- Create narratives that match the user's specified "${customData.name}" style
- Reference the custom theme elements consistently throughout the story
- Make the story align with the user's creative vision for "${customData.name}"
- IMPORTANT: Only use the custom theme elements - do not mix with other themes (space, mythical, ancient, etc.)`;
    }
    
    return `## Theme Guidelines

**${theme.toUpperCase()} THEME VOCABULARY:**
- Use ${guidelines.vocabulary}

**Story Requirements:**
- ${guidelines.style}
- Create an overarching narrative that connects all coding adventures
- Each adventure should feel like a chapter in the overall story
- Use ${theme} metaphors that make technical concepts intuitive
- Reference actual file names and technologies from the analysis
- Make the story educational but entertaining
- IMPORTANT: Stay strictly within the ${theme} theme - no mixing of themes!
  ${guidelines.restriction}`;
  }


}

// For backward compatibility with DynamicStoryGenerator usage
export { StoryGenerator as DynamicStoryGenerator };