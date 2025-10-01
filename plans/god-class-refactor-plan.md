# God Class Refactoring Plan: html-generator.ts

## Executive Summary

**Original State:** `html-generator.ts` was a 2,003-line God class with 34 methods handling multiple responsibilities.

**Current State (After Phase 1 & 2):** `html-generator.ts` is now 1,203 lines (40% reduction)
- ✅ Phase 1 Complete: ContentProcessor extracted (~200 lines saved)
- ✅ Phase 2 Complete: DevServer, CLIInterface, ConfigurationManager extracted (~411 lines saved)

**Problem:** Violates Single Responsibility Principle (SRP), making the code:
- Difficult to test in isolation
- Hard to maintain and debug
- Challenging for new contributors to understand
- Prone to merge conflicts in team environments

**Goal:** Refactor into focused, single-responsibility classes following SOLID principles.

**Estimated Time:** 8-12 hours (5 hours completed, 3-7 hours remaining)
**Risk Level:** Medium-High (architectural changes, requires comprehensive testing)
**Progress:** 40% complete (Phases 1-2 done, Phases 3-4 remaining)

---

## 🎯 Refactoring Progress Tracker

### ✅ Phase 1: Extract Low-Risk Utilities (COMPLETED)
**Duration:** ~2 hours | **Risk:** Low | **Status:** ✅ DONE

- ✅ **Step 1.1:** ContentProcessor extracted to `processing/content-processor.ts`
  - Moved: `formatMarkdown()`, `formatInlineMarkdown()`, `highlightFilePathPrefixes()`, `addFileHyperlinksToHTML()`, `stripHTML()`
  - Added: `buildFunctionLineMap()`, `scanFileForFunctions()` (enhanced with project path and repo URL)
  - Lines saved: ~200
  - Tests: ✅ Build passing, 151/151 unit tests passing

- ✅ **Step 1.2 & 1.3:** AssetManager enhanced with CSS loading methods
  - Added: `loadThemeCSS()`, `loadBaseCSS()`, `loadAnimationsCSS()`, `loadCSSFile()`
  - Existing file updated, no new extractions needed
  - Tests: ✅ All passing

**Phase 1 Results:**
- Lines reduced: 2,003 → 1,614 (389 lines / 19% reduction)
- New files: 1 (`processing/content-processor.ts`)
- Test status: ✅ 151/151 unit tests passing

---

### ✅ Phase 2: Extract Medium-Risk Components (COMPLETED)
**Duration:** ~3 hours | **Risk:** Medium | **Status:** ✅ DONE

- ✅ **Step 2.1:** DevServer extracted to `server/dev-server.ts`
  - Moved: `startHttpServer()`, `openBrowser()`
  - Removed imports: `http`, `child_process.spawn`
  - Lines saved: ~140
  - Tests: ✅ Build passing

- ✅ **Step 2.2:** CLIInterface extracted to `cli/cli-interface.ts`
  - Moved: `prompt()`, `selectTheme()`, `createCustomTheme()`, `selectOutputDirectory()`, `printHeader()`, `printSuccessMessage()`
  - Removed imports: `readline`
  - Lines saved: ~190
  - Tests: ✅ All passing

- ✅ **Step 2.3:** ConfigurationManager extracted to `cli/configuration-manager.ts`
  - Moved: `configureTheme()`, `configureOutputDirectory()`, `configureOptions()`, `parseThemeArg()`, `setupOutputDirectories()`
  - Centralized configuration logic for both single-theme and multi-theme modes
  - Lines saved: ~80
  - Tests: ✅ All passing, manual integration test successful

**Phase 2 Results:**
- Lines reduced: 1,614 → 1,203 (411 lines / 25.5% reduction)
- New files: 3 (`server/dev-server.ts`, `cli/cli-interface.ts`, `cli/configuration-manager.ts`)
- Test status: ✅ 151/151 unit tests passing, integration test passing
- **Total reduction from original:** 800 lines (40%)

---

### 🔄 Phase 3: Extract Core Business Logic (IN PROGRESS)
**Duration:** ~4 hours | **Risk:** High | **Status:** 🔄 PENDING

- ⏳ **Step 3.1:** HTMLBuilder - Extract to `generation/html-builder.ts`
  - To move: `buildIndexHTML()`, `buildQuestHTML()`, `buildSummaryHTML()`, `getCommonTemplateVariables()`
  - Dependencies: ContentProcessor, TemplateEngine
  - Estimated lines: ~350

