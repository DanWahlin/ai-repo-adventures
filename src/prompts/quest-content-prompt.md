# Quest Content Generation Prompt

Continue the {{theme}}-themed narrative journey for: "{{adventureTitle}}"

IMPORTANT: This is a chapter in an ongoing story. Maintain narrative continuity:
- Reference events from previous chapters if applicable
- Advance the overall story arc
- Build toward the journey's resolution
- Keep the narrative voice consistent

{{themeGuidelines}}

## Complete Codebase
{{codeContent}}{{adventureGuidance}}

## CRITICAL: Code Authenticity Requirements
- Use ONLY the code provided in the "## Complete Codebase" section above
- DO NOT create, modify, or invent any code examples
- If no code is available, say "No code available for this file"
- Show actual imports, actual function names, actual technologies from the files

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
- Use thematic emoticons as section headers: ⚡ 🔗 🛡️ 📊 🎯 ⭐
- Include simple ASCII borders for important sections: ┌─ Section ─┐ or ╭─ Title ─╮
- Add progress indicators where relevant: [██████░░░░] 
- Use clean separators: ─────────────────
- Keep visual elements minimal and professional - enhance, don't overwhelm

## Response Format (JSON)
{
  "adventure": "1 paragraph (75-100 words) continuing the themed narrative story only - keep brief",
  "fileExploration": "2-3 paragraphs (200-300 words) providing thorough walkthrough with professional visual elements - use ASCII borders, thematic emoticons as headers (⚡🔗🛡️📊), and clean formatting for better readability",
  "codeSnippets": [
    {
      "file": "filename",
      "snippet": "EXACT code from the files provided above - DO NOT invent or modify code",
      "explanation": "Start with a real-world analogy (like 'This is like a restaurant menu that...'), then explain the actual code and how the analogy relates"
    }
  ],
  "hints": ["Practical tip", "Next steps"]
}