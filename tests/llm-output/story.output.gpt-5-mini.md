# 🚀 Celestial Repository: The Starfield of Adventures

You join the crew of the survey vessel Starfield, tasked with charting an intelligent repository that turns code into interactive missions; the system analyzes projects with Repomix, crafts themed narratives via LLMs, and exposes four MCP tools to steer the experience from a command loop over stdio. As the ship's navigator you will examine how the MCP server registers tools, how the adventure manager orchestrates state and quest execution, how the repo analyzer gathers targeted context, and how the LLM client speaks to multiple providers to generate story content, code snippets, and completion summaries. Your mission is to map these systems so the crew can guide explorers through curated quests across the codebase.

**Adventure Awaits** – Choose your quest wisely, brave adventurer!

**🗺️ Available Quests:**

**🚀 Quest 1: MCP Beacon — The Protocol Interface** - You explore the MCP server implementation to understand how the Starfield exposes the four tool commands over stdio and preloads repo context for incoming calls, focusing on server setup, handler registration, and graceful shutdown in server.ts.
**⚡ Quest 2: Tool Console — The Four Mission Controls** - You explore the collection of MCP tools that form the user interface to the adventure system and learn how start_adventure, choose_theme, explore_quest, and view_progress are wired together in tools.ts.
**🚀 Quest 3: Helmsman's Log — Adventure Orchestration** - You explore the AdventureManager to see how the ship manages story initialization, quest execution, progress tracking, and caching when interacting with LLM-driven content in adventure-manager.ts.
**⚡ Quest 4: Story Engine — LLM Narrative Crafting** - You explore the StoryGenerator to learn how prompts, theme validation, and LLM calls produce the story, quest lists, and quest content including parsing and JSON validation in story-generator.ts.
**🚀 Quest 5: Survey Array — Repomix Analysis Pipeline** - You explore the RepoAnalyzer to discover how targeted and full project content is generated via repomix subprocesses, including caching, timeouts, and security checks in repo-analyzer.ts.
