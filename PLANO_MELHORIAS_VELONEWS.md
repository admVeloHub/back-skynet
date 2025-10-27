# Plano de Melhorias do VeloNews
<!-- VERSION: v2.0.0 | DATE: 2025-01-24 | AUTHOR: VeloHub Development Team -->

## Visão Geral
Implementação de 5 funcionalidades para melhorar o gerenciamento e visualização de notícias no VeloNews, incluindo parser de texto universal, sistema de urgência com timer, histórico, rastreamento de leitura e status de resolução.

---

## 🎯 Metodologia de Implementação com Checkpoints

### Processo de Trabalho
Cada funcionalidade será implementada seguindo este fluxo:

1. **Implementar alteração**
2. **Testar localmente**
3. **🛑 CHECKPOINT - Aguardar confirmação do usuário**
4. **Prosseguir para próxima alteração apenas após aprovação**

### Regras dos Checkpoints
- ✅ Após cada alteração completada, PARAR e aguardar confirmação
- ✅ Mostrar resumo do que foi implementado
- ✅ Mostrar arquivos modificados
- ✅ Mostrar próxima etapa planejada
- ✅ Aguardar resposta: "OK", "continuar", "revisar", ou "corrigir"
- ❌ NÃO prosseguir automaticamente para próxima etapa

### Formato do Checkpoint
```
🛑 CHECKPOINT #X - [Nome da Funcionalidade]

✅ Implementado:
- [Lista do que foi feito]

📁 Arquivos modificados:
- [Lista de arquivos]

📊 Status: Pronto para teste

🔜 Próximo passo:
- [Próxima funcionalidade]

⏸️ AGUARDANDO CONFIRMAÇÃO PARA CONTINUAR
```

---

## Análise do Estado Atual

### Estrutura Existente
- **Frontend**: `src/App_v2-1.js` (HomePage component, linhas 525-964)
- **Backend**: `backend/server.js` (endpoint `/api/velo-news`, linhas 410-491)
- **Schema MongoDB**: Collection `Velonews` em `console_conteudo`
- **Campos atuais**: `_id`, `titulo`, `conteudo`, `isCritical` (boolean), `createdAt`, `updatedAt`

### Estado Visual Atual
- Notícias críticas: borda vermelha + badge "Crítica"
- Exibição: 4 notícias mais recentes na HomePage
- Modal para detalhes da notícia

---

## Implementações Necessárias

### 1. Parser Universal de Texto no Backend

**Objetivo**: Garantir formatação consistente de todos os textos (artigos, VeloNews, respostas do bot) processando `\n` e `\\n` corretamente

**Problema Identificado**:
- Textos no MongoDB contêm mistura de `\n` (quebra normal) e `\\n` (quebra escapada)
- Quebras de linha não são convertidas para `<br>` HTML
- Resultado: `\n` aparece literalmente na tela ao invés de criar quebra de linha

**Modificações**:

#### Backend (`backend/server.js`)

**Nova função**: `parseTextContent(text)`
```javascript
const parseTextContent = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  let formattedText = text;
  
  // 1. Tratar quebras escapadas (\\n -> \n)
  formattedText = formattedText.replace(/\\\\n/g, '\n');
  
  // 2. Normalizar quebras de linha
  formattedText = formattedText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  
  // 3. Formatar markdown básico
  formattedText = formattedText
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
  
  // 4. Formatar listas numeradas
  formattedText = formattedText.replace(/(\d+)[.)]\s*([^\n]+)/g, (match, number, content) => {
    return `${number}. ${content.trim()}`;
  });
  
  // 5. Formatar listas com bullets
  formattedText = formattedText.replace(/^[\s]*[-*]\s*([^\n]+)/gm, (match, content) => {
    return `• ${content.trim()}`;
  });
  
  // 6. Formatar links
  formattedText = formattedText
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/(https?:\/\/[^\s]+)/g, (match, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  
  // 7. Converter \n para <br> tags HTML
  formattedText = formattedText.replace(/\n/g, '<br>');
  
  // 8. Limpar formatação excessiva
  formattedText = formattedText
    .replace(/<(\w+)[^>]*>\s*<\/\1>/g, '')
    .replace(/\s{3,}/g, ' ')
    .replace(/<br>{3,}/g, '<br><br>');

  return formattedText;
};
```

