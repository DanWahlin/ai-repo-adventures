#!/usr/bin/env tsx
/**
 * Test multi-language parsing capabilities
 */

import { ProjectAnalyzer } from '../src/analyzer/ProjectAnalyzer.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

async function createTestFiles(tmpDir: string) {
  // Create test files in different languages
  
  // JavaScript
  await fs.writeFile(path.join(tmpDir, 'test.js'), `
// JavaScript test file
function calculateSum(a, b) {
  return a + b;
}

class Calculator {
  constructor() {
    this.result = 0;
  }
  
  add(value) {
    this.result += value;
    return this;
  }
}

export const asyncFunction = async () => {
  return await fetch('/api/data');
};
`);

  // TypeScript
  await fs.writeFile(path.join(tmpDir, 'test.ts'), `
// TypeScript test file
interface User {
  id: number;
  name: string;
  email?: string;
}

class UserService {
  private users: User[] = [];
  
  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }
  
  addUser(user: User): void {
    this.users.push(user);
  }
}

export function processData<T>(data: T[]): T[] {
  return data.filter(Boolean);
}
`);

  // Python
  await fs.writeFile(path.join(tmpDir, 'test.py'), `
# Python test file
import asyncio
from typing import List, Optional

class DataProcessor:
    """Process various types of data"""
    
    def __init__(self):
        self.data = []
    
    def process_items(self, items: List[str]) -> List[str]:
        """Process a list of items"""
        return [item.strip() for item in items]
    
    async def fetch_data(self, url: str) -> dict:
        """Fetch data asynchronously"""
        # Simulated async operation
        await asyncio.sleep(1)
        return {"url": url, "status": "success"}

def calculate_statistics(numbers: List[float]) -> dict:
    """Calculate basic statistics"""
    return {
        "mean": sum(numbers) / len(numbers),
        "max": max(numbers),
        "min": min(numbers)
    }

async def main():
    processor = DataProcessor()
    result = await processor.fetch_data("https://api.example.com")
    print(result)
`);

  // Java
  await fs.writeFile(path.join(tmpDir, 'Test.java'), `
// Java test file
package com.example;

import java.util.List;
import java.util.ArrayList;

public class UserManager {
    private List<User> users;
    
    public UserManager() {
        this.users = new ArrayList<>();
    }
    
    public void addUser(User user) {
        users.add(user);
    }
    
    public User findUserById(int id) {
        return users.stream()
            .filter(u -> u.getId() == id)
            .findFirst()
            .orElse(null);
    }
    
    private class User {
        private int id;
        private String name;
        
        public int getId() {
            return id;
        }
    }
}

interface DataService {
    void processData(String data);
    String fetchData(int id);
}
`);

  // C#
  await fs.writeFile(path.join(tmpDir, 'Test.cs'), `
// C# test file
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ExampleApp
{
    public class OrderService
    {
        private readonly List<Order> orders;
        
        public OrderService()
        {
            orders = new List<Order>();
        }
        
        public async Task<Order> GetOrderAsync(int orderId)
        {
            await Task.Delay(100);
            return orders.Find(o => o.Id == orderId);
        }
        
        public void CreateOrder(Order order)
        {
            orders.Add(order);
        }
        
        private decimal CalculateTotal(Order order)
        {
            decimal total = 0;
            foreach (var item in order.Items)
            {
                total += item.Price * item.Quantity;
            }
            return total;
        }
    }
    
    public interface IPaymentProcessor
    {
        Task<bool> ProcessPayment(decimal amount);
        void RefundPayment(string transactionId);
    }
    
    public class Order
    {
        public int Id { get; set; }
        public List<OrderItem> Items { get; set; }
    }
    
    public struct OrderItem
    {
        public string Name;
        public decimal Price;
        public int Quantity;
    }
}
`);

  // Create a simple package.json
  await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'test-project',
    version: '1.0.0',
    dependencies: {
      'express': '^4.18.0',
      'react': '^18.0.0',
      'mongodb': '^5.0.0'
    },
    devDependencies: {
      'jest': '^29.0.0',
      'typescript': '^5.0.0'
    }
  }, null, 2));
}

