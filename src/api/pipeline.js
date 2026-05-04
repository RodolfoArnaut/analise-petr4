import * as tf from '@tensorflow/tfjs';

// =====================================================
// PIPELINE — Financial News Sentiment Analysis
// AI (OpenRouter) + Machine Learning (TensorFlow.js)
// =====================================================

const MODELS = [
  'mistralai/mistral-7b-instruct',
  'openchat/openchat-7b',
  'meta-llama/llama-3-8b-instruct'
];

// Dicionário simples para análise léxica via TFJS (Mecanismo Local)
const POSITIVE_WORDS = ['lucro', 'recorde', 'alta', 'cresce', 'dividendos', 'supera', 'positivo', 'ganho', 'compra', 'otimismo'];
const NEGATIVE_WORDS = ['prejuízo', 'queda', 'cai', 'perda', 'baixa', 'venda', 'crise', 'greve', 'risco', 'pressiona'];

/**
 * Análise de Sentimento Local via TensorFlow.js
 * Transforma o texto em um tensor e calcula um score baseado em léxico e padrões.
 */
async function localTFJSAnalysis(text) {
  const words = text.toLowerCase().split(/\s+/);
  
  // Criamos um tensor a partir da contagem de palavras-chave
  const posCount = words.filter(w => POSITIVE_WORDS.includes(w)).length;
  const negCount = words.filter(w => NEGATIVE_WORDS.includes(w)).length;

  // Operação simples com tensores para demonstrar o uso do TFJS
  return tf.tidy(() => {
    const input = tf.tensor1d([posCount, negCount]);
    const weights = tf.tensor1d([1.2, -1.2]); // Pesos para positivo/negativo
    const score = input.mul(weights).sum().dataSync()[0];
    return score;
  });
}

// =====================================================
// AI — OpenRouter with automatic model fallback
// =====================================================
async function fetchAI(apiKey, messages, modelIndex = 0) {
  if (modelIndex >= MODELS.length) throw new Error('Todos os modelos falharam.');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://petra-analysis.app',
      'X-Title': 'PETRA Analysis Pipeline'
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
// NEWS FETCHING
// =====================================================
export async function fetchNews(symbol = 'PETR4') {
  const query = `${symbol} Petrobras`;
  try {
    const res = await fetch(`https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=pt&country=br&max=8&apikey=demo`);
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
  } catch (e) {}

  return { articles: getDemoNews(), source: 'Demo (offline)' };
}

function getDemoNews() {
  const now = new Date();
  return [
    { title: 'Petrobras registra lucro recorde no 1T26', source: 'InfoMoney', published_at: now.toISOString() },
    { title: 'Queda no preço do petróleo pressiona ações da Petrobras', source: 'Valor', published_at: now.toISOString() },
    { title: 'Analistas recomendam compra de PETR4 após dividendos', source: 'BTG', published_at: now.toISOString() },
    { title: 'Greve de petroleiros pode afetar produção', source: 'G1', published_at: now.toISOString() }
  ];
}

// =====================================================
// SENTIMENT CLASSIFICATION — HYBRID (TFJS + AI)
// =====================================================
export async function classifySentiment(apiKey, title) {
  // 1. Análise local ultra-rápida com TFJS
  const tfScore = await localTFJSAnalysis(title);

  // 2. Refinamento com IA
  const { text, model } = await fetchAI(apiKey, [
    {
      role: 'system',
      content: 'Classifique o sentimento desta notícia financeira. Responda APENAS: positivo, negativo ou neutro.'
    },
    { role: 'user', content: `Título: ${title}\nScore Local: ${tfScore}` }
  ]);

  const lower = text.toLowerCase();
  let sentiment = 'neutro';
  if (lower.includes('positivo')) sentiment = 'positivo';
  else if (lower.includes('negativo')) sentiment = 'negativo';

  return { sentiment, model, tfScore };
}

// =====================================================
// SUMMARY GENERATION
// =====================================================
export async function generateSummary(apiKey, stats) {
  const { text } = await fetchAI(apiKey, [
    {
      role: 'system',
      content: 'Gere um resumo financeiro objetivo em português. Máximo 20 palavras.'
    },
    {
      role: 'user',
      content: `Positivas:${stats.pos} Negativas:${stats.neg} Score:${stats.score.toFixed(2)}`
    }
  ]);
  return text.replace(/^[{"'`\s]+|[}"'`\s]+$/g, '').substring(0, 200);
}

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
