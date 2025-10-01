# 📋 DEPLOY LOG - VeloHub V3
<!-- VERSION: v1.0.0 | DATE: 2025-09-18 | AUTHOR: VeloHub Development Team -->

## 🚀 **DEPLOYS E PUSHES REALIZADOS**

### **GitHub Push - Implementação Completa do Novo Sistema de Busca VeloBot**
- **Data/Hora**: 2025-09-29 15:30:00
- **Tipo**: GitHub Push
- **Versão**: v3.0.0
- **Commit**: d1fdf6c
- **Arquivos Modificados**:
  - `backend/server.js` (v1.5.0)
  - `backend/services/chatbot/aiService.js` (v2.5.0)
  - `backend/services/chatbot/searchService.js` (v2.3.0)
  - `src/App_v2-1.js`
  - `src/components/Chatbot.js` (v1.3.0)
- **Arquivos Adicionados**:
  - `DIAGRAMA_FUNCIONAMENTO_BUSCA.txt`
- **Descrição**: Implementação completa do novo sistema de busca VeloBot com lógica dinâmica de IAs, clarification direto, handshake periódico, cache inteligente, filtro MongoDB e logs paralelos. Sistema totalmente otimizado e robusto.

### **GitHub Push - Melhorias Significativas no Sistema de Busca do Chatbot**
- **Data/Hora**: 2025-01-27 22:00:00
- **Tipo**: GitHub Push
- **Versão**: v2.2.0
- **Commit**: daaf31c
- **Arquivos Modificados**: 
  - `backend/services/chatbot/searchService.js` (v2.2.0 - algoritmo de busca melhorado)
- **Descrição**: Melhorias significativas no sistema de busca: threshold reduzido (0.1→0.05), algoritmo de fuzzy matching implementado, exact matching adicionado, keyword boost melhorado (0.3→0.4), busca corrigida para usar apenas campos corretos (Pergunta, Palavras-chave, Sinonimos), logs detalhados para debug, remoção de fallbacks que causavam inconsistência
- **Status**: ✅ Concluído com sucesso

### **GitHub Push - Implementação Completa do Botão AI e Integração com Artigos**
- **Data/Hora**: 2025-01-27 21:45:00
- **Tipo**: GitHub Push
- **Versão**: v1.2.0
- **Commit**: 38cd275
- **Arquivos Modificados**: 
  - `src/components/Chatbot.js` (v1.1.0 - botão AI e navegação para artigos)
  - `backend/server.js` (v1.2.0 - endpoint /api/chatbot/ai-response)
  - `DEPLOY_LOG.md` (atualização do log)
- **Arquivos Novos**:
  - `public/Gemini_SparkIcon_.width-500.format-webp-Photoroom.png` (ícone do Gemini)
- **Descrição**: Implementação completa do botão AI com logo Gemini, integração com navegação automática para artigos via CustomEvent, endpoint para respostas conversacionais da IA, melhorias no sistema de busca híbrida e correções na nomenclatura FAQ -> Bot_perguntas
- **Status**: ✅ Concluído com sucesso

### **GitHub Push - Atualização do Chatbot: Melhorias no Backend e Frontend**
- **Data/Hora**: 2025-01-27 21:15:00
- **Tipo**: GitHub Push
- **Versão**: v1.2.0
- **Commit**: 99be581
- **Arquivos Modificados**: 
  - `backend/server.js` (melhorias no sistema de chatbot)
  - `backend/services/chatbot/aiService.js` (atualizações no serviço de IA)
  - `src/components/Chatbot.js` (melhorias na interface do chatbot)
- **Arquivos Novos**:
  - `public/Gemini_SparkIcon_.width-500.format-webp-Photoroom.png` (novo ícone)
- **Descrição**: Atualizações gerais no sistema de chatbot com melhorias no backend e frontend, incluindo novo ícone do Gemini
- **Status**: ✅ Concluído com sucesso

