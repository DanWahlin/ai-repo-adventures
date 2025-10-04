# AI Repo Adventures

![Adventure Awaits](images/adventure-awaits.png)

A fun, Model Context Protocol (MCP) server and/or HTML generator that transforms code repositories into interactive adventures! Explore codebases through engaging stories with themes and characters that represent different technologies and architectural components.

## Features

🎮 **Story-based Code Exploration** - Turn learning about codebases into a "choose your own adventure" story
📚 **Educational Analogies** - Complex technical concepts explained through relatable story elements  
🌟 **Multiple Themes** - Choose from Space, Medieval, or Ancient Civilization themes
🤖 **Character-Based Learning** - Meet characters that represent different technologies (Database Dragons, API Messengers, etc.)
🔍 **Choose Your Own Adventure** - Interactive exploration paths through the codebase
🌐 **HTML Adventure Generation** - Export your adventures as beautiful, standalone HTML websites
🚀 **Auto-Launch Web Server** - Automatically starts a local server and opens your adventure in the browser
🎨 **Themed Styling** - Rich CSS themes with gradient titles, code highlighting, and responsive design

## How It Works

1. **Start Adventure** - The server analyzes your project using repomix and presents theme options
2. **Choose Theme** - Select from Space Exploration, Mythical Kingdom, or Ancient Civilization
3. **Explore Quests** - Follow dynamically generated quest paths through your codebase
4. **View Progress** - Track your exploration progress and see completed areas
5. **Learn Through Story** - Understand complex systems through engaging LLM-generated narratives
6. **Export to HTML** - Generate beautiful web adventures for sharing or offline exploration

## Architecture Flow

```mermaid
graph TD
    A[MCP Server Package] -->|start_adventure| B[Core: RepoAnalyzer]
    B --> C[Generate Repomix Content]
    C --> D[Return Theme Options]
    
    A -->|choose_theme| E[Core: AdventureManager]
    E --> F[Core: StoryGenerator]
    F --> G[Load adventure.config.json]
    G --> H[Core: LLM Client]
    H --> I[Generate Story + Quests]
    I --> J[Return Themed Story]
    
    A -->|explore_quest| K[Core: Find Quest]
    K --> L[Core: Generate Targeted Content]
    L --> M[Core: LLM Quest Content]
    M --> N[Core: Update Progress]
    N --> O[Return Quest Details]
    
    A -->|view_progress| P[Core: Get Progress State]
    P --> Q[Return Completion Stats]
    
    R[Generator Package] --> E
    R --> S[Generator: TemplateEngine]
    S --> T[Generator: Generate Themed CSS]
    S --> U[Generator: Format Markdown Content]
    R --> V[Generator: Copy GitHub Logos]
    R --> W[Generator: Build Quest Pages]
    R --> X[Generator: Auto-Launch Server]
    R --> Y[Generator: Open Browser]
    
    style B fill:#e8f5e8
    style E fill:#fff3e0
    style H fill:#e1f5fe
    style R fill:#f3e5f5
    style S fill:#e8f5e8
```

## 🔍 Project Context Gathering & LLM Integration

### Data Flow Architecture

```mermaid
graph TD
    A[User: start_adventure] --> B[Core: RepoAnalyzer]
    B --> C[Repomix CLI]
    C --> D[Complete Codebase Content]
    
    B --> E[adventure.config.json]
    E --> F[Adventure Guidance]
    
    D --> G[Core: LLM Prompt Builder]
    F --> G
    
    G --> H[Core: LLM API]
    H --> I[Generated Story & Quests]
    
    J[Generator: HTML CLI] --> K[Core: AdventureManager]
    K --> L[Core: StoryGenerator] 
    L --> H
    J --> M[Generator: TemplateEngine]
    M --> N[Generator: Theme CSS Files]
    M --> O[Generator: HTML Templates]
    J --> P[Generator: Markdown Formatter]
    P --> Q[Generator: Code Highlighting]
    P --> R[Generator: File Path Links]
    J --> S[Generator: HTTP Server]
    J --> T[Generator: Auto Browser Launch]
    
    U[Core: Input Validator] --> B
    U --> K
    V[Core: Cache System] --> C
    V --> H
    
    style H fill:#e1f5fe
    style J fill:#f3e5f5
    style N fill:#e8f5e8
    style V fill:#fff3e0
```

