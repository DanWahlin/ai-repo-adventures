# Quest Content Generator

Generate {{theme}}-themed quest content for: "{{adventureTitle}}"

## Rules
- Continue story from {{storyContent}} using same character/object names
- Never use em dashes (—), avoid "deeply understand"
- Quest titles must be plain text only
- **CRITICAL**: Never add "Chapter" headings - this is a quest format, not a book chapter
- After the quest title and `---`, start immediately with the themed narrative paragraph
- Wrap ALL code elements in backticks: `function()`, `Class`, `variable`
- Use `---` only after quest title and before final message

## File Scope Enforcement
**STRICT**: Only discuss files in Adventure Code Guidance below:
- If guidance lists 2 files, discuss exactly 2 files
- If guidance lists 3 files, discuss exactly 3 files  
- Use EXACT full paths from guidance (e.g., `packages/mcp/src/server.ts`)
- Never invent functions - use only real code from Complete Codebase

## Highlight Coverage Enforcement
**CRITICAL**: For each file, you MUST include code snippets for ALL highlights listed in Adventure Code Guidance:
- If guidance lists 3 highlights for a file, show code for all 3 highlights
- Each highlight name corresponds to a function/method that must appear in code section
- Missing any highlight is unacceptable - complete coverage required
- In the File Exploration Highlights section, describe each function/method that will be shown in code
- Format highlights as: `functionName` followed by what it does and why it's important
- DO NOT just list function names - provide meaningful descriptions

## Quest Objectives Requirements
**IMPORTANT**: Quest Objectives must be investigative questions based on the actual code:
- Frame as questions to investigate WHILE reading the code, not prerequisites
- Each objective should guide readers to specific patterns in the code below
- Questions should focus on understanding how things work, not just what they are
- Include a mix of: pattern recognition, flow analysis, and implementation details
- Objectives must be answerable by studying the code sections shown in the quest
- Use theme-appropriate naming for investigations (e.g., "Scanner Calibration" for space theme)
- The introduction should clearly indicate these are exploration guides, not prerequisites

## Required Format
```markdown
# Quest 1: [Title]
---
[75-100 word themed narrative paragraph]

## Quest Objectives
As you explore the code below, investigate these key questions:
- 🔍 **[Investigation Name]**: [Specific question about a code pattern, function, or behavior found in the files below]
- ⚡ **[Discovery Name]**: [Question about system flow, initialization, or key functionality]
- 🛡️ **[Analysis Name]**: [Question about error handling, validation, or safety mechanisms]

## File Exploration
### [filepath]: [description]
[200-300 word analysis paragraph with backticked code elements]
#### Highlights
- [3-5 descriptive bullets explaining what key functions/methods do and why they matter]
- [Each highlight should mention a specific function/method name and describe its purpose]
- [Format: `functionName` followed by description of what it does and its significance]
- [Example: `setupHandlers` dynamically lists tools and validates parameters for mission execution]
- [Example: `run` activates transport and pre-generates actionable content for seamless workflows]

## Code
### [filepath]
```[language]
[Code for highlight 1 - e.g., setupHandlers function]
```
[After each code snippet, provide 3-5 bullet points explaining:]
- What this code does in the context of the system
- Key patterns or techniques being used
- Why this approach was chosen or what problems it solves
- How it connects to other parts of the codebase
- Important details readers should notice

---

```[language]
[Code for highlight 2 - e.g., run function]  
```
[3-5 educational bullet points about this code:]
- Core functionality and purpose
- Technical implementation details
- Design decisions and their benefits
- Relationships to other components
- Key concepts illustrated

---

```[language]
[Code for highlight 3 - e.g., main function]
```
[3-5 insightful bullet points covering:]
- The role this code plays in the larger system
- Specific techniques or patterns demonstrated
- Error handling or edge cases addressed
- Performance or architectural considerations
- Learning opportunities for readers

---

## Helpful Hints
- [Practical tip]
- [Exploration recommendation] 
- [Next steps]

---
[Write a completion message based on quest position:
- If this is the FINAL QUEST ({{questPosition}} == {{totalQuests}}), write: "You have mastered all the secrets of [project context]! Your adventure is complete."
- If there are MORE QUESTS remaining, write: "Excellent work! Continue to the next quest to uncover more mysteries."
- Use the theme-appropriate vocabulary and do NOT reference specific quest numbers]
```

## Example Output

Here's an example of a properly formatted quest response (space theme):