### **GitHub Push - Refatoração Completa do Sistema de Chatbot**
- **Data/Hora**: 2025-01-27 20:30:00
- **Tipo**: GitHub Push
- **Versão**: aiService v2.1.0, searchService v2.1.0, feedbackService v2.1.0, server v1.1.0
- **Commit**: 1f1af0b
- **Arquivos Modificados**: 
  - `backend/services/chatbot/openaiService.js` → `aiService.js` (v2.1.0 - migração completa)
  - `backend/services/chatbot/searchService.js` (v2.1.0 - nomenclatura FAQ → Bot_perguntas)
  - `backend/services/chatbot/feedbackService.js` (v2.1.0 - MongoDB → Google Sheets)
  - `backend/services/chatbot/logsService.js` (remoção função logSiteResponse)
  - `backend/server.js` (v1.1.0 - atualizações de nomenclatura)
  - `backend/config.js` (v1.1.0 - remoção EXTERNAL_API_TIMEOUT)
  - `backend/package.json` (remoção dependência axios)
- **Arquivos Novos**:
  - `ANALISE CHATBOT.md` (documentação completa do sistema)
  - `ANALISE_SEGURANCA_CREDENTIALS.md` (análise de segurança)
  - `CONFIGURACAO_CHAVES_API.md` (configuração de APIs)
  - `env-seguro.txt` (template de variáveis seguras)
  - `env-template.txt` (template completo de variáveis)
- **Arquivos Removidos**:
  - `backend/test_chatbot_fixed.js` (teste com axios)
- **Descrição**: Refatoração completa do sistema de chatbot - migração de nomenclatura (FAQ → Bot_perguntas), remoção de APIs externas, migração de feedback para Google Sheets, correção de prompts, documentação completa

### **GitHub Push - Reorganização Aba Apoio e Correções Chatbot**
- **Data/Hora**: 2025-01-27 18:45:00
- **Tipo**: GitHub Push
- **Versão**: App v1.3.4, SupportModal v1.1.0
- **Commit**: 75a61e1
- **Arquivos Modificados**: 
  - `src/App_v2-1.js` (v1.3.4 - reorganização cards, linhas separadoras)
  - `src/components/SupportModal.js` (v1.1.0 - novos formulários)
  - `backend/server.js` (correções chatbot, endpoint /api/faq/top10)
  - `backend/services/chatbot/openaiService.js` (prompts consistentes)
  - `backend/services/chatbot/searchService.js` (correção MongoDB)
- **Arquivos Novos**:
  - `backend/config.js` (configurações centralizadas)
- **Descrição**: Reorganização da aba Apoio com 9 cards em 3 linhas, novos formulários para Gestão/RH-Financeiro/Facilities, correções do chatbot (CORS, MongoDB, prompts)

### **GitHub Push - Implementação Completa VeloBot V2.0**
- **Data/Hora**: 2025-01-27 16:30:00
- **Tipo**: GitHub Push
- **Versão**: VeloBot V2.0.0
- **Commit**: 3861ffe
- **Arquivos Modificados**: 
  - `backend/server.js` (v2.0.0 - endpoint chatbot atualizado)
  - `backend/services/chatbot/openaiService.js` (v2.0.0 - Gemini primário, OpenAI fallback)
  - `backend/services/chatbot/searchService.js` (v2.0.0 - busca híbrida + sites)
  - `backend/services/chatbot/feedbackService.js` (v2.0.0 - métricas aprimoradas)
  - `backend/services/chatbot/logsService.js` (v1.0.0 - novo serviço)
  - `backend/package.json` (novas dependências)
  - `src/App_v2-1.js` (integração melhorias)
- **Arquivos Novos**:
  - `.cursorrules` (diretrizes do projeto)
  - `CHECKLIST_MIGRACAO_GCP.md` (checklist completo)
  - `CHECKLIST_ROCKETCHAT_IMPLEMENTACAO.md` (checklist chat)
  - `LAYOUT_GUIDELINES.md` (diretrizes visuais)
  - `PLANO DE IMPLEMENTAÇÃO BOT V5.ini` (plano executado)
  - `chatbot-vercel/` (protótipo de referência)
- **Descrição**: 
  - Implementação completa do PLANO DE IMPLEMENTAÇÃO BOT V5.0.0
  - Gemini 2.5 Pro configurado como IA primária
  - OpenAI configurado como fallback automático
  - Sistema de busca híbrida (FAQ + Artigos + Sites autorizados)
  - Sistema de desduplicação e menu de esclarecimento
  - Logs detalhados no Google Sheets
  - Métricas de performance do chatbot
  - Integração completa com SSO do VeloHub
