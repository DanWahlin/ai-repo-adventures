import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Handles all asset copying and management operations
 */
export class AssetManager {
  private readonly sourceDir: string;

  constructor(sourceDir: string) {
    this.sourceDir = sourceDir;
  }

  /**
   * Copy images for single or multi-theme generation
   */
  copyImages(outputDir: string, isMultiTheme: boolean = false): void {
    const sourceImagesDir = path.join(this.sourceDir, 'assets', 'images');
    const sourceSharedDir = path.join(this.sourceDir, 'assets', 'shared');
    const targetImagesDir = path.join(outputDir, 'assets', 'images');
    const targetSharedDir = path.join(outputDir, 'assets', 'shared');

    try {
      // Copy theme-specific images
      if (fs.existsSync(sourceImagesDir)) {
        fs.mkdirSync(targetImagesDir, { recursive: true });
        const imageFiles = fs.readdirSync(sourceImagesDir);
        imageFiles.forEach(file => {
          const sourcePath = path.join(sourceImagesDir, file);
          const targetPath = path.join(targetImagesDir, file);
          fs.copyFileSync(sourcePath, targetPath);
        });
      }

      // Copy shared images 
      if (fs.existsSync(sourceSharedDir)) {
        fs.mkdirSync(targetSharedDir, { recursive: true });
        const sharedFiles = fs.readdirSync(sourceSharedDir);
        sharedFiles.forEach(file => {
          const sourcePath = path.join(sourceSharedDir, file);
          const targetPath = path.join(targetSharedDir, file);
          fs.copyFileSync(sourcePath, targetPath);
        });
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️ Warning: Could not copy images from source directory'));
    }
  }

  /**
   * Copy shared navigator files to global location (for multi-theme)
   */
  copySharedNavigator(rootOutputDir: string): void {
    const templatesDir = path.join(this.sourceDir, 'templates');
    const assetsDir = path.join(this.sourceDir, 'assets');
    const cssSource = path.join(templatesDir, 'quest-navigator.css');
    const jsSource = path.join(templatesDir, 'quest-navigator.js');
    const svgSource = path.join(templatesDir, 'compass-icon.svg');
    
    // Theme toggle files
    const themeToggleCssSource = path.join(assetsDir, 'theme-toggle.css');
    const themeToggleJsSource = path.join(assetsDir, 'theme-toggle.js');

    // Create consolidated shared assets directory
    const sharedAssetsDir = path.join(rootOutputDir, 'assets', 'shared');
    fs.mkdirSync(sharedAssetsDir, { recursive: true });

    // Copy shared files
    if (fs.existsSync(cssSource)) {
      fs.copyFileSync(cssSource, path.join(sharedAssetsDir, 'quest-navigator.css'));
    }
    if (fs.existsSync(jsSource)) {
      fs.copyFileSync(jsSource, path.join(sharedAssetsDir, 'quest-navigator.js'));
    }
    if (fs.existsSync(svgSource)) {
      fs.copyFileSync(svgSource, path.join(sharedAssetsDir, 'compass-icon.svg'));
    }

    // Copy theme toggle files to root assets (they need to be accessible from theme directories)
    const rootAssetsDir = path.join(rootOutputDir, 'assets');
    fs.mkdirSync(rootAssetsDir, { recursive: true });
    
    if (fs.existsSync(themeToggleCssSource)) {
      fs.copyFileSync(themeToggleCssSource, path.join(rootAssetsDir, 'theme-toggle.css'));
    }
    if (fs.existsSync(themeToggleJsSource)) {
      fs.copyFileSync(themeToggleJsSource, path.join(rootAssetsDir, 'theme-toggle.js'));
    }

    console.log(chalk.green('✅ Shared navigator and theme toggle files copied to consolidated assets directory'));
  }

  /**
   * Copy quest navigator files to theme-specific location (for single theme)
   */
  copyQuestNavigator(outputDir: string): void {
    const templatesDir = path.join(this.sourceDir, 'templates');
    const sourceAssetsDir = path.join(this.sourceDir, 'assets');
    const cssSource = path.join(templatesDir, 'quest-navigator.css');
    const jsSource = path.join(templatesDir, 'quest-navigator.js');
    const svgSource = path.join(templatesDir, 'compass-icon.svg');
    
    // Theme toggle files
    const themeToggleCssSource = path.join(sourceAssetsDir, 'theme-toggle.css');
    const themeToggleJsSource = path.join(sourceAssetsDir, 'theme-toggle.js');

    const assetsDir = path.join(outputDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });

    // Copy navigator files
    if (fs.existsSync(cssSource)) {
      fs.copyFileSync(cssSource, path.join(assetsDir, 'quest-navigator.css'));
    }
    if (fs.existsSync(jsSource)) {
      fs.copyFileSync(jsSource, path.join(assetsDir, 'quest-navigator.js'));
    }
    if (fs.existsSync(svgSource)) {
      fs.copyFileSync(svgSource, path.join(assetsDir, 'compass-icon.svg'));
    }

    // Copy theme toggle files
    if (fs.existsSync(themeToggleCssSource)) {
      fs.copyFileSync(themeToggleCssSource, path.join(assetsDir, 'theme-toggle.css'));
    }
    if (fs.existsSync(themeToggleJsSource)) {
      fs.copyFileSync(themeToggleJsSource, path.join(assetsDir, 'theme-toggle.js'));
    }
  }

