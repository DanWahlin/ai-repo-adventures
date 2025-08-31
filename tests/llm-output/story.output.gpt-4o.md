# The Architecture of Adventure: A Developer's Guide

This repository is the cornerstone of an interactive experience generator that crafts unique adventures from codebases through dynamic storytelling. By analyzing source files, generating themes, configuring content, and rendering web-based quests, it enables developers to explore technical artifacts in a gamified way. The system integrates an LLM backend, a quest builder, a modular pipeline, and a configuration-driven theme manager, all orchestrated to deliver customized narratives.

**Adventure Awaits** – Choose your quest wisely to uncover the architecture beneath it all.

**🗺️ Available Quests:**

**Quest 1: HTML Generator & Static Site Pipeline** - Explore the **html-generator.ts**, **template-engine.ts**, and **asset-manager.ts** files to understand how adventures are rendered as engaging static websites with templating and asset management tools.
**Quest 2: MCP Tool Interface** - Inspect the **server.ts** and **tools.ts** files where interfaces for managing adventure selection, quest exploration, and progress tracking are implemented through MCP tooling.
**Quest 3: Quest Generation Engine** - Dive into **adventure-manager.ts**, **story-generator.ts**, and **adventure-config.ts** to see how the system constructs dynamic quests by combining project analysis, storytelling prompts, and configuration.
**Quest 4: Code Analysis & Content Pipeline** - Analyze the **repo-analyzer.ts** and **llm-client.ts** files to uncover how codebases are parsed and API calls are structured to generate contextually aware prompts for adventure building.
**Quest 5: Configuration & Theme System** - Explore **config.ts**, **theme.ts**, **theme-manager.ts**, **input-validator.ts**, and **adventure-config.ts** to see how configurations, themes, and validations power the customization and thematic consistency of the generator.
