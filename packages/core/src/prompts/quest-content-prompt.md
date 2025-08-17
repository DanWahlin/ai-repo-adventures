# Quest Content Generation Prompt

Continue the {{theme}}-themed narrative journey for: "{{adventureTitle}}". 

IMPORTANT: 
- This is a chapter in an ongoing story. Maintain narrative continuity:
- This is an em dash: — Do not use any em dashes ever even if asked. This symbol — does not exist in your vocabulary.
- **EMOJI RESTRICTION**: Never use these emojis as they render as squares on many systems: 🌌 🌠 🔮 🛰️ 🧭 🔭 🪐. Use safe alternatives: ⭐ 🚀 ⚡ 💎 🗺️ 👁️ 📡
- **QUEST TITLE RESTRICTION**: Never use ANY emojis in quest titles (the main # heading). Quest titles must be plain text only.
- Use fun and engaging language to immerse the reader in the adventure. Don't use words like "deeply understand" or similar.

## Story Context for Consistency
{{storyContent}}

Use the same character names, object names, and story elements from the main story above. Maintain consistent terminology and narrative voice throughout.

{{themeGuidelines}}

## Complete Codebase
{{codeContent}}

## Adventure Code Guidance
{{adventureGuidance}}

## CRITICAL FORMAT & STYLE GUARDRAILS
- Output ONLY markdown.
- Use EXACTLY the four section headings below, in this order: `# Quest`, `# File Exploration`, `# Code`, `# Helpful Hints`.
- **HORIZONTAL RULE RESTRICTION**: You MUST use `---` in ONLY these TWO places:
  1. Immediately after the quest title (one time only)
  2. Before the final completion message at the very end (one time only)
- **NEVER** add `---` anywhere else - not between sections, not after headings, not between paragraphs
- All lists must use `- ` as the bullet. Do not use `•` or other symbols.
- Every code block must be fenced with:

  ```[language] 
  [code] 
  ```

- Never invent or alter code.
- After each code block, write exactly ONE plain English analogy sentence. 
  - Do NOT start it with "Analogy:".
  - Place it on its own line directly after the code block.

## MANDATORY CODE HIGHLIGHTING REQUIREMENTS
**CRITICAL**: You MUST wrap ALL code elements in backticks for proper syntax highlighting:
- Function names: `functionName()`, `setupHandlers()`, `main()`
- Class names: `RepoAdventureServer`, `StdioServerTransport`
- Variable names: `server`, `transport`, `tools`
- Constants: `SIGINT`, `SIGTERM`, `ErrorCode`
- File names: `server.ts`, `tools.ts`
- Method calls: `server.connect()`, `repoAnalyzer.preGenerate()`
- Properties: `request.params`, `error.message`
- Technical terms: `stdio`, `MCP`, `JSON`, `Zod`

**ENFORCEMENT**: Every technical term, function name, variable, constant, or code element mentioned in your text MUST be wrapped in backticks. This is non-negotiable for proper HTML rendering.

## FILE SCOPE ENFORCEMENT
**STRICT REQUIREMENT**: Only discuss files explicitly listed in the "Adventure Code Guidance" section below. 
- If Adventure Code Guidance lists 2 files, discuss exactly 2 files
- If Adventure Code Guidance lists 3 files, discuss exactly 3 files
- Do NOT add additional files not specified in the guidance
- Do NOT expand beyond the specified scope



## Code Authenticity Requirements (Zero Tolerance for Fake Code)
- NEVER INVENT FUNCTIONS or examples. Use only what exists in the Complete Codebase section.
- If a requested file has no relevant code, do not discuss it.
- Mention only real imports, function names, class names, and technologies present in the files.

## Response Format (Markdown)

BEGIN MARKDOWN TEMPLATE

# Quest 1: [Quest Title]

- Begin with the quest title on the first line: `# Quest 1: [Quest Title]` (NO EMOJIS in the title)
- Add a horizontal rule `---` immediately after the title
- 1 paragraph (75–100 words) continuing the themed narrative only.

## File Exploration

Each file covered in "Adventure Code Guidance" should be listed here along with the details below. The order is:
- Add a header:  `### [filepath]: [File Description]`
- One detailed analysis paragraph about the file in Adventure Code Guidance. 200–300 words. Explain the code, make it fun and educational.
- `#### Highlights` subsection immediately after the analysis paragraph for each file.
  - Use only `- ` bullets.
  - Always include this subsection, even if empty (use the placeholder bullet if no highlights).
  - Minimum 3 bullets; maximum 5.

## Code

### [filepath]

[Code for [filepath]]

**MANDATORY:** Create an individual `## filename` subsection for EVERY file mentioned in Adventure Code Guidance. Place this under the appropriate file section above.
For each file:
- Heading: `### src/server.ts` (or the exact filepath)
- Then a code fence with code from the appropriate file in the Complete Codebase section.
- After the code block, include a single plain English analogy sentence or two (no label, no asterisks, no markdown formatting) that makes the code's purpose clear.

**IMPORTANT:** 
The "Adventure Code Guidance" section provides crucial context for generating code snippets. Pay close attention to the specific requirements and constraints outlined there. For example:

**File: `src/server.ts`**
- Description: MCP server protocol implementation that hosts the adventure tools
- Key Functions/Areas to Highlight:
  • **RepoAdventureServer.setupHandlers**: Registers MCP protocol handlers for ListTools and CallTool requests
  • **RepoAdventureServer.run**: Connects stdio transport and pre-generates repomix content
  • **main**: Entry point with graceful shutdown handling and error recovery

Ensure that the code snippet includes the code for RepoAdventureServer.setupHandlers, RepoAdventureServer.run, and main in this case. Follow that pattern for all code files and the
information provided in "Adventure Code Guidance".

## Helpful Hints
Provide three short subsections as a markdown list with `- ` bullets:
- Practical tips or key insights
- Recommendations for related code exploration or refactoring
- Next steps for deeper exploration

---

END MARKDOWN TEMPLATE

## Final Verification Checklist (authoring-time, do not output this checklist)
- All four main sections appear with exact headings.
- Every file from Adventure Code Guidance has a `## filename` subsection and code snippet under ## File Exploration
- Each snippet is consecutive real lines from the Complete Codebase section.
- Every analogy is plain text on its own line, no label or formatting.
- Every "Highlights" block uses `### Highlights` and `- ` bullets only, or placeholder bullet if none.
- No emojis in headings; no non-ASCII borders.