  /**
   * Copy global shared assets for multi-theme generation
   */
  copyGlobalAssets(outputDir: string): void {
    try {
      const globalAssetsDir = path.join(outputDir, 'assets');
      const targetImagesDir = path.join(globalAssetsDir, 'images');
      fs.mkdirSync(targetImagesDir, { recursive: true });

      // Copy global shared images to shared directory
      const globalSharedDir = path.join(outputDir, 'assets', 'shared');
      fs.mkdirSync(globalSharedDir, { recursive: true });

      const globalImages = ['github-mark.svg', 'github-mark-white.svg'];
      globalImages.forEach(file => {
        const sourcePath = path.join(this.sourceDir, 'assets', 'shared', file);
        if (fs.existsSync(sourcePath)) {
          const targetPath = path.join(globalSharedDir, file);
          fs.copyFileSync(sourcePath, targetPath);
        }
      });

      // Copy header image for theme selection page
      const headerImageSource = path.join(this.sourceDir, 'assets', 'images', 'ai-adventures.png');
      if (fs.existsSync(headerImageSource)) {
        const headerImageTarget = path.join(targetImagesDir, 'ai-adventures.png');
        fs.copyFileSync(headerImageSource, headerImageTarget);
      }

      // Copy the homepage theme CSS from the themes directory
      const homepageCSSSource = path.join(this.sourceDir, 'themes', 'homepage.css');
      console.log(chalk.dim(`📁 Looking for homepage CSS at: ${homepageCSSSource}`));

      if (!fs.existsSync(homepageCSSSource)) {
        throw new Error(`Homepage CSS not found at: ${homepageCSSSource}`);
      }

      const homepageCSSContent = fs.readFileSync(homepageCSSSource, 'utf-8');
      const cssPath = path.join(outputDir, 'assets', 'theme.css');

      // Ensure assets directory exists
      fs.mkdirSync(path.dirname(cssPath), { recursive: true });

      fs.writeFileSync(cssPath, homepageCSSContent);
      console.log(chalk.green(`✅ Homepage CSS copied to: ${cssPath}`));

    } catch (error) {
      console.log(chalk.yellow('⚠️ Warning: Could not copy global assets'));
      throw error;
    }
  }

  /**
   * Load theme-specific CSS file
   */
  loadThemeCSS(theme: string): string {
    return this.loadCSSFile(`themes/${theme}.css`, 'themes/default.css');
  }

  /**
   * Load base CSS file
   */
  loadBaseCSS(): string {
    return this.loadCSSFile('themes/base.css', null) || '/* Base CSS not found */';
  }

  /**
   * Load animations CSS file
   */
  loadAnimationsCSS(): string {
    return this.loadCSSFile('themes/animations.css', null) || '/* Animations CSS not found */';
  }

  /**
   * Load a CSS file with optional fallback
   */
  private loadCSSFile(relativePath: string, fallbackPath: string | null): string {
    try {
      return fs.readFileSync(path.join(this.sourceDir, relativePath), 'utf-8');
    } catch {
      if (fallbackPath) {
        try {
          return fs.readFileSync(path.join(this.sourceDir, fallbackPath), 'utf-8');
        } catch {
          return '/* Fallback CSS not available */';
        }
      }
      return '';
    }
  }
}