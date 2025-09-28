# Chunking Implementation Plan

## Goal
Replace the current truncation system with a hybrid chunking approach that maximizes context window usage (128k tokens) while avoiding information loss in large codebases.

## Core Principles
1. **Maximize First Chunk**: Use as much of the 128k context window as possible on the first LLM call
2. **Hybrid Strategy**: Group files by directory (module), fall back to file splitting when needed
3. **Simple Implementation**: Keep the solution maintainable and easy to follow
4. **Complete Replacement**: Remove all truncation code, no fallbacks

## Implementation Steps

### Phase 1: Create Chunking Infrastructure
1. **Create ContentChunker class** in `packages/core/src/shared/content-chunker.ts`
   - Directory-based module grouping
   - File splitting for oversized files
   - Token estimation and chunk optimization
   - Simple, clean interface

2. **Define Chunk interfaces** for type safety
   - `ContentChunk` interface with metadata
   - `ChunkStrategy` enum for different chunking approaches
   - Clear separation of concerns

### Phase 2: Update StoryGenerator
1. **Modify StoryGenerator.generateStory()** in `packages/core/src/adventure/story-generator.ts`
   - Replace `smartTruncateContent()` calls with chunking logic
   - Implement iterative LLM calls for multiple chunks
   - Context summarization between chunks
   - Maintain narrative coherence across chunks

2. **Update method signatures** to handle chunked processing
   - Keep existing public API intact
   - Internal refactoring for chunk handling
   - Preserve error handling and fallback behavior

### Phase 3: Remove Truncation System
1. **Delete content-truncator.ts** entirely
   - Remove all truncation functions
   - Remove truncation-related imports
   - Clean up configuration constants

2. **Update all references** across the codebase
   - Replace imports of truncation functions
   - Remove truncation-related config values
   - Update any other files that reference truncation

3. **Clean up configuration** in `packages/core/src/shared/config.ts`
   - Remove truncation-specific constants
   - Add chunking-specific configuration
   - Update token limits for 128k context window

### Phase 4: Testing and Validation
1. **Test with small codebases** (single chunk scenario)
   - Verify no regression in functionality
   - Confirm story quality remains high
   - Validate performance is acceptable

2. **Test with large codebases** (multi-chunk scenario)
   - Verify all code gets processed
   - Confirm narrative coherence across chunks
   - Validate no information loss

3. **Run existing test suites**
   - Unit tests
   - Integration tests
   - Ensure no regressions

## Technical Specifications

### Token Management
- **Target Context Window**: 128,000 tokens
- **Reserve for Response**: 4,000 tokens (max response size)
- **Reserve for Prompts**: 2,000 tokens (base prompts, instructions)
- **Available for Content**: ~122,000 tokens (≈488,000 characters)
- **First Chunk Size**: Maximize usage of available content space
- **Subsequent Chunks**: Leave room for previous context summary

### Chunking Strategy
1. **Directory-Based Grouping**: Group files from same directory until token limit reached
2. **File Splitting**: When single file exceeds limits, split at logical boundaries
3. **Metadata Preservation**: Track chunk relationships and context

### LLM Call Pattern
```
First Call: [Base Prompt] + [Chunk 1 - Maximum Size]
Second Call: [Base Prompt] + [Previous Summary] + [Chunk 2]
Third Call: [Base Prompt] + [Updated Summary] + [Chunk 3]
...
Final Call: [Base Prompt] + [Complete Summary] + "Finalize story"
```

## Files to Modify

### New Files
- `packages/core/src/shared/content-chunker.ts` - Main chunking logic

### Modified Files
- `packages/core/src/adventure/story-generator.ts` - Update to use chunking
- `packages/core/src/shared/config.ts` - Update configuration
- Any other files importing from content-truncator.ts

### Deleted Files
- `packages/core/src/shared/content-truncator.ts` - Complete removal

## Success Criteria
1. **No Information Loss**: All code in repository gets processed by LLM
2. **Performance**: First chunk maximizes context window usage
3. **Quality**: Story narrative remains coherent across chunks
4. **Maintainability**: Code remains simple and easy to understand
5. **Compatibility**: Existing API surface remains unchanged

## Implementation Order
Follow the phases sequentially - complete each phase fully before moving to the next. This ensures we maintain working functionality throughout the implementation process.