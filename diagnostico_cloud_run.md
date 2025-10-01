# DIAGNÓSTICO CRÍTICO - VeloHub V3 Cloud Run

## 🚨 SITUAÇÃO ATUAL
- ✅ Deploy concluído com sucesso
- ❌ Problema persiste (Status 503, MongoDB não configurado)
- ❌ IAs não funcionando (OPENAI_API_KEY ausente)

## 🔍 POSSÍVEIS CAUSAS

### 1. SECRETS NÃO INJETADOS NO CONTAINER
**Problema:** Cloud Run não está lendo as variáveis do Secret Manager

**Verificação necessária:**
```bash
# Verificar se secrets existem
gcloud secrets list --filter="name:(OPENAI_API_KEY OR GEMINI_API_KEY OR MONGO_ENV)"

# Verificar permissões da service account
gcloud run services describe velohub-278491073220 --region=us-east1 --format="value(spec.template.spec.template.spec.serviceAccountName)"

# Verificar se secrets estão sendo injetados
gcloud run services describe velohub-278491073220 --region=us-east1 --format="value(spec.template.spec.template.spec.containers[0].env[].name)"
```

### 2. SERVICE ACCOUNT SEM PERMISSÕES
**Problema:** Service account do Cloud Run não tem acesso aos secrets

**Solução:**
```bash
# Conceder permissão de acesso aos secrets
gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
    --member="serviceAccount:VELOHUB_SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
    --member="serviceAccount:VELOHUB_SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding MONGO_ENV \
    --member="serviceAccount:VELOHUB_SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### 3. CONFIGURAÇÃO INCORRETA NO CLOUD RUN
**Problema:** Variáveis não estão sendo referenciadas corretamente

**Verificação:**
```bash
# Verificar configuração atual do serviço
gcloud run services describe velohub-278491073220 --region=us-east1
```

## 🛠️ SOLUÇÕES IMEDIATAS

### OPÇÃO 1: CONFIGURAR SECRETS VIA CLOUD RUN
```bash
# Atualizar serviço com secrets
gcloud run services update velohub-278491073220 \
    --region=us-east1 \
    --set-secrets="OPENAI_API_KEY=OPENAI_API_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,MONGO_ENV=MONGO_ENV:latest"
```

### OPÇÃO 2: USAR VARIÁVEIS DE AMBIENTE DIRETAS
```bash
# Atualizar serviço com variáveis diretas (temporário)
gcloud run services update velohub-278491073220 \
    --region=us-east1 \
    --set-env-vars="OPENAI_API_KEY=sk-...,GEMINI_API_KEY=AIza...,MONGO_ENV=mongodb+srv://..."
```

### OPÇÃO 3: VERIFICAR APP.YAML
**Problema:** app.yaml pode estar configurado incorretamente

**Verificação necessária:**
- Confirmar se app.yaml está sendo usado
- Verificar se as referências de secrets estão corretas
- Confirmar se o deploy está usando app.yaml ou cloudbuild.yaml

## 📋 CHECKLIST DE DIAGNÓSTICO

### ✅ VERIFICAÇÕES IMEDIATAS
1. **Logs do Cloud Run:**
   ```bash
   gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="velohub-278491073220"' --limit=50
   ```

2. **Status do serviço:**
   ```bash
   gcloud run services describe velohub-278491073220 --region=us-east1
   ```

3. **Revisões ativas:**
   ```bash
   gcloud run revisions list --service=velohub-278491073220 --region=us-east1
   ```

### 🔧 AÇÕES CORRETIVAS
1. **Verificar secrets no Secret Manager**
2. **Conceder permissões à service account**
3. **Reconfigurar Cloud Run com secrets**
4. **Testar endpoint de health check**

## 🎯 PRÓXIMOS PASSOS

### IMEDIATO (0-30 min)
1. Verificar logs do Cloud Run
2. Confirmar existência dos secrets
3. Verificar permissões da service account

### CURTO PRAZO (30-60 min)
1. Reconfigurar Cloud Run com secrets corretos
2. Fazer novo deploy se necessário
3. Testar endpoints

### VALIDAÇÃO
1. Health check retornando 200
2. Logs mostrando "IA configurada"
3. Chatbot funcionando no frontend

## 🚨 ALERTA CRÍTICO
**O problema NÃO é o código - é a configuração do Cloud Run!**

As 3 IAs concordaram que a correção do código está correta, mas o deploy não resolveu porque:
- Secrets não estão sendo injetados
- Service account não tem permissões
- Configuração do Cloud Run está incorreta

**AÇÃO IMEDIATA:** Verificar e corrigir a configuração do Cloud Run!
