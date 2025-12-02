/**
 * VeloHub V3 - Backend Server
 * VERSION: v2.31.4 | DATE: 2025-01-30 | AUTHOR: VeloHub Development Team
 */

// ===== FALLBACK PARA TESTES LOCAIS =====
const FALLBACK_FOR_LOCAL_TESTING = {
  _id: "devId123",
  pergunta: "Fallback para teste",
  resposta: "Texto para preenchimento de teste via fallback",
  palavrasChave: "fallback",
  sinonimos: "teste, interno",
  tabulacao: "Categoria: Teste; Motivo: Tabulação; Detalhe: exibição"
};

// Função para verificar se deve usar fallback local
const shouldUseLocalFallback = () => {
  return process.env.NODE_ENV === 'development' || 
         process.env.LOCAL_TESTING === 'true' ||
         !process.env.MONGODB_URI;
};

// LOG DE DIAGNÓSTICO #1: Identificar a versão do código
console.log("🚀 INICIANDO APLICAÇÃO - VERSÃO DO CÓDIGO: 1.5.5 - DIAGNÓSTICO ATIVO");

// LOG DE DIAGNÓSTICO #2: Verificar as variáveis de ambiente
console.log("🔍 Verificando variáveis de ambiente...");
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- OPENAI_API_KEY existe: ${!!process.env.OPENAI_API_KEY}`);
console.log(`- GEMINI_API_KEY existe: ${!!process.env.GEMINI_API_KEY}`);
console.log(`- MONGO_ENV existe: ${!!process.env.MONGO_ENV}`);
console.log(`- PORT: ${process.env.PORT}`);

const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
// Carregar variáveis de ambiente
require('dotenv').config();

// Carregar configuração local para testes
const localConfig = require('./config-local');

// Importar serviços do chatbot
// VERSION: v2.19.0 | DATE: 2025-01-10 | AUTHOR: VeloHub Development Team
let aiService, searchService, sessionService, dataCache, userActivityLogger, botFeedbackService, responseFormatter, userSessionLogger;

console.log('🔄 Iniciando carregamento de serviços...');

try {
  console.log('📦 Carregando aiService...');
  aiService = require('./services/chatbot/aiService');
  console.log('✅ aiService carregado');
  
  console.log('📦 Carregando searchService...');
  searchService = require('./services/chatbot/searchService');
  console.log('✅ searchService carregado');
  
  console.log('📦 Carregando sessionService...');
  sessionService = require('./services/chatbot/sessionService');
  console.log('✅ sessionService carregado');
  
  console.log('📦 Carregando dataCache...');
  dataCache = require('./services/chatbot/dataCache');
  console.log('✅ dataCache carregado');
  
  console.log('📦 Carregando userActivityLogger...');
  userActivityLogger = require('./services/logging/userActivityLogger');
  console.log('✅ userActivityLogger carregado');
  
  console.log('📦 Carregando botFeedbackService...');
  botFeedbackService = require('./services/chatbot/botFeedbackService');
  console.log('✅ botFeedbackService carregado');
  
  console.log('📦 Carregando responseFormatter...');
  responseFormatter = require('./services/chatbot/responseFormatter');
  console.log('✅ responseFormatter carregado');
  
  console.log('📦 Carregando userSessionLogger...');
  userSessionLogger = require('./services/logging/userSessionLogger');
  console.log('✅ userSessionLogger carregado');
  
  console.log('🎉 Todos os serviços carregados com sucesso!');
} catch (error) {
  console.error('❌ Erro ao carregar serviços:', error.message);
  console.error('Stack:', error.stack);
  console.error('❌ Falha crítica - encerrando processo');
  process.exit(1);
}

// Carregar config para verificação de configurações WhatsApp
const config = require('./config');

// Log de configurações WhatsApp (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  console.log('📱 Configurações WhatsApp:');
  console.log('   - WHATSAPP_API_URL:', config.WHATSAPP_API_URL ? '✅ Configurado' : '❌ Não configurado');
  console.log('   - WHATSAPP_DEFAULT_JID:', config.WHATSAPP_DEFAULT_JID ? '✅ Configurado' : '❌ Não configurado');
  if (config.WHATSAPP_API_URL) {
    console.log('   - URL:', config.WHATSAPP_API_URL);
  }
  if (config.WHATSAPP_DEFAULT_JID) {
    console.log('   - JID:', config.WHATSAPP_DEFAULT_JID);
  }
}

const app = express();
const PORT = process.env.PORT || 8090;

// Middleware
app.use(cors({
  origin: [
    'https://app.velohub.velotax.com.br', // NOVO DOMÍNIO PERSONALIZADO
    process.env.CORS_ORIGIN || 'https://velohub-278491073220.us-east1.run.app',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:8080'
  ],
  credentials: true
}));
app.use(express.json());

// ===== FUNÇÕES AUXILIARES =====

/**
 * Converte \n literais em quebras de linha reais
 * @param {string} text - Texto a ser processado
 * @returns {string} Texto com quebras de linha convertidas
 */
function parseTextContent(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\\n/g, '\n');
}

// Middleware para garantir que erros sempre retornem JSON
app.use((err, req, res, next) => {
  console.error('❌ Erro no servidor:', err);
  if (!res.headersSent) {
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor',
      message: err.message 
    });
  }
});

// Middleware de debug para capturar problemas de JSON
app.use((req, res, next) => {
  if (req.path === '/api/chatbot/ask') {
    console.log('🔍 Debug: Headers recebidos:', JSON.stringify(req.headers, null, 2));
    console.log('🔍 Debug: Body recebido:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Middleware para capturar bytes brutos da resposta (diagnóstico)
app.use((req, res, next) => {
  const oldWrite = res.write;
  const oldEnd = res.end;
  const chunks = [];

  res.write = function(chunk, ...args) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return oldWrite.apply(res, [chunk, ...args]);
  };
  
  res.end = function(chunk, ...args) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const bodyBuf = Buffer.concat(chunks);
    
    if (req.path === '/api/chatbot/ask' && res.get('Content-Type')?.includes('application/json')) {
      console.log('--- OUTGOING RAW BYTES (first 200) ---');
      console.log('UTF8:', bodyBuf.slice(0,200).toString('utf8'));
      console.log('HEX:', bodyBuf.slice(0,50));
      console.log('First byte:', bodyBuf[0], '(', String.fromCharCode(bodyBuf[0]), ')');
    }
    
    return oldEnd.apply(res, [chunk, ...args]);
  };
  
  next();
});

// Função para formatar conteúdo de artigos seguindo padrões do schema
const formatArticleContent = (content) => {
  if (!content) return '';
  
  return content
    // Converter \n literais para quebras reais
    .replace(/\\n/g, '\n')
    // Converter quebras múltiplas excessivas
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// MongoDB Connection
const uri = process.env.MONGO_ENV;

console.log('🔍 Verificando configuração MongoDB...');
console.log('🔍 MONGO_ENV definida:', !!uri);
if (uri) {
  console.log('🔍 MONGO_ENV (primeiros 50 chars):', uri.substring(0, 50) + '...');
} else {
  console.warn('⚠️ MONGO_ENV não configurada - servidor iniciará sem MongoDB');
  console.warn('⚠️ APIs que dependem do MongoDB não funcionarão');
}
const client = uri ? new MongoClient(uri, {
  serverSelectionTimeoutMS: 15000, // 15 segundos timeout (otimizado para us-east-1)
  connectTimeoutMS: 20000, // 20 segundos timeout
  socketTimeoutMS: 45000, // 45 segundos timeout
}) : null;

// Conectar ao MongoDB uma vez no início
let isConnected = false;
const connectToMongo = async () => {
  if (!client) {
    console.error('❌ MongoDB client não configurado');
    throw new Error('MongoDB não configurado');
  }
  
  if (!isConnected) {
    try {
      console.log('🔌 Tentando conectar ao MongoDB...');
      await client.connect();
      isConnected = true;
      console.log('✅ Conexão MongoDB estabelecida!');
    } catch (error) {
      console.error('❌ Erro ao conectar MongoDB:', error);
      throw error;
    }
  } else {
    console.log('✅ MongoDB já conectado');
  }
  
  return client;
};

// Health check endpoint (não depende do MongoDB)
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Servidor funcionando!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test connection endpoint
app.get('/api/test', async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({ 
        success: false, 
        error: 'MongoDB não configurado',
        message: 'Servidor funcionando, mas MongoDB não disponível'
      });
    }
    await connectToMongo();
    res.json({ success: true, message: 'Conexão com MongoDB OK!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test chatbot endpoint
app.get('/api/chatbot/test', async (req, res) => {
  try {
    const config = require('./config');
    const aiStatus = aiService.getConfigurationStatus();
    
    res.json({
      success: true,
      data: {
        ai_service: {
          gemini: {
            configured: aiStatus.gemini.configured,
            model: aiStatus.gemini.model,
            priority: aiStatus.gemini.priority
          },
          openai: {
            configured: aiStatus.openai.configured,
            model: aiStatus.openai.model,
            priority: aiStatus.openai.priority
          },
          any_available: aiStatus.anyAvailable
        },
        mongodb_configured: !!config.MONGODB_URI,
        environment: config.NODE_ENV
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para Top 10 FAQ (substitui Google Apps Script)
app.get('/api/faq/top10', async (req, res) => {
  try {
    console.log('📋 Buscando Top 10 FAQ do MongoDB (console_analises.faq_bot)...');
    
    // Tentar conectar ao MongoDB
    const client = await connectToMongo();
    if (!client) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB não disponível',
        data: []
      });
    }
    
    const db = client.db('console_analises');
    const faqBotCollection = db.collection('faq_bot');
    
    // Buscar dados do FAQ da coleção console_analises.faq_bot
    const faqData = await faqBotCollection.findOne({ _id: "faq" });
    
    if (!faqData || !faqData.dados || faqData.dados.length === 0) {
      console.log('⚠️ Nenhum dado encontrado em console_analises.faq_bot');
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Converter dados para formato esperado pelo frontend
    const top10FAQ = faqData.dados.slice(0, 10).map((pergunta, index) => ({
      pergunta: pergunta || 'Pergunta não disponível',
      frequencia: Math.max(100 - (index * 10), 10), // Simular frequência decrescente baseada na posição
      _id: `faq_${index + 1}`, // ID gerado baseado na posição
      palavrasChave: '', // Campo não disponível na nova estrutura
      sinonimos: '' // Campo não disponível na nova estrutura
    }));
    
    console.log(`✅ Top 10 FAQ carregado de console_analises.faq_bot: ${top10FAQ.length} perguntas`);
    console.log(`📊 Total de perguntas no período: ${faqData.totalPerguntas || 'N/A'}`);
    console.log(`🕒 Última atualização: ${faqData.updatedAt || 'N/A'}`);
    
    res.json({
      success: true,
      data: top10FAQ
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar Top 10 FAQ:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      data: []
    });
  }
});

// Endpoint único para buscar todos os dados
app.get('/api/data', async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB não configurado',
        data: { velonews: [], articles: [], faq: [] }
      });
    }
    
    console.log('🔌 Conectando ao MongoDB...');
    await connectToMongo();
    console.log('✅ Conexão estabelecida!');
    
    const db = client.db('console_conteudo');
    
    // Buscar dados de todas as collections de uma vez
    console.log('📊 Buscando dados das collections...');
    
    const [velonews, artigos, faq] = await Promise.all([
      db.collection('Velonews').find({}).sort({ createdAt: -1 }).toArray(),
      db.collection('Artigos').find({}).sort({ createdAt: -1 }).toArray(),
      db.collection('Bot_perguntas').find({}).sort({ createdAt: -1 }).toArray()
    ]);
    
    console.log(`📰 Velonews encontrados: ${velonews.length}`);
    console.log(`📚 Artigos encontrados: ${artigos.length}`);
    console.log(`❓ FAQ encontrados: ${faq.length}`);
    
    // Debug: mostrar estrutura dos primeiros velonews
    if (velonews.length > 0) {
      console.log('🔍 Estrutura do primeiro velonews:', JSON.stringify(velonews[0], null, 2));
    }
    
    // Mapear dados para o formato esperado pelo frontend
    const mappedData = {
      velonews: velonews.map(item => ({
        _id: item._id,
        title: item.title || item.velonews_titulo,
        content: parseTextContent(item.content || item.velonews_conteudo || ''),
        is_critical: item.alerta_critico === 'Y' || item.alerta_critico === true || item.is_critical === 'Y' || item.is_critical === true || item.isCritical === 'Y' || item.isCritical === true ? 'Y' : 'N',
        solved: (() => {
          console.log('🔍 BACKEND - item.solved:', item.solved, 'tipo:', typeof item.solved);
          return item.solved || false;
        })(),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      
      articles: artigos.map(item => ({
        _id: item._id,
        title: item.artigo_titulo,
        content: parseTextContent(item.artigo_conteudo || ''),
        category: item.categoria_titulo,
        category_id: item.categoria_id,
        tag: item.tag,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      
      faq: faq.map(item => ({
        _id: item._id,
        topic: item.topico || item.topic,
        context: item.contexto || item.context,
        keywords: item.keywords || '',
        question: item.topico || item.question,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }))
    };
    
    console.log('✅ Dados mapeados com sucesso!');
    console.log(`📊 Resumo: ${mappedData.velonews.length} velonews, ${mappedData.articles.length} artigos, ${mappedData.faq.length} faq`);
    
    // Debug: mostrar velonews críticos mapeados
    const criticalNews = mappedData.velonews.filter(n => n.is_critical === 'Y');
    console.log(`🚨 Velonews críticos encontrados: ${criticalNews.length}`);
    if (criticalNews.length > 0) {
      console.log('🚨 Primeiro velonews crítico:', JSON.stringify(criticalNews[0], null, 2));
    }
    
    res.json({
      success: true,
      data: mappedData
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados',
      error: error.message
    });
  }
});

// Endpoints individuais mantidos para compatibilidade
app.get('/api/velo-news', async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB não configurado',
        data: []
      });
    }
    
    await connectToMongo();
    const db = client.db('console_conteudo');
    const collection = db.collection('Velonews');

    // Heurística para evitar "artigos" que vazaram pra cá
    const raw = await collection.find({
      $nor: [
        { artigo_titulo: { $exists: true } },
        { artigo_conteudo: { $exists: true } },
        { tipo: 'artigo' },
      ]
    })
    .sort({ createdAt: -1, _id: -1 })
    .toArray();

    console.log('🔍 Buscando dados da collection Velonews...');
    console.log(`📰 Encontrados ${raw.length} documentos na collection Velonews`);
    
    // ADICIONE ESTE LOG PARA DEPURAR
    console.log('DADOS BRUTOS DA COLLECTION VELONEWS:', JSON.stringify(raw, null, 2));
    
    // Debug: mostrar estrutura dos primeiros 3 documentos
    if (raw.length > 0) {
      console.log('🔍 Estrutura dos primeiros documentos:');
      raw.slice(0, 3).forEach((item, index) => {
        console.log(`Documento ${index + 1}:`, {
          _id: item._id,
          title: item.title,
          velonews_titulo: item.velonews_titulo,
          content: item.content ? item.content.substring(0, 100) + '...' : null,
          velonews_conteudo: item.velonews_conteudo ? item.velonews_conteudo.substring(0, 100) + '...' : null,
          alerta_critico: item.alerta_critico,
          is_critical: item.is_critical,
          createdAt: item.createdAt
        });
      });
    }

    const mappedNews = raw.map(item => {
      // Normalização de datas
      const createdAt =
        item.createdAt ??
        item.updatedAt ??
        (item._id && item._id.getTimestamp ? item._id.getTimestamp() : null);

      return {
        _id: item._id,
        // Usando campos padrão do schema
        title: item.titulo ?? '(sem título)',
        content: parseTextContent(item.conteudo ?? ''),
        is_critical: item.isCritical === true ? 'Y' : 'N',
        solved: (() => {
          console.log('🔍 BACKEND - item.solved:', item.solved, 'tipo:', typeof item.solved);
          return item.solved || false;
        })(),
        createdAt,
        updatedAt: item.updatedAt ?? createdAt,
        source: 'Velonews'
      };
    });
    
    console.log('✅ Dados mapeados com sucesso:', mappedNews.length, 'velonews');
    
    res.json({
      success: true,
      data: mappedNews
    });
  } catch (error) {
    console.error('Erro ao buscar notícias:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar notícias',
      error: error.message
    });
  }
});

app.get('/api/articles', async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB não configurado',
        data: []
      });
    }
    
    await connectToMongo();
    const db = client.db('console_conteudo');
    const collection = db.collection('Artigos');
    
    const articles = await collection.find({}).toArray();
    
    const mappedArticles = articles.map(item => ({
      _id: item._id,
      title: item.artigo_titulo,
      content: parseTextContent(item.artigo_conteudo || ''),
      category: item.categoria_titulo,
      category_id: item.categoria_id,
      tag: item.tag,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));
    
    res.json({
      success: true,
      data: mappedArticles
    });
  } catch (error) {
    console.error('Erro ao buscar artigos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar artigos',
      error: error.message
    });
  }
});

app.get('/api/faq', async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB não configurado',
        data: []
      });
    }
    
    await connectToMongo();
    const db = client.db('console_conteudo');
    const collection = db.collection('Bot_perguntas');
    
    const faq = await collection.find({}).toArray();
    
    const mappedFaq = faq.map(item => ({
      _id: item._id,
      topic: item.topico || item.topic,
      context: item.contexto || item.context,
      keywords: item.keywords || '',
      question: item.topico || item.question,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));
    
    res.json({
      success: true,
      data: mappedFaq
    });
  } catch (error) {
    console.error('Erro ao buscar FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar FAQ',
      error: error.message
    });
  }
});

// Sistema de Ponto - Endpoints seguros (não interferem nas APIs existentes)
app.post('/api/ponto/entrada', async (req, res) => {
  try {
    // Validar se usuário está autenticado (implementar conforme sua lógica)
    // const user = req.user; // Sua validação de usuário
    
    // Chamar API do Ponto Mais
    const response = await fetch('https://api.pontomais.com.br/time_clock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PONTO_MAIS_API_KEY}`,
      },
      body: JSON.stringify({
        type: 'in',
        timestamp: new Date().toISOString(),
        company_id: process.env.PONTO_MAIS_COMPANY_ID
      })
    });

    if (!response.ok) {
      throw new Error('Falha ao registrar entrada no Ponto Mais');
    }

    res.json({ success: true, message: 'Entrada registrada com sucesso!' });
  } catch (error) {
    console.error('Erro ao registrar entrada:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ponto/saida', async (req, res) => {
  try {
    // Validar se usuário está autenticado (implementar conforme sua lógica)
    // const user = req.user; // Sua validação de usuário
    
    // Chamar API do Ponto Mais
    const response = await fetch('https://api.pontomais.com.br/time_clock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PONTO_MAIS_API_KEY}`,
      },
      body: JSON.stringify({
        type: 'out',
        timestamp: new Date().toISOString(),
        company_id: process.env.PONTO_MAIS_COMPANY_ID
      })
    });

    if (!response.ok) {
      throw new Error('Falha ao registrar saída no Ponto Mais');
    }

    res.json({ success: true, message: 'Saída registrada com sucesso!' });
  } catch (error) {
    console.error('Erro ao registrar saída:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/ponto/status', async (req, res) => {
  try {
    // Validar se usuário está autenticado (implementar conforme sua lógica)
    // const user = req.user; // Sua validação de usuário
    
    // Chamar API do Ponto Mais para status
    const response = await fetch('https://api.pontomais.com.br/time_clock/current', {
      headers: {
        'Authorization': `Bearer ${process.env.PONTO_MAIS_API_KEY}`,
      }
    });

    if (!response.ok) {
      throw new Error('Falha ao buscar status no Ponto Mais');
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao buscar status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Iniciar limpeza automática de sessões
sessionService.startAutoCleanup();

/**
 * Filtra perguntas do MongoDB por keywords/sinônimos
 * @param {string} question - Pergunta do usuário
 * @param {Array} botPerguntasData - Dados do MongoDB
 * @returns {Array} Perguntas filtradas
 */
function filterByKeywords(question, botPerguntasData) {
  const questionWords = question.toLowerCase().split(/\s+/);
  const filtered = [];
  
  for (const item of botPerguntasData) {
    const palavrasChave = (item.palavrasChave || '').toLowerCase();
    const sinonimos = (item.sinonimos || '').toLowerCase();
    const pergunta = (item.pergunta || '').toLowerCase();
    
    // Combinar todos os campos de busca
    const searchText = `${palavrasChave} ${sinonimos} ${pergunta}`;
    
    // Verificar se alguma palavra da pergunta está presente
    const hasMatch = questionWords.some(word => {
      if (word.length < 2) return false; // Ignorar palavras muito curtas
      return searchText.includes(word);
    });
    
    if (hasMatch) {
      filtered.push(item);
    }
  }
  
  // Fallback: se filtro muito restritivo, retornar primeiras 50
  if (filtered.length === 0) {
    console.log('⚠️ Filtro muito restritivo, usando fallback (primeiras 50 perguntas)');
    return botPerguntasData.slice(0, 50);
  }
  
  // Limitar a 30 perguntas para não sobrecarregar a IA
  return filtered.slice(0, 30);
}

// ===== FUNÇÕES AUXILIARES =====

/**
 * Aplica filtro otimizado nos campos palavrasChave e sinonimos (PONTO 1)
 * @param {string} question - Pergunta do usuário
 * @returns {Promise<Object>} Resultados filtrados
 */
const applyOptimizedFilter = async (question) => {
  try {
    console.log('🔍 PONTO 1: Iniciando filtro com índices MongoDB...');
    const startTime = Date.now();
    
    // 1. TENTAR FILTRO COM ÍNDICES PRIMEIRO
    try {
      const client = await connectToMongo();
      const db = client.db('console_conteudo');
      
      // Filtro com índices MongoDB ($text search)
      const [filteredBotPerguntas, filteredArticles] = await Promise.all([
        filterByKeywordsWithIndexes(question, db),
        filterArticlesWithIndexes(question, db)
      ]);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⚡ PONTO 1: Filtro com índices concluído em ${duration}ms`);
      console.log(`📊 PONTO 1: Resultados - Bot_perguntas: ${filteredBotPerguntas.length}, Artigos: ${filteredArticles.length}`);
      
      return {
        botPerguntas: filteredBotPerguntas,
        articles: filteredArticles,
        duration: duration,
        method: 'indexes'
      };
      
    } catch (indexError) {
      console.warn('⚠️ PONTO 1: Erro no filtro com índices, usando fallback:', indexError.message);
      
      // 2. FALLBACK PARA FILTRO MANUAL
      let botPerguntasData = dataCache.getBotPerguntasData();
      let articlesData = dataCache.getArticlesData();
      
      // Se cache inválido, carregar do MongoDB
      if (!botPerguntasData || !articlesData) {
        console.log('⚠️ PONTO 1: Cache inválido, carregando do MongoDB...');
        
        const client = await connectToMongo();
        const db = client.db('console_conteudo');
        const botPerguntasCollection = db.collection('Bot_perguntas');
        const articlesCollection = db.collection('Artigos');
        
        [botPerguntasData, articlesData] = await Promise.all([
          botPerguntasCollection.find({}).toArray(),
          articlesCollection.find({}).toArray()
        ]);
        
        // Atualizar cache
        dataCache.updateBotPerguntas(botPerguntasData);
        dataCache.updateArticles(articlesData);
        
        console.log(`📦 PONTO 1: Cache atualizado - Bot_perguntas: ${botPerguntasData.length}, Artigos: ${articlesData.length}`);
      } else {
        console.log('✅ PONTO 1: Usando dados do cache');
      }

      // Filtro manual (fallback)
      const filteredBotPerguntas = filterByKeywordsOptimized(question, botPerguntasData);
      const filteredArticles = filterArticlesOptimized(question, articlesData);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⚡ PONTO 1: Filtro manual (fallback) concluído em ${duration}ms`);
      console.log(`📊 PONTO 1: Resultados - Bot_perguntas: ${filteredBotPerguntas.length}/${botPerguntasData.length}, Artigos: ${filteredArticles.length}/${articlesData.length}`);
      
      return {
        botPerguntas: filteredBotPerguntas,
        articles: filteredArticles,
        duration: duration,
        method: 'fallback'
      };
    }
    
  } catch (error) {
    console.error('❌ PONTO 1: Erro no filtro otimizado:', error.message);
    return {
      botPerguntas: [],
      articles: [],
      duration: 0,
      error: error.message,
      method: 'error'
    };
  }
};

/**
 * Filtro com índices MongoDB para Bot_perguntas (PONTO 1 - OTIMIZADO)
 * @param {string} question - Pergunta do usuário
 * @param {Object} db - Database MongoDB
 * @returns {Array} Perguntas filtradas
 */
const filterByKeywordsWithIndexes = async (question, db) => {
  try {
    const collection = db.collection('Bot_perguntas');
    
    // Query otimizada com $text search
    const results = await collection.find({
      $text: { $search: question }
    }, {
      score: { $meta: "textScore" }
    })
    .sort({ score: { $meta: "textScore" } })
    .limit(30)
    .toArray();
    
    // Adicionar relevanceScore baseado no score do MongoDB
    return results.map(item => ({
      ...item,
      relevanceScore: item.score || 0
    }));
    
  } catch (error) {
    console.error('❌ Erro no filtro com índices Bot_perguntas:', error.message);
    throw error;
  }
};

/**
 * Filtro com índices MongoDB para Artigos (PONTO 1 - OTIMIZADO)
 * @param {string} question - Pergunta do usuário
 * @param {Object} db - Database MongoDB
 * @returns {Array} Artigos filtrados
 */
const filterArticlesWithIndexes = async (question, db) => {
  try {
    const collection = db.collection('Artigos');
    
    // Query otimizada com $text search
    const results = await collection.find({
      $text: { $search: question }
    }, {
      score: { $meta: "textScore" }
    })
    .sort({ score: { $meta: "textScore" } })
    .limit(10)
    .toArray();
    
    // Adicionar relevanceScore baseado no score do MongoDB
    return results.map(item => ({
      ...item,
      relevanceScore: item.score || 0
    }));
    
  } catch (error) {
    console.error('❌ Erro no filtro com índices Artigos:', error.message);
    throw error;
  }
};

/**
 * Filtro otimizado por keywords/sinônimos (PONTO 1 - FALLBACK)
 * @param {string} question - Pergunta do usuário
 * @param {Array} botPerguntasData - Dados do Bot_perguntas
 * @returns {Array} Perguntas filtradas
 */
const filterByKeywordsOptimized = (question, botPerguntasData) => {
  if (!question || !botPerguntasData || botPerguntasData.length === 0) {
    return [];
  }

  const questionWords = question.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const filtered = [];

  for (const item of botPerguntasData) {
    let score = 0;
    
    // Verificar palavras-chave
    if (item.palavrasChave && Array.isArray(item.palavrasChave)) {
      for (const keyword of item.palavrasChave) {
        if (questionWords.some(word => keyword.toLowerCase().includes(word) || word.includes(keyword.toLowerCase()))) {
          score += 2; // Peso maior para palavras-chave
        }
      }
    }
    
    // Verificar sinônimos
    if (item.sinonimos && Array.isArray(item.sinonimos)) {
      for (const synonym of item.sinonimos) {
        if (questionWords.some(word => synonym.toLowerCase().includes(word) || word.includes(synonym.toLowerCase()))) {
          score += 1; // Peso menor para sinônimos
        }
      }
    }
    
    // Verificar na pergunta
    if (item.pergunta) {
      const perguntaWords = item.pergunta.toLowerCase().split(/\s+/);
      for (const word of questionWords) {
        if (perguntaWords.some(pWord => pWord.includes(word) || word.includes(pWord))) {
          score += 1;
        }
      }
    }
    
    if (score > 0) {
      filtered.push({
        ...item,
        relevanceScore: score
      });
    }
  }

  // Ordenar por score e retornar top 30
  return filtered
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 30);
};

/**
 * Filtro otimizado para artigos (PONTO 1)
 * @param {string} question - Pergunta do usuário
 * @param {Array} articlesData - Dados dos artigos
 * @returns {Array} Artigos filtrados
 */
const filterArticlesOptimized = (question, articlesData) => {
  if (!question || !articlesData || articlesData.length === 0) {
    return [];
  }

  const questionWords = question.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const filtered = [];

  for (const article of articlesData) {
    let score = 0;
    
    // Verificar no título
    if (article.title) {
      const titleWords = article.title.toLowerCase().split(/\s+/);
      for (const word of questionWords) {
        if (titleWords.some(tWord => tWord.includes(word) || word.includes(tWord))) {
          score += 2;
        }
      }
    }
    
    // Verificar no conteúdo
    if (article.content) {
      const contentWords = article.content.toLowerCase().split(/\s+/);
      for (const word of questionWords) {
        if (contentWords.some(cWord => cWord.includes(word) || word.includes(cWord))) {
          score += 1;
        }
      }
    }
    
    if (score > 0) {
      filtered.push({
        ...article,
        relevanceScore: score
      });
    }
  }

  // Ordenar por score e retornar top 10
  return filtered
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10);
};

/**
 * Gera resposta da IA otimizada (PONTO 1)
 * @param {string} question - Pergunta do usuário
 * @param {string} context - Contexto das perguntas e artigos filtrados
 * @param {Array} sessionHistory - Histórico da sessão
 * @param {string} userId - ID do usuário
 * @param {string} sessionId - ID da sessão
 * @returns {Promise<Object>} Resposta da IA
 */
const generateAIResponseOptimized = async (question, context, sessionHistory, userId, sessionId) => {
  try {
    console.log('🤖 PONTO 1: Gerando resposta da IA com contexto otimizado...');
    
    // Usar IA primária definida no handshake do Ponto 0 (TTL 3min)
    const aiStatus = aiService.statusCache.data;
    let primaryAI = 'OpenAI'; // Fallback padrão
    
    if (aiStatus && aiStatus.openai && aiStatus.openai.available) {
      primaryAI = 'OpenAI';
    } else if (aiStatus && aiStatus.gemini && aiStatus.gemini.available) {
      primaryAI = 'Gemini';
    }
    
    console.log(`🤖 PONTO 1: Usando IA primária do handshake: ${primaryAI}`);
    
    // Gerar resposta com contexto otimizado
    const aiResult = await aiService.generateResponse(
      question,
      context,
      sessionHistory,
      userId,
      userId,
      null, // searchResults
      'conversational',
      primaryAI
    );
    
    if (aiResult.success) {
      console.log(`✅ PONTO 1: Resposta da IA gerada com sucesso (${aiResult.provider})`);
      return {
        success: true,
        response: aiResult.response,
        provider: aiResult.provider,
        model: aiResult.model,
        source: 'ai'
      };
    } else {
      console.warn('⚠️ PONTO 1: IA falhou, usando fallback');
      return {
        success: false,
        response: 'Desculpe, não consegui processar sua pergunta no momento. Tente novamente.',
        provider: 'fallback',
        model: null,
        source: 'fallback'
      };
    }
    
  } catch (error) {
    console.error('❌ PONTO 1: Erro na geração da resposta da IA:', error.message);
    return {
      success: false,
      response: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.',
      provider: 'error',
      model: null,
      source: 'error',
      error: error.message
    };
  }
};

/**
 * Carrega dados do Bot_perguntas do MongoDB
 * @returns {Promise<Array>} Dados do Bot_perguntas
 */
const getBotPerguntasData = async () => {
  try {
    const client = await connectToMongo();
    const db = client.db('console_conteudo');
    const collection = db.collection('Bot_perguntas');
    const data = await collection.find({}).toArray();
    console.log(`📊 Bot_perguntas: ${data.length} perguntas carregadas do MongoDB`);
    return data;
  } catch (error) {
    console.error('❌ Erro ao carregar Bot_perguntas:', error);
    return [];
  }
};

/**
 * Carrega dados dos Artigos do MongoDB
 * @returns {Promise<Array>} Dados dos Artigos
 */
const getArticlesData = async () => {
  try {
    const client = await connectToMongo();
    const db = client.db('console_conteudo');
    const collection = db.collection('Artigos');
    const data = await collection.find({}).toArray();
    console.log(`📊 Artigos: ${data.length} artigos carregados do MongoDB`);
    return data;
  } catch (error) {
    console.error('❌ Erro ao carregar Artigos:', error);
    return [];
  }
};

// ===== API DO CHATBOT INTELIGENTE =====

/**
 * Inicialização do VeloBot - 3 Ações Essenciais
 * GET /api/chatbot/init
 */
app.get('/api/chatbot/init', async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Validação - usuário já autenticado via OAuth
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId é obrigatório'
      });
    }
    
    const cleanUserId = userId.trim();
    console.log(`🚀 VeloBot Init: Inicializando para ${cleanUserId}`);
    
    // 1. VALIDAÇÃO DA SESSÃO (memória de conversa - 10 minutos)
    const session = sessionService.getOrCreateSession(cleanUserId, null);
    console.log(`✅ VeloBot Init: Sessão criada/obtida: ${session.id}`);
    
    // 2. CARGA DO CACHE DO BOT_PERGUNTAS DO MONGODB (OTIMIZADO)
    console.log('📦 VeloBot Init: Carregando dados MongoDB no cache...');
    try {
      // Verificar se cache precisa ser recarregado
      if (dataCache.needsReload()) {
        console.log('🔄 VeloBot Init: Cache expirado, recarregando do MongoDB...');
        
        const [botPerguntasData, articlesData] = await Promise.all([
          getBotPerguntasData(),
          getArticlesData()
        ]);
        
        // Atualizar cache
        dataCache.updateBotPerguntas(botPerguntasData);
        dataCache.updateArticles(articlesData);
        
        console.log(`✅ VeloBot Init: Cache atualizado - Bot_perguntas: ${botPerguntasData.length}, Artigos: ${articlesData.length}`);
      } else {
        console.log('✅ VeloBot Init: Cache válido, usando dados existentes');
        const cacheStatus = dataCache.getCacheStatus();
        console.log(`📊 VeloBot Init: Cache status - Bot_perguntas: ${cacheStatus.botPerguntas.count} registros, Artigos: ${cacheStatus.articles.count} registros`);
      }
    } catch (error) {
      console.error('❌ VeloBot Init: Erro ao carregar dados no cache:', error.message);
    }
    
    // 3. HANDSHAKE INTELIGENTE PARA DETERMINAR IA PRIMÁRIA (OTIMIZADO)
    const aiStatus = await aiService.testConnectionIntelligent();
    let primaryAI = null;
    let fallbackAI = null;
    
    if (aiStatus.openai.available) {
      // Cenário 1: OpenAI OK → OpenAI primária + Gemini secundária + pesquisa convencional fallback
      primaryAI = 'OpenAI';
      fallbackAI = aiStatus.gemini.available ? 'Gemini' : null;
      console.log(`✅ VeloBot Init: Cenário 1 - OpenAI primária, Gemini secundária`);
    } else if (aiStatus.gemini.available) {
      // Cenário 2: OpenAI NULL + Gemini OK → Gemini primária + OpenAI secundária + pesquisa convencional fallback
      primaryAI = 'Gemini';
      fallbackAI = 'OpenAI'; // Sempre OpenAI como secundária, mesmo se não disponível
      console.log(`✅ VeloBot Init: Cenário 2 - Gemini primária, OpenAI secundária`);
    } else {
      // Cenário 3: OpenAI NULL + Gemini NULL → Mantém primeira opção + pesquisa convencional fallback
      primaryAI = 'OpenAI'; // Mantém primeira opção
      fallbackAI = null;
      console.log(`⚠️ VeloBot Init: Cenário 3 - Nenhuma IA disponível, usando pesquisa convencional`);
    }
    
    console.log(`✅ VeloBot Init: IA primária: ${primaryAI}, Fallback: ${fallbackAI}`);
    
    // RESPOSTA COMPLETA
    const response = {
      success: true,
      sessionId: session.id,
      aiStatus: {
        primaryAI: primaryAI,
        fallbackAI: fallbackAI,
        anyAvailable: aiStatus.openai.available || aiStatus.gemini.available
      },
      cacheStatus: {
        botPerguntas: dataCache.getBotPerguntasData()?.length || 0,
        articles: dataCache.getArticlesData()?.length || 0
      },
      message: 'VeloBot inicializado - memória de conversa ativa por 10 minutos',
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ VeloBot Init: Inicialização concluída para ${cleanUserId}`);
    res.json(response);
    
  } catch (error) {
    console.error('❌ VeloBot Init Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro na inicialização do VeloBot',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Clarification Direto - Resposta sem re-análise da IA
 * POST /api/chatbot/clarification
 */
app.post('/api/chatbot/clarification', async (req, res) => {
  try {
    const { question, userId, sessionId } = req.body;
    
    if (!question || !userId) {
      return res.status(400).json({
        success: false,
        error: 'question e userId são obrigatórios'
      });
    }
    
    const cleanUserId = userId.trim();
    const cleanSessionId = sessionId ? sessionId.trim() : null;
    const cleanQuestion = question.trim();
    
    console.log(`🔍 Clarification Direto: Buscando resposta para "${cleanQuestion}"`);
    
    // 1. BUSCAR RESPOSTA DIRETA NO CACHE
    let botPerguntasData = dataCache.getBotPerguntasData();
    
    // Se cache inválido, carregar do MongoDB
    if (!botPerguntasData) {
      console.log('⚠️ Clarification Direto: Cache inválido, carregando do MongoDB...');
      botPerguntasData = await getBotPerguntasData();
      dataCache.updateBotPerguntas(botPerguntasData);
    }
    const directMatch = botPerguntasData.find(item => 
      item.pergunta && item.pergunta.toLowerCase().includes(cleanQuestion.toLowerCase())
    );
    
    if (directMatch) {
      console.log(`✅ Clarification Direto: Resposta encontrada no MongoDB`);
      
      // 2. LOG DA ATIVIDADE
      await userActivityLogger.logQuestion(cleanUserId, cleanQuestion, cleanSessionId);
      
      // 3. BUSCAR ARTIGOS RELACIONADOS
      let articlesData = dataCache.getArticlesData();
      if (!articlesData) {
        console.log('⚠️ Clarification Direto: Cache de artigos inválido, carregando do MongoDB...');
        articlesData = await getArticlesData();
        dataCache.updateArticles(articlesData);
      }
      
      // Filtrar artigos por palavras-chave da pergunta
      const filteredArticles = filterByKeywords(cleanQuestion, articlesData);
      const relatedArticles = filteredArticles.slice(0, 3).map(article => ({
        id: article._id,
        title: article.artigo_titulo,
        content: article.artigo_conteudo.substring(0, 150) + '...',
        tag: article.tag,
        relevanceScore: 0.8 // Score padrão para artigos relacionados
      }));
      
      // 4. RESPOSTA DIRETA COM ARTIGOS
      const response = {
        success: true,
        response: parseTextContent(responseFormatter.formatCacheResponse(directMatch.resposta || 'Resposta não encontrada', 'clarification')),
        source: 'Bot_perguntas',
        sourceId: directMatch._id,
        sourceRow: directMatch.pergunta,
        timestamp: new Date().toISOString(),
        sessionId: cleanSessionId,
        tabulacao: directMatch.tabulacao || null,
        articles: relatedArticles
      };
      
      console.log(`✅ Clarification Direto: Resposta com ${relatedArticles.length} artigos enviada para ${cleanUserId}`);
      return res.json(response);
    }
    
    // 4. FALLBACK: BUSCA TRADICIONAL
    console.log(`⚠️ Clarification Direto: Nenhuma correspondência direta, usando busca tradicional`);
    
    const searchResults = await searchService.performHybridSearch(cleanQuestion, botPerguntasData, []);
    
    if (searchResults.botPergunta) {
      // Buscar artigos relacionados também no fallback
      let articlesData = dataCache.getArticlesData();
      if (!articlesData) {
        articlesData = await getArticlesData();
        dataCache.updateArticles(articlesData);
      }
      
      const filteredArticles = filterByKeywords(cleanQuestion, articlesData);
      const relatedArticles = filteredArticles.slice(0, 3).map(article => ({
        id: article._id,
        title: article.artigo_titulo,
        content: article.artigo_conteudo.substring(0, 150) + '...',
        tag: article.tag,
        relevanceScore: 0.8
      }));
      
      const response = {
        success: true,
        response: parseTextContent(responseFormatter.formatCacheResponse(searchResults.botPergunta.resposta || 'Resposta não encontrada', 'clarification_fallback')),
        source: 'Bot_perguntas',
        sourceId: searchResults.botPergunta._id,
        sourceRow: searchResults.botPergunta.pergunta,
        timestamp: new Date().toISOString(),
        sessionId: cleanSessionId,
        tabulacao: searchResults.botPergunta.tabulacao || null,
        articles: relatedArticles
      };
      
      console.log(`✅ Clarification Direto: Resposta via busca tradicional com ${relatedArticles.length} artigos para ${cleanUserId}`);
      return res.json(response);
    }
    
    // 5. RESPOSTA PADRÃO
    const response = {
      success: true,
      response: responseFormatter.formatFallbackResponse('Não consegui encontrar uma resposta precisa para sua pergunta. Pode fornecer mais detalhes ou reformular sua pergunta para que eu possa ajudá-lo melhor?'),
      source: 'fallback',
      timestamp: new Date().toISOString(),
      sessionId: cleanSessionId
    };
    
    console.log(`⚠️ Clarification Direto: Resposta padrão para ${cleanUserId}`);
    return res.json(response);
    
  } catch (error) {
    console.error('❌ Clarification Direto Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro no clarification direto',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Limpar Cache das IAs - Força novo teste
 * POST /api/chatbot/clear-cache
 */
app.post('/api/chatbot/clear-cache', async (req, res) => {
  try {
    console.log('🧹 Limpando cache das IAs...');
    
    // Limpar cache do aiService
    aiService.statusCache = {
      data: null,
      timestamp: null,
      ttl: 5 * 60 * 1000 // 5 minutos em ms
    };
    
    // Forçar novo teste
    const aiStatus = await aiService.testConnection();
    
    res.json({
      success: true,
      message: 'Cache limpo e IAs testadas',
      aiStatus: aiStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao limpar cache das IAs',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Status do Cache de Dados
 * GET /api/chatbot/cache-status
 */
app.get('/api/chatbot/cache-status', async (req, res) => {
  try {
    const cacheStatus = dataCache.getCacheStatus();
    
    res.json({
      success: true,
      cacheStatus: cacheStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Cache Status Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter status do cache',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health Check das IAs - Determina IA primária
 * GET /api/chatbot/health-check
 */
app.get('/api/chatbot/health-check', async (req, res) => {
  try {
    console.log('🔍 Health Check: Testando disponibilidade das IAs...');
    
    const aiStatus = await aiService.testConnection();
    
    // Determinar IA primária baseada na disponibilidade
    let primaryAI = null;
    let fallbackAI = null;
    
    if (aiStatus.openai.available) {
      primaryAI = 'OpenAI';
      fallbackAI = aiStatus.gemini.available ? 'Gemini' : null;
    } else if (aiStatus.gemini.available) {
      primaryAI = 'Gemini';
      fallbackAI = null;
    }
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      aiStatus: aiStatus,
      primaryAI: primaryAI,
      fallbackAI: fallbackAI,
      anyAvailable: aiStatus.openai.available || aiStatus.gemini.available
    };
    
    console.log(`✅ Health Check: IA primária: ${primaryAI}, Fallback: ${fallbackAI}`);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Health Check Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar status das IAs',
      timestamp: new Date().toISOString()
    });
  }
});

// API de Chat Inteligente - PONTO 1 OTIMIZADO (Fundido com Ponto 2)
app.post('/api/chatbot/ask', async (req, res) => {
  try {
    const { question, userId, sessionId } = req.body;

    // Validação simplificada
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Pergunta é obrigatória'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId é obrigatório'
      });
    }

    const cleanQuestion = question.trim();
    const cleanUserId = userId.trim();
    const cleanSessionId = sessionId || null;

    console.log(`🤖 PONTO 1: Nova pergunta de ${cleanUserId}: "${cleanQuestion}"`);

    // Obter sessão para memória de conversa (10 minutos)
    const session = sessionService.getOrCreateSession(cleanUserId, cleanSessionId);
    
    // Adicionar pergunta à sessão (memória de conversa)
    sessionService.addMessage(session.id, 'user', cleanQuestion, {
      timestamp: new Date(),
      userId: cleanUserId
    });

    // PONTO 1: FILTRO OTIMIZADO + LOG PARALELO
    console.log('🔍 PONTO 1: Aplicando filtro nos campos palavrasChave e sinonimos...');
    
    // Executar filtro e log em paralelo
    const [filteredResults, logResult] = await Promise.allSettled([
      // Filtro otimizado nos campos palavrasChave e sinonimos
      applyOptimizedFilter(cleanQuestion),
      // Log da atividade (MongoDB) em paralelo
      userActivityLogger.logQuestion(cleanUserId, cleanQuestion, session.id)
    ]);

    // Processar resultados do filtro
    let botPerguntasData = [];
    let articlesData = [];
    
    if (filteredResults.status === 'fulfilled') {
      botPerguntasData = filteredResults.value.botPerguntas || [];
      articlesData = filteredResults.value.articles || [];
      console.log(`✅ PONTO 1: Filtro aplicado - ${botPerguntasData.length} perguntas relevantes, ${articlesData.length} artigos`);
    } else {
      console.error('❌ PONTO 1: Erro no filtro:', filteredResults.reason);
    }

    // Processar resultado do log
    if (logResult.status === 'fulfilled') {
      console.log('✅ PONTO 1: Log enviado ao MongoDB em paralelo');
    } else {
      console.warn('⚠️ PONTO 1: Erro no log MongoDB:', logResult.reason);
    }

    // PONTO 1: ENVIO PARA IA COM CONTEXTO RECENTE E PROMPT
    console.log('🤖 PONTO 1: Enviando resultados do filtro, contexto recente e prompt para IA...');
    
    // Obter histórico da sessão para contexto
    const sessionHistory = sessionService.getSessionHistory(session.id);
    
    // Construir contexto otimizado
    let context = '';
    
    // Adicionar contexto das perguntas filtradas
    if (botPerguntasData.length > 0) {
      context += 'Perguntas relevantes encontradas:\n';
      botPerguntasData.slice(0, 5).forEach((item, index) => {
        context += `${index + 1}. ${item.pergunta}\n   Resposta: ${item.resposta}\n\n`;
      });
    }
    
    // Adicionar contexto dos artigos filtrados
    if (articlesData.length > 0) {
      context += 'Artigos relacionados:\n';
      articlesData.slice(0, 3).forEach((article, index) => {
        context += `${index + 1}. ${article.artigo_titulo}: ${article.artigo_conteudo.substring(0, 200)}...\n\n`;
      });
    }
    
    // PONTO 3: ANÁLISE DA IA PARA DETERMINAR AÇÃO
    console.log('🤖 PONTO 3: IA analisando se há respostas válidas...');
    
    let aiAnalysis = null;
    let needsClarification = false;
    let clarificationMenu = null;
    
    // SEMPRE usar IA para analisar as opções disponíveis
    if (botPerguntasData.length > 0) {
      try {
        // Usar IA primária definida no handshake do Ponto 0 (TTL 3min)
        const aiStatus = aiService.statusCache.data;
        let primaryAI = 'OpenAI'; // Fallback padrão
        
        if (aiStatus && aiStatus.openai && aiStatus.openai.available) {
          primaryAI = 'OpenAI';
        } else if (aiStatus && aiStatus.gemini && aiStatus.gemini.available) {
          primaryAI = 'Gemini';
        }
        
        console.log(`🤖 PONTO 3: Usando IA primária do handshake: ${primaryAI}`);
        aiAnalysis = await aiService.analyzeQuestionWithAI(cleanQuestion, botPerguntasData, sessionHistory, primaryAI);
        console.log(`✅ PONTO 3: IA analisou ${botPerguntasData.length} opções`);
        
        if (aiAnalysis.needsClarification && aiAnalysis.relevantOptions.length > 1) {
          // CENÁRIO 2: IA considera múltiplas respostas cabíveis - clarification
          needsClarification = true;
          clarificationMenu = searchService.generateClarificationMenuFromAI(aiAnalysis.relevantOptions, cleanQuestion);
          console.log(`🔍 PONTO 3: Clarification necessário - ${aiAnalysis.relevantOptions.length} opções relevantes`);
        } else if (aiAnalysis.relevantOptions.length === 0) {
          // CENÁRIO 3: IA não considera que nenhuma se aplique
          console.log('❌ PONTO 3: IA determinou que nenhuma resposta se aplica');
        } else {
          // CENÁRIO 1: IA considera 1 resposta perfeita
          console.log('✅ PONTO 3: IA determinou 1 resposta perfeita');
        }
      } catch (error) {
        console.warn('⚠️ PONTO 3: Erro na análise da IA, continuando sem análise:', error.message);
        aiAnalysis = { relevantOptions: [], needsClarification: false, hasData: false };
      }
    } else {
      // Nenhuma opção disponível - continuar para fallback da IA
      console.log('⚠️ PONTO 3: Nenhuma opção do Bot_perguntas disponível - continuando para fallback da IA');
      aiAnalysis = { relevantOptions: [], needsClarification: false, hasData: false };
    }
    
    // CENÁRIO 2: Se precisa de esclarecimento, retornar menu
    if (needsClarification && clarificationMenu) {
      console.log('🔍 PONTO 3: Retornando menu de esclarecimento');
      
      const responseData = {
        success: true,
        messageId: `clarification_${Date.now()}`,
        response: clarificationMenu.resposta,
        source: 'clarification',
        aiProvider: null,
        sessionId: session.id,
        clarificationMenu: {
          options: clarificationMenu.options,
          question: cleanQuestion
        },
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ PONTO 3: Menu de esclarecimento enviado para ${cleanUserId}`);
      return res.json(responseData);
    }
    
    // CENÁRIO 3: Se IA não considera nenhuma resposta aplicável (apenas quando há dados do Bot_perguntas)
    if (aiAnalysis && aiAnalysis.relevantOptions.length === 0 && aiAnalysis.hasData !== false) {
      console.log('❌ PONTO 3: Informando usuário que nenhuma resposta se aplica');
      
      const responseData = {
        success: true,
        messageId: `no_match_${Date.now()}`,
        response: 'Não consegui encontrar uma resposta que se aplique exatamente à sua pergunta. Pode reformular ou fornecer mais detalhes para que eu possa ajudá-lo melhor?',
        source: 'no_match',
        aiProvider: null,
        sessionId: session.id,
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ PONTO 3: Resposta "nenhuma se aplica" enviada para ${cleanUserId}`);
      return res.json(responseData);
    }
    
    // CENÁRIO 1: IA considera 1 resposta perfeita - continuar com resposta normal
    console.log('🤖 PONTO 3: Gerando resposta da IA para resposta perfeita...');
    
    // Enviar para IA (sem log)
    const aiResponse = await generateAIResponseOptimized(cleanQuestion, context, sessionHistory, cleanUserId, session.id);

    // Processar resposta da IA
    let finalResponse = '';
    let responseSource = 'fallback';
    let aiProvider = null;
    
    if (aiResponse.success) {
      // Aplicar formatação da resposta da IA
      finalResponse = parseTextContent(responseFormatter.formatAIResponse(aiResponse.response, aiResponse.provider));
      responseSource = aiResponse.source;
      aiProvider = aiResponse.provider;
      console.log(`✅ PONTO 1: Resposta da IA processada e formatada com sucesso (${aiProvider})`);
    } else {
      // Fallback para resposta direta do Bot_perguntas se IA falhar
      if (botPerguntasData.length > 0) {
        // Aplicar formatação da resposta do Bot_perguntas
        finalResponse = parseTextContent(responseFormatter.formatCacheResponse(botPerguntasData[0].resposta || 'Resposta encontrada na base de conhecimento.', 'bot_perguntas'));
        responseSource = 'bot_perguntas';
        console.log('✅ PONTO 1: Usando resposta direta do Bot_perguntas formatada (fallback)');
      } else {
        if (shouldUseLocalFallback()) {
          // Aplicar formatação do fallback local
          finalResponse = parseTextContent(responseFormatter.formatFallbackResponse(FALLBACK_FOR_LOCAL_TESTING.resposta));
          responseSource = 'local_fallback';
          console.log('🧪 PONTO 1: Usando fallback formatado para teste local');
        } else {
          // Aplicar formatação da resposta padrão
          finalResponse = parseTextContent(responseFormatter.formatFallbackResponse('Não consegui encontrar uma resposta precisa para sua pergunta. Pode fornecer mais detalhes?'));
          responseSource = 'no_results';
          console.log('❌ PONTO 1: Nenhuma resposta encontrada - usando fallback formatado');
        }
      }
    }

    // Adicionar resposta à sessão
    const messageId = sessionService.addMessage(session.id, 'bot', finalResponse, {
      timestamp: new Date(),
      source: responseSource,
      aiProvider: aiProvider,
      botPerguntaUsed: botPerguntasData.length > 0 ? botPerguntasData[0]._id : null,
      articlesUsed: articlesData.slice(0, 3).map(a => a._id)
    });

    // Preparar resposta final otimizada
    const responseData = {
      success: true,
      messageId: messageId,
      response: finalResponse,
      source: responseSource,
      aiProvider: aiProvider,
      sessionId: session.id,
      tabulacao: shouldUseLocalFallback() ? FALLBACK_FOR_LOCAL_TESTING.tabulacao : (botPerguntasData.length > 0 ? botPerguntasData[0].tabulacao : null),
      articles: articlesData.slice(0, 3).map(article => ({
        id: article._id,
        _id: article._id,
        title: article.artigo_titulo,
        content: formatArticleContent(article.artigo_conteudo),  // COMPLETO E FORMATADO
        tag: article.tag || null,
        category: article.categoria_titulo || null,
        author: article.autor || null,
        createdAt: article.createdAt || null,
        relevanceScore: article.relevanceScore
      })),
      botPerguntaUsed: botPerguntasData.length > 0 ? {
        id: botPerguntasData[0]._id,
        question: botPerguntasData[0].pergunta,
        answer: botPerguntasData[0].resposta,
        relevanceScore: botPerguntasData[0].relevanceScore
      } : null,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ PONTO 1: Resposta final enviada para ${cleanUserId} (${responseSource}${aiProvider ? ` - ${aiProvider}` : ''})`);
    
    res.json(responseData);

  } catch (error) {
    console.error('❌ Chat V2 Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// API de Feedback - MongoDB apenas
app.post('/api/chatbot/feedback', async (req, res) => {
  try {
    const { messageId, feedbackType, comment, userId, sessionId, question, answer, source, aiProvider, responseSource } = req.body;

    // Validação básica
    if (!messageId || !feedbackType) {
      return res.status(400).json({
        success: false,
        error: 'messageId e feedbackType são obrigatórios'
      });
    }

    if (!['positive', 'negative'].includes(feedbackType)) {
      return res.status(400).json({
        success: false,
        error: 'feedbackType deve ser "positive" ou "negative"'
      });
    }

    const cleanUserId = userId || 'anonymous';
    const cleanSessionId = sessionId || null;

    console.log(`📝 Feedback: Novo feedback de ${cleanUserId} - ${feedbackType} para mensagem ${messageId}`);


    // Registrar feedback no MongoDB usando botFeedbackService
    const feedbackSuccess = await botFeedbackService.logFeedback({
      colaboradorNome: cleanUserId,
      messageId: messageId,
      feedbackType: feedbackType,
      comment: comment || '',
      question: question || '',
      answer: answer || '',
      sessionId: cleanSessionId,
      source: source || 'chatbot',
      aiProvider: aiProvider || null,
      responseSource: responseSource || 'bot_perguntas'
    });

    if (!feedbackSuccess) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao registrar feedback no banco de dados'
      });
    }

    // Log da atividade
    await userActivityLogger.logFeedback(cleanUserId, feedbackType, messageId, cleanSessionId, {
      hasComment: !!comment,
      commentLength: comment ? comment.length : 0
    });

    // Resposta de sucesso
    const responseData = {
      success: true,
      data: {
        messageId: messageId,
        feedbackType: feedbackType,
        timestamp: new Date().toISOString(),
        message: feedbackType === 'positive' ? 
          'Obrigado pelo seu feedback positivo!' : 
          'Obrigado pelo seu feedback. Vamos melhorar com base na sua sugestão.'
      }
    };

    console.log(`✅ Feedback: Feedback registrado com sucesso para ${cleanUserId}`);
    
    res.json(responseData);

  } catch (error) {
    console.error('❌ Feedback Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// API de Log de Atividade
app.post('/api/chatbot/activity', async (req, res) => {
  try {
    const { action, details, userId, sessionId, source } = req.body;

    // Validação básica
    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'action é obrigatório'
      });
    }

    const cleanUserId = userId || 'anonymous';
    const cleanSessionId = sessionId || null;
    const cleanSource = source || 'chatbot';

    console.log(`📊 Activity: Nova atividade de ${cleanUserId} - ${action}`);

    // Preparar dados da atividade seguindo schema user_activity
    const activityData = {
      colaboradorNome: cleanUserId,
      action: action,
      details: details || {},
      sessionId: cleanSessionId,
      source: cleanSource
    };

    // Registrar atividade no MongoDB
    const activitySuccess = await userActivityLogger.logActivity(activityData);

    if (!activitySuccess) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao registrar atividade no banco de dados'
      });
    }

    // Resposta de sucesso
    const responseData = {
      success: true,
      data: {
        action: action,
        userId: cleanUserId,
        sessionId: cleanSessionId,
        timestamp: new Date().toISOString(),
        message: 'Atividade registrada com sucesso'
      }
    };

    console.log(`✅ Activity: Atividade registrada com sucesso para ${cleanUserId}`);
    
    res.json(responseData);

  } catch (error) {
    console.error('❌ Activity Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// API do Botão IA - Resposta Conversacional
app.post('/api/chatbot/ai-response', async (req, res) => {
  try {
    const { question, botPerguntaResponse, articleContent, userId, sessionId, formatType } = req.body;

    // Debug: Log dos dados recebidos
    console.log('🔍 AI Response Debug - Dados recebidos:', {
      question: question ? 'presente' : 'ausente',
      botPerguntaResponse: botPerguntaResponse ? 'presente' : 'ausente',
      articleContent: articleContent ? 'presente' : 'ausente',
      userId: userId || 'não fornecido',
      sessionId: sessionId || 'não fornecido',
      formatType: formatType || 'conversational'
    });

    if (!question || !botPerguntaResponse) {
      console.log('❌ AI Response: Validação falhou - question:', !!question, 'botPerguntaResponse:', !!botPerguntaResponse);
      return res.status(400).json({
        success: false,
        error: 'Pergunta e resposta do Bot_perguntas são obrigatórias'
      });
    }

    const cleanUserId = userId || 'anonymous';
    const cleanSessionId = sessionId || null;

    console.log(`🤖 AI Button: Nova solicitação de ${cleanUserId} para resposta conversacional`);

    // Verificar se IA está configurada
    if (!aiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Serviço de IA não configurado',
        response: 'Desculpe, o serviço de IA não está disponível no momento.'
      });
    }

    // Construir contexto para a IA
    let context = `Resposta do Bot_perguntas: ${botPerguntaResponse}`;
    
    if (articleContent) {
      context += `\n\nConteúdo do artigo relacionado: ${articleContent}`;
    }

    // Obter ou criar sessão se disponível
    const session = cleanSessionId ? sessionService.getOrCreateSession(cleanUserId, cleanSessionId) : null;
    const sessionHistory = session ? sessionService.getSessionHistory(session.id) : [];

    // Determinar IA primária baseada na disponibilidade (mesma lógica da inicialização)
    const aiStatus = await aiService.testConnection();
    let primaryAI = null;
    
    if (aiStatus.openai.available) {
      // Cenário 1: OpenAI OK → OpenAI primária + Gemini secundária + pesquisa convencional fallback
      primaryAI = 'OpenAI';
    } else if (aiStatus.gemini.available) {
      // Cenário 2: OpenAI NULL + Gemini OK → Gemini primária + OpenAI secundária + pesquisa convencional fallback
      primaryAI = 'Gemini';
    } else {
      // Cenário 3: OpenAI NULL + Gemini NULL → Mantém primeira opção + pesquisa convencional fallback
      primaryAI = 'OpenAI';
    }
    
    // Gerar resposta conversacional da IA
    const aiResult = await aiService.generateResponse(
      question,
      context,
      sessionHistory,
      cleanUserId,
      cleanUserId,
      null, // searchResults
      formatType || 'conversational',
      primaryAI
    );

    if (!aiResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao gerar resposta da IA',
        response: aiResult.response
      });
    }

    // Adicionar mensagem à sessão
    if (session) {
      sessionService.addMessage(session.id, 'bot', aiResult.response, {
        timestamp: new Date(),
        source: 'ai_button',
        aiProvider: aiResult.provider,
        botPerguntaUsed: null,
        articlesUsed: [],
        sitesUsed: false
      });
    }

    // Log da atividade do botão AI
    await userActivityLogger.logAIButtonUsage(cleanUserId, formatType || 'conversational', cleanSessionId);

    // Resposta de sucesso
    const responseData = {
      success: true,
      response: parseTextContent(responseFormatter.formatAIResponse(aiResult.response, aiResult.provider)),
      aiProvider: aiResult.provider,
      model: aiResult.model,
      source: 'ai_button',
      timestamp: new Date().toISOString(),
      sessionId: cleanSessionId
    };

    console.log(`✅ AI Button: Resposta conversacional gerada por ${aiResult.provider} para ${cleanUserId}`);
    
    res.json(responseData);

  } catch (error) {
    console.error('❌ AI Button Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      response: 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ===== API DE SESSÕES DE LOGIN/LOGOUT =====

// POST /api/auth/session/login
app.post('/api/auth/session/login', async (req, res) => {
  try {
    const { colaboradorNome, userEmail } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validação
    if (!colaboradorNome || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'colaboradorNome e userEmail são obrigatórios'
      });
    }

    console.log(`🔐 Login: Novo login de ${colaboradorNome} (${userEmail})`);

    // Registrar login
    const result = await userSessionLogger.logLogin(
      colaboradorNome,
      userEmail,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao registrar login',
        details: result.error
      });
    }

    // Resposta de sucesso
    res.json({
      success: true,
      sessionId: result.sessionId,
      message: 'Login registrado com sucesso'
    });

  } catch (error) {
    console.error('❌ Login Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/auth/session/logout
app.post('/api/auth/session/logout', async (req, res) => {
  try {
    const { sessionId } = req.body;

    // Validação
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId é obrigatório'
      });
    }

    console.log(`🚪 Logout: Logout da sessão ${sessionId}`);

    // Registrar logout
    const result = await userSessionLogger.logLogout(sessionId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Resposta de sucesso
    res.json({
      success: true,
      duration: result.duration,
      colaboradorNome: result.colaboradorNome,
      message: 'Logout registrado com sucesso'
    });

  } catch (error) {
    console.error('❌ Logout Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ===== API DE SESSÃO - HEARTBEAT E REATIVAÇÃO =====
console.log('🔧 Registrando endpoints de sessão (heartbeat, reactivate, validate)...');

// POST /api/auth/session/heartbeat
app.post('/api/auth/session/heartbeat', async (req, res) => {
  try {
    const { sessionId } = req.body;

    // Validação
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId é obrigatório'
      });
    }

    // Atualizar sessão (heartbeat)
    const result = await userSessionLogger.updateSession(sessionId);

    if (result.expired) {
      return res.status(401).json({
        success: false,
        expired: true,
        error: 'Sessão expirada (4 horas) - novo login necessário'
      });
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        expired: false,
        error: result.error || 'Erro ao atualizar sessão'
      });
    }

    res.json({
      success: true,
      message: 'Heartbeat recebido'
    });

  } catch (error) {
    console.error('❌ Heartbeat Error:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

console.log('✅ Endpoint POST /api/auth/session/heartbeat registrado');

// POST /api/auth/session/reactivate
app.post('/api/auth/session/reactivate', async (req, res) => {
  try {
    const { userEmail } = req.body;

    // Validação
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'userEmail é obrigatório'
      });
    }

    console.log(`🔄 Reativação: Tentando reativar sessão de ${userEmail}`);

    // Reativar sessão
    const result = await userSessionLogger.reactivateSession(userEmail);

    if (result.expired) {
      return res.status(401).json({
        success: false,
        expired: true,
        error: 'Sessão expirada (4 horas) - novo login necessário'
      });
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        expired: false,
        error: result.error || 'Erro ao reativar sessão'
      });
    }

    res.json({
      success: true,
      sessionId: result.sessionId,
      message: 'Sessão reativada com sucesso'
    });

  } catch (error) {
    console.error('❌ Reactivate Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/auth/session/validate
app.get('/api/auth/session/validate/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId é obrigatório'
      });
    }

    const result = await userSessionLogger.validateSession(sessionId);

    res.json({
      success: true,
      valid: result.valid,
      expired: result.expired,
      session: result.session ? {
        sessionId: result.session.sessionId,
        userEmail: result.session.userEmail,
        colaboradorNome: result.session.colaboradorNome,
        isActive: result.session.isActive,
        loginTimestamp: result.session.loginTimestamp
      } : null
    });

  } catch (error) {
    console.error('❌ Validate Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

console.log('✅ Endpoint GET /api/auth/session/validate/:sessionId registrado');
console.log('✅ Todos os endpoints de sessão registrados com sucesso!');
console.log('📋 Endpoints de sessão disponíveis:');
console.log('   - POST /api/auth/session/heartbeat');
console.log('   - POST /api/auth/session/reactivate');
console.log('   - GET /api/auth/session/validate/:sessionId');

// ===== API VELONEWS - ACKNOWLEDGE =====

// POST /api/velo-news/:id/acknowledge
app.post('/api/velo-news/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;

    // Validação
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId é obrigatório'
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID da notícia é obrigatório'
      });
    }

    console.log(`📝 Acknowledge: Usuário ${userName} (${userId}) confirmou leitura da notícia ${id}`);

    // Conectar ao MongoDB
    if (!client) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB não configurado'
      });
    }

    await connectToMongo();
    const db = client.db('console_conteudo');
    const collection = db.collection('velonews_acknowledgments');

    // Verificar se já existe acknowledge para esta notícia e usuário
    const existingAck = await collection.findOne({
      newsId: new ObjectId(id),
      userEmail: userId
    });

    if (existingAck) {
      return res.status(409).json({
        success: false,
        error: 'Notícia já foi confirmada por este usuário'
      });
    }

    // Criar registro de acknowledge
    const acknowledgeData = {
      newsId: new ObjectId(id),
      colaboradorNome: userName || 'Usuário',
      userEmail: userId,
      acknowledgedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(acknowledgeData);

    if (result.insertedId) {
      console.log(`✅ Acknowledge registrado: ${result.insertedId}`);
      
      res.json({
        success: true,
        message: 'Leitura confirmada com sucesso',
        acknowledgeId: result.insertedId
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro ao registrar acknowledge'
      });
    }

  } catch (error) {
    console.error('❌ Acknowledge Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Iniciar servidor
console.log('🔄 Iniciando servidor...');
console.log(`📍 Porta configurada: ${PORT}`);
console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
console.log(`📁 Diretório de trabalho: ${process.cwd()}`);
console.log(`📁 Arquivos no diretório:`, require('fs').readdirSync('.'));

console.log('🚀 Tentando iniciar servidor na porta', PORT);

const server = app.listen(PORT, '0.0.0.0', (error) => {
  if (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
  
  console.log(`✅ Servidor backend rodando na porta ${PORT}`);
  console.log(`🌐 Acessível em: http://localhost:${PORT}`);
  console.log(`🌐 Acessível na rede local: http://0.0.0.0:${PORT}`);
  console.log(`📡 Endpoint principal: http://localhost:${PORT}/api/data`);
  console.log(`📡 Teste a API em: http://localhost:${PORT}/api/test`);
  
  // Tentar conectar ao MongoDB em background (não bloqueia o startup)
  connectToMongo().catch(error => {
    console.warn('⚠️ MongoDB: Falha na conexão inicial, tentando reconectar...', error.message);
  });
  
  // Inicializar cache de status dos módulos
  setTimeout(async () => {
    try {
      console.log('🚀 Inicializando cache de status dos módulos...');
      await getModuleStatus();
      console.log('✅ Cache de status inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar cache de status:', error);
    }
  }, 2000); // Aguardar 2 segundos para MongoDB conectar
});

// Log de erro se o servidor não conseguir iniciar
server.on('error', (error) => {
  console.error('❌ Erro no servidor:', error);
  process.exit(1);
});

server.on('listening', () => {
  console.log('🎉 Servidor está escutando na porta', PORT);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
  // Não encerrar o processo, apenas logar o erro
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
  // Não encerrar o processo, apenas logar o erro
});

// ========================================
// SISTEMA DE CONTROLE DE STATUS DOS MÓDULOS
// ========================================

// Cache do status dos módulos (atualizado do MongoDB)
let moduleStatusCache = {
  'credito-trabalhador': 'on',
  'credito-pessoal': 'on',
  'antecipacao': 'off',
  'pagamento-antecipado': 'on',
  'modulo-irpf': 'off',
  'seguro-cred': 'on',
  'seguro-cel': 'on'
};

// Timestamp do último cache para controle de validade
let lastCacheUpdate = null;
const CACHE_VALIDITY_MS = 3 * 60 * 1000; // 3 minutos

// Forçar atualização imediata do cache na inicialização
console.log('🔄 Forçando atualização inicial do cache de status...');

/**
 * Busca o status mais recente dos módulos no MongoDB
 * @returns {Promise<Object>} Status dos módulos
 */
const fetchModuleStatusFromMongoDB = async () => {
  try {
    console.log('🔍 fetchModuleStatusFromMongoDB: Iniciando busca...');
    
    if (!client) {
      console.warn('⚠️ MongoDB client não configurado - usando cache local');
      return moduleStatusCache;
    }

    console.log('🔍 Conectando ao MongoDB...');
    await connectToMongo();
    const db = client.db('console_config');
    const collection = db.collection('module_status');

    console.log('🔍 Buscando documento mais recente na collection module_status...');
    // Buscar o documento mais recente (maior createdAt)
    const latestStatus = await collection
      .findOne({}, { sort: { createdAt: -1 } });

    console.log('🔍 Documento encontrado no MongoDB:', latestStatus);

    if (!latestStatus) {
      console.warn('⚠️ Nenhum status encontrado no MongoDB - usando cache local');
      return moduleStatusCache;
    }

    // Mapear campos do MongoDB para o formato esperado pelo frontend
    const mappedStatus = {
      'credito-trabalhador': latestStatus._trabalhador || 'on',
      'credito-pessoal': latestStatus._pessoal || 'on',
      'antecipacao': latestStatus._antecipacao || 'revisao',
      'pagamento-antecipado': latestStatus._pgtoAntecip || 'off',
      'modulo-irpf': latestStatus._irpf || 'on',
      'seguro-cred': latestStatus._seguroCred || 'on',
      'seguro-cel': latestStatus._seguroCel || 'on'
    };

    console.log('📊 Status dos módulos mapeado do MongoDB:', mappedStatus);
    console.log('📊 Campos originais do MongoDB:', {
      _trabalhador: latestStatus._trabalhador,
      _pessoal: latestStatus._pessoal,
      _antecipacao: latestStatus._antecipacao,
      _pgtoAntecip: latestStatus._pgtoAntecip,
      _irpf: latestStatus._irpf,
      _seguroCred: latestStatus._seguroCred,
      _seguroCel: latestStatus._seguroCel
    });
    
    console.log('✅ fetchModuleStatusFromMongoDB: Busca concluída com sucesso');
    return mappedStatus;

  } catch (error) {
    console.error('❌ Erro ao buscar status dos módulos do MongoDB:', error);
    console.error('❌ Stack trace:', error.stack);
    console.log('🔄 Usando cache local como fallback');
    return moduleStatusCache; // Fallback para cache local
  }
};

/**
 * Atualiza o cache se necessário (baseado no tempo)
 * @returns {Promise<Object>} Status atual dos módulos
 */
const getModuleStatus = async () => {
  const now = Date.now();
  
  // Se cache é válido, retornar cache
  if (lastCacheUpdate && (now - lastCacheUpdate) < CACHE_VALIDITY_MS) {
    console.log('📊 Cache válido - retornando cache:', moduleStatusCache);
    return moduleStatusCache;
  }

  // Cache expirado ou inexistente - buscar do MongoDB
  console.log('🔄 Cache expirado - buscando status do MongoDB...');
  console.log('🔄 Cache atual:', moduleStatusCache);
  console.log('🔄 Última atualização:', lastCacheUpdate);
  
  const freshStatus = await fetchModuleStatusFromMongoDB();
  
  // Atualizar cache
  moduleStatusCache = freshStatus;
  lastCacheUpdate = now;
  
  console.log('🔄 Cache atualizado:', moduleStatusCache);
  return moduleStatusCache;
};

// Endpoint para buscar status dos módulos (GET)
app.get('/api/module-status', async (req, res) => {
  try {
    console.log('📊 Status dos módulos solicitado - Iniciando...');
    console.log('📊 Headers da requisição:', req.headers);
    
    // Garantir que sempre retornamos JSON
    res.setHeader('Content-Type', 'application/json');
    
    const currentStatus = await getModuleStatus();
    console.log('📊 Status obtido do MongoDB/cache:', currentStatus);
    
    // Garantir que sempre retornamos dados válidos
    const validStatus = {
      'credito-trabalhador': currentStatus['credito-trabalhador'] || 'on',
      'credito-pessoal': currentStatus['credito-pessoal'] || 'on',
      'antecipacao': currentStatus['antecipacao'] || 'revisao',
      'pagamento-antecipado': currentStatus['pagamento-antecipado'] || 'off',
      'modulo-irpf': currentStatus['modulo-irpf'] || 'on',
      'seguro-cred': currentStatus['seguro-cred'] || 'on',
      'seguro-cel': currentStatus['seguro-cel'] || 'on'
    };
    
    console.log('📊 Retornando status dos módulos:', validStatus);
    console.log('📊 Status dos módulos enviado com sucesso');
    
    res.json(validStatus);
  } catch (error) {
    console.error('❌ Erro ao buscar status dos módulos:', error);
    console.error('❌ Stack trace:', error.stack);
    
    // Garantir que sempre retornamos JSON mesmo em caso de erro
    res.setHeader('Content-Type', 'application/json');
    
    // Fallback com dados padrão em caso de erro
    const fallbackStatus = {
      'credito-trabalhador': 'on',
      'credito-pessoal': 'on',
      'antecipacao': 'off',
      'pagamento-antecipado': 'on',
      'modulo-irpf': 'off',
      'seguro-cred': 'on',
      'seguro-cel': 'on'
    };
    
    console.log('🔄 Usando status fallback:', fallbackStatus);
    console.log('🔄 Status fallback enviado com sucesso');
    
    res.json(fallbackStatus);
  }
});

// Endpoint para atualizar status dos módulos (POST) - Console VeloHub
app.post('/api/module-status', async (req, res) => {
  try {
    const { moduleKey, status } = req.body;
    
    // Validar entrada
    if (!moduleKey || !status) {
      return res.status(400).json({ error: 'moduleKey e status são obrigatórios' });
    }
    
    if (!['on', 'off', 'revisao'].includes(status)) {
      return res.status(400).json({ error: 'Status deve ser: on, off ou revisao' });
    }
    
    // Validar se o módulo existe no cache atual
    const currentStatus = await getModuleStatus();
    if (!currentStatus.hasOwnProperty(moduleKey)) {
      return res.status(400).json({ error: 'Módulo não encontrado' });
    }
    
    // Mapear moduleKey para campo do MongoDB
    const mongoFieldMap = {
      'credito-trabalhador': '_trabalhador',
      'credito-pessoal': '_pessoal',
      'antecipacao': '_antecipacao',
      'pagamento-antecipado': '_pgtoAntecip',
      'modulo-irpf': '_irpf',
      'seguro-cred': '_seguroCred',
      'seguro-cel': '_seguroCel'
    };
    
    const mongoField = mongoFieldMap[moduleKey];
    if (!mongoField) {
      return res.status(400).json({ error: 'Módulo não mapeado para MongoDB' });
    }
    
    // Atualizar no MongoDB
    if (client) {
      try {
        await connectToMongo();
        const db = client.db('console_config');
        const collection = db.collection('module_status');
        
        // Criar novo documento com status atualizado
        const updateData = {
          ...currentStatus,
          [mongoField]: status,
          updatedAt: new Date()
        };
        
        // Mapear de volta para campos do MongoDB
        const mongoData = {
          _trabalhador: updateData['credito-trabalhador'],
          _pessoal: updateData['credito-pessoal'],
          _antecipacao: updateData['antecipacao'],
          _pgtoAntecip: updateData['pagamento-antecipado'],
          _irpf: updateData['modulo-irpf'],
          _seguroCred: updateData['seguro-cred'],
          _seguroCel: updateData['seguro-cel'],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await collection.insertOne(mongoData);
        console.log(`✅ Status do módulo ${moduleKey} salvo no MongoDB: ${status}`);
        
        // Invalidar cache para forçar refresh na próxima consulta
        lastCacheUpdate = null;
        
      } catch (mongoError) {
        console.error('❌ Erro ao salvar no MongoDB:', mongoError);
        // Continuar com atualização local mesmo se MongoDB falhar
      }
    }
    
    // Atualizar cache local
    const oldStatus = currentStatus[moduleKey];
    moduleStatusCache[moduleKey] = status;
    lastCacheUpdate = Date.now();
    
    console.log(`🔄 Status do módulo ${moduleKey} alterado: ${oldStatus} → ${status}`);
    
    res.json({ 
      success: true, 
      message: `Status do módulo ${moduleKey} atualizado para ${status}`,
      moduleStatus: moduleStatusCache 
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar status dos módulos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para atualizar múltiplos módulos (PUT) - Console VeloHub
app.put('/api/module-status', async (req, res) => {
  try {
    const newStatus = req.body;
    
    // Validar se é um objeto
    if (typeof newStatus !== 'object' || Array.isArray(newStatus)) {
      return res.status(400).json({ error: 'Body deve ser um objeto com os status dos módulos' });
    }
    
    // Obter status atual
    const currentStatus = await getModuleStatus();
    
    // Validar cada status
    for (const [moduleKey, status] of Object.entries(newStatus)) {
      if (!currentStatus.hasOwnProperty(moduleKey)) {
        return res.status(400).json({ error: `Módulo ${moduleKey} não encontrado` });
      }
      
      if (!['on', 'off', 'revisao'].includes(status)) {
        return res.status(400).json({ error: `Status inválido para ${moduleKey}: ${status}` });
      }
    }
    
    // Atualizar no MongoDB
    if (client) {
      try {
        await connectToMongo();
        const db = client.db('console_config');
        const collection = db.collection('module_status');
        
        // Criar novo documento com todos os status atualizados
        const updatedStatus = { ...currentStatus, ...newStatus };
        
        // Mapear para campos do MongoDB
        const mongoData = {
          _trabalhador: updatedStatus['credito-trabalhador'],
          _pessoal: updatedStatus['credito-pessoal'],
          _antecipacao: updatedStatus['antecipacao'],
          _pgtoAntecip: updatedStatus['pagamento-antecipado'],
          _irpf: updatedStatus['modulo-irpf'],
          _seguroCred: updatedStatus['seguro-cred'],
          _seguroCel: updatedStatus['seguro-cel'],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await collection.insertOne(mongoData);
        console.log('✅ Status dos módulos salvos no MongoDB em lote:', newStatus);
        
        // Invalidar cache para forçar refresh na próxima consulta
        lastCacheUpdate = null;
        
      } catch (mongoError) {
        console.error('❌ Erro ao salvar no MongoDB:', mongoError);
        // Continuar com atualização local mesmo se MongoDB falhar
      }
    }
    
    // Atualizar cache local
    const oldStatus = { ...currentStatus };
    Object.assign(moduleStatusCache, newStatus);
    lastCacheUpdate = Date.now();
    
    console.log('🔄 Status dos módulos atualizados em lote:', newStatus);
    
    res.json({ 
      success: true, 
      message: 'Status dos módulos atualizados com sucesso',
      moduleStatus: moduleStatusCache,
      changes: newStatus
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar status dos módulos em lote:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== API CRUD PARA MÓDULO APOIO =====
console.log('🔧 Registrando rotas do módulo Apoio...');

// CREATE - Criar tickets tk_conteudos
app.post('/api/support/tk-conteudos', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Endpoint /api/support/tk-conteudos chamado');
    console.log('🔍 DEBUG: Body recebido:', req.body);
    
    if (!client) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB não configurado'
      });
    }

    // Validação obrigatória do campo _assunto
    if (!req.body._assunto || req.body._assunto.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Campo assunto é obrigatório'
      });
    }

    await connectToMongo();
    const db = client.db('console_chamados');
    const collection = db.collection('tk_conteudos');
    
    // Gerar próximo ID com prefixo TKC-
    const lastDoc = await collection.find().sort({ _id: -1 }).limit(1).toArray();
    const nextNumber = lastDoc.length > 0 ? parseInt(lastDoc[0]._id.split('-')[1]) + 1 : 1;
    const newId = `TKC-${String(nextNumber).padStart(6, '0')}`;
    
    // Transformar _corpo em array de mensagens
    const corpoArray = Array.isArray(req.body._corpo) ? req.body._corpo : [{
      autor: 'user',
      userName: req.body._userName || 'Usuário',
      timestamp: new Date(),
      mensagem: req.body._corpo || ''
    }];

    const ticketData = {
      _id: newId,
      ...req.body,
      _corpo: corpoArray,
      _statusHub: 'pendente',      // NOVO: valor padrão
      _statusConsole: 'novo',      // NOVO: valor padrão
      _lastUpdatedBy: 'user',      // NOVO: valor padrão
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await collection.insertOne(ticketData);
    
    res.json({ success: true, ticketId: newId });
  } catch (error) {
    console.error('❌ Erro ao criar ticket tk_conteudos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// CREATE - Criar tickets tk_gestão
app.post('/api/support/tk-gestao', async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB não configurado'
      });
    }

    await connectToMongo();
    const db = client.db('console_chamados');
    const collection = db.collection('tk_gestão');
    
    // Gerar próximo ID com prefixo TKG-
    const lastDoc = await collection.find().sort({ _id: -1 }).limit(1).toArray();
    const nextNumber = lastDoc.length > 0 ? parseInt(lastDoc[0]._id.split('-')[1]) + 1 : 1;
    const newId = `TKG-${String(nextNumber).padStart(6, '0')}`;
    
    // Transformar _corpo em array de mensagens
    const corpoArray = Array.isArray(req.body._corpo) ? req.body._corpo : [{
      autor: 'user',
      userName: req.body._userName || 'Usuário',
      timestamp: new Date(),
      mensagem: req.body._corpo || ''
    }];

    const ticketData = {
      _id: newId,
      ...req.body,
      _corpo: corpoArray,
      _statusHub: 'pendente',      // NOVO: valor padrão
      _statusConsole: 'novo',      // NOVO: valor padrão
      _lastUpdatedBy: 'user',      // NOVO: valor padrão
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await collection.insertOne(ticketData);
    
    res.json({ success: true, ticketId: newId });
  } catch (error) {
    console.error('❌ Erro ao criar ticket tk_gestão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// UPDATE - Atualizar ticket de conteúdo
app.put('/api/support/tk-conteudos', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Endpoint PUT /api/support/tk-conteudos chamado');
    console.log('🔍 DEBUG: Body recebido:', req.body);
    
    const { _id, _corpo } = req.body;
    
    if (!_id) {
      return res.status(400).json({
        success: false,
        error: '_id é obrigatório'
      });
    }
    
    if (!_id.startsWith('TKC-')) {
      return res.status(400).json({
        success: false,
        error: 'ID deve iniciar com TKC- para tickets de conteúdo'
      });
    }

    if (!client) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB não configurado'
      });
    }

    await connectToMongo();
    const db = client.db('console_chamados');
    const collection = db.collection('tk_conteudos');
    
    // Buscar ticket existente
    const ticket = await collection.findOne({ _id });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket não encontrado'
      });
    }

    // Extrair nova mensagem do array _corpo (última mensagem)
    const novaMensagem = _corpo[_corpo.length - 1];
    
    if (!novaMensagem || !novaMensagem.mensagem) {
      return res.status(400).json({
        success: false,
        error: 'Nova mensagem é obrigatória'
      });
    }

    // Preservar campos originais e atualizar apenas o necessário
    const updateData = {
      _corpo: _corpo,  // Array completo de mensagens
      _statusHub: 'pendente',
      _statusConsole: 'aberto',
      _lastUpdatedBy: 'user',
      updatedAt: new Date()
    };

    // Preservar campos originais se fornecidos no body
    if (req.body._assunto !== undefined) updateData._assunto = req.body._assunto;
    if (req.body._genero !== undefined) updateData._genero = req.body._genero;
    if (req.body._tipo !== undefined) updateData._tipo = req.body._tipo;
    if (req.body._obs !== undefined) updateData._obs = req.body._obs;
    if (req.body._userEmail !== undefined) updateData._userEmail = req.body._userEmail;

    // Atualizar ticket
    const result = await collection.updateOne(
      { _id },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Falha ao atualizar ticket'
      });
    }

    res.json({ success: true, message: 'Ticket atualizado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao atualizar ticket de conteúdo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// UPDATE - Atualizar ticket de gestão
app.put('/api/support/tk-gestao', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Endpoint PUT /api/support/tk-gestao chamado');
    console.log('🔍 DEBUG: Body recebido:', req.body);
    
    const { _id, _corpo } = req.body;
    
    if (!_id) {
      return res.status(400).json({
        success: false,
        error: '_id é obrigatório'
      });
    }
    
    if (!_id.startsWith('TKG-')) {
      return res.status(400).json({
        success: false,
        error: 'ID deve iniciar com TKG- para tickets de gestão'
      });
    }

    if (!client) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB não configurado'
      });
    }

    await connectToMongo();
    const db = client.db('console_chamados');
    const collection = db.collection('tk_gestão');
    
    // Buscar ticket existente
    const ticket = await collection.findOne({ _id });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket não encontrado'
      });
    }

    // Extrair nova mensagem do array _corpo (última mensagem)
    const novaMensagem = _corpo[_corpo.length - 1];
    
    if (!novaMensagem || !novaMensagem.mensagem) {
      return res.status(400).json({
        success: false,
        error: 'Nova mensagem é obrigatória'
      });
    }

    // Atualizar ticket
    const result = await collection.updateOne(
      { _id },
      {
        $push: { _corpo: novaMensagem },
        $set: {
          _statusHub: 'pendente',
          _statusConsole: 'aberto',
          _lastUpdatedBy: 'user',
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Falha ao atualizar ticket'
      });
    }

    res.json({ success: true, message: 'Ticket atualizado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao atualizar ticket de gestão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// READ - Buscar todos os tickets de um usuário
app.get('/api/support/tickets', async (req, res) => {
  try {
    const { userEmail } = req.query;
    
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'userEmail é obrigatório'
      });
    }

    if (!client) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB não configurado'
      });
    }

    await connectToMongo();
    const db = client.db('console_chamados');
    
    const [tkConteudos, tkGestao] = await Promise.all([
      db.collection('tk_conteudos')
        .find({ _userEmail: userEmail })
        .sort({ createdAt: -1 })
        .toArray(),
      db.collection('tk_gestão')
        .find({ _userEmail: userEmail })
        .sort({ createdAt: -1 })
        .toArray()
    ]);
    
    const allTickets = [...tkConteudos, ...tkGestao]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ success: true, tickets: allTickets });
  } catch (error) {
    console.error('❌ Erro ao buscar tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// READ - Buscar ticket específico
app.get('/api/support/ticket/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!client) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB não configurado'
      });
    }

    await connectToMongo();
    const db = client.db('console_chamados');
    
    const collection = id.startsWith('TKC-') ? 'tk_conteudos' : 'tk_gestão';
    const ticket = await db.collection(collection).findOne({ _id: id });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket não encontrado'
      });
    }
    
    res.json({ success: true, ticket });
  } catch (error) {
    console.error('❌ Erro ao buscar ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});


// DELETE - Excluir ticket
app.delete('/api/support/ticket/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!client) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB não configurado'
      });
    }

    await connectToMongo();
    const db = client.db('console_chamados');
    const collection = id.startsWith('TKC-') ? 'tk_conteudos' : 'tk_gestão';
    
    const result = await db.collection(collection).deleteOne({ _id: id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ticket não encontrado'
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao excluir ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// STATS - Estatísticas de tickets por usuário
app.get('/api/support/stats', async (req, res) => {
  try {
    const { userEmail } = req.query;
    
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'userEmail é obrigatório'
      });
    }

    if (!client) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB não configurado'
      });
    }

    await connectToMongo();
    const db = client.db('console_chamados');
    
    const [tkConteudosCount, tkGestaoCount] = await Promise.all([
      db.collection('tk_conteudos').countDocuments({ _userEmail: userEmail }),
      db.collection('tk_gestão').countDocuments({ _userEmail: userEmail })
    ]);
    
    res.json({ 
      success: true, 
      stats: { 
        total: tkConteudosCount + tkGestaoCount,
        tkConteudos: tkConteudosCount,
        tkGestao: tkGestaoCount
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// STATS - Estatísticas gerais (admin)
app.get('/api/support/stats/admin', async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB não configurado'
      });
    }

    await connectToMongo();
    const db = client.db('console_chamados');
    
    const [tkConteudosCount, tkGestaoCount, recentTickets] = await Promise.all([
      db.collection('tk_conteudos').countDocuments(),
      db.collection('tk_gestão').countDocuments(),
      db.collection('tk_conteudos').find().sort({ createdAt: -1 }).limit(10).toArray()
    ]);
    
    res.json({ 
      success: true, 
      stats: { 
        total: tkConteudosCount + tkGestaoCount,
        tkConteudos: tkConteudosCount,
        tkGestao: tkGestaoCount,
        recentTickets: recentTickets
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas admin:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

console.log('✅ Rotas do módulo Apoio registradas com sucesso!');
console.log('📋 Rotas disponíveis: POST /api/support/tk-conteudos, POST /api/support/tk-gestao');

// ===== API PARA MÓDULO ESCALAÇÕES =====
console.log('🔧 Registrando rotas do módulo Escalações...');

try {
  console.log('📦 Carregando módulos de Escalações...');
  const initSolicitacoesRoutes = require('./routes/api/escalacoes/solicitacoes');
  const initErrosBugsRoutes = require('./routes/api/escalacoes/erros-bugs');
  const initLogsRoutes = require('./routes/api/escalacoes/logs');
  const createEscalacoesIndexes = require('./routes/api/escalacoes/indexes');
  console.log('✅ Módulos carregados com sucesso');

  console.log('🔧 Inicializando routers...');
  // Registrar rotas
  const solicitacoesRouter = initSolicitacoesRoutes(client, connectToMongo, { userActivityLogger });
  const errosBugsRouter = initErrosBugsRoutes(client, connectToMongo, { userActivityLogger });
  const logsRouter = initLogsRoutes(client, connectToMongo);
  console.log('✅ Routers inicializados');

  console.log('🔗 Registrando rotas no Express...');
  app.use('/api/escalacoes/solicitacoes', solicitacoesRouter);
  app.use('/api/escalacoes/erros-bugs', errosBugsRouter);
  app.use('/api/escalacoes/logs', logsRouter);
  console.log('✅ Rotas registradas no Express');

  // Criar índices MongoDB (em background, não bloqueia startup)
  setTimeout(async () => {
    try {
      console.log('📊 Criando índices MongoDB para Escalações...');
      await createEscalacoesIndexes(client, connectToMongo);
      console.log('✅ Índices criados com sucesso');
    } catch (error) {
      console.error('❌ Erro ao criar índices de Escalações:', error);
      console.error('Stack:', error.stack);
    }
  }, 3000);

  console.log('✅ Rotas do módulo Escalações registradas com sucesso!');
  console.log('📋 Rotas disponíveis:');
  console.log('   - GET/POST/PUT/DELETE /api/escalacoes/solicitacoes');
  console.log('   - GET/POST /api/escalacoes/erros-bugs');
  console.log('   - GET/POST /api/escalacoes/logs');
} catch (error) {
  console.error('❌ Erro ao registrar rotas de Escalações:', error.message);
  console.error('Stack:', error.stack);
  console.error('Detalhes do erro:', error);
}

// Servir arquivos estáticos do frontend (DEPOIS das rotas da API)
app.use(express.static(path.join(__dirname, 'public')));

// Rota para servir o React app (SPA) - DEVE SER A ÚLTIMA ROTA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
