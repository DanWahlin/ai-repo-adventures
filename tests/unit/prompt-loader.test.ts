#!/usr/bin/env node

/**
 * Unit tests for Prompt Loader template processing
 */

import { createTestRunner, assert } from '../shared/test-utils.js';

// We'll need to expose the internal function for testing
// For now, let's create a simple version to test the concept
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  }
  return result;
}

export async function runPromptLoaderTests() {
  console.log('📄 Running Prompt Loader Tests\n');
  const { test, stats, printResults } = await createTestRunner('Prompt Loader Tests');

  // Template Variable Replacement Tests
  console.log('\n📦 Template Variable Replacement Tests');
  console.log('-'.repeat(30));

  await test('replaceTemplateVariables handles simple replacements', () => {
    const template = 'Hello {{name}}, welcome to {{place}}!';
    const variables = { name: 'Alice', place: 'Wonderland' };
    const result = replaceTemplateVariables(template, variables);
    
    assert(result === 'Hello Alice, welcome to Wonderland!', 'Should replace simple variables');
  });

  await test('replaceTemplateVariables handles multiple occurrences', () => {
    const template = '{{name}} said "{{name}} is my name and {{name}} is what I am called"';
    const variables = { name: 'Bob' };
    const result = replaceTemplateVariables(template, variables);
    
    assert(result === 'Bob said "Bob is my name and Bob is what I am called"', 'Should replace multiple occurrences');
  });

  await test('replaceTemplateVariables ignores missing variables', () => {
    const template = 'Hello {{name}}, welcome to {{place}}!';
    const variables = { name: 'Alice' }; // place is missing
    const result = replaceTemplateVariables(template, variables);
    
    assert(result === 'Hello Alice, welcome to {{place}}!', 'Should leave missing variables untouched');
  });

  await test('replaceTemplateVariables handles empty template', () => {
    const template = '';
    const variables = { name: 'Alice' };
    const result = replaceTemplateVariables(template, variables);
    
    assert(result === '', 'Should handle empty template');
  });

  await test('replaceTemplateVariables handles empty variables', () => {
    const template = 'Hello {{name}}!';
    const variables = {};
    const result = replaceTemplateVariables(template, variables);
    
    assert(result === 'Hello {{name}}!', 'Should handle empty variables object');
  });

  await test('replaceTemplateVariables handles special characters in values', () => {
    const template = 'Regex: {{pattern}}, Price: {{cost}}';
    const variables = { 
      pattern: '[.*+?^${}()|[\\]\\\\]', 
      cost: '$100.00' 
    };
    const result = replaceTemplateVariables(template, variables);
    
    assert(result.includes('[.*+?^${}()|[\\]\\\\]'), 'Should handle regex special chars');
    assert(result.includes('$100.00'), 'Should handle dollar signs');
  });

  await test('replaceTemplateVariables handles nested braces', () => {
    const template = 'Object: {{data}} and {{nested}}';
    const variables = { 
      data: '{"key": "value"}',
      nested: '{{inner}}'
    };
    const result = replaceTemplateVariables(template, variables);
    
    assert(result.includes('{"key": "value"}'), 'Should handle JSON in values');
    assert(result.includes('{{inner}}'), 'Should handle nested braces in values');
  });

  await test('replaceTemplateVariables handles multiline templates', () => {
    const template = `Line 1: {{title}}
Line 2: {{description}}
Line 3: {{footer}}`;
    const variables = { 
      title: 'My Title',
      description: 'A description with\nnewlines',
      footer: 'The End'
    };
    const result = replaceTemplateVariables(template, variables);
    
    assert(result.includes('Line 1: My Title'), 'Should handle multiline templates');
    assert(result.includes('newlines'), 'Should preserve newlines in values');
  });

  await test('replaceTemplateVariables is case sensitive', () => {
    const template = 'Hello {{name}} and {{Name}}!';
    const variables = { name: 'alice', Name: 'Alice' };
    const result = replaceTemplateVariables(template, variables);
    
    assert(result === 'Hello alice and Alice!', 'Should be case sensitive for variable names');
  });

  await test('replaceTemplateVariables handles whitespace in placeholders', () => {
    const template = 'Hello {{ name }}, welcome to {{place}}!';
    const variables = { name: 'Alice', place: 'Wonderland' };
    const result = replaceTemplateVariables(template, variables);
    
    // This should NOT replace {{ name }} (with spaces) since our placeholder format is {{name}}
    assert(result.includes('{{ name }}'), 'Should not replace placeholders with spaces');
    assert(result === 'Hello {{ name }}, welcome to Wonderland!', 'Should only replace exact format matches');
  });

  await test('replaceTemplateVariables handles complex real-world scenario', () => {
    const template = `# {{projectName}} Adventure

Welcome to the {{theme}} theme exploration of {{projectName}}.

## Quest: {{questTitle}}
Description: {{questDescription}}

### Files to explore:
{{fileList}}

Navigate through the {{technology}} codebase and discover the secrets within.
Complete this quest to unlock the next adventure in {{projectName}}!`;

    const variables = {
      projectName: 'MCP Repo Adventure',
      theme: 'Space',
      questTitle: 'The Command Center',
      questDescription: 'Explore the main server initialization logic',
      fileList: '- server.ts\n- adventure-manager.ts\n- tools.ts',
      technology: 'TypeScript'
    };

    const result = replaceTemplateVariables(template, variables);
    
    assert(result.includes('# MCP Repo Adventure Adventure'), 'Should replace project name');
    assert(result.includes('Space theme exploration'), 'Should replace theme');
    assert(result.includes('Quest: The Command Center'), 'Should replace quest title');
    assert(result.includes('- server.ts'), 'Should preserve multiline file list');
    assert(result.includes('TypeScript codebase'), 'Should replace technology');
  });

  printResults();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPromptLoaderTests();
}