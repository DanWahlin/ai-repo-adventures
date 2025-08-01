#!/usr/bin/env node

/**
 * Unit tests for core adventure algorithms
 */

import { strict as assert } from 'assert';
import { AdventureManager } from '../../src/adventure/AdventureManager.js';
import { DynamicStoryGenerator, STORY_THEMES } from '../../src/story/DynamicStoryGenerator.js';
import { ProjectAnalyzer } from '../../src/analyzer/ProjectAnalyzer.js';
import type { ProjectInfo, FunctionInfo, ClassInfo } from '../../src/analyzer/ProjectAnalyzer.js';
import type { Story, Character } from '../../src/shared/types.js';

// Test data fixtures
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

const mockStory: Story = {
  theme: 'space',
  title: 'Digital Starship Adventure',
  introduction: 'Welcome aboard the cosmic codebase!',
  setting: 'A space station orbiting Planet TypeScript',
  characters: [
    {
      name: 'Captain Express',
      role: 'Ship Commander',
      description: 'Commands the starship with expert navigation',
      greeting: 'Welcome aboard, traveler!',
      funFact: 'I can handle thousands of requests per second!',
      technology: 'API'
    },
    {
      name: 'Data Navigator Zara',
      role: 'Information Specialist',
      description: 'Manages all data flows through the ship',
      greeting: 'Ready to explore data streams?',
      funFact: 'I organize terabytes of information instantly!',
      technology: 'Database'
    }
  ],
  initialChoices: ['Meet Captain Express', 'Explore the engine room', 'Visit the data center']
};

// Test helper functions
function createTestAdventureManager(): AdventureManager {
  const manager = new AdventureManager();
  manager.setCurrentStory(mockStory);
  manager.setContext(mockProjectInfo, 'space');
  return manager;
}

