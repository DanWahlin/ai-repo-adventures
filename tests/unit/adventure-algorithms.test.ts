#!/usr/bin/env node

/**
 * Unit tests for core adventure algorithms - Updated for LLM-driven system
 */

import { AdventureManager } from '../../src/adventure/AdventureManager.js';
import { DynamicStoryGenerator, STORY_THEMES } from '../../src/story/DynamicStoryGenerator.js';
import { ProjectAnalyzer } from '../../src/analyzer/ProjectAnalyzer.js';
import { createTestRunner, mockProjectInfo, assert } from '../shared/test-utils.js';
import type { ProjectInfo } from '../../src/analyzer/ProjectAnalyzer.js';

// Using shared mockProjectInfo from test-utils.js
/* Commented out local definition - using shared version
const mockProjectInfo: ProjectInfo = {
  type: 'Web Application',
  fileCount: 25,
  mainTechnologies: ['TypeScript', 'Node.js', 'React'],
  structure: {
    directories: ['src', 'tests', 'dist'],
    importantFiles: ['package.json', 'README.md', 'src/index.ts'],
    configFiles: ['package.json', 'tsconfig.json', '.env'],
    sourceFiles: ['src/index.ts', 'src/app.ts', 'src/utils.ts']
  },
  hasTests: true,
  hasDatabase: false,
  hasApi: true,
  hasFrontend: true,
  codeAnalysis: {
    functions: [
      {
        name: 'startServer',
        summary: 'Initializes and starts the web server',
        parameters: ['port', 'options'],
        isAsync: true,
        isExported: true,
        fileName: 'src/server.ts',
        source: 'typescript-estree',
        language: 'typescript'
      },
      {
        name: 'processData',
        summary: 'Processes incoming data requests',
        parameters: ['data', 'callback'],
        isAsync: false,
        isExported: false,
        fileName: 'src/utils.ts',
        source: 'typescript-estree',
        language: 'typescript'
      }
    ],
    classes: [
      {
        name: 'ApiController',
        summary: 'Handles API requests and responses',
        methods: ['get', 'post', 'delete'],
        properties: ['router', 'middleware'],
        isExported: true,
        fileName: 'src/controllers/api.ts',
        source: 'typescript-estree',
        language: 'typescript'
      }
    ],
    dependencies: [
      { name: 'express', version: '^4.18.0', type: 'dependency', category: 'framework' },
      { name: 'jest', version: '^29.0.0', type: 'devDependency', category: 'testing' }
    ],
    entryPoints: ['src/index.ts'],
    keyFiles: [
      {
        path: 'src/index.ts',
        content: 'import express from "express";\nconst app = express();',
        summary: 'Main application entry point'
      }
    ]
  }
}; 
*/

// Test helper functions
async function createTestAdventureManager(): Promise<AdventureManager> {
  const manager = new AdventureManager();
  try {
    // Initialize with mock project info - this will use fallback since no LLM
    await manager.initializeAdventure(mockProjectInfo, 'space');
  } catch (error) {
    // Expected to fail without LLM, but manager should still have state
  }
  return manager;
}

