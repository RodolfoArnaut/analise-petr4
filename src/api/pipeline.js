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
const LEXICON = {
  // Strongly positive
  lucro: 2.0, recorde: 1.8, dividendos: 1.7, supera: 1.6,
  alta: 1.4, crescimento: 1.5, compra: 1.3, positivo: 1.5,
  ganho: 1.4, expansão: 1.3, investimento: 1.2, valoriza: 1.4,
  aprovação: 1.3, elevar: 1.2, melhora: 1.2, forte: 1.1,
  // Strongly negative
  prejuízo: -2.0, queda: -1.6, crise: -1.8, greve: -1.7,
  perda: -1.5, baixa: -1.4, risco: -1.3, pressiona: -1.3,
  venda: -1.1, cai: -1.5, negativo: -1.5, redução: -1.2,
  paralisação: -1.6, dívida: -1.3, corte: -1.4, ameaça: -1.5,
};

/**
 * Pure-JS lexical ML scorer.
 * Tokenizes text, applies weighted sum over financial vocabulary,
 * applies a sigmoid activation to bound score to [-1, +1].
 */
export function lexicalScore(text) {
  const tokens = text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .split(/\W+/);

  let raw = 0;
  let hits = 0;

  for (const token of tokens) {
    if (LEXICON[token] !== undefined) {
      raw += LEXICON[token];
      hits++;
    }
  }

  // Sigmoid-like normalization: tanh maps raw score to (-1, +1)
  const normalized = Math.tanh(raw);
  return { score: normalized, hits };
}

// =====================================================
// AI — OpenRouter with automatic model fallback
// apiKey always passed explicitly — never stored globally
// =====================================================
async function fetchAI(apiKey, messages, modelIndex = 0) {
  if (modelIndex >= MODELS.length) throw new Error('Todos os modelos falharam.');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://petra-analysis.app',
      'X-Title': 'PETRA Analysis'
    },
    body: JSON.stringify({
      model: MODELS[modelIndex],
      messages,
      temperature: 0.1,
      max_tokens: 60
    })
  });

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
    const res = await fetch(
      `https://gnews.io/api/v4/search?q=${encodeURIComponent(symbol + ' Petrobras')}&lang=pt&country=br&max=8&apikey=demo`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.articles?.length) {
        return {
          articles: data.articles.map(a => ({
            title: a.title,
            content: a.description || '',
            published_at: a.publishedAt,
            source: a.source?.name || 'GNews',
            url: a.url
          })),
          source: 'GNews API'
        };
      }
    }
  } catch (_) {}

  return { articles: getDemoNews(), source: 'Demo (offline)' };
}

function getDemoNews() {
  const now = Date.now();
  return [
    { title: 'Petrobras registra lucro líquido recorde de R$ 38,2 bi no 1T26', source: 'InfoMoney', published_at: new Date(now - 86400000).toISOString() },
    { title: 'Queda no preço do Brent pressiona margens da Petrobras', source: 'Valor Econômico', published_at: new Date(now - 2 * 86400000).toISOString() },
    { title: 'Analistas elevam preço-alvo de PETR4 após dividendos robustos', source: 'BTG Pactual', published_at: new Date(now - 3 * 86400000).toISOString() },
    { title: 'Greve dos petroleiros pode paralisar produção no pré-sal', source: 'G1 Economia', published_at: new Date(now - 4 * 86400000).toISOString() },
    { title: 'Petrobras anuncia expansão em energia renovável com investimento de US$ 6 bi', source: 'Reuters', published_at: new Date(now - 5 * 86400000).toISOString() },
    { title: 'Governo descarta interferência na política de preços da Petrobras', source: 'Folha', published_at: new Date(now - 6 * 86400000).toISOString() },
  ];
}

// =====================================================
// HYBRID SENTIMENT — Lexical score + AI refinement
// =====================================================
export async function classifySentiment(apiKey, title) {
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
  ]);

  const lower = text.toLowerCase();
  let sentiment = 'neutro';
  if (lower.includes('positivo')) sentiment = 'positivo';
  else if (lower.includes('negativo')) sentiment = 'negativo';

  return { sentiment, model, localScore: local.score };
}

// =====================================================
// SUMMARY GENERATION
// =====================================================
export async function generateSummary(apiKey, stats) {
  const { text } = await fetchAI(apiKey, [
    {
      role: 'system',
      content: 'Gere um resumo financeiro objetivo em português. Máximo 20 palavras. Retorne APENAS o texto.'
    },
    {
      role: 'user',
      content: `Positivas:${stats.pos} Negativas:${stats.neg} Neutras:${stats.neu} Score:${stats.score.toFixed(2)}`
    }
  ]);
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
