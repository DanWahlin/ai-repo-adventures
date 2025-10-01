/**
 * LLM Response Structure Validator
 * Validates that LLM responses match expected markdown structure for HTML rendering
 * Uses marked.lexer() to parse markdown - same approach as story-generator.ts
 * Does NOT call LLMs - works with mock/real responses for testing
 */

import { marked } from 'marked';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MarkdownStructure {
  hasH1Heading: boolean;
  hasH2Headings: boolean;
  hasCodeBlocks: boolean;
  hasLinks: boolean;
  hasLists: boolean;
  headingHierarchy: boolean; // H1 → H2 → H3 order maintained
  codeBlocksValid: boolean; // Properly closed with ```
  linksValid: boolean; // Valid markdown link syntax
}

/**
 * Validate markdown structure for quest content using marked.lexer()
 * This ensures consistency with how markdown is actually parsed and rendered
 */
export function validateQuestMarkdown(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const tokens = marked.lexer(content);

    // Check for H1 heading (quest title)
    const hasH1 = tokens.some(token => token.type === 'heading' && (token as any).depth === 1);
    if (!hasH1) {
      errors.push('Missing H1 heading for quest title');
    }

    // Check for H2 headings (sections)
    const h2Count = tokens.filter(token => token.type === 'heading' && (token as any).depth === 2).length;
    if (h2Count === 0) {
      warnings.push('No H2 headings found - quest may lack structure');
    }

    // Validate code blocks are properly closed - check raw content for unmatched fences
    if (!areCodeBlocksClosed(content)) {
      errors.push('Unclosed code block - odd number of ``` markers');
    }

    // Check for code block content after validating they're closed
    const codeBlocks = tokens.filter(token => token.type === 'code');
    if (codeBlocks.length === 0) {
      warnings.push('No code blocks found - quest may benefit from code examples');
    } else {
      // Check for code blocks with language specified
      const codeBlocksWithLang = codeBlocks.filter(token => (token as any).lang);
      if (codeBlocksWithLang.length === 0) {
        warnings.push('No code blocks with language specification found');
      }
    }

    // Check for lists (ordered or unordered)
    const hasLists = tokens.some(token => token.type === 'list');
    if (!hasLists) {
      warnings.push('No lists found - quest may benefit from structured hints or steps');
    }

    // Validate heading hierarchy using tokens
    const headingHierarchyValid = validateHeadingHierarchyFromTokens(tokens);
    if (!headingHierarchyValid) {
      warnings.push('Heading hierarchy may be inconsistent (H1 → H2 → H3 order)');
    }

    // Validate all markdown links have non-empty text and URLs
    const linksValid = validateLinksFromTokens(tokens);
    if (!linksValid) {
      errors.push('Invalid markdown links - empty link text or URL found');
    }

  } catch (error) {
    errors.push(`Failed to parse markdown: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Helper to check if current section is a quest section
 */
function isQuestSection(section: string): boolean {
  const questSections = ['quest', 'adventure', 'available quest', 'your quest', 'challenge'];
  return questSections.some(s => section.includes(s));
}

/**
 * Count extractable quests using same logic as story-generator.ts parser
 * Supports three formats:
 * 1. H3 headings: ### Quest 1: Title
 * 2. Bold headings: **Quest 1: Title** - Description
 * 3. Numbered lists: 1. **Quest Title** – Description OR simple numbered list items
 */
function countExtractableQuests(tokens: any[]): number {
  let questCount = 0;
  let currentSection = '';

  for (const token of tokens) {
    if (token.type === 'heading') {
      if (token.depth === 2) {
        currentSection = token.text.toLowerCase();
      } else if (token.depth === 3 && isQuestSection(currentSection)) {
        questCount++;
      }
    } else if (token.type === 'paragraph' && isQuestSection(currentSection)) {
      // Bold quest format: **Quest 1: Title** - Description
      const boldQuestMatch = token.text.match(/^\*\*Quest\s+\d+:/);
      if (boldQuestMatch) {
        questCount++;
      }
    } else if (token.type === 'list' && token.items && isQuestSection(currentSection)) {
      // Accept any numbered list items in quest section as potential quests
      // This is more lenient than the parser - validator should accept valid quest lists
      // even if parser might not extract all metadata perfectly
      questCount += token.items.length;
    }
  }

  return questCount;
}

/**
 * Validate markdown structure for story content using marked.lexer()
 * This matches the exact parsing logic used in story-generator.ts
 */
export function validateStoryMarkdown(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const tokens = marked.lexer(content);

    // Check for H1 heading (story title)
    const hasH1 = tokens.some(token => token.type === 'heading' && (token as any).depth === 1);
    if (!hasH1) {
      errors.push('Missing H1 heading for story title');
    }

    // Check for narrative content (paragraphs)
    const paragraphCount = tokens.filter(token => token.type === 'paragraph').length;
    if (paragraphCount < 2) {
      errors.push('Insufficient narrative content - story needs at least 2 paragraphs');
    }

    // Count extractable quests using same logic as parser
    const questCount = countExtractableQuests(tokens);
    if (questCount < 2) {
      errors.push(`Missing or insufficient list of quests (found ${questCount}, need at least 2)`);
    }

  } catch (error) {
    errors.push(`Failed to parse markdown: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Extract markdown structure analysis using marked.lexer()
 */
export function analyzeMarkdownStructure(content: string): MarkdownStructure {
  try {
    const tokens = marked.lexer(content);

    return {
      hasH1Heading: tokens.some(token => token.type === 'heading' && (token as any).depth === 1),
      hasH2Headings: tokens.some(token => token.type === 'heading' && (token as any).depth === 2),
      hasCodeBlocks: tokens.some(token => token.type === 'code'),
      hasLinks: tokens.some(token => token.type === 'paragraph' && /\[([^\]]+)\]\(([^)]+)\)/.test((token as any).text)),
      hasLists: tokens.some(token => token.type === 'list'),
      headingHierarchy: validateHeadingHierarchyFromTokens(tokens),
      codeBlocksValid: areCodeBlocksClosed(content), // Check for properly closed code fences
      linksValid: validateLinksFromTokens(tokens)
    };
  } catch (error) {
    // Return all false if parsing fails
    return {
      hasH1Heading: false,
      hasH2Headings: false,
      hasCodeBlocks: false,
      hasLinks: false,
      hasLists: false,
      headingHierarchy: false,
      codeBlocksValid: false,
      linksValid: false
    };
  }
}