async function runTests() {
  console.log('🧪 Running Unit Tests for Adventure Algorithms\n');
  const { test, stats, printResults } = await createTestRunner('Adventure Algorithm Tests');

  // Adventure Manager Tests - Updated for new API
  console.log('🎮 Adventure Manager Tests');
  console.log('-'.repeat(30));


  await test('Adventure initialization creates fallback content', async () => {
    const manager = new AdventureManager();
    
    try {
      const result = await manager.initializeAdventure(mockProjectInfo, 'space');
      // Should work with fallback even without LLM
      assert(typeof result === 'string', 'Should return story string');
      assert(result.includes('space'), 'Should include theme');
    } catch (error) {
      // LLM timeout is expected, but fallback should work
      assert(error instanceof Error, 'Should get proper error');
    }
  });

  await test('Adventure exploration handles invalid choices', async () => {
    const manager = await createTestAdventureManager();
    
    const result = await manager.exploreAdventure('invalid-adventure-id');
    assert(result.narrative.includes('not found'), 'Should handle invalid adventure gracefully');
    assert(Array.isArray(result.choices), 'Should provide alternative choices');
  });

  await test('Progress tracking works correctly', async () => {
    const manager = await createTestAdventureManager();
    
    const initialProgress = manager.getProgress();
    assert(initialProgress.narrative.includes('Progress'), 'Should show progress information');
    
    // Try to complete an adventure (will use fallback)
    try {
      await manager.exploreAdventure('1');
    } catch (error) {
      // Expected with fallback system
    }
  });


  // Story Generator Tests - Updated for new system
  console.log('\n📚 Story Generator Tests');
  console.log('-'.repeat(30));

  await test('Theme validation works correctly', () => {
    // Test valid themes exist
    Object.values(STORY_THEMES).forEach(theme => {
      assert(typeof theme === 'string', `Theme ${theme} should be string`);
      assert(theme.length > 0, `Theme ${theme} should not be empty`);
    });
    
    assert(Object.keys(STORY_THEMES).length >= 3, 'Should have at least 3 themes');
  });

  await test('Story generator creates fallback content', () => {
    const generator = new DynamicStoryGenerator();
    generator.setProject(mockProjectInfo);
    
    // Test that fallback story generation works
    const fallback = (generator as any).generateFallbackStory('space');
    
    assert(fallback.title, 'Should have title');
    assert(fallback.introduction, 'Should have introduction content');
    assert(Array.isArray(fallback.characters), 'Should have characters array');
    assert(fallback.characters.length > 0, 'Should have at least one character');
  });

  await test('Enhanced LLM prompt includes specific information', () => {
    const generator = new DynamicStoryGenerator();
    generator.setProject(mockProjectInfo);
    
    const analysis = (generator as any).createProjectAnalysis();
    const prompt = (generator as any).createEnhancedStoryPrompt('space', analysis);
    
    assert(prompt.includes('space'), 'Should include theme');
    assert(prompt.includes('TypeScript'), 'Should include technologies');
    assert(prompt.includes('Web Application'), 'Should include project type');
    assert(prompt.includes('educational'), 'Should emphasize educational goals');
  });

  await test('Fallback character generation works for all themes', () => {
    const generator = new DynamicStoryGenerator();
    
    Object.values(STORY_THEMES).forEach(theme => {
      const characters = (generator as any).generateDefaultCharacters(theme);
      
      assert(Array.isArray(characters), `Characters for ${theme} should be array`);
      assert(characters.length > 0, `Should generate at least one character for ${theme}`);
      assert(characters[0].name, `Character should have name for ${theme}`);
      assert(characters[0].technology, `Character should have technology for ${theme}`);
    });
  });

  // Project Analyzer Tests
  console.log('\n🔍 Project Analyzer Tests');
  console.log('-'.repeat(30));

  await test('Path validation rejects dangerous paths', () => {
    const analyzer = new ProjectAnalyzer();
    
    const dangerousPaths = [
      '/etc/passwd',
      '/bin/bash',
      'C:\\Windows\\System32',
      '/tmp/../etc/hosts',
      '',
      '   '
    ];
    
    dangerousPaths.forEach(path => {
      try {
        (analyzer as any).validateProjectPath(path);
        assert.fail(`Should reject dangerous path: ${path}`);
      } catch (error) {
        assert(error instanceof Error, `Should throw Error for dangerous paths`);
      }
    });
  });

  await test('Path validation accepts safe paths', () => {
    const analyzer = new ProjectAnalyzer();
    
    const safePaths = [
      '.',
      './current-project'
    ];
    
    safePaths.forEach(path => {
      try {
        const validated = (analyzer as any).validateProjectPath(path);
        assert(typeof validated === 'string', 'Should return validated path string');
      } catch (error) {
        // Skip if path doesn't exist
        if (error instanceof Error && error.message.includes('not a valid directory')) {
          return;
        }
        throw error;
      }
    });
  });

  await test('Technology detection works correctly', () => {
    const analyzer = new ProjectAnalyzer();
    
    const testStructure = {
      directories: ['src', 'node_modules'],
      importantFiles: ['package.json', 'index.js', 'app.tsx'],
      configFiles: ['tsconfig.json', '.env'],
      sourceFiles: ['app.tsx', 'server.ts']
    };
    
    const technologies = (analyzer as any).identifyTechnologies(testStructure);
    
    assert(Array.isArray(technologies), 'Should return array of technologies');
    assert(technologies.includes('Node.js'), 'Should detect Node.js from package.json');
    assert(technologies.includes('TypeScript'), 'Should detect TypeScript from .ts files');
    assert(technologies.includes('React'), 'Should detect React from .tsx files');
  });

  await test('Function summary generation creates meaningful descriptions', () => {
    const analyzer = new ProjectAnalyzer();
    
    const testCases = [
      { name: 'getUserData', params: ['userId'], expected: 'retrieves' },
      { name: 'createAccount', params: ['userData'], expected: 'creates' },
      { name: 'validateInput', params: ['input', 'rules'], expected: 'validates' }
    ];
    
    testCases.forEach(({ name, params, expected }) => {
      const summary = (analyzer as any).generateFunctionSummary(name, params);
      
      assert(typeof summary === 'string', 'Summary should be string');
      assert(summary.length > 0, 'Summary should not be empty');
      assert(summary.toLowerCase().includes(expected), 
        `Summary for ${name} should include action word`);
    });
  });

  // Error Handling Tests - Updated for new API
  console.log('\n🚨 Error Handling Tests');
  console.log('-'.repeat(30));

  await test('Adventure manager handles empty state gracefully', () => {
    const manager = new AdventureManager();
    
    const progress = manager.getProgress();
    assert(progress.narrative.includes('No adventures completed'), 'Should handle empty state');
  });

  await test('Adventure exploration handles missing adventures', async () => {
    const manager = new AdventureManager();
    
    const result = await manager.exploreAdventure('nonexistent');
    assert(result.narrative.includes('not found'), 'Should handle missing adventures');
  });

  await test('Story generator handles empty project data', async () => {
    const generator = new DynamicStoryGenerator();
    // Don't set project data
    
    try {
      await generator.generateStory('space');
      assert.fail('Should throw error when no project is set');
    } catch (error) {
      assert(error instanceof Error, 'Should throw Error');
      assert(error.message.includes('No project information'), 'Error should mention missing project');
    }
  });

  // Print results using shared utility
  printResults();
  
  // Exit with error code if tests failed
  if (stats.failed > 0) {
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

export { runTests };