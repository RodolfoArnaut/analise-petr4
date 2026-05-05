// =====================================================
// PIPELINE — Financial News Sentiment Analysis
// Hybrid: Financial Lexical ML Scoring + OpenRouter AI
// 100% client-side — no backend, token provided at runtime
// =====================================================

const MODELS = [
  'mistralai/mistral-7b-instruct',
  'openchat/openchat-7b',
  'meta-llama/llama-3-8b-instruct'
];

// =====================================================
// FINANCIAL LEXICON — Weighted scoring (ML-inspired)
// Replaces TF.js with a pure-JS tensor-like computation
// =====================================================
// =====================================================
// FINANCIAL LEXICON — Advanced Weighted Scoring
// =====================================================
const MODIFIERS = {
  nao: -1.0, nunca: -1.2, jamais: -1.2, nem: -0.8, sem: -0.8,
  muito: 1.5, bastante: 1.4, extremamente: 1.8, pouco: 0.5, ligeiramente: 0.8,
  mais: 1.2, menos: 0.8, forte: 1.3, fraco: 0.7,
};

const LEXICON = {
  // Positivos: Operacional e Financeiro
  lucro: 2.0, recorde: 1.8, dividendos: 1.7, supera: 1.6, alta: 1.4,
  crescimento: 1.5, compra: 1.3, positivo: 1.5, ganho: 1.4, expansao: 1.3,
  investimento: 1.2, valoriza: 1.4, aprovacao: 1.3, elevar: 1.2, melhora: 1.2,
  salto: 1.5, otimismo: 1.4, avancar: 1.3, resiliente: 1.2, eficiencia: 1.3,
  receita: 1.1, ebitda: 1.2, caixa: 1.0, dividendo: 1.5, proventos: 1.4,
  // Positivos: Mercado e Macro
  bull: 1.5, rali: 1.6, recuperacao: 1.4, teto: 1.2, suporte: 1.1,
  // Negativos: Operacional e Financeiro
  prejuizo: -2.0, queda: -1.6, crise: -1.8, greve: -1.7, perda: -1.5,
  baixa: -1.4, risco: -1.3, pressiona: -1.3, venda: -1.1, cai: -1.5,
  negativo: -1.5, reducao: -1.2, paralisacao: -1.6, divida: -1.3, corte: -1.4,
  ameaca: -1.5, desvaloriza: -1.4, rombo: -1.8, instabilidade: -1.4, deficit: -1.6,
  incerteza: -1.3, passivo: -1.2, contingencia: -1.1, multa: -1.4, investigacao: -1.5,
  // Negativos: Mercado e Macro
  bear: -1.5, crash: -2.0, bolha: -1.6, pânico: -1.8, resistencia: -1.1,
};

/**
 * Advanced Lexical Scorer.
 * Handles: Negation, Intensification, and Accents.
 */
export function lexicalScore(text) {
  const rawTokens = text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .split(/\W+/);
  
  const tokens = rawTokens.filter(t => t.length > 1);

  let raw = 0;
  let hits = 0;
  let multiplier = 1.0;
  const foundTerms = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Check if it's a modifier (affects the NEXT token)
    if (MODIFIERS[token] !== undefined) {
      multiplier = MODIFIERS[token];
      continue;
    }

    // Process lexical match
    if (LEXICON[token] !== undefined) {
      const termScore = LEXICON[token] * multiplier;
      raw += termScore;
      hits++;
      foundTerms.push({ term: token, score: termScore, multiplier: multiplier !== 1.0 ? multiplier : null });
      multiplier = 1.0; // Reset multiplier after use
    } else {
      multiplier = 1.0;
    }
  }

  // Normalization: Tanh limits the score to (-1, +1)
  const confidence = hits > 0 ? Math.min(1.2, 1 + (hits * 0.05)) : 1;
  const score = Math.tanh(raw * confidence);

  return { score, hits, raw, foundTerms };
}

