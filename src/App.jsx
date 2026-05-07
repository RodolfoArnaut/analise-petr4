import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  BarChart3, LayoutDashboard, Settings,
  Play, RefreshCw, TrendingUp, TrendingDown, Minus,
  CheckCircle2, Zap, Globe, AlertCircle, Key, Eye, EyeOff,
  ShieldCheck, X, Info, Copy, Check, ExternalLink
} from 'lucide-react';
import {
  fetchNews, classifySentiment, generateSummary, calculateScore, fetchQuote
} from './api/pipeline';

// =====================================================
// TOKEN STORAGE — sessionStorage only (clears on tab close)
// =====================================================
const TOKEN_KEY = 'liberty_analytics_token';
const getStoredToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
const storeToken = (t) => { try { sessionStorage.setItem(TOKEN_KEY, t); } catch { } };
const clearToken = () => { try { sessionStorage.removeItem(TOKEN_KEY) || localStorage.removeItem(TOKEN_KEY); } catch { } };

// =====================================================
// FREE TIER LOGIC
// =====================================================
const FREE_LIMIT = 3;

const getUsage = () => {
  try {
    const data = JSON.parse(localStorage.getItem('liberty_usage')) || { date: '', count: 0 };
    const today = new Date().toISOString().split('T')[0];
    if (data.date !== today) return { date: today, count: 0 };
    return data;
  } catch {
    return { date: new Date().toISOString().split('T')[0], count: 0 };
  }
};

const incrementUsage = () => {
  const usage = getUsage();
  usage.count += 1;
  localStorage.setItem('liberty_usage', JSON.stringify(usage));
};

// =====================================================
// GAUGE
// =====================================================
function ScoreGauge({ score }) {
  const pct = ((score + 1) / 2) * 100;
  const arcLength = 188.5;
  const strokeDashoffset = arcLength - (pct / 100) * arcLength;
  
  const getSentimentLabel = (s) => {
    if (s >= 0.5) return 'Forte Positivo';
    if (s > 0.1) return 'Levemente Positivo';
    if (s >= -0.1) return 'Neutro';
    if (s > -0.5) return 'Levemente Negativo';
    return 'Forte Negativo';
  };

  const color = score > 0.1 ? 'var(--accent-green)' : score < -0.1 ? 'var(--accent-red)' : 'var(--accent-amber)';
  const label = getSentimentLabel(score);

  return (
    <div className="premium-gauge">
      <div className="gauge-chart">
        <svg viewBox="0 0 140 80" className="gauge-svg">
          <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke="var(--bg-tertiary)" strokeWidth="12" strokeLinecap="round" />
          <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={arcLength} strokeDashoffset={strokeDashoffset} 
            className="gauge-fill-anim"
            style={{ filter: `drop-shadow(0 0 8px ${color}80)` }} />
        </svg>
        <div className="gauge-core">
          <div className="gauge-score" style={{ color, textShadow: `0 0 16px ${color}60` }}>
            {score > 0 ? '+' : ''}{score.toFixed(2)}
          </div>
          <div className="gauge-label-text">{label}</div>
        </div>
      </div>
      <div className="gauge-legend">
        <span>-1 (Neg)</span>
        <span>0</span>
        <span>+1 (Pos)</span>
      </div>
    </div>
  );
}

