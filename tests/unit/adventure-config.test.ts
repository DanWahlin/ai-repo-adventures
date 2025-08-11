#!/usr/bin/env node

/**
 * Unit tests for Adventure Configuration loading
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadAdventureConfig } from '../../src/shared/adventure-config.js';
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

  await test('loadAdventureConfig handles invalid JSON gracefully', () => {
    const tempDir = createTempDir();
    try {
      // Write invalid JSON
      fs.writeFileSync(
        path.join(tempDir, 'adventure.config.json'),
        '{ invalid json }'
      );

      const result = loadAdventureConfig(tempDir);
      assert(result === null, 'Should return null for invalid JSON');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  await test('loadAdventureConfig handles empty file', () => {
    const tempDir = createTempDir();
    try {
      // Write empty file
      fs.writeFileSync(path.join(tempDir, 'adventure.config.json'), '');

      const result = loadAdventureConfig(tempDir);
      assert(result === null, 'Should return null for empty file');
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

  printResults();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAdventureConfigTests();
}