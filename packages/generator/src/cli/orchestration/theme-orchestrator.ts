import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { AdventureTheme, parseAdventureConfig } from '@codewithdan/ai-repo-adventures-core/shared';
import { RateLimitError, RateLimitType } from '@codewithdan/ai-repo-adventures-core/llm';
import { TemplateEngine } from '../template-engine.js';
import { RateLimitHandler } from '../generation/rate-limit-handler.js';
import { DevServer } from '../server/dev-server.js';

/**
 * Interface for theme generation callback
 */
interface ThemeGeneratorFn {
  (theme: AdventureTheme, themeDir: string): Promise<void>;
}

/**
 * Handles orchestration of multi-theme generation
 */
export class ThemeOrchestrator {
  private templateEngine: TemplateEngine;
  private rateLimitHandler: RateLimitHandler;
  private projectPath: string;
  private outputDir: string;
  private maxQuests?: number;
  private logLlmOutput: boolean;
  private logLlmOutputDir: string;
  private serve: boolean;
  private processingMode: 'parallel' | 'sequential' = 'parallel';
  private completedThemes = new Set<string>();

  constructor(
    projectPath: string,
    outputDir: string,
    maxQuests: number | undefined,
    logLlmOutput: boolean,
    logLlmOutputDir: string,
    serve: boolean,
    processingMode: 'parallel' | 'sequential' = 'parallel'
  ) {
    this.templateEngine = new TemplateEngine();
    this.rateLimitHandler = new RateLimitHandler(this.completedThemes);
    this.projectPath = projectPath;
    this.outputDir = outputDir;
    this.maxQuests = maxQuests;
    this.logLlmOutput = logLlmOutput;
    this.logLlmOutputDir = logLlmOutputDir;
    this.serve = serve;
    this.processingMode = processingMode;
  }

  /**
   * Generate all themes with parallel or sequential processing
   */
  async generateAllThemes(
    generateThemeFn: ThemeGeneratorFn,
    getAssetManagerFn: () => Promise<any>
  ): Promise<void> {
    console.log(chalk.green('✅ Generating all themes'));
    console.log(chalk.cyan(`📋 Processing mode: ${this.processingMode === 'sequential' ? 'Sequential (--sequential flag)' : 'Parallel (default)'}`));

    // Copy shared assets
    const assetManager = await getAssetManagerFn();
    assetManager.copySharedNavigator(this.outputDir);
    assetManager.copyGlobalAssets(this.outputDir);
    assetManager.copyImages(this.outputDir, true);

    // Generate initial homepage
    console.log(chalk.yellow('🏠 Creating initial homepage (will be updated after theme generation)...'));
    try {
      this.generateHomepageIndex();
      console.log(chalk.green('✅ Initial homepage index.html created'));
    } catch (homepageError) {
      console.log(chalk.yellow(`⚠️  Could not create initial homepage: ${homepageError}`));
    }

    const themes: AdventureTheme[] = ['space', 'mythical', 'ancient', 'developer'];

    // Process themes based on current mode
    try {
      if (this.processingMode === 'sequential') {
        await this.generateThemesSequentially(themes, generateThemeFn);
      } else {
        await this.generateThemesInParallel(themes, generateThemeFn);
      }
    } catch (error) {
      // Check if this is any rate limit error that needs recovery
      if (error instanceof RateLimitError &&
          (error.type === RateLimitType.TOKEN_RATE_EXCEEDED || error.type === RateLimitType.REQUEST_RATE_LIMIT)) {
        await this.rateLimitHandler.handleTokenRateLimitAndRetry(
          themes,
          error,
          (remainingThemes) => this.generateThemesSequentially(remainingThemes, generateThemeFn)
        );
      } else {
        // Log the error but continue to generate homepage
        console.log(chalk.yellow(`⚠️  Theme generation encountered errors: ${error}`));
        console.log(chalk.yellow('🏠 Continuing with homepage generation...'));
      }
    } finally {
      // Always generate homepage index.html when using --theme all
      console.log(chalk.yellow('\n🏠 Generating homepage...'));
      try {
        this.generateHomepageIndex();
        console.log(chalk.green('✅ Homepage index.html created successfully'));
      } catch (homepageError) {
        console.log(chalk.red(`❌ Failed to generate homepage: ${homepageError}`));
      }
    }

    console.log();
    console.log(chalk.green.bold('🎉 All themes generated successfully!'));
    console.log(chalk.cyan(`📁 Location: ${this.outputDir}`));

    if (this.serve) {
      const devServer = new DevServer(this.outputDir);
      await devServer.start();
    } else {
      console.log(chalk.cyan(`🌐 Open: ${path.join(this.outputDir, 'index.html')}`));
    }
  }

