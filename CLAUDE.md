# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build**: `npm run build` - Compiles TypeScript to `/dist` directory
- **Run**: `npm start` - Runs the MCP server via tsx
- **Development**: `npm run dev` - Runs with file watching for development

### Testing Commands
- **All Tests**: `npm test` - Runs comprehensive test suite
- **Unit Tests**: `npm run test:unit` - Core algorithm and component tests
- **Integration Tests**: `npm run test:integration` - LLM integration tests
- **Individual Test Suites**: 
  - `npm run test:unit:algorithms` - Adventure algorithm tests
  - `npm run test:unit:llm` - LLM client tests
  - `npm run test:simple` - Basic MCP workflow test
  - `npm run test:real-world` - Full MCP integration test

### LLM Configuration (Optional)
The system works without LLM configuration (using fallback templates), but LLM enables dynamic story generation:
```bash
cp .env.example .env
# Configure LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
```

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

The system follows a **modular domain-driven architecture**:

1. **Analysis Domain** (`src/analyzer/`) - Project structure analysis and code understanding
2. **Adventure Domain** (`src/adventure/`) - Story generation and user interaction management  
3. **Shared Infrastructure** (`src/shared/`) - Configuration, error handling, and utilities
4. **MCP Server Layer** (`src/server.ts`, `src/tools.ts`) - Protocol implementation and tool orchestration

### Key Architectural Components

**`src/server.ts`** - Main MCP server that:
- Dynamically loads and registers tools from `src/tools.ts`
- Converts Zod schemas to JSON Schema for MCP tool registration
- Provides centralized error handling with `McpError` types
- Uses stdio transport for local file system access

**`src/tools.ts`** - Tool orchestration layer:
- Defines 4 main MCP tools: `start_adventure`, `choose_theme`, `explore_path`, `view_progress`
- Uses Zod schemas for input validation and automatic JSON Schema generation
- Maintains shared state through singleton `AdventureManager` instance
- Provides user-friendly error formatting

### Analysis Domain (`src/analyzer/`)

Modular analysis system with specialized components:
- **`ProjectAnalyzer`** - Main orchestrator coordinating all analysis activities
- **`FileSystemScanner`** - Directory traversal and technology detection via file patterns
- **`CodeAnalyzer`** - Source code parsing for functions, classes, and patterns
- **`DependencyParser`** - Package.json analysis and dependency mapping
- **`LinguistAnalyzer`** - Language detection using linguist-js
- **`CodeFlowAnalyzer`** - Execution flow and call relationship mapping

### Adventure Domain (`src/adventure/`)

Story generation and interaction management:
- **`AdventureManager`** - Main orchestrator for adventure state and user interactions
- **`StoryGenerator`** - LLM-based story generation with project context
- **`DynamicStoryGenerator`** - Advanced story generation with theme support and fallback templates
- **`ThemeManager`** - Manages 3 themes (space, mythical, ancient) with character mappings
- **`FileContentManager`** - File reading and content preparation for adventures
- **`AdventurePathGenerator`** - Generates exploration paths based on project structure

### Shared Infrastructure (`src/shared/`)

Centralized utilities and configuration:
- **`config.ts`** - All timeouts, limits, and environment configuration
- **`error-handling.ts`** - Standardized error types and context handling
- **`theme.ts`** - Theme validation and formatting utilities
- **`instances.ts`** - Singleton instances for state management
- **`cache.ts`** - LRU cache implementation for performance optimization

### Technology Detection System

The `FileSystemScanner` detects technologies through file patterns and extensions. Technologies are returned in UPPERCASE format (e.g., 'TYPESCRIPT', 'JAVASCRIPT'). Each technology maps to themed characters in the adventure stories.

### Configuration System (`src/shared/config.ts`)

All configuration is centralized for easy maintenance:

**Environment Variables** (`ENV_CONFIG`):
- `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` - LLM provider configuration
- `GITHUB_TOKEN` - For GitHub Models integration

**Timeouts** (`TIMEOUTS`):
- `FILE_READ`: 10000ms - Individual file read operations
- `FILE_ANALYSIS`: 30000ms - Code analysis operations  
- `LLM_REQUEST`: 15000ms - LLM API calls
- `LLM_CACHE`: 300000ms - Response cache TTL

**Analysis Limits** (`ANALYSIS_LIMITS`):
- `MAX_FILE_SIZE_MB`: 10 - Skip files larger than this
- `MAX_SCAN_DEPTH`: 3 - Directory traversal depth
- `KEY_SOURCE_FILES`: 10 - Number of key files to analyze
- `TOP_FUNCTIONS`: 20 - Functions to include in summaries
- `TOP_CLASSES`: 5 - Classes to include in summaries

### State Management

The system uses singleton instances (`src/shared/instances.ts`):
- `optimizedAnalyzer` - Shared `ProjectAnalyzer` instance with caching
- `adventureManager` - Single instance maintaining adventure state across tool calls

### Error Handling

Standardized error handling with custom error types:
- `AnalysisError` - File system and code analysis failures
- `StoryGenerationError` - LLM and story generation issues  
- `AdventureError` - Adventure state and user interaction problems
- All errors include context (theme, project type, file paths, etc.)

### LLM Integration

The `LLMClient` (`src/llm/llm-client.ts`):
- Supports multiple providers (OpenAI, Azure OpenAI, GitHub Models, Ollama)
- Gracefully handles missing API keys (fallback to template-based stories)
- Implements response caching with SHA256 hash keys
- Provider auto-detection from base URL

### MCP Tool Flow

The typical user interaction flow:
1. **`start_adventure`** - Analyzes codebase, returns available themes
2. **`choose_theme`** - Generates story and adventures for selected theme
3. **`explore_path`** - Explores specific adventures (can be called multiple times)
4. **`view_progress`** - Shows completion status and remaining adventures

### Important Implementation Details

**Module System**: 
- Uses ESM modules (`"type": "module"` in package.json)
- All imports must include `.js` extension even for TypeScript files
- Index files provide clean exports for each domain

**Testing Considerations**:
- Unit tests pass without LLM configuration
- Integration tests gracefully skip when LLM unavailable
- Simple/real-world tests require full MCP workflow (will fail without LLM)

**File Organization After Recent Refactoring**:
- `src/index.ts` renamed to `src/server.ts` for clarity
- Story generation consolidated in `src/adventure/` (no separate `src/story/`)
- All domains have `index.ts` files for clean imports
- Configuration centralized in `src/shared/config.ts`

### Configuration for Claude Desktop

```json
{
  "mcpServers": {
    "repo-adventure": {
      "command": "node",
      "args": ["/path/to/mcp-repo-adventure/dist/server.js"],
      "cwd": "/path/to/target/project"
    }
  }
}
```

**Note**: The `cwd` should point to the project you want to explore, not this MCP server's directory.