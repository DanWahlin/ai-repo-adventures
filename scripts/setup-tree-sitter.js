#!/usr/bin/env node

import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for supported languages
const LANGUAGES = [
  { name: 'javascript', repo: 'tree-sitter/tree-sitter-javascript', npmPackage: 'tree-sitter-javascript' },
  { name: 'typescript', repo: 'tree-sitter/tree-sitter-typescript', npmPackage: 'tree-sitter-typescript', npmPath: 'typescript/tree-sitter-typescript.wasm' },
  { name: 'python', repo: 'tree-sitter/tree-sitter-python', npmPackage: 'tree-sitter-python' },
  { name: 'java', repo: 'tree-sitter/tree-sitter-java', npmPackage: 'tree-sitter-java' },
  { name: 'csharp', repo: 'tree-sitter/tree-sitter-c-sharp', npmPackage: 'tree-sitter-c-sharp', fileName: 'tree-sitter-csharp.wasm' }
];

const TEST_CODE = {
  javascript: 'const x = 42;',
  typescript: 'const x: number = 42;',
  python: 'def hello(): pass',
  java: 'class Test { }',
  csharp: 'class Test { }'
};

// Configuration
const args = process.argv.slice(2);
const forceUpdate = args.includes('--force') || args.includes('-f');
const checkOnly = args.includes('--check') || args.includes('-c');
const outputDir = path.join(process.cwd(), 'public', 'tree-sitter');

// Helper functions
function getWasmFileName(lang) {
  return lang.fileName || `tree-sitter-${lang.name}.wasm`;
}

function getWasmPath(lang) {
  return path.join(outputDir, getWasmFileName(lang));
}

function ensureOutputDir() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ Created directory: ${outputDir}`);
  }
}

// Download function
async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

// Install language WASM file using multiple strategies
async function installLanguage(lang) {
  const dest = getWasmPath(lang);
  const wasmFile = getWasmFileName(lang);
  
  // Strategy 1: GitHub releases
  try {
    const url = `https://github.com/${lang.repo}/releases/latest/download/${wasmFile}`;
    await downloadFile(url, dest);
    return { success: true, source: 'GitHub' };
  } catch (error) {
    // Strategy 2: npm package
    try {
      execSync(`npm install ${lang.npmPackage}`, { stdio: 'ignore' });
      
      const possiblePaths = [
        path.join('node_modules', lang.npmPackage, wasmFile),
        path.join('node_modules', lang.npmPackage, lang.npmPath || wasmFile),
        path.join('node_modules', lang.npmPackage, 'build', wasmFile)
      ];
      
      for (const srcPath of possiblePaths) {
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, dest);
          return { success: true, source: 'npm' };
        }
      }
      return { success: false, error: 'WASM file not found in package' };
    } catch (npmError) {
      return { success: false, error: error.message };
    }
  }
}

// Check if WASM file exists
function checkExistingFile(lang) {
  const filePath = getWasmPath(lang);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    return { exists: true, size: stats.size, modified: stats.mtime };
  }
  return { exists: false };
}

// Process all languages
async function processLanguages() {
  const results = [];
  
  for (const lang of LANGUAGES) {
    const existing = checkExistingFile(lang);
    
    if (existing.exists && !forceUpdate) {
      console.log(`✓ ${lang.name} already installed (${(existing.size / 1024).toFixed(1)} KB)`);
      results.push({ lang: lang.name, status: 'skipped', size: existing.size });
      continue;
    }
    
    console.log(`⬇️  Installing ${lang.name}...`);
    const result = await installLanguage(lang);
    
    if (result.success) {
      const stats = fs.statSync(getWasmPath(lang));
      console.log(`✅ ${lang.name} installed from ${result.source} (${(stats.size / 1024).toFixed(1)} KB)`);
      results.push({ lang: lang.name, status: existing.exists ? 'updated' : 'installed', size: stats.size });
    } else {
      console.log(`❌ ${lang.name} failed: ${result.error}`);
      results.push({ lang: lang.name, status: 'failed' });
    }
  }
  
  return results;
}

// Print summary
function printSummary(results) {
  const successful = results.filter(r => r.status === 'installed' || r.status === 'updated' || r.status === 'skipped');
  const failed = results.filter(r => r.status === 'failed');
  
  console.log(`\n📊 Summary: ${successful.length}/${LANGUAGES.length} languages ready`);
  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.map(r => r.lang).join(', ')}`);
  }
}

// Main setup function
async function setupTreeSitter() {
  if (checkOnly) {
    checkExistingFiles();
    return;
  }

  ensureOutputDir();
  console.log('🌳 Setting up Tree-sitter WASM files...');
  
  const results = await processLanguages();
  printSummary(results);
  createTestFile();
  
  console.log(`\n✅ Setup complete! Files in: ${outputDir}`);
}

// Create test HTML file
function createTestFile() {
  const languages = LANGUAGES.map(l => ({
    name: l.name,
    file: getWasmFileName(l),
    testCode: TEST_CODE[l.name]
  }));
  
  const testHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Tree-sitter WASM Test</title>
  <script src="https://unpkg.com/web-tree-sitter/tree-sitter.js"></script>
</head>
<body>
  <h1>Tree-sitter WASM Test</h1>
  <div id="results"></div>
  <script>
    async function testTreeSitter() {
      const results = document.getElementById('results');
      try {
        await TreeSitter.init();
        results.innerHTML = '<p>✅ Tree-sitter initialized</p>';
        
        const languages = ${JSON.stringify(languages)};
        for (const lang of languages) {
          try {
            const parser = new TreeSitter();
            const Language = await TreeSitter.Language.load('/tree-sitter/' + lang.file);
            parser.setLanguage(Language);
            const tree = parser.parse(lang.testCode);
            results.innerHTML += '<p>✅ ' + lang.name + ' loaded</p>';
          } catch (error) {
            results.innerHTML += '<p>❌ ' + lang.name + ' failed: ' + error.message + '</p>';
          }
        }
      } catch (error) {
        results.innerHTML = '<p>❌ Failed to initialize: ' + error.message + '</p>';
      }
    }
    testTreeSitter();
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(outputDir, 'test.html'), testHtml);
}

// Check status of installed files
function checkExistingFiles() {
  console.log('🔍 Tree-sitter WASM files status:\n');
  
  const installed = [];
  const missing = [];
  
  for (const lang of LANGUAGES) {
    const info = checkExistingFile(lang);
    if (info.exists) {
      console.log(`✅ ${lang.name}: ${(info.size / 1024).toFixed(1)} KB`);
      installed.push(info.size);
    } else {
      console.log(`❌ ${lang.name}: missing`);
      missing.push(lang.name);
    }
  }
  
  const totalSize = installed.reduce((sum, size) => sum + size, 0);
  console.log(`\n📊 ${installed.length}/${LANGUAGES.length} installed, ${(totalSize / 1024 / 1024).toFixed(1)} MB total`);
  
  if (missing.length > 0) {
    console.log(`💡 Run "npm run setup:tree-sitter" to install missing files`);
  }
}

// Show help
function showHelp() {
  console.log(`🌳 Tree-sitter WASM Setup

Usage: npm run setup:tree-sitter [options]

Options:
  --force, -f    Update all WASM files
  --check, -c    Check installation status
  --help, -h     Show this help

Supported languages: ${LANGUAGES.map(l => l.name).join(', ')}`);
}

// Parse help flag
if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Run setup
setupTreeSitter().catch(error => {
  console.error('💥 Setup failed:', error);
  process.exit(1);
});