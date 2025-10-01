import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { marked } from 'marked';
import { parseAdventureConfig } from '@codewithdan/ai-repo-adventures-core/shared';
import { PARSING_CONFIG } from '../constants.js';

/**
 * Handles markdown and HTML content processing, formatting, and hyperlink generation
 */
export class ContentProcessor {
  private projectPath: string;
  private repoUrl: string | null;

  constructor(projectPath: string, repoUrl: string | null) {
    this.projectPath = projectPath;
    this.repoUrl = repoUrl;
  }

  /**
   * Format inline markdown (bold, italic, code)
   */
  formatInlineMarkdown(text: string): string {
    // This could use marked.parseInline() but keeping it simple for title formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');
  }

  /**
   * Convert markdown to HTML with file path highlighting and hyperlinks
   */
  formatMarkdown(content: string): string {
    // Pure markdown to HTML conversion - no post-processing
    let htmlContent = marked(content) as string;

    // Only add CSS class to inline code and hyperlinks - nothing else
    htmlContent = htmlContent
      .replace(/<code>/g, '<code class="inline-code">');  // Add CSS class to inline code

    // Highlight file path prefixes (e.g., "src/tools/tools.ts:")
    htmlContent = this.highlightFilePathPrefixes(htmlContent);

    // Add hyperlinks to file references if we have a repo URL
    if (this.repoUrl) {
      htmlContent = this.addFileHyperlinksToHTML(htmlContent);
    }

    return htmlContent;
  }

  /**
   * Highlights prefixes in headings that contain colons
   * Matches everything up to and including the first colon in h3-h6 headings only
   * Excludes h1 and h2 tags to avoid affecting quest titles
   */
  private highlightFilePathPrefixes(htmlContent: string): string {
    // Pattern to match content before and including the first colon in h3-h6 headings only
    const headingColonPattern = /(<h[3-6][^>]*>)([^<]*?)(:)([^<]*?)(<\/h[3-6]>)/g;

    return htmlContent.replace(
      headingColonPattern,
      (_match, openTag, beforeColon, colon, afterColon, closeTag) => {
        return `${openTag}<span class="header-prefix">${beforeColon}${colon}</span>${afterColon}${closeTag}`;
      }
    );
  }

