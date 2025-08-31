#!/usr/bin/env node
/**
 * Global Assets Copy Script
 * Copies all theme assets, CSS, JS, and images to target directories
 * without running the HTML generator or calling LLM services
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source directories relative to project root
const ASSET_SOURCES = {
  themes: 'packages/generator/src/cli/themes',
  assets: 'packages/generator/src/cli/assets',
  // Add shared assets if they exist in the future
  shared: 'packages/generator/src/cli/assets/shared'
};

// Default target directory
const DEFAULT_TARGET = 'public';

/**
 * Recursively copy files from source to destination
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 * @param {string[]} excludeExtensions - File extensions to exclude
 */
async function copyDirectory(src, dest, excludeExtensions = ['.html']) {
  try {
    await fs.access(src);
  } catch {
    console.log(`⚠️  Source directory ${src} doesn't exist, skipping...`);
    return;
  }

  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath, excludeExtensions);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (!excludeExtensions.includes(ext)) {
        await fs.copyFile(srcPath, destPath);
        console.log(`📄 Copied: ${path.relative(process.cwd(), srcPath)} → ${path.relative(process.cwd(), destPath)}`);
      }
    }
  }
}

/**
 * Main copy function
 * @param {string} targetDir - Target directory to copy assets to
 */
async function copyAssets(targetDir = DEFAULT_TARGET) {
  console.log(`🚀 Starting global assets copy to: ${targetDir}`);
  console.log(`📁 Working directory: ${process.cwd()}`);

  const assetsDir = path.join(targetDir, 'assets');
  let filesCopied = 0;

  try {
    // Copy theme files (CSS)
    const themesSource = path.resolve(__dirname, ASSET_SOURCES.themes);
    const themesTarget = path.join(assetsDir);
    console.log(`\n🎨 Copying themes from ${themesSource}...`);
    await copyDirectory(themesSource, themesTarget);

    // Copy general assets (JS, shared files, images)
    const assetsSource = path.resolve(__dirname, ASSET_SOURCES.assets);
    const assetsTarget = assetsDir;
    console.log(`\n📦 Copying assets from ${assetsSource}...`);
    await copyDirectory(assetsSource, assetsTarget);

    console.log(`\n✅ Assets copy complete!`);
    console.log(`📍 Target directory: ${path.resolve(targetDir)}`);
    console.log(`\n💡 You can now test your changes without running the HTML generator.`);

  } catch (error) {
    console.error(`❌ Error copying assets:`, error.message);
    process.exit(1);
  }
}

// CLI interface
function showHelp() {
  console.log(`
Global Assets Copy Script

Usage:
  node copy-assets.js [target-directory]

Arguments:
  target-directory    Directory to copy assets to (default: "public")

Examples:
  node copy-assets.js                    # Copy to ./public/assets/
  node copy-assets.js tests/my-test      # Copy to ./tests/my-test/assets/
  node copy-assets.js ../other-project   # Copy to ../other-project/assets/

What gets copied:
  • All CSS theme files (*.css)
  • JavaScript assets (*.js)  
  • Images and shared assets (*.png, *.svg, etc.)
  • Excludes HTML template files

This allows you to test CSS/JS changes without running the full HTML generator.
`);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

const targetDirectory = args[0] || DEFAULT_TARGET;

// Run the copy process
copyAssets(targetDirectory).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});