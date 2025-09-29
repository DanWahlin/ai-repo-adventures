# Automatic Mode Switching Implementation Plan

## Executive Summary
Complete the integration between LLM client rate limit detection and HTML generator processing mode switching to enable automatic fallback from parallel to sequential theme processing when Azure S0 token rate limits are exceeded.

## Current State Analysis

### What's Already Implemented ✅
1. **LLM Client Detection** (`packages/core/src/llm/llm-client.ts`)
   - `RateLimitType` enum with TOKEN_RATE_EXCEEDED
   - `detectRateLimitType()` method for identifying token rate errors
   - `RateLimitInfo` interface for error details
   - Adaptive throttling infrastructure

2. **Sequential Processing** (`packages/generator/src/cli/html-generator.ts`)
   - `generateThemesSequentially()` method
   - `--sequential` CLI flag support
   - `processingMode` property tracking
   - Basic error detection in `isTokenRateLimitError()`

### What's Missing ❌
1. **Automatic Mode Switching Logic**
   - No connection between rate limit detection and mode switching
   - Parallel processing doesn't catch and handle token rate errors
   - No recovery mechanism during parallel execution

2. **User Experience Messaging**
   - Missing clear notifications about mode switches
   - No progress indicators during wait periods
   - Lacks helpful tips for future runs

3. **State Management**
   - No tracking of token rate limit encounters
   - Missing wait time calculation
   - No persistence of mode switch decisions

## Implementation Strategy

### Phase 1: Enhanced Error Propagation
**Goal**: Ensure token rate limit errors bubble up properly from LLM client to HTML generator

#### 1.1 Update LLM Client Error Handling
```typescript
// In llm-client.ts
class RateLimitError extends Error {
  constructor(
    public type: RateLimitType,
    public waitTime?: number,
    public originalError?: any
  ) {
    super(`Rate limit exceeded: ${type}`);
  }
}
```

#### 1.2 Modify Error Throwing
- Throw `RateLimitError` instead of generic errors
- Include wait time and type information
- Preserve original error for debugging

### Phase 2: Implement Automatic Mode Switching
**Goal**: Detect token rate limits during parallel processing and switch to sequential

#### 2.1 Update `generateAllThemes()` Method
```typescript
// In html-generator.ts
private async generateAllThemes(outputPath: string, themes: Theme[]): Promise<void> {
  try {
    if (this.forceSequential) {
      await this.generateThemesSequentially(outputPath, themes);
    } else {
      await this.generateThemesInParallel(outputPath, themes);
    }
  } catch (error) {
    if (this.isTokenRateLimitError(error)) {
      await this.handleTokenRateLimitAndRetry(outputPath, themes, error);
    } else {
      throw error;
    }
  }
}
```

#### 2.2 Create Recovery Handler
```typescript
private async handleTokenRateLimitAndRetry(
  outputPath: string,
  themes: Theme[],
  error: any
): Promise<void> {
  // 1. Extract completed themes from progress
  // 2. Display user messages
  // 3. Wait for rate limit window
  // 4. Switch to sequential mode
  // 5. Process remaining themes
}
```

### Phase 3: User Experience Enhancements
**Goal**: Provide clear, helpful feedback during mode switches

#### 3.1 Message Templates
```typescript
const MESSAGES = {
  TOKEN_RATE_DETECTED: '⚠️  Token rate limit exceeded (200K tokens/60s window for Azure S0 tier)',
  WAITING: '⏳ Waiting {seconds} seconds for rate limit window to reset...',
  MODE_SWITCH: '🔄 Switching to sequential processing mode to avoid further rate limits',
  CONTINUING: '✅ Continuing with theme {current} of {total}: {name}',
  TIP: '💡 Tip: Use --sequential flag next time for large theme sets with Azure S0'
};
```

#### 3.2 Progress Tracking
- Maintain list of completed themes
- Track which theme caused the error
- Resume from the correct position

### Phase 4: State Management
**Goal**: Track mode switches and provide intelligent behavior

#### 4.1 Add State Properties
```typescript
class HtmlGenerator {
  private tokenRateLimitEncountered = false;
  private completedThemes = new Set<string>();
  private currentProcessingTheme?: string;
  private rateLimitWaitStartTime?: number;
}
```