### Phase 1: Project Analysis & Context Gathering

#### Step 1: Initial Project Scan
**Location:** `packages/core/src/analyzer/repo-analyzer.ts`

When `start_adventure` is called, the system:
1. **Executes Repomix CLI** as a subprocess (`npx repomix`)
2. **Captures stdout** containing the entire codebase structure and content
3. **Caches result** with SHA256 hash for 5-minute reuse

**Repomix Output Structure:**
```markdown
# Project Summary
- Files: 50
- Languages: TypeScript (85%), JavaScript (15%)

## File: src/server.ts
```typescript
class RepoAdventureServer {
  constructor() { ... }
  setupHandlers() { ... }
}
```
// ... continues for ALL files in the project
```

#### Step 2: Quest Config Loading
**Location:** `packages/core/src/shared/adventure-config.ts`

Optionally loads `adventure.config.json` from the project root, which provides:
- Predefined quest titles and descriptions
- Important files and functions to highlight
- Workshop-style exploration guidance

### Phase 2: LLM Prompt Construction

#### What Gets Sent to LLM for Initial Story Generation

The system sends a comprehensive prompt containing:

1. **Complete Repomix Output** - Every file in the project with full content
2. **Quest Config Guidance** (if available) - Predefined quests with highlighted functions
3. **Theme Guidelines** - Vocabulary, metaphors, and style rules for the selected theme
4. **Critical Instructions** - Rules for code authenticity and story structure

**Example prompt structure:**
```markdown
You are a technical education specialist creating story-based workshops...

## Complete Codebase
[Full repomix output with all files]

## Quest Guidance
Quest: "Core MCP Server"
Files:
    File: src/server.ts
    Key Functions:
      - RepoAdventureServer.setupHandlers: Registers handlers
      [... more highlights]

## Theme Guidelines
[Space/Mythical/Ancient vocabulary and mappings]

## Response Format
Return JSON with story and adventures array
```

#### LLM Response
The LLM generates:
- A 2-3 paragraph themed story introducing the codebase
- 2-6 dynamic quests based on project complexity
- Each quest includes specific files to explore

### Phase 3: Individual Quest Content Generation

#### What Gets Sent for Each Quest

When exploring a specific quest:

1. **Targeted File Content** - Only files relevant to that quest
2. **Workshop Highlights** - Specific functions to explore step-by-step
3. **Theme Continuity** - Same vocabulary for consistent narrative
4. **Code Authenticity Rules** - Must use actual code from files

**Example quest prompt:**
```markdown
Continue the space-themed exploration for: "Command Protocols"

## Complete Codebase
[Only relevant files for this quest]

## Workshop Highlights (Focus Areas)
Create a step-by-step workshop for:
- RepoAdventureServer.constructor: Creates MCP server
- RepoAdventureServer.setupHandlers: Registers handlers
[... more function highlights]

## Response Format
Return JSON with quest narrative, code snippets, and hints
```

### Quest Configuration System

#### adventure.config.json Structure

Projects can include an `adventure.config.json` file to guide story and quest generation:

```json
{
  "quests": [
    {
      "title": "Core MCP Server",
      "description": "Explore the MCP protocol implementation",
      "files": [
        {
          "path": "src/server.ts",
          "description": "Main MCP server",
          "highlights": [
            {
              "name": "RepoAdventureServer.setupHandlers",
              "description": "Registers ListTools and CallTool handlers"
            }
          ]
        }
      ]
    }
  ]
}
```

This configuration:
- **Guides quest titles** toward important code areas
- **Highlights key functions and members** for workshop-style exploration
- **Provides context** for more accurate story generation

### Context Flow Summary

| Component | Purpose | What It Adds to LLM Context |
|-----------|---------|----------------------------|
| **Repomix** | Full codebase analysis | Actual code, file structure, all content |
| **Quest Config** | Guidance structure | Important functions to highlight, suggested titles |
| **Theme System** | Narrative consistency | Vocabulary, metaphors, character types |
| **Workshop Highlights** | Educational focus | Step-by-step exploration of key functions |

### Optimization Features

- **Targeted Content**: Quests only receive relevant file content
- **Smart Caching**: Repomix output cached for 5 minutes, LLM responses cached
- **Config Loading**: Loaded once per session if available
- **Fallback System**: Works without LLM using template-based stories

