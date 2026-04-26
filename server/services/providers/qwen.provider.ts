import axios from 'axios';
import { z } from 'zod';
import { ModuleContentSchema, type ModuleContent } from '../ai.service.js';
import { buildPrompt } from '../prompt-builder.js';
import { logger } from '../../utils/logger.js';
import type { AIProvider, GenerateModuleInput } from './types.js';

const DASHSCOPE_URL =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

/**
 * Qwen provider via Alibaba Cloud DashScope REST API.
 *
 * Used for region=cn where Google's Gemini API is blocked.
 * Default model: qwen-plus (good cost/quality for educational content).
 */
export class QwenProvider implements AIProvider {
  readonly name = 'qwen' as const;

  constructor(private apiKey: string) {}

  async generateModule(input: GenerateModuleInput): Promise<ModuleContent> {
    const res = await axios.post(
      DASHSCOPE_URL,
      {
        model: 'qwen-plus',
        input: { prompt: buildPrompt(input) },
        parameters: {
          temperature: 0.7,
          max_tokens: 8192,
          result_format: 'message',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120_000,
      },
    );

    const text: string =
      res.data?.output?.choices?.[0]?.message?.content ??
      res.data?.output?.text ??
      '';
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      return ModuleContentSchema.parse(parsed);
    } catch (err) {
      if (err instanceof z.ZodError) {
        logger.error('Qwen schema validation failed', err.errors);
        throw new Error('Generated module failed validation: ' + err.errors.map((e) => e.message).join(', '));
      }
      if (err instanceof SyntaxError) {
        logger.error('Qwen returned invalid JSON', err.message);
        throw new Error('AI generated invalid JSON format');
      }
      throw err;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await axios.post(
        DASHSCOPE_URL,
        {
          model: 'qwen-plus',
          input: { prompt: 'Hi' },
          parameters: { max_tokens: 10, result_format: 'message' },
        },
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 30_000,
        },
      );
      return !!res.data?.output;
    } catch (err) {
      logger.error('Qwen connection test failed', err);
      return false;
    }
  }
}
