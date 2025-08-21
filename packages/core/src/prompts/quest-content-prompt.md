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
