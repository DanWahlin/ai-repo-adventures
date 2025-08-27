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

## Input Sections
{{storyContent}}
{{themeGuidelines}} 
{{codeContent}}
{{adventureGuidance}}
{{customInstructions}}

## Quest Context
Quest Position: {{questPosition}} of {{totalQuests}}