#### 4.2 Progress Persistence
- Save progress before switching modes
- Track completed themes to avoid reprocessing
- Resume from failure point

## Detailed Implementation Steps

### Step 1: Create RateLimitError Class
**File**: `packages/core/src/llm/llm-client.ts`

1. Define custom error class with type information
2. Update `generateResponse()` to throw RateLimitError
3. Export error class for use in other modules

### Step 2: Enhance Theme Processing
**File**: `packages/generator/src/cli/html-generator.ts`

1. Wrap parallel processing in try-catch
2. Detect RateLimitError instances
3. Extract progress information
4. Implement recovery logic

### Step 3: Implement Wait and Retry
**File**: `packages/generator/src/cli/html-generator.ts`

1. Calculate wait time (default 60 seconds for token rate)
2. Display countdown timer
3. Switch processing mode flag
4. Resume with sequential processing

### Step 4: Add Progress Tracking
**File**: `packages/generator/src/cli/html-generator.ts`

1. Track completed themes during parallel processing
2. Identify failure point
3. Filter remaining themes for sequential processing
4. Update final statistics

### Step 5: User Communication
**File**: `packages/generator/src/cli/html-generator.ts`

1. Add console output formatting
2. Implement countdown timer display
3. Show clear mode switch messages
4. Provide helpful tips for future runs

## Code Changes Required

### 1. LLM Client (`llm-client.ts`)
- Add `RateLimitError` class
- Modify `generateResponse()` error handling
- Export error types for consumers

### 2. HTML Generator (`html-generator.ts`)
- Add state management properties
- Implement `handleTokenRateLimitAndRetry()`
- Update `generateAllThemes()` with try-catch
- Add progress tracking to parallel processing
- Enhance user messaging

### 3. Story Generator (`story-generator.ts`)
- Ensure errors propagate correctly
- Don't catch and suppress rate limit errors
- Preserve error context

## Testing Strategy

### Unit Tests
1. Test `RateLimitError` creation and properties
2. Test error detection logic
3. Test progress tracking
4. Test theme filtering for resume

### Integration Tests
1. Simulate token rate limit during parallel processing
2. Verify automatic mode switch
3. Confirm no themes are reprocessed
4. Validate user messages appear correctly

### Manual Testing Scenarios
1. Process 10 themes in parallel, trigger rate limit at theme 5
2. Verify wait period and mode switch
3. Confirm themes 6-10 process sequentially
4. Check final output has all themes

## Success Criteria

1. **Automatic Recovery** ✓
   - System detects token rate limits during parallel processing
   - Automatically switches to sequential mode
   - Completes all themes successfully

2. **No Data Loss** ✓
   - All themes get processed
   - No themes are processed twice
   - Final output is complete

3. **Clear Communication** ✓
   - User understands what happened
   - Knows why processing slowed down
   - Gets helpful tips for optimization

4. **Maintainability** ✓
   - Code is well-organized
   - Error handling is consistent
   - Logic is easy to follow

## Implementation Timeline

1. **Hour 1**: Create RateLimitError class and update LLM client
2. **Hour 2**: Implement recovery handler and state management
3. **Hour 3**: Add progress tracking and user messaging
4. **Hour 4**: Testing and refinement

## Risk Mitigation

### Risk 1: Incomplete Progress Tracking
**Mitigation**: Use theme IDs to track completion, not array indices

### Risk 2: User Confusion
**Mitigation**: Clear, consistent messaging with emojis and formatting

### Risk 3: Double Processing
**Mitigation**: Maintain Set of completed theme IDs

### Risk 4: Infinite Retry Loop
**Mitigation**: Limit retry attempts, fail gracefully after max retries

## Future Enhancements

1. **Predictive Mode Switching**: Calculate expected token usage upfront
2. **Adaptive Batch Sizes**: Process themes in smaller batches
3. **Progress Persistence**: Save to disk for resume after crashes
4. **Token Budget Tracking**: Monitor token usage in real-time

## Conclusion

This plan completes the missing integration between rate limit detection and automatic processing mode switching. The implementation focuses on user experience, data integrity, and maintainability while providing automatic recovery from Azure S0 token rate limits.