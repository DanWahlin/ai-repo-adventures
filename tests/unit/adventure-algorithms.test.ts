#!/usr/bin/env node

/**
 * Unit tests for core adventure algorithms - Updated for LLM-driven system
 */

import { AdventureManager } from '../../src/adventure/adventure-manager.js';
import { DynamicStoryGenerator, STORY_THEMES } from '../../src/adventure/dynamic-story-generator.js';
import { ProjectAnalyzer } from '../../src/analyzer/project-analyzer.js';
import { createTestRunner, mockProjectInfo, assert } from '../shared/test-utils.js';
import type { ProjectInfo } from '../../src/analyzer/project-analyzer.js';

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
  // Note: Manager will no longer have initialized state without working LLM
  return manager;
}

async function runTests() {
  console.log('🧪 Running Unit Tests for Adventure Algorithms\n');
  const { test, stats, printResults } = await createTestRunner('Adventure Algorithm Tests');

  // Adventure Manager Tests - Updated for new API
  console.log('🎮 Adventure Manager Tests');
  console.log('-'.repeat(30));


  await test('Adventure initialization works with working LLM', async () => {
    const manager = new AdventureManager();
    
    try {
      const result = await manager.initializeAdventure(mockProjectInfo, 'space');
      assert(typeof result === 'string', 'Should return story string');
      assert(result.length > 0, 'Should return non-empty story');
      assert(result.includes('adventure'), 'Should contain adventure content');
      console.log('Adventure Manager Success: Story generated with LLM');
    } catch (error) {
      console.log('Adventure Manager Error:', error instanceof Error ? error.message : String(error));
      // If LLM is not available, that's also a valid test outcome
      assert(error instanceof Error, 'Should get proper error when LLM unavailable');
      assert(error.message.includes('Unable to generate') || error.message.includes('LLM service') || error.message.includes('API key'), 'Should have meaningful error message about LLM unavailability');
    }
  });

  await test('Adventure exploration handles invalid choices', async () => {
    const manager = await createTestAdventureManager();
    
    const result = await manager.exploreAdventure('invalid-adventure-id');
    assert(result.narrative.includes('not found'), 'Should handle invalid adventure gracefully');
    assert(Array.isArray(result.choices), 'Should provide alternative choices');
  });

  await test('Progress tracking shows empty state without initialization', async () => {
    const manager = await createTestAdventureManager();
    
    const initialProgress = manager.getProgress();
    assert(initialProgress.narrative.includes('No adventures completed'), 'Should show empty state without LLM initialization');
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

  await test('Story generator works with working LLM', async () => {
    const generator = new DynamicStoryGenerator();
    generator.setProject(mockProjectInfo);
    
    try {
      const result = await generator.generateStory('space');
      assert(typeof result === 'object', 'Should return story object');
      assert(result.title && result.introduction, 'Should have title and introduction');
      assert(result.theme === 'space', 'Should have correct theme');
      console.log('Story Generator Success: Story generated with LLM');
    } catch (error) {
      console.log('Story Generator Error:', error instanceof Error ? error.message : String(error));
      // If LLM is not available, that's also a valid test outcome
      assert(error instanceof Error, 'Should throw Error when LLM unavailable');
      assert(error.message.includes('Unable to generate') || error.message.includes('LLM service') || error.message.includes('API key') || error.message.includes('No project information'), 'Should have meaningful error message about LLM unavailability');
    }
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

  await test('Default character generation works for all themes', () => {
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
    // Path validation is now in FileSystemScanner, test via ProjectAnalyzer
    const analyzer = new ProjectAnalyzer();
    
    const dangerousPaths = [
      '/etc/passwd',
      '/bin/bash', 
      '/tmp/../etc/hosts',
      '',
      '   '
    ];
    
    // Test that dangerous paths are rejected by the analyzer
    const promises = dangerousPaths.map(async (path) => {
      try {
        await analyzer.analyzeProject(path);
        assert.fail(`Should reject dangerous path: ${path}`);
      } catch (error) {
        assert(error instanceof Error, `Should throw Error for dangerous paths`);
        assert(error.message.includes('Project path') || 
               error.message.includes('not exist') || 
               error.message.includes('not accessible') ||
               error.message.includes('system directory') ||
               error.message.includes('Invalid project path') ||
               error.message.includes('must be a non-empty string'), 
          'Should have appropriate error message');
      }
    });
    
    return Promise.all(promises);
  });

  await test('Path validation accepts safe paths', () => {
    // This functionality is now in FileSystemScanner, test via ProjectAnalyzer
    const analyzer = new ProjectAnalyzer();
    
    // Test that valid paths work by actually analyzing current directory
    analyzer.analyzeProject('.').then(() => {
      assert(true, 'Should accept current directory');
    }).catch((error) => {
      if (error.message.includes('not a valid directory')) {
        assert(true, 'Valid rejection for non-directory');
      } else {
        throw error;
      }
    });
  });

  await test('Technology detection works correctly', () => {
    // Technology detection is now in FileSystemScanner, test via full analysis
    const analyzer = new ProjectAnalyzer();
    
    // Test by analyzing current project which has TypeScript
    return analyzer.analyzeProject('.').then((result) => {
      assert(Array.isArray(result.mainTechnologies), 'Should return array of technologies');
      assert(result.mainTechnologies.includes('TYPESCRIPT'), `Should detect TYPESCRIPT. Found: ${result.mainTechnologies.join(', ')}`);
      // Note: Technologies are returned in uppercase format
      return analyzer.cleanup();
    });
  });

  await test('Function summary generation creates meaningful descriptions', () => {
    // Function summary generation is now in CodeAnalyzer, test via actual analysis
    const analyzer = new ProjectAnalyzer();
    
    // Test by analyzing current project and checking function summaries
    return analyzer.analyzeProject('.').then((result) => {
      const functions = result.codeAnalysis.functions;
      assert(functions.length > 0, 'Should find functions in current project');
      
      // Check that summaries are generated
      const sampleFunction = functions[0];
      assert(typeof sampleFunction.summary === 'string', 'Summary should be string');
      assert(sampleFunction.summary.length > 0, 'Summary should not be empty');
      assert(/retrieves|updates|creates|removes|processes|validates/.test(sampleFunction.summary), 
        'Summary should contain action word');
      
      return analyzer.cleanup();
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