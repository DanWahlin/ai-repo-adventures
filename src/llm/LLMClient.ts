import { OpenAI } from 'openai';
import { config } from 'dotenv';

// Load environment variables
config();

// Rate limiting configuration
interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxConcurrentRequests: number;
  requestCooldownMs: number;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequestsPerMinute: 20,
  maxConcurrentRequests: 3,
  requestCooldownMs: 1000
};

// Simple rate limiter class
class RateLimiter {
  private requests: number[] = [];
  private activeRequests = 0;
  private lastRequestTime = 0;
  
  constructor(private config: RateLimitConfig) {}
  
  async waitForSlot(): Promise<void> {
    // Check concurrent requests
    if (this.activeRequests >= this.config.maxConcurrentRequests) {
      await this.waitForActiveRequestSlot();
    }
    
    // Check rate per minute
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < 60000);
    
    if (this.requests.length >= this.config.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = 60000 - (now - oldestRequest);
      await this.sleep(waitTime);
    }
    
    // Check cooldown
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.config.requestCooldownMs) {
      await this.sleep(this.config.requestCooldownMs - timeSinceLastRequest);
    }
    
    this.requests.push(Date.now());
    this.lastRequestTime = Date.now();
    this.activeRequests++;
  }
  
  releaseSlot(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
  }
  
  private async waitForActiveRequestSlot(): Promise<void> {
    while (this.activeRequests >= this.config.maxConcurrentRequests) {
      await this.sleep(100);
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

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

export interface LLMConfig {
  baseURL?: string | undefined;
  apiKey?: string | undefined;
  model?: string | undefined;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
}

export class LLMClient {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private provider: string;
  private baseURL: string;
  private rateLimiter: RateLimiter;
  private requestCache: Map<string, { response: LLMResponse; timestamp: number }> = new Map();

  constructor(config?: LLMConfig & { rateLimitConfig?: Partial<RateLimitConfig> }) {
    // Environment-based configuration with optional overrides
    this.baseURL = config?.baseURL || process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
    const apiKey = config?.apiKey || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.GITHUB_TOKEN || 'fallback-key';
    
    this.model = config?.model || process.env.LLM_MODEL || 'gpt-4o-mini';
    this.temperature = config?.temperature ?? parseFloat(process.env.LLM_TEMPERATURE || '0.7');
    this.maxTokens = config?.maxTokens ?? parseInt(process.env.LLM_MAX_TOKENS || '1000');
    
    // Initialize rate limiter
    const rateLimitConfig = { ...DEFAULT_RATE_LIMIT, ...config?.rateLimitConfig };
    this.rateLimiter = new RateLimiter(rateLimitConfig);
    
    // Infer provider from baseURL
    this.provider = this.inferProvider(this.baseURL);

    // Create OpenAI client with dynamic configuration
    this.client = new OpenAI({
      baseURL: this.baseURL,
      apiKey: apiKey,
      // Add custom headers if needed for certain providers
      defaultHeaders: this.getProviderHeaders()
    });
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

  async generateResponse(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    const cacheKey = this.getCacheKey(prompt, systemPrompt);
    
    // Check cache first (5 minute TTL)
    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      console.debug('Using cached LLM response');
      return cached.response;
    }
    
    // Wait for rate limit slot
    await this.rateLimiter.waitForSlot();
    
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
      
      // Add system prompt
      if (systemPrompt || this.getDefaultSystemPrompt()) {
        messages.push({
          role: 'system',
          content: systemPrompt || this.getDefaultSystemPrompt()
        });
      }
      
      // Add user prompt
      messages.push({
        role: 'user',
        content: prompt
      });

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });

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
      console.warn(`LLM API call failed (${this.provider}), using fallback:`, error instanceof Error ? error.message : String(error));
      
      // Fallback to a simple template-based response
      return {
        content: this.generateFallbackResponse(prompt),
        model: 'fallback-template',
        provider: 'Fallback System'
      };
    } finally {
      this.rateLimiter.releaseSlot();
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
    
    if (prompt.includes('medieval') || prompt.includes('kingdom')) {
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
    return !!(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.GITHUB_TOKEN);
  }

  private getCacheKey(prompt: string, systemPrompt?: string): string {
    const combined = `${systemPrompt || ''}|${prompt}`;
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
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
      baseURL: endpoint || process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: apiKey || process.env.AZURE_OPENAI_API_KEY,
      model: 'gpt-4o'
    });
  }
}