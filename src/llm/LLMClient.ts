import { OpenAI, AzureOpenAI } from 'openai';
import { config } from 'dotenv';
import { createHash } from 'crypto';

// Load environment variables
config();

// Rate limiting configuration
// Simple configuration for MCP usage (human-paced requests)
interface LLMClientConfig {
  timeoutMs?: number;        // Request timeout (default: 15 seconds)
  cacheTimeoutMs?: number;   // Cache TTL (default: 5 minutes)
}

const DEFAULT_CONFIG: Required<LLMClientConfig> = {
  timeoutMs: 15000,      // 15 seconds - generous for MCP usage
  cacheTimeoutMs: 300000 // 5 minutes - useful for repeated requests
};

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | undefined;
}

export interface LLMRequestOptions {
  systemPrompt?: string;
  responseFormat?: 'text' | 'json_object';
}

export interface LLMConfig {
  baseURL?: string | undefined;
  apiKey?: string | undefined;
  model?: string | undefined;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
  timeoutMs?: number;        // Request timeout
  cacheTimeoutMs?: number;   // Cache TTL
}

export class LLMClient {
  private client: OpenAI | AzureOpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private provider: string;
  private baseURL: string;
  private timeoutMs: number;
  private cacheTimeoutMs: number;
  private requestCache: Map<string, { response: LLMResponse; timestamp: number }> = new Map();

  constructor(config?: LLMConfig) {
    // Environment-based configuration with optional overrides
    this.baseURL = config?.baseURL || process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
    const apiKey = config?.apiKey || process.env.LLM_API_KEY;
    if (!apiKey) {
      throw new Error('LLM_API_KEY environment variable is required. Please set LLM_API_KEY in your environment or .env file.');
    }
    
    this.model = config?.model || process.env.LLM_MODEL || 'gpt-4o-mini';
    this.temperature = config?.temperature ?? parseFloat(process.env.LLM_TEMPERATURE || '0.7');
    this.maxTokens = config?.maxTokens ?? parseInt(process.env.LLM_MAX_TOKENS || '1000');
    
    // Simple timeouts for MCP usage
    this.timeoutMs = config?.timeoutMs || DEFAULT_CONFIG.timeoutMs;
    this.cacheTimeoutMs = config?.cacheTimeoutMs || DEFAULT_CONFIG.cacheTimeoutMs;
    
    // Infer provider from baseURL
    this.provider = this.inferProvider(this.baseURL);

    // Create client with provider-specific configuration
    if (this.provider === 'Azure OpenAI') {
      this.validateAzureConfiguration();
      this.client = new AzureOpenAI({
        endpoint: this.baseURL,
        apiKey: apiKey,
        apiVersion: process.env.LLM_API_VERSION || '2024-02-15-preview',
        deployment: this.model
      });
    } else {
      this.client = new OpenAI({
        baseURL: this.baseURL,
        apiKey: apiKey,
        defaultHeaders: this.getProviderHeaders()
      });
    }
  }

  /**
   * Categorize errors for better handling
   */
  private categorizeError(error: unknown): { type: string; message: string } {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Check for authentication errors
      if (message.includes('unauthorized') || message.includes('401') || message.includes('invalid api key') || message.includes('bad credentials')) {
        return { type: 'authentication', message: this.sanitizeErrorMessage(error.message) };
      }
      
      // Check for rate limiting
      if (message.includes('rate limit') || message.includes('429') || message.includes('quota exceeded')) {
        return { type: 'rate_limit', message: this.sanitizeErrorMessage(error.message) };
      }
      
      // Check for timeout errors
      if (message.includes('timeout') || message.includes('timed out')) {
        return { type: 'timeout', message: this.sanitizeErrorMessage(error.message) };
      }
      
      // Check for network errors
      if (message.includes('network') || message.includes('enotfound') || message.includes('econnrefused') || message.includes('fetch')) {
        return { type: 'network', message: this.sanitizeErrorMessage(error.message) };
      }
      
      // Check for model/resource not found
      if (message.includes('404') || message.includes('not found') || message.includes('model not found')) {
        return { type: 'resource_not_found', message: this.sanitizeErrorMessage(error.message) };
      }
      
      return { type: 'unknown', message: this.sanitizeErrorMessage(error.message) };
    }
    
