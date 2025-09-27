# Quest 1: Quest Generation Engine
---
In the vast expanse of the digital cosmos, the crew of the starship ventures deeper into the Galactic Code Repository. With their starship's systems humming harmoniously, they prepare to unlock the secrets of the Quest Generation Engine. This engine, a vital component of their mission, holds the potential to create new adventures and expand their cosmic narratives. As they navigate through lines of code, they must analyze the intricate functions that power this engine, ensuring they harness its capabilities for their interstellar quests.

## Quest Objectives
As you explore the code below, investigate these key questions:
- 🔍 **Template Transformation**: How does the `renderPage` function manage the combination of base and content templates to create a complete HTML page?
- ⚡ **Variable Insertion**: What mechanisms does the `replacePlaceholders` function use to dynamically inject variables into the loaded templates?
- 🛡️ **Asset Allocation**: In what ways does the `copyGlobalAssets` function ensure that shared assets are correctly managed for multi-theme generation?

## File Exploration
### packages/generator/src/cli/template-engine.ts: Simple template engine for HTML generation
This file contains the `TemplateEngine` class, which is responsible for loading HTML templates and replacing placeholders with dynamic variables. The class utilizes caching to optimize performance and streamline the template rendering process. The key functions within this file are essential for understanding how HTML pages are generated from templates, allowing for the creation of rich, interactive adventures.

#### Highlights
- `renderPage`: Combines a base template with a content template, replacing placeholders with provided variables to generate a complete HTML page.
- `replacePlaceholders`: Iterates through a set of variables and replaces corresponding placeholders in a template string, ensuring dynamic content is accurately displayed.
- `loadTemplate`: Loads a template file from the filesystem, employing caching to enhance performance and minimize redundant file reads.

## Code
### packages/generator/src/cli/template-engine.ts
```typescript
  /**
   * Render a complete page using base template + content template
   */
  renderPage(contentTemplate: string, variables: TemplateVariables): string {
    const baseTemplate = this.loadTemplate('base-template.html');
    const contentHtml = this.loadTemplate(contentTemplate);
    
    // First render the content template
    const renderedContent = this.replacePlaceholders(contentHtml, variables);
    
    // Then render the base template with the content
    const pageVariables = {
      ...variables,
      CONTENT: renderedContent
    };
    
    return this.replacePlaceholders(baseTemplate, pageVariables);
  }
```
- This code defines the `renderPage` method, which combines the base template and content template into a single HTML page.
- It first loads both templates, ensuring the base template serves as a structural foundation.
- The method dynamically replaces placeholders in both templates using the provided variables, allowing for personalized content generation.
- This approach streamlines the rendering process, ensuring that all necessary data is injected before returning the final HTML.
- Readers should note the importance of caching in loading templates efficiently.

---

```typescript
  /**
   * Replace placeholders in template with variables
   */
  private replacePlaceholders(template: string, variables: TemplateVariables): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value || '');
    }
    
    return result;
  }
```
- The `replacePlaceholders` function scans the provided template for placeholders and replaces them with corresponding values from the `variables` object.
- This function employs regular expressions to ensure all instances of placeholders are replaced globally within the template.
- The approach allows for flexible and dynamic content generation, making it easier to create personalized user experiences.
- It is crucial for ensuring that templates are rendered with the correct data, enhancing the overall functionality of the template engine.
- Readers should pay attention to how the function handles missing values by substituting them with empty strings.

---

```typescript
  /**
   * Load a template file with caching
   */
  private loadTemplate(templateName: string): string {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    const templatePath = path.join(this.templatesDir, templateName);
    
    try {
      const content = fs.readFileSync(templatePath, 'utf-8');
      this.templateCache.set(templateName, content);
      return content;
    } catch (error) {
      throw new Error(`Failed to load template ${templateName}: ${error}`);
    }
  }
```
- This `loadTemplate` function retrieves template files from the filesystem while utilizing a caching mechanism to optimize performance.
- By checking the cache before reading from the disk, it minimizes the need for redundant file I/O operations.
- This method is essential for maintaining efficient template loading, especially in scenarios where multiple templates may be rendered repeatedly.
- Error handling ensures that any issues with file access are properly reported, maintaining robustness in the system.
- Readers should note the importance of caching in enhancing the performance of template loading.

---

### packages/generator/src/cli/asset-manager.ts: Handles all asset copying and management operations
The `AssetManager` class is responsible for managing the copying of images and shared assets necessary for the adventure generation process. It ensures that assets are correctly organized and accessible across themes, facilitating a seamless user experience. Understanding how this class operates is vital for maintaining the integrity of the generated adventures.

#### Highlights
- `copyGlobalAssets`: Manages the copying of shared images and assets to ensure they are available across multiple themes.
- `copyQuestNavigator`: Specifically handles the copying of navigational assets required for quest navigation in the generated HTML pages.
- `copyImages`: Responsible for copying theme-specific images to the appropriate output directories, ensuring all necessary visuals are included.

## Code
### packages/generator/src/cli/asset-manager.ts
```typescript
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
    } catch (error) {
      console.log(chalk.yellow('⚠️ Warning: Could not copy global images'));
    }
  }
```
- The `copyGlobalAssets` function manages the copying of essential assets to ensure they are accessible across themes.
- It creates necessary directories for both global images and shared assets, ensuring a well-organized structure.
- The function iterates through a predefined list of global images, copying them from the source to the target directory.
- Error handling is incorporated to provide warnings if asset copying fails, maintaining user awareness of potential issues.
- Readers should focus on the importance of maintaining a coherent asset structure for multi-theme adventures.

---

```typescript
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
```
- The `copyQuestNavigator` function is responsible for copying essential navigator files to the appropriate asset directories.
- It ensures that all necessary CSS and JavaScript files for quest navigation are present, enhancing the user interface.
- The function checks for the existence of each file before copying, preventing errors related to missing assets.
- By organizing navigator files within the asset structure, it promotes a cohesive experience across different themes.
- Readers should consider the significance of properly managing navigational assets for a seamless adventure experience.

---

```typescript
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
```
- The `copyImages` function handles the copying of both theme-specific and shared images to the appropriate output directories.
- It creates necessary directories and checks for the existence of source directories before proceeding with the copy operation.
- The function ensures that all relevant images are available for the generated adventure, contributing to a visually engaging experience.
- Error handling provides feedback in case of issues during the copying process, keeping users informed.
- Readers should note the role of image management in enhancing the overall quality of the adventure presentation.

---

## Helpful Hints
- Review the caching mechanism in `TemplateEngine` for performance optimization.
- Pay close attention to how assets are organized in `AssetManager` for multi-theme support.
- Explore the implications of dynamic content generation through placeholder replacement.

---
Excellent work! Continue to the next quest to uncover more mysteries.

Congratulations on successfully launching the Quest Generation Engine into orbit, marking the first step of your cosmic journey towards mastering the universe of quests! 🚀✨