import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importando os handlers das APIs
import chatHandler from './api/chat.js';
import newsHandler from './api/news.js';
import quoteHandler from './api/quote.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Roteamento das APIs
app.post('/api/chat', chatHandler);
app.get('/api/news', newsHandler);
app.get('/api/quote', quoteHandler);

// Rota de saúde para verificar se o servidor está online
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🚀 Servidor backend rodando em http://localhost:${port}`);
  console.log(`- POST /api/chat`);
  console.log(`- GET  /api/news?ticker=TICKER`);
  console.log(`- GET  /api/quote?ticker=TICKER`);
});
