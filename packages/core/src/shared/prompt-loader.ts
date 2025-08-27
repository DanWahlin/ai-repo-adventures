import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PROMPT_PATHS } from './config.js';
import { AdventureTheme, CustomThemeData } from './theme.js';

// Get the directory of this module, then go up to repo root
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

interface ThemeGuidelines {
  vocabulary: string;
  restriction: string;
  style: string;
}

interface ThemeGuidelinesMap {
  [key: string]: ThemeGuidelines;
}

/**
 * Load a prompt file directly
 */
function loadPromptFile(filePath: string): string {
  try {
    const fullPath = join(REPO_ROOT, filePath);
    const content = readFileSync(fullPath, 'utf-8');
    return content;
  } catch (error) {
    console.warn(`Failed to load prompt file ${filePath}, using fallback`);
    return getFallbackPrompt(filePath);
  }
}

/**
 * Load theme guidelines from JSON file
 */
function loadThemeGuidelines(): ThemeGuidelinesMap {
  try {
    const fullPath = join(REPO_ROOT, PROMPT_PATHS.THEME_GUIDELINES);
    const content = readFileSync(fullPath, 'utf-8');
    const guidelines = JSON.parse(content) as ThemeGuidelinesMap;
    return guidelines;
  } catch (error) {
    console.warn(`Failed to load theme guidelines, using fallback`);
    return getFallbackThemeGuidelines();
  }
}

/**
 * Replace template variables in a prompt
 */
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replaceAll(placeholder, value);
  }
  return result;
}

/**
 * Get theme-specific guidelines formatted for prompts
 */
function getThemeGuidelines(theme: AdventureTheme, customThemeData?: CustomThemeData): string {
  const themeGuidelinesMap = loadThemeGuidelines();
  const guidelines = themeGuidelinesMap[theme];

  if (!guidelines) {
    console.warn(`No guidelines found for theme ${theme}, using space theme`);
    return getThemeGuidelines('space');
  }

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

  if (theme === 'custom' && customThemeData) {
    return `## Custom Theme Guidelines

**CUSTOM THEME: "${customThemeData.name}"**
- Theme Description: ${customThemeData.description}
- Keywords to use: ${customThemeData.keywords.join(', ')}

**CUSTOM THEME APPROACH:**
- Use ONLY the custom theme vocabulary: ${customThemeData.keywords.join(', ')}
- Stay strictly within the "${customThemeData.name}" theme as described: ${customThemeData.description}
- Create narratives that match the user's specified "${customThemeData.name}" style
- Reference the custom theme elements consistently throughout the story
- Make the story align with the user's creative vision for "${customThemeData.name}"
- IMPORTANT: Only use the custom theme elements - do not mix with other themes (space, mythical, ancient, etc.)`;
  }

  return `## Theme Guidelines

**${theme.toUpperCase()} THEME VOCABULARY:**
- Use ${guidelines.vocabulary}

**Story Requirements:**
- ${guidelines.style}
- Create an overarching narrative that connects all coding quests
- Each adventure should feel like a chapter in the overall story
- Use ${theme} metaphors that make technical concepts intuitive
- Reference actual file names and technologies from the analysis
- Make the story educational but entertaining
- IMPORTANT: Stay strictly within the ${theme} theme - no mixing of themes!
  ${guidelines.restriction}`;
}

/**
 * Load and prepare the story generation prompt
 */
export function loadStoryGenerationPrompt(variables: {
  theme: AdventureTheme;
  repomixContent: string;
  adventureGuidance?: string;
  customThemeData?: CustomThemeData;
  customInstructions?: string;
}): string {
  const template = loadPromptFile(PROMPT_PATHS.STORY_GENERATION);
  const themeGuidelines = getThemeGuidelines(variables.theme, variables.customThemeData);
  
  const customInstructionsSection = variables.customInstructions 
    ? `\n## Custom Instructions\n${variables.customInstructions}\n`
    : '';

  return replaceTemplateVariables(template, {
    theme: variables.theme,
    repomixContent: variables.repomixContent,
    adventureGuidance: variables.adventureGuidance || '',
    themeGuidelines,
    customInstructions: customInstructionsSection
  });
}

/**
 * Load and prepare the quest content prompt
 */
export function loadQuestContentPrompt(variables: {
  theme: AdventureTheme;
  adventureTitle: string;
  codeContent: string;
  storyContent?: string;
  adventureGuidance?: string;
  customThemeData?: CustomThemeData;
  customInstructions?: string;
  questPosition?: number;
  totalQuests?: number;
}): string {
  const template = loadPromptFile(PROMPT_PATHS.QUEST_CONTENT);
  const themeGuidelines = getThemeGuidelines(variables.theme, variables.customThemeData);
  
  const customInstructionsSection = variables.customInstructions 
    ? `\n## Custom Instructions\n${variables.customInstructions}\n`
    : '';

  return replaceTemplateVariables(template, {
    theme: variables.theme,
    adventureTitle: variables.adventureTitle,
    codeContent: variables.codeContent,
    storyContent: variables.storyContent || 'No story context provided.',
    adventureGuidance: variables.adventureGuidance || '',
    themeGuidelines,
    customInstructions: customInstructionsSection,
    questPosition: variables.questPosition?.toString() || '1',
    totalQuests: variables.totalQuests?.toString() || '1'
  });
}

/**
 * Load and prepare the completion prompt
 */
export function loadCompletionPrompt(variables: {
  themeDescription: string;
  adventureTitle: string;
  progress: number;
  total: number;
  percentComplete: number;
  vocabularyHint: string;
}): string {
  const template = loadPromptFile(PROMPT_PATHS.COMPLETION);
  
  return replaceTemplateVariables(template, {
    themeDescription: variables.themeDescription,
    adventureTitle: variables.adventureTitle,
    progress: variables.progress.toString(),
    total: variables.total.toString(),
    percentComplete: variables.percentComplete.toString(),
    vocabularyHint: variables.vocabularyHint
  });
}

/**
 * Fallback prompts in case files can't be loaded
 */
function getFallbackPrompt(filePath: string): string {
  if (filePath.includes('story-generation')) {
    return 'Transform this codebase into an engaging {{theme}}-themed narrative.\n\n{{repomixContent}}\n\n{{themeGuidelines}}';
  }
  if (filePath.includes('quest-content')) {
    return 'Continue the {{theme}}-themed narrative journey for: "{{adventureTitle}}"\n\n{{codeContent}}';
  }
  if (filePath.includes('completion')) {
    return 'Generate a {{themeDescription}}-themed completion celebration for: "{{adventureTitle}}"';
  }
  return 'Fallback prompt content';
}

function getFallbackThemeGuidelines(): ThemeGuidelinesMap {
  return {
    space: {
      vocabulary: 'starship/mission/cosmic/galaxy terms',
      restriction: '(space themes only)',
      style: 'Create space exploration narratives'
    },
    mythical: {
      vocabulary: 'kingdom/quest/magic/castle terms', 
      restriction: '(mythical themes only)',
      style: 'Create magical kingdom quests'
    },
    ancient: {
      vocabulary: 'temple/wisdom/ancient/pyramid terms',
      restriction: '(ancient themes only)', 
      style: 'Create archaeological discoveries'
    },
    developer: {
      vocabulary: 'documentation/technical terms',
      restriction: '(technical documentation only)',
      style: 'Write technical documentation'
    },
    custom: {
      vocabulary: 'user-defined vocabulary',
      restriction: '(custom theme only)',
      style: 'Follow custom theme guidelines'
    }
  };
}