# Quest Content Generation Prompt

Continue the {{theme}}-themed narrative journey for: "{{adventureTitle}}"

IMPORTANT: This is a chapter in an ongoing story. Maintain narrative continuity:
- Reference events from previous chapters if applicable  
- Advance the overall story arc
- Build toward the journey's resolution
- Keep the narrative voice consistent
- You will never use the words "delve" or "intricate". These words do not exist in your dictionary. 
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

## ⚠️ CRITICAL: REQUIRED STRUCTURED SECTIONS
YOU MUST include dedicated file analysis sections for EVERY file mentioned in the Adventure Guidance above. Use the following to create your plan:
1. Analyze the Complete Codebase content to understand the key aspects
2. Focus on the specific functionalities and implementations relevant to the Adventure Guidance. It should be your central focus if available.

Each file section must follow this exact format:
- Clear section header with ASCII borders: "─── [File Description]: [filepath] ───"
- Detailed analysis paragraph (200-300 words) explaining what the file does
- Real code snippets from the actual file content. Code snippets are VERY IMPORTANT and must be included. Focus on the most relevant and important code.
- Real-world analogies to explain complex concepts in the code. For example, if the code involves data processing, you might compare it to a factory assembly line where raw materials are transformed into finished products. For simple code snippets it's OK to exclude this content.
- End with practical implementation insights (tips and/or key insights)

**If you don't see specific file requirements in the Adventure Guidance, create logical file analysis sections based on the Complete Codebase content.**

## ⚠️ CRITICAL: Code Authenticity Requirements - ZERO TOLERANCE FOR FAKE CODE
- **NEVER INVENT FUNCTIONS**: Use ONLY code that exists in the "## Complete Codebase" section above
- **NEVER CREATE EXAMPLES**: DO NOT create, modify, or invent any code examples whatsoever
- **VERIFY BEFORE INCLUDING**: Every function, variable, and code snippet MUST exist in the actual files
- **If no relevant code exists**: Say "No specific code functions were found for this file"
- **Show ONLY actual**: imports, function names, class names, and technologies from the files
- **FORBIDDEN**: Creating example functions like `calculateTrajectory()`, `processData()`, or any invented code

## Analogy Guidelines
For code snippet explanations, use relatable analogies such as the following. DO NOT COPY THESE as they're only examples!
- Functions → Restaurant recipes, factory assembly lines, or instruction manuals
- Classes → Blueprints, templates, or cookie cutters
- APIs → Restaurant menus, hotel front desks, or customer service counters
- Event handlers → Doorbell systems, alarm clocks, or notification services
- Data structures → Filing cabinets, toolboxes, or organizational systems
- Always connect the analogy back to the specific code being shown

## Professional Visual Enhancement Guidelines
Add tasteful visual elements to enhance readability and engagement:
- Use simple ASCII borders for important sections: ─ Section ─ or ─ Title ─
- Use occasional thematic icons within content (not as standalone headers) if appropriate
- Keep visual elements minimal and professional - enhance, don't overwhelm
- AVOID creating empty sections with just emoji headers

## Response Format (Markdown)

**CRITICAL: You MUST follow this EXACT structure with all 4 sections. Missing any section will result in failure.**

Your response MUST contain these sections in this exact order:

### SECTION 1: # Adventure
[1 paragraph (75-100 words) continuing the themed narrative story only - keep brief]

### SECTION 2: # File Exploration  
[2-3 paragraphs (200-300 words) providing thorough walkthrough with professional visual elements - use ASCII borders and clean formatting for better readability. DO NOT create standalone emoji headers without content.]

### SECTION 3: # Code Snippets
**MANDATORY REQUIREMENT: This section MUST exist and MUST contain individual ## filename subsections for EVERY file mentioned in Adventure Guidance.**

For EVERY file mentioned in Adventure Guidance above, you MUST create a subsection like this:

## src/server.ts
```typescript
// EXACT code from the actual file - NEVER invent code
// Show actual function signatures, classes, or important imports from src/server.ts
class RepoAdventureServer {
  private setupHandlers() {
    // Show the actual implementation from the file
  }
}
```
[Analogy explaining this specific code. Only provide the analogy text.]

## src/tools/tools.ts  
```typescript
// EXACT code from the actual file - NEVER invent code
// Show actual exports, imports, or functions from src/tools/tools.ts
export const tools = {
  start_adventure,
  choose_theme,
  explore_quest,
  view_progress
};
```

[Analogy explaining this specific code. Only provide the analogy text.]

**ABSOLUTE REQUIREMENT: If Adventure Guidance mentions src/server.ts AND src/tools/tools.ts, you MUST have BOTH subsections above.**

### SECTION 4: # Helpful Hints
- Practical tips or key insights
- Recommendations for related code exploration or refactoring
- Next steps for deeper exploration

## ⚠️ FINAL VERIFICATION CHECKLIST
Before submitting your response, verify:
✅ Every file mentioned in Adventure Guidance has its own ## filename code snippet section
✅ Every code snippet exists in the "## Complete Codebase" section
✅ Every function name mentioned exists in the actual files  
✅ No invented/example code was created
✅ If a file mentions src/server.ts AND src/tools/tools.ts, you have BOTH ## src/server.ts AND ## src/tools/tools.ts sections
✅ Each code section shows actual imports, classes, functions, or exports from that file
❌ NEVER submit responses with fake functions like `calculateTrajectory()`, `processData()`, etc.
❌ NEVER skip files mentioned in Adventure Guidance