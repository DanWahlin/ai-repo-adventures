#!/usr/bin/env node

import { ProjectAnalyzer } from '../src/analyzer/ProjectAnalyzer.js';

async function testPerformance() {
  console.log('⏱️ Testing Performance of Enhanced Analysis with Tree-Sitter\n');
  
  const analyzer = new ProjectAnalyzer();
  
  try {
    // Test 1: Measure time for full analysis
    console.log('📊 Running full project analysis...');
    const startTime = performance.now();
    
    const projectInfo = await analyzer.analyzeProject(process.cwd());
    
    const endTime = performance.now();
    const analysisTime = endTime - startTime;
    
    console.log(`✅ Analysis completed in ${analysisTime.toFixed(2)}ms\n`);
    
    // Display results
    console.log('📈 ANALYSIS RESULTS:');
    console.log(`• Total files: ${projectInfo.fileCount}`);
    console.log(`• Functions detected: ${projectInfo.codeAnalysis.functions.length}`);
    console.log(`• Classes detected: ${projectInfo.codeAnalysis.classes.length}`);
    console.log(`• Dependencies: ${projectInfo.codeAnalysis.dependencies.length}`);
    console.log(`• Key files analyzed: ${projectInfo.codeAnalysis.keyFiles.length}\n`);
    
    // Show breakdown by source
    const functionSources = projectInfo.codeAnalysis.functions.reduce((acc, f) => {
      acc[f.source] = (acc[f.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('🔍 FUNCTION DETECTION SOURCES:');
    Object.entries(functionSources).forEach(([source, count]) => {
      console.log(`• ${source}: ${count} functions`);
    });
    
    // Show languages detected
    const languages = new Set(projectInfo.codeAnalysis.functions.map(f => f.language).filter(Boolean));
    console.log(`\n🌐 LANGUAGES DETECTED: ${Array.from(languages).join(', ')}`);
    
    // Performance assessment
    console.log('\n⚡ PERFORMANCE ASSESSMENT:');
    if (analysisTime < 100) {
      console.log('✅ EXCELLENT: Analysis completed in under 100ms');
    } else if (analysisTime < 500) {
      console.log('✅ GOOD: Analysis completed in under 500ms');
    } else if (analysisTime < 1000) {
      console.log('⚠️ ACCEPTABLE: Analysis completed in under 1 second');
    } else {
      console.log('❌ SLOW: Analysis took over 1 second');
    }
    
    // Show some detected functions
    console.log('\n📝 SAMPLE FUNCTIONS DETECTED:');
    projectInfo.codeAnalysis.functions
      .filter(f => f.name !== 'anonymous')
      .slice(0, 5)
      .forEach(f => {
        console.log(`• ${f.name}() in ${f.fileName}`);
        console.log(`  └─ ${f.summary}`);
        console.log(`  └─ Source: ${f.source}, Language: ${f.language}`);
      });
    
  } catch (error) {
    console.error('❌ Performance test failed:', error instanceof Error ? error.message : String(error));
  }
}

testPerformance().catch(console.error);