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
   * Copy quest navigator files
   */
  copyQuestNavigator(outputDir: string): void {
    const templatesDir = path.join(this.sourceDir, 'templates');
    const cssSource = path.join(templatesDir, 'quest-navigator.css');
    const jsSource = path.join(templatesDir, 'quest-navigator.js');
    const svgSource = path.join(templatesDir, 'compass-icon.svg');

    const assetsDir = path.join(outputDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });

    // Copy CSS file
    if (fs.existsSync(cssSource)) {
      fs.copyFileSync(cssSource, path.join(assetsDir, 'quest-navigator.css'));
    }

    // Copy JS file  
    if (fs.existsSync(jsSource)) {
      fs.copyFileSync(jsSource, path.join(assetsDir, 'quest-navigator.js'));
    }

    // Copy SVG icon
    if (fs.existsSync(svgSource)) {
      fs.copyFileSync(svgSource, path.join(assetsDir, 'compass-icon.svg'));
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
    } catch (error) {
      console.log(chalk.yellow('⚠️ Warning: Could not copy global images'));
    }
  }
}