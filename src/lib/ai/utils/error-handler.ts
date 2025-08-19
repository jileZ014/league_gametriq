/**
 * AI Error Handler
 * Comprehensive error handling for AI analytics system
 */

import { AIError } from '../types';

export class AIErrorHandler {
  private static instance: AIErrorHandler;
  private errorLog: Array<{ error: AIError; timestamp: Date; context?: any }> = [];
  private maxLogSize = 100;

  static getInstance(): AIErrorHandler {
    if (!AIErrorHandler.instance) {
      AIErrorHandler.instance = new AIErrorHandler();
    }
    return AIErrorHandler.instance;
  }

  /**
   * Handle and classify AI errors
   */
  handleError(error: any, context?: any): AIError {
    const aiError = this.createAIError(error, context);
    this.logError(aiError, context);
    this.notifyError(aiError);
    
    return aiError;
  }

  /**
   * Create standardized AI error
   */
  private createAIError(error: any, context?: any): AIError {
    if (error instanceof AIError) {
      return error;
    }

    const aiError = new Error(error.message || 'Unknown AI error') as AIError;
    aiError.code = this.classifyError(error);
    aiError.context = context;
    aiError.retryable = this.isRetryable(error);
    
    return aiError;
  }

  /**
   * Classify error types
   */
  private classifyError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    if (message.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }
    if (message.includes('model') || message.includes('prediction')) {
      return 'MODEL_ERROR';
    }
    if (message.includes('vector') || message.includes('embedding')) {
      return 'VECTOR_ERROR';
    }
    if (message.includes('cache')) {
      return 'CACHE_ERROR';
    }
    if (message.includes('not initialized')) {
      return 'INITIALIZATION_ERROR';
    }
    if (message.includes('invalid') || message.includes('validation')) {
      return 'VALIDATION_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Determine if error is retryable
   */
  private isRetryable(error: any): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'CACHE_ERROR'
    ];
    
    const code = this.classifyError(error);
    return retryableCodes.includes(code);
  }

  /**
   * Log error for analysis
   */
  private logError(error: AIError, context?: any): void {
    this.errorLog.push({
      error,
      timestamp: new Date(),
      context
    });

    // Maintain log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Console logging for development
    console.error('AI Error:', {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      context,
      stack: error.stack
    });
  }

  /**
   * Notify error monitoring systems
   */
  private notifyError(error: AIError): void {
    // In production, this would integrate with error monitoring services
    // For now, we'll emit custom events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ai:error', {
        detail: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          timestamp: new Date()
        }
      }));
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    recentErrors: Array<{ code: string; message: string; timestamp: Date }>;
    retryableErrors: number;
  } {
    const errorsByCode: Record<string, number> = {};
    let retryableErrors = 0;

    for (const entry of this.errorLog) {
      const code = entry.error.code;
      errorsByCode[code] = (errorsByCode[code] || 0) + 1;
      
      if (entry.error.retryable) {
        retryableErrors++;
      }
    }

    return {
      totalErrors: this.errorLog.length,
      errorsByCode,
      recentErrors: this.errorLog.slice(-10).map(entry => ({
        code: entry.error.code,
        message: entry.error.message,
        timestamp: entry.timestamp
      })),
      retryableErrors
    };
  }

  /**
   * Clear error log
   */
  clearErrors(): void {
    this.errorLog = [];
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        const aiError = this.createAIError(error);
        
        if (!aiError.retryable || attempt === maxRetries) {
          throw this.handleError(error, { attempt, maxRetries });
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`AI operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw this.handleError(lastError, { maxRetries });
  }
}

/**
 * Utility function for creating AI errors
 */
export function createAIError(
  message: string,
  code: string,
  context?: any,
  retryable: boolean = false
): AIError {
  const error = new Error(message) as AIError;
  error.code = code;
  error.context = context;
  error.retryable = retryable;
  return error;
}

/**
 * Error boundary for AI operations
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: any
): Promise<T> {
  const errorHandler = AIErrorHandler.getInstance();
  
  try {
    return await operation();
  } catch (error) {
    throw errorHandler.handleError(error, context);
  }
}

/**
 * Safe AI operation wrapper
 */
export async function safeAIOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  context?: any
): Promise<T> {
  try {
    return await withErrorHandling(operation, context);
  } catch (error) {
    console.warn('AI operation failed, using fallback:', error);
    return fallback;
  }
}