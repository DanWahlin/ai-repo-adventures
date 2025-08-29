# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**IMPORTANT**: As Claude runs tests that generate content, always clean up the content once done if it's temporary and not needed for the project.

## Development Commands

- **Build**: `npm run build` - Compiles all TypeScript packages using workspace dependencies
- **Run**: `npm start` - Runs the production MCP server
- **Development**: `npm run dev` - Runs with file watching for development
- **HTML Generation**: `npm run generate-html` - Interactive CLI for creating themed adventure websites

### Linting Commands
- **Lint All**: `npm run lint` - Check code quality and complexity
- **Lint Fix**: `npm run lint:fix` - Auto-fix linting issues where possible
- **Complexity Check**: `npm run lint:complexity` - Focus on cyclomatic complexity analysis

### Testing Commands
- **All Tests**: `npm test` - Runs comprehensive test suite across all packages
- **Unit Tests**: `npm run test:unit` - Core algorithm and component tests
- **Integration Tests**: `npm run test:integration` - LLM provider and repomix integration tests
- **System Tests**:
  - `npm run test:simple` - Basic MCP workflow validation (2 minutes timeout)
  - `npm run test:real-world` - Full system integration with performance monitoring
  - `npm run chat` - Interactive terminal-based testing client
- **HTML Generation Tests**:
  - `npm run test:html` - Quick HTML generation (minimal LLM calls for fast testing)
  - `npm run test:prompts` - LLM prompt analysis and debugging

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

**ALWAYS** run `npm run lint` and fix any linting errors before committing code. The project uses ESLint with cyclomatic complexity analysis to maintain code quality.

### Code Complexity Standards

The project enforces these complexity limits to maintain readability and testability:
- **Cyclomatic Complexity**: ≤10 per function
- **Function Length**: ≤50 lines (excluding blanks/comments)
- **Function Parameters**: ≤4 parameters  
- **Nesting Depth**: ≤4 levels
- **Statements per Function**: ≤20 statements

Functions exceeding these limits should be refactored into smaller, more focused units.

## Architecture Overview

This is a **multi-package monorepo** that gamifies code repository exploration through AI-powered storytelling. The system operates as both an **MCP (Model Context Protocol) server** and a **standalone HTML generator**, using domain-driven architecture principles.

### Multi-Package Architecture

The system is organized into three specialized packages with clear separation of concerns:

1. **MCP Server Package** (`packages/mcp/`) - Protocol implementation and user interface
2. **Core Business Logic** (`packages/core/`) - Domain logic, LLM integration, and shared functionality  
3. **HTML Generator** (`packages/generator/`) - Static site generation for standalone adventures

### Core Architecture Patterns

**Domain-Driven Design**: Each package represents a distinct domain with clear boundaries
**Event-Driven Communication**: MCP protocol orchestrates tool interactions
**Plugin-Based LLM Integration**: Unified interface supporting multiple AI providers
**Template-Based Fallback**: Ensures functionality without LLM dependencies

### Key Architectural Components

#### MCP Server Package (`packages/mcp/`)
**Protocol Layer**: Implements MCP specification with stdio transport
- **`server.ts`**: Dynamic tool registration using Zod schemas, graceful shutdown handling
- **`tools.ts`**: Tool orchestration with 4 main tools (`start_adventure`, `choose_theme`, `explore_path`, `view_progress`)
- **`tools/`**: Individual tool implementations maintaining shared state through singleton pattern

#### Core Package (`packages/core/`)
**Business Logic Layer**: Domain models and LLM integration
- **`adventure/`**: Story generation and state management
  - `AdventureManager`: Orchestrates adventure flow and user interactions
  - `StoryGenerator`: LLM-powered content generation with template fallbacks
- **`analyzer/`**: Repository analysis through repomix subprocess integration
  - `RepoAnalyzer`: Intelligent caching and content analysis coordination
- **`llm/`**: Multi-provider LLM abstraction (OpenAI, Azure OpenAI, GitHub Models, Ollama)
  - `LLMClient`: Unified API with provider auto-detection and response caching
- **`shared/`**: Cross-cutting concerns (configuration, themes, validation, error handling)

#### HTML Generator Package (`packages/generator/`)
**Presentation Layer**: Static site generation with interactive CLI
- **`html-generator.ts`**: Multi-theme site builder with parallel generation support
- **`template-engine.ts`**: Variable substitution and markdown processing
- **`templates/`**: Responsive HTML templates with mobile-first design
- **`themes/`**: CSS theming system with animations and theme-specific visual elements

### Technology Detection System

