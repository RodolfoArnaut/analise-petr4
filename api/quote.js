export default async function handler(req, res) {
  const { ticker } = req.query;
  
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required' });
  }

  // Na B3 (Yahoo Finance), os tickers terminam com .SA (ex: PETR4.SA)
  const symbol = ticker.toUpperCase().replace('.SA', '') + '.SA';

  try {
    // Busca dados em tempo real da API pública do Yahoo Finance
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error('Falha ao comunicar com Yahoo Finance');
    }

    const data = await response.json();

    if (!data.chart.result || data.chart.result.length === 0) {
      return res.status(404).json({ error: 'Ativo não encontrado na bolsa' });
    }

    const meta = data.chart.result[0].meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose;
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;

    res.status(200).json({
      symbol: meta.symbol,
      price: price,
      currency: meta.currency,
      change: change,
      changePercent: changePercent
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
