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

### Quest 1: [Title]
[EXACTLY 1 sentence describing exploration area and technologies/files covered]

### Quest 2: [Title] 
[EXACTLY 1 sentence describing exploration area and technologies/files covered]
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
- **ONLY create the exact quests listed in Adventure Guidance**
- **Ensure ALL files from Adventure Guidance are systematically covered**
- Each quest MUST focus on its specified files - no additions or omissions
- Apply theme to existing quest structure without changing file scope

**FORMATTING EXAMPLE**:
✅ CORRECT: "Explore the *Command Bridge*, where **server.ts** and **tools.ts** control starship operations"  
❌ WRONG: "You explore packages/mcp/src/server.ts and packages/mcp/src/tools.ts, orchestrating RepoAdventureServer.setupHandlers"

## Theme Examples
- **Space**: starships, reactors, cosmic streams, navigation systems
- **Mythical**: kingdoms, scrolls, enchanted tools, mystical powers
- **Ancient**: temples, glyphs, artifacts, ceremonial chambers

## Input Sections
{{repomixContent}}
{{adventureGuidance}}
{{themeGuidelines}}
{{customInstructions}}