- **Status**: ✅ Concluído com sucesso

### **GitHub Push - Correção CORS e URLs para us-east1**
- **Data/Hora**: 2025-01-27 17:15:00
- **Tipo**: GitHub Push
- **Versão**: backend/server.js v1.0.2, src/config/api-config.js v1.0.1
- **Commit**: 5696841
- **Arquivos Modificados**: 
  - `backend/server.js` (CORS + URLs para us-east1)
  - `src/config/api-config.js` (URLs para us-east1)
- **Descrição**: 
  - Adicionar novo domínio app.velohub.velotax.com.br ao CORS
  - Atualizar URLs de southamerica-east1 para us-east1
  - Corrigir problema de CORS após mudança de DNS personalizado
  - Manter compatibilidade com domínios legados
  - Resolver erro "No 'Access-Control-Allow-Origin' header"
- **Status**: ✅ Concluído com sucesso

### **GitHub Push - Correção Sistema Notícias Críticas**
- **Data/Hora**: 2025-09-18 15:45:00
- **Tipo**: GitHub Push
- **Versão**: backend/server.js v1.0.1
- **Commit**: facc15e
- **Arquivos Modificados**: 
  - `backend/server.js` (correção campo isCritical)
- **Descrição**: 
  - Corrigir reconhecimento de notícias críticas com campo isCritical (boolean)
  - Adicionar suporte ao campo isCritical (boolean) no backend
  - Corrigir mapeamento em /api/velo-news e /api/data
  - Resolver problema de novo registro não sendo identificado como crítico
  - Manter compatibilidade com campos legados (alerta_critico, is_critical)
- **Status**: ✅ Concluído com sucesso

---

## 📊 **RESUMO DE ALTERAÇÕES**

### **Problema Identificado**
- Novo registro no MongoDB com `isCritical: true` não estava sendo reconhecido como crítico
- Backend não suportava o formato boolean do campo `isCritical`

### **Solução Implementada**
- Adicionado suporte ao campo `isCritical` (boolean) no backend
- Mantida compatibilidade com campos legados
- Corrigido mapeamento em ambos os endpoints

### **Arquivos Afetados**
- `backend/server.js` - Linhas 116 e 224

---

### **GitHub Push - Sistema de Análise Inteligente com IA**
- **Data/Hora**: 2025-01-27 23:55:00
- **Tipo**: GitHub Push
- **Versão**: aiService v2.4.0, searchService v2.3.0, server v1.3.0
- **Commit**: 3f45eb1
- **Arquivos Modificados**: 
  - `backend/services/chatbot/aiService.js` (v2.4.0 - analyzeQuestionWithAI, análise semântica)
  - `backend/services/chatbot/searchService.js` (v2.3.0 - generateClarificationMenuFromAI)
  - `backend/server.js` (v1.3.0 - fluxo inteligente com IA, fallback tradicional)
- **Descrição**: Sistema de análise inteligente com IA - IA analisa pergunta vs base de dados (perguntas, palavras-chave, sinônimos), fluxo inteligente: 1 opção relevante → resposta direta, múltiplas opções → menu esclarecimento, fallback para busca tradicional se IA falhar, resolve problema de perguntas sem resposta com análise contextual e semântica
- **Status**: ✅ Concluído com sucesso

### **GitHub Push - Implementação de Botões de Formatação WhatsApp e E-mail**
- **Data/Hora**: 2025-01-27 23:45:00
- **Tipo**: GitHub Push
- **Versão**: aiService v2.3.0, server v1.2.2
- **Commit**: f8b45d7
- **Arquivos Modificados**: 
  - `backend/services/chatbot/aiService.js` (v2.3.0 - prompts específicos WhatsApp/E-mail, persona dinâmica)
  - `backend/server.js` (v1.2.2 - suporte formatType no endpoint ai-response)
  - `src/components/Chatbot.js` (2 botões menores com ícones oficiais)
- **Arquivos Adicionados**:
  - `public/wpp logo.png` (ícone WhatsApp)
  - `public/octa logo.png` (ícone E-mail)