- ⏳ **Step 3.2:** ContentGenerator - Extract to `generation/content-generator.ts`
  - To move: `generateQuestPages()`, `generateQuestContentWithRetry()`, `generateKeyConcepts()`, `generateFallbackKeyConcepts()`
  - Dependencies: AdventureManager, LLMClient
  - Estimated lines: ~250

- ⏳ **Step 3.3:** RateLimitHandler - Extract to `orchestration/rate-limit-handler.ts`
  - To move: `handleTokenRateLimitAndRetry()`, `isTokenRateLimitError()`
  - Estimated lines: ~150

- ⏳ **Step 3.4:** ThemeOrchestrator - Extract to `orchestration/theme-orchestrator.ts`
  - To move: `generateAllThemes()`, `generateThemesInParallel()`, `generateThemesSequentially()`, `generateHomepageIndex()`
  - Dependencies: All other extracted components
  - Estimated lines: ~400

**Phase 3 Target:**
- Expected reduction: 1,203 → ~450 lines
- New files: 4
- Test validation required after each step

---

### 🔄 Phase 4: Refactor Main Orchestrator (IN PROGRESS)
**Duration:** ~2 hours | **Risk:** High | **Status:** 🔄 PENDING

- ⏳ **Step 4.1:** Simplify HTMLAdventureGenerator
  - Keep only: `start()`, `startWithArgs()`, `generateAdventure()`, `generateThemeCSS()`, `generateIndexHTML()`, `generateSummaryHTML()`
  - Inject all extracted classes as dependencies
  - Transform from God class to orchestrator
  - Target: <300 lines

- ⏳ **Step 4.2:** Update Tests
  - Update unit tests for each extracted class
  - Ensure integration tests still pass
  - Final validation

**Phase 4 Target:**
- Final size: <300 lines (85% reduction from original 2,003 lines)
- Architecture: Clean orchestrator with injected dependencies
- Full test coverage maintained

---

## Current Responsibilities Analysis

After analyzing the 2,003-line file, the `HTMLAdventureGenerator` class has **7 distinct responsibilities**:

### 1. **CLI Interaction & User Input** (8 methods, ~300 lines)
```
- start()
- startWithArgs()
- selectTheme()
- createCustomTheme()
- selectOutputDirectory()
- prompt()
- printHeader()
- printSuccessMessage()
```

### 2. **Configuration Management** (5 methods, ~150 lines)
```
- configureTheme()
- configureOutputDirectory()
- configureOptions()
- parseThemeArg()
- setupOutputDirectories()
```

### 3. **Content Generation (LLM)** (5 methods, ~400 lines)
```
- generateAdventure()
- generateQuestPages()
- generateQuestContentWithRetry()
- generateKeyConcepts()
- generateFallbackKeyConcepts()
```

### 4. **HTML Building & Templating** (6 methods, ~400 lines)
```
- generateIndexHTML()
- generateSummaryHTML()
- buildIndexHTML()
- buildQuestHTML()
- buildSummaryHTML()
- getCommonTemplateVariables()
```

### 5. **Content Processing & Formatting** (5 methods, ~300 lines)
```
- formatMarkdown()
- formatInlineMarkdown()
- highlightFilePathPrefixes()
- addFileHyperlinksToHTML()
- stripHTML()
```

### 6. **Multi-Theme Orchestration** (5 methods, ~600 lines)
```
- generateAllThemes()
- generateThemesInParallel()
- generateThemesSequentially()
- handleTokenRateLimitAndRetry()
- generateHomepageIndex()
```

### 7. **Asset & File System Operations** (6 methods, ~250 lines)
```
- generateThemeCSS()
- loadThemeCSS()
- loadBaseCSS()
- loadAnimationsCSS()
- loadCSSFile()
- saveLlmOutput()
- extractQuestInfo()
- buildFunctionLineMap()
- scanFileForFunctions()
```

### 8. **HTTP Server Management** (2 methods, ~150 lines)
```
- startHttpServer()
- openBrowser()
```

---

## Proposed Architecture

### New Class Structure

