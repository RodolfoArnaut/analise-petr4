import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  BarChart3, LayoutDashboard, Newspaper, Settings,
  Play, RefreshCw, TrendingUp, TrendingDown, Minus,
  CheckCircle2, Zap, Globe, AlertCircle, Key, Eye, EyeOff,
  ShieldCheck, X, Info
} from 'lucide-react';
import {
  fetchNews, classifySentiment, generateSummary, calculateScore
} from './api/pipeline';

// =====================================================
// TOKEN STORAGE — sessionStorage only (cleared on tab close)
// Never persisted to localStorage or committed to code.
// =====================================================
const TOKEN_KEY = 'petra_or_token';

function getStoredToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}
function storeToken(token) {
  try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* noop */ }
}
function clearToken() {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
}

// =====================================================
// GAUGE COMPONENT
// =====================================================
function ScoreGauge({ score }) {
  const pct = ((score + 1) / 2) * 100;
  const angle = -90 + (pct / 100) * 180;
  const color = score > 0.2 ? '#10b981' : score < -0.2 ? '#ef4444' : '#f59e0b';

  return (
    <div className="gauge-container">
      <svg className="gauge-svg" viewBox="0 0 140 80">
        <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
        <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${pct * 1.88} 188`} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        <line x1="70" y1="75" x2={70 + 40 * Math.cos((angle * Math.PI) / 180)} y2={75 + 40 * Math.sin((angle * Math.PI) / 180)}
          stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="70" cy="75" r="4" fill={color} />
        <text x="70" y="62" textAnchor="middle" fill={color} fontSize="18" fontWeight="800" fontFamily="JetBrains Mono, monospace">
          {score >= 0 ? '+' : ''}{score.toFixed(2)}
        </text>
        <text x="15" y="80" fill="#4a4f5c" fontSize="8" fontFamily="Inter">-1</text>
        <text x="122" y="80" fill="#4a4f5c" fontSize="8" fontFamily="Inter">+1</text>
      </svg>
      <div className="gauge-label">Sentiment Score</div>
    </div>
  );
}

// =====================================================
// MINI BAR CHART COMPONENT
// =====================================================
function SentimentChart({ stats }) {
  const max = Math.max(stats.pos, stats.neg, stats.neu, 1);
  return (
    <div className="chart-bar-container">
      <div className="chart-bar-wrapper">
        <div className="chart-value text-green">{stats.pos}</div>
        <div className="chart-bar green" style={{ height: `${(stats.pos / max) * 100}%` }} />
        <div className="chart-label">Pos</div>
      </div>
      <div className="chart-bar-wrapper">
        <div className="chart-value text-red">{stats.neg}</div>
        <div className="chart-bar red" style={{ height: `${(stats.neg / max) * 100}%` }} />
        <div className="chart-label">Neg</div>
      </div>
      <div className="chart-bar-wrapper">
        <div className="chart-value text-amber">{stats.neu}</div>
        <div className="chart-bar amber" style={{ height: `${(stats.neu / max) * 100}%` }} />
        <div className="chart-label">Neu</div>
      </div>
    </div>
  );
}

// =====================================================
// TOKEN SETUP MODAL
// =====================================================
function TokenModal({ onSave }) {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed.startsWith('sk-or-')) {
      setError('O token deve começar com "sk-or-". Obtenha o seu em openrouter.ai/keys');
      return;
    }
    storeToken(trimmed);
    onSave(trimmed);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-icon"><Key size={20} /></div>
          <div>
            <h2 className="modal-title">Configure seu API Token</h2>
            <p className="modal-subtitle">OpenRouter — acesso gratuito a modelos de IA</p>
          </div>
        </div>

        <div className="modal-info">
          <Info size={14} />
          <span>
            O token fica <strong>apenas nesta aba</strong> (sessionStorage) e é apagado ao fechar o navegador.
            Nunca é enviado para nenhum servidor além da OpenRouter.
          </span>
        </div>

        <div className="token-input-wrapper">
          <input
            id="input-api-token"
            type={show ? 'text' : 'password'}
            className="token-input"
            placeholder="sk-or-v1-..."
            value={value}
            onChange={e => { setValue(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoComplete="off"
            spellCheck={false}
          />
          <button className="token-eye-btn" onClick={() => setShow(s => !s)} title={show ? 'Ocultar' : 'Mostrar'}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && <div className="token-error"><AlertCircle size={13} /> {error}</div>}

        <a className="token-link" href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
          Obter token gratuito em openrouter.ai →
        </a>

        <button
          id="btn-save-token"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
          onClick={handleSave}
          disabled={!value.trim()}
        >
          <ShieldCheck size={16} /> Salvar e Continuar
        </button>
      </div>
    </div>
  );
}

// =====================================================
// APP
// =====================================================
function App() {
  const [apiToken, setApiToken] = useState(() => getStoredToken());
  const [showTokenModal, setShowTokenModal] = useState(false);

  const [processedNews, setProcessedNews] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [stats, setStats] = useState({ pos: 0, neg: 0, neu: 0, score: 0, total: 0 });
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [newsSource, setNewsSource] = useState('');
  const logRef = useRef(null);

  // Show modal on first visit (no token yet)
  useEffect(() => {
    if (!getStoredToken()) setShowTokenModal(true);
  }, []);

  const log = useCallback((msg, type = '') => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => {
      const next = [...prev, { time, msg, type }];
      return next.slice(-50);
    });
    setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50);
  }, []);

  const handleTokenSave = (token) => {
    setApiToken(token);
    setShowTokenModal(false);
  };

  const handleClearToken = () => {
    clearToken();
    setApiToken('');
    setShowTokenModal(true);
  };

  const runPipeline = async () => {
    if (isProcessing) return;
    if (!apiToken) { setShowTokenModal(true); return; }

    setIsProcessing(true);
    setProcessedNews([]);
    setAnalysis(null);
    setStats({ pos: 0, neg: 0, neu: 0, score: 0, total: 0 });
    setLogs([]);
    setProgress({ current: 0, total: 0 });

    try {
      // STEP 1 — Fetch news
      log('Buscando notícias sobre PETR4...', 'info');
      const { articles, source } = await fetchNews('PETR4');
      setNewsSource(source);
      log(`${articles.length} notícias encontradas via ${source}`, 'ok');
      setProgress({ current: 0, total: articles.length });

      // STEP 2 — Classify each article
      const classified = [];
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        log(`Classificando [${i + 1}/${articles.length}]: ${article.title.substring(0, 45)}...`);

        const { sentiment, model } = await classifySentiment(apiToken, article.title);
        const item = { ...article, sentiment };
        classified.push(item);

        log(`→ ${sentiment.toUpperCase()} (via ${model.split('/')[1]})`,
          sentiment === 'positivo' ? 'ok' : sentiment === 'negativo' ? 'err' : 'info');

        setProcessedNews([...classified]);
        setProgress({ current: i + 1, total: articles.length });
      }

      // STEP 3 — Calculate score
      const finalStats = calculateScore(classified);
      setStats(finalStats);
      log(`Score calculado: ${finalStats.score.toFixed(2)} (${finalStats.pos}P / ${finalStats.neg}N / ${finalStats.neu}U)`, 'ok');

      // STEP 4 — Generate AI summary
      log('Gerando resumo semanal com IA...', 'info');
      const summary = await generateSummary(apiToken, finalStats);
      log(`Resumo: "${summary}"`, 'ok');

      const periodEnd = new Date().toISOString().split('T')[0];
      const periodStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      setAnalysis({ summary, period_start: periodStart, period_end: periodEnd });

      log('✓ Pipeline concluído com sucesso', 'ok');

    } catch (error) {
      log(`Erro: ${error.message}`, 'err');
      // If token is invalid, prompt reconfiguration
      if (error.message.includes('Token inválido')) {
        clearToken();
        setApiToken('');
        setTimeout(() => setShowTokenModal(true), 800);
      }
    }

    setIsProcessing(false);
  };

  const todayStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const tokenMasked = apiToken ? `${apiToken.substring(0, 10)}${'•'.repeat(12)}` : '';

  return (
    <div className="app-container">
      {/* TOKEN MODAL */}
      {showTokenModal && <TokenModal onSave={handleTokenSave} />}

      {/* ==================== SIDEBAR ==================== */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon"><BarChart3 size={18} color="#000" /></div>
          <span>PETRA</span>
        </div>

        <div className="nav-section">
          <div className="nav-label">Menu</div>
          <button className="nav-item active"><LayoutDashboard size={16} /> Dashboard</button>
          <button className="nav-item"><Newspaper size={16} /> Histórico</button>
          <button
            className="nav-item"
            id="btn-open-token-settings"
            onClick={() => setShowTokenModal(true)}
          >
            <Settings size={16} /> Configurações
          </button>
        </div>

        <div className="nav-section">
          <div className="nav-label">Modelos IA</div>
          {['mistral-7b', 'openchat-7b', 'hermes-2', 'mythomist-7b', 'llama-3-8b'].map((m, i) => (
            <div key={i} className="nav-item" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', cursor: 'default' }}>
              <Zap size={12} /> {m}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          {apiToken ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div className="status-indicator">
                <div className="status-dot" />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tokenMasked}</span>
              </div>
              <button
                className="nav-item"
                id="btn-clear-token"
                onClick={handleClearToken}
                style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', color: '#ef4444', marginTop: '0.2rem' }}
              >
                <X size={11} /> Limpar token
              </button>
            </div>
          ) : (
            <div className="status-indicator">
              <div className="status-dot offline" />
              <span style={{ cursor: 'pointer', color: '#f59e0b' }} onClick={() => setShowTokenModal(true)}>
                Token não configurado
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* ==================== MAIN ==================== */}
      <main className="main-content">
        <header className="dashboard-header">
          <div className="header-left">
            <h1>Análise de Sentimento</h1>
            <p>Pipeline de IA para notícias financeiras · 100% local</p>
          </div>
          <div className="header-right">
            <div className="date-badge">{todayStr}</div>
            <div className="asset-badge">PETR4</div>
          </div>
        </header>

        <div className="grid-layout">
          {/* ======= STAT CARDS ======= */}
          <div className="card stat-card score" style={{ gridColumn: 'span 3' }}>
            <div className="card-title"><TrendingUp size={12} /> Score</div>
            <div className={`stat-value ${stats.score >= 0 ? 'text-cyan' : 'text-red'}`}>
              {stats.score >= 0 ? '+' : ''}{stats.score.toFixed(2)}
            </div>
            <div className="stat-sub">{stats.total} notícias analisadas</div>
          </div>
          <div className="card stat-card positive" style={{ gridColumn: 'span 3' }}>
            <div className="card-title"><CheckCircle2 size={12} /> Positivas</div>
            <div className="stat-value text-green">{stats.pos}</div>
            <div className="stat-sub">{stats.total ? ((stats.pos / stats.total) * 100).toFixed(0) : 0}% do total</div>
          </div>
          <div className="card stat-card negative" style={{ gridColumn: 'span 3' }}>
            <div className="card-title"><TrendingDown size={12} /> Negativas</div>
            <div className="stat-value text-red">{stats.neg}</div>
            <div className="stat-sub">{stats.total ? ((stats.neg / stats.total) * 100).toFixed(0) : 0}% do total</div>
          </div>
          <div className="card stat-card neutral" style={{ gridColumn: 'span 3' }}>
            <div className="card-title"><Minus size={12} /> Neutras</div>
            <div className="stat-value text-amber">{stats.neu}</div>
            <div className="stat-sub">{stats.total ? ((stats.neu / stats.total) * 100).toFixed(0) : 0}% do total</div>
          </div>

          {/* ======= GAUGE ======= */}
          <div className="card chart-section" style={{ gridColumn: 'span 6' }}>
            <div className="card-title"><BarChart3 size={12} /> Score Gauge</div>
            <ScoreGauge score={stats.score} />
          </div>

          {/* ======= CHART ======= */}
          <div className="card chart-section" style={{ gridColumn: 'span 6' }}>
            <div className="card-title"><BarChart3 size={12} /> Distribuição</div>
            <SentimentChart stats={stats} />
          </div>

          {/* ======= PIPELINE CONTROLS ======= */}
          <div className="card pipeline-section">
            <div className="card-title"><Zap size={12} /> Pipeline de Análise</div>
            <div className="pipeline-controls">
              <button
                className="btn btn-primary"
                onClick={runPipeline}
                disabled={isProcessing}
                id="btn-run-pipeline"
              >
                {isProcessing
                  ? <><div className="spinner" /> Processando...</>
                  : <><Play size={16} /> Buscar e Analisar Notícias</>}
              </button>
              <button className="btn btn-secondary" onClick={runPipeline} disabled={isProcessing}>
                <RefreshCw size={14} /> Nova Busca
              </button>
              {newsSource && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Globe size={12} /> Fonte: {newsSource}
                </div>
              )}
            </div>

            {/* Progress */}
            {progress.total > 0 && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                </div>
                <div className="progress-text">
                  <span>{progress.current} de {progress.total} notícias</span>
                  <span>{((progress.current / progress.total) * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}

            {/* Log */}
            {logs.length > 0 && (
              <div className="log-area" ref={logRef}>
                {logs.map((l, i) => (
                  <div key={i} className="log-line">
                    <span className="log-time">{l.time}</span>
                    <span className={`log-msg ${l.type}`}>{l.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ======= AI SUMMARY ======= */}
          {analysis && (
            <div className="card summary-card">
              <div className="card-title"><Zap size={12} /> Resumo Semanal — IA</div>
              <p className="summary-text">{analysis.summary}</p>
              <p className="summary-period">
                {analysis.period_start} → {analysis.period_end}
              </p>
            </div>
          )}

          {/* ======= NEWS LIST ======= */}
          <div className="card news-section">
            <div className="card-title"><Newspaper size={12} /> Notícias Processadas ({processedNews.length})</div>
            <div className="news-list">
              {processedNews.map((news, i) => (
                <div key={i} className={`news-item ${news.sentiment}`}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="news-title">{news.title}</div>
                    <div className="news-meta">
                      {news.source && <span>{news.source} · </span>}
                      {news.published_at && new Date(news.published_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className={`sentiment-tag ${news.sentiment}`}>
                    {news.sentiment}
                  </div>
                </div>
              ))}
              {processedNews.length === 0 && (
                <div className="empty-state">
                  <AlertCircle size={32} />
                  <p>
                    {apiToken
                      ? <>Clique em <strong>"Buscar e Analisar Notícias"</strong> para iniciar o pipeline.</>
                      : <>Configure seu <strong>token OpenRouter</strong> para começar.</>
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
