# @codewithdan/ai-repo-adventures-core

Core functionality for AI Repo Adventures - a tool that transforms code repositories into interactive adventure stories using AI.

## Overview

This package provides the core functionality used by both the HTML generator and MCP server packages. It includes:

- **Adventure Management**: Story generation and quest orchestration
- **Repository Analysis**: Code analysis and pattern detection using repomix
- **LLM Integration**: Multi-provider support (OpenAI, Azure OpenAI, GitHub Models, Ollama)
- **Theme System**: Built-in themes (space, mythical, ancient, developer) with custom theme support
- **Configuration**: Shared configuration and validation utilities

## Installation

```bash
npm install @codewithdan/ai-repo-adventures-core
```

## Usage

This package is primarily used as a dependency by:
- `@codewithdan/ai-repo-adventure-generator` - HTML generator CLI
- `@codewithdan/ai-repo-adventure-mcp` - MCP server for Claude

### Example

```typescript
import {
  AdventureManager,
  RepoAnalyzer,
  LLMClient,
  ThemeManager
} from '@codewithdan/ai-repo-adventures-core';

// Initialize components
const llmClient = new LLMClient();
const repoAnalyzer = new RepoAnalyzer('/path/to/repo');
const adventureManager = new AdventureManager(llmClient, repoAnalyzer);

// Generate an adventure
const theme = 'space';
const adventure = await adventureManager.startAdventure(theme);
```

## Modules

### Adventure Module
- `AdventureManager`: Main orchestrator for adventures
- `StoryGenerator`: AI-powered story generation
- `AdventureConfig`: Configuration management

### Analyzer Module
- `RepoAnalyzer`: Repository analysis using repomix
- `FileSystemScanner`: Technology detection

### LLM Module
- `LLMClient`: Unified interface for multiple LLM providers
- Support for OpenAI, Azure OpenAI, GitHub Models, Ollama

### Shared Module
- `ThemeManager`: Theme management and customization
- `InputValidator`: Input validation utilities
- `Config`: Centralized configuration
- `ErrorHandler`: Error handling utilities

## License

MIT

## Author

Dan Wahlin

## Repository

[GitHub](https://github.com/danwahlin/ai-repo-adventures)