```
packages/generator/src/cli/
├── html-generator.ts (Orchestrator - 200-300 lines)
├── cli/
│   ├── cli-interface.ts (CLI & User Input)
│   └── configuration-manager.ts (Config parsing & validation)
├── generation/
│   ├── content-generator.ts (LLM content generation)
│   ├── html-builder.ts (HTML construction)
│   └── content-processor.ts (Markdown/HTML processing)
├── orchestration/
│   ├── theme-orchestrator.ts (Multi-theme generation)
│   └── rate-limit-handler.ts (Rate limit recovery)
├── assets/
│   ├── asset-loader.ts (CSS/file loading)
│   └── file-system-manager.ts (File operations)
└── server/
    └── dev-server.ts (HTTP server)
```

---

## Refactoring Steps

### Phase 1: Extract Low-Risk Utilities (2 hours)

**Step 1.1: Extract Content Processor**
- Create `content-processor.ts`
- Move: `formatMarkdown()`, `formatInlineMarkdown()`, `highlightFilePathPrefixes()`, `addFileHyperlinksToHTML()`, `stripHTML()`
- No external dependencies, pure functions
- **Risk: Low** - Pure functions, easy to test

**Step 1.2: Extract Asset Loader**
- Create `asset-loader.ts`
- Move: `loadThemeCSS()`, `loadBaseCSS()`, `loadAnimationsCSS()`, `loadCSSFile()`
- **Risk: Low** - File system operations only

**Step 1.3: Extract File System Manager**
- Create `file-system-manager.ts`
- Move: `saveLlmOutput()`, `buildFunctionLineMap()`, `scanFileForFunctions()`, `extractQuestInfo()`
- **Risk: Low** - Pure file system operations

### Phase 2: Extract Medium-Risk Components (3 hours)

**Step 2.1: Extract Dev Server**
- Create `dev-server.ts`
- Move: `startHttpServer()`, `openBrowser()`
- **Risk: Medium** - Separate process management

**Step 2.2: Extract CLI Interface**
- Create `cli-interface.ts`
- Move: `prompt()`, `selectTheme()`, `createCustomTheme()`, `selectOutputDirectory()`, `printHeader()`, `printSuccessMessage()`
- Dependencies: Asset loader, file system manager
- **Risk: Medium** - User interaction flow

**Step 2.3: Extract Configuration Manager**
- Create `configuration-manager.ts`
- Move: `configureTheme()`, `configureOutputDirectory()`, `configureOptions()`, `parseThemeArg()`, `setupOutputDirectories()`
- **Risk: Medium** - Configuration state management

### Phase 3: Extract Core Business Logic (4 hours)

**Step 3.1: Extract HTML Builder**
- Create `html-builder.ts`
- Move: `buildIndexHTML()`, `buildQuestHTML()`, `buildSummaryHTML()`, `getCommonTemplateVariables()`
- Dependencies: Content processor, template engine
- **Risk: Medium-High** - Core HTML generation

**Step 3.2: Extract Content Generator**
- Create `content-generator.ts`
- Move: `generateQuestPages()`, `generateQuestContentWithRetry()`, `generateKeyConcepts()`, `generateFallbackKeyConcepts()`
- Dependencies: Adventure manager, LLM client
- **Risk: High** - LLM integration and retry logic

**Step 3.3: Extract Rate Limit Handler**
- Create `rate-limit-handler.ts`
- Move: `handleTokenRateLimitAndRetry()`, `isTokenRateLimitError()`
- **Risk: Medium** - Error handling logic

**Step 3.4: Extract Theme Orchestrator**
- Create `theme-orchestrator.ts`
- Move: `generateAllThemes()`, `generateThemesInParallel()`, `generateThemesSequentially()`, `generateHomepageIndex()`
- Dependencies: Content generator, HTML builder, rate limit handler
- **Risk: High** - Complex parallel/sequential orchestration

### Phase 4: Refactor Main Orchestrator (2 hours)

**Step 4.1: Simplify HTMLAdventureGenerator**
- Keep only: `start()`, `startWithArgs()`, `generateAdventure()`, `generateThemeCSS()`, `generateIndexHTML()`, `generateSummaryHTML()`
- Inject all extracted classes as dependencies
- Transform from God class to orchestrator
- **Risk: High** - Integration point for all components

**Step 4.2: Update Tests**
- Update unit tests for each extracted class
- Ensure integration tests still pass
- **Risk: Medium** - Test maintenance

---

