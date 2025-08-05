import { OpenAI, AzureOpenAI } from 'openai';
import { LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, LLM_REQUEST_TIMEOUT, 
         LLM_API_VERSION, GITHUB_TOKEN } from '../shared/config.js';

export interface LLMResponse {
  content: string;
}

export interface LLMRequestOptions {
  responseFormat?: 'text' | 'json_object';
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
      const requestParams: any = {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      };

      // Azure OpenAI handles deployment differently - no need to modify requestParams

      if (options?.responseFormat === 'json_object') {
        requestParams.response_format = { type: 'json_object' };
      }

      const completion = await Promise.race([
        this.client.chat.completions.create(requestParams),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), LLM_REQUEST_TIMEOUT)
        )
      ]);

      const content = completion.choices[0]?.message?.content || '';
      return { content };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`LLM request failed: ${message}`);
    }
  }
}