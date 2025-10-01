#!/usr/bin/env node

/**
 * Unit tests for LLM Response Validator
 * Tests markdown structure validation WITHOUT calling LLMs
 */

import {
  validateQuestMarkdown,
  validateStoryMarkdown,
  analyzeMarkdownStructure,
  validateHTMLCompatibility,
  validateQuestResponse,
  validateStoryResponse
} from '../../packages/core/dist/shared/llm-response-validator.js';
import { createTestRunner, assert } from '../shared/test-utils.js';

// Mock responses simulating different LLM output formats
const MOCK_RESPONSES = {
  validQuest: `# Quest 1: Exploring the Server Module

Welcome, brave adventurer! Your journey begins in the heart of the server codebase.

## 🎯 Your Mission

Discover how the HTTP server initializes and handles incoming requests.

## 📂 Files to Explore

- \`src/server.ts\` - Main server entry point
- \`src/routes/api.ts\` - API route handlers

## 💡 Hints

1. Look for the \`createServer()\` function
2. Check how middleware is configured
3. Find the port configuration

\`\`\`typescript
// Example server initialization
const server = createServer({
  port: 3000,
  middleware: [cors(), json()]
});
\`\`\`

## 🏆 Success Criteria

You'll know you've succeeded when you can answer:
- What port does the server listen on?
- Which middleware runs first?
`,

  questMissingH1: `## Your Mission

This quest is missing an H1 title heading.

\`\`\`typescript
const example = "code";
\`\`\`
`,

  questUnclosedCodeBlock: `# Quest: Broken Code Block

This quest has an unclosed code block.

\`\`\`typescript
const broken = "code";
// Missing closing backticks
`,

  questEmptyLinks: `# Quest: Bad Links

Check out [](https://example.com) and [Link Text]() - both invalid!
`,

  questSkippedHeadings: `# Quest Title

### H3 Without H2

This skips from H1 to H3, which is poor hierarchy.
`,

  validStory: `# Galactic Code Odyssey

In the vast expanse of the digital cosmos, you command a starship known as the RepoExplorer. Your mission: to chart the unknown territories of the codebase and discover its hidden secrets.

As you navigate through stellar pathways of TypeScript and JavaScript, you'll encounter cosmic phenomena - mysterious functions, enigmatic classes, and constellation-like data structures waiting to be understood.

## Your Adventures Await

Choose your path wisely, brave explorer:

1. Quest 1: The Server Sanctum
2. Quest 2: The Database Depths
3. Quest 3: The API Asteroid Belt
4. Quest 4: The Frontend Frontier

Each quest will reveal new knowledge about this stellar codebase. Complete them all to become a master navigator of the code cosmos!
`,

  storyMissingQuests: `# A Story Without Quests

This is a story but it doesn't have a numbered list of quests to explore.

Just some narrative text here.
`,

  storyInsufficientNarrative: `# Short Story

## Quests

1. Quest 1
2. Quest 2

Not enough narrative paragraphs.
`,

  htmlDangerousTags: `# Quest with Dangerous HTML

<script>alert('xss')</script>

This contains dangerous HTML that should be rejected.
`,

  htmlUnclosedComment: `# Quest with HTML Comment

<!-- This comment is never closed

This should trigger a validation error.
`
};

