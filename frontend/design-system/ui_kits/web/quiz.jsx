// quiz.jsx — Module + Quiz screens
const { useState: useStateQ } = React;

function QuizOption({ letter, text, selected, onClick }) {
  return (
    <button onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border rounded-lg transition',
        selected ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-200' : 'hover:bg-slate-50 border-slate-300'
      )}>
      <span className="font-medium mr-2">{letter}.</span>{text}
    </button>
  );
}

function ProgressBar({ pct }) {
  return (
    <div className="w-full bg-slate-200 rounded-full h-2">
      <div className="bg-[#2463eb] h-2 rounded-full transition-all" style={{width: `${pct}%`}} />
    </div>
  );
}

function ModuleContent({ mod, onStart, completedProgress }) {
  const variant = mod.level === 'beginner' ? 'success' : mod.level === 'intermediate' ? 'warning' : 'error';
  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{mod.title}</h1>
        <p className="text-slate-600">Tópico: {mod.topic}</p>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant={variant}>{mod.level}</Badge>
          <span className="text-sm text-slate-500">{mod.estimatedTime} min</span>
        </div>
      </div>
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="prose prose-lg max-w-none text-slate-800 leading-relaxed">
            {mod.content.split('\n\n').map((p,i) => <p key={i} className="mb-4">{p}</p>)}
          </div>
        </CardContent>
      </Card>
      {completedProgress && (
        <Card className="mb-4 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Você já completou este módulo</p>
                <p className="text-sm text-slate-600">
                  Score: {completedProgress.score}% — {completedProgress.score >= 70 ? 'Aprovado ✅' : 'Reprovado ❌'}
                </p>
              </div>
              <a className="text-[#2563eb] hover:underline text-sm" href="#">Ver na Blockchain →</a>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex justify-center">
        <Button size="lg" onClick={onStart}>{completedProgress ? 'Refazer Quiz' : 'Iniciar Quiz'} →</Button>
      </div>
    </>
  );
}

function Quiz({ questions, onSubmit, submitting }) {
  const [i, setI] = useStateQ(0);
  const [answers, setAnswers] = useStateQ(() => new Array(questions.length).fill(-1));
  const q = questions[i];
  const pct = ((i + 1) / questions.length) * 100;
  const isLast = i === questions.length - 1;
  return (
    <Card>
      <CardHeader>
        <div className="mb-4">
          <ProgressBar pct={pct} />
          <p className="text-sm text-slate-600 mt-2">Questão {i+1} de {questions.length}</p>
        </div>
        <CardTitle>{q.question}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 mb-6">
          {q.options.map((opt, idx) => (
            <QuizOption key={idx}
              letter={String.fromCharCode(65 + idx)}
              text={opt}
              selected={answers[i] === idx}
              onClick={() => { const a = [...answers]; a[i] = idx; setAnswers(a); }} />
          ))}
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setI(Math.max(0, i-1))} disabled={i === 0}>← Anterior</Button>
          {!isLast
            ? <Button onClick={() => setI(i+1)} disabled={answers[i] === -1}>Próxima →</Button>
            : <Button onClick={() => onSubmit(answers)} disabled={answers.includes(-1) || submitting}
                className={cn(submitting && 'opacity-70 cursor-wait')}>
                {submitting ? <span className="flex items-center gap-2"><Spinner/><span>Processando...</span></span> : 'Finalizar Quiz'}
              </Button>}
        </div>
      </CardContent>
    </Card>
  );
}

function QuizResult({ result, onBack, onRetry }) {
  return (
    <div className="text-center space-y-6">
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="mb-6">
            <div className={cn('text-6xl font-bold mb-2', result.passed ? 'text-green-600' : 'text-red-600')}>
              {result.score}%
            </div>
            <p className="text-xl text-slate-600">{result.correct} de {result.total} corretas</p>
          </div>
          {result.passed ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <p className="text-xl font-semibold text-green-800 mb-2">🎉 Parabéns! Você foi aprovado!</p>
              <p className="text-green-700">Você atingiu a pontuação mínima de 70%</p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-xl font-semibold text-red-800 mb-2">Não foi desta vez</p>
              <p className="text-red-700">Você precisa de 70% para ser aprovado. Tente novamente!</p>
            </div>
          )}
          {result.passed && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="font-semibold text-blue-800 mb-2">⛓️ Registrado na Blockchain!</p>
              <p className="text-sm text-blue-700 mb-3">Seu certificado foi registrado permanentemente na blockchain Ethereum</p>
              <a className="inline-block bg-[#2563eb] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition" href="#">Ver no Etherscan →</a>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex gap-4 justify-center">
        <Button variant="outline" onClick={onBack}>Voltar ao Dashboard</Button>
        <Button onClick={onRetry}>Refazer Quiz</Button>
      </div>
    </div>
  );
}

Object.assign(window, { QuizOption, ProgressBar, ModuleContent, Quiz, QuizResult });
