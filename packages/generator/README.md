# @codewithdan/ai-repo-adventure-generator

Generate beautiful, interactive HTML adventure websites from your codebase! Transform your code repository into an engaging story-based exploration experience.

## Features

- 🎨 **5 Built-in Themes**: Space, Mythical, Ancient, Developer, and Custom themes
- 🌐 **Complete HTML Website**: Fully self-contained with embedded CSS and assets
- 📱 **Responsive Design**: Mobile-first approach with beautiful gradient styling
- 🚀 **Auto-Launch**: Automatically starts a local server and opens your browser
- 🤖 **AI-Powered Stories**: Uses LLMs to generate personalized narratives
- 🎯 **GitHub Integration**: Automatic linking to source files on GitHub
- ⚡ **Fast Generation**: Optimized with caching and parallel processing

## Installation

```bash
npm install -g @codewithdan/ai-repo-adventure-generator
```

Or use directly with npx:

```bash
npx @codewithdan/ai-repo-adventure-generator
```

## Usage

### Interactive Mode

Simply run the command in your project directory:

```bash
repo-adventure
```

This will guide you through:
1. Choosing a theme
2. Selecting an output directory
3. Generating your adventure website

### Command-Line Options

```bash
repo-adventure [options]

Options:
  --theme <theme>    Theme: space, mythical, ancient, developer, or custom
  --output <dir>     Output directory (default: ./public)
  --overwrite        Overwrite existing files without prompting
  --help, -h         Show help message

Examples:
  repo-adventure --theme space --output ./docs --overwrite
  repo-adventure --theme mythical --output ./adventure-site
```

## Configuration

### LLM Setup (Optional)

The generator works without LLM configuration (using templates), but AI-generated stories provide better experiences.

Create a `.env` file in your project:

```bash
# OpenAI
LLM_API_KEY=your_openai_key_here
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# Or GitHub Models (free tier)
GITHUB_TOKEN=your_github_token_here
LLM_BASE_URL=https://models.inference.ai.azure.com
LLM_MODEL=gpt-4o-mini

# Or Local Ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=llama3.2
```

### Adventure Configuration

Create an `adventure.config.json` in your project root to guide quest generation:

```json
{
  "adventure": {
    "name": "Your Project Name",
    "url": "https://github.com/yourusername/yourrepo"
  },
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
```

## Generated Output

The generator creates:

```
output-directory/
├── index.html              # Main adventure page with story
├── quest-1.html            # Individual quest pages
├── quest-2.html
├── quest-3.html
└── assets/
    ├── theme.css          # Combined theme + base + animations CSS
    └── images/
        ├── github-mark.svg       # Dark GitHub logo
        └── github-mark-white.svg # White GitHub logo
```

## Themes

### Built-in Themes

- **Space** 🚀 - Explore your code as a space adventure
- **Mythical** 🧙‍♂️ - Journey through a magical kingdom
- **Ancient** 🏛️ - Discover ancient civilizations
- **Developer** 💻 - Modern tech-focused exploration
- **Custom** 🎨 - Create your own theme

### Custom Themes

When selecting "custom" theme, you'll be prompted to provide:
- Theme name
- Description
- Keywords for storytelling

## Requirements

- Node.js 18.0.0 or higher
- A code repository to explore
- Optional: LLM API key for AI-generated content

## License

MIT

## Author

Dan Wahlin

## Links

- [GitHub Repository](https://github.com/danwahlin/ai-repo-adventures)
- [Report Issues](https://github.com/danwahlin/ai-repo-adventures/issues)