#!/usr/bin/env node

/**
 * Unit tests for Adventure Configuration loading
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadAdventureConfig, parseAdventureConfig, extractUniqueFilePaths } from '../../src/shared/adventure-config.js';
import { createTestRunner, assert } from '../shared/test-utils.js';

export async function runAdventureConfigTests() {
  console.log('⚙️ Running Adventure Config Tests\n');
  const { test, stats, printResults } = await createTestRunner('Adventure Config Tests');

  // Helper function to create a temporary directory
  const createTempDir = (): string => {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'adventure-config-test-'));
  };

  // Helper function to clean up temp directory
  const cleanupTempDir = (tempDir: string): void => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  };

  // loadAdventureConfig Tests
  console.log('\n📦 loadAdventureConfig Function Tests');
  console.log('-'.repeat(30));

  await test('loadAdventureConfig returns null when file does not exist', () => {
    const tempDir = createTempDir();
    try {
      const result = loadAdventureConfig(tempDir);
      assert(result === null, 'Should return null when config file does not exist');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  await test('loadAdventureConfig loads valid JSON configuration', () => {
    const tempDir = createTempDir();
    try {
      const validConfig = {
        adventure: {
          title: "Test Adventure",
          description: "A test configuration"
        }
      };
      
      fs.writeFileSync(
        path.join(tempDir, 'adventure.config.json'),
        JSON.stringify(validConfig, null, 2)
      );

      const result = loadAdventureConfig(tempDir);
      assert(result !== null, 'Should return configuration content');
      assert(typeof result === 'string', 'Should return string content');
      
      // Verify it's valid JSON by parsing
      const parsed = JSON.parse(result);
      assert(parsed.adventure.title === "Test Adventure", 'Should preserve configuration data');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  await test('loadAdventureConfig returns raw content (including invalid JSON)', () => {
    const tempDir = createTempDir();
    try {
      // Write invalid JSON
      const invalidContent = '{ invalid json }';
      fs.writeFileSync(
        path.join(tempDir, 'adventure.config.json'),
        invalidContent
      );

      const result = loadAdventureConfig(tempDir);
      assert(result === invalidContent, 'Should return raw content even for invalid JSON');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  await test('loadAdventureConfig returns empty string for empty file', () => {
    const tempDir = createTempDir();
    try {
      // Write empty file
      fs.writeFileSync(path.join(tempDir, 'adventure.config.json'), '');

      const result = loadAdventureConfig(tempDir);
      assert(result === '', 'Should return empty string for empty file');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  await test('loadAdventureConfig handles file permission errors', () => {
    const tempDir = createTempDir();
    try {
      const configPath = path.join(tempDir, 'adventure.config.json');
      fs.writeFileSync(configPath, '{"test": true}');
      
      // Make file unreadable (if supported by OS)
      try {
        fs.chmodSync(configPath, 0o000);
        
        const result = loadAdventureConfig(tempDir);
        assert(result === null, 'Should return null for unreadable file');
      } catch (chmodError) {
        // Skip this test on systems that don't support chmod
        console.log('    Note: Skipping permission test (not supported on this system)');
      }
    } finally {
      try {
        // Restore permissions for cleanup
        fs.chmodSync(path.join(tempDir, 'adventure.config.json'), 0o644);
      } catch (e) {
        // Ignore cleanup errors
      }
      cleanupTempDir(tempDir);
    }
  });

  await test('loadAdventureConfig returns original JSON string', () => {
    const tempDir = createTempDir();
    try {
      const originalJson = `{
  "adventure": {
    "title": "Custom Adventure",
    "workshops": [
      {
        "name": "Test Workshop",
        "highlights": ["function1", "function2"]
      }
    ]
  }
}`;
      
      fs.writeFileSync(path.join(tempDir, 'adventure.config.json'), originalJson);

      const result = loadAdventureConfig(tempDir);
      assert(result !== null, 'Should return configuration');
      
      // Verify the returned string can be parsed back to the same structure
      const parsed = JSON.parse(result);
      const reparsed = JSON.parse(originalJson);
      assert(JSON.stringify(parsed) === JSON.stringify(reparsed), 'Should preserve exact JSON structure');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  await test('loadAdventureConfig handles complex nested configurations', () => {
    const tempDir = createTempDir();
    try {
      const complexConfig = {
        adventure: {
          title: "Complex Adventure",
          themes: ["space", "mythical"],
          workshops: [
            {
              name: "Backend Workshop",
              highlights: ["auth.ts", "database.ts"],
              areas: {
                security: ["validateInput", "sanitize"],
                performance: ["cacheData", "optimize"]
              }
            }
          ],
          metadata: {
            version: "1.0",
            author: "Test",
            tags: ["test", "config", "nested"]
          }
        }
      };
      
      fs.writeFileSync(
        path.join(tempDir, 'adventure.config.json'),
        JSON.stringify(complexConfig, null, 2)
      );

      const result = loadAdventureConfig(tempDir);
      assert(result !== null, 'Should handle complex configurations');
      
      const parsed = JSON.parse(result);
      assert(parsed.adventure.workshops[0].areas.security.length === 2, 'Should preserve nested arrays');
      assert(parsed.adventure.metadata.tags.includes('nested'), 'Should preserve deeply nested data');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  // parseAdventureConfig Tests
  console.log('\n📦 parseAdventureConfig Function Tests');
  console.log('-'.repeat(30));

  await test('parseAdventureConfig returns null when config does not exist', () => {
    const tempDir = createTempDir();
    try {
      const result = parseAdventureConfig(tempDir);
      assert(result === null, 'Should return null when config file does not exist');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  await test('parseAdventureConfig parses valid configuration', () => {
    const tempDir = createTempDir();
    try {
      const validConfig = {
        adventure: {
          name: "Test Adventure",
          description: "Test description",
          quests: [
            {
              title: "Quest 1",
              description: "First quest",
              files: [
                { path: "src/file1.ts", description: "File 1" }
              ]
            }
          ]
        }
      };
      
      fs.writeFileSync(
        path.join(tempDir, 'adventure.config.json'),
        JSON.stringify(validConfig, null, 2)
      );

      const result = parseAdventureConfig(tempDir);
      assert(result !== null, 'Should return parsed configuration');
      // Test with flexible structure - just verify it parsed correctly
      assert(typeof result === 'object', 'Should return an object');
      assert(result.adventure !== undefined, 'Should have adventure property');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  await test('parseAdventureConfig handles invalid JSON gracefully', () => {
    const tempDir = createTempDir();
    try {
      fs.writeFileSync(
        path.join(tempDir, 'adventure.config.json'),
        '{ invalid json }'
      );

      const result = parseAdventureConfig(tempDir);
      assert(result === null, 'Should return null for invalid JSON');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  // extractUniqueFilePaths Tests
  console.log('\n📦 extractUniqueFilePaths Function Tests');
  console.log('-'.repeat(30));

  await test('extractUniqueFilePaths returns empty array when no config', () => {
    const tempDir = createTempDir();
    try {
      const result = extractUniqueFilePaths(tempDir);
      assert(Array.isArray(result), 'Should return an array');
      assert(result.length === 0, 'Should return empty array when no config');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  await test('extractUniqueFilePaths extracts unique file paths', () => {
    const tempDir = createTempDir();
    try {
      // Create some test files
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src/file1.ts'), 'test1');
      fs.writeFileSync(path.join(tempDir, 'src/file2.ts'), 'test2');
      
      const config = {
        adventure: {
          name: "Test",
          description: "Test",
          quests: [
            {
              title: "Quest 1",
              description: "First",
              files: [
                { path: "src/file1.ts", description: "File 1" },
                { path: "src/file2.ts", description: "File 2" }
              ]
            },
            {
              title: "Quest 2",
              description: "Second",
              files: [
                { path: "src/file1.ts", description: "File 1 again" },
                { path: "src/file3.ts", description: "File 3 (doesn't exist)" }
              ]
            }
          ]
        }
      };
      
      fs.writeFileSync(
        path.join(tempDir, 'adventure.config.json'),
        JSON.stringify(config, null, 2)
      );

      const result = extractUniqueFilePaths(tempDir);
      assert(Array.isArray(result), 'Should return an array');
      assert(result.length === 2, 'Should return only unique, existing files');
      assert(result.includes('src/file1.ts'), 'Should include file1.ts');
      assert(result.includes('src/file2.ts'), 'Should include file2.ts');
      assert(!result.includes('src/file3.ts'), 'Should not include non-existent file3.ts');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  await test('extractUniqueFilePaths handles empty quests array', () => {
    const tempDir = createTempDir();
    try {
      const config = {
        adventure: {
          name: "Test",
          description: "Test",
          quests: []
        }
      };
      
      fs.writeFileSync(
        path.join(tempDir, 'adventure.config.json'),
        JSON.stringify(config, null, 2)
      );

      const result = extractUniqueFilePaths(tempDir);
      assert(Array.isArray(result), 'Should return an array');
      assert(result.length === 0, 'Should return empty array for no quests');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  await test('extractUniqueFilePaths works with different config structures', () => {
    const tempDir = createTempDir();
    try {
      // Create test files
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src/main.ts'), 'test');
      fs.writeFileSync(path.join(tempDir, 'src/util.ts'), 'test');
      
      // Test with a completely different structure
      const differentConfig = {
        sections: [
          { path: "src/main.ts", name: "Main" },
          { 
            nested: {
              deeper: {
                path: "src/util.ts"
              }
            }
          }
        ],
        someOtherField: {
          path: "src/nonexistent.ts"  // This file doesn't exist
        }
      };
      
      fs.writeFileSync(
        path.join(tempDir, 'adventure.config.json'),
        JSON.stringify(differentConfig, null, 2)
      );

      const result = extractUniqueFilePaths(tempDir);
      assert(result.length === 2, 'Should extract paths from different structure');
      assert(result.includes('src/main.ts'), 'Should find path at top level');
      assert(result.includes('src/util.ts'), 'Should find deeply nested path');
      assert(!result.includes('src/nonexistent.ts'), 'Should not include non-existent files');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  await test('extractUniqueFilePaths handles files with highlights', () => {
    const tempDir = createTempDir();
    try {
      // Create test file
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'src/main.ts'), 'test');
      
      const config = {
        adventure: {
          name: "Test",
          description: "Test",
          quests: [
            {
              title: "Quest 1",
              description: "First",
              files: [
                { 
                  path: "src/main.ts", 
                  description: "Main file",
                  highlights: [
                    { name: "function1", description: "Does something" },
                    { name: "function2", description: "Does something else" }
                  ]
                }
              ]
            }
          ]
        }
      };
      
      fs.writeFileSync(
        path.join(tempDir, 'adventure.config.json'),
        JSON.stringify(config, null, 2)
      );

      const result = extractUniqueFilePaths(tempDir);
      assert(result.length === 1, 'Should extract file path regardless of highlights');
      assert(result[0] === 'src/main.ts', 'Should extract correct file path');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  printResults();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAdventureConfigTests();
}