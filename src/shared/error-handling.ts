/**
 * Standardized error handling system for the MCP Repository Adventure project
 * Provides consistent error types, logging, and context information
 */

/**
 * Base error class for all application errors
 */
export abstract class RepoAdventureError extends Error {
  abstract readonly errorCode: string;
  readonly context: Record<string, unknown>;
  readonly timestamp: Date;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
    this.timestamp = new Date();
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Get error information for logging
   */
  getErrorInfo(): ErrorInfo {
    return {
      errorCode: this.errorCode,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack || undefined
    };
  }
}

/**
 * Analysis-related errors
 */
export class AnalysisError extends RepoAdventureError {
  readonly errorCode = 'ANALYSIS_ERROR';

  constructor(message: string, context: AnalysisErrorContext = {}) {
    super(message, context);
  }
}

/**
 * LLM-related errors
 */
export class LLMError extends RepoAdventureError {
  readonly errorCode = 'LLM_ERROR';

  constructor(message: string, context: LLMErrorContext = {}) {
    super(message, context);
  }
}

/**
 * Story generation errors
 */
export class StoryGenerationError extends RepoAdventureError {
  readonly errorCode = 'STORY_GENERATION_ERROR';

  constructor(message: string, context: StoryErrorContext = {}) {
    super(message, context);
  }
}

/**
 * File system errors
 */
export class FileSystemError extends RepoAdventureError {
  readonly errorCode = 'FILE_SYSTEM_ERROR';

  constructor(message: string, context: FileSystemErrorContext = {}) {
    super(message, context);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends RepoAdventureError {
  readonly errorCode = 'CONFIGURATION_ERROR';

  constructor(message: string, context: ConfigErrorContext = {}) {
    super(message, context);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends RepoAdventureError {
  readonly errorCode = 'VALIDATION_ERROR';

  constructor(message: string, context: ValidationErrorContext = {}) {
    super(message, context);
  }
}

// Error context interfaces
export interface ErrorInfo {
  errorCode: string;
  message: string;
  context: Record<string, unknown>;
  timestamp: string;
  stack?: string | undefined;
}

export interface AnalysisErrorContext extends Record<string, unknown> {
  filePath?: string;
  language?: string;
  analysisType?: string;
  projectPath?: string;
  fileCount?: number;
}

export interface LLMErrorContext extends Record<string, unknown> {
  provider?: string;
  model?: string;
  prompt?: string;
  responseFormat?: string;
  retryAttempt?: number;
}

export interface StoryErrorContext extends Record<string, unknown> {
  theme?: string;
  adventureId?: string;
  projectType?: string;
  technologies?: string[];
  operation?: string;
}

export interface FileSystemErrorContext extends Record<string, unknown> {
  filePath?: string;
  operation?: string;
  fileSize?: number;
  permissions?: string;
}

export interface ConfigErrorContext extends Record<string, unknown> {
  configKey?: string;
  configValue?: unknown;
  expectedType?: string;
  source?: string;
}

export interface ValidationErrorContext extends Record<string, unknown> {
  field?: string;
  value?: unknown;
  expectedType?: string;
  constraint?: string;
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Standardized error logger
 */
export class ErrorLogger {
  private static logLevel: 'debug' | 'info' | 'warn' | 'error' = 'warn';

  /**
   * Set the logging level
   */
  static setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logLevel = level;
  }

  /**
   * Log an error with consistent formatting
   */
  static logError(error: Error, severity: ErrorSeverity = ErrorSeverity.MEDIUM): void {
    const errorInfo = error instanceof RepoAdventureError 
      ? error.getErrorInfo()
      : {
          errorCode: 'UNKNOWN_ERROR',
          message: error.message,
          context: {},
          timestamp: new Date().toISOString(),
          stack: error.stack
        };

    const logMessage = {
      severity,
      ...errorInfo,
      name: error.name
    };

    // Log based on severity
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error('[ERROR]', JSON.stringify(logMessage, null, 2));
        break;
      case ErrorSeverity.MEDIUM:
        if (this.logLevel !== 'error') {
          console.warn('[WARN]', JSON.stringify(logMessage, null, 2));
        }
        break;
      case ErrorSeverity.LOW:
        if (this.logLevel === 'debug' || this.logLevel === 'info') {
          console.info('[INFO]', JSON.stringify(logMessage, null, 2));
        }
        break;
    }
  }

  /**
   * Log a warning with context
   */
  static logWarning(message: string, context: Record<string, unknown> = {}): void {
    if (this.logLevel !== 'error') {
      console.warn('[WARN]', {
        message,
        context,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log info with context
   */
  static logInfo(message: string, context: Record<string, unknown> = {}): void {
    if (this.logLevel === 'debug' || this.logLevel === 'info') {
      console.info('[INFO]', {
        message,
        context,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log debug information
   */
  static logDebug(message: string, context: Record<string, unknown> = {}): void {
    if (this.logLevel === 'debug') {
      console.debug('[DEBUG]', {
        message,
        context,
        timestamp: new Date().toISOString()
      });
    }
  }
}

/**
 * Error handling utilities
 */
export class ErrorHandler {
  /**
   * Convert unknown error to RepoAdventureError
   */
  static toRepoAdventureError(error: unknown, defaultType: new (message: string, context?: any) => RepoAdventureError = AnalysisError): RepoAdventureError {
    if (error instanceof RepoAdventureError) {
      return error;
    }

    if (error instanceof Error) {
      return new defaultType(error.message, { originalError: error.name });
    }

    const message = typeof error === 'string' ? error : 'Unknown error occurred';
    return new defaultType(message, { originalError: error });
  }

  /**
   * Safely extract error message from unknown error
   */
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error occurred';
  }

  /**
   * Handle async operations with standardized error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    errorType: new (message: string, context?: any) => RepoAdventureError = AnalysisError,
    context: Record<string, unknown> = {}
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const repoError = this.toRepoAdventureError(error, errorType);
      Object.assign(repoError.context, context);
      ErrorLogger.logError(repoError);
      throw repoError;
    }
  }

  /**
   * Handle sync operations with standardized error handling
   */
  static withSyncErrorHandling<T>(
    operation: () => T,
    errorType: new (message: string, context?: any) => RepoAdventureError = AnalysisError,
    context: Record<string, unknown> = {}
  ): T {
    try {
      return operation();
    } catch (error) {
      const repoError = this.toRepoAdventureError(error, errorType);
      Object.assign(repoError.context, context);
      ErrorLogger.logError(repoError);
      throw repoError;
    }
  }
}

/**
 * Type guard to check if error is a RepoAdventureError
 */
export function isRepoAdventureError(error: unknown): error is RepoAdventureError {
  return error instanceof RepoAdventureError;
}

/**
 * Type guard to check if error is a specific type of RepoAdventureError
 */
export function isErrorOfType<T extends RepoAdventureError>(
  error: unknown,
  errorClass: new (...args: any[]) => T
): error is T {
  return error instanceof errorClass;
}