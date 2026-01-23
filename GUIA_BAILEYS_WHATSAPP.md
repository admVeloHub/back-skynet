# 📱 Guia - Envio de Relatórios via WhatsApp (Baileys)

<!-- VERSION: v1.0.0 | DATE: 2025-01-23 | AUTHOR: VeloHub Development Team -->

## 🎯 Objetivo

Este projeto usa **APENAS** as funcionalidades do Baileys para envio de relatórios via WhatsApp.

**Não usa MongoDB** - Funciona completamente sem banco de dados.

---

## ✅ Funcionalidades Disponíveis

### 1. Health Check
- **Endpoint:** `GET /api/test`
- **Descrição:** Verifica se o servidor está rodando
- **Resposta:**
```json
{
  "success": true,
  "message": "Servidor funcionando!"
}
```

### 2. Envio de Relatórios via WhatsApp

#### 2.1 Enviar Relatório de Texto
- **Endpoint:** `POST /api/escalacoes/reports/send`
- **Body:**
```json
{
  "reportContent": "📊 Relatório Executivo\n\nTotal de interações: 150\n...",
  "title": "Relatório de Redes Sociais",
  "filters": {
    "socialNetwork": "Instagram",
    "contactReason": "Dúvida"
  },
  "dateRange": "01/01/2025 - 23/01/2025",
  "jid": "5511943952784@s.whatsapp.net"
}
```

#### 2.2 Enviar Relatório com Imagem
- **Endpoint:** `POST /api/escalacoes/reports/send-with-image`
- **Body:**
```json
{
  "reportContent": "📊 Relatório Executivo\n\n...",
  "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "mimeType": "image/png",
  "title": "Relatório com Gráfico",
  "jid": "5511943952784@s.whatsapp.net"
}
```

#### 2.3 Testar Serviço
- **Endpoint:** `GET /api/escalacoes/reports/test`
- **Descrição:** Verifica se o serviço está configurado corretamente

---

## 🔧 Configuração Necessária

### Variáveis de Ambiente Obrigatórias

```env
# Servidor
NODE_ENV=production
PORT=8080

# WhatsApp API (Baileys)
WHATSAPP_API_URL=https://whatsapp-api-y40p.onrender.com
WHATSAPP_DEFAULT_JID=5511943952784@s.whatsapp.net
```

### Variáveis Opcionais

```env
# Google OAuth (se necessário)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# APIs de IA (se necessário)
OPENAI_API_KEY=...
GEMINI_API_KEY=...

# CORS
CORS_ORIGIN=https://seu-frontend.com
```

---

## 📋 Como Funciona

1. **Frontend/Cliente** envia requisição para `/api/escalacoes/reports/send`
2. **Backend** formata o relatório (converte markdown para texto WhatsApp)
3. **Backend** chama a **API Baileys** (`WHATSAPP_API_URL`) para enviar mensagem
4. **API Baileys** envia mensagem via WhatsApp para o número configurado

### Fluxo de Dados

```
Frontend → Backend VeloHub → API Baileys → WhatsApp
```

---

## 🔗 Integração com API Baileys

A API Baileys deve estar rodando e configurada em outro serviço (ex: Render, Railway).

**Requisitos da API Baileys:**
- Deve ter endpoint para envio de mensagens
- Deve estar conectada ao WhatsApp (QR code escaneado)
- Deve aceitar requisições do backend VeloHub

**Exemplo de configuração:**
```env
WHATSAPP_API_URL=https://whatsapp-api-y40p.onrender.com
```

---

## 📝 Formato JID

O JID (Jabber ID) é o identificador único do WhatsApp.

**Formato para número individual:**
```
5511943952784@s.whatsapp.net
```
- `55` = código do país (Brasil)
- `11` = DDD
- `943952784` = número
- `@s.whatsapp.net` = sufixo para números individuais

**Formato para grupo:**
```
120363400851545835@g.us
```
- `120363400851545835` = ID do grupo
- `@g.us` = sufixo para grupos

---

## 🧪 Testando

### 1. Testar Health Check
```bash
curl https://velohub-backend.onrender.com/api/test
```

### 2. Testar Serviço de Relatórios
```bash
curl https://velohub-backend.onrender.com/api/escalacoes/reports/test
```

### 3. Enviar Relatório de Teste
```bash
curl -X POST https://velohub-backend.onrender.com/api/escalacoes/reports/send \
  -H "Content-Type: application/json" \
  -d '{
    "reportContent": "📊 Teste de Relatório\n\nEste é um teste do sistema de envio de relatórios via WhatsApp.",
    "title": "Teste de Integração"
  }'
```

---

## ⚠️ Troubleshooting

### Erro: "WhatsApp desconectado"
- Verifique se a API Baileys está rodando
- Confirme que o WhatsApp está conectado (QR code escaneado)
- Teste a API Baileys diretamente

### Erro: "JID não configurado"
- Configure `WHATSAPP_DEFAULT_JID` no formato correto
- Ou envie `jid` no body da requisição

### Erro: "Erro ao enviar mensagem"
- Verifique se `WHATSAPP_API_URL` está correto
- Confirme que a API Baileys aceita requisições do backend
- Verifique os logs da API Baileys

---

## 📚 Exemplos de Uso

### Frontend React
```javascript
import { reportsAPI } from './services/reportsApi';

// Enviar relatório
const result = await reportsAPI.sendReport(
  "📊 Relatório Executivo\n\nTotal: 150 interações",
  {
    title: "Relatório Diário",
    dateRange: "23/01/2025"
  }
);
```

### cURL
```bash
curl -X POST https://velohub-backend.onrender.com/api/escalacoes/reports/send \
  -H "Content-Type: application/json" \
  -d '{
    "reportContent": "Conteúdo do relatório aqui",
    "title": "Meu Relatório"
  }'
```

---

**Versão:** v1.0.0  
**Última atualização:** 2025-01-23  
**Autor:** VeloHub Development Team
