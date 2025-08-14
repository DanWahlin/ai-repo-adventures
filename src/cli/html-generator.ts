#!/usr/bin/env node

/**
 * Standalone CLI tool for generating HTML adventure files
 * Creates a complete adventure website with themed styling
 */

import * as readline from 'readline';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { marked } from 'marked';
import { repoAnalyzer } from '../analyzer/repo-analyzer.js';
import { AdventureManager } from '../adventure/adventure-manager.js';
import { getAllThemes, getThemeByKey, AdventureTheme } from '../shared/theme.js';
import { createProjectInfo } from '../tools/shared.js';

interface CustomThemeData {
  name: string;
  description: string;
  keywords: string[];
}

interface QuestInfo {
  id: string;
  title: string;
  filename: string;
}

class HTMLAdventureGenerator {
  private rl: readline.Interface;
  private adventureManager: AdventureManager;
  private projectPath: string = process.cwd();
  private outputDir: string = '';
  private selectedTheme: AdventureTheme = 'space';
  private customThemeData?: CustomThemeData;
  private quests: QuestInfo[] = [];

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.adventureManager = new AdventureManager();
  }

  async start(): Promise<void> {
    console.clear();
    console.log(chalk.bgBlue.white.bold(' 🌟 Repo Adventure HTML Generator 🌟 '));
    console.log(chalk.dim('─'.repeat(50)));
    console.log();
    console.log(chalk.yellow('Generate a complete HTML adventure website from your codebase!'));
    console.log();

    try {
      // Step 1: Select theme
      await this.selectTheme();
      
      // Step 2: Select output directory
      await this.selectOutputDirectory();
      
      // Step 3: Generate adventure
      await this.generateAdventure();
      
      console.log();
      console.log(chalk.green.bold('🎉 Adventure website generated successfully!'));
      console.log(chalk.cyan(`📁 Location: ${this.outputDir}`));
      console.log(chalk.cyan(`🌐 Open: ${path.join(this.outputDir, 'index.html')}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Error generating adventure:'), error);
      this.rl.close();
      process.exit(1);
    }
    
    // Clean exit
    this.rl.close();
    process.exit(0);
  }

  private async selectTheme(): Promise<void> {
    console.log(chalk.yellow.bold('📚 Choose Your Adventure Theme:'));
    console.log();
    
    const themes = getAllThemes();
    themes.forEach(theme => {
      console.log(`${theme.emoji} ${chalk.bold(theme.id.toString())}. ${theme.displayName} - ${theme.description}`);
    });
    console.log();

    const choice = await this.prompt('Enter theme number or name: ');
    
    // Parse theme choice
    const themeNumber = parseInt(choice.trim());
    if (!isNaN(themeNumber)) {
      const theme = themes.find(t => t.id === themeNumber);
      if (theme) {
        this.selectedTheme = theme.key as AdventureTheme;
      } else {
        console.log(chalk.red('Invalid theme number. Using space theme.'));
        this.selectedTheme = 'space';
      }
    } else {
      const theme = getThemeByKey(choice.trim().toLowerCase());
      if (theme) {
        this.selectedTheme = theme.key as AdventureTheme;
      } else {
        console.log(chalk.red('Invalid theme name. Using space theme.'));
        this.selectedTheme = 'space';
      }
    }

    // Handle custom theme
    if (this.selectedTheme === 'custom') {
      await this.createCustomTheme();
    }

    const selectedThemeInfo = getThemeByKey(this.selectedTheme);
    console.log(chalk.green(`✅ Selected: ${selectedThemeInfo?.displayName || this.selectedTheme}`));
    console.log();
  }

  private async createCustomTheme(): Promise<void> {
    console.log(chalk.cyan('\n🎨 Creating Custom Theme...'));
    console.log();

    const name = await this.prompt('Theme name (e.g., "Cyberpunk", "Pirate Adventure"): ');
    const description = await this.prompt('Theme description: ');
    const keywordsInput = await this.prompt('Keywords (comma-separated): ');
    
    const keywords = keywordsInput.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    if (!name.trim() || !description.trim() || keywords.length === 0) {
      console.log(chalk.red('❌ Invalid custom theme data. Using space theme instead.'));
      this.selectedTheme = 'space';
      return;
    }

    this.customThemeData = {
      name: name.trim(),
      description: description.trim(),
      keywords
    };

    console.log(chalk.green('✅ Custom theme created!'));
  }

  private async selectOutputDirectory(): Promise<void> {
    console.log(chalk.yellow.bold('📁 Output Directory:'));
    console.log(chalk.dim(`Current directory: ${process.cwd()}`));
    console.log();

    const dir = await this.prompt('Enter output directory (or press Enter for ./public): ');
    this.outputDir = dir.trim() || path.join(process.cwd(), 'public');

    // Check if directory exists and has content
    if (fs.existsSync(this.outputDir)) {
      const files = fs.readdirSync(this.outputDir);
      if (files.length > 0) {
        console.log(chalk.yellow(`⚠️  Directory '${this.outputDir}' already exists and contains files.`));
        console.log(chalk.dim('Files found:'));
        files.slice(0, 5).forEach(file => {
          console.log(chalk.dim(`  - ${file}`));
        });
        if (files.length > 5) {
          console.log(chalk.dim(`  ... and ${files.length - 5} more files`));
        }
        console.log();

        const overwrite = await this.prompt('Do you want to overwrite this directory? (y/N): ');
        if (!overwrite.toLowerCase().startsWith('y')) {
          console.log(chalk.red('❌ Operation cancelled.'));
          process.exit(0);
        }
        
        console.log(chalk.yellow('🗑️  Clearing existing directory...'));
        // Remove all files and subdirectories
        fs.rmSync(this.outputDir, { recursive: true, force: true });
      }
    }
    
    // Create directory
    fs.mkdirSync(this.outputDir, { recursive: true });

    // Create assets directory
    const assetsDir = path.join(this.outputDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });

    console.log(chalk.green(`✅ Output directory: ${this.outputDir}`));
    console.log();
  }

  private async generateAdventure(): Promise<void> {
    console.log(chalk.yellow.bold('🚀 Generating Adventure...'));
    console.log();

    // Step 1: Generate repomix content and project info
    console.log(chalk.dim('📊 Analyzing codebase...'));
    const repomixContent = await repoAnalyzer.generateRepomixContext(this.projectPath);
    const projectInfo = createProjectInfo(repomixContent);

    // Step 2: Initialize adventure and get story with quests
    console.log(chalk.dim('✨ Generating themed story and quests...'));
    await this.adventureManager.initializeAdventure(
      projectInfo, 
      this.selectedTheme, 
      this.projectPath,
      this.customThemeData
    );

    // Step 3: Parse quest information from the adventure state
    this.extractQuestInfo();

    // Step 4: Generate CSS file
    console.log(chalk.dim('🎨 Creating theme styling...'));
    await this.generateThemeCSS();

    // Step 5: Generate index.html (using clean story content)
    console.log(chalk.dim('📝 Creating main adventure page...'));
    const storyContent = this.adventureManager.getStoryContent();
    await this.generateIndexHTML(storyContent);

    // Step 6: Generate all quest pages
    console.log(chalk.dim('📖 Generating quest pages...'));
    await this.generateQuestPages();
  }

  private extractQuestInfo(): void {
    // Get real quest data from adventure manager
    const adventureQuests = this.adventureManager.getAllQuests();
    this.quests = adventureQuests.map((quest, index) => ({
      id: quest.id,
      title: quest.title,
      filename: `quest-${index + 1}.html`
    }));
  }

  private async generateThemeCSS(): Promise<void> {
    const cssContent = this.getThemeCSS(this.selectedTheme);
    const cssPath = path.join(this.outputDir, 'assets', 'theme.css');
    fs.writeFileSync(cssPath, cssContent);
  }

  private async generateIndexHTML(storyContent: string): Promise<void> {
    const html = this.generateIndexHTMLContent(storyContent);
    const indexPath = path.join(this.outputDir, 'index.html');
    fs.writeFileSync(indexPath, html);
  }

  private async generateQuestPages(): Promise<void> {
    for (let i = 0; i < this.quests.length; i++) {
      const quest = this.quests[i];
      if (!quest) continue;
      
      console.log(chalk.dim(`  📖 Generating quest ${i + 1}/${this.quests.length}: ${quest.title}`));
      
      try {
        // Generate quest content with retry logic
        const questContent = await this.generateQuestContentWithRetry(quest.id);
        
        // Create HTML page
        const html = this.generateQuestHTMLContent(quest, questContent, i);
        const questPath = path.join(this.outputDir, quest.filename);
        fs.writeFileSync(questPath, html);
        
      } catch (error) {
        console.log(chalk.red(`    ❌ Failed to generate quest: ${quest.title}`));
        // Create a placeholder page for failed quests
        const placeholderHTML = this.generateQuestHTMLContent(quest, 'Quest content could not be generated.', i);
        const questPath = path.join(this.outputDir, quest.filename);
        fs.writeFileSync(questPath, placeholderHTML);
      }
    }
  }

  private async generateQuestContentWithRetry(questId: string, maxRetries: number = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.adventureManager.exploreQuest(questId);
        return result.narrative;
      } catch (error) {
        console.log(chalk.yellow(`    ⚠️  Attempt ${attempt}/${maxRetries} failed, retrying...`));
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    throw new Error('Max retries exceeded');
  }

  private prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(chalk.bold(question), resolve);
    });
  }

  private getThemeCSS(theme: AdventureTheme): string {
    // Generate CSS with variables for the selected theme
    return this.generateVariableBasedCSS(theme);
  }

  private generateVariableBasedCSS(theme: AdventureTheme): string {
    return this.generateCompleteThemeCSS(theme);
  }

  private generateCompleteThemeCSS(theme: AdventureTheme): string {
    const variables = this.getThemeVariables(theme);
    
    return `/* ${this.getThemeEmoji(theme)} ${this.getThemeTitle(theme)} */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;600&display=swap');

:root {
${variables}
}

/* ===== BASE STYLES ===== */
* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--primary-bg);
  background-attachment: fixed;
  color: var(--primary-text);
  font-family: var(--font-primary);
  font-weight: 400;
  margin: 0;
  padding: 0;
  min-height: 100vh;
  line-height: 1.6;
  position: relative;
  overflow-x: hidden;
}

body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--body-overlay);
  pointer-events: none;
  z-index: -1;
}

