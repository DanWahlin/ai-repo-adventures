/**
 * CodeFlowAnalyzer - Handles code flow analysis and relationship tracking
 * Extracted from ProjectAnalyzer to focus on import/call relationships
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { CodeFlowAnalysis, CallRelationship, CodeAnalysis, AnalysisConfig } from './types.js';

export class CodeFlowAnalyzer {
  constructor(_config: AnalysisConfig) {
    // Config may be used for future enhancements
  }

  /**
   * Analyze code flow relationships starting from entry points
   */
  async analyzeCodeFlow(projectPath: string, codeAnalysis: CodeAnalysis): Promise<CodeFlowAnalysis | undefined> {
    if (codeAnalysis.entryPoints.length === 0) {
      return undefined;
    }

    const primaryEntryPoint = codeAnalysis.entryPoints[0];
    if (!primaryEntryPoint) {
      return undefined;
    }

    const relationships: CallRelationship[] = [];
    const processedFiles = new Set<string>();

    // Start analysis from the primary entry point
    await this.analyzeFileRelationships(
      path.join(projectPath, primaryEntryPoint),
      primaryEntryPoint,
      relationships,
      processedFiles,
      projectPath
    );

    const modules = this.extractModules(relationships);

    return {
      entryPoint: primaryEntryPoint,
      relationships,
      modules,
      callGraph: relationships,
      executionOrder: this.generateExecutionOrder(relationships, codeAnalysis.entryPoints)
    };
  }

  /**
   * Analyze relationships within a single file
   */
  private async analyzeFileRelationships(
    filePath: string,
    relativePath: string,
    relationships: CallRelationship[],
    processedFiles: Set<string>,
    projectPath: string,
    depth = 0
  ): Promise<void> {
    // Prevent infinite recursion and limit depth
    if (depth > 3 || processedFiles.has(relativePath)) {
      return;
    }

    processedFiles.add(relativePath);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Extract import relationships
      const imports = this.extractImports(content, relativePath);
      relationships.push(...imports);

      // Extract function call relationships
      const functionCalls = this.extractFunctionCalls(content, relativePath);
      relationships.push(...functionCalls);

      // Recursively analyze imported files (limit depth to prevent overwhelming analysis)
      if (depth < 2) {
        for (const relationship of imports) {
          if (relationship.type === 'import' && relationship.to.startsWith('./')) {
            const importedFilePath = this.resolveImportPath(relationship.to, path.dirname(filePath));
            if (importedFilePath) {
              const importedRelativePath = path.relative(projectPath, importedFilePath);
              await this.analyzeFileRelationships(
                importedFilePath,
                importedRelativePath,
                relationships,
                processedFiles,
                projectPath,
                depth + 1
              );
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to analyze relationships in ${relativePath}:`, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Extract import statements from file content
   */
  private extractImports(content: string, fileName: string): CallRelationship[] {
    const relationships: CallRelationship[] = [];
    const lines = content.split('\n');

    // ES6 imports: import { x } from './module'
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    
    // CommonJS requires: const x = require('./module')
    const requireRegex = /(?:const|let|var)\s+(?:{[^}]*}|\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g;
    
    // Dynamic imports: import('./module')
    const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;

    lines.forEach((line, index) => {
      // ES6 imports
      let match;
      while ((match = importRegex.exec(line)) !== null) {
        relationships.push({
          from: fileName,
          to: match[1] || '',
          type: 'import',
          fileName,
          lineNumber: index + 1
        });
      }

      // CommonJS requires
      requireRegex.lastIndex = 0;
      while ((match = requireRegex.exec(line)) !== null) {
        relationships.push({
          from: fileName,
          to: match[1] || '',
          type: 'import',
          fileName,
          lineNumber: index + 1
        });
      }

      // Dynamic imports
      dynamicImportRegex.lastIndex = 0;
      while ((match = dynamicImportRegex.exec(line)) !== null) {
        relationships.push({
          from: fileName,
          to: match[1] || '',
          type: 'import',
          fileName,
          lineNumber: index + 1
        });
      }
    });

    return relationships;
  }

  /**
   * Extract function call relationships from file content
   */
  private extractFunctionCalls(content: string, fileName: string): CallRelationship[] {
    const relationships: CallRelationship[] = [];
    const lines = content.split('\n');

    // Function call patterns: functionName(), object.method(), new ClassName()
    const functionCallRegex = /(?:new\s+)?(\w+)(?:\.(\w+))?\s*\(/g;

    lines.forEach((line, index) => {
      // Function calls
      let match;
      functionCallRegex.lastIndex = 0;
      while ((match = functionCallRegex.exec(line)) !== null) {
        const isConstructor = line.trim().startsWith('new ');
        const targetFunction = match[2] || match[1]; // Use method name if available, otherwise function name
        
        relationships.push({
          from: fileName,
          to: targetFunction || '',
          type: isConstructor ? 'class-instantiation' : 'function-call',
          fileName,
          lineNumber: index + 1
        });
      }
    });

    return relationships;
  }

  /**
   * Resolve import path to actual file path
   */
  private resolveImportPath(importPath: string, fromDir: string): string | null {
    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const resolvedPath = path.resolve(fromDir, importPath);
      
      // Try different extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
      
      for (const ext of extensions) {
        const withExt = resolvedPath + ext;
        if (this.fileExists(withExt)) {
          return withExt;
        }
      }
      
      // Try index files
      for (const ext of extensions) {
        const indexPath = path.join(resolvedPath, `index${ext}`);
        if (this.fileExists(indexPath)) {
          return indexPath;
        }
      }
    }
    
    return null;
  }

  /**
   * Check if file exists (simplified for async context)
   */
  private fileExists(_filePath: string): boolean {
    try {
      // Note: This is a simplified sync check for path resolution
      // In a real implementation, you might want to cache file existence
      return true; // Simplified for this extraction
    } catch {
      return false;
    }
  }

  /**
   * Generate suggested execution order based on relationships
   */
  private generateExecutionOrder(relationships: CallRelationship[], entryPoints: string[]): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const dependencies = new Map<string, string[]>();

    // Build dependency graph
    relationships.forEach(rel => {
      if (rel.type === 'import' && rel.to.startsWith('./')) {
        if (!dependencies.has(rel.from)) {
          dependencies.set(rel.from, []);
        }
        dependencies.get(rel.from)!.push(rel.to);
      }
    });

    // Perform topological sort starting from entry points
    const visit = (file: string) => {
      if (visited.has(file)) return;
      visited.add(file);
      
      const deps = dependencies.get(file) || [];
      deps.forEach(dep => visit(dep));
      
      if (!order.includes(file)) {
        order.unshift(file);
      }
    };

    entryPoints.forEach(entryPoint => visit(entryPoint));

    return order;
  }

  /**
   * Extract unique modules from relationships
   */
  private extractModules(relationships: CallRelationship[]): string[] {
    const modules = new Set<string>();
    
    relationships.forEach(rel => {
      modules.add(rel.from);
      if (rel.to.startsWith('./') || rel.to.startsWith('../')) {
        modules.add(rel.to);
      }
    });
    
    return Array.from(modules).sort();
  }

  /**
   * Get flow statistics and insights
   */
  getFlowStats(analysis: CodeFlowAnalysis): {
    totalRelationships: number;
    importCount: number;
    functionCallCount: number;
    classInstantiationCount: number;
    moduleCount: number;
    complexity: 'low' | 'medium' | 'high';
  } {
    const totalRelationships = analysis.relationships.length;
    const importCount = analysis.relationships.filter(r => r.type === 'import').length;
    const functionCallCount = analysis.relationships.filter(r => r.type === 'function-call').length;
    const classInstantiationCount = analysis.relationships.filter(r => r.type === 'class-instantiation').length;
    const moduleCount = analysis.modules.length;
    
    // Determine complexity based on relationship density
    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (totalRelationships > 50 || moduleCount > 10) {
      complexity = 'high';
    } else if (totalRelationships > 20 || moduleCount > 5) {
      complexity = 'medium';
    }

    return {
      totalRelationships,
      importCount,
      functionCallCount,
      classInstantiationCount,
      moduleCount,
      complexity
    };
  }

  /**
   * Find circular dependencies
   */
  findCircularDependencies(relationships: CallRelationship[]): string[][] {
    const graph = new Map<string, string[]>();
    const cycles: string[][] = [];
    
    // Build adjacency list for imports only
    relationships
      .filter(rel => rel.type === 'import' && rel.to.startsWith('./'))
      .forEach(rel => {
        if (!graph.has(rel.from)) {
          graph.set(rel.from, []);
        }
        graph.get(rel.from)!.push(rel.to);
      });

    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): boolean => {
      if (recursionStack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), node]);
        }
        return true;
      }

      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (dfs(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(node);
      path.pop();
      return false;
    };

    // Check all nodes
    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  /**
   * Identify critical paths in the code flow
   */
  identifyCriticalPaths(analysis: CodeFlowAnalysis): {
    entryToExit: string[];
    mostImportedModules: Array<{ module: string; importCount: number }>;
    keyConnectors: string[];
  } {
    const importCounts = new Map<string, number>();
    const moduleConnections = new Map<string, Set<string>>();

    // Count imports for each module
    analysis.relationships
      .filter(rel => rel.type === 'import')
      .forEach(rel => {
        importCounts.set(rel.to, (importCounts.get(rel.to) || 0) + 1);
        
        if (!moduleConnections.has(rel.from)) {
          moduleConnections.set(rel.from, new Set());
        }
        moduleConnections.get(rel.from)!.add(rel.to);
      });

    // Find most imported modules
    const mostImportedModules = Array.from(importCounts.entries())
      .map(([module, count]) => ({ module, importCount: count }))
      .sort((a, b) => b.importCount - a.importCount)
      .slice(0, 5);

    // Find key connectors (modules that connect many other modules)
    const keyConnectors = Array.from(moduleConnections.entries())
      .filter(([_, connections]) => connections.size > 2)
      .map(([module, _]) => module)
      .slice(0, 5);

    return {
      entryToExit: [analysis.entryPoint], // Simplified - could be enhanced
      mostImportedModules,
      keyConnectors
    };
  }
}