    return { type: 'unknown', message: 'An unexpected error occurred' };
  }

  /**
   * Sanitize error messages to prevent sensitive information leakage
   */
  private sanitizeErrorMessage(message: string): string {
    return message
      .replace(/api[_-]?key[s]?[:\s=][^\s]*/gi, 'API_KEY=***')
      .replace(/token[s]?[:\s=][^\s]*/gi, 'TOKEN=***')
      .replace(/password[s]?[:\s=][^\s]*/gi, 'PASSWORD=***')
      .replace(/https?:\/\/[^\s]*/gi, '[URL_REDACTED]')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, '[EMAIL_REDACTED]');
  }

  /**
   * Validate Azure-specific configuration
   */
  private validateAzureConfiguration(): void {
    // Check for required Azure environment variables
    if (!this.baseURL || !this.baseURL.includes('azure.com')) {
      throw new Error('Azure OpenAI requires a valid Azure endpoint (LLM_BASE_URL). Example: https://your-resource.openai.azure.com');
    }

    // Validate API version format
    const apiVersion = process.env.LLM_API_VERSION;
    if (apiVersion && !apiVersion.match(/^\d{4}-\d{2}-\d{2}(-preview)?$/)) {
      throw new Error(`Invalid LLM_API_VERSION format: ${apiVersion}. Expected format: YYYY-MM-DD or YYYY-MM-DD-preview`);
    }

    // Validate model/deployment name
    if (!this.model || this.model.length === 0) {
      throw new Error('Azure OpenAI requires a deployment name (LLM_MODEL). This should match your Azure deployment name.');
    }

    // Check for common Azure configuration mistakes
    if (this.baseURL.includes('/v1')) {
      console.warn('Warning: Azure OpenAI endpoints typically do not include "/v1" in the base URL. You may want to remove it.');
    }

    if (this.baseURL.includes('api.openai.com')) {
      throw new Error('Azure OpenAI detected but baseURL points to OpenAI. Please use your Azure endpoint URL.');
    }
  }

  private inferProvider(baseURL: string): string {
    if (baseURL.includes('models.inference.ai.azure.com')) return 'GitHub Models';
    if (baseURL.includes('api.openai.com')) return 'OpenAI';
    if (baseURL.includes('api.anthropic.com')) return 'Anthropic';
    if (baseURL.includes('azure.com')) return 'Azure OpenAI';
    if (baseURL.includes('localhost') || baseURL.includes('127.0.0.1')) return 'Local (Ollama/etc)';
    return 'Custom Provider';
  }

  private getProviderHeaders(): Record<string, string> {
    // Add provider-specific headers if needed
    const headers: Record<string, string> = {};
    
    if (this.provider === 'GitHub Models') {
      headers['User-Agent'] = 'mcp-repo-adventure/1.0.0';
    }
    
    return headers;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`LLM request timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }

  async generateResponse(prompt: string, options?: LLMRequestOptions | string): Promise<LLMResponse> {
    // Handle legacy string parameter for backward compatibility
    const opts: LLMRequestOptions = typeof options === 'string' 
      ? { systemPrompt: options } 
      : (options || {});
    
    const cacheKey = this.getCacheKey(prompt, opts.systemPrompt);
    
    // Check cache first
    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeoutMs) {
      console.debug('Using cached LLM response');
      return cached.response;
    }
    
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
      
      // Add system prompt
      if (opts.systemPrompt || this.getDefaultSystemPrompt()) {
        messages.push({
          role: 'system',
          content: opts.systemPrompt || this.getDefaultSystemPrompt()
        });
      }
      
      // Add user prompt
      messages.push({
        role: 'user',
        content: prompt
      });

      // Prepare completion options
      const completionOptions: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        model: this.model, // For Azure, this is the deployment name
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      };

      // Add response format if specified
      if (opts.responseFormat === 'json_object') {
        completionOptions.response_format = { type: 'json_object' };
      }

      // Add timeout to API call for MCP usage
      const response = await this.withTimeout(
        this.client.chat.completions.create(completionOptions),
        this.timeoutMs
      );

      const content = response.choices[0]?.message?.content || '';
      
      const llmResponse: LLMResponse = {
        content,
        model: this.model,
        provider: this.provider,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined
      };
      
      // Cache the response
      this.requestCache.set(cacheKey, { response: llmResponse, timestamp: Date.now() });
      
      return llmResponse;
    } catch (error) {
      const errorType = this.categorizeError(error);
      console.warn(`LLM API call failed (${this.provider}) - ${errorType.type}:`, errorType.message);
      
      // Different handling based on error type
      if (errorType.type === 'authentication') {
        throw new Error(`Authentication failed for ${this.provider}. Please check your API key and configuration.`);
      }
      
      if (errorType.type === 'timeout') {
        console.warn(`Request timeout for ${this.provider}, using fallback response`);
      } else if (errorType.type === 'rate_limit') {
        console.warn(`Rate limit exceeded for ${this.provider}, using fallback response`);
      } else if (errorType.type === 'network') {
        console.warn(`Network error for ${this.provider}, using fallback response`);
      }
      
      // Fallback to a simple template-based response
      const fallbackResponse = {
        content: this.generateFallbackResponse(prompt),
        model: 'fallback-template',
        provider: 'Fallback System'
      };
      
      // Cache the fallback response too
      this.requestCache.set(cacheKey, { response: fallbackResponse, timestamp: Date.now() });
      
      return fallbackResponse;
    }
  }

  private getDefaultSystemPrompt(): string {
    return `You are a master storyteller who creates engaging, immersive "Choose Your Own Adventure" narratives that help developers understand code repositories through creative analogies and characters. Your adventure stories should be:

1. **Educational**: Help developers understand technical concepts by giving real-world analogies
2. **Engaging**: Use vivid imagery and compelling characters
3. **Accurate**: Base analogies on real project structure and technologies, but be creative and fun with the storytelling
4. **Consistent**: Maintain character voices and world-building throughout
5. **Creative**: Use unexpected but logical connections between code and story elements. The goal is to provide a fun, memorable experience that teaches about the codebase.

Your stories should be suitable for a wide range of developers, from beginners to experienced engineers. Use your creativity to turn mundane code elements into exciting story elements.

Focus on creating memorable themes, characters, narratives, and settings that represent different technologies and architectural patterns in ways that make complex concepts accessible and fun.`;
  }

  private generateFallbackResponse(prompt: string): string {
    // Simple fallback when LLM is unavailable
    if (prompt.includes('space') || prompt.includes('cosmic')) {
      return `🚀 **Welcome to the Digital Starship!**

You've docked at a magnificent space station where code flows like cosmic energy through the digital universe. Each component of this system is managed by skilled crew members who keep the technological harmony intact.

Your mission: Explore this codebase through the eyes of space travelers, where databases become data archives, APIs become communication channels, and algorithms become navigation systems.

**Choose your path:**
- Meet the Data Archivist (Database Systems)
- Visit the Communications Officer (API Layer)
- Explore the Navigation Bridge (Frontend Interface)
- Venture to Engineering (Backend Systems)`;
    }
    
    if (prompt.includes('mythical') || prompt.includes('kingdom')) {
      return `🏰 **Welcome to the Enchanted Kingdom of Code!**

You've entered a mystical realm where digital magic flows through ancient towers and crystalline data chambers. Each area of this kingdom is protected by wise guardians who understand the deepest secrets of their domains.

Your quest: Discover the magical technologies that power this realm, where databases become dragon hoards, APIs become royal messengers, and algorithms become ancient spells.

**Choose your adventure:**
- Meet the Memory Keeper (Database Magic)
- Consult the Royal Messenger (API Communications)
- Visit the Court Wizard (Frontend Enchantments)
- Explore the Guild Halls (Backend Craftsmanship)`;
    }
    
    return `✨ **Welcome to Your Code Adventure!**

This project contains fascinating technologies that we'll explore through an engaging story. Each part of your codebase has its own character and role in the larger narrative.

**Ready to begin your journey?**`;
  }

  isAvailable(): boolean {
    return !!process.env.LLM_API_KEY;
  }

  private getCacheKey(prompt: string, systemPrompt?: string): string {
    const combined = `${systemPrompt || ''}|${prompt}|${this.provider}|${this.model}`;
    // Use crypto hash for better distribution and collision resistance
    return createHash('sha256')
      .update(combined)
      .digest('hex')
      .substring(0, 32); // Use first 32 characters for better collision resistance
  }
  
  clearCache(): void {
    this.requestCache.clear();
  }
  
  getConfiguration(): { 
    provider: string; 
    model: string; 
    baseURL: string; 
    temperature: number; 
    maxTokens: number;
    cacheSize: number;
  } {
    return {
      provider: this.provider,
      model: this.model,
      baseURL: this.baseURL,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      cacheSize: this.requestCache.size
    };
  }

  // Static factory methods for common providers
  static forGitHubModels(apiKey?: string): LLMClient {
    return new LLMClient({
      baseURL: 'https://models.inference.ai.azure.com',
      apiKey: apiKey || process.env.GITHUB_TOKEN,
      model: 'gpt-4o-mini'
    });
  }

  static forOpenAI(apiKey?: string): LLMClient {
    return new LLMClient({
      baseURL: 'https://api.openai.com/v1',
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini'
    });
  }

  static forOllama(baseURL = 'http://localhost:11434/v1'): LLMClient {
    return new LLMClient({
      baseURL,
      apiKey: 'ollama', // Ollama doesn't need a real API key
      model: 'llama3.2'
    });
  }

  static forAzureOpenAI(endpoint?: string, apiKey?: string): LLMClient {
    return new LLMClient({
      baseURL: endpoint || process.env.LLM_BASE_URL,
      apiKey: apiKey || process.env.LLM_API_KEY,
      model: 'gpt-4o'
    });
  }
}