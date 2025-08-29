# Quest 2: Quest Generation Engine
---
The Quest Generation Engine is the heart of the system, responsible for crafting dynamic, developer-themed adventures. By leveraging structured analysis of codebases, it offers tailored narratives, quests, and techniques for skill-building. In this quest, we delve into the specific mechanisms that generate, configure, and adapt quests based on the codebase structure. The files examined here define key aspects of quest initialization, story generation, and configuration management.

## Quest Objectives
As you explore the code, investigate these key questions:
- 🔍 **Engine Initialization**: How are adventures initialized with dynamic themes, quests, and project contexts?
- ⚡ **Story Creation**: What patterns and validation mechanisms ensure quests align with project themes and available code files?
- 🛡️ **Config Integration**: How does the engine load, format, and apply configurations like `adventure.config.json`?

## File Exploration
### `packages/core/src/adventure/adventure-manager.ts`: Adventure initialization and quest management
The `AdventureManager` class handles the creation and execution of quests. Its methods define how the system initializes adventures, validates choices, and adapts quests based on user interactions.

#### Highlights
- `initializeAdventure`: Resets the system, loads the project context, and generates initial quests.
- `exploreQuest`: Executes a selected quest by interfacing with the state for cached or newly generated content.
- `generateQuestContent`: Builds quest-specific code exploration content, integrating relevant code files.
- `progressPercentage`: Calculates progress based on completed quests.

## Code
### `packages/core/src/adventure/adventure-manager.ts`
```typescript
async initializeAdventure(
  projectInfo: ProjectInfo, 
  theme: AdventureTheme, 
  projectPath?: string,
  customThemeData?: CustomThemeData
): Promise<string> {
  this.state.reset();
  this.state.projectInfo = projectInfo;
  this.state.currentTheme = theme;
  this.state.projectPath = projectPath || process.cwd();
  
  if (theme === 'custom' && customThemeData) {
    this.storyGenerator.setCustomTheme(customThemeData);
  }

  const storyResponse = await this.storyGenerator.generateStoryAndQuests(projectInfo, theme, this.state.projectPath);
  
  this.state.title = storyResponse.title;
  this.state.story = storyResponse.story;
  
  this.state.quests = this.mergeQuestFilesFromConfig(storyResponse.quests, this.state.projectPath);
  this.state.quests = this.enforceConfigQuestCount(this.state.quests, this.state.projectPath);

  return this.formatStoryWithQuests({
    ...storyResponse,
    quests: this.state.quests
  });
}
```
- Resets the state for fresh adventures, ensuring a clean slate.
- Dynamically assigns themes via `customThemeData`.
- Integrates story and quests by invoking `StoryGenerator`.
- Enforces constraints set within `adventure.config.json`.

---

```typescript
async exploreQuest(choice: string): Promise<AdventureResult> {
  const sanitizedChoice = this.validateAndSanitizeChoice(choice);
  
  if (this.isProgressRequest(sanitizedChoice)) {
    return this.getProgress();
  }
  
  const quest = this.findQuest(sanitizedChoice);
  if (!quest) {
    return this.createNotFoundResult();
  }
  
  return await this.executeQuest(quest);
}
```
- Validates user input through `validateAndSanitizeChoice`.
- Handles progress requests or initiates the quest execution process.
- Falls back to a "quest not found" result for invalid choices.

---

```typescript
get progressPercentage(): number {
  return this.quests.length > 0 
    ? Math.round((this.completedQuests.size / this.state.quests.length) * 100)
    : 0;
}
```
- Calculates the percentage of completed quests dynamically.
- Provides feedback on system progress for both user experience and state management.

---

### `packages/core/src/adventure/story-generator.ts`: Creating dynamic quest content
The `StoryGenerator` centralizes the process of generating structured narratives and quests. It translates codebase analysis and configurations into customized adventures.

