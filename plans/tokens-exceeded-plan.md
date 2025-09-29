# Token Rate Limit Handling Plan

## Problem Statement

Azure S0 pricing tier has a **200K token per 60-second window** limit. When processing multiple themes in parallel, this limit is easily exceeded, resulting in:

```
Error: 429 Requests to the ChatCompletions_Create Operation under Azure OpenAI API version 2025-01-01-preview have exceeded token rate limit of your current AIServices S0 pricing tier.
```

This is different from the request rate limiting already handled - this is about **total token volume** within a time window.

## Solution Overview

Implement adaptive processing mode switching that:
1. Detects token rate limit exceeded errors (429 with specific message)
2. Waits for the rate limit window to reset
3. Switches to sequential processing mode
4. Notifies the user clearly about what happened and why
5. Continues processing successfully (albeit more slowly)

## Implementation Phases

### Phase 1: Enhanced Rate Limit Detection

**File**: `packages/core/src/llm/llm-client.ts`

Add new detection for token rate exceeded:
- Distinguish between token rate limits and request rate limits
- Extract window information from error messages
- Return appropriate strategy recommendations

Key changes:
```typescript
enum RateLimitType {
  TOKEN_RATE_EXCEEDED = 'token_rate_exceeded',  // 200K tokens/60s exceeded
  REQUEST_RATE_LIMIT = 'request_rate_limit',     // S0 tier throttling
  NONE = 'none'
}

private detectRateLimitType(error: any): RateLimitType
private getTokenRateLimitWindow(error: any): number  // Returns 60 for 60-second window
```

### Phase 2: Processing Mode Management

**File**: `packages/core/src/adventure/adventure-manager.ts`

Add processing mode control:
- Track current processing mode (parallel vs sequential)
- Implement sequential processing fallback
- Handle mode switching gracefully

Key additions:
```typescript
enum ProcessingMode {
  PARALLEL = 'parallel',
  SEQUENTIAL = 'sequential'
}

private processingMode: ProcessingMode = ProcessingMode.PARALLEL;
private tokenRateLimitEncountered: boolean = false;

async processThemesSequentially(themes: Theme[]): Promise<void>
async switchToSequentialMode(waitSeconds: number): Promise<void>
```

### Phase 3: Story Generator Enhancement

**File**: `packages/core/src/adventure/story-generator.ts`

Enhance error handling and propagation:
- Detect token rate limit errors
- Bubble up with appropriate context
- Include retry information

### Phase 4: CLI Enhancement

**File**: `packages/cli/src/cli/cli.ts`

Add command-line options:
- `--sequential`: Force sequential processing from start
- `--max-parallel <n>`: Limit parallel theme processing
- Better error messaging and recovery suggestions

### Phase 5: User Communication

Implement clear, helpful messaging when switching modes:
- Explain what happened (token rate limit exceeded)
- Show what we're doing (waiting, then switching to sequential)
- Provide optimization tips (use --sequential flag next time)

## Detailed Implementation Steps

### Step 1: Update LLM Client Detection

1. Add `isTokenRateExceededError()` method
2. Enhance `isAzureS0RateLimitError()` to be more specific
3. Add `getWaitTimeFromError()` to extract wait times
4. Update error handling in `generateResponse()`

### Step 2: Create Sequential Processing

1. Add `processThemesSequentially()` to AdventureManager
2. Implement theme-by-theme processing with progress indicators
3. Ensure proper error handling for each theme
4. Update completion messages

### Step 3: Implement Mode Switching

1. Catch token rate errors in `generateAllThemes()`
2. Display clear user messaging
3. Wait for rate limit window reset
4. Switch to sequential mode
5. Resume processing

### Step 4: Add CLI Options

1. Add `--sequential` flag
2. Add `--max-parallel` option
3. Update help documentation
4. Pass options through to AdventureManager

### Step 5: Testing

1. Create unit tests for rate limit detection
2. Test mode switching logic
3. Verify sequential processing works correctly
4. Test CLI option parsing

## Error Message Patterns

### Token Rate Exceeded (Our Target)
```
429 Requests to the ChatCompletions_Create Operation under Azure OpenAI API version 2025-01-01-preview have exceeded token rate limit of your current AIServices S0 pricing tier.
```

### Request Rate Limit (Already Handled)
```
429 Requests... exceeded token rate limit of your current AIServices S0 pricing tier. Please retry after 59 seconds.
```

## User Experience Flow

### When Token Rate Limit Hit:

1. **Detection**
   ```
   ⚠️  Token rate limit exceeded (200K tokens/60s window)
   ```

2. **Waiting**
   ```
   ⏳ Waiting 60 seconds for rate limit window to reset...
   ```

3. **Mode Switch**
   ```
   🔄 Switching to sequential processing mode
   📝 This will take longer but avoid rate limits
   ```

4. **Continuation**
   ```
   ✅ Continuing with Theme 3 of 10: Space
   Processing themes sequentially...
   ```

5. **Completion**
   ```
   ✨ All themes generated successfully!
   💡 Tip: Use --sequential flag next time to avoid rate limits
   ```

## Success Metrics

- ✅ No failures due to token rate limits
- ✅ Clear user communication about what's happening
- ✅ Automatic recovery without user intervention
- ✅ Helpful suggestions for future runs
- ✅ Maintains all functionality (just slower)

## Future Enhancements

1. **Token Budget Tracking**: Pre-calculate token usage and switch preemptively
2. **Smart Batching**: Process themes in optimal batch sizes based on token estimates
3. **Tier Detection**: Auto-detect Azure tier and configure accordingly
4. **Progress Persistence**: Save progress to resume if interrupted

## Files to Modify

1. `/packages/core/src/llm/llm-client.ts` - Enhanced rate limit detection
2. `/packages/core/src/adventure/adventure-manager.ts` - Processing mode management
3. `/packages/core/src/adventure/story-generator.ts` - Error propagation
4. `/packages/cli/src/cli/cli.ts` - Command-line options
5. `/tests/unit/llm-client.test.ts` - Unit tests for detection
6. `/tests/unit/adventure-manager.test.ts` - Tests for mode switching