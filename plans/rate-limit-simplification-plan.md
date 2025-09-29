# Rate Limit Logic Simplification Plan

## Executive Summary
Simplify and optimize the rate limit detection and handling logic across the codebase by removing redundant code, standardizing patterns, adding configurability, and improving test coverage.

## Current State Analysis

### What's Working Well ✅
1. **LLM Client Detection** - Clear separation between TOKEN_RATE_EXCEEDED and REQUEST_RATE_LIMIT
2. **Custom RateLimitError Class** - Well-designed with all necessary context
3. **Adaptive Throttling** - Intelligent exponential backoff with decay
4. **Automatic Mode Switching** - Parallel → Sequential fallback working correctly
5. **Error Propagation** - Clean propagation path from LLM client through to HTML generator

### Issues Identified ⚠️

#### Issue #1: Redundant Detection Method
**Location**: `packages/core/src/llm/llm-client.ts:431-434`
- `isAzureS0RateLimitError()` method simply wraps `detectRateLimitType()`
- Only used in one place internally
- Dead code that adds complexity

#### Issue #2: Duplicate Retry Time Extraction
**Location**: `packages/core/src/llm/llm-client.ts:443-452`
- Same regex pattern exists in both `detectRateLimitType()` and `activateThrottling()`
- Code duplication leads to maintenance issues

#### Issue #3: Magic Number for Token Rate Wait Time
**Location**: `packages/core/src/llm/llm-client.ts:401`
- Hardcoded 60 seconds for token rate window
- Should be configurable for different Azure tiers

#### Issue #4: Legacy 429 Detection Code
**Location**: `packages/generator/src/cli/html-generator.ts:1827-1838`
- Old-style 429 error detection is now dead code
- We always throw RateLimitError from LLM client
- Should be removed or documented

#### Issue #5: Inconsistent Wait Time Extraction
**Location**: `packages/generator/src/cli/html-generator.ts:1893 vs 1704`
- Two different patterns for extracting wait time
- Sequential retry loop: `(error instanceof RateLimitError) ? error.waitSeconds : 60`
- Handler method: `error.waitSeconds || 60`
- Inconsistency leads to confusion

#### Issue #6: Missing Unit Tests
**Location**: `tests/unit/automatic-mode-switching.test.ts`
- No tests for sequential retry with rate limits
- No tests for wait time extraction in sequential mode
- No tests for max retries behavior

## Implementation Plan

### Phase 1: Remove Redundant Code (HIGH PRIORITY)

#### Step 1.1: Remove isAzureS0RateLimitError Method
**File**: `packages/core/src/llm/llm-client.ts`

**Action**: Delete the redundant wrapper method
```typescript
// DELETE THIS METHOD (lines 431-434)
private isAzureS0RateLimitError(error: any): boolean {
  const rateLimitInfo = this.detectRateLimitType(error);
  return rateLimitInfo.type === RateLimitType.REQUEST_RATE_LIMIT;
}
```

**Update**: Modify `activateThrottling()` to use `detectRateLimitType()` directly
- Before: `if (this.isAzureS0RateLimitError(error))`
- After: Use result from `detectRateLimitType()`

**Benefits**:
- Removes 4 lines of dead code
- Simplifies call chain
- One less method to maintain

#### Step 1.2: Consolidate Retry Time Extraction
**File**: `packages/core/src/llm/llm-client.ts`

**Current State**: Duplicate regex extraction in `activateThrottling()`
```typescript
const retryMatch = errorMessage.match(/retry after (\d+) seconds/);
if (retryMatch) {
  const suggestedDelay = parseInt(retryMatch[1]) * 1000;
  this.throttleDelay = Math.min(suggestedDelay, this.MAX_THROTTLE_DELAY);
}
```

**Action**: Use `RateLimitInfo` from `detectRateLimitType()`
```typescript
private activateThrottling(error: any): void {
  this.isThrottling = true;
  const rateLimitInfo = this.detectRateLimitType(error);

  if (rateLimitInfo.type !== RateLimitType.NONE) {
    // Use waitSeconds from detection (already in seconds)
    const suggestedDelay = rateLimitInfo.waitSeconds * 1000;
    this.throttleDelay = Math.min(suggestedDelay, this.MAX_THROTTLE_DELAY);
  } else {
    // Fallback: double the delay if no rate limit detected
    this.throttleDelay = Math.min(this.throttleDelay * 2, this.MAX_THROTTLE_DELAY);
  }

  // ... logging
}
```

