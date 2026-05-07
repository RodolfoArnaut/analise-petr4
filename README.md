# Liberty Analytics 📈🤖
 
Inteligência e Análise de Sentimento para Qualquer Ativo da B3. Combina um léxico financeiro avançado com a potência de LLMs (Mistral, Llama, OpenChat) para gerar scores preditivos e resumos informativos.

## 🌟 Funcionalidades
* **Ativos Dinâmicos**: Insira qualquer ticker da B3 (PETR4, VALE3, ITUB4, etc) para uma análise instantânea.
* **Cotação em Tempo Real**: Painel dinâmico buscando dados via Yahoo Finance (Preço, Variação, Volume e Horário).
* **Insights Automáticos**: A IA gera automaticamente um "Insight de Decisão" (📌) e um "Alerta de Risco" (⚠️) para cada análise.
* **Fontes de Notícias Confiáveis**: Busca de notícias direto do Google News via Proxy.
* **Pipeline Híbrido**: Processamento rápido usando léxico combinado com precisão de LLMs.
* **Serverless Seguro**: Proteção de tokens e proxies de busca via Vercel Edge.

## 🛠️ Tecnologias
* **Frontend**: React + Vite + CSS puro (Glassmorphism & Dark Mode)
* **Backend**: Vercel Serverless Functions
* **LLM API**: OpenRouter
* **Database**: Supabase (Pronto para Auth)

## 🚀 Como Rodar Localmente
1. Clone o repositório.
2. Crie o `.env`:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-...
   ```
3. Instale as dependências: `npm install`
4. Rode o ambiente: `npm run dev`
