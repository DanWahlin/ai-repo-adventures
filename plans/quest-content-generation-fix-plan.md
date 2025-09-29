# Quest Content Generation Fix Plan

## Problem Analysis

The AI Repo Adventures generator is failing to create actual quest content, resulting in placeholder text "Quest content could not be generated." This is happening because:

1. **Configuration Ignored**: adventure.config.json specifies only 10 files but system reads entire codebase (325 files, 476K chars)
2. **Content Oversized**: Quest chunks are 441K chars (~110K tokens), exceeding practical LLM processing limits
3. **Systematic Failures**: All quest generation attempts fail after 3 retries across all themes

## Root Cause

The file optimization system in the codebase analyzer is not respecting the adventure.config.json configuration. Instead of processing only the specified files, it's reading the entire repository, making content too large for reliable LLM generation.

## Solution Plan

### Phase 1: Investigate Configuration Processing
- [ ] 1.1: Examine how adventure.config.json is parsed and used
- [ ] 1.2: Trace file discovery logic to understand why all files are included
- [ ] 1.3: Identify where the "optimization" flag should restrict file selection

### Phase 2: Fix File Selection Logic
- [ ] 2.1: Modify codebase analyzer to respect adventure.config.json file specifications
- [ ] 2.2: Ensure only configured files are read and processed
- [ ] 2.3: Implement proper file filtering based on quest-specific file lists

### Phase 3: Content Size Optimization
- [ ] 3.1: Verify that file-specific targeting reduces content size appropriately
- [ ] 3.2: Implement additional chunking strategies if needed for large individual files
- [ ] 3.3: Add content size validation before LLM requests

### Phase 4: Error Handling Improvements
- [ ] 4.1: Add better logging for configuration parsing
- [ ] 4.2: Provide clear feedback when content is still too large
- [ ] 4.3: Implement graceful degradation for oversized content

### Phase 5: Testing and Validation
- [ ] 5.1: Run unit tests to ensure no regressions
- [ ] 5.2: Test single theme generation with fixed configuration
- [ ] 5.3: Verify quest content is generated successfully
- [ ] 5.4: Test full multi-theme generation

## Success Criteria

1. ✅ Adventure.config.json file specifications are respected
2. ✅ Content size is reduced to manageable levels (under 100K tokens per quest)
3. ✅ Quest content is successfully generated with actual narrative content
4. ✅ All themes generate complete adventures with real quest content
5. ✅ Unit tests pass without regressions

## Files to Modify

- `packages/core/src/content/codebase-analyzer.ts` - Fix file selection logic
- `packages/core/src/adventure/adventure-manager.ts` - Ensure proper configuration usage
- `packages/generator/src/cli/html-generator.ts` - Add better error reporting
- Unit test files - Add tests for configuration respect

## Risk Assessment

- **Low Risk**: File selection changes are isolated and testable
- **Medium Risk**: Content size changes might affect existing successful repositories
- **Mitigation**: Thorough testing with both optimized and non-optimized repositories