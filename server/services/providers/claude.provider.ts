import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { ModuleContentSchema, type ModuleContent } from '../ai.service.js';
import { buildPrompt } from '../prompt-builder.js';
import { logger } from '../../utils/logger.js';
import type { AIProvider, GenerateModuleInput } from './types.js';

export class ClaudeProvider implements AIProvider {
  readonly name = 'claude' as const;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateModule(input: GenerateModuleInput): Promise<ModuleContent> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: buildPrompt(input) + '\n\nRespond ONLY with valid JSON, no markdown code fences.',
        },
      ],
    });

    const block = response.content[0];
    const text = block && block.type === 'text' ? block.text : '';
    // Defensive: strip markdown fences if Claude wraps despite instruction
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      return ModuleContentSchema.parse(parsed);
    } catch (err) {
      if (err instanceof z.ZodError) {
        logger.error('Claude schema validation failed', err.errors);
        throw new Error('Generated module failed validation: ' + err.errors.map((e) => e.message).join(', '));
      }
      if (err instanceof SyntaxError) {
        logger.error('Claude returned invalid JSON', err.message);
        throw new Error('AI generated invalid JSON format');
      }
      throw err;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const r = await this.client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return r.content.length > 0;
    } catch (err) {
      logger.error('Claude connection test failed', err);
      return false;
    }
  }
}