  /**
   * Generate themes in parallel for faster completion
   */
  private async generateThemesInParallel(
    themes: AdventureTheme[],
    generateThemeFn: ThemeGeneratorFn
  ): Promise<void> {
    console.log(chalk.blue(`\n🎯 Starting parallel generation of ${themes.length} themes...`));
    console.log(chalk.dim('Themes will be generated concurrently for faster completion'));

    const progress = {
      completed: 0,
      total: themes.length
    };

    // Create all theme generation promises
    const themePromises = themes.map(async (theme, index) => {
      const startTime = Date.now();
      console.log(chalk.yellow(`🚀 [${index + 1}/${themes.length}] Starting ${theme} theme generation...`));

      // Create theme-specific directory
      const themeDir = path.join(this.outputDir, theme);
      fs.mkdirSync(themeDir, { recursive: true });
      fs.mkdirSync(path.join(themeDir, 'assets'), { recursive: true });

      try {
        await generateThemeFn(theme, themeDir);

        // Mark theme as completed
        this.completedThemes.add(theme);

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        progress.completed++;
        console.log(chalk.green(`✅ [${progress.completed}/${progress.total}] ${theme} theme completed in ${duration}s`));

        return { theme, success: true };
      } catch (error) {
        // Check if this is any rate limit error OR a quest failure
        if (error instanceof RateLimitError &&
            (error.type === RateLimitType.TOKEN_RATE_EXCEEDED || error.type === RateLimitType.REQUEST_RATE_LIMIT)) {
          throw error;
        }

        // Check if this is a quest failure (fail-fast strategy)
        if (error instanceof Error && error.message.includes('Quest generation failed')) {
          console.log(chalk.yellow(`\n⚠️  Quest failure detected in ${theme} theme`));
          throw new RateLimitError(
            RateLimitType.REQUEST_RATE_LIMIT,
            60,
            'Quest generation failed - switching to sequential mode for consistency',
            error
          );
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        progress.completed++;
        console.log(chalk.red(`❌ [${progress.completed}/${progress.total}] ${theme} theme failed after ${duration}s:`, error instanceof Error ? error.message : error));

        return { theme, success: false, error };
      }
    });

    // Wait for all themes to complete
    console.log(chalk.blue('\n⏳ Generating themes in parallel...'));
    const results = await Promise.allSettled(themePromises);

    // Process results and show summary
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(chalk.blue('\n📊 Generation Summary:'));
    console.log(chalk.green(`  ✅ Successful: ${successful}/${themes.length}`));
    if (failed > 0) {
      console.log(chalk.red(`  ❌ Failed: ${failed}/${themes.length}`));
    }

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { theme, success } = result.value;
        if (success) {
          console.log(chalk.dim(`    ✓ ${theme}`));
        } else {
          console.log(chalk.dim(`    ✗ ${theme} - generation failed`));
        }
      } else {
        console.log(chalk.dim(`    ✗ ${themes[index]} - promise rejected`));
      }
    });

    // Check if any theme hit a rate limit and re-throw
    const rateLimitRejection = results.find(
      result =>
        result.status === 'rejected' &&
        result.reason instanceof RateLimitError &&
        (result.reason.type === RateLimitType.TOKEN_RATE_EXCEEDED ||
          result.reason.type === RateLimitType.REQUEST_RATE_LIMIT)
    );

    if (rateLimitRejection && rateLimitRejection.status === 'rejected') {
      throw rateLimitRejection.reason;
    }
  }

  /**
   * Generate themes sequentially to avoid rate limits
   */
  private async generateThemesSequentially(
    themes: AdventureTheme[],
    generateThemeFn: ThemeGeneratorFn
  ): Promise<void> {
    console.log(chalk.blue(`\n🎯 Starting sequential generation of ${themes.length} themes...`));
    console.log(chalk.dim('Themes will be generated one at a time to avoid rate limits'));

    const results: { theme: string; success: boolean; error?: any }[] = [];

    for (let i = 0; i < themes.length; i++) {
      const theme = themes[i];
      let retryCount = 0;
      const maxRetries = 3;
      let themeCompleted = false;

      while (!themeCompleted && retryCount < maxRetries) {
        const startTime = Date.now();
        const attemptNumber = retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : '';
        console.log(chalk.yellow(`\n📝 [${i + 1}/${themes.length}] Generating ${theme} theme${attemptNumber}...`));

        // Create theme-specific directory
        const themeDir = path.join(this.outputDir, theme);
        fs.mkdirSync(themeDir, { recursive: true });
        fs.mkdirSync(path.join(themeDir, 'assets'), { recursive: true });

        try {
          await generateThemeFn(theme, themeDir);

          // Mark theme as completed
          this.completedThemes.add(theme);
          themeCompleted = true;

          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(chalk.green(`✅ ${theme} theme completed in ${duration}s`));
          results.push({ theme, success: true });
        } catch (error) {
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);

          // Check for token rate limit error
          if (this.rateLimitHandler.isTokenRateLimitError(error)) {
            console.log(chalk.yellow(`⚠️ ${theme} theme hit token rate limit after ${duration}s`));

            const waitSeconds = (error instanceof RateLimitError) ? error.waitSeconds : 60;
            await this.rateLimitHandler.waitForRateLimit(waitSeconds);

            console.log(chalk.green(`✅ Rate limit window reset. Retrying ${theme} theme...`));
            retryCount++;
          } else {
            // Non-rate-limit error, don't retry
            console.log(chalk.red(`❌ ${theme} theme failed after ${duration}s:`, error instanceof Error ? error.message : error));
            results.push({ theme, success: false, error });
            break;
          }
        }
      }

      // If we exhausted retries, mark as failed
      if (!themeCompleted && retryCount >= maxRetries) {
        console.log(chalk.red(`❌ ${theme} theme failed after ${maxRetries} retries due to rate limits`));
        results.push({ theme, success: false, error: 'Exceeded maximum retries due to rate limits' });
      }
    }

    // Show summary
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    console.log(chalk.blue('\n📊 Generation Summary:'));
    console.log(chalk.green(`  ✅ Successful: ${successful}/${themes.length}`));
    if (failed > 0) {
      console.log(chalk.red(`  ❌ Failed: ${failed}/${themes.length}`));
    }

    results.forEach(result => {
      if (result.success) {
        console.log(chalk.dim(`    ✓ ${result.theme}`));
      } else {
        console.log(chalk.dim(`    ✗ ${result.theme} - generation failed`));
      }
    });
  }

  /**
   * Generate the homepage index with theme selection
   */
  private generateHomepageIndex(): void {
    // Get repo URL from adventure.config.json
    const config = parseAdventureConfig(this.projectPath);
    let repoUrl = 'https://github.com/danwahlin/ai-repo-adventures';
    let repoName = 'AI Repo Adventures';

    if (config && typeof config === 'object' && 'adventure' in config) {
      const adventure = (config as any).adventure;
      if (adventure && typeof adventure.url === 'string') {
        repoUrl = adventure.url.replace(/\/$/, '');
      }
      if (adventure && typeof adventure.name === 'string') {
        repoName = adventure.name;
      }
    }

    // Define theme data
    const themes = [
      {
        dir: 'space',
        image: 'space.png',
        title: 'Space Explorer',
        altText: 'Space Explorer Preview',
        description: 'Embark on cosmic adventures through code galaxies and starship protocols.'
      },
      {
        dir: 'mythical',
        image: 'mythical.png',
        title: 'Enchanted Kingdom',
        altText: 'Enchanted Kingdom Preview',
        description: 'Journey through ancient codebases in a realm of parchment and magic.'
      },
      {
        dir: 'ancient',
        image: 'ancient.png',
        title: 'Ancient Explorer',
        altText: 'Ancient Explorer Preview',
        description: 'Discover sacred coding wisdom in mystical temples and ancient halls.'
      },
      {
        dir: 'developer',
        image: 'developer.png',
        title: 'Developer',
        altText: 'Developer Preview',
        description: 'Navigate modern development workflows with professional precision.'
      }
    ];

    // Generate theme cards using template
    const themeCards = themes.map(theme => {
      const themeCardVariables = {
        THEME_DIR: theme.dir,
        THEME_IMAGE: theme.image,
        THEME_TITLE: theme.title,
        THEME_ALT_TEXT: theme.altText,
        THEME_DESCRIPTION: theme.description
      };
      return this.templateEngine.renderTemplate('theme-card.html', themeCardVariables);
    }).join('\n');

    // Generate homepage using template
    const variables = {
      REPO_NAME: repoName,
      REPO_URL: repoUrl,
      THEME_CARDS: themeCards
    };

    const html = this.templateEngine.renderTemplate('homepage-template.html', variables);
    const indexPath = path.join(this.outputDir, 'index.html');
    fs.writeFileSync(indexPath, html);
  }
}