// =====================================================
// BAR CHART
// =====================================================
function SentimentChart({ stats }) {
  const total = stats.total || 1;
  const data = [
    { label: 'Positivo', val: stats.pos, pct: (stats.pos / total) * 100, color: 'var(--accent-green)', bg: 'var(--accent-green-dim)' },
    { label: 'Neutro', val: stats.neu, pct: (stats.neu / total) * 100, color: 'var(--accent-amber)', bg: 'var(--accent-amber-dim)' },
    { label: 'Negativo', val: stats.neg, pct: (stats.neg / total) * 100, color: 'var(--accent-red)', bg: 'var(--accent-red-dim)' },
  ];

  return (
    <div className="premium-dist-chart">
      {data.map((item) => (
        <div key={item.label} className="dist-row">
          <div className="dist-info">
            <span className="dist-label">{item.label}</span>
            <span className="dist-val">{item.val} <span className="dist-pct">{item.pct.toFixed(0)}%</span></span>
          </div>
          <div className="dist-track">
            <div className="dist-fill" style={{ 
              width: `${item.pct}%`, 
              backgroundColor: item.color,
              boxShadow: `0 0 12px ${item.bg}`
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// =====================================================
// TREND LINE CHART
// =====================================================
function SentimentTrend({ history }) {
  if (history.length < 2) return <div className="empty-trend">Aguardando mais dados da sessão...</div>;
  
  const width = 300;
  const height = 100;
  const paddingX = 12;
  const paddingY = 16;
  
  const usableWidth = width - 2 * paddingX;
  const usableHeight = height - 2 * paddingY;
  
  const getX = (i) => paddingX + (i / (history.length - 1)) * usableWidth;
  const getY = (score) => paddingY + usableHeight / 2 - (score * (usableHeight / 2));

  const linePath = history.map((score, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(score)}`).join(' ');
  const areaPath = `${linePath} L ${getX(history.length - 1)} ${height} L ${getX(0)} ${height} Z`;

  return (
    <div className="premium-trend-container">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="trend-svg">
        <defs>
          <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent-cyan)" />
            <stop offset="100%" stopColor="#0080ff" />
          </linearGradient>
        </defs>
        
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
        
        <path d={areaPath} fill="url(#trendArea)" className="trend-area-anim" />
        <path d={linePath} fill="none" stroke="url(#trendLine)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,212,255,0.4))' }} className="trend-line-anim" />
        
        {history.map((score, i) => {
           const x = getX(i);
           const y = getY(score);
           const color = score > 0.1 ? 'var(--accent-green)' : score < -0.1 ? 'var(--accent-red)' : 'var(--accent-amber)';
           return (
             <g key={i} className="trend-point-group">
               <circle cx={x} cy={y} r="3.5" fill="var(--bg-card)" stroke={color} strokeWidth="2.5" className="trend-point" />
               <circle cx={x} cy={y} r="14" fill="transparent" className="trend-hover-area">
                 <title>Score: {score.toFixed(2)}</title>
               </circle>
             </g>
           );
        })}
      </svg>
      <div className="trend-axis-x">
        <span>Início</span>
        <span className="trend-live-badge"><span className="live-dot"></span> Agora</span>
      </div>
    </div>
  );
}

// =====================================================
// TOKEN MODAL — closeable, dismissible
// =====================================================
function TokenModal({ onSave, onClose, hasToken }) {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const handleSave = () => {
    const t = value.trim();
    if (!t.startsWith('sk-or-')) {
      setError('Token deve começar com "sk-or-". Veja openrouter.ai/keys');
      return;
    }
    storeToken(t);
    onSave(t);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">

        {/* Close button — always visible */}
        <button className="modal-close" onClick={onClose} title="Fechar">
          <X size={16} />
        </button>

        <div className="modal-header">
          <div className="modal-icon"><Key size={20} /></div>
          <div>
            <h2 className="modal-title">API Token — OpenRouter</h2>
            <p className="modal-subtitle">Gratuito · Modelos open-source</p>
          </div>
        </div>

        <div className="modal-info">
          <Info size={14} />
          <span>
            Token salvo <strong>apenas nesta aba</strong> (sessionStorage). Apagado ao fechar o navegador.
            Nunca enviado a nenhum servidor além da OpenRouter.
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
            autoFocus
          />
          <button className="token-eye-btn" onClick={() => setShow(s => !s)}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && <div className="token-error"><AlertCircle size={13} /> {error}</div>}

        <a className="token-link" href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
          Obter token gratuito → openrouter.ai/keys
        </a>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
            {hasToken ? 'Cancelar' : 'Usar depois'}
          </button>
          <button
            id="btn-save-token"
            className="btn btn-primary"
            style={{ flex: 2, justifyContent: 'center' }}
            onClick={handleSave}
            disabled={!value.trim()}
          >
            <ShieldCheck size={16} /> Salvar Token
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// APP
// =====================================================
export default function App() {
  const [apiToken, setApiToken] = useState(() => getStoredToken());
  const [showModal, setShowModal] = useState(false);
  const [processedNews, setProcessedNews] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [stats, setStats] = useState({ pos: 0, neg: 0, neu: 0, score: 0, total: 0 });
  const [newsSource, setNewsSource]      = useState('');
  const [ticker, setTicker]              = useState('PETR4');
  const [tickerInput, setTickerInput]    = useState('PETR4');
  const [selectedModel, setSelectedModel] = useState(0);
  const [trend, setTrend]                = useState([]);
  const [copied, setCopied]                = useState(false);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [quote, setQuote] = useState(null);
  const [freeUsesLeft, setFreeUsesLeft]    = useState(() => Math.max(0, FREE_LIMIT - getUsage().count));
  const logRef = useRef(null);

  // We no longer force the modal on first visit, allowing the free tier to be used.

  const log = useCallback((msg, type = '') => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { time, msg, type }].slice(-50));
    setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50);
  }, []);

  const handleTokenSave = (token) => { setApiToken(token); setShowModal(false); };
  const handleClearToken = () => { clearToken(); setApiToken(''); setShowModal(true); };

  const handleExport = () => {
    const content = `Relatório de Sentimento ${ticker}\n\n${analysis.summary}\n\nScore: ${stats.score}\nData: ${new Date().toLocaleDateString()}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${ticker.toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySummary = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runPipeline = async () => {
    if (isProcessing) return;

    // Check limits and token
    let tokenToUse = apiToken;
    let isUsingFreeTier = false;

    if (!tokenToUse) {
      const usage = getUsage();
      if (usage.count >= FREE_LIMIT) {
        setShowModal(true); // Hit limit, prompt for their own token
        return;
      }
      tokenToUse = 'system';
      isUsingFreeTier = true;
    }

    const currentTicker = tickerInput.trim().toUpperCase();
    if (!currentTicker) return;
    setTicker(currentTicker);

    setIsProcessing(true);
    setProcessedNews([]);
    setAnalysis(null);
    setStats({ pos: 0, neg: 0, neu: 0, score: 0, total: 0 });
    setLogs([]);
    setProgress({ current: 0, total: 0 });
    setTrend([]);
    setQuote(null);

    try {
      log(`Buscando cotação de ${currentTicker}...`, 'info');
      const quoteData = await fetchQuote(currentTicker);
      if (quoteData) {
        setQuote(quoteData);
        log(`Cotação: R$ ${quoteData.price.toFixed(2)} (${quoteData.changePercent >= 0 ? '+' : ''}${quoteData.changePercent.toFixed(2)}%)`, 'ok');
      } else {
        log(`Não foi possível obter cotação de ${currentTicker}.`, 'info');
      }

      log(`Buscando notícias sobre ${currentTicker}...`, 'info');
      const { articles, source } = await fetchNews(currentTicker);
      setNewsSource(source);
      log(`${articles.length} notícias via ${source}`, 'ok');
      setProgress({ current: 0, total: articles.length });

      if (isUsingFreeTier) {
        incrementUsage();
        setFreeUsesLeft(Math.max(0, FREE_LIMIT - getUsage().count));
        log(`Usando cota gratuita (${getUsage().count}/${FREE_LIMIT} hoje).`, 'info');
      }

      const classified = [];
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        log(`[${i + 1}/${articles.length}] ${article.title.substring(0, 50)}...`);

        const { sentiment, model, localScore, foundTerms } = await classifySentiment(tokenToUse, article.title, selectedModel);
        classified.push({ ...article, sentiment, foundTerms, localScore });

        const scoreLabel = localScore >= 0 ? `+${localScore.toFixed(2)}` : localScore.toFixed(2);
        log(
          `→ ${sentiment.toUpperCase()} · léxico:${scoreLabel} · ${model.split('/')[1]}`,
          sentiment === 'positivo' ? 'ok' : sentiment === 'negativo' ? 'err' : 'info'
        );

        setProcessedNews([...classified]);
        setTrend(prev => [...prev, localScore]);
        setProgress({ current: i + 1, total: articles.length });
      }

      const finalStats = calculateScore(classified);
      setStats(finalStats);
      log(`Score final: ${finalStats.score.toFixed(2)} (${finalStats.pos}P · ${finalStats.neg}N · ${finalStats.neu}U)`, 'ok');

      log('Gerando análise completa com IA baseada nas notícias...', 'info');
      const aiData = await generateSummary(tokenToUse, finalStats, classified, selectedModel);
      log(`Análise detalhada gerada com sucesso.`, 'ok');

      const today = new Date();
      setAnalysis({
        summary: aiData.summary,
        insight: aiData.insight,
        risk: aiData.risk,
        period_start: new Date(today - 7 * 86400000).toISOString().split('T')[0],
        period_end: today.toISOString().split('T')[0]
      });
      log('✓ Pipeline concluído', 'ok');

    } catch (err) {
      log(`Erro: ${err.message}`, 'err');
      if (err.message.includes('Token inválido')) {
        clearToken(); setApiToken('');
        setTimeout(() => setShowModal(true), 600);
      }
    }
    setIsProcessing(false);
  };

  const todayStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const tokenMasked = apiToken ? `${apiToken.substring(0, 12)}••••••` : '';

  return (
    <div className="app-container">

      {showModal && (
        <TokenModal
          onSave={handleTokenSave}
          onClose={() => setShowModal(false)}
          hasToken={!!apiToken}
        />
      )}

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon"><Zap size={18} color="#000" /></div>
          <span>LIBERTY</span>
        </div>

        <div className="nav-section">
          <div className="nav-label">Ativo para Analisar</div>
          <div className="ticker-search-box">
            <input
              type="text"
              className="ticker-input"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
              placeholder="Ex: PETR4, VALE3..."
              onKeyDown={(e) => e.key === 'Enter' && setTicker(tickerInput)}
            />
            <button className="ticker-btn" onClick={() => setTicker(tickerInput)}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-label">Menu</div>
          <button className="nav-item active"><LayoutDashboard size={16} /> Dashboard</button>
          <button className="nav-item" id="btn-open-settings" onClick={() => setShowModal(true)}>
            <Settings size={16} /> Configurações
          </button>
        </div>

        <div className="nav-section">
          <div className="nav-label">Modelos IA</div>
          {['mistral-7b', 'openchat-7b', 'llama-3-8b'].map((m, i) => (
            <div key={i} className="nav-item" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', cursor: 'default' }}>
              <Zap size={12} /> {m}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          {apiToken ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="status-indicator">
                <div className="status-dot" />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {tokenMasked}
                </span>
              </div>
              <button
                className="nav-item"
                id="btn-clear-token"
                onClick={handleClearToken}
                style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', color: '#ef4444' }}
              >
                <X size={11} /> Limpar token
              </button>
            </div>
          ) : (
            <div className="status-indicator" style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start' }} onClick={() => setShowModal(true)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className={`status-dot ${freeUsesLeft === 0 ? 'offline' : ''}`} />
                <span style={{ color: freeUsesLeft === 0 ? '#ef4444' : '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
                  {freeUsesLeft > 0 ? `${freeUsesLeft} consultas gratuitas` : 'Limite esgotado'}
                </span>
              </div>
              <span style={{ color: '#f59e0b', fontSize: '0.65rem', marginTop: '0.3rem' }}>Clique para usar seu próprio token</span>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        <header className="dashboard-header">
          <div className="header-left">
            <h1>Liberty Analytics</h1>
            <p>Inteligência Financeira Híbrida · Léxico + IA</p>
          </div>
          <div className="header-right">
            <div className="date-badge">{todayStr}</div>
            <div className="asset-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', background: 'rgba(255,255,255,0.03)', padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1.2rem', fontFamily: 'JetBrains Mono, monospace' }}>{ticker}</strong>
                {quote && (
                  <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>R$ {quote.price.toFixed(2)}</span>
                )}
              </div>
              {quote ? (
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  <span style={{ color: quote.changePercent >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {quote.changePercent >= 0 ? '▲' : '▼'} {quote.changePercent.toFixed(2)}%
                  </span>
                  <span>Vol: {(quote.volume / 1000000).toFixed(1)}M</span>
                  <span>⏱ {quote.lastUpdate}</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cotação pendente</div>
              )}
            </div>
          </div>
        </header>

        <div className="grid-layout">
          {/* STAT CARDS */}
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
            <div className="stat-sub">{stats.total ? ((stats.pos / stats.total) * 100).toFixed(0) : 0}%</div>
          </div>
          <div className="card stat-card negative" style={{ gridColumn: 'span 3' }}>
            <div className="card-title"><TrendingDown size={12} /> Negativas</div>
            <div className="stat-value text-red">{stats.neg}</div>
            <div className="stat-sub">{stats.total ? ((stats.neg / stats.total) * 100).toFixed(0) : 0}%</div>
          </div>
          <div className="card stat-card neutral" style={{ gridColumn: 'span 3' }}>
            <div className="card-title"><Minus size={12} /> Neutras</div>
            <div className="stat-value text-amber">{stats.neu}</div>
            <div className="stat-sub">{stats.total ? ((stats.neu / stats.total) * 100).toFixed(0) : 0}%</div>
          </div>

          {/* CHARTS */}
          <div className="card chart-section" style={{ gridColumn: 'span 4' }}>
            <div className="card-title"><BarChart3 size={12} /> Score Gauge</div>
            <ScoreGauge score={stats.score} />
          </div>
          <div className="card chart-section" style={{ gridColumn: 'span 4' }}>
            <div className="card-title"><BarChart3 size={12} /> Distribuição</div>
            <SentimentChart stats={stats} />
          </div>
          <div className="card chart-section" style={{ gridColumn: 'span 4' }}>
            <div className="card-title"><TrendingUp size={12} /> Tendência da Sessão</div>
            <SentimentTrend history={trend} />
          </div>

          {/* PIPELINE */}
          <div className="card pipeline-section">
            <div className="card-title"><Zap size={12} /> Pipeline</div>
            <div className="pipeline-controls">
              <button className="btn btn-primary" onClick={runPipeline} disabled={isProcessing} id="btn-run-pipeline">
                {isProcessing ? <><div className="spinner" /> Processando...</> : <><Play size={16} /> Buscar e Analisar</>}
              </button>
              <button className="btn btn-secondary" onClick={runPipeline} disabled={isProcessing}>
                <RefreshCw size={14} /> Nova Busca
              </button>
              {newsSource && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Globe size={12} /> {newsSource}
                </span>
              )}
            </div>

            {progress.total > 0 && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                </div>
                <div className="progress-text">
                  <span>{progress.current} / {progress.total}</span>
                  <span>{((progress.current / progress.total) * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}

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

          {/* SUMMARY & INSIGHTS */}
          {analysis && (
            <div className="card summary-card">
              <div className="card-title"><Zap size={12} /> Resumo Analítico</div>
              <p className="summary-text">{analysis.summary}</p>
              
              <div className="ux-decision-box insight-box">
                <strong>📌 Insight Automático</strong>
                <p>{analysis.insight}</p>
              </div>

              <div className="ux-decision-box risk-box">
                <strong>⚠️ Risco Identificado</strong>
                <p>{analysis.risk}</p>
              </div>

              <p className="summary-period">Análise baseada em dados: {analysis.period_start} → {analysis.period_end}</p>
            </div>
          )}

          {/* NEWS LIST */}
          <div className="card news-section">
            <div className="card-title"><BarChart3 size={12} /> Notícias Processadas ({processedNews.length})</div>
            <div className="news-list">
              {processedNews.map((news, i) => (
                <div key={i} className={`news-item ${news.sentiment}`}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="news-title">{news.title}</div>
                    <div className="news-meta">
                      {news.source && <span>{news.source} · </span>}
                      {news.published_at && new Date(news.published_at).toLocaleDateString('pt-BR')}
                      {news.url && (
                        <a href={news.url} target="_blank" rel="noopener noreferrer" className="news-link">
                          · Ver notícia <ExternalLink size={10} style={{ marginLeft: '2px' }} />
                        </a>
                      )}
                    </div>
                    {news.foundTerms && news.foundTerms.length > 0 && (
                      <div className="keyword-list">
                        {news.foundTerms.map((t, idx) => (
                          <span key={idx} className={`keyword-tag ${t.score > 0 ? 'pos' : 'neg'}`}>
                            {t.term} {t.multiplier ? `(x${t.multiplier})` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={`sentiment-tag ${news.sentiment}`}>{news.sentiment}</div>
                </div>
              ))}
              {!processedNews.length && (
                <div className="empty-state">
                  <AlertCircle size={32} />
                  <p>
                    {apiToken
                      ? <>Clique em <strong>"Buscar e Analisar"</strong> para iniciar.</>
                      : <>Configure seu <strong>token OpenRouter</strong> em Configurações para começar.</>
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
