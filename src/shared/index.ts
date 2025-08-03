/**
 * Shared module exports
 * Common utilities, types, and configurations used across the application
 */

// Configuration  
export * from './config.js';

// Error handling
export * from './error-handling.js';
// Note: errors.js types may conflict with error-handling.js - use error-handling.js as primary

// Types
export * from './types.js';

// Theme system
export * from './theme.js';

// Utilities
export { LRUCache } from './cache.js';
export * from './instances.js';