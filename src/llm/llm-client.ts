import { OpenAI, AzureOpenAI } from 'openai';
import { LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, LLM_REQUEST_TIMEOUT, 
         LLM_API_VERSION, GITHUB_TOKEN, LLM_MAX_TOKENS_DEFAULT, LLM_TEMPERATURE,
         GPT5_VERBOSITY, GPT5_REASONING_EFFORT } from '../shared/config.js';

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
  // GPT-5 specific parameters
  verbosity?: 'low' | 'medium' | 'high';
  reasoningEffort?: 'minimal' | 'medium' | 'high';
}

interface OpenAIRequestParams {
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  // GPT-5 specific parameters
  verbosity?: 'low' | 'medium' | 'high';
  reasoning_effort?: 'minimal' | 'medium' | 'high';
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
    try {
      const requestParams = this.buildRequestParams(prompt, options);
      const completion = await this.executeRequest(requestParams);
      const content = this.validateResponse(completion);
      // console.log(content);
      this.logTokenUsage(completion);
      
      return { content };
    } catch (error) {
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
}