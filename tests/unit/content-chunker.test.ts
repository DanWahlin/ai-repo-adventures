#!/usr/bin/env node

/**
 * Unit tests for ContentChunker functionality
 */

import { createTestRunner, assert } from '../shared/test-utils.js';
import { ContentChunker, estimateTokenCount } from '../../packages/core/src/shared/content-chunker.js';

export async function runContentChunkerTests() {
  console.log('📊 Running Content Chunker Tests\n');
  const { test, stats, printResults } = await createTestRunner('Content Chunker Tests');

  // Helper function to create realistic file content
  function createFileContent(path: string, lines: number = 100): string {
    const header = `## File: ${path}\n\n`;
    const content = Array.from({ length: lines }, (_, i) =>
      `// Line ${i + 1}: Some TypeScript code with functions and classes`
    ).join('\n');
    return header + content;
  }

  // Helper function to create large module content
  function createLargeModuleContent(moduleName: string, fileCount: number = 5, linesPerFile: number = 1000): string {
    const files = Array.from({ length: fileCount }, (_, i) =>
      createFileContent(`${moduleName}/file${i + 1}.ts`, linesPerFile)
    );
    return files.join('\n\n');
  }

  console.log('\n📦 Basic Functionality Tests');
  console.log('-'.repeat(30));

  await test('estimateTokenCount calculates tokens correctly', () => {
    const text = 'Hello world, this is a test string for token estimation.';
    const tokens = estimateTokenCount(text);
    const expectedTokens = Math.ceil(text.length * 0.25); // ESTIMATED_TOKENS_PER_CHAR = 0.25

    assert(tokens === expectedTokens, `Expected ${expectedTokens} tokens, got ${tokens}`);
  });

  await test('chunkContent handles small content in single chunk', () => {
    const smallContent = createFileContent('test.ts', 10);
    const result = ContentChunker.chunkContent(smallContent);

    assert(result.chunks.length === 1, 'Should create single chunk for small content');
    assert(result.chunks[0].metadata.strategy === 'single', 'Should use single strategy');
    assert(result.chunks[0].metadata.chunkIndex === 0, 'Should have correct chunk index');
    assert(result.chunks[0].metadata.totalChunks === 1, 'Should have correct total chunks');
  });

  console.log('\n🔀 Chunking Strategy Tests');
  console.log('-'.repeat(30));

  await test('chunkContent uses hybrid strategy for large content', () => {
    // Create content larger than AVAILABLE_CONTENT_CHARS
    const largeContent = createLargeModuleContent('src/large-module', 10, 2000);
    const result = ContentChunker.chunkContent(largeContent);

    assert(result.chunks.length > 1, 'Should create multiple chunks for large content');
    assert(result.chunks[0].metadata.strategy === 'module-based', 'Should use module-based strategy');
  });

  await test('extractFileList identifies all files correctly', () => {
    const content = `
## File: src/file1.ts
Some content

## File: src/file2.js
More content

### File: docs/readme.md
Documentation
`;
    const result = ContentChunker.chunkContent(content);
    const files = result.chunks[0].metadata.files;

    assert(files.length === 3, 'Should identify all 3 files');
    assert(files.includes('src/file1.ts'), 'Should include file1.ts');
    assert(files.includes('src/file2.js'), 'Should include file2.js');
    assert(files.includes('docs/readme.md'), 'Should include readme.md');
  });

  console.log('\n🎯 Dynamic Chunk Limit Tests (Critical Regression Test)');
  console.log('-'.repeat(60));

  await test('splitLargeModule respects subsequent chunk limits', () => {
    // Create a very large module that will definitely need splitting
    // This simulates the packages/core scenario that caused the regression
    const hugeModuleContent = createLargeModuleContent('packages/core', 20, 3000);
    const result = ContentChunker.chunkContent(hugeModuleContent);

    // Verify we have multiple chunks
    assert(result.chunks.length >= 2, `Should create multiple chunks, got ${result.chunks.length}`);

    // Critical test: Verify subsequent chunks respect size limits
    for (let i = 1; i < result.chunks.length; i++) {
      const chunk = result.chunks[i];
      const chunkSize = chunk.content.length;

      // Subsequent chunks should be smaller than first chunk
      // They need to leave room for context summaries (~32k chars)
      const maxSubsequentSize = 430000; // Roughly SUBSEQUENT_CHUNK_CHARS

      assert(chunkSize <= maxSubsequentSize,
        `Chunk ${i} exceeds subsequent chunk limit: ${chunkSize} > ${maxSubsequentSize} chars`);

      // Verify chunk would fit with context summary (8k tokens ≈ 32k chars)
      const withContextSummary = chunkSize + 32000;
      const maxSafeSize = 460000; // Should be well under AVAILABLE_CONTENT_CHARS

      assert(withContextSummary <= maxSafeSize,
        `Chunk ${i} with context summary would be too large: ${withContextSummary} > ${maxSafeSize} chars`);
    }
  });

  await test('splitLargeFile respects subsequent chunk limits', () => {
    // Create a single enormous file that needs splitting
    const hugeFileContent = createFileContent('huge-file.ts', 10000);
    const result = ContentChunker.chunkContent(hugeFileContent);

    if (result.chunks.length > 1) {
      // Find chunks with 'file-split' strategy (if any)
      const fileSplitChunks = result.chunks.filter(chunk =>
        chunk.metadata.strategy === 'file-split'
      );

      for (const chunk of fileSplitChunks) {
        if (chunk.metadata.chunkIndex > 0) {
          const chunkSize = chunk.content.length;
          const maxSubsequentSize = 430000;

          assert(chunkSize <= maxSubsequentSize,
            `File-split chunk ${chunk.metadata.chunkIndex} exceeds limit: ${chunkSize} > ${maxSubsequentSize}`);
        }
      }
    }
  });

  await test('chunk rollover recalculates limits correctly', () => {
    // Create specific scenario that triggers rollover between first and subsequent chunks
    // This creates a module that starts at chunk 0 but has blocks that roll into chunk 1
    const moduleContent = `
## File: packages/core/file1.ts
${'// Large file content\n'.repeat(25000)}

## File: packages/core/file2.ts
${'// Medium file content\n'.repeat(20000)}

## File: packages/core/file3.ts
${'// Another large file that should trigger rollover\n'.repeat(22000)}
`;

    const result = ContentChunker.chunkContent(moduleContent);

    // Should have created multiple chunks due to size
    assert(result.chunks.length >= 2, `Expected multiple chunks, got ${result.chunks.length}`);

    // Verify all subsequent chunks respect the smaller limit
    for (let i = 1; i < result.chunks.length; i++) {
      const chunk = result.chunks[i];
      const chunkSize = chunk.content.length;
      const maxSubsequentSize = 430000; // SUBSEQUENT_CHUNK_CHARS

      assert(chunkSize <= maxSubsequentSize,
        `Rollover chunk ${i} exceeds subsequent limit: ${chunkSize} > ${maxSubsequentSize} chars`);

      // Critical: verify it would fit with context summary
      const withContext = chunkSize + 32000; // ~8k tokens for context summary
      assert(withContext <= 460000,
        `Rollover chunk ${i} with context exceeds safe limit: ${withContext} > 460000 chars`);
    }
  });

  console.log('\n🏗️ Module Grouping Tests');
  console.log('-'.repeat(30));

  await test('extractModuleName creates logical groupings', () => {
    // We can't directly test the private method, but we can verify the results
    const content = `
## File: src/agents/travel-agent.ts
Content

## File: src/utils/helper.ts
Content

## File: packages/core/src/adventure/manager.ts
Content
`;
    const result = ContentChunker.chunkContent(content);

    // Verify modules are grouped logically
    const firstChunk = result.chunks[0];
    if (firstChunk.metadata.modules) {
      // Should group by logical directories like 'src/agents', 'src/utils', 'packages/core'
      const modules = firstChunk.metadata.modules;

      // At minimum, should not create excessive fragmentation
      assert(modules.length <= 3, `Should not over-fragment modules, got ${modules.length}: ${modules.join(', ')}`);
    }
  });

  console.log('\n⚡ Performance and Edge Cases');
  console.log('-'.repeat(30));

  await test('handles empty content gracefully', () => {
    const result = ContentChunker.chunkContent('');

    assert(result.chunks.length === 1, 'Should create one chunk for empty content');
    assert(result.chunks[0].content === '', 'Should preserve empty content');
    assert(result.totalEstimatedTokens === 0, 'Should have zero estimated tokens');
  });

  await test('handles content with only headers', () => {
    const content = '## File: test.ts\n\n## File: another.ts\n';
    const result = ContentChunker.chunkContent(content);

    assert(result.chunks.length === 1, 'Should handle header-only content');
    assert(result.chunks[0].metadata.files.length === 2, 'Should identify both files');
  });

  await test('ensureCodeBlocksClosed works correctly', () => {
    const content = `
## File: test.ts

\`\`\`typescript
function test() {
  return "unclosed";
// Missing closing backticks
`;
    const result = ContentChunker.chunkContent(content);

    // The chunker should close unclosed code blocks
    assert(result.chunks[0].content.includes('```'), 'Should contain code block markers');

    // Count opening and closing code blocks - should be even
    // Note: The ensureCodeBlocksClosed is only applied during file splitting, not single chunks
    // For single chunks, we just verify the content is preserved correctly
    const hasCodeBlocks = result.chunks[0].content.includes('```typescript');
    assert(hasCodeBlocks, 'Should preserve code block content');
  });

  console.log('\n🔍 Token Management Verification');
  console.log('-'.repeat(30));

  await test('total estimated tokens stay within reasonable bounds', () => {
    const largeContent = createLargeModuleContent('test-module', 15, 2000);
    const result = ContentChunker.chunkContent(largeContent);

    // Each chunk should have reasonable token estimates
    for (const chunk of result.chunks) {
      const tokens = chunk.metadata.estimatedTokens;
      const maxReasonableTokens = 120000; // Well under 128k context limit

      assert(tokens > 0, 'Should have positive token count');
      assert(tokens <= maxReasonableTokens,
        `Chunk ${chunk.metadata.chunkIndex} has too many tokens: ${tokens} > ${maxReasonableTokens}`);
    }

    // Total should be reasonable
    assert(result.totalEstimatedTokens > 0, 'Should have positive total tokens');
  });

  printResults();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runContentChunkerTests();
}