#!/usr/bin/env node

import { ProjectAnalyzer } from '../src/analyzer/ProjectAnalyzer.js';

async function testCodeFlow() {
  console.log('🔄 Testing Code Flow Analysis\n');
  
  const analyzer = new ProjectAnalyzer();
  
  try {
    const projectInfo = await analyzer.analyzeProject(process.cwd());
    
    console.log('📊 PROJECT ANALYSIS WITH CODE FLOW:');
    console.log('===================================\n');
    
    console.log('📁 FILE COUNT:', projectInfo.fileCount);
    console.log('📚 MAIN TECHNOLOGIES:', projectInfo.mainTechnologies.join(', '));
    console.log();
    
    if (projectInfo.codeAnalysis.codeFlow) {
      const flow = projectInfo.codeAnalysis.codeFlow;
      
      console.log('🎯 CODE FLOW ANALYSIS:');
      console.log(`• Entry Point: ${flow.entryPoint}`);
      console.log(`• Call Graph: ${flow.callGraph.length} relationships found`);
      console.log();
      
      console.log('📋 EXECUTION ORDER (Story Flow):');
      flow.executionOrder.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item}`);
      });
      console.log();
      
      console.log('🔗 CALL RELATIONSHIPS:');
      flow.callGraph.slice(0, 10).forEach(rel => {
        console.log(`• ${rel.from} → ${rel.to} (${rel.type})`);
      });
      console.log();
      
      console.log('💡 STORY IMPLICATIONS:');
      console.log('• The adventure should start at:', flow.entryPoint);
      console.log('• First area to explore:', flow.executionOrder[1] || 'No imports found');
      console.log('• Key connections:', flow.callGraph.filter(c => c.type === 'import').length, 'imports');
      console.log('• Function calls tracked:', flow.callGraph.filter(c => c.type === 'function-call').length);
      console.log('• Class instantiations:', flow.callGraph.filter(c => c.type === 'class-instantiation').length);
      
    } else {
      console.log('❌ No code flow analysis available');
    }
    
    console.log('\n✅ This flow data will guide the story narrative!');
    
  } catch (error) {
    console.error('❌ Code flow test failed:', error instanceof Error ? error.message : String(error));
  }
}

testCodeFlow().catch(console.error);