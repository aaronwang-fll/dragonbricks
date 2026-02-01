import type { RobotProfile, Defaults, ClarificationRequest } from '../../types';
import { SYSTEM_PROMPT, buildContextPrompt, buildUserPrompt, ERROR_TRANSLATION_PROMPT } from './prompts';

export interface AIParseResult {
  success: boolean;
  pythonCode?: string;
  explanation?: string;
  confidence: number;
  needsClarification?: ClarificationRequest;
  error?: string;
}

export interface AIErrorTranslation {
  userMessage: string;
  suggestion: string;
  isKnownError: boolean;
}

interface AIClientConfig {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model?: string;
}

// Default models
const DEFAULT_MODELS = {
  anthropic: 'claude-3-haiku-20240307',
  openai: 'gpt-4o-mini',
};

/**
 * AI Client for natural language to code conversion
 * Uses Anthropic Claude or OpenAI as fallback when rule-based parser fails
 */
export class AIClient {
  private config: AIClientConfig;
  private model: string;

  constructor(config: AIClientConfig) {
    this.config = config;
    this.model = config.model || DEFAULT_MODELS[config.provider];
  }

  /**
   * Parse natural language command using AI
   */
  async parseCommand(
    naturalLanguage: string,
    profile: RobotProfile | null,
    defaults: Defaults,
    routineNames: string[] = []
  ): Promise<AIParseResult> {
    const context = buildContextPrompt(profile, defaults, routineNames);
    const userPrompt = buildUserPrompt(naturalLanguage, context);

    try {
      const response = await this.callAI(SYSTEM_PROMPT, userPrompt);
      return this.parseResponse(response);
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        error: error instanceof Error ? error.message : 'AI parsing failed',
      };
    }
  }

  /**
   * Translate error message to user-friendly explanation
   */
  async translateError(errorMessage: string): Promise<AIErrorTranslation> {
    try {
      const response = await this.callAI(
        ERROR_TRANSLATION_PROMPT,
        `Translate this error:\n\n${errorMessage}`
      );

      const parsed = JSON.parse(response);
      return {
        userMessage: parsed.userMessage || 'An error occurred',
        suggestion: parsed.suggestion || 'Try again or check your code',
        isKnownError: parsed.isKnownError ?? false,
      };
    } catch {
      return {
        userMessage: 'An unexpected error occurred',
        suggestion: 'Please try again',
        isKnownError: false,
      };
    }
  }

  private async callAI(systemPrompt: string, userPrompt: string): Promise<string> {
    if (this.config.provider === 'anthropic') {
      return this.callAnthropic(systemPrompt, userPrompt);
    } else {
      return this.callOpenAI(systemPrompt, userPrompt);
    }
  }

  private async callAnthropic(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private parseResponse(response: string): AIParseResult {
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          confidence: 0,
          error: 'Invalid AI response format',
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.needsClarification) {
        return {
          success: false,
          confidence: parsed.confidence || 0.5,
          needsClarification: {
            field: parsed.needsClarification.field,
            message: parsed.needsClarification.message,
            type: parsed.needsClarification.field as 'distance' | 'angle' | 'duration',
          },
        };
      }

      return {
        success: parsed.success ?? false,
        pythonCode: parsed.pythonCode,
        explanation: parsed.explanation,
        confidence: parsed.confidence ?? 0.8,
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        error: 'Failed to parse AI response',
      };
    }
  }
}

// Singleton instance - will be configured when API key is provided
let aiClient: AIClient | null = null;

/**
 * Get or create the AI client
 */
export function getAIClient(): AIClient | null {
  return aiClient;
}

/**
 * Configure the AI client with API credentials
 */
export function configureAIClient(config: AIClientConfig): AIClient {
  aiClient = new AIClient(config);
  return aiClient;
}

/**
 * Check if AI client is configured
 */
export function isAIConfigured(): boolean {
  return aiClient !== null;
}

/**
 * Parse command with AI fallback
 * First tries rule-based parser, falls back to AI if confidence is low
 */
export async function parseWithAIFallback(
  naturalLanguage: string,
  ruleBasedResult: AIParseResult,
  profile: RobotProfile | null,
  defaults: Defaults,
  routineNames: string[] = [],
  confidenceThreshold = 0.7
): Promise<AIParseResult> {
  // If rule-based parser succeeded with high confidence, use it
  if (ruleBasedResult.success && ruleBasedResult.confidence >= confidenceThreshold) {
    return ruleBasedResult;
  }

  // Try AI if configured
  if (aiClient) {
    try {
      const aiResult = await aiClient.parseCommand(
        naturalLanguage,
        profile,
        defaults,
        routineNames
      );

      // Use AI result if it has higher confidence
      if (aiResult.success && aiResult.confidence > ruleBasedResult.confidence) {
        return aiResult;
      }
    } catch (error) {
      console.warn('AI fallback failed:', error);
    }
  }

  // Return rule-based result as fallback
  return ruleBasedResult;
}
