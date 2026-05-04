// =====================================================
// PIPELINE — Financial News Sentiment Analysis
// OpenRouter AI · 100% client-side, no back-end
// Token is provided by the user at runtime — never hardcoded.
// =====================================================

const MODELS = [
  'mistralai/mistral-7b-instruct',
  'openchat/openchat-7b',
  'nousresearch/nous-hermes-2-mistral-7b',
  'gryphe/mythomist-7b',
  'meta-llama/llama-3-8b-instruct'
];

// =====================================================
// AI — OpenRouter with automatic model fallback
// apiKey is always passed explicitly — never stored globally.
// =====================================================
async function fetchAI(apiKey, messages, modelIndex = 0) {
  if (modelIndex >= MODELS.length) throw new Error('Todos os modelos falharam. Verifique seu token.');

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

  if (response.status === 401) {
    throw new Error('Token inválido ou expirado. Verifique seu OpenRouter API Key.');
  }

  if (!response.ok) {
    // Try next model on non-auth errors
    return fetchAI(apiKey, messages, modelIndex + 1);
  }

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    return fetchAI(apiKey, messages, modelIndex + 1);
  }

  return { text: data.choices[0].message.content.trim(), model: MODELS[modelIndex] };
}

// =====================================================
// NEWS FETCHING — Multiple sources with demo fallback
// =====================================================

async function fetchFromGNews(query) {
  try {
    const res = await fetch(
      `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=pt&country=br&max=10&apikey=demo`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.articles?.length) return null;
    return data.articles.map(a => ({
      title: a.title,
      content: a.description || a.content || '',
      published_at: a.publishedAt,
      source: a.source?.name || 'GNews',
      url: a.url
    }));
  } catch { return null; }
}

async function fetchFromNewsData(query) {
  try {
    const res = await fetch(
      `https://newsdata.io/api/1/latest?apikey=pub_demo&q=${encodeURIComponent(query)}&language=pt&country=br`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results?.length) return null;
    return data.results.map(a => ({
      title: a.title,
      content: a.description || a.content || '',
      published_at: a.pubDate,
      source: a.source_name || 'NewsData',
      url: a.link
    }));
  } catch { return null; }
}

function getDemoNews() {
  const now = new Date();
  return [
    {
      title: 'Petrobras registra lucro líquido recorde de R$ 38,2 bilhões no 1º trimestre de 2026',
      content: 'A companhia superou expectativas com forte geração de caixa e dividendos robustos aos acionistas.',
      published_at: new Date(now - 1 * 86400000).toISOString(),
      source: 'InfoMoney'
    },
    {
      title: 'Produção de petróleo da Petrobras atinge novo patamar com campo de Búzios',
      content: 'A produção alcançou 2,8 milhões de barris por dia, novo recorde operacional para a estatal.',
      published_at: new Date(now - 1.5 * 86400000).toISOString(),
      source: 'Valor Econômico'
    },
    {
      title: 'Analistas elevam preço-alvo de PETR4 após resultados acima do esperado',
      content: 'Bancos como Itaú BBA e BTG Pactual revisaram suas estimativas positivamente para o papel.',
      published_at: new Date(now - 2 * 86400000).toISOString(),
      source: 'Bloomberg Linea'
    },
    {
      title: 'Greve dos petroleiros pode impactar produção nas plataformas do pré-sal',
      content: 'Sindicato ameaça paralisação a partir da próxima semana por melhores condições salariais.',
      published_at: new Date(now - 2.5 * 86400000).toISOString(),
      source: 'G1 Economia'
    },
    {
      title: 'Petrobras anuncia investimento de US$ 6 bi em energia renovável até 2030',
      content: 'Empresa amplia estratégia de transição energética com projetos eólicos e solares offshore.',
      published_at: new Date(now - 3 * 86400000).toISOString(),
      source: 'Reuters Brasil'
    },
    {
      title: 'Queda no preço do Brent pressiona margens da Petrobras neste mês',
      content: 'Barril do petróleo Brent recuou 4,2% na semana, afetando receitas de exportação da estatal.',
      published_at: new Date(now - 3.5 * 86400000).toISOString(),
      source: 'Investing.com'
    },
    {
      title: 'Governo federal descarta interferência na política de preços da Petrobras',
      content: 'Ministro da Fazenda reafirmou compromisso com autonomia da gestão da companhia.',
      published_at: new Date(now - 4 * 86400000).toISOString(),
      source: 'Folha de S.Paulo'
    },
    {
      title: 'Petrobras conclui venda de refinaria no Nordeste por R$ 1,95 bi',
      content: 'Desinvestimento faz parte do plano estratégico de otimização do portfólio da estatal.',
      published_at: new Date(now - 5 * 86400000).toISOString(),
      source: 'Estadão'
    }
  ];
}

export async function fetchNews(symbol = 'PETR4') {
  const query = `${symbol} Petrobras`;

  let articles = await fetchFromGNews(query);
  if (articles?.length) return { articles, source: 'GNews API' };

  articles = await fetchFromNewsData(query);
  if (articles?.length) return { articles, source: 'NewsData API' };

  return { articles: getDemoNews(), source: 'Demo (offline)' };
}

// =====================================================
// SENTIMENT CLASSIFICATION
// apiKey is passed explicitly on every call.
// =====================================================
export async function classifySentiment(apiKey, title) {
  const { text, model } = await fetchAI(apiKey, [
    {
      role: 'system',
      content: 'Classify financial news sentiment. Reply ONLY: positivo OR negativo OR neutro. No other text.'
    },
    { role: 'user', content: title }
  ]);

  const lower = text.toLowerCase();
  let sentiment = 'neutro';
  if (lower.includes('positivo')) sentiment = 'positivo';
  else if (lower.includes('negativo')) sentiment = 'negativo';

  return { sentiment, model };
}

// =====================================================
// SUMMARY GENERATION
// =====================================================
export async function generateSummary(apiKey, stats) {
  const { text } = await fetchAI(apiKey, [
    {
      role: 'system',
      content: 'Gere um resumo financeiro objetivo em português. Máximo 20 palavras. Retorne APENAS o texto do resumo.'
    },
    {
      role: 'user',
      content: `Positivas:${stats.pos} Negativas:${stats.neg} Neutras:${stats.neu} Score:${stats.score.toFixed(2)}`
    }
  ]);

  let summary = text.replace(/^[{"'`\s]+|[}"'`\s]+$/g, '');
  if (summary.toLowerCase().startsWith('summary')) {
    summary = summary.replace(/^summary[:\s]*/i, '');
  }
  return summary.substring(0, 200);
}

// =====================================================
// SCORE CALCULATION — Pure logic, no AI
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
