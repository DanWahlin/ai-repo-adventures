# HTML Generator Refactor Plan

## Overview
This plan addresses quick wins (steps 1-4) from the code review to remove dead code, fix duplication, improve error handling, and extract magic numbers.

**Total Estimated Time:** 1 hour
**Risk Level:** Low (no architectural changes)

---

## Step 1: Remove Unused Imports and Variables (15 minutes)

### Objective
Remove confirmed dead code identified by TypeScript diagnostics and code review.

### Files to Modify
- `packages/generator/src/cli/html-generator.ts`

### Changes

#### 1.1 Remove Unused Imports (Lines 18, 21-23)
**Remove:**
- Line 18: `RateLimitInfo` from RateLimitError import (never used)
- Line 21: `AssetManager` import (shadowed by dynamic import at line 73)
- Line 22: `ThemeManager` import (never used)
- Line 23: `THEME_ICONS` import (duplicated locally, never used)

**Before:**
```typescript
import { LLMClient, RateLimitType, RateLimitError, RateLimitInfo } from '@codewithdan/ai-repo-adventures-core/llm';
// ...
import { AssetManager } from './asset-manager.js';
import { ThemeManager } from './theme-manager.js';
import { getAllThemes, getThemeByKey, parseAdventureConfig, LLM_MODEL, THEME_ICONS } from '@codewithdan/ai-repo-adventures-core/shared';
```

**After:**
```typescript
import { LLMClient, RateLimitType, RateLimitError } from '@codewithdan/ai-repo-adventures-core/llm';
// ...
import { getAllThemes, getThemeByKey, parseAdventureConfig, LLM_MODEL } from '@codewithdan/ai-repo-adventures-core/shared';
```

#### 1.2 Remove Unused Instance Variables (Lines 53-57)
**Remove:**
- Line 53: `forceSequential` (written but never read)
- Line 54: `tokenRateLimitEncountered` (written but never read)
- Line 56: `currentProcessingTheme` (written but never read)
- Line 57: `rateLimitWaitStartTime` (written but never read)

**Before:**
```typescript
private forceSequential: boolean = false;
private tokenRateLimitEncountered: boolean = false;
private completedThemes = new Set<string>();
private currentProcessingTheme?: string;
private rateLimitWaitStartTime?: number;
```

**After:**
```typescript
private completedThemes = new Set<string>();
```

#### 1.3 Remove Unused Local Variable (Line 953)
**Context:** In `buildSummaryHTML()` method around line 607

**Before:**
```typescript
const lastQuest = this.quests[this.quests.length - 1];
const questCount = this.quests.length;  // UNUSED
```

**After:**
```typescript
const lastQuest = this.quests[this.quests.length - 1];
```

#### 1.4 Remove Code That Referenced Deleted Variables
- Line 1037-1040: Remove `forceSequential` assignment in `generateAllThemes()`
- Line 1193: Remove `currentProcessingTheme` assignment in `generateThemesInParallel()`
- Line 1313: Remove `tokenRateLimitEncountered` assignment in `handleTokenRateLimitAndRetry()`

### Testing
1. Build: `npm run build`
2. Unit tests: `npm run test:unit`
3. Integration tests: `npm run test:integration`

### Success Criteria
- ✅ Build completes without errors
- ✅ All unit tests pass (151/151)
- ✅ All integration tests pass
- ✅ No TypeScript diagnostics for removed variables

---

## Step 2: Fix THEME_ICONS Duplication (10 minutes)

### Objective
Remove the duplicated THEME_ICONS constant and use the shared version.

### Files to Modify
- `packages/generator/src/cli/html-generator.ts`

### Changes

#### 2.1 Add THEME_ICONS Back to Import (Line ~23)
**Before:**
```typescript
import { getAllThemes, getThemeByKey, parseAdventureConfig, LLM_MODEL } from '@codewithdan/ai-repo-adventures-core/shared';
```

**After:**
```typescript
import { getAllThemes, getThemeByKey, parseAdventureConfig, LLM_MODEL, THEME_ICONS } from '@codewithdan/ai-repo-adventures-core/shared';
```

#### 2.2 Remove Local THEME_ICONS Definition (Around line 407)
**Remove the entire themeIcons constant definition in `getCommonTemplateVariables()`:**

**Before:**
```typescript
// Theme-appropriate emoticons (using safe emojis)
const themeIcons = {
  space: { theme: '🚀', quest: '⭐' },
  ancient: { theme: '🏛️', quest: '📜' },
  mythical: { theme: '🧙‍♂️', quest: '⚔️' },
  developer: { theme: '💻', quest: '📋' },
  custom: { theme: '🎨', quest: '⭐' }
};
const icons = themeIcons[this.selectedTheme] || themeIcons.space;
```

