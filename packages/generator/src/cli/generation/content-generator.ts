import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { AdventureManager } from '@codewithdan/ai-repo-adventures-core/adventure';
import { parseAdventureConfig } from '@codewithdan/ai-repo-adventures-core/shared';
import { LLMClient } from '@codewithdan/ai-repo-adventures-core/llm';
import { HTMLBuilder } from './html-builder.js';
import { RETRY_CONFIG } from '../constants.js';

interface QuestInfo {
  id: string;
  title: string;
  filename: string;
}

/**
 * Handles content generation for quests and summaries
 * Note: This class only generates CONTENT, not formatted pages.
 * Page formatting is handled by format strategies.
 */
export class ContentGenerator {
  private adventureManager: AdventureManager;
  private htmlBuilder: HTMLBuilder;
  private projectPath: string;
  private outputDir: string;
  private selectedTheme: string;
  private quests: QuestInfo[];
  private isMultiTheme: boolean;
  private saveLlmOutputFn: (filename: string, content: string) => void;
  private questContentsMap?: Map<string, string>;

  constructor(
    adventureManager: AdventureManager,
    htmlBuilder: HTMLBuilder,
    projectPath: string,
    outputDir: string,
    selectedTheme: string,
    quests: QuestInfo[],
    isMultiTheme: boolean,
    saveLlmOutputFn: (filename: string, content: string) => void,
    questContentsMap?: Map<string, string>
  ) {
    this.adventureManager = adventureManager;
    this.htmlBuilder = htmlBuilder;
    this.projectPath = projectPath;
    this.outputDir = outputDir;
    this.selectedTheme = selectedTheme;
    this.quests = quests;
    this.isMultiTheme = isMultiTheme;
    this.saveLlmOutputFn = saveLlmOutputFn;
    this.questContentsMap = questContentsMap;
  }

  /**
   * Generate quest content (LLM narratives) and store in map
   * This does NOT generate formatted pages - that's done by format strategies
   */
  async generateQuestContent(): Promise<void> {
    const questsToGenerate = this.quests.length;

    for (let i = 0; i < questsToGenerate; i++) {
      const quest = this.quests[i];
      if (!quest) continue;

      console.log(chalk.dim(`  📖 Generating quest content ${i + 1}/${questsToGenerate} [${this.selectedTheme}]: ${quest.title}`));

      try {
        const questContent = await this.generateQuestContentWithRetry(quest.id);

        // Store quest content in map (required for all format strategies)
        if (this.questContentsMap) {
          this.questContentsMap.set(quest.id, questContent);
        }

        // Save quest content if logging is enabled (unique file per quest)
        this.saveLlmOutputFn(`quest-${quest.id}.output.md`, questContent);

      } catch (error) {
        console.log(chalk.red(`    ❌ Failed to generate quest content [${this.selectedTheme}]: ${quest.title}`));

        // Fail-fast strategy: If we're in multi-theme mode and a quest fails,
        // throw an error to trigger sequential mode
        if (this.isMultiTheme) {
          throw new Error(`Quest generation failed for ${quest.title} in ${this.selectedTheme} theme. Switching to sequential mode for consistency.`);
        }

        // Store placeholder content for failed quests
        if (this.questContentsMap) {
          this.questContentsMap.set(quest.id, 'Quest content could not be generated.');
        }
      }
    }
  }

  /**
   * Generate quest content with retry logic
   */
  private async generateQuestContentWithRetry(questId: string, maxRetries: number = RETRY_CONFIG.MAX_QUEST_RETRIES): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.adventureManager.exploreQuest(questId);
        return result.narrative;
      } catch (error) {
        console.log(chalk.yellow(`    ⚠️  Attempt ${attempt}/${maxRetries} failed, retrying...`));
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.RETRY_DELAY_MS));
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Generate key concepts for the summary page
   */
  async generateKeyConcepts(): Promise<string> {
    try {
      // Load adventure configuration to understand project structure
      const config = parseAdventureConfig(this.projectPath);

      if (!config || typeof config !== 'object' || !('adventure' in config)) {
        // Fallback to hardcoded concepts if no config available
        return this.generateFallbackKeyConcepts();
      }

      const adventure = (config as any).adventure;
      if (!adventure || !adventure.quests) {
        return this.generateFallbackKeyConcepts();
      }

      // Extract quest titles and descriptions for analysis
      const questInfo = adventure.quests.map((quest: any) => ({
        title: quest.title,
        description: quest.description,
        files: quest.files?.map((file: any) => ({
          path: file.path,
          description: file.description
        })) || []
      }));

      const projectName = adventure.name || 'Project';
      const projectDescription = adventure.description || '';

      // Create prompt for LLM to generate key concepts
      const prompt = `Based on the following project information, generate 4-5 key architectural or technical concepts that users would learn from exploring this codebase. Focus on the most important technical aspects and patterns.

Project: ${projectName}
Description: ${projectDescription}

Quest Information:
${questInfo.map((quest: any) =>
  `- ${quest.title}: ${quest.description}\n  Files: ${quest.files.map((f: any) => `${f.path} (${f.description})`).join(', ')}`
).join('\n')}

Format your response as a JSON object with a "concepts" array:
{
  "concepts": [
    {"name": "Concept Name", "description": "Brief description of what was learned"},
    {"name": "Another Concept", "description": "Another brief description"}
  ]
}

Focus on architectural patterns, technical systems, frameworks, and development practices actually present in the codebase.`;

      // Generate concepts using LLM
      const llmClient = new LLMClient();
      const llmResponse = await llmClient.generateResponse(prompt, { responseFormat: 'json_object' });
      const parsed = JSON.parse(llmResponse.content);
      const concepts = parsed.concepts;

      if (Array.isArray(concepts) && concepts.length > 0) {
        return `<ul>\n${concepts.map((concept: any) =>
          `<li><strong>${concept.name}</strong>: ${concept.description}</li>`
        ).join('\n')}\n</ul>`;
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  LLM concept generation failed, using fallback concepts'));
      console.log(chalk.dim(`Error: ${error}`));
    }

    // Fallback to original hardcoded concepts
    return this.generateFallbackKeyConcepts();
  }

  /**
   * Generate fallback key concepts when LLM generation fails
   */
  private generateFallbackKeyConcepts(): string {
    const concepts = [
      '<strong>MCP Server Architecture</strong>: Dynamic tool registration, schema validation, and request handling patterns',
      '<strong>Tool Orchestration</strong>: How individual tools are dynamically loaded, validated, and executed safely',
      '<strong>Error Handling & Reliability</strong>: Graceful shutdown procedures, signal handling, and promise rejection management',
      '<strong>Performance Optimization</strong>: Content pre-generation and caching strategies for responsive user experiences'
    ];

    if (this.quests.length > 1) {
      concepts.push('<strong>Adventure Generation</strong>: Story creation, theme management, and quest progression systems');
    }

    return `<ul>\n${concepts.map(concept => `<li>${concept}</li>`).join('\n')}\n</ul>`;
  }
}
