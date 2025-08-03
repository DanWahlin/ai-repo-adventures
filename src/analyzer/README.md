# Analyzer Module

This module provides comprehensive code analysis capabilities for understanding project structure, dependencies, and code patterns.

## 📁 Files Overview

### Core Analyzer
- **`project-analyzer.ts`** - Main orchestrator that coordinates all analysis activities
- **`index.ts`** - Clean exports for easy importing

### Specialized Analyzers
- **`code-analyzer.ts`** - Parses source code to extract functions, classes, and patterns
- **`file-system-scanner.ts`** - Scans directory structure and detects technologies
- **`dependency-parser.ts`** - Analyzes package.json and dependency relationships
- **`code-flow-analyzer.ts`** - Maps execution flow and call relationships
- **`linguist-analyzer.ts`** - Language detection and file categorization

### Utilities
- **`shared-analyzer-utils.ts`** - Common utilities shared across analyzers
- **`language-mapping.ts`** - File extension to language mapping
- **`types.ts`** - TypeScript interfaces for analysis results

## 🚀 Getting Started

```typescript
import { ProjectAnalyzer } from './analyzer/index.js';

const analyzer = new ProjectAnalyzer();
const projectInfo = await analyzer.analyzeProject('/path/to/project');
```

## 🏗️ Architecture

The analyzer system uses a modular approach:
1. **FileSystemScanner** → Discovers files and project structure  
2. **CodeAnalyzer** → Extracts code elements (functions, classes)
3. **DependencyParser** → Maps dependencies and relationships
4. **CodeFlowAnalyzer** → Traces execution paths
5. **LinguistAnalyzer** → Determines languages and categorizes files