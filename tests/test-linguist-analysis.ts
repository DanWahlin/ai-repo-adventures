#!/usr/bin/env node

/**
 * LinguistAnalyzer test suite
 * Tests language detection, project insights, and integration with ProjectAnalyzer
 * Validates GitHub Linguist-based analysis capabilities
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { LinguistAnalyzer, type LinguistResult } from '../src/analyzer/linguist-analyzer.js';
import { ProjectAnalyzer } from '../src/analyzer/project-analyzer.js';
import { createTestRunner } from './shared/test-utils.js';

// Test project structures to create
const TEST_PROJECTS = {
  javascript: {
    files: {
      'package.json': JSON.stringify({
        name: 'test-js-project',
        version: '1.0.0',
        main: 'index.js',
        dependencies: { express: '^4.18.0', lodash: '^4.17.0' }
      }),
      'index.js': `
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

module.exports = app;
      `,
      'src/utils.js': `
function formatDate(date) {
  return date.toISOString();
}

const calculateTotal = (items) => {
  return items.reduce((sum, item) => sum + item.price, 0);
};

module.exports = { formatDate, calculateTotal };
      `,
      'README.md': '# JavaScript Test Project\n\nA simple Express.js application.'
    }
  },

  typescript: {
    files: {
      'package.json': JSON.stringify({
        name: 'test-ts-project',
        version: '1.0.0',
        main: 'dist/index.js',
        scripts: { build: 'tsc', start: 'node dist/index.js' },
        dependencies: { express: '^4.18.0' },
        devDependencies: { typescript: '^5.0.0', '@types/express': '^4.17.0' }
      }),
      'tsconfig.json': JSON.stringify({
        compilerOptions: { target: 'ES2020', module: 'commonjs', outDir: './dist' }
      }),
      'src/index.ts': `
import express from 'express';

interface User {
  id: number;
  name: string;
  email: string;
}

class UserService {
  private users: User[] = [];

  async getUser(id: number): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    const user: User = { id: Date.now(), ...userData };
    this.users.push(user);
    return user;
  }
}

export { UserService, User };
      `,
      'src/types.ts': `
export type UserRole = 'admin' | 'user' | 'guest';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending'
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}
      `,
      'README.md': '# TypeScript Test Project\n\nA TypeScript Express application with proper typing.'
    }
  },

  python: {
    files: {
      'requirements.txt': 'flask==2.3.0\nrequests==2.31.0\npandas==2.0.0',
      'main.py': `
from flask import Flask, jsonify
from typing import List, Dict, Optional

app = Flask(__name__)

class UserService:
    def __init__(self):
        self._users: List[Dict] = []
    
    async def get_user(self, user_id: int) -> Optional[Dict]:
        """Fetch user by ID"""
        return next((user for user in self._users if user['id'] == user_id), None)
    
    def create_user(self, name: str, email: str) -> Dict:
        user = {
            'id': len(self._users) + 1,
            'name': name,
            'email': email
        }
        self._users.append(user)
        return user

@app.route('/users/<int:user_id>')
def get_user_route(user_id: int):
    service = UserService()
    user = service.get_user(user_id)
    return jsonify(user) if user else jsonify({'error': 'User not found'}), 404

if __name__ == '__main__':
    app.run(debug=True)
      `,
      'utils/helpers.py': `
import datetime
from typing import Any, List

def format_timestamp(timestamp: float) -> str:
    """Convert timestamp to ISO format"""
    return datetime.datetime.fromtimestamp(timestamp).isoformat()

def calculate_average(numbers: List[float]) -> float:
    """Calculate average of a list of numbers"""
    return sum(numbers) / len(numbers) if numbers else 0.0

class DataProcessor:
    @staticmethod
    def clean_data(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove null values from data"""
        return [{k: v for k, v in item.items() if v is not None} for item in data]
      `,
      'README.md': '# Python Test Project\n\nA Flask web application with data processing utilities.'
    }
  },

  mixed: {
    files: {
      'package.json': JSON.stringify({
        name: 'mixed-language-project',
        version: '1.0.0',
        scripts: { 
          start: 'node index.js',
          'start:python': 'python app.py'
        }
      }),
      'index.js': `
const express = require('express');
const { spawn } = require('child_process');

const app = express();

app.get('/python-data', (req, res) => {
  const python = spawn('python', ['scripts/data_processor.py']);
  python.stdout.on('data', (data) => {
    res.json({ result: data.toString() });
  });
});
      `,
      'app.py': `
from flask import Flask
import subprocess

app = Flask(__name__)

@app.route('/node-data')
def get_node_data():
    result = subprocess.run(['node', 'scripts/processor.js'], capture_output=True, text=True)
    return {'result': result.stdout}
      `,
      'scripts/data_processor.py': `
import json
import sys

def process_data(data):
    return {'processed': True, 'count': len(data)}

if __name__ == '__main__':
    data = json.loads(sys.stdin.read())
    result = process_data(data)
    print(json.dumps(result))
      `,
      'scripts/processor.js': `
const data = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const result = { processed: true, timestamp: Date.now(), data };
console.log(JSON.stringify(result));
      `,
      'src/Component.tsx': `
import React, { useState, useEffect } from 'react';

interface Props {
  title: string;
  items: string[];
}

const DataDisplay: React.FC<Props> = ({ title, items }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{title}</h1>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

export default DataDisplay;
      `,
      'styles.css': `
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  background-color: #333;
  color: white;
  text-align: center;
  padding: 1rem;
}

.content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;
  margin-top: 20px;
}
      `,
      'README.md': '# Mixed Language Project\n\nA full-stack application using Node.js, Python, React, and CSS.'
    }
  }
};

async function createTempProject(projectConfig: typeof TEST_PROJECTS[keyof typeof TEST_PROJECTS]): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'linguist-test-'));
  
  for (const [filePath, content] of Object.entries(projectConfig.files)) {
    const fullPath = path.join(tempDir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  }
  
  return tempDir;
}

async function cleanupTempProject(projectPath: string): Promise<void> {
  try {
    await fs.rm(projectPath, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to cleanup temp project ${projectPath}:`, error);
  }
}

async function runLinguistAnalysisTests() {
  console.log('🔍 Testing LinguistAnalyzer Capabilities\n');
  const { test, printResults } = await createTestRunner('LinguistAnalyzer Tests');

  const config = {
    maxDepth: 3,
    maxFileSizeMB: 10,
    timeoutMs: 30000,
    keySourceFiles: 10,
    topFunctions: 20,
    topClasses: 5,
    topDependencies: 20,
    summaryLines: 10
  };

  // Test language detection accuracy
  console.log('🎯 Testing Language Detection Accuracy');
  console.log('-'.repeat(50));

  await test('JavaScript project language detection', async () => {
    const projectPath = await createTempProject(TEST_PROJECTS.javascript);
    let result: LinguistResult | null = null;
    
    try {
      const analyzer = await LinguistAnalyzer.getInstance(config);
      result = await analyzer.analyzeDirectory(projectPath);
      
      console.log('Detected languages:', result.detectedLanguages);
      console.log('Primary language:', result.primaryLanguage);
      console.log('Language distribution:');
      result.languageDistribution.forEach(lang => {
        console.log(`  ${lang.language}: ${lang.percentage}% (${lang.files} files, ${lang.bytes} bytes)`);
      });
      
      return {
        foundJavaScript: result.detectedLanguages.includes('JavaScript'),
        correctPrimary: result.primaryLanguage === 'JavaScript',
        foundJSON: result.detectedLanguages.includes('JSON'),
        foundMarkdown: result.detectedLanguages.includes('Markdown'),
        totalLanguages: result.languageCount
      };
    } finally {
      await cleanupTempProject(projectPath);
    }
  });

  await test('TypeScript project language detection', async () => {
    const projectPath = await createTempProject(TEST_PROJECTS.typescript);
    let result: LinguistResult | null = null;
    
    try {
      const analyzer = await LinguistAnalyzer.getInstance(config);
      result = await analyzer.analyzeDirectory(projectPath);
      
      console.log('Detected languages:', result.detectedLanguages);
      console.log('Primary language:', result.primaryLanguage);
      console.log('TypeScript percentage:', 
        result.languageDistribution.find(l => l.language === 'TypeScript')?.percentage || 0);
      
      return {
        foundTypeScript: result.detectedLanguages.includes('TypeScript'),
        correctPrimary: result.primaryLanguage === 'TypeScript',
        foundJSON: result.detectedLanguages.includes('JSON'),
        highTSPercentage: (result.languageDistribution.find(l => l.language === 'TypeScript')?.percentage || 0) > 50
      };
    } finally {
      await cleanupTempProject(projectPath);
    }
  });

  await test('Python project language detection', async () => {
    const projectPath = await createTempProject(TEST_PROJECTS.python);
    let result: LinguistResult | null = null;
    
    try {
      const analyzer = await LinguistAnalyzer.getInstance(config);
      result = await analyzer.analyzeDirectory(projectPath);
      
      console.log('Detected languages:', result.detectedLanguages);
      console.log('Primary language:', result.primaryLanguage);
      
      return {
        foundPython: result.detectedLanguages.includes('Python'),
        correctPrimary: result.primaryLanguage === 'Python',
        foundMarkdown: result.detectedLanguages.includes('Markdown'),
        reasonableFileCount: result.totalFiles >= 3
      };
    } finally {
      await cleanupTempProject(projectPath);
    }
  });

  // Test project type classification
  console.log('\n🏗️ Testing Project Type Classification');
  console.log('-'.repeat(50));

  await test('Mixed language project insights', async () => {
    const projectPath = await createTempProject(TEST_PROJECTS.mixed);
    let result: LinguistResult | null = null;
    
    try {
      const analyzer = await LinguistAnalyzer.getInstance(config);
      result = await analyzer.analyzeDirectory(projectPath);
      const insights = analyzer.getProjectInsights(result);
      
      console.log('Project insights:', insights);
      console.log('Detected languages:', result.detectedLanguages);
      console.log('Tech stack:', insights.techStack);
      console.log('Complexity:', insights.complexity);
      console.log('Recommendations:', insights.recommendations);
      
      return {
        multipleLanguages: result.languageCount >= 3,
        foundJavaScript: result.detectedLanguages.includes('JavaScript'),
        foundPython: result.detectedLanguages.includes('Python'),
        foundTSX: result.detectedLanguages.includes('TSX') || result.detectedLanguages.includes('TypeScript'),
        foundCSS: result.detectedLanguages.includes('CSS'),
        correctComplexity: insights.complexity === 'high' || insights.complexity === 'medium',
        hasRecommendations: insights.recommendations.length > 0,
        identifiedTechStack: insights.techStack.length > 0
      };
    } finally {
      await cleanupTempProject(projectPath);
    }
  });

  // Test language compatibility mapping
  console.log('\n🔗 Testing Language Compatibility Mapping');
  console.log('-'.repeat(50));

  await test('Language compatibility with CodeAnalyzer', async () => {
    const analyzer = await LinguistAnalyzer.getInstance(config);
    
    const testLanguages = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Go', 'Rust', 'PHP'];
    const compatibilityResults = testLanguages.map(lang => {
      const compat = analyzer.getLanguageCompatibility(lang);
      console.log(`${lang}: ${compat.isSupported ? 'Supported' : 'Not supported'} -> ${compat.codeAnalyzerLanguage || 'N/A'} (${compat.confidence})`);
      return { language: lang, ...compat };
    });
    
    const supportedLanguages = compatibilityResults.filter(r => r.isSupported);
    const highConfidenceLanguages = compatibilityResults.filter(r => r.confidence === 'high');
    
    return {
      supportedCount: supportedLanguages.length,
      highConfidenceCount: highConfidenceLanguages.length,
      supportsJavaScript: supportedLanguages.some(l => l.language === 'JavaScript'),
      supportsTypeScript: supportedLanguages.some(l => l.language === 'TypeScript'),
      supportsPython: supportedLanguages.some(l => l.language === 'Python'),
      totalTested: testLanguages.length
    };
  });

  // Test file-level language detection
  console.log('\n📄 Testing File-Level Language Detection');
  console.log('-'.repeat(50));

  await test('Single file language detection', async () => {
    const analyzer = await LinguistAnalyzer.getInstance(config);
    
    const testFiles = [
      'app.js',
      'component.tsx', 
      'main.py',
      'service.java',
      'controller.cs',
      'main.go',
      'lib.rs',
      'style.css',
      'index.html',
      'config.json',
      'readme.md'
    ];
    
    const detectionResults: Array<{ file: string; detected: string | null }> = [];
    
    for (const file of testFiles) {
      const detected = await analyzer.analyzeFile(`/tmp/${file}`);
      detectionResults.push({ file, detected });
      console.log(`${file} -> ${detected || 'Unknown'}`);
    }
    
    const successfulDetections = detectionResults.filter(r => r.detected !== null);
    
    return {
      totalFiles: testFiles.length,
      successfulDetections: successfulDetections.length,
      detectionRate: successfulDetections.length / testFiles.length,
      detectedJavaScript: successfulDetections.some(r => r.file === 'app.js' && r.detected === 'JavaScript'),
      detectedTypeScript: successfulDetections.some(r => r.file === 'component.tsx' && r.detected === 'TypeScript'),
      detectedPython: successfulDetections.some(r => r.file === 'main.py' && r.detected === 'Python')
    };
  });

  // Test integration with ProjectAnalyzer
  console.log('\n🔄 Testing Integration with ProjectAnalyzer');
  console.log('-'.repeat(50));

  await test('ProjectAnalyzer integration', async () => {
    const projectPath = await createTempProject(TEST_PROJECTS.typescript);
    let projectInfo;
    
    try {
      const projectAnalyzer = new ProjectAnalyzer(config);
      projectInfo = await projectAnalyzer.analyzeProject(projectPath);
      
      console.log('Project type:', projectInfo.type);
      console.log('Main technologies:', projectInfo.mainTechnologies);
      console.log('File count:', projectInfo.fileCount);
      console.log('LLM context summary preview:', projectInfo.llmContextSummary?.substring(0, 200) + '...');
      
      // Check if linguist data enhanced the analysis
      const hasLanguageDistribution = projectInfo.llmContextSummary?.includes('Language distribution:') || false;
      const hasPrimaryLanguage = projectInfo.llmContextSummary?.includes('Primary language:') || false;
      
      await projectAnalyzer.cleanup();
      
      return {
        correctProjectType: projectInfo.type.includes('TypeScript') || projectInfo.type.includes('Node.js'),
        foundTechnologies: projectInfo.mainTechnologies.length > 0,
        hasFileCount: projectInfo.fileCount > 0,
        hasLLMSummary: !!projectInfo.llmContextSummary,
        enhancedWithLinguist: hasLanguageDistribution && hasPrimaryLanguage,
        foundClasses: projectInfo.codeAnalysis.classes.length > 0,
        foundFunctions: projectInfo.codeAnalysis.functions.length > 0
      };
    } finally {
      await cleanupTempProject(projectPath);
    }
  });

  // Test error handling and edge cases
  console.log('\n⚠️ Testing Error Handling and Edge Cases');
  console.log('-'.repeat(50));

  await test('Empty directory handling', async () => {
    const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'empty-test-'));
    
    try {
      const analyzer = await LinguistAnalyzer.getInstance(config);
      const result = await analyzer.analyzeDirectory(emptyDir);
      
      console.log('Empty directory result:', {
        languages: result.detectedLanguages.length,
        files: result.totalFiles,
        bytes: result.totalBytes
      });
      
      return {
        handlesEmpty: true,
        noLanguages: result.detectedLanguages.length === 0,
        noFiles: result.totalFiles === 0,
        noBytes: result.totalBytes === 0
      };
    } finally {
      await cleanupTempProject(emptyDir);
    }
  });

  await test('Invalid directory handling', async () => {
    const analyzer = await LinguistAnalyzer.getInstance(config);
    const result = await analyzer.analyzeDirectory('/non/existent/directory');
    
    console.log('Invalid directory result:', {
      languages: result.detectedLanguages.length,
      files: result.totalFiles
    });
    
    return {
      handlesInvalid: true,
      returnsEmptyResult: result.detectedLanguages.length === 0 && result.totalFiles === 0
    };
  });

  printResults();
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runLinguistAnalysisTests().catch(error => {
    console.error('💥 LinguistAnalyzer test failed:', error);
    process.exit(1);
  });
}

export { runLinguistAnalysisTests };