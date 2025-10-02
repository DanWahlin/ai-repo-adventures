# Quest Content Generator

Generate {{theme}}-themed quest content for: "{{adventureTitle}}"

## Rules
- Continue story from {{storyContent}} using same character/object names
- Never use em dashes (—), avoid "deeply understand"
- Quest titles must be plain text only
- **CRITICAL**: Never add "Chapter" headings - this is a quest format, not a book chapter
- **CRITICAL**: Never add "Quest Objectives" section - use Key Takeaways instead
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

## Key Takeaways Requirements
**IMPORTANT**: Key Takeaways should provide clear learning outcomes:
- Each takeaway starts with an emoji (🎯 🔍 ⚡ 💡) followed by a bold concept name
- Keep each takeaway to one clear sentence
- Focus on technical concepts, patterns, and architectural decisions
- Avoid generic statements - make them specific to the code being explored
- Takeaways should reflect what developers will actually learn from the quest

## Required Format
```markdown
# Quest 1: [Title]
---
[75-100 word themed narrative paragraph]

## Key Takeaways
After completing this quest, you will understand:
- 🎯 **[Concept 1]**: [One sentence describing a key technical concept or pattern]
- 🔍 **[Concept 2]**: [One sentence about an important implementation detail]
- ⚡ **[Concept 3]**: [One sentence about architectural decisions or trade-offs]
- 💡 **[Concept 4]**: [Optional: One sentence about practical applications]

## File Exploration
### File: [filepath]
[200-300 word analysis paragraph with backticked code elements]
#### Highlights
- [3-5 descriptive bullets explaining what key functions/methods do and why they matter]
- [Each highlight should mention a specific function/method name and describe its purpose]
- [Format: `functionName` followed by description of what it does and its significance]
- [Example: `setupHandlers` dynamically lists tools and validates parameters for mission execution]
- [Example: `run` activates transport and pre-generates actionable content for seamless workflows]

#### Code
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

[Repeat for each file: File exploration paragraph → Highlights → Code snippets with explanations]

## Helpful Hints
- [Practical tip]
- [Exploration recommendation]
- [Next steps]

## Try This
Challenge yourself to deepen your understanding:

1. **[Experiment Name]**: [2-3 sentences describing a hands-on modification or exploration task]
   - Example: "Try adding a new agent to the system. Create a simple agent that handles currency conversion queries and register it with the orchestrator."

2. **[Investigation Name]**: [2-3 sentences describing something to analyze or trace through]
   - Example: "Trace the complete flow of a user query from the API endpoint through the triage agent to a specialized agent. Add console.log statements to observe how data transforms at each step."

3. **[Challenge Name]**: [Optional 3rd experiment for more complex exploration]
   - Example: "Modify the error handling to provide more detailed feedback when tool execution fails. Consider what information would be most helpful for debugging."

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

## Key Takeaways
After completing this quest, you will understand:
- 🎯 **Triage Pattern**: How a central agent routes requests to specialized agents based on query analysis
- 🔍 **Dynamic Configuration**: How agents are configured at runtime based on available MCP tool servers
- ⚡ **Server-Sent Events (SSE)**: How real-time streaming enables responsive user experiences in agent systems
- 💡 **Error Handling**: How the system maintains stability when tools fail or agents encounter issues

## File Exploration

### File: packages/mcp/src/server.ts
The Command Bridge operates as the central nervous system of the starship, managing all communications between the vessel and external systems. The `RepoAdventureServer` class coordinates mission deployments by initializing transport systems, registering available instruments, and maintaining real-time status updates. This module demonstrates sophisticated orchestration patterns, using dependency injection to manage the ship's tool registry and employing async initialization for reliable startup sequences.

#### Highlights
- `setupHandlers` dynamically registers all available ship instruments by listing tools and validating their parameters before mission execution
- `run` activates the transport system and pre-generates story content to ensure seamless crew workflows without delays
- `main` orchestrates the complete bridge initialization sequence, including configuration validation and graceful shutdown procedures
- The constructor pattern enables flexible dependency injection, allowing different transport and tool configurations for various mission types
- Error handling throughout ensures the bridge remains operational even when individual subsystems encounter anomalies

#### Code
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

## Try This
Challenge yourself to deepen your understanding:

1. **Add Health Check Agent**: Create a new specialized agent called `HealthCheckAgent` that monitors system status. Register it in `setupAgents` with a simple tool that returns server uptime and active connections. This will help you understand the agent registration pattern.

2. **Trace Request Flow**: Add console.log statements at key points: when `setupHandlers` is called, when a tool request arrives, and when the response is sent. Run the system and observe how data flows from client request to agent response. This reveals the complete request lifecycle.

3. **Implement Custom Error Messages**: Modify the error handling in `CallToolRequestSchema` to provide more detailed feedback. Instead of just "Unknown tool", include information about available tools and suggest the closest match. This demonstrates defensive programming and improves developer experience.

---
Excellent work! Continue to the next quest to uncover more mysteries of the starship's systems.
```

**KEY FORMATTING REQUIREMENTS**:
- Start with H1 quest title (plain text, no emojis)
- Use `---` separator immediately after title
- Include 75-100 word themed narrative paragraph
- Include "## Key Takeaways" with 3-4 bullet points using emojis (🎯 🔍 ⚡ 💡) before bold concept names (NO emoji in heading)
- Include "## File Exploration" section with "### File: [filepath]" for each file
- Each file should have: description paragraph → "#### Highlights" → "#### Code" with snippets
- Add 3-5 educational bullet points after EACH code snippet
- Use `---` separators between code blocks
- Include "## Helpful Hints" section with 3 practical tips
- Include "## Try This" section with 2-3 hands-on experiments (NO emoji in heading)
- End with themed completion message after final `---`

## Input Sections
{{storyContent}}
{{themeGuidelines}} 
{{codeContent}}
{{adventureGuidance}}
{{customInstructions}}

## Quest Context
Quest Position: {{questPosition}} of {{totalQuests}}