**Aplicar em 3 endpoints**:
1. `/api/velo-news` (linha ~458) - campo `content`
2. `/api/articles` (linha ~493) - campo `content`
3. `/api/data` (linha ~352) - campos `velonews.content` e `articles.content`

**🛑 CHECKPOINT #1**: Após criar e aplicar a função parseTextContent

---

### 2. Timer de Destaque Urgente (12 horas)

**Objetivo**: Notícias urgentes perdem destaque visual 12h após usuário clicar "Ciente"

**Modificações**:

#### Backend (`backend/server.js`)

**Novo endpoint**: `POST /api/velo-news/:id/acknowledge`
```javascript
app.post('/api/velo-news/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    // Validar usuário autenticado
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId é obrigatório' });
    }
    
    await connectToMongo();
    const db = client.db('console_conteudo');
    const collection = db.collection('velonews_acknowledgments');
    
    // Criar registro (index único newsId+userId impede duplicatas)
    await collection.updateOne(
      { newsId: new ObjectId(id), userId: userId },
      { 
        $set: {
          newsId: new ObjectId(id),
          userId: userId,
          acknowledgedAt: new Date(),
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### Frontend (`src/App_v2-1.js`)

**Modificar lógica de exibição**:
- Verificar se usuário clicou "ciente" há menos de 12h
- Se sim: remover destaque vermelho
- Se não: manter destaque vermelho

**🛑 CHECKPOINT #2**: Após criar endpoint e integrar no frontend

---

### 3. Botão "Notícias Anteriores" + Modal de Histórico

**Objetivo**: Acesso ao histórico completo de notícias em modal

**Modificações**:

#### Frontend (`src/App_v2-1.js`)

**Novo componente**: `NewsHistoryModal`
```jsx
const NewsHistoryModal = ({ isOpen, onClose, allNews, onSelectNews }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Histórico de Notícias
          </h2>
          <button onClick={onClose} className="absolute top-4 right-4">✕</button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {allNews.map(news => (
            <div key={news._id} className="border-b pb-4 mb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-4 rounded" onClick={() => onSelectNews(news)}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{news.title}</h3>
                {news.is_critical === 'Y' && (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                    Crítica
                  </span>
                )}
                {news.solved && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                    Resolvido
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                {news.content}
              </p>
              <span className="text-xs text-gray-500">
                {new Date(news.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

**Adicionar botão**: Abaixo das 4 notícias principais
```jsx
<button 
  onClick={() => setShowHistoryModal(true)}
  className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
>
  Notícias Anteriores
</button>
```

**🛑 CHECKPOINT #3**: Após criar modal e botão

---

### 4. Registro de "Ciente" no MongoDB

**Objetivo**: Rastrear quem visualizou/confirmou cada notícia

**Modificações**:

#### Schema MongoDB

**Nova collection**: `console_conteudo.velonews_acknowledgments`
```javascript
{
  _id: ObjectId,
  newsId: ObjectId,           // Referência à notícia
  userId: String,             // ID/Email do usuário (ALTERADO: era userEmail)
  acknowledgedAt: Date,       // Data/hora do clique
  createdAt: Date,
  updatedAt: Date
}

// Index único para impedir duplicatas
{ newsId: 1, userId: 1 }, { unique: true }
```

#### Frontend (`src/App_v2-1.js`)

**Modificar botão "Ciente"**:
```jsx
const handleAcknowledge = async (newsId) => {
  try {
    const userId = localStorage.getItem('velohub_user_email');
    
    await fetch(`${API_BASE_URL}/api/velo-news/${newsId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    
    // Feedback visual
    alert('Notícia marcada como lida!');
    
    // Recarregar notícias
    fetchAllData();
  } catch (error) {
    console.error('Erro ao registrar ciente:', error);
  }
};
```

**🛑 CHECKPOINT #4**: Após documentar schema e integrar com botão

---

### 5. Campo "solved" com Destaque Verde

**Objetivo**: Notícias resolvidas têm visual diferenciado

**Modificações**:

#### Schema MongoDB (`Velonews`)

**Novo campo**: `solved: Boolean` (default: false)
```javascript
{
  _id: ObjectId,
  titulo: String,
  conteudo: String,
  isCritical: Boolean,
  solved: Boolean,           // NOVO CAMPO
  createdAt: Date,
  updatedAt: Date
}
```

#### Backend (`backend/server.js`)

**Modificar mapeamento** em `/api/velo-news`:
```javascript
const mappedNews = raw.map(item => {
  return {
    _id: item._id,
    title: item.titulo ?? '(sem título)',
    content: parseTextContent(item.conteudo ?? ''),
    is_critical: item.isCritical === true ? 'Y' : 'N',
    solved: item.solved ?? false,  // ADICIONAR
    createdAt: item.createdAt ?? item.updatedAt,
    updatedAt: item.updatedAt ?? item.createdAt,
    source: 'Velonews'
  };
});
```

#### Frontend (`src/App_v2-1.js`)

**Adicionar estilos CSS** em `src/index.css`:
```css
.solved-news-frame {
  background: rgba(21, 162, 55, 0.3);
  border: 2px solid rgba(21, 162, 55, 0.5);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.solved-content {
  text-decoration: line-through;
  opacity: 0.7;
}

.solved-badge {
  background-color: rgba(21, 162, 55, 0.9);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}
```

**Modificar renderização**:
```jsx
{veloNews.map(news => (
  <div key={news._id} className={`${
    news.solved ? 'solved-news-frame' :
    news.is_critical === 'Y' ? 'critical-news-frame' : 
    'border-b dark:border-gray-700 pb-4 last:border-b-0'
  }`}>
    <div className="flex justify-between items-start mb-2">
      <h3 className={`font-semibold text-lg ${news.solved ? 'solved-content' : ''}`}>
        {news.title}
      </h3>
      {news.solved && (
        <span className="solved-badge">Resolvido</span>
      )}
      {news.is_critical === 'Y' && !news.solved && (
        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
          Crítica
        </span>
      )}
    </div>
    <div className={`text-gray-600 dark:text-gray-400 ${news.solved ? 'solved-content' : ''}`}
         dangerouslySetInnerHTML={{ __html: news.content }} />
  </div>
))}
```

**🛑 CHECKPOINT #5**: Após adicionar campo, estilos e visual

---

## Ordem de Implementação (com Checkpoints)

### 🔧 Fase 1: Backend - Formatação de Texto
1. ✅ **Criar função parseTextContent no Backend**
   - Adicionar função no topo de backend/server.js
   - 🛑 **CHECKPOINT #1**

2. ✅ **Aplicar parser em todos os endpoints**
   - Modificar /api/velo-news
   - Modificar /api/articles
   - Modificar /api/data
   - 🛑 **CHECKPOINT #2**

### 🗄️ Fase 2: Schema e Endpoints VeloNews
3. ✅ **Atualizar Schema MongoDB**
   - Adicionar campo `solved` em Velonews
   - Documentar collection velonews_acknowledgments
   - Atualizar listagem de schema de coleções do mongoD.rb
   - 🛑 **CHECKPOINT #3**

4. ✅ **Backend - Endpoint de Acknowledge**
   - Criar POST /api/velo-news/:id/acknowledge
   - Validar usuário autenticado
   - Criar registro no MongoDB
   - 🛑 **CHECKPOINT #4**

5. ✅ **Backend - Mapear campo solved**
   - Modificar endpoint /api/velo-news
   - Incluir campo solved na resposta
   - 🛑 **CHECKPOINT #5**

### 🎨 Fase 3: Frontend - Visuais e Funcionalidades
6. ✅ **Frontend - Visual "solved"**
   - Adicionar estilos CSS (solved-news-frame)
   - Implementar badge "Resolvido"
   - Implementar conteúdo tachado
   - Testar tema claro/escuro
   - 🛑 **CHECKPOINT #6**

7. ✅ **Frontend - Timer de urgência**
   - Implementar lógica de 12h
   - Integrar com endpoint de acknowledge
   - Modificar botão "Ciente"
   - Testar remoção de destaque
   - 🛑 **CHECKPOINT #7**

8. ✅ **Frontend - Componente NewsHistoryModal**
   - Criar componente NewsHistoryModal
   - Implementar lista completa de notícias
   - Adicionar scroll/paginação
   - Testar abertura e navegação
   - 🛑 **CHECKPOINT #8**

9. ✅ **Frontend - Botão "Notícias Anteriores"**
   - Adicionar botão na seção VeloNews
   - Integrar com modal
   - Testar funcionalidade completa
   - 🛑 **CHECKPOINT #9**

### ✅ Fase 4: Validação Final
10. ✅ **Testes e ajustes finais**
    - Testar todas as funcionalidades integradas
    - Validar tema claro/escuro
    - Verificar responsividade
    - Atualizar DEPLOY_LOG.md
    - 🛑 **CHECKPOINT #10 (FINAL)**

---

## Considerações Técnicas

### Compatibilidade
- ✅ Manter compatibilidade com código existente
- ✅ Não modificar endpoints existentes (criar novos)
- ✅ Seguir padrões do LAYOUT_GUIDELINES.md

### Performance
- Timer de urgência calculado no frontend (evita requests)
- Cache de acknowledgments no localStorage
- Modal de histórico com scroll para grandes volumes

### Segurança
- Validar usuário autenticado em todos os endpoints
- Impedir manipulação de acknowledgments de outros usuários
- Index único no MongoDB (newsId + userId)

---

## Arquivos Principais a Modificar

1. **`backend/server.js`** - Função parseTextContent + novos endpoints + mapeamento
2. **`listagem de schema de coleções do mongoD.rb`** - Atualizar documentação schemas
3. **`src/App_v2-1.js`** - Componentes e lógica visual VeloNews
4. **`src/index.css`** - Novos estilos (solved-news-frame, etc.)
5. **`DEPLOY_LOG.md`** - Registrar alterações após conclusão

---

## Lista de Checkpoints

### 🛑 Checkpoint #1: Função parseTextContent
**O que foi feito:**
- Criar função de parsing no backend/server.js
- Testar com exemplos de texto com \n e \\n
- Validar conversão para HTML

**Aguardando:** Confirmação para prosseguir

---

### 🛑 Checkpoint #2: Aplicar Parser nos Endpoints
**O que foi feito:**
- Modificar endpoint /api/velo-news
- Modificar endpoint /api/articles
- Modificar endpoint /api/data
- Testar resposta dos endpoints

**Aguardando:** Confirmação para prosseguir

---

### 🛑 Checkpoint #3: Schema MongoDB
**O que foi feito:**
- Atualizar documentação em listagem de schema de coleções do mongoD.rb
- Adicionar campo "solved: Boolean" no schema Velonews
- Documentar nova collection velonews_acknowledgments (campo userId)

**Aguardando:** Confirmação para prosseguir

---

### 🛑 Checkpoint #4: Endpoint de Acknowledge
**O que foi feito:**
- Criar POST /api/velo-news/:id/acknowledge
- Validar usuário autenticado
- Registrar no MongoDB (campo userId)
- Testar endpoint

**Aguardando:** Confirmação para prosseguir

---

### 🛑 Checkpoint #5: Campo Solved
**O que foi feito:**
- Modificar mapeamento em /api/velo-news
- Incluir campo solved na resposta
- Testar com dados de exemplo

**Aguardando:** Confirmação para prosseguir

---

### 🛑 Checkpoint #6: Visual Solved
**O que foi feito:**
- Adicionar estilos CSS (solved-news-frame)
- Implementar badge "Resolvido"
- Implementar conteúdo tachado
- Testar tema claro/escuro

**Aguardando:** Confirmação para prosseguir

---

### 🛑 Checkpoint #7: Timer de Urgência
**O que foi feito:**
- Implementar lógica de 12h
- Integrar com endpoint de acknowledge
- Testar remoção de destaque

**Aguardando:** Confirmação para prosseguir

---

### 🛑 Checkpoint #8: Modal de Histórico
**O que foi feito:**
- Criar componente NewsHistoryModal
- Implementar lista completa de notícias
- Adicionar scroll/paginação
- Testar abertura e navegação

**Aguardando:** Confirmação para prosseguir

---

### 🛑 Checkpoint #9: Botão Notícias Anteriores
**O que foi feito:**
- Adicionar botão na seção VeloNews
- Integrar com modal
- Testar funcionalidade completa

**Aguardando:** Confirmação para prosseguir

---

### 🛑 Checkpoint #10: Validação Final
**O que foi feito:**
- Testar todas as funcionalidades integradas
- Validar tema claro/escuro
- Verificar responsividade
- Atualizar DEPLOY_LOG.md

**Status:** ✅ Implementação completa

---

**FIM DO PLANO**