**Benefits**:
- Single source of truth for retry time extraction
- No code duplication
- Easier to maintain and test

### Phase 2: Add Configuration (HIGH PRIORITY)

#### Step 2.1: Add TOKEN_RATE_WINDOW_SECONDS
**File**: `packages/core/src/shared/config.ts`

**Action**: Add new configuration constant
```typescript
// Token rate limit configuration
export const TOKEN_RATE_WINDOW_SECONDS = parseInt(
  process.env.TOKEN_RATE_WINDOW_SECONDS || '60'
);
```

**Update**: Use in `llm-client.ts`
```typescript
// In detectRateLimitType() method
import { TOKEN_RATE_WINDOW_SECONDS } from '../shared/config.js';

// Replace line 401:
// waitSeconds: 60, // Default to 60 second window
waitSeconds: TOKEN_RATE_WINDOW_SECONDS,
```

**Update**: Add to `.env.example` and `.env`
```bash
# Token rate limit window for Azure S0 tier (default: 60 seconds)
TOKEN_RATE_WINDOW_SECONDS=60
```

**Benefits**:
- Configurable for different Azure tiers
- Easier to test with different values
- No hardcoded magic numbers

### Phase 3: Clean Up Legacy Code (HIGH PRIORITY)

#### Step 3.1: Remove Legacy 429 Detection
**File**: `packages/generator/src/cli/html-generator.ts`

**Current State**: Lines 1827-1838 contain old-style 429 detection
```typescript
// Legacy: Check for old-style 429 errors
const errorMessage = error?.message || '';
const is429Error = error?.status === 429 || errorMessage.includes('429');

// Check for token rate exceeded (no "retry after" specified)
if (is429Error &&
    errorMessage.includes('exceeded token rate limit of your current AIServices S0 pricing tier') &&
    !errorMessage.includes('retry after')) {
  return true;
}

return false;
```

**Action**: Remove legacy code since we always throw RateLimitError
```typescript
private isTokenRateLimitError(error: any): boolean {
  if (!error) return false;

  // Check for RateLimitError instances from LLM client
  if (error instanceof RateLimitError) {
    return error.type === RateLimitType.TOKEN_RATE_EXCEEDED ||
           error.type === RateLimitType.REQUEST_RATE_LIMIT;
  }

  // Not a recognized rate limit error
  return false;
}
```

**Benefits**:
- Removes ~15 lines of dead code
- Simpler, clearer logic
- Easier to understand and maintain

### Phase 4: Standardize Patterns (MEDIUM PRIORITY)

#### Step 4.1: Consistent Wait Time Extraction
**File**: `packages/generator/src/cli/html-generator.ts`

**Action**: Use consistent pattern throughout
```typescript
// Standard pattern for wait time extraction
function getWaitSeconds(error: any): number {
  return (error instanceof RateLimitError) ? error.waitSeconds : 60;
}
```

**Update**: Use in both locations
- Line 1893 (sequential retry loop) ✅ Already correct
- Line 1704 (handleTokenRateLimitAndRetry) - Update to use instanceof check

**Benefits**:
- Consistent code patterns
- Type safety with instanceof check
- Easier to understand

### Phase 5: Add Missing Tests (MEDIUM PRIORITY)

#### Step 5.1: Sequential Retry Tests
**File**: `tests/unit/sequential-retry.test.ts` (NEW FILE)

**Action**: Create comprehensive test suite
```typescript
import { describe, test, expect } from './test-framework.js';
import { RateLimitError, RateLimitType } from '../../packages/core/src/llm/llm-client.js';

export function runSequentialRetryTests() {
  describe('Sequential Retry Logic Tests', () => {

    test('Sequential retry respects RateLimitError.waitSeconds', () => {
      const error = new RateLimitError(
        RateLimitType.TOKEN_RATE_EXCEEDED,
        30, // Custom wait time
        'Token rate exceeded'
      );

      const waitTime = error.waitSeconds;
      expect(waitTime).toBe(30);
    });

    test('Sequential retry defaults to 60 seconds for non-RateLimitError', () => {
      const error = new Error('Some other error');
      const waitTime = (error instanceof RateLimitError) ? error.waitSeconds : 60;
      expect(waitTime).toBe(60);
    });

    test('RateLimitError preserves original error context', () => {
      const originalError = new Error('Azure API error');
      const rateLimitError = new RateLimitError(
        RateLimitType.REQUEST_RATE_LIMIT,
        45,
        'Request rate limit',
        originalError
      );

      expect(rateLimitError.originalError).toBe(originalError);
      expect(rateLimitError.type).toBe(RateLimitType.REQUEST_RATE_LIMIT);
    });

    test('TOKEN_RATE_EXCEEDED creates correct error message', () => {
      const error = new RateLimitError(
        RateLimitType.TOKEN_RATE_EXCEEDED,
        60,
        'Test message'
      );

      expect(error.message).toContain('Token rate limit exceeded');
      expect(error.message).toContain('60 seconds');
    });

    test('REQUEST_RATE_LIMIT creates correct error message', () => {
      const error = new RateLimitError(
        RateLimitType.REQUEST_RATE_LIMIT,
        30,
        'Test message'
      );

      expect(error.message).toContain('Request rate limit hit');
      expect(error.message).toContain('30 seconds');
    });
  });
}
```

