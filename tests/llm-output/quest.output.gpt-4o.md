# Quest 2: The Quest Generation Engine
---
This second quest delves into the critical components of the narrative construction pipeline responsible for transforming raw repository data into developer-themed adventures. By exploring core files, you will uncover how themes are integrated, stories are generated, and quests are dynamically structured based on user context.

## Quest Objectives
As you explore the code below, investigate these key questions:
- 🔍 **Theme Calibration**: How does the system validate and process different themes, including custom ones?
- ⚡ **Story Assembly**: What mechanisms are used to generate developer-themed stories and quests dynamically?
- 🛡️ **Progression Metrics**: How does the engine track quest progression and completion?

## File Exploration

### packages/core/src/adventure/adventure-manager.ts: Core adventure flow and state management
This file defines the backbone of the adventure system, managing user progress, theme configuration, and dynamic quest generation. Key highlights include initialization, user input validation, and quest execution using cached state. This file connects the user interface to the story generator while maintaining consistency across interactions.

#### Highlights
- `initializeAdventure`: Initializes the adventure by resetting state, setting project context, and invoking story generation.
- `exploreQuest`: Validates the user input for quest selection and executes the chosen quest with caching support.
- `progressPercentage`: Calculates and returns the percentage of completed quests.
  
## Code
### packages/core/src/adventure/adventure-manager.ts
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
- This method resets the adventure state, ensuring a clean slate for each new session.
- It uses the selected theme to configure the story generator, including custom themes when applicable.
- Story and quest generation rely on the `StoryGenerator`, which dynamically incorporates repository data and configuration files.

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
- User inputs for quest selection are validated and sanitized using strict parsing logic.
- The `isProgressRequest` method checks whether the user is requesting progress metrics.
- Quests are dynamically retrieved from stored or cached states, ensuring high responsiveness.

---

```typescript
get progressPercentage(): number {
  return this.quests.length > 0 
    ? Math.round((this.completedQuests.size / this.quests.length) * 100)
    : 0;
}
```
- Tracks overall adventure progress by comparing completed quests against total quests.
- Uses the `completedQuests` and `quests` data sets managed by the `AdventureState` class.

---

### packages/core/src/adventure/story-generator.ts: Dynamic story construction and customization
This file is responsible for generating the narrative and quests by leveraging user-selected themes and repository context. It interfaces with the LLM client for intelligent generation based on configurations and prompts.

#### Highlights
- `generateStoryAndQuests`: Generates a themed story and corresponding quests using the project's data and selected theme.
- `generateQuestContent`: Creates interactive quest content tailored to specific files and functions.
- `validateTheme`: Ensures the theme is valid, falling back to a default in case of errors.

## Code
### packages/core/src/adventure/story-generator.ts
```typescript
async generateStoryAndQuests(projectInfo: ProjectInfo, theme: AdventureTheme, projectPath?: string): Promise<StoryResponse> {
  this.currentProject = projectInfo;
  this.projectPath = projectPath;

  const validatedTheme = this.validateTheme(theme);
  return await this.generateWithLLM(projectInfo, validatedTheme);
}
```
- Combines repository data with a validated theme to generate structured stories and quest objects.
- Uses the helper method `generateWithLLM` for language model-driven content creation.

---

```typescript
async generateQuestContent(config: QuestGenerationConfig): Promise<QuestContent> {
  const { quest, theme, codeContent, questPosition, totalQuests } = config;

  if (this.projectPath) {
    const formattedConfig = formatAdventureConfigForPrompt(this.projectPath);
    const customInstructionsFromConfig = extractCustomInstructions(this.projectPath);
  }

  const prompt = loadQuestContentPrompt({
    theme,
    adventureTitle: quest.title,
    codeContent,
    storyContent: this.currentStoryContent || 'No story context available.',
    questPosition,
    totalQuests
  });

  const response = await this.withTimeout(
    this.llmClient.generateResponse(prompt, { maxTokens: LLM_MAX_TOKENS_QUEST })
  );

  return {
    adventure: response.content.trim(),
    fileExploration: '',
    codeSnippets: [],
    hints: []
  };
}
```
- Generates quest-specific narrative and guidance using formatted repository data and custom instructions.
- Ensures integration with the story's overall structure by incorporating `storyContent`.

---

```typescript
private validateTheme(theme: AdventureTheme): AdventureTheme {
  if (!isValidTheme(theme)) {
    console.warn(`Invalid theme '${theme}', defaulting to ${DEFAULT_THEME}`);
    return DEFAULT_THEME;
  }
  return theme;
}
```
- Ensures theme consistency by validating user-provided input against the pre-defined set of acceptable themes.
- Automatically falls back to a system-defined default theme when invalid input is detected.

---

### packages/core/src/shared/adventure-config.ts: Adventure configuration and file handling
This file provides methods to parse and format adventure configuration files, ensuring repository context alignment with story generation needs.

#### Highlights
- `parseAdventureConfig`: Parses the adventure configuration file and returns it as an object.
- `formatAdventureConfigForPrompt`: Formats configuration data for use as input to the story generation pipeline.
- `extractUniqueFilePaths`: Extracts and validates file paths referenced in the configuration.

## Code
### packages/core/src/shared/adventure-config.ts
```typescript
export function parseAdventureConfig(projectPath: string): unknown | null {
  const raw = loadAdventureConfig(projectPath);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
```
- Reads and parses the `adventure.config.json` file to provide critical data for quest generation.
- Handles errors gracefully, returning `null` for missing or malformed files.

---

```typescript
export function formatAdventureConfigForPrompt(projectPath: string): string {
  const parsed = parseAdventureConfig(projectPath);
  if (!parsed || typeof parsed !== 'object') {
    return '';
  }

  const adventure = (parsed as any).adventure;
  if (!adventure || !Array.isArray(adventure.quests)) {
    return '';
  }

  let formatted = `## Quest Structure\n`;

  for (const quest of adventure.quests) {
    if (!quest.title || !Array.isArray(quest.files)) continue;

    formatted += `### ${quest.title}\nFiles: ${quest.files.map((f: any) => f.path).filter(Boolean).join(', ')}\n`;
  }

  return formatted;
}
```
- Provides lightweight summaries of file paths and quest structures to integrate with prompts.
- Optimizes the narrative pipeline by reducing configuration redundancy.

---

```typescript
export function extractUniqueFilePaths(projectPath: string): string[] {
  const parsed = parseAdventureConfig(projectPath);
  if (!parsed || typeof parsed !== 'object') return [];

  const unique = new Set<string>();
  const stack: any[] = [parsed];

  while (stack.length) {
    const node = stack.pop();
    if (typeof node.path === 'string' && fs.existsSync(path.resolve(projectPath, node.path.trim()))) {
      unique.add(node.path.trim());
    }

    const children = Array.isArray(node) ? node : Object.values(node);
    children.forEach(child => {
      if (child && typeof child === 'object') stack.push(child);
    });
  }

  return Array.from(unique);
}
```
- Traverses nested configuration objects to extract and validate all referenced file paths.
- Ensures only existing paths are included, reducing errors during quest generation.

---

## Helpful Hints
- Consider examining the interplay between `StoryGenerator` and `AdventureManager` for streamlined story creation.
- Explore how cached quest content in `AdventureState` improves performance during repeated interactions.
- Investigate how `formatAdventureConfigForPrompt` minimizes data redundancy for enhanced LLM responsiveness.

---
Excellent work! Continue to the next quest to uncover more mysteries.

Congratulations on pushing the 'Quest Generation Engine' to production, achieving a critical 20% milestone in your development roadmap—you're iterating like a true code artisan! 🚀⚡💎