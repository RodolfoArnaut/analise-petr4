# PETRA Analysis 📈🤖

Uma aplicação avançada de análise de sentimentos para o mercado financeiro (B3). Combina léxico financeiro no cliente com a potência de LLMs (Mistral, Llama, OpenChat) para gerar scores preditivos e resumos informativos sobre ativos como PETR4, VALE3, etc.

## 🌟 Novas Funcionalidades
* **Cotação em Tempo Real**: Painel dinâmico buscando dados via Yahoo Finance (Preço, Variação, Volume e Horário).
* **Insights Automáticos**: A IA gera automaticamente um "Insight de Decisão" (📌) e um "Alerta de Risco" (⚠️) para cada análise.
* **Fontes de Notícias Confiáveis**: Busca de notícias direto do Google News via Proxy (sem limites de API "demo").
* **Pipeline Híbrido**: Processamento rápido usando léxico combinado com precisão de LLMs.
* **Serverless Seguro**: O token da OpenRouter está blindado no backend da Vercel.

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
