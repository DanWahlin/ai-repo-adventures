# Tree-sitter Setup Script

## Quick Start

Run this command to automatically download and set up tree-sitter WASM files:

```bash
npm run setup:tree-sitter
```

## What It Does

The script will:

1. **Create directories**: Sets up `/public/tree-sitter/` directory
2. **Download WASM files**: Tries to download from GitHub releases first
3. **Fallback to npm**: If GitHub fails, installs npm packages and copies WASM files
4. **Verify installation**: Shows which languages were successfully installed
5. **Create test file**: Generates `public/tree-sitter/test.html` to verify in browser

## Supported Languages

- ✅ JavaScript
- ✅ TypeScript  
- ✅ Python
- ✅ Java
- ✅ C#

## Manual Installation

If the script fails for any language, you can manually download:

### Option 1: Direct Download
```bash
# Example for Python
curl -L -o public/tree-sitter/tree-sitter-python.wasm \
  https://github.com/tree-sitter/tree-sitter-python/releases/latest/download/tree-sitter-python.wasm
```

### Option 2: Build from Source
```bash
git clone https://github.com/tree-sitter/tree-sitter-python
cd tree-sitter-python
npm install
npx tree-sitter build-wasm
cp tree-sitter-python.wasm ../public/tree-sitter/
```

## Testing

After running the setup:

1. **Open test page**: `open public/tree-sitter/test.html`
2. **Check console**: Should show successful loading for each language
3. **Run tests**: `npm test` to verify integration

## Troubleshooting

- **404 errors**: Some repos might not have pre-built releases
- **npm failures**: Try running `npm install` first
- **Permission errors**: Make sure you have write access to `public/` directory

## Next Steps

Once WASM files are installed:

1. Uncomment the tree-sitter code in `src/analyzer/ProjectAnalyzer.ts`
2. Update the parser paths if needed
3. Run `npm test` to verify everything works