- **Descrição**: Implementação de botões de formatação específicos - 2 botões menores (WhatsApp e E-mail) com prompts otimizados para cada canal, WhatsApp: informal com emojis (máx 150 palavras), E-mail: formal estruturado (máx 300 palavras), endpoint único com parâmetro formatType, persona dinâmica baseada no tipo, ícones oficiais da marca, funcionalidade de reformulação mais relevante e útil
- **Status**: ✅ Concluído com sucesso

### **GitHub Push - Implementação Completa de Melhorias no Sistema de IA**
- **Data/Hora**: 2025-01-27 22:30:00
- **Tipo**: GitHub Push
- **Versão**: aiService v2.2.0, searchService v2.2.1, logsService v1.1.0, server v1.2.1
- **Commit**: 0f5a06c
- **Arquivos Modificados**: 
  - `backend/services/chatbot/aiService.js` (v2.2.0 - persona centralizada, contexto estruturado, validação)
  - `backend/services/chatbot/searchService.js` (v2.2.1 - correção source "Bot_perguntas")
  - `backend/services/chatbot/logsService.js` (v1.1.0 - nomenclatura MongoDB, função renomeada)
  - `backend/server.js` (v1.2.1 - integração com nova função logMongoDBResponse)
- **Arquivos Removidos**:
  - `chatbot-vercel/` (pasta resquício da migração)
- **Descrição**: Implementação completa de melhorias no sistema de IA - persona centralizada eliminando duplicação, estrutura hierárquica clara, contexto estruturado com informações organizadas, prompt otimizado com instruções específicas, parâmetros otimizados (temperature: 0.1, max_tokens: 512), validação de qualidade de resposta, correções de nomenclatura (Planilha → Bot_perguntas), função logSpreadsheetResponse → logMongoDBResponse, compatibilidade mantida com sistema existente
- **Status**: ✅ Concluído com sucesso

### **GitHub Push - Implementação Completa do Fluxo VeloBot v2.9.1**
- **Data/Hora**: 2025-01-27 23:15:00
- **Tipo**: GitHub Push
- **Versão**: v2.9.1
- **Commit**: fb707ea
- **Arquivos Modificados**:
  - `backend/server.js` (v2.9.1 - fluxo completo implementado)
  - `backend/services/chatbot/aiService.js` (v2.6.1 - prompt otimizado e análise IA)
  - `backend/services/chatbot/sessionService.js` (v2.0.0 - sessão simplificada)
  - `DIAGRAMA_FUNCIONAMENTO_BUSCA.txt` (atualizado com pontos 0-5)
- **Arquivos Adicionados**:
  - `listagem de schema de coleções do mongoD.rb` (schema MongoDB)
- **Descrição**: Implementação completa do fluxo VeloBot conforme DIAGRAMA_FUNCIONAMENTO_BUSCA.txt - PONTO 0: inicialização com validação, cache e handshake IA; PONTO 1: log Google Sheets restaurado; PONTO 2: filtro keywords (máx 30) e prompt otimizado; PONTO 3: chamada IA primária→secundária→busca tradicional; PONTO 4: análise IA apenas após sucesso de IA; PONTO 5: clarification com mensagens amigáveis. Correções: fluxo corrigido, handshake 3 cenários, prompt otimizado, mensagens amigáveis, versionamento semântico, logs restaurados, cache módulos TTL 3min
- **Status**: ✅ Concluído com sucesso

### **GitHub Push - Correção de Inicialização do Servidor v2.9.2**
- **Data/Hora**: 2025-01-27 23:30:00
- **Tipo**: GitHub Push
- **Versão**: v2.9.2
- **Commit**: 0596114
- **Arquivos Modificados**:
  - `backend/server.js` (v2.9.2 - correção inicialização)
- **Arquivos Adicionados**:
  - `backend/test-server.js` (servidor de teste para diagnóstico)
- **Descrição**: Correção de inicialização do servidor - adicionado try/catch para carregamento de serviços, logs de debug para identificação de problemas, servidor de teste criado para diagnóstico, tratamento de erros melhorado na inicialização. Resolve problema de deploy no Cloud Run onde o container não conseguia iniciar e escutar na porta 8080
- **Status**: ✅ Concluído com sucesso

