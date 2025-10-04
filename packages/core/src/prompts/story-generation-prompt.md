# Story Generator for Themed Repository Adventures

Create a {{theme}}-themed story that explains what the codebase does through narrative, then break it into interconnected quests exploring specific technical components.

## Rules
- Never use "delve", "intricate", em dashes (—), or emojis in H1 titles
- Create connected quests that contribute to one overarching story
- Use only real files from "## Project Codebase" or "## Adventure Guidance"
- Write in second-person ("You explore...", "You discover...")

## Output Format
```markdown
# [Themed Title]

## Story
[75-100 word narrative explaining codebase purpose through theme]

**Adventure Awaits** – Choose your quest wisely, brave adventurer!

## Choose a Quest

1. **[Quest Title]** – [EXACTLY 1 sentence describing exploration area and technologies/files covered]

2. **[Quest Title]** – [EXACTLY 1 sentence describing exploration area and technologies/files covered]

3. **[Quest Title]** – [EXACTLY 1 sentence describing exploration area and technologies/files covered]
```

**CRITICAL FORMAT RULES:**
- Each quest description must be EXACTLY 1 sentence  
- **ALWAYS wrap filenames in double asterisks for bold formatting: **filename.ts**
- Use short filenames only (server.ts, not packages/mcp/src/server.ts)
- NO additional explanations, code snippets, or extra content
- NO "Hints:", "Key Area:", or other subsections
- Clean, simple quest descriptions only

## File Coverage Enforcement
**CRITICAL**: If Adventure Guidance contains quest definitions:
- **Create the EXACT NUMBER of quests defined in Adventure Guidance** (if 10 quests are defined, create 10 quests)
- **ONLY create the exact quests listed in Adventure Guidance**
- **Ensure ALL files from Adventure Guidance are systematically covered**
- Each quest MUST focus on its specified files - no additions or omissions
- Apply theme to existing quest structure without changing file scope or quest count

**FORMATTING EXAMPLE**:
✅ CORRECT: "Explore the *Command Bridge*, where **server.ts** and **tools.ts** control starship operations"  
❌ WRONG: "You explore packages/mcp/src/server.ts and packages/mcp/src/tools.ts, orchestrating RepoAdventureServer.setupHandlers"

## Theme Examples
- **Space**: starships, reactors, cosmic streams, navigation systems
- **Mythical**: kingdoms, scrolls, enchanted tools, mystical powers
- **Ancient**: temples, glyphs, artifacts, ceremonial chambers

## Example Output

Here's an example of a properly formatted story response (space theme):

```markdown
# The Starship Repository Explorer

## Story
Welcome aboard the Repository Explorer, a state-of-the-art starship designed to navigate the cosmos of code. Your mission is to explore the ship's critical systems, from the Command Bridge where operations are coordinated, to the Power Core that drives the entire vessel. Each system represents a vital component of this TypeScript-powered spacecraft, working in harmony to process data streams and manage cosmic communications.

**Adventure Awaits** – Choose your quest wisely, brave adventurer!

## Choose a Quest

1. **Command Bridge Operations** – Navigate to the control center where **server.ts** orchestrates starship communications and **tools.ts** manages mission-critical instruments.

2. **Power Core Systems** – Venture into the reactor chamber where **config.ts** regulates energy distribution and **validator.ts** maintains system stability.

3. **Navigation Arrays** – Explore the guidance systems where **router.ts** charts courses through data streams and **middleware.ts** ensures safe passage.
```

**KEY FORMATTING REQUIREMENTS**:
- Start with H1 title using theme vocabulary
- Include "## Story" section with 75-100 word narrative
- Include the exact phrase "**Adventure Awaits** – Choose your quest wisely, brave adventurer!"
- Use "## Choose a Quest" as section header
- **CRITICAL**: Use numbered list format (1., 2., 3.) for quests, NOT H3 headings
- Each quest: **Bold Title** – Single sentence with bold **filenames**
- NO subsections, NO code blocks, NO extra explanations

## Input Sections
{{repomixContent}}
{{adventureGuidance}}
{{themeGuidelines}}
{{customInstructions}}
