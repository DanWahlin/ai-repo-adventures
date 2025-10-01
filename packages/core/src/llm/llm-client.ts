import { OpenAI, AzureOpenAI } from 'openai';
import { LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, LLM_REQUEST_TIMEOUT,
         LLM_API_VERSION, GITHUB_TOKEN, LLM_MAX_TOKENS_DEFAULT, LLM_TEMPERATURE,
         GPT5_VERBOSITY, GPT5_REASONING_EFFORT, LLM_INITIAL_THROTTLE_DELAY,
         LLM_MAX_THROTTLE_DELAY, LLM_THROTTLE_DECAY_RATE, TOKEN_RATE_WINDOW_SECONDS } from '../shared/config.js';

/**
 * Format numbers in a friendly way (25000 -> 25K)
 */
function formatTokenCount(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

export interface LLMResponse {
  content: string;
}

export interface LLMRequestOptions {
  maxTokens?: number;
  responseFormat?: 'json_object' | 'text';
  // GPT-5 specific parameters
  verbosity?: 'low' | 'medium' | 'high';
  reasoningEffort?: 'minimal' | 'medium' | 'high';
}

export enum RateLimitType {
  TOKEN_RATE_EXCEEDED = 'token_rate_exceeded',  // Example: 200K tokens/60s window exceeded
  REQUEST_RATE_LIMIT = 'request_rate_limit',     // Example: S0 tier per-request throttling
  NONE = 'none'
}

export interface RateLimitInfo {
  type: RateLimitType;
  waitSeconds: number;
  message: string;
}

/**
 * Custom error class for rate limit errors with detailed information
 */
export class RateLimitError extends Error {
  constructor(
    public type: RateLimitType,
    public waitSeconds: number = 60,
    public originalMessage: string,
    public originalError?: any
  ) {
    const waitMsg = type === RateLimitType.TOKEN_RATE_EXCEEDED
      ? `Token rate limit exceeded (200K tokens/60s). Wait ${waitSeconds} seconds.`
      : `Request rate limit hit. Retry after ${waitSeconds} seconds.`;
    super(waitMsg);
    this.name = 'RateLimitError';
  }
}

interface OpenAIRequestParams {
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
  // GPT-5 specific parameters
  verbosity?: 'low' | 'medium' | 'high';
  reasoning_effort?: 'minimal' | 'medium' | 'high';
}

export class LLMClient {
  private client: OpenAI | AzureOpenAI;
  private model: string;

  // Adaptive throttling state
  private isThrottling: boolean = false;
  private throttleDelay: number = LLM_INITIAL_THROTTLE_DELAY; // Start with configurable initial delay
  private lastRequestTime: number = 0;
  private readonly MAX_THROTTLE_DELAY = LLM_MAX_THROTTLE_DELAY; // Maximum delay from config
  private readonly THROTTLE_DECAY_RATE = LLM_THROTTLE_DECAY_RATE; // Decay rate from config

  constructor() {
    this.model = LLM_MODEL;
    
    // Determine API key based on provider
    const apiKey = this.getApiKey();
    if (!apiKey || !LLM_BASE_URL) {
      throw new Error('LLM configuration required. Please set LLM_BASE_URL and appropriate API key (LLM_API_KEY or GITHUB_TOKEN).');
    }

    if (this.isAzureOpenAI()) {
      // Azure OpenAI requires endpoint without the path
      const azureEndpoint = LLM_BASE_URL.split('/openai/deployments')[0];
      this.client = new AzureOpenAI({
        endpoint: azureEndpoint,
        apiKey,
        apiVersion: LLM_API_VERSION,
        deployment: this.model
      });
    } else {
      this.client = new OpenAI({
        apiKey,
        baseURL: LLM_BASE_URL
      });
    }
  }

  private getApiKey(): string {
    // GitHub Models (hosted on Azure) uses GITHUB_TOKEN
    if (LLM_BASE_URL.includes('models.inference.ai.azure.com')) {
      if (!GITHUB_TOKEN) {
        throw new Error('GITHUB_TOKEN required for GitHub Models. Set GITHUB_TOKEN environment variable.');
      }
      return GITHUB_TOKEN;
    }
    // All other providers (OpenAI, Azure OpenAI, Ollama, etc.) use LLM_API_KEY
    if (!LLM_API_KEY) {
      throw new Error('LLM_API_KEY required. Set LLM_API_KEY environment variable.');
    }
    return LLM_API_KEY;
  }

  private isAzureOpenAI(): boolean {
    return LLM_BASE_URL.includes('.openai.azure.com') || LLM_BASE_URL.includes('cognitiveservices.azure.com');
  }

  private isGPT5Model(): boolean {
    // Match gpt-5, gpt5, gpt-5-mini, gpt5-mini, etc.
    return /\bgpt[-]?5(?:[-]?\w+)?\b/.test(this.model.toLowerCase());
  }

  /**
   * Generate a response from the LLM
   */
  async generateResponse(prompt: string, options?: LLMRequestOptions): Promise<LLMResponse> {
    // Apply throttling if active
    await this.applyThrottling();

    try {
      const requestParams = this.buildRequestParams(prompt, options);
      const completion = await this.executeRequest(requestParams);
      let content = this.validateResponse(completion);

      // Post-process JSON responses that might be wrapped in markdown
      if (options?.responseFormat === 'json_object') {
        content = this.cleanJsonResponse(content);
      }

      this.logTokenUsage(completion);

      // Successful request - reduce throttling gradually
      this.onSuccessfulRequest();

      return { content };
    } catch (error) {
      // Check if this is an Azure S0 rate limit error and handle appropriately
      const rateLimitInfo = this.detectRateLimitType(error);

      if (rateLimitInfo.type !== RateLimitType.NONE) {
        // Activate throttling for request rate limits
        if (rateLimitInfo.type === RateLimitType.REQUEST_RATE_LIMIT) {
          this.activateThrottling(error);
        }

        // Throw custom RateLimitError for better error handling upstream
        throw new RateLimitError(
          rateLimitInfo.type,
          rateLimitInfo.waitSeconds,
          rateLimitInfo.message,
          error
        );
      }

      // Enhanced error logging for debugging
      this.logDetailedError(error, prompt);

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`LLM request failed: ${message}`);
    }
  }

  /**
   * Build the OpenAI request parameters
   */
  private buildRequestParams(prompt: string, options?: LLMRequestOptions): OpenAIRequestParams {
    const requestParams: OpenAIRequestParams = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }]
    };

    // Set response format if specified
    if (options?.responseFormat) {
      requestParams.response_format = { type: options.responseFormat };
    }

    // Use model-specific parameters
    if (this.isGPT5Model()) {
      // GPT-5 models use different parameters
      requestParams.temperature = 1; // GPT-5 only supports default temperature (ignore env var)
      requestParams.max_completion_tokens = options?.maxTokens || LLM_MAX_TOKENS_DEFAULT;
      
      // Add GPT-5 specific parameters
      requestParams.verbosity = options?.verbosity || GPT5_VERBOSITY;
      requestParams.reasoning_effort = options?.reasoningEffort || GPT5_REASONING_EFFORT;
    } else {
      // GPT-4, GPT-3.5, and other models use standard parameters
      requestParams.temperature = LLM_TEMPERATURE; // Use environment variable
      requestParams.max_tokens = options?.maxTokens || LLM_MAX_TOKENS_DEFAULT;
    }

    console.error(`🔄 Starting LLM request to ${this.model} (timeout: ${LLM_REQUEST_TIMEOUT}ms, prompt length: ${prompt.length} chars)`);

    return requestParams;
  }

  /**
   * Execute the LLM request with timeout
   */
  private async executeRequest(requestParams: OpenAIRequestParams) {
    return Promise.race([
      this.client.chat.completions.create(requestParams as any),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`LLM request timeout after ${LLM_REQUEST_TIMEOUT}ms`)), LLM_REQUEST_TIMEOUT)
      )
    ]);
  }

  /**
   * Validate and extract content from the LLM response
   */
  private validateResponse(completion: any): string {
    const choice = completion.choices[0];
    const content = choice?.message?.content;

    if (!choice) {
      throw new Error('LLM returned no choices in response');
    }

    if (!choice.message) {
      throw new Error('LLM returned choice without message');
    }

    // Log finish reason for debugging truncated responses
    if (choice.finish_reason) {
      console.error(`🔍 LLM finish reason: ${choice.finish_reason} (content length: ${content?.length || 0} chars)`);

      if (choice.finish_reason === 'length') {
        console.warn('⚠️  Response truncated due to max_tokens limit');
      } else if (choice.finish_reason === 'content_filter') {
        console.warn('⚠️  Response filtered by content policy');
      }
    }

    if (!content || content.trim() === '') {
      this.handleEmptyResponse(choice);
    }

    return content;
  }

  /**
   * Handle empty response with detailed error information
   */
  private handleEmptyResponse(choice: any): never {
    const content = choice?.message?.content;
    
    console.error('🚨 LLM Empty Response Debug Info:');
    console.error('- Model:', this.model);
    console.error('- Choice finish_reason:', choice.finish_reason);
    console.error('- Message role:', choice.message.role);
    console.error('- Content null/empty:', content === null ? 'null' : 'empty string');
    
    if (choice.finish_reason === 'length') {
      throw new Error('LLM response was truncated due to token limit. Try reducing prompt size or increasing maxTokens option.');
    }
    
    throw new Error(`LLM returned empty response. Finish reason: ${choice.finish_reason || 'unknown'}`);
  }

  /**
   * Log token usage information
   */
  private logTokenUsage(completion: any): void {
    if (!completion.usage) return;
    
    const promptTokens = completion.usage.prompt_tokens || 0;
    const completionTokens = completion.usage.completion_tokens || 0;
    const totalTokens = completion.usage.total_tokens || 0;
    
    const green = '\x1b[32m';
    const reset = '\x1b[0m';
    console.error(`🔢 LLM Usage: ${green}${formatTokenCount(promptTokens)}${reset} prompt + ${green}${formatTokenCount(completionTokens)}${reset} response = ${green}${formatTokenCount(totalTokens)}${reset} total tokens\n`);
  }

  /**
   * Clean JSON responses that might be wrapped in markdown code blocks
   */
  private cleanJsonResponse(content: string): string {
    // Remove markdown code block wrappers if present
    const jsonBlockPattern = /^\s*```(?:json)?\s*\n?([\s\S]*?)\n?\s*```\s*$/;
    const match = content.match(jsonBlockPattern);
    
    if (match) {
      return match[1].trim();
    }
    
    // If no markdown wrapper, return original content
    return content.trim();
  }

  /**
   * Log detailed error information for debugging
   */
  private logDetailedError(error: any, prompt: string): void {
    const red = '\x1b[31m';
    const yellow = '\x1b[33m';
    const cyan = '\x1b[36m';
    const reset = '\x1b[0m';
    
    console.error(`\n${red}═══════════════════════════════════════════════════════════════${reset}`);
    console.error(`${red}🚨 LLM Request Failed - Detailed Error Information${reset}`);
    console.error(`${red}═══════════════════════════════════════════════════════════════${reset}\n`);
    
    // Basic error info
    console.error(`${yellow}Error Type:${reset}`, error?.constructor?.name || 'Unknown');
    console.error(`${yellow}Error Message:${reset}`, error?.message || 'No message');
    
    // Model and endpoint info
    console.error(`\n${cyan}Configuration:${reset}`);
    console.error(`  Model: ${this.model}`);
    console.error(`  Base URL: ${LLM_BASE_URL}`);
    console.error(`  Is Azure: ${this.isAzureOpenAI()}`);
    console.error(`  API Version: ${LLM_API_VERSION || 'Not set'}`);
    
    // Azure AI Foundry specific error details
    if (error?.response) {
      console.error(`\n${cyan}Response Details:${reset}`);
      console.error(`  Status: ${error.response.status || 'Unknown'}`);
      console.error(`  Status Text: ${error.response.statusText || 'Unknown'}`);
      
      if (error.response.data) {
        console.error(`  Response Data:`, JSON.stringify(error.response.data, null, 2));
      }
      
      if (error.response.headers) {
        console.error(`  Headers:`, error.response.headers);
      }
    }
    
    // OpenAI/Azure specific error details
    if (error?.error) {
      console.error(`\n${cyan}API Error Details:${reset}`);
      console.error(`  Error Type: ${error.error.type || 'Unknown'}`);
      console.error(`  Error Code: ${error.error.code || 'Unknown'}`);
      console.error(`  Error Message: ${error.error.message || 'No message'}`);
      
      if (error.error.param) {
        console.error(`  Parameter: ${error.error.param}`);
      }
    }
    
    // Model router specific errors (Azure AI Foundry)
    if (this.model === 'model-router' || this.model.includes('router')) {
      console.error(`\n${yellow}⚠️  Model Router Notes:${reset}`);
      console.error(`  - Ensure model-router deployment exists in Azure AI Foundry`);
      console.error(`  - Check if API version ${LLM_API_VERSION} supports model-router`);
      console.error(`  - Model router may have different timeout requirements`);
      console.error(`  - Try increasing LLM_REQUEST_TIMEOUT if seeing timeouts`);
    }
    
    // Timeout specific guidance
    if (error?.message?.includes('timeout')) {
      console.error(`\n${yellow}⏱️  Timeout Detected:${reset}`);
      console.error(`  Current timeout: ${LLM_REQUEST_TIMEOUT}ms`);
      console.error(`  Prompt length: ${prompt.length} characters`);
      console.error(`  Consider:`);
      console.error(`    - Increasing LLM_REQUEST_TIMEOUT in .env`);
      console.error(`    - Reducing prompt size`);
      console.error(`    - Using a faster model`);
    }
    
    // Stack trace (last, as it's verbose)
    if (error?.stack) {
      console.error(`\n${cyan}Stack Trace:${reset}`);
      console.error(error.stack);
    }
    
    console.error(`${red}═══════════════════════════════════════════════════════════════${reset}\n`);
  }

  /**
   * Detect the type of rate limit error
   */
  detectRateLimitType(error: any): RateLimitInfo {
    const errorMessage = error?.message || '';
    const is429Error = error?.status === 429 || errorMessage.includes('429');

    if (!is429Error) {
      return { type: RateLimitType.NONE, waitSeconds: 0, message: '' };
    }

    // Check for token rate exceeded (200K tokens/60s window)
    // This happens when parallel processing sends too many tokens at once
    if (errorMessage.includes('exceeded token rate limit of your current AIServices S0 pricing tier') &&
        !errorMessage.includes('retry after')) {
      // This is the token window exceeded error - no retry time given
      return {
        type: RateLimitType.TOKEN_RATE_EXCEEDED,
        waitSeconds: TOKEN_RATE_WINDOW_SECONDS, // Configurable window (default: 60s)
        message: `Token rate limit exceeded (200K tokens/${TOKEN_RATE_WINDOW_SECONDS}s window)`
      };
    }

    // Check for request rate limit (with retry after time)
    if (errorMessage.includes('exceeded token rate limit of your current AIServices S0 pricing tier') &&
        errorMessage.includes('retry after')) {
      const retryMatch = errorMessage.match(/retry after (\d+) seconds/);
      const waitSeconds = retryMatch ? parseInt(retryMatch[1]) : 60;

      return {
        type: RateLimitType.REQUEST_RATE_LIMIT,
        waitSeconds,
        message: `Request rate limit hit, retry after ${waitSeconds} seconds`
      };
    }

    // Generic 429 rate limit
    return {
      type: RateLimitType.REQUEST_RATE_LIMIT,
      waitSeconds: 60,
      message: '429 rate limit encountered'
    };
  }

  /**
   * Activate throttling when Azure S0 rate limit is detected
   * Uses rate limit information from detectRateLimitType() to set appropriate delays
   */
  private activateThrottling(error: any): void {
    this.isThrottling = true;
    const rateLimitInfo = this.detectRateLimitType(error);

    if (rateLimitInfo.type !== RateLimitType.NONE) {
      // Use waitSeconds from detection (already extracted from error message)
      const suggestedDelay = rateLimitInfo.waitSeconds * 1000; // Convert to milliseconds
      this.throttleDelay = Math.min(suggestedDelay, this.MAX_THROTTLE_DELAY);
    } else {
      // Fallback: double the delay if no rate limit detected, but cap it
      this.throttleDelay = Math.min(this.throttleDelay * 2, this.MAX_THROTTLE_DELAY);
    }

    const yellow = '\x1b[33m';
    const cyan = '\x1b[36m';
    const reset = '\x1b[0m';

    console.error(`\n${yellow}🐌 ADAPTIVE THROTTLING ACTIVATED${reset}`);
    console.error(`${cyan}Detected Azure S0 pricing tier rate limit.${reset}`);
    console.error(`${cyan}Throttling subsequent requests with ${(this.throttleDelay / 1000).toFixed(1)}s delay.${reset}\n`);
  }

  /**
   * Apply throttling delay if active
   */
  private async applyThrottling(): Promise<void> {
    if (!this.isThrottling) return;

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.throttleDelay) {
      const remainingDelay = this.throttleDelay - timeSinceLastRequest;

      const cyan = '\x1b[36m';
      const reset = '\x1b[0m';
      console.error(`${cyan}⏳ Throttling: waiting ${(remainingDelay / 1000).toFixed(1)}s before next request...${reset}`);

      await new Promise(resolve => setTimeout(resolve, remainingDelay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Handle successful request - gradually reduce throttling
   */
  private onSuccessfulRequest(): void {
    if (this.isThrottling) {
      // Gradually reduce the throttle delay on successful requests
      this.throttleDelay = Math.max(this.throttleDelay * this.THROTTLE_DECAY_RATE, LLM_INITIAL_THROTTLE_DELAY);

      // If delay is back to minimum, disable throttling
      if (this.throttleDelay <= LLM_INITIAL_THROTTLE_DELAY) {
        this.isThrottling = false;

        const green = '\x1b[32m';
        const reset = '\x1b[0m';
        console.error(`${green}✅ Rate limit recovered - throttling disabled${reset}\n`);
      }
    }
  }
}