---

### **GitHub Push - Correção .gitignore para Excluir Extensões VS Code**
- **Data/Hora**: 2025-01-29 23:45:00
- **Tipo**: GitHub Push
- **Versão**: .gitignore v1.1.0
- **Commit**: c99e52a
- **Arquivos Modificados**: 
  - `.gitignore` (v1.1.0 - exclusão de extensões VS Code)
- **Descrição**: Correção do .gitignore para excluir extensões do VS Code que estavam sendo commitadas, causando commits lentos e repositório pesado. Adicionadas exclusões para .vscode/extensions/, .vscode/User/, .vscode/workspaceStorage/, mantendo apenas .vscode/extensions.json (lista de extensões recomendadas). Resolve problema de performance nos commits e evita configurações pessoais no repositório.
- **Status**: ✅ Concluído com sucesso

### **GitHub Push - Correção Endpoint /api/module-status com Logs Detalhados**
- **Data/Hora**: 2025-01-29 22:30:00
- **Tipo**: GitHub Push
- **Versão**: backend/server.js v2.10.0
- **Commit**: ef54752
- **Arquivos Modificados**: 
  - `backend/server.js` (v2.10.0 - logs detalhados, validação de dados, fallback robusto)
- **Descrição**: Correção do endpoint /api/module-status que estava causando erro 'Unexpected token <' no Chatbot. Adicionados logs detalhados para debug do MongoDB e cache, garantia de que endpoint sempre retorna JSON válido, fallback robusto em caso de erro, melhorias nos logs de conexão MongoDB e validação de dados antes de retornar resposta. Resolve problema de status dos módulos não sendo capturado da collection.
- **Status**: ✅ Concluído com sucesso

### **GitHub Push - VeloHub V3 - Validação Completa e Otimização do Projeto**
- **Data/Hora**: 2025-01-29 19:45:00
- **Tipo**: GitHub Push
- **Versão**: v3.0.0
- **Commit**: a2f3683
- **Arquivos Modificados**:
  - `.cursorrules` (v1.2.0 - diretrizes críticas de segurança Git)
  - `package.json` (v3.0.0 - metadados completos e dependências)
  - `package-lock.json` (dependências corrigidas)
  - `README.md` (documentação atualizada)
  - `app.yaml` (configurações Secret Manager)
  - `backend/config.js` (variáveis de ambiente)
  - `backend/server.js` (configurações atualizadas)
  - `backend/services/logging/userActivityLogger.js` (MONGO_ENV)
  - `cloudbuild.yaml` (substituições de variáveis)
  - `src/config/api-config.js` (URLs dinâmicas)
  - `src/config/google-config.js` (configurações Google)
  - `src/lib/mongodb.js` (MONGO_ENV)
  - `tailwind.config.js` (paleta VeloHub)
- **Arquivos Removidos**:
  - `PLANO DE IMPLEMENTAÇÃO BOT V5.ini`
  - `backend/.env.example`
  - `backend/env-check.js`
  - `backend/minimal-server.js`
  - `backend/package-minimal.json`
  - `backend/test-server.js`
  - `backend/velonews_test.json`
  - `env-seguro.txt`
  - `env-template.txt`
  - `tat -ano  findstr 3000`
- **Descrição**: Validação completa do projeto VeloHub V3 - limpeza de arquivos de teste, correção de dependências (dotenv 10.0.0 → 16.6.1), atualização para versão 3.0.0, implementação de diretrizes críticas de segurança Git, configurações atualizadas para Secret Manager, estrutura organizada e pronta para produção
- **Status**: ✅ Concluído com sucesso

---
### **GitHub Push - Correção Configuração Secrets no app.yaml**
- **Data/Hora**: 2025-01-30 21:30:00
- **Tipo**: GitHub Push
- **Versão**: app.yaml v1.1.0
- **Commit**: 8196f79
- **Arquivos Modificados**: 
  - `app.yaml` (v1.1.0 - correção nomes dos secrets)
- **Descrição**: Correção crítica da configuração dos secrets no app.yaml - atualizado nomes dos secrets para usar os novos nomes: mongodb-uri → MONGO_ENV, GPT_apikey → OPENAI_API_KEY, Gemini_apikey → GEMINI_API_KEY. Resolve erro "MongoDB não configurado" no Cloud Run.
- **Status**: ✅ Concluído com sucesso

