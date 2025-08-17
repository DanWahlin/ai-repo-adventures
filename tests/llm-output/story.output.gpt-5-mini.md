# 🚀 Starpath: The Repository Expedition

You board the research vessel Starpath, tasked with mapping the behavior and secrets of an intelligence system that generates themed adventures from repositories using LLMs and Repomix analysis; your crew includes the Quest Orchestrator, the Story Engine, the Analyzer, and the Mission Protocol, each coordinating to scan code, craft narratives, and serve interactive MCP tools to users. As you inspect the ship's modules — from MCP protocol handlers to prompt engineering, repomix subprocess feeds, and multi-provider LLM clients — you will learn how stories and quests are produced, cached, and served to explorers interacting through the MCP toolset. Your mission is to understand how code turns repositories into guided, theme-driven adventures.

**Adventure Awaits** – Choose your quest wisely, brave adventurer!

**🗺️ Available Quests:**

**🚀 Quest 1: Command Deck — MCP Protocol & Tool Registry** - You explore the command deck where MCP protocol handlers register tools and connect stdio transport, examining how the server wires ListTools and CallTool requests and starts the adventure pre-generation flow via run and main.
**⚡ Quest 2: Mission Console — The MCP Tools Interface** - You venture into the mission console to inspect the four MCP tools that users call to start adventures, choose themes, explore quests, and view progress and learn how those handlers interact with the adventure manager.
**🚀 Quest 3: Quest Bridge — Adventure Orchestration & State** - You explore the Quest Bridge where AdventureManager initializes adventures, validates choices, generates or retrieves quest content, and tracks completion and progressPercentage to guide the expedition's status.
**⚡ Quest 4: Story Engine — LLM Prompts and Quest Generation** - You explore the Story Engine to see how story and quest generation is performed with LLM calls, prompt construction, markdown parsing, and validation to produce StoryResponse and QuestContent for each mission.
**🚀 Quest 5: Recon Bay — Repomix Integration & Targeted Analysis** - You explore the Recon Bay to learn how repomix is invoked as a subprocess to build full project context or targeted file content, including caching, timeouts, and safe project path validation used by generateRepomixContext and generateTargetedContent.
