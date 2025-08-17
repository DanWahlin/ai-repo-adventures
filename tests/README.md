# MCP Repo Adventure - Testing

## 🧪 Available Tests

### Simple Test
Quick validation that core functionality works:
```bash
npm run test:simple
```

### Interactive Test  
Full terminal chat interface for manual testing:
```bash
npm run test:interactive
# OR
npm run chat
```

### Real-World Test
Comprehensive workflow testing including performance and error handling:
```bash
npm run test:real-world
```

### Run All Tests
```bash
npm test
```

## 🚀 First Time Setup

When you start the client, you'll see:

```
📁 Project Setup
Current directory: /path/to/ai-repo-adventures

Would you like to:
  1. Analyze this MCP Repo Adventure project (recommended for testing)
  2. Analyze current directory: /your/current/path
  3. Enter a different project path

Press Enter for option 1 (default)
```

Just press **Enter** to use this project for testing, or choose another option.

## 💬 How to Use

Once the client starts, you can have a natural conversation with the MCP server:

### Example Conversation Flow

```
You> Start a repo adventure
[Server analyzes your project and presents theme options]

You> I'll take the space theme
[Server generates a personalized space adventure]

You> Meet Data Navigator Zara
[Server introduces you to the character]

You> Explore the API Gateway
[Server describes that area of your code]
```

### Available Commands

**Natural Language:**
- "Start a repo adventure" - Begin analyzing current directory
- "Start adventure for /path/to/project" - Analyze specific directory  
- "I choose the space theme" - Select space theme
- "Medieval theme please" - Select medieval theme
- "Let's go ancient" - Select ancient theme
- "Meet [character name]" - Meet a specific character
- "Explore [area]" - Explore a part of the codebase
- Any choice text from the story

**Slash Commands:**
- `/help` - Show help information
- `/tools` - List available MCP tools
- `/clear` - Clear the screen
- `/project [path]` - Change project directory
- `/exit` or `/quit` - Exit the client

## 🌟 Features

- **Colorful Output**: Formatted text with colors and emphasis
- **Natural Language**: Just type what you want to do
- **Stateful Conversation**: Maintains context between messages
- **Error Handling**: Graceful handling of invalid commands
- **Real MCP Integration**: Uses actual MCP client/server communication

## 🎯 Tips

1. **Start Simple**: Begin with "Start a repo adventure"
2. **Follow the Story**: Use the choices presented in the narrative
3. **Be Natural**: The parser understands variations like "meet Zara" or "Talk to Data Navigator Zara"
4. **Explore Freely**: Try different paths and characters
5. **Change Projects**: Use `/project /path/to/other/repo` to analyze different codebases

## 🐛 Troubleshooting

- **Build Errors**: Make sure to run `npm install` first
- **Connection Failed**: Check that the MCP server builds correctly
- **No Response**: Try more specific commands or use `/help`

## 🚀 Example Session

```
🚀 MCP Repo Adventure - Interactive Test Client 
────────────────────────────────────────────────

Welcome! This is an interactive client for testing the MCP Repo Adventure server.
Type /help for available commands, or just start chatting!

Example: "Start a repo adventure for this project"

🔌 Connecting to MCP Repo Adventure Server...
✅ Connected successfully!
Available tools: start_adventure, choose_theme, explore_path, meet_character

You> start adventure
[Processing: start_adventure]

🌟 Welcome to Repo Adventure! 🌟

You've discovered a mysterious codebase that holds many secrets! This Software Project 
project contains 19 files and uses fascinating technologies like Node.js, TypeScript, JavaScript.

Your mission, should you choose to accept it, is to explore this digital realm and 
understand its inner workings through an epic adventure!

Choose Your Story Theme:

🚀 Space Exploration - Journey through cosmic codebases where data flows like stardust
🏰 Enchanted Kingdom - Explore magical realms where databases are dragon hoards
🏺 Ancient Civilization - Discover lost temples of code where algorithms are ancient wisdom

────────────────────────────────────────────────────────

You> space theme
[Processing: choose_theme]

Welcome aboard the starship CodeVoyager! As you step onto the bridge, the vast expanse 
of the digital cosmos stretches before you. This Software Project vessel, powered by 
Node.js, TypeScript, and JavaScript technologies, hums with the energy of 19 carefully 
crafted modules...

🚀 Choose Your Adventure Path:

1. Configuration Caverns 🟢
   Explore 4 ancient scrolls that control the realm's behavior
   ⏱️ 5-10 minutes

2. The Main Quest 🟡
   Follow the primary journey from src/index.ts through the core systems
   ⏱️ 15-20 minutes

3. Character Gallery 🟢
   Meet the 51 key inhabitants of this digital realm
   ⏱️ 15-25 minutes

Use the `explore_path` tool with your chosen adventure name to begin!

────────────────────────────────────────────────────────

You> I want to go on the main quest
[Processing: explore_path]

You embark on The Main Quest, following the primary data stream from the command center...
```

## HTML Generator Test

### Quick HTML Generation Test

The `test:html` command creates a minimal HTML adventure output for testing purposes:

```bash
npm run test:html
```

This command uses the CLI generator with minimal settings (1 quest, space theme) and includes LLM output logging. Add `--serve` to automatically start an HTTP server and open the browser:

```bash
node packages/generator/bin/cli.js --theme space --output ./public --max-quests 1 --serve
```

This will:
- Generate a minimal adventure with 1 story + 1 quest (only 2 LLM calls)
- Output HTML files to `tests/public/`
- Include all necessary assets (CSS, HTML files)

### Viewing Test Output

After running the test, you can view the generated HTML:

```bash
cd tests/public
python -m http.server 8080
```

Then open http://localhost:8080 in your browser.

### Generated Files

- `index.html` - Main adventure page
- `quest-1.html` - Single quest page  
- `assets/theme.css` - Complete themed CSS

This is useful for:
- Testing HTML generation without full quest generation
- Quick development iteration  
- CSS/styling testing
- Debugging HTML structure issues

## Prompt Output Test

### Debug LLM Prompts

The `prompt-output-test.ts` captures and outputs the exact prompts sent to the LLM for analysis:

```bash
npm run test:prompts
```

This will:
- Generate both story and quest prompts using the current configuration
- Output prompt files to `tests/prompts/`
- Create analysis report with statistics and verification data

### Generated Files

After running the test, check `tests/prompts/`:
- `story-prompt.txt` - Exact prompt sent to story generation LLM
- `quest-prompt.txt` - Exact prompt sent to quest content LLM  
- `analysis.txt` - Analysis report with prompt statistics and file verification

This is useful for:
- Debugging LLM prompt structure and content
- Verifying that required files are included in prompts
- Understanding why certain content is or isn't being generated
- Prompt engineering and optimization