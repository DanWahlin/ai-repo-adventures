#!/usr/bin/env node

/**
 * Comprehensive test runner that runs all test suites and provides 
 * an overall summary at the end
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

interface TestResult {
  name: string;
  command: string;
  passed: boolean;
  output: string;
  errorOutput: string;
  duration: number;
}

interface TestSummary {
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  results: TestResult[];
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
      resolve({
        name: args.length > 0 ? `${command} ${args.join(' ')}` : command,
        command: `${command} ${args.join(' ')}`,
        passed: code === 0,
        output,
        errorOutput,
        duration
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
  
  return {
    totalSuites: results.length,
    passedSuites,
    failedSuites,
    results
  };
}

function printOverallSummary(summary: TestSummary): void {
  console.log('\n\n');
  console.log('🏆 OVERALL TEST SUMMARY');
  console.log('='.repeat(70));
  
  // Individual suite results
  console.log('📊 Test Suite Results:');
  summary.results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const duration = `${result.duration}ms`;
    console.log(`  ${status} ${result.name.padEnd(20)} (${duration})`);
  });
  
  console.log('');
  console.log('📈 Summary Statistics:');
  console.log(`  Total Test Suites: ${summary.totalSuites}`);
  console.log(`  Passed: ${summary.passedSuites}`);
  console.log(`  Failed: ${summary.failedSuites}`);
  
  if (summary.totalSuites > 0) {
    const successRate = Math.round((summary.passedSuites / summary.totalSuites) * 100);
    console.log(`  Success Rate: ${successRate}%`);
  }
  
  console.log('');
  
  if (summary.failedSuites === 0) {
    console.log('🎉 ALL TESTS PASSED! 🎉');
    console.log('🚀 The system is working correctly across all test suites!');
    console.log('');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log(`💡 ${summary.failedSuites} out of ${summary.totalSuites} test suites failed`);
    console.log('🔧 Please review the output above for specific failure details');
    console.log('');
    
    // Show which suites failed
    const failedSuites = summary.results.filter(r => !r.passed);
    if (failedSuites.length > 0) {
      console.log('❌ Failed test suites:');
      failedSuites.forEach(suite => {
        console.log(`   • ${suite.name}`);
      });
      console.log('');
    }
  }
  
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