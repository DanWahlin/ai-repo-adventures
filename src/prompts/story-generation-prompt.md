# Story-Based Quest Generator for GitHub Repos

## 🎯 OBJECTIVE

Turn the provided codebase into an immersive, theme-driven story that helps developers understand what the code does through narrative. Then, break that story into **interconnected quests** that each contribute to the main storyline while exploring specific technical components or files from the codebase.

**CRITICAL: These quests are parts of a single overarching story, NOT standalone tasks. Users can explore them in any order.**

Each quest should:

- **Contribute to the main narrative** while being explorable independently
- **Connect to the overall story goal** from different angles  
- Reference only real files and concepts from the codebase
- Guide the developer deeper into understanding the repo through thematic exploration
- Use a fun, creative theme (e.g., space, mythical, ancient, cyberpunk)
- **Be self-contained yet part of the larger adventure**

## 📝 OUTPUT FORMAT

Return a well-structured markdown document with this format:

\`\`\`markdown
# 🚀 [Your Themed Title Here]

## Story

[Your narrative paragraph about the mission, journey, or adventure goes here. Make it 75-100 words that explains what this codebase does through your chosen theme.]

🗺️ **Your Quest Awaits** – Choose your path wisely, brave adventurer!

## Quests

### 🚀 Quest 1: [Theme-appropriate title related to this part of the system]

[1 sentence describing this quest's exploration area, mentioning specific technologies/files/concepts covered (e.g., 'Explore the server.ts command center and discover the MCP protocol foundations')]

**Code Files:**
- ONLY-files-that-appear-in '## Adventure Guidance' or '## Project Codebase'

### ⚡ Quest 2: [Theme-appropriate title for another part of the system]

[1 sentence describing this quest's unique exploration area, mentioning what technologies/files will be explored]

**Code Files:**
- relevant-files
\`\`\`

## 🔧 FINAL VALIDATION RULES (DO NOT SKIP)

✅ File Name Integrity:

- ONLY use file paths shown in the "## Project Codebase" section (marked by "## File:")
- DO NOT invent or describe any file that isn’t listed
- PREFER: Main application files over utility/config/type files
- Better to leave \`codeFiles: []\` than include an incorrect filename

✅ Quest Structure:

- **Each quest contributes to the overarching story** while being explorable independently
- Each description is exactly **1 sentence** that describes the quest's exploration area and technical focus
- Use second-person POV ("You venture into...", "You explore...", "You discover...")
- **NO standalone tasks** — every quest connects to the main story theme and goal
- **Quests should be self-contained** but part of the larger narrative universe

## 🧙‍♂️ STORY CREATION INSTRUCTIONS

1. **ANALYZE** the \`## Project Codebase\` section to understand the project codebase and its purpose  
2. Create a \`{{theme}}\`-themed narrative that uses metaphor to reflect the purpose of the code  
3. **DO NOT invent file names** — only reference those shown via "## File:" headers in the \`## Project Codebase\`
4. Reference 3–4 real technologies, tools, or patterns found in the code (e.g., server.ts, MCP handlers, tool registration)  
5. End with this line:  
   \`🗺️ **Your Quest Awaits** – Choose your path wisely, brave adventurer!\`

## 📜 MANDATORY STORY FORMAT

Your markdown response MUST include:

1. **H1 heading**: Just the themed title (e.g., "# 🚀 Mission Control: The Space Station")
2. **Story section**: Narrative paragraph + quest invitation under "## Story" heading

**CRITICAL: The story section MUST be formatted exactly like this:**

## Story

Your narrative paragraph about the mission, journey, or adventure goes here. Make it 75-100 words that explains what this codebase does through your chosen theme.

🗺️ **Your Quest Awaits** – Choose your path wisely, brave adventurer!

**EXCELLENT EXAMPLE - USE AS STRUCTURAL TEMPLATE ONLY:**

```markdown
# 🚀 Mission MCP: Refactor-1 and the Codebase Constellation

## Story

Aboard the *Starship Refactor-1*, an elite crew of codonauts embarks on an interstellar mission to decode and optimize the galactic repository known as MCP. Guided by the cutting-edge *Repomix Navigator* and powered by *TypeScript Reactors*, the crew must traverse cosmic data streams, align architectural constellations, and unveil the mysteries of adventure-driven exploration. Their ultimate goal: to transform the sprawling complexity of the MCP system into a harmonious and navigable stellar map. The fate of the intergalactic coding alliance rests on their success.