The `FileSystemScanner` detects technologies through file patterns and extensions. Technologies are returned in UPPERCASE format (e.g., 'TYPESCRIPT', 'JAVASCRIPT'). Each technology maps to themed characters in the adventure stories.

### Configuration and Prompt System

#### Centralized Configuration (`packages/core/src/shared/config.ts`)
All timeouts, limits, and environment variables are centralized:

**Environment Variables**: `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `GITHUB_TOKEN`
**Resource Limits**: File size (10MB), scan depth (3 levels), key files (10), functions/classes in summaries
**Timeouts**: File operations (10s), analysis (30s), LLM requests (15s), cache TTL (5min)

#### Theme System (`packages/core/src/shared/theme.ts`) 
Five built-in themes with extensible custom theme support:
- **Space**: Cosmic exploration with starship terminology
- **Mythical**: Enchanted kingdom with fantasy elements
- **Ancient**: Archaeological exploration with historical themes
- **Developer**: Modern coding environment with technical terminology
- **Custom**: User-defined themes via configuration

#### Prompt Engineering Architecture
- **Modular Prompts**: Separate prompts for story generation, quest content, and completion messages
- **Template-Based System**: Variable substitution with theme-specific guidelines and character mappings
- **Adventure Configuration**: Project-specific quest definitions via `adventure.config.json`

### Advanced Architecture Features

#### Multi-Level Caching Strategy
- **Repomix Content**: 5-minute cache for repository analysis results
- **LLM Responses**: SHA256-based caching with 5-minute TTL
- **Singleton State**: Shared instances across tool calls (`packages/core/src/shared/instances.ts`)

#### Security and Validation
- **Input Sanitization**: Whitelist-based validation preventing injection attacks
- **Path Traversal Protection**: Secure file system access with boundary checks  
- **Resource Limits**: File size, processing time, and memory usage constraints
- **Dual Validation**: Zod schemas + custom validators for comprehensive input validation

#### Multi-Provider LLM Integration (`packages/core/src/llm/`)
- **Provider Support**: OpenAI, Azure OpenAI, GitHub Models, Ollama with auto-detection
- **Graceful Degradation**: Template-based fallbacks when LLM unavailable
- **Response Caching**: SHA256-based caching reduces redundant API calls
- **Error Recovery**: Intelligent retry logic and fallback content generation

#### Performance Optimizations
- **Background Processing**: Repomix pre-generation during server startup
- **Parallel Generation**: Multi-theme HTML generation with concurrent processing
- **Targeted Content**: Quest-specific file analysis vs full repository scanning
- **Resource Monitoring**: Memory and CPU usage tracking in comprehensive tests

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

### Build System and Toolchain

#### Monorepo Management
- **npm Workspaces**: Dependency hoisting and workspace isolation
- **TypeScript Project References**: Efficient incremental compilation across packages
- **Lerna Integration**: Independent versioning for published packages
- **ESM Modules**: Modern module system with explicit `.js` imports in TypeScript

#### Release and Publishing
- **Conventional Commits**: Semantic versioning automation
- **GitHub Actions**: Automated releases on main branch pushes  
- **npm Publishing**: Public packages with proper access control
- **Version Synchronization**: Coordinated releases across dependent packages

#### Asset Management and Static Resources
- **Responsive CSS System**: Mobile-first design with theme-specific visual elements
- **Static Asset Pipeline**: Automatic copying of templates, themes, and images
- **GitHub Integration**: Automatic logo and repository linking
- **Theme-Specific Icons**: Visual differentiation for navigation elements

### Configuration for Claude Desktop

```json
{
  "mcpServers": {
    "repo-adventure": {
      "command": "node",
      "args": ["/path/to/ai-repo-adventures/dist/server.js"],
      "cwd": "/path/to/target/project"
    }
  }
}
```

**Note**: The `cwd` should point to the project you want to explore, not this MCP server's directory.

## Architectural Principles

### Everything is Dynamic

Stories are generated based on the actual codebase being analyzed:
- Adventures are created dynamically based on project structure, file count, and complexity
- Content reflects the real technologies, files, and patterns found in each project
- Progress tracking adapts to however many adventures are generated

Key implications:
- No hardcoded adventure counts
- No assumptions about specific file names or structures
- No fixed story templates
- Everything scales based on the actual project being explored
```

### HTML Generation Commands

- **Interactive Generation**: `npm run generate-html` - CLI wizard for theme selection and output configuration
- **Quick Testing**: `npm run test:html` - Fast HTML generation with minimal LLM calls
- **Specific Theme**: `npm run test:html -- --theme=mythical` - Generate specific theme for testing
- **All Themes**: `node packages/generator/bin/cli.js --theme all --output tests/public --overwrite --max-quests 1` - Generate all themes with parallel processing