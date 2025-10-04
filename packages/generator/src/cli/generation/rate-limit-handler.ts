import chalk from 'chalk';
import { RateLimitError, RateLimitType } from '@codewithdan/ai-repo-adventures-core/llm';
import { AdventureTheme } from '@codewithdan/ai-repo-adventures-core/shared';
import { RETRY_CONFIG } from '../constants.js';

/**
 * Handles rate limit detection, recovery, and retry logic for theme generation
 */
export class RateLimitHandler {
  private completedThemes: Set<string>;

  constructor(completedThemes: Set<string>) {
    this.completedThemes = completedThemes;
  }

  /**
   * Check if an error is a rate limit error that should trigger sequential retry
   * Recognizes RateLimitError instances from the LLM client
   */
  isTokenRateLimitError(error: any): boolean {
    if (!error) return false;

    // Check for RateLimitError instances from LLM client
    if (error instanceof RateLimitError) {
      // Handle both TOKEN_RATE_EXCEEDED and REQUEST_RATE_LIMIT
      return error.type === RateLimitType.TOKEN_RATE_EXCEEDED ||
             error.type === RateLimitType.REQUEST_RATE_LIMIT;
    }

    // Not a recognized rate limit error
    return false;
  }

  /**
   * Handle rate limit errors by waiting and switching to sequential mode
   */
  async handleTokenRateLimitAndRetry(
    themes: AdventureTheme[],
    error: RateLimitError,
    generateThemesSequentiallyFn: (themes: AdventureTheme[]) => Promise<void>
  ): Promise<void> {
    // User messaging: Explain what happened
    console.log();

    // Check if this is actually a quest failure (fail-fast strategy)
    if (error.message.includes('Quest generation failed')) {
      console.log(chalk.yellow('⚠️  Quest generation failed during parallel processing'));
      console.log(chalk.yellow('📋 To ensure consistency across all themes, switching to sequential mode...'));
    } else if (error.type === RateLimitType.TOKEN_RATE_EXCEEDED) {
      console.log(chalk.yellow('⚠️  Token rate limit exceeded (200K tokens/60s window for Azure S0 tier)'));
    } else {
      console.log(chalk.yellow('⚠️  Request rate limit exceeded (Azure S0 tier limitations)'));
    }
    console.log(chalk.dim(`    Error details: ${error.originalMessage}`));

    // Identify remaining themes (those not completed)
    const remainingThemes = themes.filter(theme => !this.completedThemes.has(theme));

    if (remainingThemes.length === 0) {
      console.log(chalk.green('✅ All themes were completed before the rate limit was hit'));
      return;
    }

    // Show progress so far
    console.log();
    console.log(chalk.blue('📊 Progress Status:'));
    console.log(chalk.green(`  ✅ Completed: ${this.completedThemes.size} themes`));
    this.completedThemes.forEach(theme => {
      console.log(chalk.dim(`    ✓ ${theme}`));
    });
    console.log(chalk.yellow(`  ⏳ Remaining: ${remainingThemes.length} themes`));
    remainingThemes.forEach(theme => {
      console.log(chalk.dim(`    • ${theme}`));
    });

    // Wait for the rate limit window to reset
    const waitSeconds = (error instanceof RateLimitError) ? error.waitSeconds : RETRY_CONFIG.RATE_LIMIT_WAIT_SECONDS;
    console.log();
    console.log(chalk.cyan(`⏳ Waiting ${waitSeconds} seconds for rate limit window to reset...`));

    // Show countdown
    for (let i = waitSeconds; i > 0; i--) {
      process.stdout.write(`\r${chalk.cyan(`⏳ Time remaining: ${i} seconds  `)}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear the line

    // Switch to sequential processing mode
    console.log(chalk.blue('🔄 Switching to sequential processing mode to avoid further rate limits'));
    console.log(chalk.dim('   Processing will continue more slowly but reliably'));

    // Process remaining themes sequentially
    console.log();
    console.log(chalk.green(`✅ Continuing with remaining ${remainingThemes.length} themes...`));
    await generateThemesSequentiallyFn(remainingThemes);

    // Show helpful tip for future runs
    console.log();
    console.log(chalk.cyan('💡 Tip: Use --sequential flag next time for large theme sets with Azure S0'));
    console.log(chalk.dim('   Example: repo-adventures --theme all --sequential --output ./public'));
  }

  /**
   * Wait for rate limit window to reset with countdown display
   */
  async waitForRateLimit(waitSeconds: number): Promise<void> {
    console.log(chalk.cyan(`⏳ Waiting ${waitSeconds} seconds for rate limit window to reset...`));

    // Show countdown
    for (let j = waitSeconds; j > 0; j--) {
      process.stdout.write(`\r${chalk.cyan(`⏳ Time remaining: ${j} seconds  `)}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear the line
  }
}
