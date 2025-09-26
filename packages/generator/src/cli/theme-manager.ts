import * as fs from 'fs';
import * as path from 'path';
import { AdventureTheme } from '@codewithdan/ai-repo-adventures-core';

/**
 * Handles theme selection and CSS generation
 */
export class ThemeManager {
  private readonly themesDir: string;

  constructor(themesDir: string) {
    this.themesDir = themesDir;
  }

  /**
   * Parse theme argument from command line
   */
  parseThemeArg(themeArg: string): AdventureTheme | 'all' | null {
    if (themeArg === 'all') return 'all';
    
    const validThemes: AdventureTheme[] = ['space', 'mythical', 'ancient', 'developer'];
    
    // Check if it's a direct theme name
    if (validThemes.includes(themeArg as AdventureTheme)) {
      return themeArg as AdventureTheme;
    }
    
    // Check if it's a number (1-4)
    const themeNum = parseInt(themeArg);
    if (themeNum >= 1 && themeNum <= 4) {
      return validThemes[themeNum - 1];
    }
    
    return null;
  }

  /**
   * Check if theme uses light background (needs dark logo)
   */
  isLightTheme(theme: AdventureTheme): boolean {
    // Light themes that need dark GitHub logo (github-mark.svg)
    const lightThemes: AdventureTheme[] = ['mythical'];
    return lightThemes.includes(theme);
  }

  /**
   * Get appropriate GitHub logo path based on theme
   */
  getGitHubLogo(theme: AdventureTheme): string {
    return this.isLightTheme(theme) 
      ? 'assets/shared/github-mark.svg'          // Dark logo for light themes
      : 'assets/shared/github-mark-white.svg';   // White logo for dark themes
  }

  /**
   * Generate combined CSS for a theme
   */
  generateThemeCSS(theme: AdventureTheme, outputDir: string): void {
    const cssFiles = [
      path.join(this.themesDir, 'base.css'),
      path.join(this.themesDir, 'homepage.css'), 
      path.join(this.themesDir, 'animations.css'),
      path.join(this.themesDir, `${theme}.css`)
    ];
    
    let combinedCSS = '';
    
    cssFiles.forEach(cssFile => {
      if (fs.existsSync(cssFile)) {
        combinedCSS += fs.readFileSync(cssFile, 'utf8') + '\\n\\n';
      }
    });
    
    const cssPath = path.join(outputDir, 'assets', 'theme.css');
    fs.writeFileSync(cssPath, combinedCSS);
  }

  /**
   * Get theme-specific icons for templates
   */
  getThemeIcons(theme: AdventureTheme): { theme: string; quest: string } {
    const themeIcons = {
      space: { theme: '🚀', quest: '⭐' },
      mythical: { theme: '🏰', quest: '⚔️' },
      ancient: { theme: '🏺', quest: '📜' },
      developer: { theme: '💻', quest: '🔧' },
      custom: { theme: '🎨', quest: '⭐' }
    };

    return (themeIcons as any)[theme] || themeIcons.space;
  }
}