## Installation

```bash
npm install
npm run build
```

## 🚀 Automated Releases

This project uses **Lerna** with **conventional commits** for automated versioning and publishing to npm.

### **📦 Available Packages**

- **`@codewithdan/ai-repo-adventure-generator`** - CLI tool for generating HTML adventure websites
- **`@codewithdan/ai-repo-adventure-mcp`** - Model Context Protocol server for interactive code exploration

### **🔄 Release Process**

Releases are automatically triggered when you push to `main` with conventional commit messages:

```bash
# Examples of commits that trigger releases:
git commit -m "feat(generator): add new theme support"     # Minor version bump
git commit -m "fix(mcp): resolve connection issue"         # Patch version bump  
git commit -m "feat(core)!: breaking API change"          # Major version bump

# Non-releasing commits:
git commit -m "docs: update README"                        # No version bump
git commit -m "test: add unit tests"                       # No version bump
```

### **🏷️ Manual Release Commands**

```bash
npm run release:check        # See what packages have changed
npm run version:patch        # Manual patch version bump
npm run version:minor        # Manual minor version bump  
npm run version:major        # Manual major version bump
```

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for complete conventional commit guidelines.

## Quick HTML Adventure Test

Generate a beautiful HTML adventure website with just one command:

```bash
npm run test:html                      # Default: mythical theme
npm run test:html -- --theme=space    # Specify theme (space, mythical, ancient, developer)
npm run test:html -- --theme=all      # Generate all themes at once
```

This will:
- 🧪 Run a minimal test using only 2 LLM calls (1 story + 1 quest)
- 🌐 Generate a complete HTML adventure website in `tests/public/`
- 🚀 Automatically start a local HTTP server on port 8080
- 🎯 Open your browser to view the adventure immediately
- 🎨 Include full themed CSS styling and responsive design
- 🌈 With `--theme=all`, generates complete websites for all 4 themes

**Perfect for:** Testing the system, sharing adventures, or creating standalone exploration websites.

## Configuration

### LLM Setup (Required for Dynamic Story Generation)

The server supports multiple LLM providers through a generic OpenAI-compatible client:

1. **Choose Your Provider** and copy the configuration:
   ```bash
   cp .env.example .env
   ```

2. **Configure Your Preferred Provider**:

   **🔥 OpenAI (Direct)**:
   ```bash
   REPO_ADV_LLM_API_KEY=your_openai_key_here
   REPO_ADV_LLM_BASE_URL=https://api.openai.com/v1
   REPO_ADV_LLM_MODEL=gpt-4o-mini
   ```

   **🏢 Azure OpenAI**:
   ```bash
   REPO_ADV_LLM_API_KEY=your_azure_key_here
   REPO_ADV_LLM_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment
   REPO_ADV_LLM_MODEL=gpt-4o
   REPO_ADV_LLM_API_VERSION=2025-01-01-preview
   ```

   **🆓 Local Ollama**:
   ```bash
   REPO_ADV_LLM_BASE_URL=http://localhost:11434/v1
   REPO_ADV_LLM_API_KEY=ollama
   REPO_ADV_LLM_MODEL=gemma3:27b
   LLM_REQUEST_TIMEOUT=300000  # 5 minutes for slower local models
   ```

   **🆓 GitHub Models (Free tier available - but very limited and will only work with very small scenarios)**:
   ```bash
   GITHUB_TOKEN=your_github_token_here
   REPO_ADV_LLM_BASE_URL=https://models.inference.ai.azure.com
   REPO_ADV_LLM_MODEL=gpt-4o-mini
   ```

3. **Fine-tune Settings** (Optional):
   ```bash
   LLM_TEMPERATURE=1.0      # Creativity (0.0-2.0)
   LLM_MAX_TOKENS=1000      # Response length
   ```

**📝 Model Recommendations**:
- **Best Creative Writing**: `gpt-4o`
- **Most Cost-Effective**: `gpt-4o-mini`
- **Local/Private**: `gemma3:27b` (via Ollama)

## Testing

```bash
# Core MCP functionality tests
npm test                 # Run comprehensive test suite
npm run test:unit        # Core algorithm and component tests
npm run test:integration # LLM integration tests
npm run test:simple      # Basic MCP workflow test
npm run test:real-world  # Full MCP integration test

# HTML generation tests
npm run test:html        # Generate HTML adventure with auto-launch

# Interactive testing
npm run chat             # Interactive terminal test MCP client
```

