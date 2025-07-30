#!/usr/bin/env node

import { ProjectAnalyzer } from '../src/analyzer/ProjectAnalyzer.js';

async function testDetailedAnalysis() {
  console.log('🔍 Testing Enhanced Project Analysis\n');
  
  const analyzer = new ProjectAnalyzer();
  
  try {
    const projectInfo = await analyzer.analyzeProject(process.cwd());
    
    console.log('📊 ENHANCED PROJECT ANALYSIS RESULTS:');
    console.log('=====================================\n');
    
    console.log('🎯 BASIC INFO:');
    console.log(`• Project Type: ${projectInfo.type}`);
    console.log(`• File Count: ${projectInfo.fileCount}`);
    console.log(`• Technologies: ${projectInfo.mainTechnologies.join(', ')}\n`);
    
    console.log('🔧 FUNCTIONS DETECTED:');
    projectInfo.codeAnalysis.functions.slice(0, 10).forEach(f => {
      console.log(`• ${f.name}() in ${f.fileName}`);
      console.log(`  └─ ${f.summary}`);
      console.log(`  └─ ${f.isAsync ? 'Async' : 'Sync'}, ${f.isExported ? 'Exported' : 'Internal'}`);
    });
    console.log();
    
    console.log('🏗️ CLASSES DETECTED:');
    projectInfo.codeAnalysis.classes.forEach(c => {
      console.log(`• ${c.name} in ${c.fileName}`);
      console.log(`  └─ ${c.summary}`);
      console.log(`  └─ Methods: ${c.methods.join(', ')}`);
    });
    console.log();
    
    console.log('📦 DEPENDENCIES BY CATEGORY:');
    const depsByCategory = projectInfo.codeAnalysis.dependencies.reduce((acc, dep) => {
      if (!acc[dep.category]) acc[dep.category] = [];
      acc[dep.category].push(dep.name);
      return acc;
    }, {} as Record<string, string[]>);
    
    Object.entries(depsByCategory).forEach(([category, deps]) => {
      console.log(`• ${category}: ${deps.join(', ')}`);
    });
    console.log();
    
    console.log('🚪 ENTRY POINTS:');
    projectInfo.codeAnalysis.entryPoints.forEach(entry => {
      console.log(`• ${entry}`);
    });
    console.log();
    
    console.log('📄 KEY FILES WITH ANALYSIS:');
    projectInfo.codeAnalysis.keyFiles.forEach(file => {
      console.log(`• ${file.path}`);
      console.log(`  └─ ${file.summary}`);
    });
    console.log();
    
    console.log('🎉 This rich analysis data is now passed to the LLM for story generation!');
    console.log('The LLM can create characters based on real classes like:', 
      projectInfo.codeAnalysis.classes.slice(0, 3).map(c => c.name).join(', '));
    console.log('And reference actual functions like:', 
      projectInfo.codeAnalysis.functions.slice(0, 3).map(f => f.name).join(', '));
    
  } catch (error) {
    console.error('❌ Analysis failed:', error instanceof Error ? error.message : String(error));
  }
}

testDetailedAnalysis().catch(console.error);