async function runTests() {
  console.log('🧪 Running LLM Response Validator Tests');
  console.log('');
  const { test, stats, printResults } = await createTestRunner('LLM Response Validator Tests');

  // Quest Markdown Validation Tests
  console.log('📦 Quest Markdown Validation Tests');
  console.log('-'.repeat(30));

  await test('Valid quest markdown passes all checks', () => {
    const result = validateQuestMarkdown(MOCK_RESPONSES.validQuest);
    assert(result.valid === true, 'Valid quest should pass validation');
    assert(result.errors.length === 0, 'Should have no errors');
  });

  await test('Quest missing H1 heading fails validation', () => {
    const result = validateQuestMarkdown(MOCK_RESPONSES.questMissingH1);
    assert(result.valid === false, 'Quest without H1 should fail');
    assert(result.errors.some(e => e.includes('H1')), 'Should report missing H1');
  });

  await test('Quest with unclosed code block fails validation', () => {
    const result = validateQuestMarkdown(MOCK_RESPONSES.questUnclosedCodeBlock);
    assert(result.valid === false, 'Quest with unclosed code block should fail');
    assert(result.errors.some(e => e.includes('code block')), 'Should report unclosed code block');
  });

  await test('Quest with empty links fails validation', () => {
    const result = validateQuestMarkdown(MOCK_RESPONSES.questEmptyLinks);
    assert(result.valid === false, 'Quest with empty links should fail');
    assert(result.errors.some(e => e.includes('link')), 'Should report invalid links');
  });

  await test('Quest with skipped headings generates warning', () => {
    const result = validateQuestMarkdown(MOCK_RESPONSES.questSkippedHeadings);
    // This may be valid but should warn about hierarchy
    assert(result.warnings.some(w => w.includes('hierarchy') || w.includes('H2')), 'Should warn about heading hierarchy');
  });

  // Story Markdown Validation Tests
  console.log('');
  console.log('📖 Story Markdown Validation Tests');
  console.log('-'.repeat(30));

  await test('Valid story markdown passes all checks', () => {
    const result = validateStoryMarkdown(MOCK_RESPONSES.validStory);
    assert(result.valid === true, 'Valid story should pass validation');
    assert(result.errors.length === 0, 'Should have no errors');
  });

  await test('Story missing quest list fails validation', () => {
    const result = validateStoryMarkdown(MOCK_RESPONSES.storyMissingQuests);
    assert(result.valid === false, 'Story without quests should fail');
    assert(result.errors.some(e => e.includes('quest') || e.includes('list')), 'Should report missing quest list');
  });

  await test('Story with insufficient narrative fails validation', () => {
    const result = validateStoryMarkdown(MOCK_RESPONSES.storyInsufficientNarrative);
    assert(result.valid === false, 'Story with insufficient narrative should fail');
    assert(result.errors.some(e => e.includes('narrative') || e.includes('paragraph')), 'Should report insufficient narrative');
  });

  // Markdown Structure Analysis Tests
  console.log('');
  console.log('🔍 Markdown Structure Analysis Tests');
  console.log('-'.repeat(30));

  await test('Analyzes markdown structure correctly', () => {
    const structure = analyzeMarkdownStructure(MOCK_RESPONSES.validQuest);
    assert(structure.hasH1Heading === true, 'Should detect H1 heading');
    assert(structure.hasH2Headings === true, 'Should detect H2 headings');
    assert(structure.hasCodeBlocks === true, 'Should detect code blocks');
    assert(structure.hasLinks === false, 'Should correctly report no links in fixture');
    assert(structure.hasLists === true, 'Should detect lists');
    assert(structure.codeBlocksValid === true, 'Code blocks should be valid');
    assert(structure.linksValid === true, 'Links should be valid (no links = valid)');
  });

  await test('Detects invalid code blocks', () => {
    const structure = analyzeMarkdownStructure(MOCK_RESPONSES.questUnclosedCodeBlock);
    assert(structure.codeBlocksValid === false, 'Should detect invalid code blocks');
  });

  await test('Detects invalid links', () => {
    const structure = analyzeMarkdownStructure(MOCK_RESPONSES.questEmptyLinks);
    assert(structure.linksValid === false, 'Should detect invalid links');
  });

  // HTML Compatibility Tests
  console.log('');
  console.log('🌐 HTML Compatibility Tests');
  console.log('-'.repeat(30));

  await test('Detects dangerous HTML tags', () => {
    const result = validateHTMLCompatibility(MOCK_RESPONSES.htmlDangerousTags);
    assert(result.valid === false, 'Should reject dangerous HTML');
    assert(result.errors.some(e => e.includes('script') || e.includes('Dangerous')), 'Should report dangerous tag');
  });

  await test('Detects unclosed HTML comments', () => {
    const result = validateHTMLCompatibility(MOCK_RESPONSES.htmlUnclosedComment);
    assert(result.valid === false, 'Should detect unclosed HTML comment');
    assert(result.errors.some(e => e.includes('comment')), 'Should report unclosed comment');
  });

  await test('Valid content passes HTML compatibility', () => {
    const result = validateHTMLCompatibility(MOCK_RESPONSES.validQuest);
    assert(result.valid === true, 'Valid markdown should be HTML compatible');
  });

  // Comprehensive Validation Tests
  console.log('');
  console.log('✅ Comprehensive Validation Tests');
  console.log('-'.repeat(30));

  await test('validateQuestResponse combines all validations', () => {
    const result = validateQuestResponse(MOCK_RESPONSES.validQuest);
    assert(result.valid === true, 'Valid quest should pass comprehensive validation');
    assert(result.errors.length === 0, 'Should have no errors');
  });

  await test('validateStoryResponse combines all validations', () => {
    const result = validateStoryResponse(MOCK_RESPONSES.validStory);
    assert(result.valid === true, 'Valid story should pass comprehensive validation');
    assert(result.errors.length === 0, 'Should have no errors');
  });

  await test('validateQuestResponse catches multiple issues', () => {
    const badQuest = MOCK_RESPONSES.questMissingH1 + MOCK_RESPONSES.htmlDangerousTags;
    const result = validateQuestResponse(badQuest);
    assert(result.valid === false, 'Invalid quest should fail');
    assert(result.errors.length > 1, 'Should catch multiple errors');
  });

  // Edge Cases
  console.log('');
  console.log('🔧 Edge Case Tests');
  console.log('-'.repeat(30));

  await test('Handles empty content gracefully', () => {
    const result = validateQuestMarkdown('');
    assert(result.valid === false, 'Empty content should fail validation');
    assert(result.errors.length > 0, 'Should report errors for empty content');
  });

  await test('Handles content with only headings', () => {
    const headingsOnly = '# Title\n## Section\n### Subsection';
    const result = validateQuestMarkdown(headingsOnly);
    // Should validate structure even if minimal
    assert(typeof result.valid === 'boolean', 'Should return validation result');
  });

  await test('Handles very long content', () => {
    const longContent = '# Quest\n\n' + 'Lorem ipsum '.repeat(10000);
    const result = validateQuestMarkdown(longContent);
    assert(typeof result.valid === 'boolean', 'Should handle long content without crashing');
  });

  await test('Handles content with special characters', () => {
    const specialChars = '# Quest: Symbols & Émojis 🚀\n\nContent with spëcial çhars & émojis 🎉';
    const result = validateQuestMarkdown(specialChars);
    assert(typeof result.valid === 'boolean', 'Should handle special characters');
  });

  printResults();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };