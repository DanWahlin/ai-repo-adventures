# Tree-sitter Integration Guide

## Current Status

The codebase is **ready for tree-sitter integration** but currently uses regex fallbacks until WASM files are added.

### What's Already Implemented

✅ **Parser Management**: `ProjectAnalyzer` maintains a parser cache and cleanup system  
✅ **Graceful Fallbacks**: Automatically falls back to regex analysis when tree-sitter is unavailable  
✅ **Integration Points**: All the hooks are in place in the analysis pipeline  
✅ **Language Support**: Focused on TypeScript, JavaScript, C#, Python, Java  

### What Needs to be Added

📦 **WASM Files**: Add language-specific WASM files to `/public/tree-sitter/` or similar  
🔧 **Parser Loading**: Uncomment and configure the parser initialization code  
🌳 **AST Traversal**: Implement the `extractFromTreeSitterAST()` method  

## How to Add Tree-sitter Support

### 1. Install WASM Files

```bash
# Example for supported languages
mkdir -p public/tree-sitter
cd public/tree-sitter

# Download language WASM files
wget https://github.com/tree-sitter/tree-sitter-javascript/releases/latest/download/tree-sitter-javascript.wasm
wget https://github.com/tree-sitter/tree-sitter-typescript/releases/latest/download/tree-sitter-typescript.wasm  
wget https://github.com/tree-sitter/tree-sitter-python/releases/latest/download/tree-sitter-python.wasm
wget https://github.com/tree-sitter/tree-sitter-java/releases/latest/download/tree-sitter-java.wasm
wget https://github.com/tree-sitter/tree-sitter-c-sharp/releases/latest/download/tree-sitter-c-sharp.wasm
```

### 2. Update Parser Loading

In `src/analyzer/ProjectAnalyzer.ts:558-577`, uncomment and update:

```typescript
private async getTreeSitterParser(language: string): Promise<any | null> {
  if (this.treeSitterParsers.has(language)) {
    return this.treeSitterParsers.get(language);
  }

  try {
    const Parser = await import('web-tree-sitter');
    await Parser.init();
    const parser = new Parser();
    
    const wasmPath = `/tree-sitter/tree-sitter-${language}.wasm`;
    const LanguageWasm = await Parser.Language.load(wasmPath);
    parser.setLanguage(LanguageWasm);
    
    this.treeSitterParsers.set(language, parser);
    return parser;
  } catch (error) {
    console.warn(`Failed to load tree-sitter parser for ${language}:`, error);
    return null;
  }
}
```

### 3. Implement AST Traversal

In `src/analyzer/ProjectAnalyzer.ts:587-603`, implement:

```typescript
private extractFromTreeSitterAST(rootNode: any, fileName: string, language: string): {functions: FunctionInfo[], classes: ClassInfo[]} {
  const functions: FunctionInfo[] = [];
  const classes: ClassInfo[] = [];

  const cursor = rootNode.walk();
  
  const traverse = (node: any) => {
    // Extract functions based on language
    if (this.isFunctionNode(node, language)) {
      functions.push(this.extractFunctionInfo(node, fileName));
    }
    
    // Extract classes based on language  
    if (this.isClassNode(node, language)) {
      classes.push(this.extractClassInfo(node, fileName));
    }
    
    // Traverse children
    for (let i = 0; i < node.childCount; i++) {
      traverse(node.child(i));
    }
  };
  
  traverse(rootNode);
  return { functions, classes };
}
```

### 4. Benefits When Implemented

🎯 **Accurate Parsing**: True AST parsing instead of regex patterns  
🚀 **Better Analysis**: Understand code structure, scope, and relationships  
🔍 **Multi-language**: Consistent parsing across TypeScript, Python, Java, C#  
🛡️ **Robust**: Handle edge cases that regex patterns miss  

## Testing

Once implemented, the existing test suite will automatically use tree-sitter:
- `npm run test:simple` - Basic functionality  
- `npm run test:real-world` - Comprehensive workflow testing  
- `npm run test:interactive` - Manual testing interface  

The system will gracefully fall back to regex if tree-sitter fails, ensuring reliability.