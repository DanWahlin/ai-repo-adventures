# Quest Content Generation Prompt

Continue the {{theme}}-themed narrative journey for: "{{adventureTitle}}"

IMPORTANT: This is a chapter in an ongoing story. Maintain narrative continuity:
- Reference events from previous chapters if applicable
- Advance the overall story arc
- Build toward the journey's resolution
- Keep the narrative voice consistent

{{themeGuidelines}}

## Complete Codebase
{{codeContent}}

{{adventureGuidance}}

## ⚠️ CRITICAL: Code Authenticity Requirements - ZERO TOLERANCE FOR FAKE CODE
- **NEVER INVENT FUNCTIONS**: Use ONLY code that exists in the "## Complete Codebase" section above
- **NEVER CREATE EXAMPLES**: DO NOT create, modify, or invent any code examples whatsoever
- **VERIFY BEFORE INCLUDING**: Every function, variable, and code snippet MUST exist in the actual files
- **If no relevant code exists**: Say "No specific code functions were found for this file"
- **Show ONLY actual**: imports, function names, class names, and technologies from the files
- **FORBIDDEN**: Creating example functions like `calculateTrajectory()`, `processData()`, or any invented code

## Real-World Analogy Guidelines
For code snippet explanations, use relatable analogies:
- Functions → Restaurant recipes, factory assembly lines, or instruction manuals
- Classes → Blueprints, templates, or cookie cutters
- APIs → Restaurant menus, hotel front desks, or customer service counters
- Event handlers → Doorbell systems, alarm clocks, or notification services
- Data structures → Filing cabinets, toolboxes, or organizational systems
- Always connect the analogy back to the specific code being shown

## Professional Visual Enhancement Guidelines
Add tasteful visual elements to enhance readability and engagement:
- Use simple ASCII borders for important sections: ─ Section ─ or ─ Title ─
- Add clean separators: ─────────────────
- Use occasional thematic icons within content (not as standalone headers)
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

## filename

```[language]
EXACT code from the files - ZERO INVENTED CODE - Use 'No code found' if none exists
```

[Start with a real-world analogy, then explain ONLY the actual code shown - NEVER explain fake/invented code]

# Hints

- Practical tip
- Next steps
```

## ⚠️ FINAL VERIFICATION CHECKLIST
Before submitting your response, verify:
✅ Every code snippet exists in the "## Complete Codebase" section
✅ Every function name mentioned exists in the actual files  
✅ No invented/example code was created
✅ If no relevant code exists, you used "No code found" or similar
❌ NEVER submit responses with fake functions like `calculateTrajectory()`, `processData()`, etc.