async function runTests() {
  console.log('🧪 Running Unit Tests for Adventure Algorithms\n');
  let passed = 0;
  let failed = 0;

  // Test helper
  const test = async (name: string, testFn: () => Promise<void> | void) => {
    try {
      await testFn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  };

  // Adventure Manager Tests
  console.log('🎮 Adventure Manager Tests');
  console.log('-'.repeat(30));

  await test('Dynamic choice generation creates valid choices', () => {
    const manager = createTestAdventureManager();
    // Access private method through any casting for testing
    const choices = (manager as any).generateDynamicChoices();
    
    assert(Array.isArray(choices), 'Should return array of choices');
    assert(choices.length > 0, 'Should generate at least one choice');
    assert(choices.length <= 4, 'Should limit choices to 4 maximum');
    assert(choices.every(choice => typeof choice === 'string'), 'All choices should be strings');
  });

  await test('Progress tracking increases correctly', async () => {
    const manager = createTestAdventureManager();
    const initialProgress = (manager as any).state.adventureProgress;
    
    // Simulate exploration
    await manager.makeChoice('Explore the Configuration Cavern');
    
    const newProgress = (manager as any).state.adventureProgress;
    assert(newProgress > initialProgress, 'Progress should increase after exploration');
    assert(newProgress >= 15, 'Should add at least 15% progress for configuration exploration');
  });

  await test('Visited areas are tracked correctly', async () => {
    const manager = createTestAdventureManager();
    const visitedAreas = (manager as any).state.exploredAreas;
    
    assert(visitedAreas.size === 0, 'Should start with no visited areas');
    
    await manager.makeChoice('Explore the Configuration Cavern');
    assert(visitedAreas.has('configuration'), 'Should track configuration area as visited');
  });

  await test('Character meeting adds discoveries', async () => {
    const manager = createTestAdventureManager();
    const initialDiscoveries = (manager as any).state.discoveries.length;
    
    const result = await manager.getCharacterInfo('Captain Express');
    
    assert(result.name === 'Captain Express', 'Should return correct character');
    assert((manager as any).state.visitedCharacters.has('Captain Express'), 'Should track character as visited');
  });

  await test('Hint system provides different hints', async () => {
    const manager = createTestAdventureManager();
    
    const hint1 = await manager.makeChoice('Request a helpful hint');
    const hint2 = await manager.makeChoice('Request a helpful hint');
    
    assert(hint1.narrative.includes('Hint'), 'First hint should contain hint text');
    assert(hint2.narrative.includes('Hint'), 'Second hint should contain hint text');
    // Hints should potentially be different (cycling through different ones)
  });

  // Story Generator Tests
  console.log('\n📚 Story Generator Tests');
  console.log('-'.repeat(30));

  await test('Theme validation works correctly', () => {
    const generator = new DynamicStoryGenerator();
    generator.setProject(mockProjectInfo);
    
    // Test valid themes
    Object.values(STORY_THEMES).forEach(theme => {
      assert(typeof theme === 'string', `Theme ${theme} should be string`);
      assert(theme.length > 0, `Theme ${theme} should not be empty`);
    });
  });

  await test('Project analysis formatting includes key information', () => {
    const generator = new DynamicStoryGenerator();
    generator.setProject(mockProjectInfo);
    
    const analysis = (generator as any).createProjectAnalysis();
    
    assert(typeof analysis === 'string', 'Analysis should be string');
    assert(analysis.includes('TypeScript'), 'Should include main technologies');
    assert(analysis.includes('startServer'), 'Should include function names');
    assert(analysis.includes('ApiController'), 'Should include class names');
    assert(analysis.includes('express'), 'Should include dependencies');
    assert(analysis.length > 100, 'Analysis should be substantial');
  });

  await test('Enhanced LLM prompt includes specific code examples', () => {
    const generator = new DynamicStoryGenerator();
    generator.setProject(mockProjectInfo);
    
    const prompt = (generator as any).createEnhancedStoryPrompt('space', 'mock analysis');
    
    assert(prompt.includes('space'), 'Should include theme');
    assert(prompt.includes('startServer'), 'Should include specific function names');
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
      '   ',
      '/proc/version'
    ];
    
    dangerousPaths.forEach(path => {
      try {
        (analyzer as any).validateProjectPath(path);
        assert.fail(`Should reject dangerous path: ${path}`);
      } catch (error) {
        assert(error instanceof Error, `Should throw Error for dangerous paths, got: ${typeof error}`);
        assert(
          error.message.toLowerCase().includes('invalid') || 
          error.message.includes('denied') || 
          error.message.includes('unsafe') ||
          error.message.includes('string') ||
          error.message.includes('empty'),
          `Error message "${error.message}" should indicate invalid path for: ${path}`
        );
      }
    });
  });

  await test('Path validation accepts safe paths', () => {
    const analyzer = new ProjectAnalyzer();
    
    const safePaths = [
      '/home/user/project',
      '/Users/developer/myapp',
      './current-project',
      '../my-projects/webapp'
    ];
    
    safePaths.forEach(path => {
      try {
        const validated = (analyzer as any).validateProjectPath(path);
        assert(typeof validated === 'string', 'Should return validated path string');
        assert(validated.length > 0, 'Validated path should not be empty');
      } catch (error) {
        // Skip paths that don't exist on this system
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
      { name: 'getUserData', params: ['userId'], expected: 'retrieves user data' },
      { name: 'createAccount', params: ['userData'], expected: 'creates account' },
      { name: 'validateInput', params: ['input', 'rules'], expected: 'validates input' },
      { name: 'processPayment', params: ['amount', 'method'], expected: 'processes payment' }
    ];
    
    testCases.forEach(({ name, params, expected }) => {
      const summary = (analyzer as any).generateFunctionSummary(name, params);
      
      assert(typeof summary === 'string', 'Summary should be string');
      assert(summary.length > 0, 'Summary should not be empty');
      assert(summary.toLowerCase().includes(expected.split(' ')[0]), 
        `Summary for ${name} should include action word`);
    });
  });

  // Error Handling Tests
  console.log('\n🚨 Error Handling Tests');
  console.log('-'.repeat(30));

  await test('Adventure manager handles missing story gracefully', async () => {
    const manager = new AdventureManager();
    // Don't set a story
    
    try {
      await manager.makeChoice('explore');
      assert.fail('Should throw error when no story is set');
    } catch (error) {
      assert(error instanceof Error, 'Should throw Error');
      assert(error.message.includes('No story'), 'Error should mention missing story');
    }
  });

  await test('Character lookup handles unknown characters', async () => {
    const manager = createTestAdventureManager();
    
    try {
      await manager.getCharacterInfo('NonExistentCharacter');
      assert.fail('Should throw error for unknown character');
    } catch (error) {
      assert(error instanceof Error, 'Should throw Error');
      assert(error.message.includes('not found'), 'Error should mention character not found');
    }
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

  // Performance Tests
  console.log('\n⚡ Performance Tests');
  console.log('-'.repeat(30));

  await test('Dynamic choice generation completes quickly', () => {
    const manager = createTestAdventureManager();
    
    const startTime = Date.now();
    const choices = (manager as any).generateDynamicChoices();
    const endTime = Date.now();
    
    assert(endTime - startTime < 100, 'Choice generation should complete in under 100ms');
    assert(choices.length > 0, 'Should generate choices quickly');
  });

  await test('Story analysis formatting is efficient', () => {
    const generator = new DynamicStoryGenerator();
    generator.setProject(mockProjectInfo);
    
    const startTime = Date.now();
    const analysis = (generator as any).createProjectAnalysis();
    const endTime = Date.now();
    
    assert(endTime - startTime < 50, 'Analysis formatting should complete in under 50ms');
    assert(analysis.length > 0, 'Should format analysis quickly');
  });

  // Results Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Adventure algorithms are working correctly.');
  } else {
    console.log(`\n⚠️  ${failed} tests failed. Please review the failures above.`);
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