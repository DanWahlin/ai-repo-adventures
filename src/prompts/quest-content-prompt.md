# Quest Content Generation Prompt

Continue the {{theme}}-themed narrative journey for: "{{adventureTitle}}"

IMPORTANT: This is a chapter in an ongoing story. Maintain narrative continuity:
- Reference events from previous chapters if applicable  
- Advance the overall story arc
- Build toward the journey's resolution
- Keep the narrative voice consistent

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

## Real-World Analogy Guidelines
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

Return a well-structured markdown document with this format:

```markdown
# Adventure

[1 paragraph (75-100 words) continuing the themed narrative story only - keep brief]

# File Exploration

[2-3 paragraphs (200-300 words) providing thorough walkthrough with professional visual elements - use ASCII borders and clean formatting for better readability. DO NOT create standalone emoji headers without content.]

# Code Snippets

**MANDATORY: You MUST include at least 2-3 code snippet sections showing actual code from the files mentioned in the Adventure Guidance above.**

## src/filename.ext

```typescript
// EXACT code from the files - ZERO INVENTED CODE
// Show function signatures, key methods, or important imports
// Use 'No code found' if none exists, but this should be rare
function actualFunctionName() {
  // real implementation here
}
```

[Start with a real-world analogy, then explain ONLY the actual code shown - NEVER explain fake/invented code]

## src/another-file.ext

```javascript
// Show different aspects of the code
const realVariableName = actualValue;
```

[Explain this code snippet with analogies]

# Helpful Hints

- Practical tips or key insights
- Recommendations for related code exploration or refactoring
- Next steps for deeper exploration

## ⚠️ FINAL VERIFICATION CHECKLIST
Before submitting your response, verify:
✅ Every code snippet exists in the "## Complete Codebase" section
✅ Every function name mentioned exists in the actual files  
✅ No invented/example code was created
✅ If no relevant code exists, you used "No code found" or similar
❌ NEVER submit responses with fake functions like `calculateTrajectory()`, `processData()`, etc.