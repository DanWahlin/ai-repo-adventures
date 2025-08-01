import { ProjectAnalyzer } from '../src/analyzer/ProjectAnalyzer';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAnalysisDetails() {
  console.log('🔍 Testing Project Analysis with Code Flow...\n');

  // Test on the current project
  const analyzer = new ProjectAnalyzer();
  const projectPath = path.resolve(__dirname, '..');
  
  console.log(`📁 Analyzing project: ${projectPath}\n`);

  try {
    const analysis = await analyzer.analyzeProject(projectPath);
    
    // Basic project info
    console.log('📊 Project Analysis Results:');
    console.log('=' + '='.repeat(50));
    console.log(`Project Type: ${analysis.type}`);
    console.log(`Total Files: ${analysis.fileCount}`);
    console.log(`Has Tests: ${analysis.hasTests}`);
    console.log(`Has Database: ${analysis.hasDatabase}`);
    console.log(`Has API: ${analysis.hasApi}`);
    console.log(`Has Frontend: ${analysis.hasFrontend}`);

    // Print LLM context summary if present
    if (analysis.llmContextSummary) {
      console.log('\n🧠 LLM Context Summary:');
      console.log('-'.repeat(40));
      console.log(analysis.llmContextSummary);
      console.log('-'.repeat(40));
    }

    // Technologies detected
    console.log('\n🛠️  Technologies Detected:');
    analysis.mainTechnologies.forEach(tech => {
      console.log(`  - ${tech}`);
    });

    // Code structure details
    console.log('\n📝 Code Structure Analysis:');
    console.log(`Total Functions: ${analysis.codeAnalysis.functions.length}`);
    console.log(`Total Classes: ${analysis.codeAnalysis.classes.length}`);

    // Function details
    if (analysis.codeAnalysis.functions.length > 0) {
      console.log('\n🔧 Functions Found:');
      const functionsByFile = analysis.codeAnalysis.functions.reduce((acc, func) => {
        if (!acc[func.fileName]) acc[func.fileName] = [];
        acc[func.fileName].push(func);
        return acc;
      }, {} as Record<string, typeof analysis.codeAnalysis.functions>);

      Object.entries(functionsByFile).slice(0, 5).forEach(([file, funcs]) => {
        console.log(`\n  📄 ${path.relative(projectPath, file)}:`);
        funcs.slice(0, 3).forEach(func => {
          console.log(`    └─ ${func.name} (line ${func.lineNumber || 'unknown'})`);
          if (func.parameters && func.parameters.length > 0) {
            console.log(`       Params: ${func.parameters.join(', ')}`);
          }
        });
      });
    }

    // Class details
    if (analysis.codeAnalysis.classes.length > 0) {
      console.log('\n🏗️  Classes Found:');
      const classesByFile = analysis.codeAnalysis.classes.reduce((acc, cls) => {
        if (!acc[cls.fileName]) acc[cls.fileName] = [];
        acc[cls.fileName].push(cls);
        return acc;
      }, {} as Record<string, typeof analysis.codeAnalysis.classes>);

      Object.entries(classesByFile).slice(0, 5).forEach(([file, classes]) => {
        console.log(`\n  📄 ${path.relative(projectPath, file)}:`);
        classes.slice(0, 3).forEach(cls => {
          console.log(`    └─ ${cls.name} (line ${cls.lineNumber || 'unknown'})`);
          if (cls.methods && cls.methods.length > 0) {
            console.log(`       Methods: ${cls.methods.slice(0, 3).join(', ')}${cls.methods.length > 3 ? '...' : ''}`);
          }
        });
      });
    }

    // Code flow analysis
    console.log('\n🔀 Code Flow Analysis:');
    
    // Code flow analysis
    if (analysis.codeAnalysis.codeFlow) {
      console.log(`\n🚪 Main Entry Point: ${analysis.codeAnalysis.codeFlow.entryPoint}`);
      
      // Show call relationships
      const callRelationships = analysis.codeAnalysis.codeFlow.callGraph;
      if (callRelationships.length > 0) {
        console.log('\n📊 Call Relationships (first 10):');
        callRelationships.slice(0, 10).forEach(rel => {
          console.log(`  ${rel.from} → ${rel.to} (${rel.type})`);
        });
      }
      
      // Show execution order
      const execOrder = analysis.codeAnalysis.codeFlow.executionOrder;
      if (execOrder.length > 0) {
        console.log('\n🔢 Suggested Exploration Order:');
        execOrder.slice(0, 5).forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item}`);
        });
      }
    }

    // Show important files
    if (analysis.structure.importantFiles.length > 0) {
      console.log('\n📌 Important Files:');
      analysis.structure.importantFiles.slice(0, 5).forEach(file => {
        console.log(`  - ${file}`);
      });
    }

    // Pattern detection
    console.log('\n🔍 Code Patterns Detected:');
    
    // Check for async patterns
    const asyncFunctions = analysis.codeAnalysis.functions.filter(f => f.isAsync);
    if (asyncFunctions.length > 0) {
      console.log(`  - Async functions: ${asyncFunctions.length}`);
    }

    // Check for exported patterns
    const exportedFunctions = analysis.codeAnalysis.functions.filter(f => f.isExported);
    if (exportedFunctions.length > 0) {
      console.log(`  - Exported functions: ${exportedFunctions.length}`);
    }

    // Check source types
    const sourceTypes = new Map<string, number>();
    analysis.codeAnalysis.functions.forEach(f => {
      sourceTypes.set(f.source, (sourceTypes.get(f.source) || 0) + 1);
    });
    if (sourceTypes.size > 0) {
      console.log(`  - Analysis sources:`);
      sourceTypes.forEach((count, source) => {
        console.log(`    • ${source}: ${count} functions`);
      });
    }

    console.log('\n✅ Analysis complete!');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run the test
testAnalysisDetails().catch(console.error);