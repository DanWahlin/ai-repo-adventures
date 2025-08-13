import { AdventureManager } from './adventure-manager.js';

/**
 * Centralized adventure state management
 * 
 * This module provides a singleton AdventureManager instance that can be
 * safely imported by tools and other modules without creating circular dependencies.
 * 
 * The singleton pattern ensures consistent state across the entire application.
 */
export const adventureManager = new AdventureManager();