## Available Tools

### `start_adventure`
Analyzes your code repository using repomix and begins an interactive, gamified exploration experience. Presents theme options for your adventure.

**Parameters:**
- `projectPath` (optional): Path to project directory (defaults to current directory)

### `choose_theme`
Generates a personalized, LLM-powered narrative adventure based on your selected theme. Creates dynamic adventures based on your actual project structure.

**Parameters:**
- `theme`: "space", "mythical", "ancient", "developer" (also accepts numbers: 1, 2, 3, 4)

### `explore_quest`
Executes a chosen quest to explore specific parts of your codebase through LLM-generated narrative content. Reveals code insights wrapped in themed storytelling.

**Parameters:**
- `choice`: Quest number (1, 2, 3) or quest title/partial title

### `view_progress`
Displays comprehensive progress tracking for your code exploration adventure. Shows completion percentage, completed adventures, and remaining areas to explore.

**Parameters:**
- None required - automatically tracks state from previous tool calls

## HTML Adventure Generator

Create beautiful, standalone HTML adventure websites from your code exploration:

### Interactive CLI Generator
```bash
npm run generate-html
```

**Features:**
- 🎨 Choose from Space, Mythical, Ancient, Developer, or Custom themes
- 📁 Choose the output directory
- 🌐 Complete HTML website with CSS and assets
- 🚀 Auto-launch local server and browser
- 📱 Responsive design for all devices
- 🎯 GitHub integration with automatic file linking

### Command-Line Options
```bash
npm run generate-html [options]

Options:
  --theme              Theme: space, mythical, ancient, developer, custom, or all
  --output             Output directory (default: ./public)
  --overwrite          Overwrite existing files without prompting
  --sequential         Process themes sequentially to avoid rate limits (for --theme all)
  --serve              Start HTTP server and open browser after generation
  --port               HTTP server port (default: 8080)
  --max-quests         Limit number of quests for testing (default: unlimited)
  --log-llm-output     Save LLM outputs to files for debugging
  --help, -h           Show help message

Examples:
  npm run generate-html                              # Interactive mode
  npm run generate-html --theme space --output ./public --overwrite --serve
  npm run generate-html --theme all --output ./docs  # Generate all themes
  npm run generate-html --theme all --sequential --output ./docs  # Avoid rate limits
  npm run generate-html --theme mythical --max-quests 2 --log-llm-output
```

### Handling Rate Limits

When using Azure OpenAI with certain pricing tiers (like S0), you may encounter token rate limits when processing multiple themes in parallel. The system provides automatic detection and graceful handling:

#### Azure S0 Rate Limit Error
```
429 Requests... have exceeded token rate limit of your current AIServices S0 pricing tier
```

**Automatic Solutions:**
- System detects token rate exceeded errors (different from request rate limits)
- Shows helpful suggestions for using `--sequential` flag
- In sequential mode: automatically waits 60 seconds and continues processing

**Recommended Usage for Azure S0 Users:**
```bash
# Proactively avoid rate limits
npm run generate-html --theme all --sequential --output ./public

# Or let system handle it automatically
npm run generate-html --theme all --output ./public
# System will suggest using --sequential if rate limit hit
```

**Benefits of Sequential Processing:**
- ✅ Avoids overwhelming token rate windows (200K tokens/60s)
- ✅ All themes still generate successfully (just takes longer)
- ✅ Clear progress indicators and wait time notifications
- ✅ No manual intervention required

### Quick Test Generator
```bash
npm run test:html                    # Generate single theme (mythical)
npm run test:html -- --theme=all    # Generate all themes
```

**Perfect for:**
- 🧪 Testing HTML generation (only 2 LLM calls per theme)
- 🎯 Quick development iteration
- 📋 Creating demo adventures for all themes at once
- 🚀 Sharing complete adventure collections

### HTML Generator Features

The HTML generator (`packages/generator/src/cli/html-generator.ts`) creates fully-featured adventure websites:

