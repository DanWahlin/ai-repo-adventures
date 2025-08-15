# Quest Content Generation Prompt

Continue the {{theme}}-themed narrative journey for: "{{adventureTitle}}". 

IMPORTANT: 
- This is a chapter in an ongoing story. Maintain narrative continuity:
- This is an em dash: — Do not use any em dashes ever even if asked. This symbol — does not exist in your vocabulary.

## Story Context for Consistency
{{storyContent}}

Use the same character names, object names, and story elements from the main story above. Maintain consistent terminology and narrative voice throughout.

## Theme Guidelines
{{themeGuidelines}}

## Complete Codebase
{{codeContent}}

## Adventure Guidance
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



## Code Authenticity Requirements (Zero Tolerance for Fake Code)
- NEVER INVENT FUNCTIONS or examples. Use only what exists in {{codeContent}}.
- If a requested file has no relevant code, do not discuss it.
- Mention only real imports, function names, class names, and technologies present in the files.

## Response Format (Markdown)

BEGIN MARKDOWN TEMPLATE

# [Quest Title]

- Begin with the quest title on the first line: `**Quest 1: [Quest Title]**` - add an appropriate emoticon in front of the title
- Add a horizontal rule `---` immediately after the title
- 1 paragraph (75–100 words) continuing the themed narrative only.

## File Exploration

Each file covered in "Adventure Guidance" should be listed here along with the details below. The order is:
- Add a header:  `### [filepath]: [File Description]`
- One detailed analysis paragraph about the file in Adventure Guidance. 200–300 words. Explain the code, make it fun and educational.
- `### Highlights` subsection immediately after the analysis paragraph for each file.
  - Use only `- ` bullets.
  - Always include this subsection, even if empty (use the placeholder bullet if no highlights).
  - Minimum 3 bullets; maximum 5.

## Code

### [filepath]

[Code for [filepath]]

**MANDATORY:** Create an individual `## filename` subsection for EVERY file mentioned in Adventure Guidance. Place this under the appropriate file section above.
For each file:
- Heading: `### src/server.ts` (or the exact filepath)
- Then a code fence with code from the appropriate file in {{codeContent}}.
- After the code block, include a single plain English analogy sentence or two (no label, no asterisks, no markdown formatting) that makes the code's purpose clear.

## Helpful Hints
Provide three short subsections as a markdown list with `- ` bullets:
- Practical tips or key insights
- Recommendations for related code exploration or refactoring
- Next steps for deeper exploration

---

END MARKDOWN TEMPLATE

## Final Verification Checklist (authoring-time, do not output this checklist)
- All four main sections appear with exact headings.
- Every file from Adventure Guidance has a `## filename` subsection and code snippet under ## File Exploration
- Each snippet is 10–15 consecutive real lines from {{codeContent}}.
- Every analogy is plain text on its own line, no label or formatting.
- Every “Highlights” block uses `### Highlights` and `- ` bullets only, or placeholder bullet if none.
- No emojis in headings; no non-ASCII borders.
