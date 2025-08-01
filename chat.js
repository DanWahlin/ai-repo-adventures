#!/usr/bin/env node

// Simple launcher script for the interactive client
console.log('🚀 Starting MCP Repo Adventure Chat...\n');

const { spawn } = require('child_process');
const path = require('path');

// First build the project
console.log('📦 Building project...');
const build = spawn('npm', ['run', 'build'], { 
  stdio: 'inherit',
  shell: true 
});

build.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Build failed!');
    process.exit(1);
  }

  console.log('✅ Build complete!\n');
  
  // Then start the interactive client
  const chat = spawn('npx', ['tsx', 'tests/interactive-client.ts'], { 
    stdio: 'inherit',
    shell: true 
  });

  chat.on('close', (code) => {
    process.exit(code);
  });
});