**Core Capabilities:**
- **Theme System**: 5 built-in themes with custom theme support
- **Template Engine**: Dynamic HTML generation with variable substitution
- **Markdown Processing**: Full markdown to HTML conversion with code highlighting using Prism.js
- **File Path Linking**: Automatic GitHub URL generation for code files
- **Responsive Design**: Mobile-first CSS with gradient styling
- **Navigation System**: Quest-to-quest navigation with progress tracking

**Generated Structure:**
```
output-directory/
├── index.html              # Main adventure homepage with theme selection
├── [theme]/                # Individual theme directories (space, mythical, ancient, developer)
│   ├── index.html          # Theme-specific adventure page with story
│   ├── quest-1.html        # Individual quest pages
│   ├── quest-2.html
│   ├── quest-3.html
│   └── assets/
│       ├── theme.css       # Combined theme + base + animations CSS
│       └── images/
│           ├── github-mark.svg       # Dark GitHub logo for light themes
│           ├── github-mark-white.svg # White GitHub logo for dark themes
│           └── [theme-specific-images] # Theme backgrounds and assets
└── assets/                 # Global assets shared across themes
    ├── theme.css          # Homepage styling
    └── images/            # Shared images and GitHub logos
```

**Theme-Specific Features:**
- **Dynamic Navbar**: Shows repo name from `adventure.config.json` with GitHub logo
- **Responsive Design**: GitHub logo positioned right, title aligned left
- **Theme-Aware Logos**: Dark logos for light themes, white logos for dark themes  
- **Consistent Footer**: "Created using AI Repo Adventures" across all pages

## Example Adventure Flow

```
1. start_adventure() 
   → Generates repomix content for your TypeScript/Node.js project
   → "🌟 Welcome to Repo Adventures! You've discovered 45 files of digital wisdom!"
   → "Choose Your Story Theme: 1. 🚀 Space 2. 🏰 Mythical 3. 🏛️ Ancient"

2. choose_theme("space")
   → LLM analyzes your repomix content and generates personalized story
   → "In the cosmic realm of API Service, the advanced Starship 'TypeScript' 
      navigates through 45 star systems..."
   → "Available Quests: 1. 🧭 Navigation Protocols 2. 📡 Communication Hub"

3. explore_quest("1")
   → LLM generates detailed quest content using actual code files
   → "As you enter the Navigation Control Center, you discover the sacred 
      algorithm that guides all requests..."
   → Shows real code snippets with explanations in space theme
   → "Progress: 33% complete (1/3 quests finished)"

4. view_progress()
   → "📊 Quest Progress: 33% complete"
   → "✅ Completed: Navigation Protocols"
   → "🗺️ Remaining: Communication Hub, System Diagnostics"
```
## Monorepo Structure

```
packages/
├── core/                           # @ai-repo-adventures/core (shared business logic)
│   └── src/
│       ├── adventure/              # Adventure generation system
│       │   ├── adventure-manager.ts   # Orchestrates adventure state and user interactions
│       │   └── story-generator.ts     # LLM-powered story and quest generation
│       ├── analyzer/               # Code analysis and repomix integration
│       │   └── repo-analyzer.ts    # Repository analysis and content generation
│       ├── llm/                    # LLM integration
│       │   └── llm-client.ts       # Multi-provider LLM client (OpenAI, Azure, Ollama, etc.)
│       └── shared/                 # Shared utilities and types
│           ├── types.ts            # Core type definitions
│           ├── theme.ts            # Theme system and validation
│           ├── config.ts           # Configuration and environment settings
│           ├── input-validator.ts  # Security and input validation
│           └── adventure-config.ts # Adventure configuration parser
├── generator/                      # @codewithdan/ai-repo-adventure-generator (HTML CLI)
│   └── src/cli/
│       ├── html-generator.ts       # Interactive HTML adventure generator with CLI options
│       ├── template-engine.ts      # HTML template processor with variable substitution
│       ├── assets/                 # Static assets for HTML generation
│       │   └── images/             # GitHub logos and theme images
│       ├── templates/              # HTML templates for generation
│       └── themes/                 # CSS theme files
│           ├── space.css           # Space theme styling
│           ├── mythical.css        # Mythical theme styling
│           ├── ancient.css         # Ancient theme styling
│           ├── developer.css       # Developer theme styling
│           ├── custom.css          # Custom theme base
│           ├── base.css            # Base styling for all themes
│           └── animations.css      # CSS animations and transitions
└── mcp/                           # @codewithdan/ai-repo-adventure-mcp (MCP server)
    └── src/
        ├── server.ts              # Main MCP server entry point
        └── tools/                 # MCP tool definitions
            └── tools.ts           # 4 main tools: start_adventure, choose_theme, explore_quest, view_progress

tests/                             # Shared test suite
├── unit/                          # Unit tests for individual components
└── integration/                   # Integration tests with LLM providers

.github/workflows/                 # Automated release pipeline
└── release.yml                    # Lerna + conventional commits automation
```

