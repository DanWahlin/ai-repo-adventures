/**
 * Simple template engine for HTML generation
 * Handles template loading and placeholder replacement
 */

import * as fs from 'fs';
import * as path from 'path';

interface TemplateVariables {
  [key: string]: string;
}

export class TemplateEngine {
  private templateCache: Map<string, string> = new Map();
  private templatesDir: string;

  constructor() {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    this.templatesDir = path.join(__dirname, 'templates');
  }

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

  /**
   * Render just a template fragment
   */
  renderTemplate(templateName: string, variables: TemplateVariables): string {
    const template = this.loadTemplate(templateName);
    return this.replacePlaceholders(template, variables);
  }
}