/* ===== NAVBAR ===== */
.navbar {
  background: var(--navbar-bg);
  border-bottom: var(--navbar-border);
  padding: 1rem 0;
  box-shadow: var(--navbar-shadow);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.navbar h1 {
  color: var(--navbar-text);
  text-decoration: none;
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: var(--heading-weight);
  text-shadow: var(--text-shadow);
  transition: all 0.3s ease;
  margin: 0;
}

.navbar a {
  color: var(--navbar-text);
  text-decoration: none;
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: var(--heading-weight);
  text-shadow: var(--text-shadow);
  transition: all 0.3s ease;
}

.navbar a:hover {
  text-shadow: var(--glow-shadow);
}

/* ===== MAIN CONTAINER ===== */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  background: var(--content-bg);
  border-radius: 15px;
  margin-top: 2rem;
  margin-bottom: 2rem;
  box-shadow: var(--content-shadow);
  backdrop-filter: blur(10px);
  border: var(--content-border);
  position: relative;
}

/* ===== TYPOGRAPHY ===== */
h1 {
  background: var(--title-gradient);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
  margin-bottom: 2rem;
  font-family: var(--font-heading);
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 900;
  text-shadow: var(--glow-shadow);
  text-transform: uppercase;
  letter-spacing: 3px;
  position: relative;
}