#### Highlights
- `generateStoryAndQuests`: Combines a project’s structure and selected theme to create stories and quests.
- `parseMarkdownToStoryResponse`: Parses markdown content into structured data.
- `generateQuestContent`: Produces fine-tuned quest exploration based on specific code files and themes.

### `packages/core/src/adventure/story-generator.ts`
```typescript
async generateStoryAndQuests(projectInfo: ProjectInfo, theme: AdventureTheme, projectPath?: string): Promise<StoryResponse> {
  const response = await this.withTimeout(
    this.llmClient.generateResponse(prompt, { maxTokens: LLM_MAX_TOKENS_STORY })
  );
  
  const parsed = parseMarkdownToStoryResponse(response.content);
  
  StoryResponseSchema.parse(parsed);
  this.currentStoryContent = parsed.story;

  return parsed;
}
```
- Validates the correctness of responses with `StoryResponseSchema`.
- Uses LLM-generated storytelling based on themes.
- Saves parsed stories for reuse in follow-up quest generation.

---

```typescript
function parseMarkdownToStoryResponse(markdownContent: string): StoryResponse {
  const tokens = marked.lexer(markdownContent);
  const title = extractTitle(tokens);
  let story = '';
  const quests: Quest[] = [];
  let currentQuest: Partial<Quest> = {};

  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 3) {
      if (currentQuest.title && currentQuest.description) {
        quests.push(createQuest(currentQuest, quests.length));
      }
      currentQuest = { title: token.text, description: '' };
    } else if (currentQuest.title && token.type === 'paragraph') {
      currentQuest.description += token.text + '\n\n';
    }
  }
  if (currentQuest.title) {
    quests.push(createQuest(currentQuest, quests.length));
  }

  return { title, story: story.trim(), quests };
}
```
- Parses markdown to extract titles, story sections, and quests.
- Implements structured tokens from a library like `marked`.

---

### `packages/core/src/shared/adventure-config.ts`: Managing configurations
This file contains utilities to load and parse the `adventure.config.json` file. It ensures quest generation remains consistent with project-specific setups.

#### Highlights
- `loadAdventureConfig`: Reads the raw content of the configuration file.
- `parseAdventureConfig`: Parses JSON and ensures it conforms to expectations.
- `formatAdventureConfigForPrompt`: Optimizes configuration data for theme-specific prompts.

### `packages/core/src/shared/adventure-config.ts`
```typescript
export function loadAdventureConfig(projectPath: string): string | null {
  const configPath = path.join(projectPath, ADVENTURE_CONFIG_FILE);
  return readFileIfExists(configPath);
}
```
- Ensures non-blocking behavior if the configuration file is missing.
- Enables flexibility in how quests are structured.

---

```typescript
export function parseAdventureConfig(projectPath: string): unknown | null {
  const raw = loadAdventureConfig(projectPath);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
```
- Handles unexpected parsing issues gracefully, avoiding application crashes.
- Validates and parses the `adventure.config.json` file.

---

```typescript
export function formatAdventureConfigForPrompt(projectPath: string): string {
  const adventure = parseAdventureConfig(projectPath);

  let formatted = `## Quest Structure\n`;
  adventure?.adventure?.quests?.forEach((quest: any) => {
    if (quest.title && Array.isArray(quest.files)) {
      formatted += `### ${quest.title}\nFiles: ${quest.files.map(f => f.path).join(', ')}\n\n`;
    }
  });

  return formatted;
}
```
- Produces a concise summary of quests and files.
- Helps contextualize adventure setup for LLM inputs.

---

## Helpful Hints
- Explore the relationship between `StoryGenerator` and `AdventureManager` to align narrative generation across user inputs.
- Pay attention to error handling in `adventure-config.ts` to understand how missing or invalid JSON is handled elegantly.
- Investigate how themes influence `generateStoryAndQuests` to provide dynamic user experiences.

---
Excellent work! Continue to the next quest to uncover more mysteries.

Achievement Unlocked: You’ve elegantly refactored creativity into the Quest Generation Engine—20% complete, your codebase now shines like a diamond in production! 🚀⚡💎