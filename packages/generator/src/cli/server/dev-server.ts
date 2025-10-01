import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { SERVER_CONFIG } from '../constants.js';

/**
 * Handles HTTP server operations for serving generated adventure files
 */
export class DevServer {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
  }

  /**
   * Start an HTTP server in the output directory
   */
  async start(port: number = SERVER_CONFIG.DEFAULT_PORT): Promise<void> {
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

  /**
   * Open URL in default browser
   */
  private openBrowser(url: string): void {
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
}