async function testCodeParsing() {
  console.log('🔍 Testing Multi-language Code Parsing\n');
  console.log('=' .repeat(60));
  
  // Create temporary directory with test files
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tree-sitter-test-'));
  console.log(`📁 Created test directory: ${tmpDir}\n`);
  
  try {
    // Create test files
    await createTestFiles(tmpDir);
    console.log('✅ Created test files in multiple languages\n');
    
    // Analyze the project
    console.log('🔍 Analyzing project with multi-language parser...\n');
    const analyzer = new ProjectAnalyzer();
    const result = await analyzer.analyzeProject(tmpDir);
    
    // Display results
    console.log('📊 Analysis Results:');
    console.log('=' .repeat(60));
    
    console.log(`\n📈 Project Statistics:`);
    console.log(`  • File Count: ${result.fileCount}`);
    console.log(`  • Technologies: ${result.mainTechnologies.join(', ')}`);
    console.log(`  • Has Tests: ${result.hasTests}`);
    console.log(`  • Has Database: ${result.hasDatabase}`);
    console.log(`  • Has API: ${result.hasApi}`);
    
    console.log(`\n📦 Dependencies (${result.codeAnalysis.dependencies.length} total):`);
    result.codeAnalysis.dependencies.slice(0, 5).forEach(dep => {
      console.log(`  • ${dep.name} (${dep.version}) - ${dep.category}`);
    });
    
    console.log(`\n🔧 Functions Found (${result.codeAnalysis.functions.length} total):`);
    const functionsByLang = result.codeAnalysis.functions.reduce((acc, func) => {
      const lang = func.language || 'unknown';
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(functionsByLang).forEach(([lang, count]) => {
      console.log(`  • ${lang}: ${count} functions`);
    });
    
    // Show detailed function analysis from CodeAnalyzer
    console.log('\n📝 DETAILED CodeAnalyzer Function Output:');
    console.log('=' .repeat(80));
    const languages = ['javascript', 'typescript', 'python', 'java', 'csharp'];
    
    for (const lang of languages) {
      const funcs = result.codeAnalysis.functions.filter(f => f.language === lang);
      if (funcs.length > 0) {
        console.log(`\n🔧 ${lang.toUpperCase()} FUNCTIONS (${funcs.length} total):`);
        funcs.forEach((func, index) => {
          console.log(`\n  [${index + 1}] Function: ${func.name}`);
          console.log(`      Summary: ${func.summary}`);
          console.log(`      Parameters: [${func.parameters.join(', ')}]`);
          console.log(`      Return Type: ${func.returnType || 'not detected'}`);
          console.log(`      Async: ${func.isAsync}`);
          console.log(`      Exported: ${func.isExported}`);
          console.log(`      Source: ${func.source}`);
          console.log(`      File: ${func.fileName}`);
          if (func.lineNumber) console.log(`      Line: ${func.lineNumber}`);
        });
      }
    }
    
    console.log(`\n🏗️ Classes Found (${result.codeAnalysis.classes.length} total):`);
    const classesByLang = result.codeAnalysis.classes.reduce((acc, cls) => {
      const lang = cls.language || 'unknown';
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(classesByLang).forEach(([lang, count]) => {
      console.log(`  • ${lang}: ${count} classes/interfaces`);
    });
    
    // Show detailed class analysis from CodeAnalyzer
    console.log('\n📚 DETAILED CodeAnalyzer Class Output:');
    console.log('=' .repeat(80));
    for (const lang of languages) {
      const classes = result.codeAnalysis.classes.filter(c => c.language === lang);
      if (classes.length > 0) {
        console.log(`\n🏗️ ${lang.toUpperCase()} CLASSES (${classes.length} total):`);
        classes.forEach((cls, index) => {
          console.log(`\n  [${index + 1}] Class: ${cls.name}`);
          console.log(`      Summary: ${cls.summary}`);
          console.log(`      Methods: [${cls.methods.join(', ')}]`);
          console.log(`      Properties: [${cls.properties.join(', ')}]`);
          console.log(`      Exported: ${cls.isExported}`);
          console.log(`      Source: ${cls.source}`);
          console.log(`      File: ${cls.fileName}`);
          if (cls.lineNumber) console.log(`      Line: ${cls.lineNumber}`);
        });
      }
    }
    
    // Verify all languages were parsed
    console.log('\n✅ Language Support Verification:');
    const expectedLanguages = ['javascript', 'typescript', 'python', 'java', 'csharp'];
    const parsedLanguages = new Set([
      ...result.codeAnalysis.functions.map(f => f.language),
      ...result.codeAnalysis.classes.map(c => c.language)
    ]);
    
    expectedLanguages.forEach(lang => {
      const isParsed = parsedLanguages.has(lang);
      console.log(`  ${isParsed ? '✅' : '❌'} ${lang}: ${isParsed ? 'Parsed successfully' : 'Not parsed'}`);
    });
    
    // Show exactly what gets passed to the LLM
    console.log('\n🤖 LLM CONTEXT GENERATION:');
    console.log('=' .repeat(80));
    console.log(`\n📊 LLM Context Summary:`);
    console.log(`"${result.llmContextSummary}"`);
    
    console.log(`\n📦 Key Files for LLM Context (${result.codeAnalysis.keyFiles.length} files):`);
    result.codeAnalysis.keyFiles.forEach((file, index) => {
      console.log(`\n  [${index + 1}] ${file.path}`);
      console.log(`      Summary: ${file.summary}`);
      console.log(`      Content Preview: "${file.content.substring(0, 100)}..."`);
    });

    console.log(`\n🔗 Dependencies for LLM Context (${result.codeAnalysis.dependencies.length} total):`);
    result.codeAnalysis.dependencies.slice(0, 10).forEach(dep => {
      console.log(`  • ${dep.name} (${dep.version}) - ${dep.category} [${dep.type}]`);
    });

    console.log(`\n📍 Entry Points for LLM Context:`);
    result.codeAnalysis.entryPoints.forEach(entry => {
      console.log(`  • ${entry}`);
    });

    // Summary
    const allLanguagesParsed = expectedLanguages.every(lang => parsedLanguages.has(lang));
    console.log('\n' + '=' .repeat(60));
    if (allLanguagesParsed) {
      console.log('🎉 SUCCESS: All languages parsed successfully!');
      console.log('📊 The LLM will receive comprehensive context about:');
      console.log('   • Functions and methods from all language files');
      console.log('   • Classes, interfaces, and structures');
      console.log('   • Async/await patterns and return types');
      console.log('   • Dependencies and project structure');
    } else {
      console.log('⚠️  WARNING: Some languages were not parsed');
      console.log('   Check that regex patterns are properly configured');
    }
    
    // Cleanup
    await analyzer.cleanup();
    
  } finally {
    // Clean up temp directory
    await fs.rm(tmpDir, { recursive: true, force: true });
    console.log(`\n🧹 Cleaned up test directory`);
  }
}

// Run the test
testCodeParsing().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});