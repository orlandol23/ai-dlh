import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { trpc } from '@/lib/trpc';
import { getEtherscanUrl } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export const ModulePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const moduleId = parseInt(id || '0');

  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const { data: module, isLoading } = trpc.ai.getModuleById.useQuery({ moduleId });
  const { data: progress } = trpc.progress.getModuleProgress.useQuery({ moduleId });

  // Mutation
  const submitMutation = trpc.progress.submitQuiz.useMutation({
    onSuccess: (data) => {
      setIsSubmitting(false);
      setQuizResult(data);
      setShowResults(true);
    },
    onError: (error) => {
      setIsSubmitting(false);
      alert('Erro ao enviar quiz: ' + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Módulo não encontrado</h1>
          <Button onClick={() => navigate('/dashboard')}>
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const quizData = module.quizData as QuizQuestion[];

  const handleStartQuiz = () => {
    setShowQuiz(true);
    setCurrentQuestion(0);
    setSelectedAnswers(new Array(quizData.length).fill(-1));
    setShowResults(false);
    setQuizResult(null);
  };

  const handleSelectAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < quizData.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (selectedAnswers.includes(-1)) {
      alert('Por favor, responda todas as perguntas antes de finalizar.');
      return;
    }

    setIsSubmitting(true);
    submitMutation.mutate({
      moduleId,
      answers: selectedAnswers,
    });
  };

  const progressPercentage = ((currentQuestion + 1) / quizData.length) * 100;
  const currentQ = quizData[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              ← Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  module.level === 'beginner'
                    ? 'success'
                    : module.level === 'intermediate'
                    ? 'warning'
                    : 'error'
                }
              >
                {module.level}
              </Badge>
              <span className="text-sm text-gray-600">
                {module.estimatedTime} min
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Module Content */}
          {!showQuiz && !showResults && (
            <>
              <div className="mb-8">
                <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">{module.title}</h1>
                <p className="text-muted-foreground">Tópico: {module.topic}</p>
              </div>

              <Card className="mb-8">
                <CardContent className="pt-6">
                  <div className="prose prose-lg max-w-none">
                    <ReactMarkdown>{module.content}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>

              {progress && (
                <Card className="mb-4 bg-info-bg border-info-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-info-fg">
                          Você já completou este módulo
                        </p>
                        <p className="text-sm text-info-fg/80">
                          Score: {progress.score}% -{' '}
                          {progress.score >= 70 ? 'Aprovado ✅' : 'Reprovado ❌'}
                        </p>
                      </div>
                      {progress.transactionHash && (
                        <a
                          href={getEtherscanUrl(progress.transactionHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm font-mono"
                        >
                          Ver na Blockchain →
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-center">
                <Button size="lg" onClick={handleStartQuiz}>
                  {progress ? 'Refazer Quiz' : 'Iniciar Quiz'} →
                </Button>
              </div>
            </>
          )}

          {/* Quiz */}
          {showQuiz && !showResults && (
            <Card>
              <CardHeader>
                <div className="mb-4">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Questão {currentQuestion + 1} de {quizData.length}
                  </p>
                </div>
                <CardTitle>{currentQ.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  {currentQ.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectAnswer(index)}
                      className={`w-full text-left px-4 py-3 border rounded-lg transition ${
                        selectedAnswers[currentQuestion] === index
                          ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
                          : 'hover:bg-muted border-border'
                      }`}
                    >
                      <span className="font-medium mr-2">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      {option}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentQuestion === 0}
                  >
                    ← Anterior
                  </Button>

                  {currentQuestion < quizData.length - 1 ? (
                    <Button
                      onClick={handleNext}
                      disabled={selectedAnswers[currentQuestion] === -1}
                    >
                      Próxima →
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmitQuiz}
                      disabled={selectedAnswers.includes(-1) || isSubmitting}
                      className={isSubmitting ? 'opacity-70 cursor-wait' : ''}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Processando...</span>
                        </div>
                      ) : (
                        'Finalizar Quiz'
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {showResults && quizResult && (
            <div className="text-center space-y-6">
              <Card>
                <CardContent className="pt-8 pb-8">
                  <div className="mb-6">
                    <div
                      className={`font-display text-7xl font-bold tracking-tighter tabular-nums mb-2 ${
                        quizResult.passed ? 'text-success' : 'text-error'
                      }`}
                    >
                      {quizResult.score}%
                    </div>
                    <p className="text-xl text-muted-foreground">
                      {quizResult.correct} de {quizResult.total} corretas
                    </p>
                  </div>

                  {quizResult.passed ? (
                    <div className="bg-success-bg border border-success-border rounded-lg p-6">
                      <p className="text-xl font-semibold text-success-fg mb-2">
                        🎉 Parabéns! Você foi aprovado!
                      </p>
                      <p className="text-success-fg/80">
                        Você atingiu a pontuação mínima de 70%
                      </p>
                    </div>
                  ) : (
                    <div className="bg-error-bg border border-error-border rounded-lg p-6">
                      <p className="text-xl font-semibold text-error-fg mb-2">
                        Não foi desta vez
                      </p>
                      <p className="text-error-fg/80">
                        Você precisa de 70% para ser aprovado. Tente novamente!
                      </p>
                    </div>
                  )}

                  {quizResult.transactionHash && (
                    <div className="mt-6 bg-onchain-bg border border-onchain-border rounded-lg p-6 hash-grid">
                      <p className="font-semibold text-onchain-fg mb-2">
                        ⛓️ Registrado na Blockchain!
                      </p>
                      <p className="text-sm text-onchain-fg/80 mb-3">
                        Seu certificado foi registrado permanentemente na blockchain
                        Ethereum
                      </p>
                      <a
                        href={getEtherscanUrl(quizResult.transactionHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-primary text-primary-foreground font-mono text-sm px-4 py-2 rounded-md hover:opacity-90 transition"
                      >
                        Ver no Etherscan →
                      </a>
                    </div>
                  )}

                  {quizResult.blockchainError && (
                    <div className="mt-6 bg-warning-bg border border-warning-border rounded-lg p-6">
                      <p className="font-semibold text-warning-fg mb-2">
                        ⚠️ Registro blockchain pendente
                      </p>
                      <p className="text-sm text-warning-fg/80">
                        Seu progresso foi salvo, mas houve um problema ao registrar na
                        blockchain: {quizResult.blockchainError}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Voltar ao Dashboard
                </Button>
                <Button onClick={handleStartQuiz}>Refazer Quiz</Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
