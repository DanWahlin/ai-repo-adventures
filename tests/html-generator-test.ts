#!/usr/bin/env node

/**
 * HTML Generator Test
 * 
 * Tests the HTML generator with minimal LLM calls:
 * - 1 story generation 
 * - 1 quest generation
 * - Outputs to tests/public for inspection
 */

import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { spawn } from 'child_process';
import { HTMLAdventureGenerator } from '../src/cli/html-generator.js';
import { repoAnalyzer } from '../src/analyzer/repo-analyzer.js';
import { createProjectInfo } from '../src/tools/shared.js';
import chalk from 'chalk';

/**
 * Start an HTTP server in the specified directory
 */
function startHTTPServer(directory: string, port: number = 8080): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(directory, req.url === '/' ? 'index.html' : req.url || '');
      
      // Security check - ensure we stay within the directory
      if (!filePath.startsWith(directory)) {
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
      console.log(chalk.green(`🌐 HTTP server started on http://localhost:${port}`));
      resolve(server);
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Open URL in default browser
 */
function openBrowser(url: string): void {
  const platform = process.platform;
  let command: string;
  
  switch (platform) {
    case 'darwin':
      command = 'open';
      break;
    case 'win32':
      command = 'start';
      break;
    default:
      command = 'xdg-open';
  }

  try {
    spawn(command, [url], { detached: true, stdio: 'ignore' });
    console.log(chalk.cyan(`🚀 Opening ${url} in default browser`));
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Could not automatically open browser. Please visit: ${url}`));
  }
}

async function runHTMLGeneratorTest() {
  console.log(chalk.blue('🧪 HTML Generator Test - Minimal LLM Usage\n'));
  
  try {
    // Step 1: Setup test output directory
    const testOutputDir = path.join(process.cwd(), 'tests', 'public');
    
    // Clean up previous test output
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
    
    fs.mkdirSync(testOutputDir, { recursive: true });
    console.log(chalk.dim(`📁 Test output directory: ${testOutputDir}`));
    
    // Step 2: Generate minimal project info
    console.log(chalk.dim('📊 Analyzing project...'));
    const projectPath = process.cwd();
    const repomixContent = await repoAnalyzer.generateRepomixContext(projectPath);
    const projectInfo = createProjectInfo(repomixContent);
    
    console.log(chalk.green(`✅ Analyzed ${projectInfo.fileCount} files`));
    
    // Step 3: Initialize HTML generator with test configuration
    const generator = new HTMLAdventureGenerator();
    
    // Override internal properties for testing
    (generator as any).outputDir = testOutputDir;
    (generator as any).selectedTheme = 'space';
    (generator as any).projectPath = projectPath;
    
    console.log(chalk.dim('🎨 Using space theme...'));
    
    // Step 4: Generate story and quests using the adventure manager directly
    console.log(chalk.yellow('🚀 Generating story (1 LLM call)...'));
    const storyWithQuests = await (generator as any).adventureManager.initializeAdventure(projectInfo, 'space', projectPath);
    
    // Get the generated quests from the adventure manager
    const quests = (generator as any).adventureManager.getAllQuests().map((quest: any, index: number) => ({
      id: String(index + 1),
      title: quest.title,
      filename: `quest-${index + 1}.html`
    }));
    
    // Store quests in the generator for later use
    (generator as any).quests = quests;
    
    console.log(chalk.green(`✅ Generated story with ${quests.length} quests`));
    
    // Step 5: Generate HTML for just the first quest
    if (quests.length > 0) {
      console.log(chalk.yellow('📝 Generating first quest content (1 LLM call)...'));
      
      // Generate only the first quest
      const firstQuest = quests[0];
      const questContent = await (generator as any).generateQuestContentWithRetry(firstQuest.id);
      
      // Generate HTML files
      console.log(chalk.dim('🌐 Generating HTML files...'));
      
      // Generate index.html
      const indexHTML = (generator as any).generateIndexHTMLContent(storyWithQuests);
      const indexPath = path.join(testOutputDir, 'index.html');
      fs.writeFileSync(indexPath, indexHTML);
      
      // Generate CSS
      const themeCSS = (generator as any).getThemeCSS('space');
      const assetsDir = path.join(testOutputDir, 'assets');
      fs.mkdirSync(assetsDir, { recursive: true });
      const cssPath = path.join(assetsDir, 'theme.css');
      fs.writeFileSync(cssPath, themeCSS);
      
      // Generate quest HTML
      const questHTML = (generator as any).generateQuestHTMLContent(firstQuest, questContent, 0);
      const questPath = path.join(testOutputDir, firstQuest.filename);
      fs.writeFileSync(questPath, questHTML);
      
      console.log(chalk.green('✅ Generated HTML files:'));
      console.log(chalk.dim(`  • ${indexPath}`));
      console.log(chalk.dim(`  • ${cssPath}`));
      console.log(chalk.dim(`  • ${questPath}`));
      
      // Step 6: Test summary
      console.log(chalk.green('\n🎉 HTML Generator Test Complete!'));
      console.log(chalk.white('📋 Summary:'));
      console.log(chalk.dim(`  • LLM calls made: 2 (story + 1 quest)`));
      console.log(chalk.dim(`  • Files generated: 3 (index.html, theme.css, ${firstQuest.filename})`));
      console.log(chalk.dim(`  • Output location: ${testOutputDir}`));
      console.log(chalk.dim(`  • Quest generated: "${firstQuest.title}"`));
      
      // Step 7: Start HTTP server and open browser
      console.log(chalk.blue('\n🌐 Starting HTTP server and opening browser...'));
      
      try {
        const port = 8080;
        const url = `http://localhost:${port}`;
        
        // Start HTTP server
        const server = await startHTTPServer(testOutputDir, port);
        
        // Open browser after a brief delay
        setTimeout(() => {
          openBrowser(url);
        }, 1000);
        
        console.log(chalk.green('\n✨ Test completed successfully!'));
        console.log(chalk.cyan(`📖 Adventure is now available at: ${url}`));
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
        
      } catch (serverError) {
        console.error(chalk.red('❌ Failed to start HTTP server:'), serverError);
        console.log(chalk.yellow('\n📁 Files are still available at:'));
        console.log(chalk.cyan(`  ${testOutputDir}`));
        console.log(chalk.yellow('\nYou can manually start a server with:'));
        console.log(chalk.cyan(`  cd ${testOutputDir}`));
        console.log(chalk.cyan(`  python -m http.server 8080`));
        process.exit(0);
      }
      
    } else {
      throw new Error('No quests were generated');
    }
    
  } catch (error) {
    console.error(chalk.red('❌ HTML Generator Test failed:'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runHTMLGeneratorTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export { runHTMLGeneratorTest };