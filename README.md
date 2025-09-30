# VeloHub V3 - Portal de Processos Inteligente

<!-- VERSION: v3.1.5 | DATE: 2025-01-30 | AUTHOR: VeloHub Development Team -->

## 📋 Descrição
Portal de processos com chatbot inteligente integrado, sistema de notícias críticas, suporte ao usuário e integração completa com Google Cloud Platform.

## 🚀 Como Executar

### Desenvolvimento Local
```bash
# Instalar dependências
npm install

# Executar servidor backend
cd backend && npm install && npm start

# Executar frontend (em outro terminal)
npm start
```

### Produção (Google Cloud)
```bash
# Deploy para App Engine
gcloud app deploy

# Deploy para Cloud Run
gcloud run deploy
```

## 🔧 Configuração de Ambiente

### Variáveis de Ambiente Necessárias
O projeto utiliza variáveis de ambiente para configuração segura. Configure no Google Cloud Secret Manager:

- `MONGO_ENV` - String de conexão MongoDB
- `GOOGLE_CLIENT_ID` - Client ID do Google OAuth
- `GOOGLE_CLIENT_SECRET` - Client Secret do Google OAuth
- `GPT_API` - Chave da API OpenAI
- `GEMINI_API` - Chave da API Google Gemini
- `GOOGLE_CREDENTIALS` - Credenciais do Google Sheets

### Teste de Configuração
```bash
node test-config.js
```

## 📁 Estrutura do Projeto

```
VeloHub V3/
├── src/                    # Frontend React
│   ├── components/         # Componentes React
│   ├── config/            # Configurações do frontend
│   ├── lib/               # Bibliotecas e utilitários
│   └── services/          # Serviços de API
├── backend/               # Backend Node.js
│   ├── services/          # Serviços do chatbot
│   └── config.js          # Configuração centralizada
├── public/                # Arquivos estáticos
├── app.yaml              # Configuração Google App Engine
├── cloudbuild.yaml       # CI/CD Google Cloud Build
├── Dockerfile            # Container Docker
└── tailwind.config.js    # Configuração Tailwind CSS
```

## 🎨 Funcionalidades Principais

### 🤖 Chatbot Inteligente
- ✅ Integração com OpenAI e Google Gemini
- ✅ Sistema de fallback automático
- ✅ Memória de conversa (10 minutos)
- ✅ Análise de perguntas com IA
- ✅ Sistema de esclarecimento inteligente
- ✅ Logs de uso e feedback

### 📰 Sistema de Notícias
- ✅ Notícias críticas em tempo real
- ✅ Sistema de alertas prioritários
- ✅ Integração com MongoDB
- ✅ Cache inteligente de dados

### 🔐 Autenticação e Segurança
- ✅ Google OAuth 2.0
- ✅ Domínio autorizado (@velotax.com.br)
- ✅ Sessões seguras
- ✅ Secrets gerenciados pelo Google Cloud

### 📊 Logs e Monitoramento
- ✅ Logs de atividade no MongoDB
- ✅ Logs de uso da IA no Google Sheets
- ✅ Sistema de feedback
- ✅ Métricas de performance

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** - Interface de usuário
- **Tailwind CSS** - Estilização com tema VeloHub
- **Lucide React** - Ícones modernos

### Backend
- **Node.js** - Servidor backend
- **Express.js** - Framework web
- **MongoDB** - Banco de dados
- **Google Cloud APIs** - Integração com serviços Google

### Infraestrutura
- **Google App Engine** - Hospedagem
- **Google Cloud Run** - Containers
- **Google Secret Manager** - Gerenciamento de secrets
- **Google Cloud Build** - CI/CD

## 📝 Scripts Disponíveis

### Desenvolvimento
```bash
npm start              # Frontend React
npm run build          # Build de produção
cd backend && npm start # Backend Node.js
```

### Testes e Diagnóstico
```bash
node test-config.js    # Teste de configuração
npm run lint           # Verificação de código
```

### Deploy
```bash
gcloud app deploy      # Deploy App Engine
gcloud run deploy      # Deploy Cloud Run
```

## 🔒 Segurança

### ✅ Implementado
- **Secrets gerenciados** pelo Google Secret Manager
- **Nenhuma chave hardcoded** no código
- **Variáveis de ambiente** para todas as configurações
- **CORS configurado** adequadamente
- **Autenticação OAuth** com domínio restrito

### 🛡️ Boas Práticas
- Configurações sensíveis via Secret Manager
- Validação de entrada em todas as APIs
- Logs de segurança e auditoria
- Timeouts configurados para APIs externas

## 🚀 Deploy e Produção

### Google Cloud Platform
- **App Engine** para hospedagem principal
- **Cloud Run** para containers
- **Secret Manager** para chaves sensíveis
- **Cloud Build** para CI/CD automático

### Monitoramento
- Logs centralizados no Google Cloud Logging
- Métricas de performance
- Alertas de erro automáticos
- Dashboard de monitoramento

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o projeto, consulte:
- **Documentação**: `CONFIGURACAO_CHAVES_API.md`
- **Logs**: Google Cloud Console
- **Configuração**: `test-config.js`
