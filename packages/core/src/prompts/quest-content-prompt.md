# Quest Content Generator

Generate {{theme}}-themed quest content for: "{{adventureTitle}}"

## Rules
- Continue story from {{storyContent}} using same character/object names
- Never use em dashes (—), avoid "deeply understand"
- Quest titles must be plain text only
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

## Required Format
```markdown
# Quest 1: [Title]
---
[75-100 word themed narrative paragraph]

## File Exploration
### [filepath]: [description]
[200-300 word analysis paragraph with backticked code elements]
#### Highlights
- [3-5 bullets with key points]

## Code
### [filepath]
```[language]
[Code for highlight 1 - e.g., setupHandlers function]
```
[Plain English analogy sentence]

```[language]
[Code for highlight 2 - e.g., run function]  
```
[Plain English analogy sentence]

```[language]
[Code for highlight 3 - e.g., main function]
```
[Plain English analogy sentence]

## Helpful Hints
- [Practical tip]
- [Exploration recommendation] 
- [Next steps]

---
[Completion message]
```

## Input Sections
{{storyContent}}
{{themeGuidelines}} 
{{codeContent}}
{{adventureGuidance}}