🗺️ **Your Quest Awaits** – Choose your path wisely, brave adventurer!
```

⚠️ **CRITICAL: This is ONLY a structural template showing excellent integration. DO NOT copy any phrases, words, or concepts. Create completely original content that follows the same integration approach but uses entirely different vocabulary, metaphors, and narrative elements. Notice how it weaves real technologies (MCP, Repomix, TypeScript) into creative metaphors (Starship Refactor-1, codonauts, TypeScript Reactors, cosmic data streams).**

**WHAT MAKES THIS EXCELLENT:**
1. **Creative Technology Integration**: "Repomix Navigator", "TypeScript Reactors", "cosmic data streams" (real tech as themed elements)
2. **Purpose Clarity**: "decode and optimize the galactic repository", "transform sprawling complexity into navigable stellar map" (explains what MCP does)
3. **Themed Vocabulary**: "codonauts", "interstellar mission", "architectural constellations", "intergalactic coding alliance"
4. **Named Vessel**: "*Starship Refactor-1*" (creative name suggesting code improvement)
5. **Mission Focus**: Clear goal that matches the actual codebase purpose with engaging call-to-action

## 🧭 QUEST WRITING GUIDANCE

- Use **second-person** writing that immerses the reader: "You venture into the depths of...", "You discover the secrets of...", "You explore the ancient chambers of..."  
- **Each quest should connect to the main story theme** while focusing on its own exploration area  
- **Avoid standalone tasks** — every quest should feel like part of the larger adventure world  
- Include **only relevant, existing file names**  
- **Make each quest compelling on its own** while contributing to the overall narrative

## 💡 THEME MAPPING GUIDE

| Theme     | Setting / Vessel       | Mission Type             | Vocabulary Ideas                            |
|-----------|------------------------|--------------------------|----------------------------------------------|
| Space     | Starship, Satellite    | Galaxy optimization      | reactors, nebula nodes, ion engines          |
| Mythical  | Kingdom, Temple, Order | Curse-breaking, prophecy | scrolls, relics, soulfire, incantations      |
| Ancient   | Tomb, Civilization     | Discovery, unlocking     | glyphs, ruins, stone tablets, spirit gates   |
| Cyberpunk | Grid, Mainframe        | Intrusion, reclamation   | proxies, daemons, firewall sentries          |

## 🧠 ORIGINALITY MANDATE

🚫 DO NOT:

- Copy phrases from any examples
- Reuse terms like “codebase constellation”, “vast expanse”, “decoding the mysteries”
- Use common metaphors like “embark on a mission”, “journey through…”

✅ DO:

- Create fresh metaphors and titles for every response
- Integrate real technologies and concepts into new, imaginative metaphors
- Name your vessel, realm, or system creatively and originally based on the code's purpose

## 🧱 TECH-TO-THEME MAPPING TIPS

| Real Concept           | Mythical Metaphor             | Space Metaphor                |
|------------------------|-------------------------------|-------------------------------|
| \`init()\` function      | Ritual of awakening           | Engine ignition sequence      |
| Protocol handlers      | Rune interpreters              | Signal routers                |
| TypeScript interfaces  | Scrolls of binding             | Navigation schematics         |
| Server entry point     | Crystal core of the temple     | Command deck of the ship      |

## ✅ SUCCESS CHECKLIST

✅ The H1 heading contains just the themed title and the story section contains narrative + quest invitation  
✅ The story clearly explains what the codebase does  
✅ All references to files match those in \`## Project Codebase\`  
✅ The theme is fully realized in narrative and quests  
✅ **Each quest connects to the overarching story** while being explorable independently  
✅ **Quests are NOT standalone tasks** — they are part of a single thematic adventure world  
✅ No hallucinated or invented file names  
✅ Each quest description is exactly 1 sentence describing its exploration area and technical focus  
✅ Each code files list is accurate and clean  
✅ **Quests are self-contained but thematically connected** to the main story  

## 🧱 FILE SELECTION STRATEGY

**✅ Prefer:**

- Core business logic
- Application entry points (e.g., server.ts)
- Key algorithm implementations
- Files with important routing, protocol, or handler logic

**❌ Avoid:**

- Utility/helper files
- Type definitions (\`types.ts\`)
- Error handling or config
- Files in \`/shared/\`, \`/utils/\`, or \`/constants/\`

## 📦 INPUT SECTIONS

These are provided dynamically in each run of the prompt:

### Project Codebase - This is the full codebase listing the files with summaries
{{repomixContent}}

## Adventure Guidance
{{adventureGuidance}}

## Theme Guidelines
{{themeGuidelines}}

## ✅ FINAL INSTRUCTION

Create a single overarching story based on the '## Adventure Guidance' and '## Project Codebase' content, and interconnected quests (dynamically sized based on project complexity) that explore different aspects of that story through real technical files. **Each quest should contribute to the main narrative while being explorable independently** — users can choose their own adventure path. Each quest should feel like exploring a different area of the same thematic world, connected by the overall story but self-contained enough to be meaningful on its own.
