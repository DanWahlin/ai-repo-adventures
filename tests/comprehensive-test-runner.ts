#!/usr/bin/env node

/**
 * Comprehensive test runner that runs all test suites and provides 
 * an overall summary at the end
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

interface IndividualTest {
  name: string;
  passed: boolean;
  skipped?: boolean;
  error?: string;
}

interface TestResult {
  name: string;
  command: string;
  passed: boolean;
  output: string;
  errorOutput: string;
  duration: number;
  individualTests: IndividualTest[];
  stats: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

interface TestSummary {
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  results: TestResult[];
  totalIndividualTests: number;
  totalPassedTests: number;
  totalFailedTests: number;
  totalSkippedTests: number;
}

// Constants for configuration
const MAX_TEST_NAME_LENGTH = 100;
const MAX_OUTPUT_SIZE = 10 * 1024 * 1024; // 10MB limit
const DEFAULT_TEST_TIMEOUT = 120000; // 2 minutes for comprehensive test suite

// Pre-compiled regex patterns to prevent ReDoS attacks
const TEST_PATTERNS = {
  passed: /^(✅|✓)\s+(.{1,200}?)\s*$/,  // Non-greedy with length limit
  failed: /^❌\s+(.{1,200}?):\s*(.{0,500}?)$/,  // Limited error message length
  skipped: /^⏭️\s+(.{1,200}?)(?:\s*\([^)]{0,50}\))?\s*$/  // Limited parentheses content
};

// Exclusion patterns for non-test output
const EXCLUSION_PATTERNS = [
  /^🧪|^📊|^=|^-|^🎯|^📋|^🏁/,
  /^\[dotenv/,
  /^(Running|Could not read file|generateStory error|LLM API call failed)/,
  /^(Using cached|Repo Adventure|Pre-analyzing|Shutting down)/,
  /(Success Rate:|completed successfully|tests completed)/,
  /(Passed:|Failed:|Skipped:|All test groups passed|System is working)/
];

// Known non-test result patterns to exclude from test parsing
const NON_TEST_RESULT_PATTERNS = [
  'Tests completed', 'test groups', 'System is working', 'All ', 
  'Connected to MCP', 'Project analysis', 'Progressive exploration',
  'Discovery tracking', 'Character interactions', 'Code snippet discovery',
  'algorithms tests', 'Client tests', 'Project scanned', 'Functions discovered',
  'Classes detected', 'Dependencies found', 'Themed story generated',
  'Dynamic adventure paths', 'Successfully explored', 'Dynamic choices generated',
  'Adventure Progress:', 'Areas Explored:', 'Discoveries Made:',
  'exploration with character', 'Code snippet discovered', 'Code shown in adventure',
  'Invalid theme correctly', 'Caching is working', 'Hint 1:', 'Hint 2:'
];

function validateInput(command: string, args: string[] = []): void {
  if (!command || typeof command !== 'string' || command.trim().length === 0) {
    throw new Error('Invalid command provided');
  }
  if (!Array.isArray(args)) {
    throw new Error('Arguments must be an array');
  }
}

function splitAndCleanLines(output: string): string[] {
  // Truncate output if it exceeds limit to prevent memory issues
  const truncatedOutput = output.length > MAX_OUTPUT_SIZE 
    ? output.substring(0, MAX_OUTPUT_SIZE) + '\n... (output truncated due to size limit)'
    : output;
    
  return truncatedOutput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
}

function shouldExcludeLine(line: string): boolean {
  return EXCLUSION_PATTERNS.some(pattern => pattern.test(line));
}

function isNonTestResult(testName: string): boolean {
  return NON_TEST_RESULT_PATTERNS.some(pattern => testName.includes(pattern)) ||
         testName.length === 0 ||
         testName.length > MAX_TEST_NAME_LENGTH;
}

function parseTestResults(lines: string[]): IndividualTest[] {
  const tests: IndividualTest[] = [];
  
  for (const line of lines) {
    // Try to match passed tests
    const passedMatch = line.match(TEST_PATTERNS.passed);
    if (passedMatch) {
      const testName = passedMatch[2].trim();
      if (!isNonTestResult(testName)) {
        tests.push({
          name: testName,
          passed: true
        });
      }
      continue;
    }
    
    // Try to match failed tests
    const failedMatch = line.match(TEST_PATTERNS.failed);
    if (failedMatch) {
      const testName = failedMatch[1].trim();
      if (!isNonTestResult(testName)) {
        tests.push({
          name: testName,
          passed: false,
          error: failedMatch[2].trim()
        });
      }
      continue;
    }
    
    // Try to match skipped tests
    const skippedMatch = line.match(TEST_PATTERNS.skipped);
    if (skippedMatch) {
      const testName = skippedMatch[1].trim();
      if (!isNonTestResult(testName) && !testName.includes('Skipped:')) {
        tests.push({
          name: testName,
          passed: true,
          skipped: true
        });
      }
      continue;
    }
  }
  
  return tests;
}

function parseTestOutput(output: string): IndividualTest[] {
  try {
    const lines = splitAndCleanLines(output);
    const testLines = lines.filter(line => !shouldExcludeLine(line));
    return parseTestResults(testLines);
  } catch (error) {
    console.warn('Error parsing test output:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

function calculateTestStats(tests: IndividualTest[]) {
  return {
    total: tests.length,
    passed: tests.filter(t => t.passed && !t.skipped).length,
    failed: tests.filter(t => !t.passed).length,
    skipped: tests.filter(t => t.skipped).length
  };
}

async function runCommand(command: string, args: string[] = []): Promise<TestResult> {
  // Input validation
  validateInput(command, args);
  
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    let output = '';
    let errorOutput = '';
    let outputSize = 0;
    let errorOutputSize = 0;
    
    const child = spawn(command, args, { 
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true 
    });
    
    // Handle timeout
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Command timed out after ${DEFAULT_TEST_TIMEOUT}ms`));
    }, DEFAULT_TEST_TIMEOUT);
    
    child.stdout?.on('data', (data) => {
      const chunk = data.toString();
      
      // Prevent memory leak by limiting output size
      if (outputSize + chunk.length > MAX_OUTPUT_SIZE) {
        const remainingSpace = MAX_OUTPUT_SIZE - outputSize;
        if (remainingSpace > 0) {
          output += chunk.substring(0, remainingSpace);
          output += '\n... (output truncated due to size limit)';
        }
        outputSize = MAX_OUTPUT_SIZE;
      } else {
        output += chunk;
        outputSize += chunk.length;
      }
      
      process.stdout.write(chunk);
    });
    
    child.stderr?.on('data', (data) => {
      const chunk = data.toString();
      
      // Prevent memory leak by limiting error output size
      if (errorOutputSize + chunk.length > MAX_OUTPUT_SIZE) {
        const remainingSpace = MAX_OUTPUT_SIZE - errorOutputSize;
        if (remainingSpace > 0) {
          errorOutput += chunk.substring(0, remainingSpace);
          errorOutput += '\n... (error output truncated due to size limit)';
        }
        errorOutputSize = MAX_OUTPUT_SIZE;
      } else {
        errorOutput += chunk;
        errorOutputSize += chunk.length;
      }
      
      process.stderr.write(chunk);
    });
    
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Command failed to start: ${error.message}`));
    });
    
    child.on('close', (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      
      try {
        const individualTests = parseTestOutput(output);
        const stats = calculateTestStats(individualTests);
        
        resolve({
          name: args.length > 0 ? `${command} ${args.join(' ')}` : command,
          command: `${command} ${args.join(' ')}`,
          passed: code === 0,
          output,
          errorOutput,
          duration,
          individualTests,
          stats
        });
      } catch (error) {
        reject(new Error(`Failed to parse test output: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  });
}

async function runAllTests(): Promise<TestSummary> {
  console.log('🏃‍♂️ Running Comprehensive Test Suite');
  console.log('=' .repeat(70));
  console.log('This will run all unit tests, simple tests, and real-world tests');
  console.log('');
  
  const testSuites = [
    { name: 'Unit Tests', command: 'npm', args: ['run', 'test:unit'] },
    { name: 'Simple Tests', command: 'npm', args: ['run', 'test:simple'] },
    { name: 'Real-World Tests', command: 'npm', args: ['run', 'test:real-world'] }
  ];
  
  const results: TestResult[] = [];
  
  for (const suite of testSuites) {
    console.log(`\n🎯 Running ${suite.name}...`);
    console.log('-'.repeat(50));
    
    const result = await runCommand(suite.command, suite.args);
    result.name = suite.name;
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ ${suite.name} completed successfully`);
    } else {
      console.log(`❌ ${suite.name} failed`);
    }
  }
  
  const passedSuites = results.filter(r => r.passed).length;
  const failedSuites = results.filter(r => !r.passed).length;
  
  // Calculate total individual test statistics
  const totalIndividualTests = results.reduce((sum, r) => sum + r.stats.total, 0);
  const totalPassedTests = results.reduce((sum, r) => sum + r.stats.passed, 0);
  const totalFailedTests = results.reduce((sum, r) => sum + r.stats.failed, 0);
  const totalSkippedTests = results.reduce((sum, r) => sum + r.stats.skipped, 0);
  
  return {
    totalSuites: results.length,
    passedSuites,
    failedSuites,
    results,
    totalIndividualTests,
    totalPassedTests,
    totalFailedTests,
    totalSkippedTests
  };
}

function printTestSummaryTable(summary: TestSummary): void {
  // Create a formatted table with test suite results
  const tableData = [
    {
      name: 'Comprehensive Test Runner',
      status: summary.failedSuites === 0 ? '✅ PASSED' : '❌ FAILED',
      passRate: summary.totalSuites > 0 ? Math.round((summary.passedSuites / summary.totalSuites) * 100) + '%' : 'N/A',
      tests: `${summary.totalIndividualTests} tests across ${summary.totalSuites} suites`
    }
  ];

  // Add individual suite results
  summary.results.forEach((result) => {
    const passRate = result.stats.total > 0 ? Math.round((result.stats.passed / result.stats.total) * 100) + '%' : 'N/A';
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    
    // Map suite names to more descriptive names
    let displayName = result.name;
    let testDescription = '';
    
    if (result.name.includes('Unit Tests')) {
      displayName = 'Unit Test Runner';
      testDescription = `${result.stats.total} tests across ${result.individualTests.length > 0 ? '3' : '1'} groups`;
    } else if (result.name.includes('Simple Tests')) {
      displayName = 'Simple Test';
      testDescription = 'Basic workflow tests';
    } else if (result.name.includes('Real-World Tests')) {
      displayName = 'Real-World Test';
      testDescription = 'Comprehensive workflow tests';
    } else if (result.name.includes('Integration')) {
      displayName = 'Integration Test Runner';
      testDescription = `${result.stats.total} LLM integration tests`;
    } else if (result.name.includes('Algorithm')) {
      displayName = 'Individual Algorithm Tests';
      testDescription = `${result.stats.total} algorithm tests`;
    } else if (result.name.includes('LLM Client')) {
      displayName = 'Individual LLM Client Tests';
      testDescription = `${result.stats.total} client tests`;
    } else if (result.name.includes('Cross-Language')) {
      displayName = 'Cross-Language Analysis';
      testDescription = `${result.stats.total} language analysis tests`;
    } else {
      testDescription = `${result.stats.total} tests`;
    }
    
    tableData.push({
      name: displayName,
      status: status,
      passRate: passRate,
      tests: testDescription
    });
  });

  // Calculate column widths
  const nameWidth = Math.max(28, Math.max(...tableData.map(row => row.name.length)));
  const statusWidth = 10;
  const passRateWidth = 11;
  const testsWidth = Math.max(30, Math.max(...tableData.map(row => row.tests.length)));

  // Print table header
  console.log('');
  console.log(`| ${'Test Suite'.padEnd(nameWidth)} | ${'Status'.padEnd(statusWidth)} | ${'Pass Rate'.padEnd(passRateWidth)} | ${'Tests'.padEnd(testsWidth)} |`);
  console.log(`|${'-'.repeat(nameWidth + 2)}|${'-'.repeat(statusWidth + 2)}|${'-'.repeat(passRateWidth + 2)}|${'-'.repeat(testsWidth + 2)}|`);

  // Print table rows
  tableData.forEach(row => {
    console.log(`| ${row.name.padEnd(nameWidth)} | ${row.status.padEnd(statusWidth)} | ${row.passRate.padEnd(passRateWidth)} | ${row.tests.padEnd(testsWidth)} |`);
  });
  
  console.log('');
}

function printOverallStatisticsTable(summary: TestSummary): void {
  // Calculate success rates
  const suiteSuccessRate = summary.totalSuites > 0 
    ? Math.round((summary.passedSuites / summary.totalSuites) * 100) 
    : 0;
  const testSuccessRate = summary.totalIndividualTests > 0 
    ? Math.round((summary.totalPassedTests / summary.totalIndividualTests) * 100) 
    : 0;

  // Create table data
  const statsData = [
    {
      category: '🎯 Test Suites',
      total: summary.totalSuites.toString(),
      passed: summary.passedSuites.toString(),
      failed: summary.failedSuites.toString(),
      skipped: '0',
      successRate: `${suiteSuccessRate}%`
    },
    {
      category: '🧪 Individual Tests',
      total: summary.totalIndividualTests.toString(),
      passed: summary.totalPassedTests.toString(),
      failed: summary.totalFailedTests.toString(),
      skipped: summary.totalSkippedTests.toString(),
      successRate: `${testSuccessRate}%`
    }
  ];

  // Calculate column widths
  const categoryWidth = Math.max(18, Math.max(...statsData.map(row => row.category.length)));
  const totalWidth = 7;
  const passedWidth = 8;
  const failedWidth = 8;
  const skippedWidth = 9;
  const successRateWidth = 13;

  // Print table header
  console.log('');
  console.log(`| ${'Category'.padEnd(categoryWidth)} | ${'Total'.padEnd(totalWidth)} | ${'Passed'.padEnd(passedWidth)} | ${'Failed'.padEnd(failedWidth)} | ${'Skipped'.padEnd(skippedWidth)} | ${'Success Rate'.padEnd(successRateWidth)} |`);
  console.log(`|${'-'.repeat(categoryWidth + 2)}|${'-'.repeat(totalWidth + 2)}|${'-'.repeat(passedWidth + 2)}|${'-'.repeat(failedWidth + 2)}|${'-'.repeat(skippedWidth + 2)}|${'-'.repeat(successRateWidth + 2)}|`);

  // Print table rows
  statsData.forEach(row => {
    console.log(`| ${row.category.padEnd(categoryWidth)} | ${row.total.padEnd(totalWidth)} | ${row.passed.padEnd(passedWidth)} | ${row.failed.padEnd(failedWidth)} | ${row.skipped.padEnd(skippedWidth)} | ${row.successRate.padEnd(successRateWidth)} |`);
  });

  console.log('');
  
  // Final status message
  if (summary.failedSuites === 0 && summary.totalFailedTests === 0) {
    console.log('🎉 ALL TESTS PASSED! 🎉');
    console.log('🚀 The system is working correctly across all test suites!');
    console.log(`✨ Total: ${summary.totalIndividualTests} tests in ${summary.totalSuites} suites`);
  } else {
    console.log('⚠️  Some tests failed. Please review the results above.');
    console.log('🔧 Please review the detailed results above for specific failure information');
  }
  
  console.log('');
}

function printOverallSummary(summary: TestSummary): void {
  console.log('\n\n');
  console.log('🏆 COMPREHENSIVE TEST RESULTS - HIERARCHICAL VIEW');
  console.log('='.repeat(70));
  
  // Show detailed results for each test suite
  summary.results.forEach((result, index) => {
    const suiteStatus = result.passed ? '✅' : '❌';
    const duration = `${result.duration}ms`;
    
    console.log(`\n${index + 1}. ${suiteStatus} ${result.name} (${duration})`);
    console.log('   ' + '─'.repeat(60));
    
    if (result.individualTests.length > 0) {
      // Show individual test results
      result.individualTests.forEach((test, testIndex) => {
        let testStatus = '❌';
        let testDetail = '';
        
        if (test.skipped) {
          testStatus = '⏭️ ';
          testDetail = ' (skipped)';
        } else if (test.passed) {
          testStatus = '✅';
        } else {
          testDetail = test.error ? `: ${test.error}` : '';
        }
        
        console.log(`   ${testStatus} ${test.name}${testDetail}`);
      });
      
      // Show suite-level statistics
      console.log(`   📊 Suite Stats: ${result.stats.passed} passed, ${result.stats.failed} failed, ${result.stats.skipped} skipped (${result.stats.total} total)`);
    } else {
      console.log('   🔍 No individual tests detected in output');
      console.log(`   📊 Suite Status: ${result.passed ? 'PASSED' : 'FAILED'}`);
    }
  });
  
  // Add the formatted table summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUITE SUMMARY TABLE');
  console.log('='.repeat(70));
  printTestSummaryTable(summary);
  
  console.log('\n' + '='.repeat(70));
  console.log('📈 OVERALL STATISTICS');
  console.log('='.repeat(70));
  printOverallStatisticsTable(summary);
  
  console.log('='.repeat(70));
}

async function main(): Promise<void> {
  try {
    const summary = await runAllTests();
    printOverallSummary(summary);
    
    // Set exit code instead of calling process.exit() to allow cleanup
    process.exitCode = summary.failedSuites === 0 && summary.totalFailedTests === 0 ? 0 : 1;
  } catch (error) {
    console.error('💥 Test runner crashed:', error instanceof Error ? error.message : String(error));
    
    // Log stack trace in debug mode
    if (process.env.DEBUG) {
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    }
    
    process.exitCode = 1;
  }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Test runner interrupted by user');
  process.exitCode = 130; // Standard exit code for SIGINT
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test runner terminated');
  process.exitCode = 143; // Standard exit code for SIGTERM
});

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Unhandled error in main:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}