  /**
   * Strip HTML tags from content
   */
  stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Converts file paths and function names in HTML content to GitHub URLs
   * Handles file paths within code tags and plain text
   * Detects function names and links to specific line numbers in GitHub
   */
  private addFileHyperlinksToHTML(htmlContent: string): string {
    if (!this.repoUrl) return htmlContent;

    // Robust pattern that detects any path-like structure with file extensions
    // Matches: dir/file.ext, packages/name/src/file.ext, ./relative/path/file.ext, etc.
    // Requires at least one directory separator and a supported file extension
    const filePathPattern = /\.?\/?(?:[\w-]+\/)+[\w.-]+\.(ts|js|tsx|jsx|css|json|md|py|java|go|rs|cpp|c|h|hpp|php|rb|swift|kt|scala|clj|hs|ml|fs|ex|exs|elm|dart|lua|r|m|pl|sh|bat|ps1|yaml|yml|toml|ini|cfg|conf|properties)/;

    const createGitHubLink = (filePath: string, lineNumber?: number): string => {
      const normalizedPath = filePath.replace(/^\.?\//, ''); // Remove leading ./ or /
      const baseUrl = `${this.repoUrl}/blob/main/${normalizedPath}`;
      return lineNumber ? `${baseUrl}#L${lineNumber}` : baseUrl;
    };

    // Build function-to-line mapping for enhanced linking
    const functionLineMap = this.buildFunctionLineMap();


    // Convert function names and file paths in inline code to hyperlinks
    htmlContent = htmlContent.replace(
      /<code class="inline-code">([^<]*)<\/code>/g,
      (match, codeContent) => {

        // Check if it's a file path first
        const fileMatch = codeContent.match(filePathPattern);
        if (fileMatch) {
          const filePath = fileMatch[0];
          const githubUrl = createGitHubLink(filePath);
          const normalizedPath = filePath.replace(/^\.?\//, '');
          return `<a href="${githubUrl}" target="_blank" rel="noopener noreferrer"><code class="inline-code">${normalizedPath}</code></a>`;
        }

        // Check if it's a function name (simple pattern: word characters, dots, optional parentheses)
        const functionMatch = codeContent.match(/^[\w.-]+(?:\(\))?$/);
        if (functionMatch) {

          // First try to find exact match (including qualified names like Class.method)
          if (functionLineMap.has(codeContent)) {
            const { filePath, lineNumber } = functionLineMap.get(codeContent)!;
            const githubUrl = createGitHubLink(filePath, lineNumber);
            return `<a href="${githubUrl}" target="_blank" rel="noopener noreferrer"><code class="inline-code">${codeContent}</code></a>`;
          }

          // If no exact match, try without parentheses
          const cleanName = codeContent.replace(/\(\)$/, '');
          if (functionLineMap.has(cleanName)) {
            const { filePath, lineNumber } = functionLineMap.get(cleanName)!;
            const githubUrl = createGitHubLink(filePath, lineNumber);
            return `<a href="${githubUrl}" target="_blank" rel="noopener noreferrer"><code class="inline-code">${codeContent}</code></a>`;
          }

          // If still no match, try to find a qualified version (Class.method)
          // Look for any entry that ends with .cleanName
          for (const [qualifiedName, info] of functionLineMap.entries()) {
            if (qualifiedName.includes('.') && qualifiedName.endsWith(`.${cleanName}`)) {
              const { filePath, lineNumber } = info;
              const githubUrl = createGitHubLink(filePath, lineNumber);
              return `<a href="${githubUrl}" target="_blank" rel="noopener noreferrer"><code class="inline-code">${codeContent}</code></a>`;
            }
          }

        }

        return match;
      }
    );

    // Convert file paths in headings (h3-h6) to hyperlinks
    htmlContent = htmlContent.replace(
      /<(h[3-6][^>]*)>([^<]*)<\/(h[3-6])>/g,
      (match, openTag, headingContent, closeTag) => {
        const fileMatch = headingContent.match(filePathPattern);
        if (fileMatch) {
          const filePath = fileMatch[0];
          const githubUrl = createGitHubLink(filePath);
          const linkedContent = headingContent.replace(filePath, `<a href="${githubUrl}" target="_blank" rel="noopener noreferrer">${filePath}</a>`);
          return `<${openTag}>${linkedContent}</${closeTag}>`;
        }
        return match;
      }
    );

    // Convert file paths in header-prefix spans to hyperlinks
    htmlContent = htmlContent.replace(
      /<span class="header-prefix">([^<]*)<\/span>/g,
      (match, spanContent) => {
        const fileMatch = spanContent.match(filePathPattern);
        if (fileMatch) {
          const filePath = fileMatch[0];
          const githubUrl = createGitHubLink(filePath);
          const linkedContent = spanContent.replace(filePath, `<a href="${githubUrl}" target="_blank" rel="noopener noreferrer">${filePath}</a>`);
          return `<span class="header-prefix">${linkedContent}</span>`;
        }
        return match;
      }
    );

    return htmlContent;
  }

  /**
   * Builds a map of function names to their file paths and line numbers
   * Scans source files to find function definitions
   */
  private buildFunctionLineMap(): Map<string, { filePath: string; lineNumber: number }> {
    const functionMap = new Map<string, { filePath: string; lineNumber: number }>();

    try {
      // Get adventure config to know which files to scan
      const parsed = parseAdventureConfig(this.projectPath);
      if (!parsed || typeof parsed !== 'object') {
        return functionMap;
      }

      const config = parsed as any;
      if (!config?.adventure?.quests) {
        return functionMap;
      }

      // First, collect all highlights from adventure config to prioritize specific functions
      const highlights = new Map<string, { filePath: string; functionName: string }>();
      for (const quest of config.adventure.quests) {
        for (const fileConfig of quest.files || []) {
          if (fileConfig.highlights) {
            for (const highlight of fileConfig.highlights) {
              const parts = highlight.name.split('.');
              if (parts.length === 2) {
                // Qualified name like "ClassName.methodName"
                highlights.set(highlight.name, { filePath: fileConfig.path, functionName: parts[1] });
              } else {
                // Simple name
                highlights.set(highlight.name, { filePath: fileConfig.path, functionName: highlight.name });
              }
            }
          }
        }
      }

      // Scan all files mentioned in adventure config
      for (const quest of config.adventure.quests) {
        for (const fileConfig of quest.files || []) {
          const filePath = fileConfig.path;
          const fullPath = path.join(this.projectPath, filePath);

          if (fs.existsSync(fullPath)) {
            this.scanFileForFunctions(fullPath, filePath, functionMap, highlights);
          }
        }
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️ Warning: Could not build function line map'));
    }

    return functionMap;
  }

  /**
   * Scans a single file for function definitions and adds them to the map
   */
  private scanFileForFunctions(
    fullPath: string,
    relativePath: string,
    functionMap: Map<string, { filePath: string; lineNumber: number }>,
    highlights?: Map<string, { filePath: string; functionName: string }>
  ): void {
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const contextStack: Array<'class' | 'block'> = [];
      const classStack: string[] = [];
      let pendingClassName: string | null = null;
      let inBlockComment = false;
      let inString: string | null = null;

      for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const line = rawLine.trim();
        const lineNumber = i + 1;
        const classDeclarationMatch = line.match(/^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+(\w+)/);

        if (classDeclarationMatch) {
          pendingClassName = classDeclarationMatch[1];
        }

        const currentClassName = classStack[classStack.length - 1];

        // TypeScript/JavaScript function patterns - more precise to match only definitions
        const patterns = [
          // Method definitions with visibility modifiers: private/public methodName(
          /^\s*(?:private|public|protected|static)?\s*(\w+)\s*\([^)]*\)\s*:\s*[^{]+\s*\{/,
          // Method definitions with visibility modifiers and async: private async methodName(
          /^\s*(?:private|public|protected|static)?\s*async\s+(\w+)\s*\([^)]*\)\s*:\s*[^{]+\s*\{/,
          // Function declarations, allowing optional export/default/async prefixes
          /^\s*(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+(\w+)\s*\(/,
          // Arrow functions assigned to const/let/var with optional export/default prefix
          /^\s*(?:export\s+(?:default\s+)?)?(?:const|let|var)\s+(\w+)\s*=\s*.*=>/,
          // Class methods without visibility: methodName( followed by : or {
          /^\s*(\w+)\s*\([^)]*\)\s*[:{]/,
          // Async methods (including exported async arrow functions are covered above)
          /^\s*async\s+(\w+)\s*\(/
        ];

        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            const functionName = match[1];

            // Skip common non-function words
            if (PARSING_CONFIG.SKIP_KEYWORDS.includes(functionName as any)) {
              continue;
            }

            // Store function with priority: highlights take precedence

            if (currentClassName) {
              const qualifiedName = `${currentClassName}.${functionName}`;

              // Check if this function is highlighted in adventure config
              const isHighlighted = highlights && (
                highlights.has(qualifiedName) ||
                (highlights.has(functionName) && highlights.get(functionName)?.filePath === relativePath)
              );

              // Always store qualified name (class.method)
              functionMap.set(qualifiedName, { filePath: relativePath, lineNumber });

              // Store simple name with priority for highlighted functions
              if (isHighlighted || !functionMap.has(functionName)) {
                functionMap.set(functionName, { filePath: relativePath, lineNumber });
              }
            } else {
              // No class context
              const isHighlighted = highlights &&
                highlights.has(functionName) &&
                highlights.get(functionName)?.filePath === relativePath;

              // Store simple name with priority for highlighted functions
              if (isHighlighted || !functionMap.has(functionName)) {
                functionMap.set(functionName, { filePath: relativePath, lineNumber });
              }
            }
          }
        }

        for (let index = 0; index < rawLine.length; index++) {
          const char = rawLine[index];
          const nextChar = rawLine[index + 1];

          if (inBlockComment) {
            if (char === '*' && nextChar === '/') {
              inBlockComment = false;
              index++; // Skip closing '/'
            }
            continue;
          }

          if (inString) {
            if (char === '\\' && nextChar !== undefined) {
              index++; // Skip escaped character
              continue;
            }

            if (char === inString) {
              inString = null;
            }
            continue;
          }

          if (char === '/' && nextChar === '*') {
            inBlockComment = true;
            index++;
            continue;
          }

          if (char === '/' && nextChar === '/') {
            break;
          }

          if (char === '"' || char === '\'' || char === '`') {
            inString = char;
            continue;
          }

          if (char === '{') {
            if (pendingClassName) {
              contextStack.push('class');
              classStack.push(pendingClassName);
              pendingClassName = null;
            } else {
              contextStack.push('block');
            }
          } else if (char === '}') {
            const context = contextStack.pop();
            if (context === 'class') {
              classStack.pop();
            }
          }
        }

        if (pendingClassName && line.endsWith(';')) {
          pendingClassName = null;
        }
      }
    } catch (error) {
      // Log warning but continue - file scanning is best-effort
      console.log(chalk.yellow(`⚠️  Warning: Could not scan ${relativePath} for functions`));
      if (error instanceof Error) {
        console.log(chalk.dim(`   Error: ${error.message}`));
      }
    }
  }
}
