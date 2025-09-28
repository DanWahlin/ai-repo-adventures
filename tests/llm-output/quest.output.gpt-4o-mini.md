# Quest 1: HTML Generator & Static Site Pipeline
---
In this quest, you will delve into the `HTMLAdventureGenerator` module, which orchestrates the generation of HTML files for interactive adventures. This module integrates the `TemplateEngine` for dynamic content rendering and the `AssetManager` for managing assets. Your journey will uncover how these components work in tandem to produce a cohesive adventure website from a codebase.

## Quest Objectives
As you explore the code below, investigate these key questions:
- 🔍 **Theme Configuration**: How does the system determine which theme to apply during the HTML generation process?
- ⚡ **HTTP Server Initialization**: What steps are taken to set up the HTTP server, and how does it handle requests for generated HTML content?
- 🛡️ **HTML Page Rendering**: In what ways does the `buildQuestHTML` function ensure that quest navigation is correctly managed across different quests?

## File Exploration
### packages/generator/src/cli/html-generator.ts: The Core HTML Generator Module
This file contains the `HTMLAdventureGenerator` class, which is responsible for generating the entire HTML adventure website. It manages the selection of themes, output directories, and the generation of various HTML pages. The class also handles user input and integrates multiple components for a seamless experience.

#### Highlights
- `generateAdventure`: This method orchestrates the entire adventure generation process, from analyzing the project to creating HTML files. It is crucial for ensuring that all components work together to produce the final output.
- `startHttpServer`: This method initializes an HTTP server that serves the generated HTML files, allowing users to interact with the adventure in a web browser.
- `buildQuestHTML`: This method constructs the HTML for individual quests, ensuring that navigation between quests is coherent and user-friendly.

## Code
### packages/generator/src/cli/html-generator.ts
```typescript
async generateAdventure(): Promise<void> {
    console.log(chalk.yellow.bold('🚀 Generating Adventure...'));
    console.log();

    // Load repository URL from adventure.config.json
    const config = parseAdventureConfig(this.projectPath);
    if (config && typeof config === 'object' && 'adventure' in config) {
        const adventure = (config as any).adventure;
        if (adventure && typeof adventure.url === 'string') {
            this.repoUrl = adventure.url.replace(/\/$/, ''); // Remove trailing slash
        }
    }

    // Step 1: Generate project analysis
    console.log(chalk.dim('📊 Analyzing codebase...'));
    const repomixContent = await repoAnalyzer.generateRepomixContext(this.projectPath);
    const projectInfo = createProjectInfo(repomixContent);

    // Step 2: Initialize adventure
    console.log(chalk.dim('✨ Generating themed story and quests...'));
    const storyContent = await this.adventureManager.initializeAdventure(
        projectInfo, 
        this.selectedTheme, 
        this.projectPath,
        this.customThemeData
    );

    // Save story content if logging is enabled
    this.saveLlmOutput('story.output.md', storyContent);

    // Step 3: Extract quest information
    this.extractQuestInfo();

    // Step 3.5: Trim quests array if max-quests is specified (before homepage generation)
    const questsToGenerate = this.maxQuests !== undefined ? Math.min(this.maxQuests, this.quests.length) : this.quests.length;
    if (questsToGenerate < this.quests.length) {
        this.quests = this.quests.slice(0, questsToGenerate);
    }

    // Step 4: Generate all files
    console.log(chalk.dim('🎨 Creating theme styling...'));
    this.generateThemeCSS();

    console.log(chalk.dim('🧭 Adding quest navigator...'));
    if (!this.isMultiTheme) {
        this.copyQuestNavigator();
    }

    console.log(chalk.dim('🖼️ Copying images...'));
    this.copyImages();

    console.log(chalk.dim('📝 Creating main adventure page...'));
    this.generateIndexHTML();

    console.log(chalk.dim('📖 Generating quest pages...'));
    await this.generateQuestPages();

    console.log(chalk.dim('🎉 Creating adventure summary page...'));
    await this.generateSummaryHTML();
}
```
- This code initiates the adventure generation process, analyzing the project structure and initializing the adventure based on the selected theme. It is essential for coordinating all subsequent steps in the HTML generation pipeline.
- It uses async/await for handling asynchronous operations, ensuring a smooth flow of execution while managing potentially time-consuming tasks like file I/O.
- The method also incorporates error handling and logging to provide feedback during the generation process, which is vital for debugging and understanding the workflow.

---