## Contributing

Contributions welcome! This project uses **conventional commits** and **automated releases**.

### 🚀 **Getting Started**
```bash
git clone https://github.com/danwahlin/ai-repo-adventures.git
cd ai-repo-adventures
npm install
npm run build
npm run test:unit
```

### 📝 **Commit Message Format**
Use [conventional commits](https://www.conventionalcommits.org/) for automatic versioning:
```bash
feat(generator): add new theme support      # Minor version bump
fix(mcp): resolve connection issue          # Patch version bump  
feat(core)!: breaking API change           # Major version bump
docs: update README                         # No version bump
```

### 🏗️ **Development Workflow**
```bash
# Work on features
npm run build                    # Build all packages
npm run test:unit               # Run unit tests
npm run lint                    # Check code quality

# Test specific components
npm run test:simple             # Test MCP server
npm run test:html               # Test HTML generation
npm run chat                    # Interactive MCP client
```

### 📦 **Package Development**
- **Core Package** (`packages/core/`): Shared business logic and utilities
- **Generator Package** (`packages/generator/`): HTML generation CLI tool  
- **MCP Package** (`packages/mcp/`): Model Context Protocol server

**Recent Simplifications:** The codebase has been streamlined by removing ~200+ lines of over-engineered code while maintaining 100% functionality. This includes consolidating duplicate configuration parsers and removing unused validation systems.

### 🎯 **Areas for Contribution**
- 🎨 New CSS themes and styling (`packages/generator/src/cli/themes/`)
- 🌍 Additional language support in analysis
- 🔧 New quest generation algorithms
- 🧪 Additional test coverage
- 📖 Documentation improvements

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for detailed contribution guidelines.  

## License

MIT

## Prompt for adventure.config.json Generation

Use this prompt with GitHub Copilot, Claude Code, or your favorite AI coding assistant to generate an `adventure.config.json` file for your project. This configuration helps the AI adventure system understand your project's structure and create meaningful quest paths.

---

**PROMPT FOR AI CODING ASSISTANT:**

```
Please analyze this codebase and create an adventure.config.json file at the root of the project to help users explore the project through guided quests.

Requirements:
- Identify 3-5 key areas of functionality in the codebase
- Select 2-4 representative files for each area
- Highlight 2-4 important functions/classes or other members per file
- Focus on entry points, main logic, and system integrations

Use this exact JSON structure:

{
  "adventure": {
    "name": "[Your Project Name]",
    "description": "[Brief project description]", 
    "url": "https://github.com/[username]/[repo-name]",
    "customInstructions": "[Optional: Any specific guidance for story generation]",
    "quests": [
      {
        "title": "[Quest Name - e.g. 'Authentication System']",
        "description": "[What users learn from exploring this area]",
        "files": [
          {
            "path": "[relative/path/to/important/file.js]",
            "description": "[Role of this file in the system]",
            "highlights": [
              {
                "name": "[functionName or ClassName.method]", 
                "description": "[What this code does and why it matters]"
              }
            ]
          }
        ]
      }
    ]
  }
}

Prioritize files that contain:
✓ Main entry points (index.js, program.cs, main.ts, app.js, etc.)
✓ Core business logic and algorithms  
✓ API routes and controllers
✓ Database models and data access
✓ Configuration and setup code
✓ Key middleware and utilities

Avoid:
✗ Test files, build scripts, or configuration-only files
✗ Simple utility functions without business logic
✗ Auto-generated or boilerplate code

Aim for 15-25 total highlights across all quests for the best exploration experience.
```

**After generating the file, the AI adventure system will use this configuration to:**
- Create themed stories that guide users through your codebase
- Generate step-by-step exploration paths focusing on the highlighted functions
- Provide educational context about how different parts of your system work together
- Create beautiful HTML adventure websites for sharing your project exploration