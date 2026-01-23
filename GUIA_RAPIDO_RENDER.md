# ⚡ Guia Rápido - Deploy no Render

<!-- VERSION: v1.0.0 | DATE: 2025-01-23 | AUTHOR: VeloHub Development Team -->

## 🚀 Deploy em 5 Minutos

### 1️⃣ Criar Conta e Conectar Repo

1. Acesse: https://render.com
2. Login com GitHub
3. **New +** > **Web Service**
4. Conecte o repositório VeloHub

### 2️⃣ Configuração Rápida

**Use o arquivo `render.yaml`** (já configurado):

- ✅ Marque **"Use render.yaml"**
- ✅ O Render detectará automaticamente

**OU configure manualmente:**

- **Name:** `velohub-backend`
- **Root Directory:** `backend` ⚠️ **IMPORTANTE**
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/test`

### 3️⃣ Variáveis de Ambiente

Adicione no Render (Environment):

```env
NODE_ENV=production
PORT=8080
# MONGO_ENV não será usado - não configurar
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
OPENAI_API_KEY=sua_chave-openai
GEMINI_API_KEY=sua_chave_gemini
WHATSAPP_API_URL=https://sua-api-baileys.com
WHATSAPP_DEFAULT_JID=5511943952784@s.whatsapp.net
CORS_ORIGIN=https://seu-frontend.com
```

### 4️⃣ Deploy

1. Clique em **Create Web Service**
2. Aguarde build (5-10 min)
3. ✅ Pronto! URL: `https://velohub-backend.onrender.com`

### 5️⃣ Testar

```bash
curl https://velohub-backend.onrender.com/api/test
```

## ⚠️ Importante

- **Root Directory:** Deve ser `backend` (não raiz)
- **Free Tier:** Entra em sleep após 15 min (primeira requisição pode demorar)
- **Starter Plan ($7/mês):** Remove sleep, melhor performance

## 📝 Checklist

- [ ] Repositório conectado
- [ ] Root Directory = `backend`
- [ ] Variáveis de ambiente configuradas
- [ ] Build bem-sucedido
- [ ] Health check OK

---

**Versão:** v1.0.0  
**Última atualização:** 2025-01-23