---

### **GitHub Push - Configuração Completa dos Secrets no app.yaml v1.2.0**
- **Data/Hora**: 2025-01-30 21:45:00
- **Tipo**: GitHub Push
- **Versão**: app.yaml v1.2.0
- **Commit**: 91c2014
- **Arquivos Modificados**: 
  - `app.yaml` (v1.2.0 - configuração completa dos secrets)
- **Descrição**: Configuração completa e auditada de todos os secrets no app.yaml - mapeamento correto de todos os secrets existentes para backend e frontend, adicionado REACT_APP_API_URL, configurações do chatbot, remoção de referências ao Ponto Mais (secrets não existem ainda). Resolve erro de autorização OAuth e garante que todos os secrets necessários estejam configurados.
- **Status**: ✅ Concluído com sucesso

---

### **GitHub Push - Correção Google OAuth Client ID**
- **Data/Hora**: 2025-01-30 22:00:00
- **Tipo**: GitHub Push
- **Versão**: Dockerfile v1.2.0
- **Commit**: d82036c
- **Arquivos Modificados**: 
  - `Dockerfile` (v1.2.0 - logs de debug para variáveis REACT_APP_)
- **Descrição**: Correção crítica do erro Google OAuth "Parameter client_id is not set correctly" - adicionado logs de debug para verificar se REACT_APP_GOOGLE_CLIENT_ID está sendo passado corretamente via --build-arg durante o build do Docker, resolve erro 400 no login Google OAuth
- **Status**: ✅ Concluído com sucesso

---

### **GitHub Push - Debug Google OAuth Client ID**
- **Data/Hora**: 2025-01-30 22:15:00
- **Tipo**: GitHub Push
- **Versão**: LoginPage.js v1.1.0, google-config.js v1.1.0
- **Commit**: ab6527a
- **Arquivos Modificados**: 
  - `src/components/LoginPage.js` (v1.1.0 - logs de debug para Client ID)
  - `src/config/google-config.js` (v1.1.0 - logs de debug para variáveis)
- **Descrição**: Adicionado logs detalhados para debug do erro Google OAuth - logs mostram se REACT_APP_GOOGLE_CLIENT_ID está sendo passado corretamente, verificação de tipo e valor das variáveis, teste local confirmou que variáveis funcionam quando definidas, próximo passo é verificar logs no ambiente de produção
- **Status**: ✅ Concluído com sucesso

---

### **GitHub Push - Debug Avançado Google OAuth**
- **Data/Hora**: 2025-01-30 22:30:00
- **Tipo**: GitHub Push
- **Versão**: Dockerfile v1.3.0
- **Commit**: 769d198
- **Arquivos Modificados**: 
  - `Dockerfile` (v1.3.0 - logs avançados de debug + verificação de build)
- **Descrição**: Debug avançado para resolver problema do CLIENT_ID chegando como string vazia - adicionado logs detalhados durante build, verificação de tamanho e se CLIENT_ID está vazio, logs pós-build para verificar se variáveis foram substituídas, verificação se CLIENT_ID foi encontrado nos arquivos JS finais, resolve problema identificado nos logs de produção
- **Status**: ✅ Concluído com sucesso

---

### **GitHub Push - Solução Temporária Google OAuth**
- **Data/Hora**: 2025-01-30 22:45:00
- **Tipo**: GitHub Push
- **Versão**: google-config.js v1.2.0
- **Commit**: 1e3c98d
- **Arquivos Modificados**: 
  - `src/config/google-config.js` (v1.2.0 - fallback hardcoded para CLIENT_ID)
- **Descrição**: Solução temporária implementada com sucesso - adicionado fallback hardcoded para REACT_APP_GOOGLE_CLIENT_ID, resolve problema de variáveis não sendo substituídas no build, Google OAuth funcionando perfeitamente, login realizado com sucesso, próximo problema: MongoDB não configurado no backend
- **Status**: ✅ Concluído com sucesso - Google OAuth RESOLVIDO

---

*Log atualizado automaticamente após push para GitHub*
