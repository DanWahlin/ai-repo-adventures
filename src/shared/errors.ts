export interface ErrorContext {
  projectPath?: string;
  fileName?: string;
  step?: string;
  details?: Record<string, unknown>;
}

export type ErrorType = 'analysis' | 'story_generation' | 'adventure' | 'general';

export class RepoAdventureError extends Error {
  constructor(
    message: string,
    public readonly type: ErrorType,
    public readonly context: ErrorContext = {},
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'RepoAdventureError';
  }
}

export function formatErrorForUser(error: Error, context?: ErrorContext): string {
  if (error instanceof RepoAdventureError) {
    const errorContext = { ...context, ...error.context };
    
    switch (error.type) {
      case 'analysis':
        return `Failed to analyze project${errorContext.projectPath ? ` at ${errorContext.projectPath}` : ''}: ${error.message}`;
      case 'story_generation':
        return `Failed to generate story${errorContext.step ? ` during ${errorContext.step}` : ''}: ${error.message}`;
      case 'adventure':
        return `Adventure error${errorContext.step ? ` during ${errorContext.step}` : ''}: ${error.message}`;
      default:
        return `Error: ${error.message}`;
    }
  }
  
  return `Unexpected error: ${error.message}`;
}

// Convenience functions for common error types
export const AnalysisError = (message: string, context: ErrorContext = {}, originalError?: Error) => 
  new RepoAdventureError(message, 'analysis', context, originalError);

export const StoryGenerationError = (message: string, context: ErrorContext = {}, originalError?: Error) => 
  new RepoAdventureError(message, 'story_generation', context, originalError);

export const AdventureError = (message: string, context: ErrorContext = {}, originalError?: Error) => 
  new RepoAdventureError(message, 'adventure', context, originalError);