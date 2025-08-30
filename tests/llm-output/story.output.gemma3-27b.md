# The Repository Deep Dive

Welcome, intrepid developer, to the Repository Deep Dive! This isn’t a quest for gold or glory, but a meticulous exploration of a codebase. Your mission: to understand the architecture, components, and functionality of a software project. Each "quest" will guide you through specific modules, exposing their inner workings and how they contribute to the overall system. Prepare to examine configuration files, analyze data flows, and unravel the logic that powers this application. 

**Adventure Awaits** – Choose your quest wisely, brave adventurer!

**🗺️ Available Quests:**

**Quest 1: Core Configuration & Shared Components** - Explore the foundation of the project, where vital configuration settings and essential shared components reside, focusing on **packages/core/src/shared/config.ts** and **packages/core/src/shared/theme.ts**.
**Quest 2: Code Analyzer & Context Generation** - Investigate the system's ability to introspect the codebase, examining how it captures context and prepares it for analysis, utilizing **packages/core/src/analyzer/repo-analyzer.ts** and **packages/core/src/llm/llm-client.ts**.
**Quest 3: Adventure Management & Story Generation** - Explore the central logic responsible for orchestrating the 'adventure', including generating stories and defining quests, using **packages/core/src/adventure/adventure-manager.ts** and **packages/core/src/adventure/story-generator.ts**.
**Quest 4: Static Site Generation & Asset Pipeline** - Delve into the website building process, from assembling assets to rendering HTML, focusing on **packages/generator/src/cli/html-generator.ts** and **packages/generator/src/cli/asset-manager.ts**.
**Quest 5: Tooling & Server Interface** - Discover the communication layer enabling interaction with the repository analysis, examining **packages/mcp/src/server.ts** and **packages/mcp/src/tools.ts**.