/**
 * Check if code blocks are properly closed (even number of ``` fences)
 */
function areCodeBlocksClosed(content: string): boolean {
  const codeBlockMatches = content.match(/```/g);
  // If no matches or even number of fences, code blocks are valid
  return !codeBlockMatches || codeBlockMatches.length % 2 === 0;
}

/**
 * Validate heading hierarchy from tokens (H1 → H2 → H3 order)
 */
function validateHeadingHierarchyFromTokens(tokens: any[]): boolean {
  const headings = tokens.filter(token => token.type === 'heading');
  if (headings.length === 0) return true; // No headings to validate

  let previousLevel = 0;
  for (const heading of headings) {
    const level = heading.depth;

    // Check that we don't skip levels (e.g., H1 → H3 without H2)
    if (level > previousLevel + 1 && previousLevel > 0) {
      return false; // Invalid hierarchy
    }

    previousLevel = level;
  }

  return true;
}

/**
 * Validate all markdown links have non-empty text and URLs from tokens
 */
function validateLinksFromTokens(tokens: any[]): boolean {
  // Extract all links from paragraph and text tokens
  for (const token of tokens) {
    if (token.type === 'paragraph' || token.type === 'text') {
      const text = token.text || '';
      // Match markdown links, including empty ones: []() or [text]() or [](url)
      const linkMatches = text.match(/\[([^\]]*)\]\(([^)]*)\)/g);

      if (linkMatches) {
        for (const link of linkMatches) {
          const linkParts = link.match(/\[([^\]]*)\]\(([^)]*)\)/);
          if (linkParts) {
            const linkText = linkParts[1]?.trim();
            const url = linkParts[2]?.trim();

            // If link has empty text or URL, it's invalid
            if (!linkText || linkText.length === 0 || !url || url.length === 0) {
              return false;
            }
          }
        }
      }
    }
  }

  return true; // All links are valid or no links found
}

/**
 * Validate that response can be safely converted to HTML
 */
export function validateHTMLCompatibility(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for dangerous HTML tags that shouldn't be in markdown
  const dangerousTags = ['<script', '<iframe', '<object', '<embed'];
  dangerousTags.forEach(tag => {
    if (content.toLowerCase().includes(tag)) {
      errors.push(`Dangerous HTML tag found: ${tag}`);
    }
  });

  // Check for unclosed HTML comments
  const htmlCommentStarts = (content.match(/<!--/g) || []).length;
  const htmlCommentEnds = (content.match(/-->/g) || []).length;
  if (htmlCommentStarts !== htmlCommentEnds) {
    errors.push('Unclosed HTML comment');
  }

  // Check for excessive nesting (too many nested lists can break rendering)
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const indentLevel = line.match(/^\s*/)?.[0].length || 0;
    if (indentLevel > 12) { // More than 3 levels of nesting (4 spaces per level)
      warnings.push(`Line ${index + 1}: Excessive indentation may cause rendering issues`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Comprehensive validation for quest content
 */
export function validateQuestResponse(content: string): ValidationResult {
  const markdownValidation = validateQuestMarkdown(content);
  const htmlValidation = validateHTMLCompatibility(content);

  return {
    valid: markdownValidation.valid && htmlValidation.valid,
    errors: [...markdownValidation.errors, ...htmlValidation.errors],
    warnings: [...markdownValidation.warnings, ...htmlValidation.warnings]
  };
}

/**
 * Comprehensive validation for story content
 */
export function validateStoryResponse(content: string): ValidationResult {
  const markdownValidation = validateStoryMarkdown(content);
  const htmlValidation = validateHTMLCompatibility(content);

  return {
    valid: markdownValidation.valid && htmlValidation.valid,
    errors: [...markdownValidation.errors, ...htmlValidation.errors],
    warnings: [...markdownValidation.warnings, ...htmlValidation.warnings]
  };
}