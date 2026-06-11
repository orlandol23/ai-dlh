import { describe, expect, it } from 'vitest';
import { buildPrompt } from './prompt-builder.js';
import { LEARNING_STYLES } from './vark.js';
import type { GenerateModuleInput } from './providers/types.js';

const baseInput: GenerateModuleInput = {
  topic: 'TypeScript Generics',
  level: 'intermediate',
  locale: 'pt-BR',
};

describe('buildPrompt — VARK learning-style conditioning', () => {
  it('omits the learner profile section when no style is set', () => {
    expect(buildPrompt(baseInput)).not.toContain('Learner profile adaptation');
    expect(buildPrompt({ ...baseInput, learningStyle: null })).not.toContain(
      'Learner profile adaptation',
    );
  });

  it.each(LEARNING_STYLES.map((s) => [s] as const))(
    'includes an adaptation instruction for %s',
    (style) => {
      const prompt = buildPrompt({ ...baseInput, learningStyle: style });

      expect(prompt).toContain('Learner profile adaptation (VARK)');
      expect(prompt).toContain('keeping the exact same JSON structure');
    },
  );

  it('mentions style-specific pedagogy for each style', () => {
    expect(buildPrompt({ ...baseInput, learningStyle: 'visual' })).toContain('VISUAL learner');
    expect(buildPrompt({ ...baseInput, learningStyle: 'auditory' })).toContain('AUDITORY learner');
    expect(buildPrompt({ ...baseInput, learningStyle: 'reading_writing' })).toContain(
      'READING/WRITING learner',
    );
    expect(buildPrompt({ ...baseInput, learningStyle: 'kinesthetic' })).toContain(
      'KINESTHETIC learner',
    );
  });

  it('keeps the JSON output contract untouched regardless of style', () => {
    for (const style of [undefined, ...LEARNING_STYLES] as const) {
      const prompt = buildPrompt({ ...baseInput, learningStyle: style });

      // The structural contract every provider parses against.
      expect(prompt).toContain('"title"');
      expect(prompt).toContain('"content"');
      expect(prompt).toContain('"estimatedTime"');
      expect(prompt).toContain('"quiz"');
      expect(prompt).toContain('Return ONLY a valid JSON object');
      expect(prompt).toContain('Begin your response with { and end with }');
    }
  });

  it('still localizes the output language with a style set', () => {
    const prompt = buildPrompt({ ...baseInput, learningStyle: 'visual' });

    expect(prompt).toContain('Brazilian Portuguese');
    expect(prompt).toContain(baseInput.topic);
  });
});
