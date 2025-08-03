# Adventure Module

This module handles all adventure and storytelling functionality for the MCP Repo Adventure system.

## 📁 Files Overview

### Core Components
- **`adventure-manager.ts`** - Main orchestrator for adventure state and user interactions
- **`story-generator.ts`** - Handles LLM-based story generation with project context
- **`dynamic-story-generator.ts`** - Advanced story generation with theme support

### Supporting Services
- **`theme-manager.ts`** - Manages adventure themes (space, mythical, ancient)
- **`file-content-manager.ts`** - Handles file reading and content preparation
- **`adventure-path-generator.ts`** - Generates exploration paths based on project structure

## 🚀 Getting Started

```typescript
import { AdventureManager } from './adventure/index.js';

const manager = new AdventureManager();
const story = await manager.initializeAdventure(projectInfo, 'space');
```

## 🏗️ Architecture

The adventure system follows a pipeline pattern:
1. **Analysis** → Project structure is analyzed
2. **Generation** → Story and characters are created
3. **Interaction** → User choices drive exploration
4. **Discovery** → Code insights are revealed through narrative