h1::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 3px;
  background: var(--title-gradient);
  border-radius: 2px;
}

h2 {
  color: var(--accent-primary);
  font-family: var(--font-heading);
  font-weight: var(--heading-weight);
  border-bottom: var(--section-border);
  padding-bottom: 0.8rem;
  margin-top: 3rem;
  margin-bottom: 1.5rem;
  text-shadow: var(--text-shadow);
  font-size: 1.8rem;
}

h3 {
  color: var(--accent-secondary);
  font-family: var(--font-heading);
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

p {
  color: var(--paragraph-color);
  margin-bottom: 1.2rem;
  line-height: 1.7;
}

/* ===== QUEST SECTIONS ===== */
.story-content {
  background: var(--quest-content-bg);
  border: var(--quest-content-border);
  border-radius: 15px;
  padding: 2rem;
  box-shadow: var(--quest-content-shadow);
  backdrop-filter: blur(5px);
  margin-bottom: 2rem;
}

.quests-section {
  background: var(--quest-section-bg);
  border: var(--quest-section-border);
  border-radius: 15px;
  padding: 2rem;
  box-shadow: var(--quest-section-shadow);
  backdrop-filter: blur(5px);
}

/* ===== QUEST LINKS ===== */
.quest-link {
  display: block;
  background: var(--quest-link-bg);
  border: var(--quest-link-border);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  color: var(--quest-link-text);
  text-decoration: none;
  box-shadow: var(--quest-link-shadow);
  transition: var(--quest-link-transition);
  backdrop-filter: blur(5px);
  position: relative;
  overflow: hidden;
}

.quest-link:hover {
  background: var(--quest-link-hover-overlay);
  box-shadow: var(--quest-link-hover-shadow);
  transform: translateY(-2px);
  color: var(--quest-link-hover-text);
}

.quest-link h3 {
  margin: 0;
  color: inherit;
  font-size: 1.2rem;
}

/* ===== QUEST CONTENT ===== */
.quest-content {
  background: var(--quest-content-bg);
  border: var(--quest-content-border);
  border-radius: 15px;
  padding: 2rem;
  box-shadow: var(--quest-content-shadow);
  backdrop-filter: blur(5px);
}

/* ===== QUEST NAVIGATION ===== */
.quest-navigation {
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: var(--section-border);
  text-align: center;
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.quest-navigation a {
  display: inline-block;
  padding: 1.2rem 2.5rem;
  background: var(--nav-button-bg);
  color: var(--nav-button-text);
  border: var(--nav-button-border);
  border-radius: 30px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  transition: var(--nav-button-transition);
  box-shadow: var(--nav-button-shadow);
  backdrop-filter: blur(5px);
  font-family: var(--font-heading);
  font-size: 0.9rem;
  text-decoration: none;
}

.quest-navigation a:hover {
  background: var(--nav-button-hover-bg);
  color: var(--nav-button-hover-text);
  transform: translateY(-3px);
  box-shadow: var(--nav-button-hover-shadow);
  text-shadow: none;
}

/* ===== CODE STYLING ===== */
.code-block {
  background: var(--code-block-bg);
  border: var(--code-block-border);
  border-radius: 12px;
  margin: 1.5rem 0;
  overflow: hidden;
  box-shadow: var(--code-block-shadow);
  backdrop-filter: blur(5px);
}

.code-header {
  background: var(--code-header-bg);
  color: var(--code-header-text);
  padding: 0.8rem 1.2rem;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: var(--code-header-border);
  font-family: var(--font-code);
}

pre {
  margin: 0;
  padding: 1.5rem;
  overflow-x: auto;
  background: var(--code-pre-bg);
  font-family: var(--font-code);
  line-height: var(--code-line-height);
}

pre::-webkit-scrollbar {
  height: 8px;
}

pre::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
}

pre::-webkit-scrollbar-thumb {
  background: var(--accent-primary);
  border-radius: 4px;
}

code {
  font-family: var(--font-code);
  font-size: 0.9rem;
  color: var(--code-text);
}

.inline-code {
  background: var(--inline-code-bg);
  color: var(--inline-code-text);
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-family: var(--font-code);
  border: var(--inline-code-border);
  font-size: 0.85em;
}

/* ===== LINKS ===== */
a {
  color: var(--accent-secondary);
  text-decoration: none;
  transition: all 0.3s ease;
  position: relative;
}

a:hover {
  color: var(--accent-primary);
  text-shadow: var(--text-shadow);
}

/* ===== LISTS ===== */
ul, ol {
  margin: 1.5rem 0;
  padding-left: 2rem;
}

li {
  color: var(--paragraph-color);
  margin-bottom: 0.8rem;
  line-height: 1.6;
}

/* ===== EMPHASIS ===== */
strong {
  color: var(--accent-primary);
  font-weight: 600;
  text-shadow: var(--text-shadow);
}

em {
  color: var(--accent-secondary);
  font-style: italic;
}

/* ===== HORIZONTAL RULES ===== */
hr {
  border: none;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
  margin: 3rem 0;
  border-radius: 1px;
}

/* ===== BLOCKQUOTES ===== */
blockquote {
  border-left: 4px solid var(--accent-primary);
  padding: 1rem 1.5rem;
  margin: 2rem 0;
  background: rgba(100, 255, 218, 0.05);
  border-radius: 0 12px 12px 0;
  backdrop-filter: blur(5px);
}

/* ===== RESPONSIVE DESIGN ===== */
@media (max-width: 768px) {
  .container {
    margin: 1rem;
    padding: 1.5rem;
  }
  
  .quest-content {
    padding: 1.5rem;
  }
  
  .story-content {
    padding: 1.5rem;
  }
  
  .quests-section {
    padding: 1.5rem;
  }
  
  h1 {
    font-size: 2rem;
    letter-spacing: 2px;
  }
  
  .quest-navigation {
    flex-direction: column;
    align-items: center;
  }
  
  .quest-navigation a {
    width: 100%;
    max-width: 300px;
  }
}

@media (max-width: 480px) {
  .nav-content {
    padding: 0 1rem;
  }
  
  .navbar a, .navbar h1 {
    font-size: 1.2rem;
  }
  
  h1 {
    font-size: 1.8rem;
  }
  
  pre {
    padding: 1rem;
    font-size: 0.8rem;
  }
}`;
  }

  private getThemeVariables(theme: AdventureTheme): string {
    switch (theme) {
      case 'space':
        return `  /* ===== COLOR PALETTE ===== */
  --primary-bg: linear-gradient(135deg, #0c0c1e 0%, #1a1a3e 50%, #0c0c1e 100%);
  --body-overlay: radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(100, 255, 218, 0.05) 0%, transparent 50%);
  --primary-text: #e0e6ff;
  --heading-color: #ffffff;
  --paragraph-color: #b8c5ff;
  --accent-primary: #64ffda;
  --accent-secondary: #82b1ff;
  --accent-tertiary: #7c4dff;
  --title-gradient: linear-gradient(135deg, #64ffda 0%, #82b1ff 50%, #7c4dff 100%);

  /* ===== TYPOGRAPHY ===== */
  --font-primary: 'Exo 2', sans-serif;
  --font-heading: 'Orbitron', monospace;
  --font-code: 'JetBrains Mono', 'Courier New', monospace;
  --heading-weight: 700;

  /* ===== EFFECTS ===== */
  --text-shadow: 0 0 10px rgba(100, 255, 218, 0.3);
  --glow-shadow: 0 0 20px rgba(100, 255, 218, 0.6), 0 0 30px rgba(130, 177, 255, 0.4);

  /* ===== NAVBAR ===== */
  --navbar-bg: rgba(12, 12, 30, 0.95);
  --navbar-border: 1px solid rgba(100, 255, 218, 0.2);
  --navbar-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  --navbar-text: #ffffff;

  /* ===== CONTENT AREAS ===== */
  --content-bg: rgba(26, 26, 62, 0.6);
  --content-border: 1px solid rgba(100, 255, 218, 0.15);
  --content-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  --section-border: 2px solid rgba(130, 177, 255, 0.3);

  /* ===== QUEST SECTIONS ===== */
  --quest-section-bg: rgba(26, 26, 62, 0.4);
  --quest-section-border: 1px solid rgba(130, 177, 255, 0.2);
  --quest-section-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  --quest-content-bg: rgba(26, 26, 62, 0.6);
  --quest-content-border: 1px solid rgba(100, 255, 218, 0.15);
  --quest-content-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  /* ===== QUEST LINKS ===== */
  --quest-link-bg: rgba(30, 30, 70, 0.7);
  --quest-link-border: 1px solid rgba(100, 255, 218, 0.2);
  --quest-link-text: #e0e6ff;
  --quest-link-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  --quest-link-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --quest-link-hover-overlay: linear-gradient(135deg, rgba(100, 255, 218, 0.1) 0%, rgba(130, 177, 255, 0.1) 100%);
  --quest-link-hover-shadow: 0 8px 25px rgba(100, 255, 218, 0.3);
  --quest-link-hover-text: #64ffda;

  /* ===== NAVIGATION BUTTONS ===== */
  --nav-button-bg: rgba(100, 255, 218, 0.1);
  --nav-button-border: 1px solid rgba(100, 255, 218, 0.3);
  --nav-button-text: #64ffda;
  --nav-button-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  --nav-button-transition: all 0.3s ease;
  --nav-button-hover-bg: rgba(100, 255, 218, 0.2);
  --nav-button-hover-text: #ffffff;
  --nav-button-hover-shadow: 0 6px 20px rgba(100, 255, 218, 0.4);

  /* ===== CODE BLOCKS ===== */
  --code-block-bg: rgba(15, 15, 35, 0.9);
  --code-block-border: 1px solid rgba(100, 255, 218, 0.2);
  --code-block-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
  --code-header-bg: rgba(100, 255, 218, 0.15);
  --code-header-text: #64ffda;
  --code-header-border: 1px solid rgba(100, 255, 218, 0.2);
  --code-pre-bg: rgba(8, 8, 25, 0.95);
  --code-text: #e0e6ff;
  --code-line-height: 1.3;

  /* ===== INLINE CODE ===== */
  --inline-code-bg: rgba(100, 255, 218, 0.1);
  --inline-code-text: #64ffda;
  --inline-code-border: 1px solid rgba(100, 255, 218, 0.2);`;

      case 'mythical':
        return `  /* ===== COLOR PALETTE ===== */
  --primary-bg: linear-gradient(135deg, #1a0d2e 0%, #2d1b69 50%, #1a0d2e 100%);
  --body-overlay: radial-gradient(circle at 30% 70%, rgba(186, 85, 211, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(255, 215, 0, 0.05) 0%, transparent 50%);
  --primary-text: #f0e6ff;
  --heading-color: #ffffff;
  --paragraph-color: #d1c4e9;
  --accent-primary: #ba55d3;
  --accent-secondary: #ffd700;
  --accent-tertiary: #9c27b0;
  --title-gradient: linear-gradient(135deg, #ba55d3 0%, #ffd700 50%, #9c27b0 100%);

  /* ===== TYPOGRAPHY ===== */
  --font-primary: 'Cinzel', serif;
  --font-heading: 'Cinzel Decorative', cursive;
  --font-code: 'Source Code Pro', monospace;
  --heading-weight: 700;

  /* ===== EFFECTS ===== */
  --text-shadow: 0 0 10px rgba(186, 85, 211, 0.3);
  --glow-shadow: 0 0 20px rgba(186, 85, 211, 0.6), 0 0 30px rgba(255, 215, 0, 0.4);

  /* ===== NAVBAR ===== */
  --navbar-bg: rgba(26, 13, 46, 0.95);
  --navbar-border: 1px solid rgba(186, 85, 211, 0.2);
  --navbar-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  --navbar-text: #ffffff;

  /* ===== CONTENT AREAS ===== */
  --content-bg: rgba(45, 27, 105, 0.6);
  --content-border: 1px solid rgba(186, 85, 211, 0.15);
  --content-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  --section-border: 2px solid rgba(255, 215, 0, 0.3);

  /* ===== QUEST SECTIONS ===== */
  --quest-section-bg: rgba(45, 27, 105, 0.4);
  --quest-section-border: 1px solid rgba(255, 215, 0, 0.2);
  --quest-section-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  --quest-content-bg: rgba(45, 27, 105, 0.6);
  --quest-content-border: 1px solid rgba(186, 85, 211, 0.15);
  --quest-content-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  /* ===== QUEST LINKS ===== */
  --quest-link-bg: rgba(60, 30, 90, 0.7);
  --quest-link-border: 1px solid rgba(186, 85, 211, 0.2);
  --quest-link-text: #f0e6ff;
  --quest-link-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  --quest-link-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --quest-link-hover-overlay: linear-gradient(135deg, rgba(186, 85, 211, 0.1) 0%, rgba(255, 215, 0, 0.1) 100%);
  --quest-link-hover-shadow: 0 8px 25px rgba(186, 85, 211, 0.3);
  --quest-link-hover-text: #ba55d3;

  /* ===== NAVIGATION BUTTONS ===== */
  --nav-button-bg: rgba(186, 85, 211, 0.1);
  --nav-button-border: 1px solid rgba(186, 85, 211, 0.3);
  --nav-button-text: #ba55d3;
  --nav-button-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  --nav-button-transition: all 0.3s ease;
  --nav-button-hover-bg: rgba(186, 85, 211, 0.2);
  --nav-button-hover-text: #ffffff;
  --nav-button-hover-shadow: 0 6px 20px rgba(186, 85, 211, 0.4);

  /* ===== CODE BLOCKS ===== */
  --code-block-bg: rgba(26, 13, 46, 0.9);
  --code-block-border: 1px solid rgba(186, 85, 211, 0.2);
  --code-block-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
  --code-header-bg: rgba(186, 85, 211, 0.15);
  --code-header-text: #ba55d3;
  --code-header-border: 1px solid rgba(186, 85, 211, 0.2);
  --code-pre-bg: rgba(20, 10, 35, 0.95);
  --code-text: #f0e6ff;
  --code-line-height: 1.3;

  /* ===== INLINE CODE ===== */
  --inline-code-bg: rgba(186, 85, 211, 0.1);
  --inline-code-text: #ba55d3;
  --inline-code-border: 1px solid rgba(186, 85, 211, 0.2);`;

      case 'ancient':
        return `  /* ===== COLOR PALETTE ===== */
  --primary-bg: linear-gradient(135deg, #2c1810 0%, #5d4037 50%, #2c1810 100%);
  --body-overlay: radial-gradient(circle at 25% 75%, rgba(255, 193, 7, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(139, 69, 19, 0.05) 0%, transparent 50%);
  --primary-text: #f5f5dc;
  --heading-color: #ffffff;
  --paragraph-color: #e8dcc0;
  --accent-primary: #ffc107;
  --accent-secondary: #ff8f00;
  --accent-tertiary: #8b4513;
  --title-gradient: linear-gradient(135deg, #ffc107 0%, #ff8f00 50%, #8b4513 100%);

  /* ===== TYPOGRAPHY ===== */
  --font-primary: 'Libre Baskerville', serif;
  --font-heading: 'Cinzel', serif;
  --font-code: 'Roboto Mono', monospace;
  --heading-weight: 700;

  /* ===== EFFECTS ===== */
  --text-shadow: 0 0 10px rgba(255, 193, 7, 0.3);
  --glow-shadow: 0 0 20px rgba(255, 193, 7, 0.6), 0 0 30px rgba(255, 143, 0, 0.4);

  /* ===== NAVBAR ===== */
  --navbar-bg: rgba(44, 24, 16, 0.95);
  --navbar-border: 1px solid rgba(255, 193, 7, 0.2);
  --navbar-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  --navbar-text: #ffffff;

  /* ===== CONTENT AREAS ===== */
  --content-bg: rgba(93, 64, 55, 0.6);
  --content-border: 1px solid rgba(255, 193, 7, 0.15);
  --content-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  --section-border: 2px solid rgba(255, 143, 0, 0.3);

  /* ===== QUEST SECTIONS ===== */
  --quest-section-bg: rgba(93, 64, 55, 0.4);
  --quest-section-border: 1px solid rgba(255, 143, 0, 0.2);
  --quest-section-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  --quest-content-bg: rgba(93, 64, 55, 0.6);
  --quest-content-border: 1px solid rgba(255, 193, 7, 0.15);
  --quest-content-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  /* ===== QUEST LINKS ===== */
  --quest-link-bg: rgba(80, 50, 30, 0.7);
  --quest-link-border: 1px solid rgba(255, 193, 7, 0.2);
  --quest-link-text: #f5f5dc;
  --quest-link-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  --quest-link-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --quest-link-hover-overlay: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 143, 0, 0.1) 100%);
  --quest-link-hover-shadow: 0 8px 25px rgba(255, 193, 7, 0.3);
  --quest-link-hover-text: #ffc107;

  /* ===== NAVIGATION BUTTONS ===== */
  --nav-button-bg: rgba(255, 193, 7, 0.1);
  --nav-button-border: 1px solid rgba(255, 193, 7, 0.3);
  --nav-button-text: #ffc107;
  --nav-button-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  --nav-button-transition: all 0.3s ease;
  --nav-button-hover-bg: rgba(255, 193, 7, 0.2);
  --nav-button-hover-text: #ffffff;
  --nav-button-hover-shadow: 0 6px 20px rgba(255, 193, 7, 0.4);

  /* ===== CODE BLOCKS ===== */
  --code-block-bg: rgba(44, 24, 16, 0.9);
  --code-block-border: 1px solid rgba(255, 193, 7, 0.2);
  --code-block-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
  --code-header-bg: rgba(255, 193, 7, 0.15);
  --code-header-text: #ffc107;
  --code-header-border: 1px solid rgba(255, 193, 7, 0.2);
  --code-pre-bg: rgba(30, 20, 10, 0.95);
  --code-text: #f5f5dc;
  --code-line-height: 1.3;

  /* ===== INLINE CODE ===== */
  --inline-code-bg: rgba(255, 193, 7, 0.1);
  --inline-code-text: #ffc107;
  --inline-code-border: 1px solid rgba(255, 193, 7, 0.2);`;

      default:
        return `  /* ===== COLOR PALETTE ===== */
  --primary-bg: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 50%, #f5f5f5 100%);
  --body-overlay: none;
  --primary-text: #333333;
  --heading-color: #1976d2;
  --paragraph-color: #555555;
  --accent-primary: #1976d2;
  --accent-secondary: #42a5f5;
  --accent-tertiary: #0d47a1;
  --title-gradient: linear-gradient(135deg, #1976d2 0%, #42a5f5 50%, #0d47a1 100%);

  /* ===== TYPOGRAPHY ===== */
  --font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-heading: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-code: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  --heading-weight: 600;

  /* ===== EFFECTS ===== */
  --text-shadow: none;
  --glow-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  /* ===== NAVBAR ===== */
  --navbar-bg: rgba(255, 255, 255, 0.95);
  --navbar-border: 1px solid rgba(0, 0, 0, 0.1);
  --navbar-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  --navbar-text: #1976d2;

  /* ===== CONTENT AREAS ===== */
  --content-bg: rgba(255, 255, 255, 0.9);
  --content-border: 1px solid rgba(0, 0, 0, 0.1);
  --content-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  --section-border: 2px solid rgba(25, 118, 210, 0.2);

  /* ===== QUEST SECTIONS ===== */
  --quest-section-bg: rgba(250, 250, 250, 0.9);
  --quest-section-border: 1px solid rgba(0, 0, 0, 0.1);
  --quest-section-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  --quest-content-bg: rgba(255, 255, 255, 0.9);
  --quest-content-border: 1px solid rgba(0, 0, 0, 0.1);
  --quest-content-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);

  /* ===== QUEST LINKS ===== */
  --quest-link-bg: rgba(245, 245, 245, 0.9);
  --quest-link-border: 1px solid rgba(0, 0, 0, 0.1);
  --quest-link-text: #333333;
  --quest-link-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  --quest-link-transition: all 0.3s ease;
  --quest-link-hover-overlay: rgba(25, 118, 210, 0.05);
  --quest-link-hover-shadow: 0 4px 12px rgba(25, 118, 210, 0.2);
  --quest-link-hover-text: #1976d2;

  /* ===== NAVIGATION BUTTONS ===== */
  --nav-button-bg: rgba(25, 118, 210, 0.1);
  --nav-button-border: 1px solid rgba(25, 118, 210, 0.3);
  --nav-button-text: #1976d2;
  --nav-button-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  --nav-button-transition: all 0.3s ease;
  --nav-button-hover-bg: rgba(25, 118, 210, 0.2);
  --nav-button-hover-text: #0d47a1;
  --nav-button-hover-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);

  /* ===== CODE BLOCKS ===== */
  --code-block-bg: rgba(245, 245, 245, 0.9);
  --code-block-border: 1px solid rgba(0, 0, 0, 0.1);
  --code-block-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  --code-header-bg: rgba(25, 118, 210, 0.1);
  --code-header-text: #1976d2;
  --code-header-border: 1px solid rgba(25, 118, 210, 0.2);
  --code-pre-bg: rgba(250, 250, 250, 0.95);
  --code-text: #333333;
  --code-line-height: 1.4;

  /* ===== INLINE CODE ===== */
  --inline-code-bg: rgba(25, 118, 210, 0.1);
  --inline-code-text: #1976d2;
  --inline-code-border: 1px solid rgba(25, 118, 210, 0.2);`;
    }
  }

  // Removed getThemeKeyframes - animations are now in the existing theme.css

  private getThemeEmoji(theme: AdventureTheme): string {
    switch (theme) {
      case 'space': return '🚀 SPACE EXPLORATION THEME';
      case 'mythical': return '🏰 ENCHANTED KINGDOM THEME';
      case 'ancient': return '🏺 ANCIENT CIVILIZATION THEME';
      case 'developer': return '📖 DEVELOPER DOCUMENTATION THEME';
      default: return '🎨 CUSTOM THEME';
    }
  }

  private getThemeTitle(theme: AdventureTheme): string {
    switch (theme) {
      case 'space': return 'SPACE EXPLORATION THEME';
      case 'mythical': return 'ENCHANTED KINGDOM THEME';
      case 'ancient': return 'ANCIENT CIVILIZATION THEME';
      case 'developer': return 'DEVELOPER DOCUMENTATION THEME';
      default: return 'CUSTOM THEME';
    }
  }

  // Removed old hardcoded CSS method - now using variable-based approach above

  private generateIndexHTMLContent(storyContent: string): string {
    const questLinks = this.quests.map(quest => 
      `<a href="${quest.filename}" class="quest-link">
        <h3>${quest.title}</h3>
      </a>`
    ).join('\n');

    const adventureTitle = this.adventureManager.getTitle();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${adventureTitle}</title>
    <link rel="stylesheet" href="assets/theme.css">
</head>
<body>
    <nav class="navbar">
        <div class="nav-content">
            <h1>${adventureTitle}</h1>
        </div>
    </nav>
    
    <div class="container">
        <div class="story-content">
            ${this.formatContentForHTML(storyContent)}
        </div>
        
        <div class="quests-section">
            <h2>Available Quests</h2>
            ${questLinks}
        </div>
    </div>
</body>
</html>`;
  }

  private generateQuestHTMLContent(quest: QuestInfo, content: string, questIndex: number): string {
    const prevQuest = questIndex > 0 ? this.quests[questIndex - 1] : null;
    const nextQuest = questIndex < this.quests.length - 1 ? this.quests[questIndex + 1] : null;
    const adventureTitle = this.adventureManager.getTitle();

    const navigation = `
      <div class="quest-navigation">
        ${prevQuest ? `<a href="${prevQuest.filename}">← Previous: ${prevQuest.title}</a>` : ''}
        ${nextQuest ? `<a href="${nextQuest.filename}">Next: ${nextQuest.title} →</a>` : ''}
      </div>
    `;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${quest.title} - Repo Adventure</title>
    <link rel="stylesheet" href="assets/theme.css">
</head>
<body>
    <nav class="navbar">
        <div class="nav-content">
            <a href="index.html">${adventureTitle}</a>
        </div>
    </nav>
    
    <div class="container">
        <h1>${quest.title}</h1>
        
        ${navigation}
        
        <div class="quest-content">
            ${this.formatContentForHTML(content)}
        </div>
        
        ${navigation}
    </div>
</body>
</html>`;
  }

  private formatContentForHTML(content: string): string {
    // Use marked for proper markdown parsing with custom code block handling
    const codeBlockPlaceholders: string[] = [];
    let processedContent = content;
    
    // Step 1: Extract code blocks and replace with placeholders
    processedContent = processedContent.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (_match, lang, code) => {
      const language = lang || 'typescript';
      const formattedCode = this.formatCodeBlock(code, language);
      const codeBlockHtml = `<div class="code-block"><div class="code-header">${language}</div><pre><code class="language-${language}">${formattedCode}</code></pre></div>`;
      const placeholder = `CODEBLOCK${codeBlockPlaceholders.length}PLACEHOLDER`;
      codeBlockPlaceholders.push(codeBlockHtml);
      return placeholder;
    });
    
    // Step 2: Use marked to parse markdown properly (fixes asterisk issues)
    let htmlContent = marked(processedContent) as string;
    
    // Step 3: Fix inline code styling to match our CSS classes
    htmlContent = htmlContent.replace(/<code>/g, '<code class="inline-code">');
    
    // Step 4: Restore code blocks
    codeBlockPlaceholders.forEach((codeBlock, index) => {
      const placeholder = `CODEBLOCK${index}PLACEHOLDER`;
      htmlContent = htmlContent.replace(new RegExp(`<p>${placeholder}</p>`, 'g'), codeBlock);
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), codeBlock);
    });
    
    return htmlContent;
  }

  private formatCodeBlock(code: string, language: string): string {
    // Preserve indentation and add syntax highlighting classes
    return code
      .split('\n')
      .map(line => {
        // Preserve leading whitespace
        const indent = line.match(/^(\s*)/)?.[1] || '';
        const content = line.trim();
        
        if (!content) return '';
        
        // Add basic syntax highlighting for TypeScript/JavaScript
        if (language === 'typescript' || language === 'javascript') {
          return indent + this.highlightTypeScript(content);
        }
        
        return line;
      })
      .join('\n');
  }

  private highlightTypeScript(line: string): string {
    // Skip if already has HTML tags to prevent double-wrapping
    if (line.includes('<span') || line.includes('&lt;span')) {
      return line;
    }
    
    // More robust approach: apply highlighting in sequence and track what's been processed
    let processedLine = line;
    
    // 1. Comments first (to avoid highlighting keywords in comments)
    processedLine = processedLine.replace(/(\/\/.*$)/g, '<span class="comment">$1</span>');
    
    // 2. Strings (to avoid highlighting keywords in strings)
    processedLine = processedLine.replace(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="string">$1$2$1</span>');
    
    // 3. Keywords - more precise pattern to avoid conflicts
    processedLine = processedLine.replace(/\b(async|await|function|const|let|var|if|else|for|while|return|import|export|class|interface|type|Promise)\b(?![^<]*<\/span>)/g, (match, p1, offset, string) => {
      // Don't replace if already inside a span
      const beforeMatch = string.substring(0, offset);
      const lastOpenSpan = beforeMatch.lastIndexOf('<span');
      const lastCloseSpan = beforeMatch.lastIndexOf('</span>');
      if (lastOpenSpan > lastCloseSpan) {
        return match; // Inside a span, don't replace
      }
      return `<span class="keyword">${p1}</span>`;
    });
    
    // 4. Types
    processedLine = processedLine.replace(/\b(string|number|boolean|void|any|unknown|ProjectInfo|AdventureTheme|CustomThemeData)\b(?![^<]*<\/span>)/g, (match, p1, offset, string) => {
      const beforeMatch = string.substring(0, offset);
      const lastOpenSpan = beforeMatch.lastIndexOf('<span');
      const lastCloseSpan = beforeMatch.lastIndexOf('</span>');
      if (lastOpenSpan > lastCloseSpan) {
        return match;
      }
      return `<span class="type">${p1}</span>`;
    });
    
    // 5. Functions/methods
    processedLine = processedLine.replace(/(\w+)(\s*\()/g, (match, p1, p2, offset, string) => {
      const beforeMatch = string.substring(0, offset);
      const lastOpenSpan = beforeMatch.lastIndexOf('<span');
      const lastCloseSpan = beforeMatch.lastIndexOf('</span>');
      if (lastOpenSpan > lastCloseSpan) {
        return match;
      }
      return `<span class="function">${p1}</span>${p2}`;
    });
    
    // 6. Properties
    processedLine = processedLine.replace(/\.(\w+)(?!\s*\()/g, (match, p1, offset, string) => {
      const beforeMatch = string.substring(0, offset);
      const lastOpenSpan = beforeMatch.lastIndexOf('<span');
      const lastCloseSpan = beforeMatch.lastIndexOf('</span>');
      if (lastOpenSpan > lastCloseSpan) {
        return match;
      }
      return `.<span class="property">${p1}</span>`;
    });
    
    return processedLine;
  }
}

// Main execution
async function main() {
  const generator = new HTMLAdventureGenerator();
  await generator.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { HTMLAdventureGenerator };