**After:**
```typescript
// Use shared THEME_ICONS from core package
const icons = THEME_ICONS[this.selectedTheme] || THEME_ICONS.space;
```

### Testing
1. Build: `npm run build`
2. Unit tests: `npm run test:unit`
3. Integration tests: `npm run test:integration`

### Success Criteria
- ✅ Build completes without errors
- ✅ All tests pass
- ✅ Theme icons still display correctly in generated HTML

---

## Step 3: Add Error Logging to scanFileForFunctions (15 minutes)

### Objective
Add error logging to `scanFileForFunctions()` method which currently silently swallows errors.

### Files to Modify
- `packages/generator/src/cli/html-generator.ts`

### Changes

#### 3.1 Add Error Logging (Around line 1029-1031)
**Location:** In the catch block of `scanFileForFunctions()` method

**Before:**
```typescript
} catch (error) {
  // Silently skip files that can't be read
}
```

**After:**
```typescript
} catch (error) {
  // Log warning but continue - file scanning is best-effort
  console.log(chalk.yellow(`⚠️  Warning: Could not scan ${relativePath} for functions`));
  if (error instanceof Error) {
    console.log(chalk.dim(`   Error: ${error.message}`));
  }
}
```

**Note:** Import `chalk` at the top if not already imported (should already be there)

### Testing
1. Build: `npm run build`
2. Unit tests: `npm run test:unit`
3. Integration tests: `npm run test:integration`

### Success Criteria
- ✅ Build completes without errors
- ✅ All tests pass
- ✅ Error messages display when scanning problematic files

---

## Step 4: Extract Magic Numbers to Constants (20 minutes)

### Objective
Replace magic numbers with named constants for better readability and maintainability.

### Files to Modify
- `packages/generator/src/cli/html-generator.ts`
- `packages/generator/src/cli/constants.ts`

### Changes

#### 4.1 Add New Constants to constants.ts
**Add these constants to the constants.ts file:**

```typescript
export const FUNCTION_SCANNING = {
  // Skip these keywords when scanning for function definitions
  SKIP_KEYWORDS: ['if', 'for', 'while', 'switch', 'catch', 'return', 'export', 'import', 'const', 'let', 'var', 'async', 'await'],
} as const;

export const HOMEPAGE = {
  // Number of files to preview when directory exists
  FILE_PREVIEW_LIMIT: 5,
} as const;

export const TEMPLATE = {
  // Maximum line length for code display
  MAX_LINE_LENGTH: 2000,
  // Maximum lines to read from files
  DEFAULT_READ_LIMIT: 2000,
} as const;
```

#### 4.2 Update Imports in html-generator.ts
**Add to imports:**
```typescript
import { RETRY_CONFIG, SERVER_CONFIG, DEFAULT_PATHS, PARSING_CONFIG, FUNCTION_SCANNING, HOMEPAGE, TEMPLATE } from './constants.js';
```

#### 4.3 Replace Magic Numbers

**Location 1: Line ~167 (selectOutputDirectory method)**
```typescript
// Before:
files.slice(0, 5).forEach(file => {
if (files.length > 5) {
  console.log(chalk.dim(`  ... and ${files.length - 5} more files`));

// After:
files.slice(0, HOMEPAGE.FILE_PREVIEW_LIMIT).forEach(file => {
if (files.length > HOMEPAGE.FILE_PREVIEW_LIMIT) {
  console.log(chalk.dim(`  ... and ${files.length - HOMEPAGE.FILE_PREVIEW_LIMIT} more files`));
```

**Location 2: Already done - PARSING_CONFIG.SKIP_KEYWORDS is used at line 947**
(No change needed - already using constant)

### Note on Other Magic Numbers
The code review found other magic numbers (1000ms delays, 60s timeouts, etc.) but these are already defined in RETRY_CONFIG and SERVER_CONFIG constants. No additional changes needed.

### Testing
1. Build: `npm run build`
2. Unit tests: `npm run test:unit`
3. Integration tests: `npm run test:integration`

### Success Criteria
- ✅ Build completes without errors
- ✅ All tests pass
- ✅ No new magic numbers introduced
- ✅ Constants are reusable and well-named

---

## Rollback Plan

If any step fails:
1. Use git to revert changes: `git checkout -- <file>`
2. Review error messages
3. Fix issues before proceeding
4. Re-run tests

## Notes

- Each step is independent and can be rolled back separately
- Always run full test suite between steps
- Stop and ask for guidance if unexpected issues arise
- Keep commits small and focused per step

## Success Metrics

- All TypeScript diagnostics for unused variables resolved
- Code duplication reduced
- Error handling improved
- Magic numbers eliminated
- 100% test pass rate maintained
