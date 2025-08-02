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

function parseTestOutput(output: string): IndividualTest[] {
  const tests: IndividualTest[] = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and non-test lines
    if (!trimmedLine || 
        trimmedLine.startsWith('🧪') || 
        trimmedLine.startsWith('📊') ||
        trimmedLine.startsWith('=') ||
        trimmedLine.startsWith('-') ||
        trimmedLine.startsWith('🎯') ||
        trimmedLine.startsWith('📋') ||
        trimmedLine.startsWith('🏁') ||
        trimmedLine.startsWith('[dotenv') ||
        trimmedLine.startsWith('Running') ||
        trimmedLine.startsWith('Could not read file') ||
        trimmedLine.startsWith('generateStory error') ||
        trimmedLine.startsWith('LLM API call failed') ||
        trimmedLine.startsWith('Using cached') ||
        trimmedLine.startsWith('Repo Adventure') ||
        trimmedLine.startsWith('Pre-analyzing') ||
        trimmedLine.startsWith('Shutting down') ||
        trimmedLine.includes('Success Rate:') ||
        trimmedLine.includes('completed successfully') ||
        trimmedLine.includes('tests completed') ||
        trimmedLine.includes('Passed:') ||
        trimmedLine.includes('Failed:') ||
        trimmedLine.includes('Skipped:') ||
        trimmedLine.includes('All test groups passed') ||
        trimmedLine.includes('System is working')) {
      continue;
    }
    
    // Look for actual test result patterns - be more strict
    const passedMatch = trimmedLine.match(/^(✅|✓)\s+(.+?)$/);
    if (passedMatch) {
      const testName = passedMatch[2].trim();
      // Skip if it looks like a summary line or status message
      if (!testName.includes('Tests completed') && 
          !testName.includes('test groups') &&
          !testName.includes('System is working') &&
          !testName.includes('All ') &&
          !testName.includes('Connected to MCP') &&
          !testName.includes('Project analysis') &&
          !testName.includes('Progressive exploration') &&
          !testName.includes('Discovery tracking') &&
          !testName.includes('Character interactions') &&
          !testName.includes('Code snippet discovery') &&
          !testName.includes('Passed:') &&
          !testName.includes('algorithms tests') &&
          !testName.includes('Client tests') &&
          !testName.includes('Project scanned') &&
          !testName.includes('Functions discovered') &&
          !testName.includes('Classes detected') &&
          !testName.includes('Dependencies found') &&
          !testName.includes('Themed story generated') &&
          !testName.includes('Dynamic adventure paths') &&
          !testName.includes('Successfully explored') &&
          !testName.includes('Dynamic choices generated') &&
          !testName.includes('Adventure Progress:') &&
          !testName.includes('Areas Explored:') &&
          !testName.includes('Discoveries Made:') &&
          !testName.includes('exploration with character') &&
          !testName.includes('Code snippet discovered') &&
          !testName.includes('Code shown in adventure') &&
          !testName.includes('Invalid theme correctly') &&
          !testName.includes('Caching is working') &&
          !testName.includes('Hint 1:') &&
          !testName.includes('Hint 2:') &&
          testName.length > 0 &&
          testName.length < 100) { // Reasonable test name length
        tests.push({
          name: testName,
          passed: true
        });
      }
      continue;
    }
    
    // Look for failed tests
    const failedMatch = trimmedLine.match(/^❌\s+(.+?):\s*(.*)$/);
    if (failedMatch) {
      const testName = failedMatch[1].trim();
      if (testName.length > 0) {
        tests.push({
          name: testName,
          passed: false,
          error: failedMatch[2].trim()
        });
      }
      continue;
    }
    
    // Look for skipped tests
    const skippedMatch = trimmedLine.match(/^⏭️\s+(.+?)(?:\s*\(.*\))?\s*$/);
    if (skippedMatch) {
      const testName = skippedMatch[1].trim();
      if (testName.length > 0 && !testName.includes('Skipped:')) {
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

function calculateTestStats(tests: IndividualTest[]) {
  return {
    total: tests.length,
    passed: tests.filter(t => t.passed && !t.skipped).length,
    failed: tests.filter(t => !t.passed).length,
    skipped: tests.filter(t => t.skipped).length
  };
}

async function runCommand(command: string, args: string[] = []): Promise<TestResult> {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    let output = '';
    let errorOutput = '';
    
    const child = spawn(command, args, { 
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true 
    });
    
    child.stdout?.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      process.stdout.write(chunk);
    });
    
    child.stderr?.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;
      process.stderr.write(chunk);
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
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
  
  console.log('\n' + '='.repeat(70));
  console.log('📈 OVERALL STATISTICS');
  console.log('='.repeat(70));
  
  // Test Suite Statistics
  console.log('🎯 Test Suite Summary:');
  console.log(`  Total Suites: ${summary.totalSuites}`);
  console.log(`  Passed Suites: ${summary.passedSuites}`);
  console.log(`  Failed Suites: ${summary.failedSuites}`);
  
  if (summary.totalSuites > 0) {
    const suiteSuccessRate = Math.round((summary.passedSuites / summary.totalSuites) * 100);
    console.log(`  Suite Success Rate: ${suiteSuccessRate}%`);
  }
  
  console.log('');
  
  // Individual Test Statistics
  console.log('🧪 Individual Test Summary:');
  console.log(`  Total Tests: ${summary.totalIndividualTests}`);
  console.log(`  Passed Tests: ${summary.totalPassedTests}`);
  console.log(`  Failed Tests: ${summary.totalFailedTests}`);
  console.log(`  Skipped Tests: ${summary.totalSkippedTests}`);
  
  if (summary.totalIndividualTests > 0) {
    const testSuccessRate = Math.round((summary.totalPassedTests / summary.totalIndividualTests) * 100);
    console.log(`  Test Success Rate: ${testSuccessRate}%`);
  }
  
  console.log('');
  
  // Final Status
  if (summary.failedSuites === 0 && summary.totalFailedTests === 0) {
    console.log('🎉 ALL TESTS PASSED! 🎉');
    console.log('🚀 The system is working correctly across all test suites!');
    console.log(`✨ Total: ${summary.totalIndividualTests} tests in ${summary.totalSuites} suites`);
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    if (summary.failedSuites > 0) {
      console.log(`💡 ${summary.failedSuites} out of ${summary.totalSuites} test suites failed`);
    }
    if (summary.totalFailedTests > 0) {
      console.log(`💡 ${summary.totalFailedTests} out of ${summary.totalIndividualTests} individual tests failed`);
    }
    console.log('🔧 Please review the detailed results above for specific failure information');
  }
  
  console.log('');
  console.log('='.repeat(70));
}

async function main() {
  try {
    const summary = await runAllTests();
    printOverallSummary(summary);
    
    // Exit with appropriate code
    process.exit(summary.failedSuites === 0 ? 0 : 1);
  } catch (error) {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}