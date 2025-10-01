/**
 * HTML Validation Utilities
 * Validates that generated HTML is well-formed and safe
 */

export interface HTMLValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  structure: {
    hasTitleTag: boolean;
    hasMetaTags: boolean;
    hasStylesheet: boolean;
    hasValidStructure: boolean;
    hasQuestContent: boolean;
    hasNavigation: boolean;
  };
}

/**
 * Validate generated HTML file structure
 */
export function validateHTML(htmlContent: string): HTMLValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for basic HTML structure
  if (!htmlContent.includes('<!DOCTYPE html>')) {
    errors.push('Missing DOCTYPE declaration');
  }

  if (!htmlContent.includes('<html')) {
    errors.push('Missing <html> tag');
  }

  if (!htmlContent.includes('<head>')) {
    errors.push('Missing <head> section');
  }

  if (!htmlContent.includes('<body>')) {
    errors.push('Missing <body> section');
  }

  // Check for required meta tags
  const hasTitleTag = /<title>.*<\/title>/.test(htmlContent);
  const hasCharset = /charset=["']?utf-8["']?/i.test(htmlContent);
  const hasViewport = /name=["']?viewport["']?/i.test(htmlContent);

  if (!hasTitleTag) {
    errors.push('Missing <title> tag');
  }

  if (!hasCharset) {
    warnings.push('Missing charset meta tag');
  }

  if (!hasViewport) {
    warnings.push('Missing viewport meta tag for responsive design');
  }

  // Check for stylesheet link
  const hasStylesheet = /<link[^>]*rel=["']?stylesheet["']?/.test(htmlContent);
  if (!hasStylesheet) {
    warnings.push('No stylesheet linked');
  }

  // Check for balanced tags
  const tagBalance = validateTagBalance(htmlContent);
  if (!tagBalance.valid) {
    errors.push(...tagBalance.errors);
  }

  // Check for quest content markers
  const hasQuestContent = htmlContent.includes('quest') || htmlContent.includes('Quest');
  if (!hasQuestContent) {
    warnings.push('No quest content detected in HTML');
  }

  // Check for navigation elements
  const hasNavigation = /<nav/.test(htmlContent) || /class=["']?nav/.test(htmlContent);
  if (!hasNavigation) {
    warnings.push('No navigation elements found');
  }

  // Check for dangerous inline scripts
  if (/<script[^>]*>(?!.*src=)/.test(htmlContent)) {
    warnings.push('Inline script tags detected - consider external scripts');
  }

  // Check for proper closing tags
  const hasValidStructure =
    htmlContent.includes('</html>') &&
    htmlContent.includes('</head>') &&
    htmlContent.includes('</body>');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    structure: {
      hasTitleTag,
      hasMetaTags: hasCharset && hasViewport,
      hasStylesheet,
      hasValidStructure,
      hasQuestContent,
      hasNavigation
    }
  };
}

/**
 * Validate that HTML tags are properly balanced
 */
function validateTagBalance(htmlContent: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const stack: string[] = [];

  // Self-closing tags that don't need closing tags
  const selfClosingTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);

  // Extract all tags
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
  let match;

  while ((match = tagRegex.exec(htmlContent)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();

    // Skip self-closing tags
    if (selfClosingTags.has(tagName)) {
      continue;
    }

    // Skip self-closing syntax (e.g., <tag />)
    if (fullTag.endsWith('/>')) {
      continue;
    }

    if (fullTag.startsWith('</')) {
      // Closing tag
      const lastOpened = stack.pop();
      if (lastOpened !== tagName) {
        errors.push(`Mismatched closing tag: expected </${lastOpened}>, found </${tagName}>`);
      }
    } else {
      // Opening tag
      stack.push(tagName);
    }
  }

  // Check for unclosed tags
  if (stack.length > 0) {
    errors.push(`Unclosed tags: ${stack.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate quest HTML file specifically
 */
export function validateQuestHTML(htmlContent: string): HTMLValidationResult {
  const baseValidation = validateHTML(htmlContent);

  // Additional quest-specific checks
  const questWarnings = [...baseValidation.warnings];

  // Check for quest navigation (back to story, next quest, etc.)
  if (!/<a[^>]*href=["'][^"']*index\.html/.test(htmlContent)) {
    questWarnings.push('No link back to main story page');
  }

  // Check for quest content sections
  const hasQuestTitle = /<h1/.test(htmlContent);
  if (!hasQuestTitle) {
    questWarnings.push('No H1 heading found for quest title');
  }

  // Check for code snippets
  const hasCodeBlocks = /<pre/.test(htmlContent) || /<code/.test(htmlContent);
  if (!hasCodeBlocks) {
    questWarnings.push('No code blocks found in quest HTML');
  }

  return {
    ...baseValidation,
    warnings: questWarnings
  };
}

/**
 * Validate index/story HTML file specifically
 */
export function validateStoryHTML(htmlContent: string): HTMLValidationResult {
  const baseValidation = validateHTML(htmlContent);

  // Additional story-specific checks
  const storyWarnings = [...baseValidation.warnings];

  // Check for quest links
  const questLinkPattern = /<a[^>]*href=["'][^"']*quest-\d+\.html/g;
  const questLinks = htmlContent.match(questLinkPattern);

  if (!questLinks || questLinks.length < 2) {
    storyWarnings.push('Story should have links to at least 2 quests');
  }

  // Check for theme selection (if main index)
  const hasThemeSelection = /theme/.test(htmlContent);
  if (htmlContent.includes('index.html') && !hasThemeSelection) {
    storyWarnings.push('Main index should have theme selection');
  }

  return {
    ...baseValidation,
    warnings: storyWarnings
  };
}

/**
 * Quick validation for testing - returns boolean
 */
export function isValidHTML(htmlContent: string): boolean {
  return validateHTML(htmlContent).valid;
}

/**
 * Extract all validation errors as a single string
 */
export function getValidationSummary(result: HTMLValidationResult): string {
  const parts: string[] = [];

  if (result.errors.length > 0) {
    parts.push(`Errors (${result.errors.length}):`);
    parts.push(...result.errors.map(e => `  - ${e}`));
  }

  if (result.warnings.length > 0) {
    parts.push(`Warnings (${result.warnings.length}):`);
    parts.push(...result.warnings.map(w => `  - ${w}`));
  }

  if (parts.length === 0) {
    return 'HTML validation passed with no errors or warnings';
  }

  return parts.join('\n');
}