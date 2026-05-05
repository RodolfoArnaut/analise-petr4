export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages, modelIndex, max_tokens } = req.body;
  
  if (!messages || modelIndex === undefined) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // Pegamos a chave secreta de uma variável de ambiente (escondida do navegador)
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured on server' });
  }

  const MODELS = [
    'mistralai/mistral-7b-instruct',
    'openchat/openchat-7b',
    'meta-llama/llama-3-8b-instruct'
  ];

  const modelToUse = MODELS[modelIndex] || MODELS[0];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://petra-analysis.app',
        'X-Title': 'PETRA Analysis Serverless'
      },
      body: JSON.stringify({
        model: modelToUse,
        messages,
        temperature: 0.1,
        max_tokens: max_tokens || 60
      })
    });

    if (!response.ok) {
      const errData = await response.text();
      return res.status(response.status).json({ error: errData });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
