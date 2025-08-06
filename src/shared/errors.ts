export interface ErrorContext {
  projectPath?: string;
  fileName?: string;
  step?: string;
  details?: Record<string, unknown>;
}

export function formatErrorForUser(error: Error, context?: ErrorContext): string {
  const errorContext = context || {};
  
  // Simple error formatting - no complex logic needed
  let message = `Error: ${error.message}`;
  
  if (errorContext.projectPath) {
    message = `Failed to analyze project at ${errorContext.projectPath}: ${error.message}`;
  }
  
  if (errorContext.step) {
    message = `Error during ${errorContext.step}: ${error.message}`;
  }
  
  return message;
}