// =====================================================
// AI — OpenRouter with automatic model fallback
// If apiKey === 'system', it securely routes to Vercel Serverless Function
// =====================================================
async function fetchAI(apiKey, messages, modelIndex = 0) {
  if (modelIndex >= MODELS.length) throw new Error('Todos os modelos falharam.');

  let url = 'https://openrouter.ai/api/v1/chat/completions';
  let headers = {
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://petra-analysis.app',
    'X-Title': 'PETRA Analysis'
  };
  let body = {
    messages,
    temperature: 0.1,
    max_tokens: 60
  };

  if (apiKey === 'system') {
    // Route to our secure backend proxy (hides token)
    url = '/api/chat';
    body.modelIndex = modelIndex; 
  } else {
    // Direct call with user's own token
    headers['Authorization'] = `Bearer ${apiKey}`;
    body.model = MODELS[modelIndex];
  }

  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

  if (response.status === 401) throw new Error('Token inválido ou expirado.');
  if (!response.ok) return fetchAI(apiKey, messages, modelIndex + 1);

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) return fetchAI(apiKey, messages, modelIndex + 1);

  return { text: data.choices[0].message.content.trim(), model: MODELS[modelIndex] };
}

// =====================================================
// NEWS FETCHING — with demo fallback
// =====================================================
export async function fetchNews(symbol = 'PETR4') {
  try {
    const res = await fetch(`/api/news?ticker=${encodeURIComponent(symbol)}`);
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Erro do servidor (${res.status}) ao buscar notícias.`);
    }

    const data = await res.json();
    return data; // { articles: [...], source: 'Google News' }
  } catch (err) {
    throw new Error(err.message || 'Falha de conexão ao buscar notícias.');
  }
}

// =====================================================
// STOCK QUOTE FETCHING (Real-time via Proxy)
// =====================================================
export async function fetchQuote(symbol) {
  try {
    const res = await fetch(`/api/quote?ticker=${encodeURIComponent(symbol)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// =====================================================
// HYBRID SENTIMENT — Lexical score + AI refinement
// =====================================================
export async function classifySentiment(apiKey, title, modelIndex = 0) {
  // Step 1: Fast local lexical score (no API call)
  const local = lexicalScore(title);

  // Step 2: AI refinement with local score as context
  const { text, model } = await fetchAI(apiKey, [
    {
      role: 'system',
      content: 'Classifique o sentimento desta notícia financeira. Responda APENAS com uma palavra: positivo, negativo ou neutro.'
    },
    {
      role: 'user',
      content: `Notícia: "${title}"\nScore léxico local: ${local.score.toFixed(3)}`
    }
  ], modelIndex);

  const lower = text.toLowerCase();
  let sentiment = 'neutro';
  if (lower.includes('positivo')) sentiment = 'positivo';
  else if (lower.includes('negativo')) sentiment = 'negativo';

  return { sentiment, model, localScore: local.score };
}

// =====================================================
// SUMMARY GENERATION
// =====================================================
export async function generateSummary(apiKey, stats, modelIndex = 0) {
  const { text } = await fetchAI(apiKey, [
    {
      role: 'system',
      content: 'Gere um resumo financeiro objetivo em português. Máximo 20 palavras. Retorne APENAS o texto.'
    },
    {
      role: 'user',
      content: `Positivas:${stats.pos} Negativas:${stats.neg} Neutras:${stats.neu} Score:${stats.score.toFixed(2)}`
    }
  ], modelIndex);
  return text.replace(/^[{"'`\s]+|[}"'`\s]+$/g, '').substring(0, 200);
}

// =====================================================
// SCORE CALCULATION — Pure logic
// =====================================================
export function calculateScore(newsItems) {
  const stats = { pos: 0, neg: 0, neu: 0 };
  for (const item of newsItems) {
    if (item.sentiment === 'positivo') stats.pos++;
    else if (item.sentiment === 'negativo') stats.neg++;
    else stats.neu++;
  }
  const total = newsItems.length || 1;
  stats.score = (stats.pos - stats.neg) / total;
  stats.total = total;
  return stats;
}
