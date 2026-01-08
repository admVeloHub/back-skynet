// ============================================
// SISTEMA DE PING AUTOMÁTICO - Baileys API
// Versão: v1.0.0
// Data: 2025-01-31
// ============================================
// 
// Este código deve ser adicionado ao index.js
// do projeto Baileys-API---Relat-rios-
//
// OBJETIVO: Manter a API ativa para evitar
// que serviços como Render.com coloquem o
// servidor em modo "sleep" por inatividade
// ============================================

// ============================================
// 1. ENDPOINT DE HEALTH CHECK
// ============================================
// Adicionar ANTES de app.listen()

/**
 * Endpoint simples de ping/health check
 * Retorna status básico da API
 */
app.get('/ping', (req, res) => {
  try {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      whatsapp: socket?.user ? 'connected' : 'disconnected',
      message: 'API está ativa e funcionando'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Endpoint completo de health check
 * Retorna informações detalhadas do sistema
 */
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB'
      },
      whatsapp: socket?.user ? 'connected' : 'disconnected',
      nodeVersion: process.version,
      platform: process.platform,
      pingEnabled: process.env.PING_ENABLED !== 'false',
      pingInterval: process.env.PING_INTERVAL || '600000'
    };
    
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// ============================================
// 2. SISTEMA DE PING AUTOMÁTICO INTERNO
// ============================================
// Adicionar DEPOIS de app.listen()

/**
 * Função para fazer ping interno na própria API
 * Mantém o servidor ativo evitando sleep mode
 */
const fazerPingInterno = async () => {
  try {
    // Obter URL base (Render.com fornece RENDER_EXTERNAL_URL automaticamente)
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    const pingUrl = `${baseUrl}/ping`;
    
    // Fazer requisição HTTP para o próprio servidor
    const response = await fetch(pingUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Baileys-API-Ping-System/1.0.0'
      },
      // Timeout de 10 segundos
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Log de sucesso
    console.log(`[PING] ${new Date().toISOString()} - Status: ${data.status} | Uptime: ${data.uptime}s`);
    
    return { success: true, data };
  } catch (error) {
    // Log de erro (não interrompe o processo)
    console.error(`[PING ERROR] ${new Date().toISOString()} - ${error.message}`);
    
    // Se for erro de conexão local, pode ser que o servidor ainda esteja iniciando
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      console.warn(`[PING WARNING] Servidor pode estar iniciando. Tentando novamente no próximo ciclo.`);
    }
    
    return { success: false, error: error.message };
  }
};

// ============================================
// 3. CONFIGURAÇÃO E INICIALIZAÇÃO
// ============================================

// Configurações via variáveis de ambiente
const PING_ENABLED = process.env.PING_ENABLED !== 'false'; // Default: true
const PING_INTERVAL = parseInt(process.env.PING_INTERVAL || '600000', 10); // Default: 10 minutos (600000ms)
const PING_DELAY = parseInt(process.env.PING_DELAY || '60000', 10); // Default: 1 minuto após iniciar

// Validar intervalo (mínimo 5 minutos, máximo 20 minutos)
const MIN_INTERVAL = 5 * 60 * 1000; // 5 minutos
const MAX_INTERVAL = 20 * 60 * 1000; // 20 minutos

const validInterval = Math.max(MIN_INTERVAL, Math.min(MAX_INTERVAL, PING_INTERVAL));

// Inicializar sistema de ping
if (PING_ENABLED) {
  console.log('='.repeat(50));
  console.log('[PING SYSTEM] Sistema de ping automático ATIVADO');
  console.log(`[PING SYSTEM] Intervalo: ${validInterval / 1000 / 60} minutos`);
  console.log(`[PING SYSTEM] Primeiro ping em: ${PING_DELAY / 1000} segundos`);
  console.log(`[PING SYSTEM] URL base: ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}`);
  console.log('='.repeat(50));
  
  // Fazer primeiro ping após delay inicial (permite servidor iniciar completamente)
  setTimeout(() => {
    console.log('[PING SYSTEM] Executando primeiro ping...');
    fazerPingInterno();
  }, PING_DELAY);
  
  // Configurar ping periódico
  const pingIntervalId = setInterval(() => {
    fazerPingInterno();
  }, validInterval);
  
  // Salvar interval ID para possível limpeza futura
  // (útil se precisar parar o ping em algum momento)
  if (typeof global !== 'undefined') {
    global.pingIntervalId = pingIntervalId;
  }
  
  // Log de confirmação
  console.log(`[PING SYSTEM] Ping automático configurado com sucesso!`);
} else {
  console.log('[PING SYSTEM] Sistema de ping automático DESATIVADO (PING_ENABLED=false)');
}

// ============================================
// 4. FUNÇÃO DE LIMPEZA (OPCIONAL)
// ============================================
// Útil para parar o ping se necessário

/**
 * Função para parar o sistema de ping
 * Pode ser chamada via endpoint ou em shutdown graceful
 */
const pararPing = () => {
  if (typeof global !== 'undefined' && global.pingIntervalId) {
    clearInterval(global.pingIntervalId);
    global.pingIntervalId = null;
    console.log('[PING SYSTEM] Sistema de ping parado');
    return true;
  }
  return false;
};

// Expor função globalmente (opcional)
if (typeof global !== 'undefined') {
  global.pararPing = pararPing;
}

// ============================================
// 5. ENDPOINT PARA CONTROLE DO PING (OPCIONAL)
// ============================================
// Permite controlar o ping via API

/**
 * Endpoint para controlar o sistema de ping
 * GET /ping/status - Ver status
 * POST /ping/stop - Parar ping
 * POST /ping/start - Iniciar ping (se estiver parado)
 */
app.get('/ping/status', (req, res) => {
  res.json({
    enabled: PING_ENABLED,
    interval: validInterval,
    intervalMinutes: validInterval / 1000 / 60,
    running: typeof global !== 'undefined' && global.pingIntervalId !== null
  });
});

// ============================================
// 6. GRACEFUL SHUTDOWN (OPCIONAL)
// ============================================
// Parar ping quando servidor for encerrado

process.on('SIGTERM', () => {
  console.log('[PING SYSTEM] Recebido SIGTERM, parando ping...');
  pararPing();
});

process.on('SIGINT', () => {
  console.log('[PING SYSTEM] Recebido SIGINT, parando ping...');
  pararPing();
});

// ============================================
// FIM DO CÓDIGO DE PING
// ============================================

