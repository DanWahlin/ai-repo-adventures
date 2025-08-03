/**
 * DependencyParser - Handles package.json analysis and dependency categorization
 * Extracted from ProjectAnalyzer to focus on dependency management
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { DependencyInfo, AnalysisConfig } from './types.js';

export class DependencyParser {
  constructor(_config: AnalysisConfig) {
    // Config may be used for future enhancements
  }

  /**
   * Parse dependencies from package.json and categorize them
   */
  async parseDependencies(projectPath: string): Promise<DependencyInfo[]> {
    const dependencies: DependencyInfo[] = [];
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);
      
      // Parse regular dependencies
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
          dependencies.push({
            name,
            version: version as string,
            type: 'dependency',
            category: this.categorizeDependency(name)
          });
        }
      }
      
      // Parse dev dependencies
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
          dependencies.push({
            name,
            version: version as string,
            type: 'devDependency',
            category: this.categorizeDependency(name)
          });
        }
      }

      // Parse peer dependencies
      if (packageJson.peerDependencies) {
        for (const [name, version] of Object.entries(packageJson.peerDependencies)) {
          dependencies.push({
            name,
            version: version as string,
            type: 'dependency',
            category: this.categorizeDependency(name)
          });
        }
      }
    } catch (error) {
      console.warn('Failed to parse package.json:', error instanceof Error ? error.message : String(error));
    }
    
    return dependencies;
  }

  /**
   * Categorize dependency based on its name and common patterns
   */
  private categorizeDependency(name: string): string {
    const categories = {
      'framework': [
        'react', 'vue', 'angular', 'express', 'fastify', 'koa', 'hapi',
        'next', 'nuxt', 'gatsby', 'svelte', 'solid-js', 'preact'
      ],
      'testing': [
        'jest', 'mocha', 'chai', 'jasmine', 'karma', 'cypress', 'playwright', 
        'puppeteer', 'vitest', '@testing-library', 'supertest', 'sinon',
        'tap', 'ava', 'nyc', 'c8', 'codecov'
      ],
      'build-tool': [
        'webpack', 'rollup', 'vite', 'parcel', 'esbuild', 'turbo', 'swc',
        'babel', 'typescript', 'tsc', 'tsup', 'unbuild', 'microbundle',
        'browserify', 'grunt', 'gulp'
      ],
      'linting': [
        'eslint', 'prettier', 'tslint', 'jshint', 'stylelint', 'lint-staged',
        'husky', 'commitlint', 'standard', 'xo'
      ],
      'database': [
        'mongodb', 'mysql', 'postgres', 'sqlite', 'redis', 'mongoose',
        'sequelize', 'typeorm', 'prisma', 'knex', 'drizzle-orm', 'kysely',
        'pg', 'mysql2', 'better-sqlite3', 'ioredis'
      ],
      'ui': [
        'styled-components', 'emotion', 'tailwindcss', 'bootstrap', 'bulma',
        'material-ui', '@mui', 'antd', 'chakra-ui', 'mantine', 'semantic-ui',
        'foundation', 'semantic-ui-react', 'react-bootstrap', 'reactstrap'
      ],
      'state': [
        'redux', 'mobx', 'zustand', 'recoil', 'valtio', 'jotai', 'context',
        '@reduxjs/toolkit', 'redux-saga', 'redux-thunk', 'redux-persist',
        'easy-peasy', 'unstated-next'
      ],
      'http': [
        'axios', 'fetch', 'node-fetch', 'got', 'superagent', 'request',
        'cross-fetch', 'isomorphic-fetch', 'ky', 'wretch', 'ofetch'
      ],
      'utility': [
        'lodash', 'ramda', 'underscore', 'moment', 'dayjs', 'date-fns',
        'uuid', 'nanoid', 'classnames', 'clsx', 'validator', 'yup', 'joi',
        'zod', 'ajv', 'dotenv', 'cross-env', 'rimraf', 'mkdirp'
      ],
      'types': [
        '@types/', 'types/', 'typescript', 'ts-node', 'ts-jest', 'tsx',
        'typedoc', 'api-extractor'
      ],
      'dev-server': [
        'nodemon', 'pm2', 'forever', 'concurrently', 'npm-run-all',
        'cross-env', 'dotenv-cli', 'wait-on', 'kill-port'
      ],
      'auth': [
        'passport', 'auth0', 'firebase', 'supabase', 'clerk', 'next-auth',
        'jsonwebtoken', 'bcrypt', 'bcryptjs', 'argon2', 'crypto-js'
      ],
      'router': [
        'react-router', 'vue-router', 'reach-router', 'next/router',
        'express-router', 'koa-router', 'fastify-router'
      ],
      'css': [
        'sass', 'scss', 'less', 'stylus', 'postcss', 'autoprefixer',
        'cssnano', 'purgecss', 'postcss-preset-env'
      ],
      'documentation': [
        'storybook', 'docusaurus', 'vuepress', 'gitbook', 'docsify',
        'typedoc', 'jsdoc', 'documentation'
      ],
      'deployment': [
        'docker', 'pm2', 'serverless', 'vercel', 'netlify', 'heroku',
        'aws-sdk', 'azure', 'gcp', 'terraform'
      ]
    };

    const lowerName = name.toLowerCase();
    
    // Check for exact matches first
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.includes(lowerName)) {
        return category;
      }
    }
    
    // Check for partial matches
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerName.includes(keyword) || keyword.includes(lowerName))) {
        return category;
      }
    }
    
    // Special cases for scoped packages
    if (name.startsWith('@types/')) {
      return 'types';
    }
    
    if (name.startsWith('@testing-library/')) {
      return 'testing';
    }
    
    if (name.startsWith('@babel/')) {
      return 'build-tool';
    }
    
    if (name.startsWith('@eslint/')) {
      return 'linting';
    }

    // Default category
    return 'utility';
  }

  /**
   * Get dependency statistics and insights
   */
  getDependencyStats(dependencies: DependencyInfo[]): {
    totalCount: number;
    prodCount: number;
    devCount: number;
    byCategory: Record<string, number>;
    topCategories: Array<{ category: string; count: number }>;
  } {
    const totalCount = dependencies.length;
    const prodCount = dependencies.filter(d => d.type === 'dependency').length;
    const devCount = dependencies.filter(d => d.type === 'devDependency').length;
    
    // Count by category
    const byCategory: Record<string, number> = {};
    dependencies.forEach(dep => {
      byCategory[dep.category] = (byCategory[dep.category] || 0) + 1;
    });
    
    // Get top categories
    const topCategories = Object.entries(byCategory)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      totalCount,
      prodCount,
      devCount,
      byCategory,
      topCategories
    };
  }

  /**
   * Identify technology stack based on dependencies
   */
  identifyTechStack(dependencies: DependencyInfo[]): {
    frontend: string[];
    backend: string[];
    database: string[];
    testing: string[];
    buildTools: string[];
  } {
    const stack = {
      frontend: [] as string[],
      backend: [] as string[],
      database: [] as string[],
      testing: [] as string[],
      buildTools: [] as string[]
    };

    const frontendIndicators = ['react', 'vue', 'angular', 'svelte', 'solid-js', 'preact'];
    const backendIndicators = ['express', 'fastify', 'koa', 'hapi', 'nest'];
    const databaseIndicators = ['mongodb', 'mysql', 'postgres', 'sqlite', 'redis', 'prisma', 'typeorm'];
    const testingIndicators = ['jest', 'mocha', 'cypress', 'playwright', 'vitest'];
    const buildToolIndicators = ['webpack', 'vite', 'rollup', 'parcel', 'esbuild'];

    dependencies.forEach(dep => {
      const name = dep.name.toLowerCase();
      
      frontendIndicators.forEach(indicator => {
        if (name.includes(indicator) && !stack.frontend.includes(indicator)) {
          stack.frontend.push(indicator);
        }
      });
      
      backendIndicators.forEach(indicator => {
        if (name.includes(indicator) && !stack.backend.includes(indicator)) {
          stack.backend.push(indicator);
        }
      });
      
      databaseIndicators.forEach(indicator => {
        if (name.includes(indicator) && !stack.database.includes(indicator)) {
          stack.database.push(indicator);
        }
      });
      
      testingIndicators.forEach(indicator => {
        if (name.includes(indicator) && !stack.testing.includes(indicator)) {
          stack.testing.push(indicator);
        }
      });
      
      buildToolIndicators.forEach(indicator => {
        if (name.includes(indicator) && !stack.buildTools.includes(indicator)) {
          stack.buildTools.push(indicator);
        }
      });
    });

    return stack;
  }

  /**
   * Find potential security issues in dependencies
   */
  analyzeSecurity(dependencies: DependencyInfo[]): {
    outdatedPatterns: string[];
    potentialIssues: string[];
    recommendations: string[];
  } {
    const outdatedPatterns: string[] = [];
    const potentialIssues: string[] = [];
    const recommendations: string[] = [];

    dependencies.forEach(dep => {
      // Check for obviously outdated versions
      if (dep.version.startsWith('^0.') || dep.version.startsWith('~0.')) {
        outdatedPatterns.push(`${dep.name}@${dep.version} appears to be an early version`);
      }

      // Check for deprecated packages
      const deprecatedPackages = ['request', 'tslint', 'gulp', 'grunt'];
      if (deprecatedPackages.includes(dep.name)) {
        potentialIssues.push(`${dep.name} is deprecated and should be replaced`);
      }

      // Security-sensitive packages to review
      const securitySensitive = ['crypto', 'bcrypt', 'jsonwebtoken', 'passport'];
      if (securitySensitive.some(pkg => dep.name.includes(pkg))) {
        recommendations.push(`Review ${dep.name} for security best practices`);
      }
    });

    return {
      outdatedPatterns,
      potentialIssues,
      recommendations
    };
  }
}