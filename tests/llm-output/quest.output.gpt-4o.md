# Quest 2: Quest Generation Engine

## Technical Overview
The Quest Generation Engine is responsible for dynamically creating themed adventures and quests based on the structure and content of a repository. This module integrates with various components, such as the AdventureManager, StoryGenerator, and configuration utilities, to generate narratives, explore code, and manage progress. Its key purpose is to turn repository code into a gamified exploration experience.

## Key Components
- **AdventureManager** (_packages/core/src/adventure/adventure-manager.ts_):
  - Main interface for managing quests, progress, and state related to repository exploration.
  - Includes methods for initializing adventures, executing quests, and validating user input.
- **AdventureState** (_packages/core/src/adventure/adventure-manager.ts_):
  - Stores state for the current adventure, including active quests, completed quests, and configurations.
  - Provides progress tracking and state reset functionality.
- **StoryGenerator** (_packages/core/src/adventure/story-generator.ts_):
  - Handles generation of overarching story narratives and quest content based on themes and repository structure.
  - Uses LLM integration to produce structured markdown responses for quest content.
- **Adventure Config Utilities** (_packages/core/src/shared/adventure-config.ts_):
  - Provides functions to parse and extract configurations from `adventure.config.json`.
  - Formats configuration data for use in story generation.

## Implementation Details
### AdventureManager
- **State Management**: `AdventureState` manages persistent adventure data like quests, progress, and themes. The `AdventureManager` operates directly on this state to coordinate actions and updates.
- **Quest Handling**: Quests are initialized using repository data and theme configurations. They can be retrieved, explored, and marked as completed. Completed quests are cached for efficiency during revisits.
- **Input Validation**: User input for quest selection is validated and sanitized using strict rules to ensure compatibility with the code-matching logic.
- **LLM Integration**: Quest-specific content is generated using `StoryGenerator`, which calls an LLM client with custom prompts based on the selected theme and repository context.

### StoryGenerator
- **Markdown Parsing**: Story narratives and quest data are extracted from markdown responses using structured parsing methods (e.g., headings, lists).
- **Prompt Customization**: Generation prompts are tailored to include repository context, theme guidelines, and custom instructions from `adventure.config.json`.
- **Fallback Mechanisms**: If LLM responses fail, the engine provides default templates to ensure continuity of functionality.
- **Content Refinement**: LLM responses are cleaned and validated using schemas (e.g., Zod) to ensure adherence to expected formats.

### Configuration Handling
- **Adventure Config Parsing**: `parseAdventureConfig()` extracts configuration data, such as quests and file paths, from `adventure.config.json`.
- **File Merging**: Configuration-defined file paths and functions are merged into generated quest data to ensure quests correspond to actual code highlights.

## Code Examples

### Initializing an Adventure
```typescript
const adventureManager = new AdventureManager();

const projectInfo = { repomixContent: '...', otherMetadata: '...' };
const theme = 'developer';
const story = await adventureManager.initializeAdventure(projectInfo, theme, '/path/to/project');

console.log(story); // Outputs the story with available quests
```
This setup initializes a new adventure, sets the theme, and generates the narrative and corresponding quests based on the repository structure.

### Executing a Quest
```typescript
const selectedQuest = 'quest-1'; // Quest ID or keyword
const result = await adventureManager.exploreQuest(selectedQuest);

console.log(result.narrative);  // Outputs quest content and progress summary
console.log(result.progressUpdate); // Displays progress as percentage
```
This executes a quest by ID or name, generating the narrative and updating progress status.

### Progress Tracking
```typescript
const progress = adventureManager.getProgress();

console.log(progress.narrative); // Summary of completed quests and remaining quests
console.log(progress.choices); // List of next available actions
```
This retrieves the current progress and provides actionable options for the user.

## Integration Points
- **LLM Client** (_packages/core/src/llm/llm-client.ts_): Provides API access for generating story and quest content.
- **Adventure Config Utilities** (_packages/core/src/shared/adventure-config.ts_): Used to merge configuration-based data into quests for enriched context.
- **Theme System** (_packages/core/src/shared/theme.ts_): Defines the structure for themes, including custom theme implementations.
- **Code Analysis Pipeline** (_packages/core/src/analyzer/repo-analyzer.ts_): Generates targeted repository content when specific files are defined in quests.

## Best Practices & Considerations
- **Validate Repository Paths**: Ensure paths and files referenced in `adventure.config.json` are accessible and accurate.
- **Optimize Cache Usage**: Completed quest caching (`questContentCache`) reduces redundant LLM calls and improves performance.
- **Enforce Structure**: Use Zod schemas to validate LLM responses for quests and stories to conform to the expected format.
- **Theme Guidelines**: Make use of theme-based vocabulary by customizing LLM prompts to align with thematic keywords and tone.
- **Error Handling**: Implement fallback mechanisms for cases where LLM responses fail or contain invalid data.

Congratulations on committing 'Quest 2: Quest Generation Engine' to the main branch—your code is now 20% closer to deployment greatness! 🚀⚡💎