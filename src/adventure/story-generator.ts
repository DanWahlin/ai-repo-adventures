import type { ProjectInfo } from '../shared/types.js';
import { AdventureTheme } from '../shared/theme.js';
import { LLM_REQUEST_TIMEOUT, DEFAULT_THEME } from '../shared/config.js';
import { isValidTheme, THEMES } from '../shared/theme.js';
import { LLMClient } from '../llm/llm-client.js';

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
   * Generate the initial story and adventures using LLM
   */
  async generateStoryAndAdventures(projectInfo: ProjectInfo, theme: AdventureTheme): Promise<StoryResponse> {
    this.currentProject = projectInfo;
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
    
    const prompt = `Generate a ${theme}-themed completion celebration for: "${adventure.title}"

**Context:**
- Adventure completed: ${adventure.title}
- Progress: ${progress}/${total} adventures (${percentComplete}% complete)
- Theme: ${theme}

**Requirements:**
- Write 1-2 sentences using ${theme} terminology
- Celebrate the specific learning achievement
- Use encouraging, triumphant tone
- For space: use starship/mission/cosmic terms
- For mythical: use kingdom/quest/heroic terms  
- For ancient: use temple/wisdom/sacred terms

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
    
    return `You are a technical education specialist creating story-based workshops that provide immersive code exploration experiences.
Transform this codebase into an engaging ${theme}-themed narrative that weaves project details into the story.

## Complete Codebase
${repomixContent}

${themeGuidelines}

## Critical Instructions
1. First, ANALYZE the repomix content above to INFER what type of project this is (e.g., "Web Application", "API Service", "CLI Tool", "Library", "Mobile App", "Game", "Data Pipeline", etc.) - be specific and descriptive
2. Create a ${theme}-themed narrative that INTEGRATES the project details naturally into the story
3. **CRITICAL: ONLY reference files that actually exist in the "## Complete Codebase" content above.** 
   Look for "## File:" headers to identify real files.
4. **DO NOT invent, create, or hallucinate any file names.** If you reference a file, it MUST appear in the "## File:" sections above.
5. The story should be 2-3 paragraphs (250-350 words max) that tells a cohesive narrative
6. Reference actual technologies, patterns, and concepts from the real code, but avoid specific file names unless absolutely certain they exist in the repomix content
7. Make the reader understand what this specific codebase does through the narrative
8. End with "🗺️ **Your Mission Awaits** - Choose your path wisely, brave adventurer!"

## Example Integration Style: Example Only - DO NOT use this exact text
Instead of: "In a galaxy far away, starships travel..."
Write: "In the cosmic realm of [YOUR INFERRED PROJECT TYPE WITH A FUN TWIST TO THE NAME], the advanced Starship navigates through interconnected systems, powered by TypeScript and modern development practices. The ship's command center coordinates complex operations through well-structured modules and components..."

**AVOID mentioning specific file names unless you are 100% certain they exist in the repomix content above.**
**DO NOT copy the example text directly - use it as inspiration for your own narrative. Be creative!**

## Response Format
Return a valid JSON object:
{
  "story": "Integrated narrative that references actual project concepts but avoids specific file names unless certain they exist",
  "adventures": [
    {
      "id": "1",
      "title": "📍 Theme-appropriate title",
      "description": "One sentence explaining what this adventure covers",
      "codeFiles": ["ONLY-files-that-appear-in-'## Complete Codebase' above"]
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

Create 2-6 adventures based on the project complexity revealed in the ## Complete Codebase content.`;
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
    
    return `Continue the ${theme}-themed exploration for: "${adventure.title}"

${themeGuidelines}

## Complete Codebase
${codeContent}

## CRITICAL: Code Authenticity Requirements
- Use ONLY the code provided in the "## Complete Codebase" section above
- DO NOT create, modify, or invent any code examples
- If no code is available, say "No code available for this file"
- Show actual imports, actual function names, actual technologies from the files

## Response Format (JSON)
{
  "adventure": "1-2 paragraphs (max 150 words) continuing the narrative",
  "fileExploration": "Interactive quest section with specific tasks",
  "codeSnippets": [
    {
      "file": "filename",
      "snippet": "EXACT code from the files provided above - DO NOT invent or modify code",
      "explanation": "Clear explanation of the actual code shown"
    }
  ],
  "hints": ["Practical tip", "Next steps"]
}`;
  }



  /**
   * Validate story response structure
   */
  private validateStoryResponse(parsed: any): void {
    if (!parsed.story || typeof parsed.story !== 'string') {
      throw new Error('Invalid response: missing or invalid story field');
    }
    
    if (!Array.isArray(parsed.adventures)) {
      throw new Error('Invalid response: adventures must be an array');
    }
    
    parsed.adventures.forEach((adventure: any, i: number) => {
      if (!adventure.id || !adventure.title || !adventure.description) {
        throw new Error(`Invalid adventure at index ${i}: missing required fields`);
      }
    });
  }

  /**
   * Validate adventure content structure
   */
  private validateAdventureContent(parsed: any): void {
    if (!parsed.adventure || typeof parsed.adventure !== 'string') {
      throw new Error('Invalid content: missing adventure field');
    }
    
    if (!Array.isArray(parsed.hints)) {
      throw new Error('Invalid content: hints must be an array');
    }
    
    if (!Array.isArray(parsed.codeSnippets)) {
      parsed.codeSnippets = [];
    }
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
    const themeRestrictions = {
      space: '(space ships, galaxies, planets, aliens, astronauts - NOT kingdoms or magic)',
      mythical: '(castles, knights, magic, mythical creatures, spells - NOT space ships or ancient temples)',
      ancient: '(temples, pyramids, ancient wisdom - NOT space ships or mythical castles)'
    } as const;
    
    const restriction = themeRestrictions[theme as keyof typeof themeRestrictions] || themeRestrictions.space;
    
    return `## Theme Guidelines

**${theme.toUpperCase()} THEME VOCABULARY:**
- For space: use starship/mission/nebula/cosmic/navigation/crew/galaxy terms
- For mythical: use kingdom/quest/heroic/castle/knight/magic/mythical/mystic/spells terms
- For ancient: use temple/wisdom/sacred/pyramid/jungle/ancient terms

**Story Requirements:**
- Create an overarching narrative that connects all coding adventures
- Each adventure should feel like a chapter in the overall story
- Use ${theme} metaphors that make technical concepts intuitive
- Reference actual file names and technologies from the analysis
- Make the story educational but entertaining
- IMPORTANT: Stay strictly within the ${theme} theme - no mixing of themes!
  ${restriction}`;
  }


}

// For backward compatibility with DynamicStoryGenerator usage
export { StoryGenerator as DynamicStoryGenerator };