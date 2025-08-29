# Repository Adventure - Technical Documentation

This codebase is designed for creating interactive project analysis and adventure generation tools. It integrates a core logic module for analyzing git repositories and formats story-driven content using AI-assisted LLMs. The system is built with modular components to facilitate theme-based story creation and functionality for organizing and exploring repository analysis results. It employs tools like OpenAI/LLMs, Zod, and configuration management for robust extensibility across various adventure scenarios.

**Documentation Sections** – Select a technical area to explore the implementation:

**🗺️ Available Quests:**

**Quest 1: MCP Tool Interface** - Explore the **server architecture** and toolset, where **server.ts** and **tools.ts** implement the core MCP tool interface and interaction handlers.
**Quest 2: Quest Generation Engine** - Dive into the **adventure generation logic**, focusing on workflows in **adventure-manager.ts**, **story-generator.ts**, and **adventure-config.ts** to initialize quests, generate content, and manage theme-driven story creation.
**Quest 3: Code Analysis & Content Pipeline** - Understand the **repository analysis pipeline** and LLM-driven content generation via **repo-analyzer.ts** for extracting insights and **llm-client.ts** for LLM integrations.
**Quest 4: Configuration & Theme System** - Examine the centralized **configuration and theme management**, featured in **config.ts**, **theme.ts**, and **input-validator.ts**, which provide dynamic customization and input validation.
**Quest 5: Foundation & Utilities** - Analyze foundational utilities like **adventure-config.ts** used for parsing configuration files, managing project inputs, and producing formatted prompts.