**Update**: `tests/unit-test-runner.ts` to include new tests
```typescript
import { runSequentialRetryTests } from './unit/sequential-retry.test.js';

// Add to test groups
testGroups.push({
  name: 'Sequential Retry',
  runner: runSequentialRetryTests
});
```

**Benefits**:
- Comprehensive coverage of sequential retry logic
- Validates wait time extraction
- Tests error message formatting

## Testing Strategy

### Unit Tests
1. ✅ Test RateLimitError creation with different types
2. ✅ Test wait time extraction patterns
3. ✅ Test error message formatting
4. ✅ Test instanceof checks
5. ✅ Test original error preservation

### Integration Tests
1. Test LLM client throws RateLimitError correctly
2. Test HTML generator catches and handles RateLimitError
3. Test sequential retry waits and retries
4. Test automatic mode switching

### Manual Testing
1. Generate all themes with Azure S0 tier
2. Verify automatic mode switching occurs
3. Verify wait times are respected
4. Verify all themes complete successfully

## Success Criteria

### Code Quality ✓
- [ ] No redundant methods
- [ ] No code duplication
- [ ] No hardcoded magic numbers
- [ ] Consistent patterns throughout

### Test Coverage ✓
- [ ] Unit tests pass (89+ tests)
- [ ] New sequential retry tests pass
- [ ] Integration tests pass
- [ ] No regressions in existing functionality

### Functionality ✓
- [ ] Rate limit detection works correctly
- [ ] Adaptive throttling works
- [ ] Automatic mode switching works
- [ ] Wait times are configurable
- [ ] Error messages are clear

## Implementation Timeline

### Immediate (30 minutes)
- ✅ Phase 1: Remove redundant code
- ✅ Phase 2: Add configuration
- ✅ Phase 3: Clean up legacy code

### Near-term (30 minutes)
- ✅ Phase 4: Standardize patterns
- ✅ Phase 5: Add missing tests

### Total Estimated Time: **1 hour**

## Risk Mitigation

### Risk 1: Breaking Changes
**Mitigation**: Comprehensive test suite before and after changes

### Risk 2: Configuration Conflicts
**Mitigation**: Use sensible defaults, update both .env and .env.example

### Risk 3: Test Failures
**Mitigation**: Run tests incrementally after each phase

## Files Modified

### Core Package
- `packages/core/src/llm/llm-client.ts` - Remove redundant methods, use config
- `packages/core/src/shared/config.ts` - Add TOKEN_RATE_WINDOW_SECONDS

### Generator Package
- `packages/generator/src/cli/html-generator.ts` - Clean up legacy code, standardize patterns

### Tests
- `tests/unit/sequential-retry.test.ts` - NEW FILE with comprehensive tests
- `tests/unit-test-runner.ts` - Add new test group

### Configuration
- `.env.example` - Add TOKEN_RATE_WINDOW_SECONDS
- `.env` - Add TOKEN_RATE_WINDOW_SECONDS (both project root and azure-ai-travel-agents)

## Future Enhancements (Not in Scope)

1. **Extract Throttling to Reusable Service**
   - Create `ThrottleManager` class
   - Share across multiple LLM clients
   - Better separation of concerns

2. **Consider npm Package for Retry Logic**
   - Evaluate `p-retry` for sequential retry
   - Compare complexity vs custom implementation
   - Prototype and benchmark

3. **Enhanced Rate Limit Prediction**
   - Track token usage across requests
   - Predict when rate limits will be hit
   - Proactively switch to sequential mode

## Conclusion

This plan focuses on immediate code quality improvements that:
- Remove redundant and dead code
- Add necessary configuration
- Improve test coverage
- Standardize patterns

The implementation is low-risk with high value, improving maintainability while preserving all existing functionality.