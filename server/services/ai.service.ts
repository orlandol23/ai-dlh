import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { config } from '../utils/env.js';
import { logger } from '../utils/logger.js';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

// Quiz question schema
export const QuizQuestionSchema = z.object({
  question: z.string().min(10, 'Question must be at least 10 characters'),
  options: z.array(z.string()).length(4, 'Must have exactly 4 options'),
  correctAnswer: z.number().min(0).max(3, 'Correct answer must be 0-3'),
  explanation: z.string().optional(),
});

// Module content schema
export const ModuleContentSchema = z.object({
  title: z.string().min(10).max(500, 'Title must be between 10-500 characters'),
  content: z.string().min(500).max(15000, 'Content must be between 500-15000 characters'),
  estimatedTime: z.number().min(5).max(60, 'Estimated time must be between 5-60 minutes'),
  quiz: z.array(QuizQuestionSchema).min(3).max(5, 'Must have 3-5 quiz questions'),
});

export type ModuleContent = z.infer<typeof ModuleContentSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

/**
 * AI Service for generating educational content using Google Gemini AI.
 * 
 * Features:
 * - Generates personalized learning modules based on topic and difficulty level
 * - Creates quiz questions with explanations
 * - Validates generated content with Zod schemas
 * - Handles JSON parsing and cleaning from AI responses
 * 
 * @class AIService
 */
export class AIService {
  private model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });

  /**
   * Generate a learning module with quiz
   */
  async generateModule(
    topic: string,
    level: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<ModuleContent> {
    logger.info(`Generating module: ${topic} (${level})`);

    try {
      const prompt = this.buildPrompt(topic, level);
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();

      // Don't log the response body — Gemini sometimes echoes the user's
      // prompt verbatim, and the generated content itself can carry the
      // topic. For sensitive topics that's both a privacy leak and
      // log-volume waste. Length is enough to detect truncation issues.
      logger.debug(`AI response received (${text.length} chars)`);

      // With responseMimeType: 'application/json', Gemini returns valid JSON directly
      const parsed = JSON.parse(text);

      logger.debug('JSON parsed, validating schema...');
      const validated = ModuleContentSchema.parse(parsed);

      logger.info(`Module generated successfully: ${validated.title}`);
      return validated;

    } catch (error) {
      logger.error('AI generation error:', error);

      if (error instanceof z.ZodError) {
        logger.error('Validation errors:', error.errors);
        throw new Error('Generated module failed validation: ' + error.errors.map(e => e.message).join(', '));
      }

      if (error instanceof SyntaxError) {
        logger.error('JSON parsing error at:', error.message);
        throw new Error('AI generated invalid JSON format');
      }

      throw new Error('Failed to generate module with AI');
    }
  }

  /**
   * Build prompt for AI generation
   */
  private buildPrompt(topic: string, level: string): string {
    const levelDescriptions: Record<string, string> = {
      beginner: 'iniciante (conceitos básicos, explicações simples)',
      intermediate: 'intermediário (aprofundamento, alguns conceitos avançados)',
      advanced: 'avançado (conceitos complexos, técnicas profissionais)',
    };

    return `
Você é um especialista em educação e criação de conteúdo educacional. Crie um módulo educacional completo sobre "${topic}" para nível ${levelDescriptions[level]}.

CRÍTICO: Retorne APENAS um objeto JSON válido. NÃO use markdown code blocks. NÃO adicione texto antes ou depois do JSON.

REGRAS OBRIGATÓRIAS:
1. JSON deve começar com { e terminar com }
2. Não use vírgulas após o último item de arrays ou objetos
3. Todas as strings devem estar entre aspas duplas "
4. Escape aspas dentro de strings com \\"
5. Não quebre linhas dentro de strings

Estrutura do JSON:

{
  "title": "Título atrativo do módulo (máximo 100 caracteres)",
  "content": "Conteúdo educacional completo em Markdown (500-1500 palavras)",
  "estimatedTime": 15,
  "quiz": [
    {
      "question": "Pergunta objetiva sobre o conteúdo",
      "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "correctAnswer": 0,
      "explanation": "Explicação de por que esta é a resposta correta"
    }
  ]
}

Requisitos do conteúdo:
- Formato: Markdown bem formatado com títulos (##, ###), listas, código inline, blocos de código
- Extensão: 500-1500 palavras
- Estrutura: Introdução, desenvolvimento com exemplos práticos, conclusão
- Linguagem: Português brasileiro, clara e objetiva
- Exemplos: Incluir pelo menos 2 exemplos práticos com código (se aplicável)
- IMPORTANTE: Use \\n para quebras de linha no content, não quebre a string JSON

Requisitos do quiz:
- Quantidade: 4-5 perguntas
- Cada pergunta: 4 opções de resposta
- Opções: Devem ser plausíveis, evitar opções obviamente erradas
- correctAnswer: Índice da opção correta (0-3)
- explanation: Explicação clara de por que a resposta está correta

Tempo estimado:
- Baseado no conteúdo: 10-30 minutos para leitura e quiz

LEMBRE-SE: 
- Retorne APENAS o JSON
- Sem código markdown
- Sem texto antes ou depois
- JSON deve ser válido e parseável
- Teste mentalmente se há vírgulas extras ou aspas não escapadas

Comece sua resposta diretamente com o caractere { e termine com }
`;
  }

  /**
   * Test AI connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Hello');
      return !!result.response.text();
    } catch (error) {
      logger.error('AI connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
