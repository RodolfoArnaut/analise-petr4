# Liberty Analytics 📈🤖

Plataforma de análise de sentimento e monitoramento de notícias para ativos da B3.

O foco do projeto é auxiliar investidores na tomada de decisão através da combinação entre:
- notícias em tempo real
- análise de sentimento com IA
- processamento léxico financeiro
- insights automatizados

A plataforma busca notícias relacionadas ao ativo, processa os dados e gera indicadores que ajudam a entender o sentimento do mercado sobre determinada ação.

> ⚠️ Este projeto não representa recomendação de compra ou venda de ativos.  
> O objetivo é exclusivamente analítico e informativo.

---

# 🚀 O que a plataforma faz

O usuário informa um ticker da B3:

```bash
PETR4
VALE3
ITUB4
BBAS3
```

A IA então:
- busca notícias em tempo real
- identifica sentimento positivo, negativo ou neutro
- calcula score de sentimento
- gera insights automáticos
- cria alertas de risco
- monitora tendência da sessão

Tudo isso em uma interface visual focada em análise rápida.

---

# 🧠 Inteligência Artificial + Léxico Financeiro

A análise funciona através de um pipeline híbrido.

## IA Generativa

Uso de modelos LLM via OpenRouter:
- Mistral
- Llama
- OpenChat

Os modelos interpretam contexto financeiro e ajudam na classificação das notícias.

---

## TensorFlow.js + Léxico Financeiro

Além da IA generativa, o projeto possui processamento local utilizando TensorFlow.js para análise léxica financeira.

O sistema:
- identifica palavras de impacto no mercado
- calcula polaridade
- gera score inicial
- acelera processamento
- reduz custo computacional

Isso permite análises rápidas mesmo antes da etapa de IA.

---

# 📊 Funcionalidades

- Análise de sentimento para qualquer ativo da B3
- Busca automática de notícias
- Cotação em tempo real
- Insights automáticos
- Alertas de risco
- Dashboard interativo
- Tendência da sessão
- Distribuição de sentimento
- Pipeline híbrido local + LLM
- Estrutura serverless

---

# 🔒 Segurança

As chamadas de IA e proxies são protegidas utilizando funções serverless na Vercel, evitando exposição de tokens no frontend.

---

# 📰 Fontes Utilizadas

- Google News
- Yahoo Finance
- OpenRouter

---

# ⚙️ Stack Utilizada

- Vercel
- OpenRouter
- TensorFlow.js
- Supabase
- Yahoo Finance API

---

# 🚀 Rodando Localmente

## 1. Clone o projeto

```bash
git clone https://github.com/RodolfoArnaut/analise-petr4.git
```

---

## 2. Crie o arquivo `.env`

```env
OPENROUTER_API_KEY=sk-or-v1-...
```

---

## 3. Instale as dependências

```bash
npm install
```

---

## 4. Rode o projeto

```bash
npm run dev
```

---

# 🎯 Objetivo do Projeto

O Liberty Analytics foi criado para transformar notícias financeiras em sinais visuais e insights rápidos, ajudando investidores a acompanharem o sentimento do mercado em tempo real.

---

# ⚠️ Aviso Legal

Este projeto:
- não possui vínculo com a B3
- não representa consultoria financeira
- não garante precisão dos modelos
- não deve ser utilizado como única fonte para tomada de decisão financeira
