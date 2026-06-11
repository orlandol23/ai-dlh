import { config } from '../../utils/env.js';
import { logger } from '../../utils/logger.js';
import type { ModuleContent } from '../ai.service.js';
import { GeminiProvider } from './gemini.provider.js';
import { ClaudeProvider } from './claude.provider.js';
import { QwenProvider } from './qwen.provider.js';
import type { AIProvider, GenerateModuleInput, ProviderName, RouterContext } from './types.js';

/**
 * ProviderRouter — picks an AIProvider based on RouterContext (tier + region)
 * and falls back to a secondary provider on 5xx / schema-validation failure.
 *
 * Locale is NOT used for routing in v1 — every provider supports every
 * MVP locale via the prompt-builder. Locale routing for quality is opt-in
 * later if metrics show specific languages underperform on the default.
 */
export class ProviderRouter {
  private gemini: GeminiProvider;
  private claude: ClaudeProvider | null;
  private qwen: QwenProvider | null;

  constructor() {
    this.gemini = new GeminiProvider(config.GEMINI_API_KEY);
    this.claude = config.ANTHROPIC_API_KEY
      ? new ClaudeProvider(config.ANTHROPIC_API_KEY)
      : null;
    this.qwen = config.DASHSCOPE_API_KEY
      ? new QwenProvider(config.DASHSCOPE_API_KEY)
      : null;
  }

  pickPrimary(ctx: RouterContext): AIProvider {
    if (ctx.region === 'cn' && this.qwen) return this.qwen;
    if (ctx.tier === 'premium' && this.claude) return this.claude;
    return this.gemini;
  }

  pickFallback(_ctx: RouterContext, primary: AIProvider): AIProvider | null {
    // Cross-provider fallback chain: prefer a different vendor than the one
    // that just failed, in case the failure is provider-side.
    if (primary.name === 'gemini') return this.claude ?? null;
    if (primary.name === 'claude') return this.gemini;
    if (primary.name === 'qwen') return this.gemini; // not always reachable from CN, but try
    return null;
  }

  async generate(
    input: GenerateModuleInput,
    ctx: RouterContext,
  ): Promise<{ result: ModuleContent; providerUsed: ProviderName }> {
    const primary = this.pickPrimary(ctx);
    try {
      const result = await primary.generateModule(input);
      return { result, providerUsed: primary.name };
    } catch (err) {
      logger.warn(`Primary provider ${primary.name} failed, trying fallback`, err);
      const fallback = this.pickFallback(ctx, primary);
      if (!fallback) throw err;
      const result = await fallback.generateModule(input);
      return { result, providerUsed: fallback.name };
    }
  }
}

export const providerRouter = new ProviderRouter();
