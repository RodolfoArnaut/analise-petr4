export default async function handler(req, res) {
  const { ticker } = req.query;
  
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required' });
  }

  try {
    // Buscando o RSS do Google News para o ticker (sem limites de API Key!)
    const query = encodeURIComponent(`${ticker} (ações OR mercado OR bolsa OR dividendos)`);
    const response = await fetch(`https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error('Falha ao acessar o Google News');
    }

    const xmlText = await response.text();

    // Extração manual simplificada de XML via Regex para não depender de bibliotecas pesadas
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemContent = match[1];
      const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
      const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
      
      let title = titleMatch ? (titleMatch[1] || titleMatch[2] || '') : '';
      if (!title) continue;

      // O Google News coloca o nome da fonte no final do título (ex: "Notícia tal - InfoMoney")
      const titleParts = title.split(' - ');
      const source = titleParts.length > 1 ? titleParts.pop() : 'Google News';
      title = titleParts.join(' - ');

      items.push({
        title: title.trim(),
        url: linkMatch ? linkMatch[1] : '',
        published_at: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
        source: source.trim(),
        content: '' // O RSS do Google n traz descrição limpa, a IA usa o título
      });

      if (items.length >= 8) break; // Limitando a 8 notícias para não estourar a IA
    }

    if (items.length === 0) {
      return res.status(404).json({ error: `Nenhuma notícia encontrada para ${ticker}` });
    }

    res.status(200).json({ articles: items, source: 'Google News (API Free)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
