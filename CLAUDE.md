# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build**: `npm run build` - Compiles TypeScript to `/dist` directory
- **Run**: `npm start` - Runs the MCP server via tsx
- **Development**: `npm run dev` - Runs with file watching for development

## Code Review Policy

**ALWAYS** use the code-reviewer agent after writing or significantly modifying code. This includes:
- New files or components
- Major refactoring or architectural changes
- Bug fixes that affect multiple functions
- Feature additions or enhancements
- Performance optimizations
- Security-related changes

**Exception**: Skip code review only for trivial changes like:
- Single-line typo fixes
- Comment updates
- Minor formatting adjustments
- Simple variable renames

## Architecture Overview

This is a **Model Context Protocol (MCP) server** that gamifies code repository exploration through interactive storytelling. The server operates as a stdio-based MCP server using the `@modelcontextprotocol/sdk`.

### Core Architecture Pattern

The system follows a **three-layer pipeline architecture**:

1. **Analysis Layer** (`ProjectAnalyzer`) - Scans filesystem, detects technologies, analyzes project structure
2. **Story Generation Layer** (`StoryGenerator`) - Transforms technical metadata into themed narratives with characters
3. **Adventure Management Layer** (`AdventureManager`) - Handles user interaction state and choice progression

### Key Components

**`src/index.ts`** - Main MCP server that:
- Dynamically loads tools from the `/tools` directory
- Converts Zod schemas to JSON Schema for MCP tool registration
- Provides centralized error handling and validation
- Uses stdio transport for local file system access

**`src/tools/`** - Modular tool system:
- Each tool is self-contained with its own directory (`start_adventure/`, `choose_theme/`, etc.)
- Tools use Zod schemas for input validation and automatic JSON Schema generation
- Shared instances maintain state across tool calls via `src/shared/instances.ts`
- Dynamic tool registration via `src/tools/tools.ts` aggregator

**`src/analyzer/ProjectAnalyzer.ts`** - File system scanner that:
- Recursively scans directories (max depth 3) while skipping `node_modules`, `.git`, etc.
- Maps file patterns to technology detection via `TECH_INDICATORS` object
- Returns structured `ProjectInfo` with detected technologies and project metadata

**`src/story/StoryGenerator.ts`** - Narrative engine that:
- Contains 3 predefined themes (space, medieval, ancient) with character templates
- Maps detected technologies to themed characters (Database → "Data Archivist", API → "Commander", etc.)
- Generates contextual introductions and choice paths based on project analysis

**`src/adventure/AdventureManager.ts`** - State machine that:
- Maintains adventure state (visited characters, explored areas, progress tracking)
- Parses user choices and routes to appropriate handlers
- Generates dynamic narratives and next-choice options

### Technology Detection System

The `ProjectAnalyzer` uses a mapping system where each technology has file/directory indicators:
- React: `['react', 'jsx', 'tsx', '.jsx', '.tsx']`
- Database: `['database', 'db', 'sql', 'mongodb', 'postgres', 'mysql']`
- API: `['api', 'rest', 'graphql', 'routes', 'controllers']`

This drives character generation where each detected technology gets a themed character representation.

### MCP Integration

The server exposes tools that follow the MCP tool pattern:
- Schema-defined input parameters using JSON Schema
- Structured text responses with narrative content
- Error handling with `McpError` types
- Designed for integration with Claude Desktop, GitHub Copilot, and other MCP clients

### Configuration for Claude Desktop

```json
{
  "mcpServers": {
    "repo-adventure": {
      "command": "node",
      "args": ["/path/to/mcp-repo-adventure/dist/index.js"],
      "cwd": "/path/to/target/project"
    }
  }
}
```

The `cwd` should point to the project you want to explore, not this MCP server's directory.