```markdown
# Quest 1: Command Bridge Operations
---
You materialize on the starship's Command Bridge, where the Repository Explorer's communication systems pulse with cosmic energy. The bridge crew coordinates all incoming transmissions from distant codebases, routing them through sophisticated instrument panels that validate each signal's integrity before processing.

## Quest Objectives
As you explore the code below, investigate these key questions:
- 🔍 **Signal Reception Protocol**: How does the bridge receive and categorize incoming transmissions from different star systems?
- ⚡ **Instrument Calibration**: What validation checks ensure that ship instruments are properly configured before mission deployment?
- 🛡️ **Emergency Protocols**: How does the system handle corrupted data streams or invalid command sequences?

## File Exploration
### packages/mcp/src/server.ts: Command Bridge Control Center
The Command Bridge operates as the central nervous system of the starship, managing all communications between the vessel and external systems. The `RepoAdventureServer` class coordinates mission deployments by initializing transport systems, registering available instruments, and maintaining real-time status updates. This module demonstrates sophisticated orchestration patterns, using dependency injection to manage the ship's tool registry and employing async initialization for reliable startup sequences.

#### Highlights
- `setupHandlers` dynamically registers all available ship instruments by listing tools and validating their parameters before mission execution
- `run` activates the transport system and pre-generates story content to ensure seamless crew workflows without delays
- `main` orchestrates the complete bridge initialization sequence, including configuration validation and graceful shutdown procedures
- The constructor pattern enables flexible dependency injection, allowing different transport and tool configurations for various mission types
- Error handling throughout ensures the bridge remains operational even when individual subsystems encounter anomalies

## Code
### packages/mcp/src/server.ts
```typescript
async setupHandlers() {
  this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: this.tools.getTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.schema
    }))
  }));

  this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = this.tools.getTool(request.params.name);
    if (!tool) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }
    return await tool.handler(request.params.arguments || {});
  });
}
```
- This code establishes the bridge's communication protocols, defining how the ship responds to external tool queries and execution requests
- The `ListToolsRequestSchema` handler provides a manifest of all available instruments, ensuring external systems know what capabilities the ship offers
- Tool validation prevents execution of unknown or malicious commands by checking against the registered tool registry
- The error handling pattern demonstrates defensive programming, protecting the bridge from invalid tool invocations
- This architecture enables extensibility by decoupling tool registration from tool execution, allowing new instruments to be added without modifying core communication logic

---

```typescript
async run() {
  await this.transport.connect();

  // Pre-generate story to avoid delays during first crew interaction
  await this.adventureManager.initializeAdventure(
    this.projectInfo,
    'space'
  );

  await this.transport.close();
}
```
- The run method coordinates the complete mission lifecycle, from transport activation to graceful shutdown
- Pre-generating story content eliminates latency during the first crew interaction, providing instant responses
- The connection pattern ensures transport systems are properly initialized before any communication attempts
- Graceful closure prevents resource leaks by properly terminating all active connections
- This approach demonstrates the importance of warm-up sequences in interactive systems where first-response time is critical

---

```typescript
async main() {
  const config = await loadConfig();
  const projectInfo = await analyzeRepository(config.repoPath);

  const server = new RepoAdventureServer(projectInfo);
  await server.run();
}
```
- The main function orchestrates the complete bridge initialization sequence, loading configuration and analyzing the repository structure
- Configuration loading happens first to ensure all system parameters are validated before any resource allocation
- Repository analysis provides the bridge with critical mission intelligence about the codebase being explored
- The separation of concerns (config → analysis → server → run) creates a clear initialization pipeline
- This pattern enables easier testing by allowing each component to be independently validated

---

## Helpful Hints
- Study how the `setupHandlers` method uses schema validation to ensure type safety across the communication boundary
- Notice the pre-generation strategy in the `run` method that trades initial startup time for improved responsiveness
- Explore how dependency injection in the constructor enables different configurations for testing versus production

---
Excellent work! Continue to the next quest to uncover more mysteries of the starship's systems.
```

**KEY FORMATTING REQUIREMENTS**:
- Start with H1 quest title (plain text, no emojis)
- Use `---` separator immediately after title
- Include 75-100 word themed narrative paragraph
- Use "## Quest Objectives" with "As you explore the code below, investigate these key questions:" introduction
- Use 3 objectives with emoji + bold investigation name + specific question
- Include "## File Exploration" section with filepath analysis
- Use "#### Highlights" with 3-5 descriptive bullets (NOT just function names)
- Include "## Code" section with code blocks for each highlight
- Add 5 educational bullet points after EACH code snippet
- Use `---` separators between code blocks
- Include "## Helpful Hints" section with 3 practical tips
- End with themed completion message after final `---`

## Input Sections
{{storyContent}}
{{themeGuidelines}} 
{{codeContent}}
{{adventureGuidance}}
{{customInstructions}}

## Quest Context
Quest Position: {{questPosition}} of {{totalQuests}}