## Detailed Implementation: Phase 1, Step 1.1

### Extract Content Processor (Example)

**File: `packages/generator/src/cli/processing/content-processor.ts`**

```typescript
import { marked } from 'marked';

/**
 * Handles markdown and HTML content processing
 */
export class ContentProcessor {
  /**
   * Format inline markdown (bold, italic, code)
   */
  formatInlineMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  }

  /**
   * Convert markdown to HTML
   */
  formatMarkdown(content: string): string {
    try {
      return marked.parse(content) as string;
    } catch (error) {
      console.error('Error parsing markdown:', error);
      return content;
    }
  }

  /**
   * Highlight file path prefixes in HTML content
   */
  highlightFilePathPrefixes(htmlContent: string): string {
    const filePathPattern = /([a-zA-Z0-9_\-./]+\/[a-zA-Z0-9_\-.]+\.[a-z]{2,4})/g;
    return htmlContent.replace(filePathPattern, (match) => {
      const parts = match.split('/');
      if (parts.length > 1) {
        const prefix = parts.slice(0, -1).join('/');
        const filename = parts[parts.length - 1];
        return `<span class="file-path-prefix">${prefix}/</span>${filename}`;
      }
      return match;
    });
  }

  /**
   * Strip HTML tags from content
   */
  stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Add file hyperlinks to HTML content
   */
  addFileHyperlinksToHTML(
    htmlContent: string,
    functionLineMap: Map<string, { filePath: string; lineNumber: number }>,
    outputDir: string
  ): string {
    // Implementation from original method
    // ... (keep existing logic)
    return htmlContent;
  }
}
```

**Changes to `html-generator.ts`:**

```typescript
import { ContentProcessor } from './processing/content-processor.js';

class HTMLAdventureGenerator {
  private contentProcessor: ContentProcessor;

  constructor() {
    // ... existing constructor
    this.contentProcessor = new ContentProcessor();
  }

  // Remove: formatMarkdown(), formatInlineMarkdown(), highlightFilePathPrefixes(), stripHTML(), addFileHyperlinksToHTML()

  // Update calls:
  // OLD: this.formatMarkdown(content)
  // NEW: this.contentProcessor.formatMarkdown(content)
}
```

---

## Testing Strategy

### Unit Tests per Extracted Class
Each new class should have its own test file:

```
tests/unit/
├── content-processor.test.ts
├── asset-loader.test.ts
├── file-system-manager.test.ts
├── dev-server.test.ts
├── cli-interface.test.ts
├── configuration-manager.test.ts
├── html-builder.test.ts
├── content-generator.test.ts
├── rate-limit-handler.test.ts
└── theme-orchestrator.test.ts
```

### Integration Tests
- Keep existing integration tests
- Run after each phase
- Ensure no behavioral changes

### Testing Checkpoints
After each step:
1. ✅ Build: `npm run build`
2. ✅ Unit tests: `npm run test:unit`
3. ✅ Integration tests: `npm run test:integration`
4. ✅ Manual test: Generate a sample adventure

---

## Benefits of Refactoring

### Before (God Class)
```
❌ 2,003 lines in single file
❌ 34 methods handling 8 different concerns
❌ Difficult to test individual components
❌ High coupling between responsibilities
❌ Hard to understand for new contributors
```

### After (Target - Phases 3-4 Complete)
```
✅ Main orchestrator: ~200-300 lines
✅ 10 focused classes with single responsibilities
✅ Each class independently testable
✅ Low coupling, high cohesion
✅ Easy to extend and maintain
✅ Clear separation of concerns
```

### Current State (After Phases 1-2)
```
🎯 Main file: 1,203 lines (40% reduction achieved)
✅ 4 extracted classes with single responsibilities:
   - ContentProcessor (processing/content-processor.ts)
   - DevServer (server/dev-server.ts)
   - CLIInterface (cli/cli-interface.ts)
   - ConfigurationManager (cli/configuration-manager.ts)
✅ Each extracted class independently testable
✅ Reduced coupling for CLI, server, and configuration concerns
✅ All 151 unit tests passing
✅ Integration tests passing
```

---

## Migration Path

### Option A: Big Bang (NOT RECOMMENDED)
- Extract all classes at once
- High risk of breaking changes
- Difficult to debug issues

