/**
 * VeloHub V3 - Backend Server
 * VERSION: v1.0.7 | DATE: 2025-01-27 | AUTHOR: VeloHub Development Team
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Importar serviços do chatbot
// VERSION: v2.0.0 | DATE: 2025-01-27 | AUTHOR: Lucas Gravina - VeloHub Development Team
const openaiService = require('./services/chatbot/openaiService');
const searchService = require('./services/chatbot/searchService');
const sessionService = require('./services/chatbot/sessionService');
const feedbackService = require('./services/chatbot/feedbackService');
const logsService = require('./services/chatbot/logsService');
const userActivityLogger = require('./services/logging/userActivityLogger');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: [
    'https://app.velohub.velotax.com.br', // NOVO DOMÍNIO PERSONALIZADO
    'https://velohub-v3-278491073220.us-east1.run.app',
    'https://velohub-278491073220.us-east1.run.app', // URL específica do Cloud Run
    'http://localhost:3000',
    'http://localhost:5000'
  ],
  credentials: true
}));
app.use(express.json());

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

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.warn('⚠️ MONGODB_URI não configurada - servidor iniciará sem MongoDB');
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
    throw new Error('MongoDB não configurado');
  }
  
  if (!isConnected) {
    try {
      await client.connect();
      isConnected = true;
      console.log('✅ Conexão MongoDB estabelecida!');
    } catch (error) {
      console.error('❌ Erro ao conectar MongoDB:', error);
      throw error;
    }
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
        content: item.content || item.velonews_conteudo,
        is_critical: item.alerta_critico === 'Y' || item.alerta_critico === true || item.is_critical === 'Y' || item.is_critical === true || item.isCritical === 'Y' || item.isCritical === true ? 'Y' : 'N',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      
      articles: artigos.map(item => ({
        _id: item._id,
        title: item.artigo_titulo || item.title,
        content: item.artigo_conteudo || item.content,
        category: item.categoria_titulo || item.category,
        category_id: item.categoria_id || item.category_id,
        keywords: item.keywords || [],
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
        // Priorize os campos ESPECÍFICOS de Velonews antes dos genéricos
        title: item.velonews_titulo ?? item.title ?? '(sem título)',
        content: item.velonews_conteudo ?? item.content ?? '',
        is_critical:
          item.alerta_critico === 'Y' || item.alerta_critico === true ||
          item.is_critical === 'Y' || item.is_critical === true ||
          item.isCritical === 'Y' || item.isCritical === true
            ? 'Y'
            : 'N',
        createdAt,
        updatedAt: item.updatedAt ?? createdAt,
        source: 'Velonews' // <- rótulo explícito
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
      title: item.artigo_titulo || item.title,
      content: item.artigo_conteudo || item.content,
      category: item.categoria_titulo || item.category,
      category_id: item.categoria_id || item.category_id,
      keywords: item.keywords || [],
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

// ===== API DO CHATBOT INTELIGENTE =====

// API de Chat Inteligente
app.post('/api/chatbot/ask', async (req, res) => {
  try {
    const { question, userId, sessionId, email } = req.body;

    // Validação básica
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Pergunta é obrigatória e deve ser uma string válida'
      });
    }

    const cleanQuestion = question.trim();
    const cleanUserId = userId || 'anonymous';
    const cleanSessionId = sessionId || null;
    const userEmail = email || '';

    console.log(`🤖 Chat V2: Nova pergunta de ${cleanUserId}: "${cleanQuestion}"`);

    // Obter ou criar sessão
    const session = sessionService.getOrCreateSession(cleanUserId, cleanSessionId);
    
    // Adicionar pergunta à sessão
    sessionService.addMessage(session.id, 'user', cleanQuestion, {
      timestamp: new Date(),
      userId: cleanUserId,
      email: userEmail
    });

    // Log da atividade
    await userActivityLogger.logQuestion(cleanUserId, cleanQuestion, session.id);

    // Buscar dados do MongoDB
    const client = await connectToMongo();
    const db = client.db('console_conteudo');
    const faqCollection = db.collection('Bot_perguntas'); // Nome correto da coleção
    const articlesCollection = db.collection('Artigos');

    // Buscar FAQ e artigos em paralelo
    const [faqData, articlesData] = await Promise.all([
      faqCollection.find({}).toArray(),
      articlesCollection.find({}).toArray()
    ]);

    console.log(`📋 Chat V2: ${faqData.length} FAQs e ${articlesData.length} artigos carregados`);

    // Busca híbrida avançada (FAQ + Artigos + Sites)
    const searchResults = await searchService.hybridSearch(cleanQuestion, faqData, articlesData);

    // Verificar se precisa de esclarecimento (sistema de desduplicação)
    const clarificationResult = searchService.findMatchesWithDeduplication(cleanQuestion, faqData);
    
    if (clarificationResult.needsClarification) {
      const clarificationMenu = searchService.generateClarificationMenu(clarificationResult.matches, cleanQuestion);
      
      // Log da necessidade de esclarecimento
      if (logsService.isConfigured()) {
        await logsService.logAIUsage(userEmail, cleanQuestion, 'Clarificação Necessária');
      }

      return res.json({
        success: true,
        data: {
          ...clarificationMenu,
          sessionId: session.id,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Obter histórico da sessão
    const sessionHistory = sessionService.getSessionHistory(session.id);

    // Construir contexto aprimorado
    let context = '';
    
    // Contexto do FAQ (estrutura MongoDB: Bot_perguntas)
    if (searchResults.faq) {
      context += `FAQ relevante:\nPergunta: ${searchResults.faq.pergunta || searchResults.faq.question}\nResposta: ${searchResults.faq.resposta || searchResults.faq.answer}\n\n`;
    }
    
    // Contexto dos artigos
    if (searchResults.articles.length > 0) {
      context += `Artigos relacionados:\n`;
      searchResults.articles.forEach(article => {
        context += `- ${article.title}: ${article.content.substring(0, 200)}...\n`;
      });
      context += '\n';
    }
    
    // Contexto dos sites autorizados
    if (searchResults.sitesContext) {
      context += `Informações de sites oficiais:\n${searchResults.sitesContext}\n`;
    }

    // Gerar resposta com IA (Gemini primário, OpenAI fallback)
    let response;
    let responseSource = 'fallback';
    let aiProvider = null;

    if (openaiService.isConfigured()) {
      try {
        response = await openaiService.generateResponse(
          cleanQuestion,
          context,
          sessionHistory,
          cleanUserId,
          userEmail
        );
        
        // Determinar qual IA foi usada
        if (openaiService.isGeminiConfigured()) {
          responseSource = 'gemini';
          aiProvider = 'Gemini';
        } else {
          responseSource = 'openai';
          aiProvider = 'OpenAI';
        }
        
        console.log(`✅ Chat V2: Resposta gerada pela ${aiProvider}`);
        
        // Log do uso da IA
        if (logsService.isConfigured()) {
          await logsService.logAIResponse(userEmail, cleanQuestion, aiProvider);
        }
        
      } catch (aiError) {
        console.error('❌ Chat V2: Erro na IA:', aiError.message);
        response = 'Desculpe, não consegui processar sua pergunta no momento. Tente novamente.';
        responseSource = 'error';
        
        // Log do erro
        if (logsService.isConfigured()) {
          await logsService.logNotFoundQuestion(userEmail, cleanQuestion);
        }
      }
    } else {
      // Fallback para FAQ se nenhuma IA estiver configurada
      if (searchResults.faq) {
        response = searchResults.faq.answer;
        responseSource = 'faq';
        console.log(`✅ Chat V2: Resposta do FAQ (IA não configurada)`);
        
        // Log da resposta da planilha
        if (logsService.isConfigured()) {
          await logsService.logSpreadsheetResponse(userEmail, cleanQuestion, searchResults.faq._id);
        }
      } else {
        response = 'Desculpe, não encontrei uma resposta para sua pergunta. Entre em contato com nosso suporte para mais informações.';
        responseSource = 'no_results';
        console.log(`❌ Chat V2: Nenhuma resposta encontrada`);
        
        // Log da pergunta não encontrada
        if (logsService.isConfigured()) {
          await logsService.logNotFoundQuestion(userEmail, cleanQuestion);
        }
      }
    }

    // Adicionar resposta à sessão
    const messageId = sessionService.addMessage(session.id, 'bot', response, {
      timestamp: new Date(),
      source: responseSource,
      aiProvider: aiProvider,
      faqUsed: searchResults.faq ? searchResults.faq._id : null,
      articlesUsed: searchResults.articles.map(a => a._id),
      sitesUsed: searchResults.sitesContext ? true : false
    });

    // Preparar resposta para o frontend
    const responseData = {
      success: true,
      data: {
        messageId: messageId,
        response: response,
        source: responseSource,
        aiProvider: aiProvider,
        sessionId: session.id,
        suggestedArticles: searchResults.articles.slice(0, 3).map(article => ({
          id: article._id,
          title: article.title,
          content: article.content.substring(0, 150) + '...',
          relevanceScore: article.relevanceScore
        })),
        faqUsed: searchResults.faq ? {
          id: searchResults.faq._id,
          question: searchResults.faq.question,
          answer: searchResults.faq.answer,
          relevanceScore: searchResults.faq.relevanceScore
        } : null,
        sitesUsed: searchResults.sitesContext ? true : false,
        timestamp: new Date().toISOString()
      }
    };

    console.log(`✅ Chat V2: Resposta enviada para ${cleanUserId} (${responseSource}${aiProvider ? ` - ${aiProvider}` : ''})`);
    
    // Verificar se headers já foram enviados
    if (res.headersSent) {
      console.error('❌ CRÍTICO: Headers já foram enviados! Stack:', new Error().stack);
      return;
    }
    
    // Debug: Verificar se há caracteres especiais na resposta
    const responseString = JSON.stringify(responseData);
    console.log('🔍 Debug: Resposta JSON:', responseString.substring(0, 200) + '...');
    console.log('🔍 Debug: Primeiros caracteres:', responseString.substring(0, 10).split('').map(c => c.charCodeAt(0)));
    console.log('🔍 Debug: First byte hex:', Buffer.from(responseString)[0].toString(16));
    
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

// API de Feedback
app.post('/api/chatbot/feedback', async (req, res) => {
  try {
    const { messageId, feedbackType, comment, userId, sessionId, question, answer } = req.body;

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

    // Preparar dados do feedback
    const feedbackData = {
      userId: cleanUserId,
      messageId: messageId,
      feedbackType: feedbackType,
      comment: comment || '',
      question: question || '',
      answer: answer || '',
      sessionId: cleanSessionId,
      metadata: {
        timestamp: new Date(),
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }
    };

    // Registrar feedback no MongoDB
    const feedbackSuccess = await feedbackService.logFeedback(feedbackData);

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

    // Preparar dados da atividade
    const activityData = {
      userId: cleanUserId,
      action: action,
      details: details || {},
      sessionId: cleanSessionId,
      source: cleanSource,
      metadata: {
        timestamp: new Date(),
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }
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

// Rota para servir o React app (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
  console.log(`🌐 Acessível em: http://localhost:${PORT}`);
  console.log(`🌐 Acessível na rede local: http://0.0.0.0:${PORT}`);
  console.log(`📡 Endpoint principal: http://localhost:${PORT}/api/data`);
  console.log(`📡 Teste a API em: http://localhost:${PORT}/api/test`);
  
  // Tentar conectar ao MongoDB em background (não bloqueia o startup)
  connectToMongo().catch(error => {
    console.warn('⚠️ MongoDB: Falha na conexão inicial, tentando reconectar...', error.message);
  });
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
