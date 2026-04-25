// screens.jsx — AI-DLH screen components
const { useState } = React;

const fmtAddr = (a) => !a ? '' : `${a.slice(0,6)}…${a.slice(-4)}`;

// Landing header
function LandingHeader({ onConnect, connecting }) {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="max-w-[1280px] mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LogoMark size={40} />
          <h1 className="text-xl font-bold">AI-DLH</h1>
        </div>
        <Button onClick={onConnect} disabled={connecting}>
          {connecting ? 'Conectando...' : 'Conectar Carteira'}
        </Button>
      </div>
    </header>
  );
}

// Hero
function Hero({ onConnect, connecting }) {
  return (
    <div className="max-w-4xl mx-auto text-center space-y-8">
      <div className="space-y-4">
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-[1.05] tracking-[-0.02em]">
          Aprenda com <span className="text-[#2463eb]">IA</span><br/>
          Certifique com <span className="text-[#2463eb]">Blockchain</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Hub de aprendizado personalizado que usa IA Generativa para criar conteúdo educacional sob demanda e registra seu progresso na blockchain Ethereum.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" onClick={onConnect} disabled={connecting}>
          {connecting ? 'Conectando...' : 'Começar Agora'}
        </Button>
        <Button size="lg" variant="outline">Saiba Mais</Button>
      </div>
    </div>
  );
}

// Feature tile
function FeatureTile({ tint, emoji, title, desc }) {
  return (
    <Card>
      <CardHeader>
        <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-2xl" style={{background: tint}}>
          <span>{emoji}</span>
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function FeaturesGrid() {
  return (
    <div className="grid md:grid-cols-3 gap-6 mt-16">
      <FeatureTile tint="#dbeafe" emoji="🤖" title="IA Generativa" desc="Conteúdo educacional personalizado gerado pela Google Gemini AI" />
      <FeatureTile tint="#f3e8ff" emoji="⛓️" title="Blockchain" desc="Certificados permanentes registrados na blockchain Ethereum" />
      <FeatureTile tint="#dcfce7" emoji="📊" title="Progresso" desc="Acompanhe seu progresso e estatísticas de aprendizado" />
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { n: 1, t: 'Conecte sua Carteira', d: 'Use MetaMask para autenticar via Web3' },
    { n: 2, t: 'Escolha um Tópico', d: 'Digite o que deseja aprender e o nível de dificuldade' },
    { n: 3, t: 'Estude e Pratique', d: 'Leia o conteúdo gerado e complete o quiz' },
    { n: 4, t: 'Ganhe Certificado', d: 'Score ≥ 70% registra na blockchain' },
  ];
  return (
    <div className="mt-20 space-y-8">
      <h2 className="text-3xl font-bold">Como Funciona</h2>
      <div className="grid md:grid-cols-4 gap-6 text-left">
        {steps.map(s => (
          <Card key={s.n}>
            <CardContent className="pt-6">
              <div className="w-8 h-8 bg-[#2463eb] text-white rounded-full flex items-center justify-center font-bold mb-4">{s.n}</div>
              <h3 className="font-semibold mb-2">{s.t}</h3>
              <p className="text-sm text-slate-600">{s.d}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// App Header
function AppHeader({ address, onLogout }) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <LogoMark size={40} />
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-sm text-slate-600 font-mono">{fmtAddr(address)}</p>
          </div>
        </div>
        <Button variant="outline" onClick={onLogout}>Desconectar</Button>
      </div>
    </header>
  );
}

// StatTile
function StatTile({ n, label, color }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          <p className="text-3xl font-bold" style={{color}}>{n}</p>
          <p className="text-sm text-slate-600 mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Generate Module Form
function GenerateForm({ onGenerate, generating }) {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('beginner');
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerar Novo Módulo</CardTitle>
        <CardDescription>Use IA para criar conteúdo personalizado</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); onGenerate({topic, level}); }}>
          <div>
            <label className="block text-sm font-medium mb-2">Tópico de Estudo</label>
            <Input placeholder="Ex: TypeScript, React Hooks..." value={topic} onChange={e => setTopic(e.target.value)} minLength={3} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Nível de Dificuldade</label>
            <Select value={level} onChange={e => setLevel(e.target.value)}>
              <option value="beginner">Iniciante</option>
              <option value="intermediate">Intermediário</option>
              <option value="advanced">Avançado</option>
            </Select>
          </div>
          <Button type="submit" className={cn('w-full', generating && 'opacity-70 cursor-wait')} disabled={generating || topic.length < 3}>
            {generating
              ? <span className="flex items-center gap-2"><Spinner/><span>Gerando módulo...</span></span>
              : '🤖 Gerar com IA'}
          </Button>
          {generating && <p className="text-sm text-slate-600 text-center animate-pulse">⏳ A IA está criando seu módulo personalizado...</p>}
        </form>
      </CardContent>
    </Card>
  );
}

// Module list row
function ModuleRow({ mod, onOpen }) {
  const variant = mod.level === 'beginner' ? 'success' : mod.level === 'intermediate' ? 'warning' : 'error';
  return (
    <div className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{mod.title}</h3>
          <p className="text-sm text-slate-600 mb-2">{mod.topic}</p>
          <div className="flex items-center gap-2">
            <Badge variant={variant}>{mod.level}</Badge>
            <span className="text-sm text-slate-500">{mod.estimatedTime} min</span>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => onOpen(mod)}>Estudar</Button>
      </div>
    </div>
  );
}

Object.assign(window, {
  LandingHeader, Hero, FeatureTile, FeaturesGrid, HowItWorks,
  AppHeader, StatTile, GenerateForm, ModuleRow, fmtAddr,
});
