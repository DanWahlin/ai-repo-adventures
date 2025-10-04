# @codewithdan/ai-repo-adventure-generator

Generate beautiful, interactive HTML adventure websites from your codebase! Transform your code repository into an engaging story-based exploration experience.

## Features

- 🎨 **4 Built-in Themes**: Space, Mythical, Ancient, and Developer (plus Custom theme support)
- 🌐 **Complete HTML Website**: Fully self-contained with embedded CSS and assets
- 📱 **Responsive Design**: Mobile-first approach with beautiful gradient styling
- 🚀 **Auto-Launch**: Built-in development server with automatic browser opening
- 🤖 **AI-Powered Stories**: Uses LLMs to generate personalized narratives
- 🎯 **GitHub Integration**: Automatic linking to source files on GitHub
- ⚡ **Fast Generation**: Optimized with caching and parallel multi-theme processing
- 🔧 **Flexible Configuration**: Quest limiting, output control, and debugging options

## Installation

```bash
npm install -g @codewithdan/ai-repo-adventures-generator
```

Or use directly with npx:

```bash
npx @codewithdan/ai-repo-adventures-generator
```

## Usage

### Interactive Mode

Simply run the command in your project directory:

```bash
repo-adventures
```

This will guide you through:
1. Choosing a theme (including "Generate All Themes" option)
2. Selecting an output directory
3. Generating your adventure website

### Command-Line Options

```bash
repo-adventures [options]

Options:
  --theme <theme>        Theme: space, mythical, ancient, developer, custom, or all
  --output <dir>         Output directory (default: ./public)
  --overwrite           Overwrite existing files without prompting
  --max-quests <num>    Limit number of quests to generate (default: all)
  --log-llm-output      Save raw LLM output to tests/llm-output directory
  --serve               Start HTTP server and open browser after generation
  --help, -h            Show help message

Examples:
  repo-adventures --theme space --output ./docs --overwrite
  repo-adventures --theme all --output ./public --overwrite  # Generate all themes
  repo-adventures --theme mythical --max-quests 3 --serve    # Limit quests and auto-serve
```

## Configuration

### LLM Setup (Required)

The generator requires LLM configuration to generate stories and adventure content.

Create a `.env` file in your project:

```bash
# OpenAI
REPO_ADV_LLM_API_KEY=your_openai_key_here
REPO_ADV_LLM_BASE_URL=https://api.openai.com/v1
REPO_ADV_LLM_MODEL=gpt-4o

# Azure AI foundry
REPO_ADV_LLM_API_KEY=<your_azure_key_here>
REPO_ADV_LLM_BASE_URL=https://<your_azure_ai_foundry_resource>.openai.azure.com
REPO_ADV_LLM_MODEL=gpt-4o
REPO_ADV_LLM_API_VERSION=2025-01-01-preview

# Or GitHub Models (free tier - very limited and can only be used with very small adventures)
GITHUB_TOKEN=your_github_token_here
REPO_ADV_LLM_BASE_URL=https://models.inference.ai.azure.com
REPO_ADV_LLM_MODEL=gpt-4o

# Or Local Ollama (results can vary and may not generate compatible output - you can try it! :-))
REPO_ADV_LLM_BASE_URL=http://localhost:11434/v1
REPO_ADV_LLM_API_KEY=ollama
REPO_ADV_LLM_MODEL=gemma3:27b
LLM_REQUEST_TIMEOUT=300000  # 5 minutes for slower local models
```

### Adventure Configuration

Create an `adventure.config.json` in your project root to guide quest generation. This file tells the AI which parts of your codebase are most important to explore.

```json
{
  "adventure": {
    "name": "Your Project Name",
    "description": "Brief description of what your project does",
    "url": "https://github.com/yourusername/yourrepo",
    "customInstructions": "[Optional: Any specific guidance for story generation]",
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

## Generated Output

The generator creates:

```
output-directory/
├── index.html              # Main adventure page with story
├── quest-1.html            # Individual quest pages  
├── quest-2.html
├── quest-N.html            # Dynamic number based on your codebase
├── summary.html            # Adventure completion summary
└── assets/
    ├── theme.css          # Combined theme + base + animations CSS
    ├── quest-navigator.js # Interactive navigation component
    ├── quest-navigator.css
    ├── compass-icon.svg
    ├── images/
    │   └── (theme-specific images)
    └── shared/
        ├── github-mark.svg       # Dark GitHub logo
        └── github-mark-white.svg # White GitHub logo
```

## Create adventure.config.json (AI Assistant Prompt)

Use this prompt with any AI coding assistant to generate a custom `adventure.config.json` file for your project:

---

**COPY AND PASTE THIS PROMPT:**

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

---

**The generated file will enable:**
- 🎯 **Guided Exploration**: Step-by-step tours through your most important code
- 📚 **Educational Context**: AI-generated explanations of how your systems work
- 🎨 **Themed Adventures**: Space, mythical, ancient, or developer-themed code tours
- 🌐 **Shareable Websites**: Beautiful HTML adventures for documentation and onboarding

## Themes

### Built-in Themes

- **Space** 🚀 - Explore your code as a cosmic space adventure
- **Mythical** 🧙‍♂️ - Journey through a magical enchanted kingdom  
- **Ancient** 🏛️ - Discover ancient archaeological civilizations
- **Developer** 💻 - Modern tech-focused professional exploration
- **Custom** 🎨 - Create your own personalized theme
- **All Themes** ⚡ - Generate all themes simultaneously with parallel processing

### Custom Themes

When selecting "custom" theme, you'll be prompted to provide:
- Theme name
- Description
- Keywords for storytelling

## Requirements

- Node.js 20 or higher
- A GitHub code repository to explore
- LLM API key for AI-generated content

## License

MIT

## Author

Dan Wahlin

## Links

- [GitHub Repository](https://github.com/danwahlin/ai-repo-adventures)
- [Report Issues](https://github.com/danwahlin/ai-repo-adventures/issues)