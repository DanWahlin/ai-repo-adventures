# Contributing to AI Repo Adventures

## 🚀 Automated Release Process

This project uses **Lerna** with **conventional commits** for automated versioning and publishing to npm.

## 📝 Commit Message Format

Use the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### **Types**
- **`feat`**: A new feature (triggers minor version bump)
- **`fix`**: A bug fix (triggers patch version bump)
- **`docs`**: Documentation only changes
- **`style`**: Changes that don't affect code meaning (formatting, etc.)
- **`refactor`**: Code changes that neither fix a bug nor add a feature
- **`perf`**: Performance improvements
- **`test`**: Adding missing tests or correcting existing tests
- **`chore`**: Changes to build process or auxiliary tools

### **Scopes (Optional)**
- **`generator`**: Changes to the HTML generator package
- **`mcp`**: Changes to the MCP server package
- **`core`**: Changes to the shared core package
- **`tests`**: Changes to the test suite

### **Breaking Changes**
Add `BREAKING CHANGE:` in the commit body or use `!` after type:
```
feat!: remove deprecated API
feat(generator)!: change CLI arguments format

BREAKING CHANGE: The old --theme argument is now --theme-name
```

## 📦 **Release Process**

### **Automatic Releases**
1. Push to `main` branch with conventional commit messages
2. GitHub Actions will:
   - Build and test all packages
   - Determine version bumps based on commit types
   - Create git tags and GitHub releases
   - Publish changed packages to npm

### **Manual Version Control**
```bash
# Check what packages have changed
npm run release:check

# Create versions manually (for testing)
npm run version:patch   # 1.0.0 → 1.0.1
npm run version:minor   # 1.0.0 → 1.1.0
npm run version:major   # 1.0.0 → 2.0.0

# Publish from git tags
npm run release:publish
```

## 🏷️ **Version Bumping Rules**

- **`fix:`** → patch version (1.0.0 → 1.0.1)
- **`feat:`** → minor version (1.0.0 → 1.1.0)
- **`BREAKING CHANGE:`** → major version (1.0.0 → 2.0.0)
- **`docs:`, `style:`, `refactor:`, `test:`, `chore:`** → no version bump

## 📋 **Example Commits**

```bash
# Bug fixes
git commit -m "fix(generator): resolve template loading issue"
git commit -m "fix(mcp): handle missing config file gracefully"

# New features  
git commit -m "feat(generator): add support for custom themes"
git commit -m "feat(mcp): implement progress tracking"

# Breaking changes
git commit -m "feat(generator)!: redesign CLI interface

BREAKING CHANGE: --output flag now requires absolute path"

# Non-releasing changes
git commit -m "docs: update README with monorepo info"
git commit -m "test: add unit tests for theme parser"
git commit -m "chore: update dependencies"
```

## 🔧 **Development Workflow**

1. Create feature branch: `git checkout -b feat/new-feature`
2. Make changes with conventional commits
3. Test locally: `npm run test:unit && npm run lint`
4. Create PR to `main`
5. After merge, automatic release will trigger

## 🚫 **What NOT to Do**

- Don't manually edit `package.json` versions
- Don't create git tags manually
- Don't use `npm publish` directly (use the automated process)
- Don't push directly to `main` without conventional commits