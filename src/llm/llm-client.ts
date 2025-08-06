import { OpenAI, AzureOpenAI } from 'openai';
import { LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, LLM_REQUEST_TIMEOUT, 
         LLM_API_VERSION, GITHUB_TOKEN, LLM_MAX_TOKENS_DEFAULT } from '../shared/config.js';

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
  responseFormat?: 'text' | 'json_object';
  maxTokens?: number;
}

interface OpenAIRequestParams {
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature: number;
  max_tokens: number;
  response_format?: { type: 'text' | 'json_object' };
}

export class LLMClient {
  private client: OpenAI | AzureOpenAI;
  private model: string;

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
    // GitHub Models uses GITHUB_TOKEN
    if (LLM_BASE_URL.includes('models.inference.ai.azure.com')) {
      return GITHUB_TOKEN;
    }
    // All other providers use LLM_API_KEY
    return LLM_API_KEY;
  }

  private isAzureOpenAI(): boolean {
    return LLM_BASE_URL.includes('.openai.azure.com');
  }

  /**
   * Generate a response from the LLM
   */
  async generateResponse(prompt: string, options?: LLMRequestOptions): Promise<LLMResponse> {
    try {
      const requestParams = this.buildRequestParams(prompt, options);
      const completion = await this.executeRequest(requestParams);
      const content = this.validateResponse(completion);
      this.logTokenUsage(completion);
      
      return { content };
    } catch (error) {
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
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: options?.maxTokens || LLM_MAX_TOKENS_DEFAULT
    };

    console.error(`🔄 Starting LLM request to ${this.model} (timeout: ${LLM_REQUEST_TIMEOUT}ms, prompt length: ${prompt.length} chars)`);

    if (options?.responseFormat === 'json_object') {
      requestParams.response_format = { type: 'json_object' };
    }

    return requestParams;
  }

  /**
   * Execute the LLM request with timeout
   */
  private async executeRequest(requestParams: OpenAIRequestParams) {
    return Promise.race([
      this.client.chat.completions.create(requestParams),
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
      throw new Error('LLM response was truncated due to token limit. Try reducing prompt size or increasing max_tokens.');
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
}