### Option B: Incremental (RECOMMENDED)
- Follow phases 1-4 in order
- Test thoroughly after each extraction
- Easy rollback if issues arise
- Lower risk, higher confidence

---

## Rollback Strategy

For each step:
1. Create feature branch: `refactor/extract-{component-name}`
2. Commit after extraction
3. Run full test suite
4. If tests fail:
   - Revert commit: `git reset --hard HEAD~1`
   - Analyze issue
   - Fix and retry
5. Merge to main only after all tests pass

---

## Success Criteria

- ✅ All TypeScript builds without errors
- ✅ 100% unit test pass rate (151/151 minimum)
- ✅ 100% integration test pass rate (14/14 minimum)
- ✅ No behavioral changes (functionality identical)
- ✅ Main class reduced to <300 lines
- ✅ Each extracted class <400 lines
- ✅ Clear single responsibility per class
- ✅ Improved test coverage for isolated components

---

## Open Questions

1. **Should we extract interfaces for dependency injection?**
   - Pro: Better testability, easier mocking
   - Con: More boilerplate

2. **Should we use composition or inheritance?**
   - Recommendation: Composition (has-a relationships)

3. **How should we handle shared state?**
   - Recommendation: Pass configuration objects, avoid mutable shared state

4. **Should we introduce a dependency injection container?**
   - Pro: Cleaner instantiation
   - Con: Additional complexity
   - Recommendation: Start simple, add if needed

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Choose migration strategy** (Option B recommended)
3. **Create feature branch**: `refactor/god-class-phase-1`
4. **Start with Phase 1, Step 1.1**: Extract ContentProcessor
5. **Test thoroughly** after each extraction
6. **Document learnings** as we go

---

## Estimated Timeline

| Phase | Duration | Risk | Priority |
|-------|----------|------|----------|
| Phase 1: Utilities | 2 hours | Low | High |
| Phase 2: Components | 3 hours | Medium | High |
| Phase 3: Business Logic | 4 hours | High | High |
| Phase 4: Integration | 2 hours | High | High |
| **Total** | **11 hours** | **Medium-High** | **High** |

---

## Lessons Learned (Phases 1-2)

### ✅ What Worked Well

1. **Incremental Approach**
   - Testing after each extraction caught issues immediately
   - Small, focused PRs would be easier to review
   - Low-risk utilities first built confidence for harder extractions

2. **Type Safety**
   - TypeScript caught interface mismatches during refactoring
   - Explicit type annotations (e.g., `logLlmOutputDir: string`) prevented literal type issues
   - IDE autocomplete made it easy to find all usage sites

3. **Dependency Injection Pattern**
   - Constructor injection made dependencies explicit
   - Easy to mock extracted classes for testing
   - Clear ownership of responsibilities

4. **Consistent Naming**
   - `cliInterface`, `configManager` naming pattern helped readability
   - Method names preserved from original (e.g., `startHttpServer` → `DevServer.start`)
   - Folder structure mirrors responsibility grouping

### ⚠️ Challenges Encountered

1. **Literal Type Constraints**
   - `as const` in constants creates literal types
   - Solution: Explicit type annotations when assigning to variables

2. **State Management**
   - Multi-theme generation creates new generator instances
   - Needed to access private fields with bracket notation: `themeGenerator['cliInterface']`
   - Future improvement: Make constructor accept configuration object

3. **Cleanup in Parallel Operations**
   - Had to update cleanup code in both parallel and sequential theme generation
   - Used try-catch to handle cleanup errors gracefully

### 💡 Key Insights for Remaining Phases

1. **Phase 3 Will Be More Complex**
   - HTML Builder and Content Generator are core business logic
   - More dependencies to manage (AdventureManager, LLMClient, TemplateEngine)
   - Consider creating interfaces for easier mocking

2. **Theme Orchestrator Needs Special Care**
   - Handles both parallel and sequential modes
   - Complex error recovery logic
   - May need to extract rate limit handling first to reduce coupling

3. **Final Orchestrator Should Be Thin**
   - Just wire up components and delegate
   - Minimal business logic
   - Clear entry points (`start`, `startWithArgs`)

---

## References

- Martin Fowler: Refactoring - Improving the Design of Existing Code
- SOLID Principles: Single Responsibility Principle
- Clean Code: Chapter 10 - Classes
- Actual implementation: `/packages/generator/src/cli/` (Phases 1-2 complete)