```typescript
async startHttpServer(port: number = 8080): Promise<void> {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            let filePath = path.join(this.outputDir, req.url === '/' ? 'index.html' : req.url || '');
            
            // Security check - ensure we stay within the directory
            if (!filePath.startsWith(this.outputDir)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }

            // Set content type based on file extension
            const extname = path.extname(filePath);
            let contentType = 'text/html';
            switch (extname) {
                case '.js':
                    contentType = 'text/javascript';
                    break;
                case '.css':
                    contentType = 'text/css';
                    break;
                case '.json':
                    contentType = 'application/json';
                    break;
                case '.png':
                    contentType = 'image/png';
                    break;
                case '.jpg':
                    contentType = 'image/jpg';
                    break;
                case '.svg':
                    contentType = 'image/svg+xml';
                    break;
            }

            fs.readFile(filePath, (err, content) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        res.writeHead(404);
                        res.end('File not found');
                    } else {
                        res.writeHead(500);
                        res.end('Server error');
                    }
                } else {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(content, 'utf-8');
                }
            });
        });

        server.listen(port, () => {
            const url = `http://localhost:${port}`;
            console.log(chalk.green(`🌐 HTTP server started on ${url}`));
            
            // Open browser after a brief delay
            setTimeout(() => {
                this.openBrowser(url);
            }, 1000);
            
            console.log(chalk.dim('\n💡 Press Ctrl+C to stop the server when you\'re done exploring'));
            
            // Keep the server running - user will stop with Ctrl+C
            process.on('SIGINT', () => {
                console.log(chalk.yellow('\n👋 Shutting down HTTP server...'));
                server.close(() => {
                    console.log(chalk.green('✅ Server stopped successfully!'));
                    process.exit(0);
                });
            });
            
            process.on('SIGTERM', () => {
                server.close(() => process.exit(0));
            });
            
            resolve();
        });

        server.on('error', (err) => {
            console.error(chalk.red('❌ Failed to start HTTP server:'), err);
            console.log(chalk.yellow('\n📁 Files are still available at:'));
            console.log(chalk.cyan(`  ${this.outputDir}`));
            reject(err);
        });
    });
}
```
- This method sets up an HTTP server to serve the generated HTML files, allowing users to access the adventure through a web browser.
- It includes security checks to prevent directory traversal attacks, ensuring that only files within the designated output directory can be accessed.
- The server listens for incoming requests and responds with the appropriate file content, handling errors gracefully to provide useful feedback to the user.

---

```typescript
private buildQuestHTML(quest: QuestInfo, content: string, questIndex: number): string {
    const prevQuest = questIndex > 0 ? this.quests[questIndex - 1] : null;
    const nextQuest = questIndex < this.quests.length - 1 ? this.quests[questIndex + 1] : null;

    let bottomNavigation = '';
    const isLastQuest = questIndex === this.quests.length - 1;
    
    if (prevQuest || nextQuest || isLastQuest) {
        // Determine navigation CSS class based on which buttons are present
        let navClass = 'quest-navigation quest-navigation-bottom';
        const hasCompleteButton = isLastQuest; // Last quest always has complete button
        
        if (prevQuest && nextQuest) {
            // Both buttons present - use default space-between
        } else if (prevQuest && !nextQuest && !hasCompleteButton) {
            navClass += ' nav-prev-only';
        } else if (!prevQuest && nextQuest) {
            navClass += ' nav-next-only';
        } else if (!prevQuest && hasCompleteButton) {
            // Single quest with complete button only
            navClass += ' nav-next-only';
        }
        
        bottomNavigation = `
        <div class="${navClass}">`;
        
        if (prevQuest) {
            bottomNavigation += `
            <a href="${prevQuest.filename}" class="prev-quest-btn">← Previous: Quest ${questIndex}</a>`;
        }
        
        if (nextQuest) {
            bottomNavigation += `
            <a href="${nextQuest.filename}" class="next-quest-btn">Next: Quest ${questIndex + 2} →</a>`;
        } else if (isLastQuest) {
            // On the last quest, add a button to go to summary page
            bottomNavigation += `
            <a href="summary.html" class="next-quest-btn complete-btn">Complete Adventure →</a>`;
        }
        
        bottomNavigation += `
        </div>
        `;
    }

    const variables = {
        ...this.getCommonTemplateVariables(),
        PAGE_TITLE: this.stripHTML(this.formatInlineMarkdown(quest.title)),
        QUEST_CONTENT: this.formatMarkdown(content),
        BOTTOM_NAVIGATION: bottomNavigation
    };

    return this.templateEngine.renderPage('quest-template.html', variables);
}
```
- This method constructs the HTML for individual quests, managing navigation between quests effectively.
- It builds dynamic links for previous and next quests, as well as a completion button for the last quest, enhancing user experience and navigation.
- The method utilizes template rendering to ensure consistent formatting and styling across all quest pages.

---

## Helpful Hints
- Review the flow of the `generateAdventure` method to understand how each step builds upon the previous one.
- Pay attention to how the `startHttpServer` method handles incoming requests and serves files securely.
- Look for patterns in how quests are rendered in HTML to grasp the importance of navigation in enhancing user engagement.

---
You have mastered all the secrets of the HTML Generator and Static Site Pipeline! Your adventure is complete.

Congratulations on successfully completing Quest 1: HTML Generator & Static Site Pipeline, a pivotal step in your journey to mastering static site generation and web development best practices! 🚀