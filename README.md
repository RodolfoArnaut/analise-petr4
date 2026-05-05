# PETRA Analysis 📈🤖

Uma aplicação avançada de análise de sentimentos para o mercado financeiro (B3). Combina léxico financeiro puro no cliente com a potência de LLMs (Mistral, Llama, OpenChat) para gerar scores preditivos e resumos informativos sobre ativos como PETR4.

## 🌟 Funcionalidades
* **Pipeline Híbrido**: Processamento super-rápido usando `lexicalScore` combinado com a precisão de LLMs (via OpenRouter).
* **Multi-Ativos**: Pesquise por PETR4, VALE3, ITUB4, etc.
* **Serverless Seguro**: O token da OpenRouter está blindado no backend através de Vercel Serverless Functions (`/api/chat`).
* **Limite de Uso (Freemium)**: Sistema que permite 3 consultas locais gratuitas usando localStorage antes de solicitar o token do próprio usuário.
* **Supabase Pronto**: Preparado para Auth, Perfis (Free/Premium) e RLS utilizando o `supabaseClient`.

## 🛠️ Tecnologias
* **Frontend**: React + Vite + CSS puro (Glassmorphism & Dark Mode)
* **API/LLM**: Vercel Serverless Functions + OpenRouter
* **Database**: Supabase (PostgreSQL + RLS)
* **Deploy**: Vercel

## 🚀 Como Rodar Localmente

1. Clone o repositório.
2. Crie um arquivo `.env` baseado no `.env.example`:
   ```env
   VITE_SUPABASE_URL=https://[YOUR_URL].supabase.co
   VITE_SUPABASE_ANON_KEY=[YOUR_KEY]
   OPENROUTER_API_KEY=sk-or-v1-[YOUR_KEY]
   ```
3. Instale as dependências: `npm install`
4. Rode o ambiente de desenvolvimento: `npm run dev`

## 📦 Deploy
Projetado para ser implantado na **Vercel** sem configurações adicionais graças ao mapeamento automático da pasta `api/` para Serverless Functions.
