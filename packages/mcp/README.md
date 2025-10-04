# @codewithdan/ai-repo-adventures-mcp

MCP (Model Context Protocol) server for AI-powered code repository exploration through interactive storytelling. Turn your codebase into an engaging adventure!

## Features

- 🎮 **Story-based Code Exploration**: Interactive "choose your own adventure" experience
- 🤖 **AI-Powered Narratives**: Dynamic story generation using LLMs
- 🌟 **Multiple Themes**: Space, Mythical, Ancient, and Developer themes
- 📚 **Educational Analogies**: Complex concepts explained through storytelling
- 🔍 **Smart Code Analysis**: Automatic detection of technologies and patterns
- 📊 **Progress Tracking**: Track exploration completion

## Installation

### For Claude Desktop

1. Install the package globally:

```bash
npm install -g @codewithdan/ai-repo-adventures-mcp
```

2. Add to Claude Desktop configuration:

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "repo-adventures": {
      "command": "npx",
      "args": ["@codewithdan/ai-repo-adventures-mcp"],
      "cwd": "/path/to/project/you/want/to/explore"
    }
  }
}
```

### For Development

```bash
npm install @codewithdan/ai-repo-adventures-mcp
```

## Available MCP Tools

### `start_adventure`
Analyzes your repository and presents theme options.

**Parameters:**
- `projectPath` (optional): Path to project directory

### `choose_theme`
Generates a themed narrative adventure based on your selection.

**Parameters:**
- `theme`: "space", "mythical", "ancient", or "developer"

### `explore_quest`
Explores specific parts of your codebase through narrative.

**Parameters:**
- `choice`: Quest number or title

### `view_progress`
Shows your exploration progress and remaining quests.

## Configuration

### LLM Setup (Optional)

Create a `.env` file in your project:

```bash
# OpenAI
REPO_ADV_LLM_API_KEY=your_openai_key_here
REPO_ADV_LLM_BASE_URL=https://api.openai.com/v1
REPO_ADV_LLM_MODEL=gpt-4o-mini

# GitHub Models (Free tier available - but very limited and will only work with very small scenarios)
GITHUB_TOKEN=your_github_token_here
REPO_ADV_LLM_BASE_URL=https://models.inference.ai.azure.com
REPO_ADV_LLM_MODEL=gpt-4o-mini

# Azure OpenAI
REPO_ADV_LLM_API_KEY=your_azure_key_here
REPO_ADV_LLM_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment
REPO_ADV_LLM_MODEL=gpt-4o
REPO_ADV_LLM_API_VERSION=2025-01-01-preview

# Local Ollama
REPO_ADV_LLM_BASE_URL=http://localhost:11434/v1
REPO_ADV_LLM_API_KEY=ollama
REPO_ADV_LLM_MODEL=gemma3:27b
```

### Adventure Configuration

Create an `adventure.config.json` in your project root:

```json
{
  "adventure": {
    "name": "Your Project Name",
    "description": "Brief description of what your project does",
    "url": "https://github.com/yourusername/yourrepo",
    "quests": [
      {
        "title": "Core Features",
        "description": "Explore the main functionality",
        "files": [
          {
            "path": "src/main.ts",
            "description": "Main entry point",
            "highlights": [
              {
                "name": "initializeApp",
                "description": "Application initialization"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Example Usage Flow

```
1. start_adventure() 
   → Analyzes your project
   → Returns: "Choose Your Theme: 1. 🚀 Space 2. 🏰 Mythical 3. 🏛️ Ancient"

2. choose_theme("space")
   → Generates personalized story
   → Returns: Space-themed narrative with quest options

3. explore_quest("1")
   → Explores specific code area
   → Returns: Detailed narrative with code insights

4. view_progress()
   → Shows completion status
   → Returns: "33% complete, 2 quests remaining"
```

## Supported Technologies

Automatically detects and creates characters for:
- **Languages**: TypeScript, JavaScript, Python, Java, Go, Rust, C#
- **Frameworks**: React, Vue, Angular, Node.js, Express
- **Databases**: MongoDB, PostgreSQL, MySQL
- **Tools**: Docker, Kubernetes, Jest, Cypress
- **APIs**: REST, GraphQL

## Requirements

- Node.js 18.0.0 or higher
- Claude Desktop (or compatible MCP client)
- Optional: LLM API key for dynamic content

## License

MIT

## Author

Dan Wahlin

## Links

- [GitHub Repository](https://github.com/danwahlin/ai-repo-adventures)
- [Report Issues](https://github.com/danwahlin/ai-repo-adventures/issues)
- [NPM Package](https://www.npmjs.com/package/@codewithdan/ai-repo-adventures-mcp)