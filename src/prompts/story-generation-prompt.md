# Story-Based Quest Generator for GitHub Repos

## 🎯 OBJECTIVE

Turn the provided codebase into an immersive, theme-driven story that helps developers understand what the code does through narrative. Then, break that story into 3–5 interconnected **quests** that each focus on specific technical components or files from the codebase.

Each quest should:

- Advance the storyline like a chapter in a novel
- Reference only real files and concepts from the codebase
- Guide the developer deeper into understanding the repo
- Use a fun, creative theme (e.g., space, mythical, ancient, cyberpunk)

---

## 📝 OUTPUT FORMAT

Return a valid JSON object with this structure:

\`\`\`json
{
  "story": "MUST include formatted title + narrative + quest invitation (see MANDATORY STORY FORMAT below)",
  "adventures": [
    {
      "id": "quest-1",
      "title": "🚀 Quest 1: [Theme-appropriate title that begins the main story]",
      "description": "1 sentence mentioning specific technologies/files/concepts covered (e.g., 'Explore server.ts, MCP protocol handlers, and TypeScript tool registration')",
      "codeFiles": ["ONLY-files-that-appear-in-'## Project Codebase' above"]
    },
    {
      "id": "quest-2",
      "title": "⚡ Quest 2: [Title that continues the main narrative from Quest 1]",
      "description": "1 sentence mentioning specific technologies/files/concepts covered",
      "codeFiles": ["relevant-files"]
    }
  ]
}
\`\`\`

---

## 🔧 FINAL VALIDATION RULES (DO NOT SKIP)

✅ File Name Integrity:

- ONLY use file paths shown in the "## Project Codebase" section (marked by "## File:")
- DO NOT invent or describe any file that isn’t listed
- PREFER: Main application files over utility/config/type files
- Better to leave \`codeFiles: []\` than include an incorrect filename

✅ Quest Structure:

- Each quest builds on the previous (like story chapters)
- Each description is exactly **1 sentence**, educational and thematic
- Use second-person POV (“You must…”)
- No standalone tasks — all quests contribute to the overall story

---

## 🧙‍♂️ STORY CREATION INSTRUCTIONS

1. **ANALYZE** the \`## Project Codebase\` section to understand the project codebase and its purpose  
2. Create a \`{{theme}}\`-themed narrative that uses metaphor to reflect the purpose of the code  
3. **DO NOT invent file names** — only reference those shown via "## File:" headers in the \`## Project Codebase\`
4. Reference 3–4 real technologies, tools, or patterns found in the code (e.g., server.ts, MCP handlers, tool registration)  
5. End with this line:  
   \`🗺️ **Your Quest Awaits** – Choose your path wisely, brave adventurer!\`

---

## 📜 MANDATORY STORY FORMAT

Your story MUST include:

1. A themed title with line breaks before and after  
2. A narrative paragraph (75–100 words)  
3. The quest invitation line  

**CRITICAL: The "story" field in your JSON response MUST be formatted exactly like this:**

**🚀 [Your Themed Title Here]**

Your narrative paragraph about the mission, journey, or adventure goes here. Make it 75-100 words that explains what this codebase does through your chosen theme.

🗺️ **Your Quest Awaits** – Choose your path wisely, brave adventurer!

**EXCELLENT EXAMPLE - USE AS STRUCTURAL TEMPLATE ONLY:**

**🚀 Mission MCP: Refactor-1 and the Codebase Constellation**

Aboard the *Starship Refactor-1*, an elite crew of codonauts embarks on an interstellar mission to decode and optimize the galactic repository known as MCP. Guided by the cutting-edge *Repomix Navigator* and powered by *TypeScript Reactors*, the crew must traverse cosmic data streams, align architectural constellations, and unveil the mysteries of adventure-driven exploration. Their ultimate goal: to transform the sprawling complexity of the MCP system into a harmonious and navigable stellar map. The fate of the intergalactic coding alliance rests on their success.

🗺️ **Your Quest Awaits** – Choose your path wisely, brave adventurer!

⚠️ **CRITICAL: This is ONLY a structural template showing excellent integration. DO NOT copy any phrases, words, or concepts. Create completely original content that follows the same integration approach but uses entirely different vocabulary, metaphors, and narrative elements. Notice how it weaves real technologies (MCP, Repomix, TypeScript) into creative metaphors (Starship Refactor-1, codonauts, TypeScript Reactors, cosmic data streams).**

**WHAT MAKES THIS EXCELLENT:**
1. **Creative Technology Integration**: "Repomix Navigator", "TypeScript Reactors", "cosmic data streams" (real tech as themed elements)
2. **Purpose Clarity**: "decode and optimize the galactic repository", "transform sprawling complexity into navigable stellar map" (explains what MCP does)
3. **Themed Vocabulary**: "codonauts", "interstellar mission", "architectural constellations", "intergalactic coding alliance"
4. **Named Vessel**: "*Starship Refactor-1*" (creative name suggesting code improvement)
5. **Mission Focus**: Clear goal that matches the actual codebase purpose with engaging call-to-action

---

## 🧭 QUEST WRITING GUIDANCE

- Use **second-person** writing: “You uncover…”, “You must navigate…”  
- Each quest builds on the last — like a progressive story arc  
- Avoid passive standalone tasks — make every quest meaningful and progressive  
- Include **only relevant, existing file names**

---

## 💡 THEME MAPPING GUIDE

| Theme     | Setting / Vessel       | Mission Type             | Vocabulary Ideas                            |
|-----------|------------------------|--------------------------|----------------------------------------------|
| Space     | Starship, Satellite    | Galaxy optimization      | reactors, nebula nodes, ion engines          |
| Mythical  | Kingdom, Temple, Order | Curse-breaking, prophecy | scrolls, relics, soulfire, incantations      |
| Ancient   | Tomb, Civilization     | Discovery, unlocking     | glyphs, ruins, stone tablets, spirit gates   |
| Cyberpunk | Grid, Mainframe        | Intrusion, reclamation   | proxies, daemons, firewall sentries          |

---

## 🧠 ORIGINALITY MANDATE

🚫 DO NOT:

- Copy phrases from any examples
- Reuse terms like “codebase constellation”, “vast expanse”, “decoding the mysteries”
- Use common metaphors like “embark on a mission”, “journey through…”

✅ DO:

- Create fresh metaphors and titles for every response
- Integrate real technologies and concepts into new, imaginative metaphors
- Name your vessel, realm, or system creatively and originally based on the code's purpose

---

## 🧱 TECH-TO-THEME MAPPING TIPS

| Real Concept           | Mythical Metaphor             | Space Metaphor                |
|------------------------|-------------------------------|-------------------------------|
| \`init()\` function      | Ritual of awakening           | Engine ignition sequence      |
| Protocol handlers      | Rune interpreters              | Signal routers                |
| TypeScript interfaces  | Scrolls of binding             | Navigation schematics         |
| Server entry point     | Crystal core of the temple     | Command deck of the ship      |

---

## ✅ SUCCESS CHECKLIST

✅ The "story" field includes **🚀 [Title]** + narrative + quest invitation line  
✅ The story clearly explains what the codebase does  
✅ All references to files match those in \`## Project Codebase\`  
✅ The theme is fully realized in narrative and quests  
✅ Each quest builds on the last toward a unified goal  
✅ No hallucinated or invented file names  
✅ Each quest description is exactly 1 sentence and technical  
✅ Each \`codeFiles\` array is accurate and clean  

---

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

---

## 📦 INPUT SECTIONS

These are provided dynamically in each run of the prompt:

### Project Codebase - This is the full codebase listing the files with summaries
{{repomixContent}}

## Adventure Guidance Based Upon Project
{{adventureGuidance}}

## Theme Guidelines
{{themeGuidelines}}

---

## ✅ FINAL INSTRUCTION

Create a single overarching story based on the \`## Project Codebase\`, and 3–5 themed developer quests that progress that story through real technical files. Each quest should feel like a chapter in a larger narrative — immersive, creative, and informative.
