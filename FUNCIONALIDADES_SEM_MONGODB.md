# 📋 Funcionalidades Disponíveis - Projeto Baileys/WhatsApp

<!-- VERSION: v1.0.0 | DATE: 2025-01-23 | AUTHOR: VeloHub Development Team -->

## 🎯 Objetivo do Projeto

Este projeto usa **APENAS** as funcionalidades do Baileys para envio de relatórios via WhatsApp.

**Não usa MongoDB** - Funciona completamente sem banco de dados.

---

## ✅ Funcionalidades Disponíveis

### 1. Health Check
- **Endpoint:** `GET /api/test`
- **Status:** ✅ Funcional
- **Descrição:** Verifica se o servidor está rodando

### 2. Relatórios via WhatsApp (Baileys)
- **Endpoints:**
  - `POST /api/escalacoes/reports/send` - Enviar relatório de texto
  - `POST /api/escalacoes/reports/send-with-image` - Enviar relatório com imagem
  - `GET /api/escalacoes/reports/test` - Testar serviço
- **Status:** ✅ Funcional
- **Descrição:** Envio de relatórios formatados via WhatsApp usando API Baileys
- **Não requer MongoDB** - Funciona completamente sem banco de dados

---

## 🔧 Configuração no Render

### Variáveis de Ambiente (Sem MongoDB)

```env
# Obrigatórias
NODE_ENV=production
PORT=8080

# Google OAuth
GOOGLE_CLIENT_ID=278491073220-eb4ogvn3aifu0ut9mq3rvu5r9r9l3137.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=sua-google-client-secret

# APIs de IA
OPENAI_API_KEY=sk-sua-chave-openai
GEMINI_API_KEY=AIzaSy-sua-chave-gemini

# WhatsApp
WHATSAPP_API_URL=https://whatsapp-api-y40p.onrender.com
WHATSAPP_DEFAULT_JID=5511943952784@s.whatsapp.net

# CORS
CORS_ORIGIN=https://seu-frontend.com

# NÃO CONFIGURAR:
# MONGO_ENV= (deixar vazio ou não configurar)
```

---

## 📝 Notas Importantes

1. **Servidor Iniciará:** O backend iniciará normalmente sem MongoDB
2. **Relatórios WhatsApp:** Funcionam perfeitamente sem MongoDB - usa apenas API Baileys
3. **Health Check:** Sempre funciona, independente do MongoDB
4. **API Baileys:** Deve estar rodando em outro serviço (Render, Railway, etc.)
5. **WhatsApp Conectado:** A API Baileys deve estar conectada ao WhatsApp (QR code escaneado)

---

## 🔧 Configuração Mínima

Apenas estas variáveis são necessárias:

```env
NODE_ENV=production
PORT=8080
WHATSAPP_API_URL=https://sua-api-baileys.com
WHATSAPP_DEFAULT_JID=5511943952784@s.whatsapp.net
```

---

**Versão:** v1.0.0  
**Última atualização:** 2025-01-23  
**Autor:** VeloHub Development Team
