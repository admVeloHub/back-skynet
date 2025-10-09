// Data Cache Service - Cache inteligente para dados MongoDB
// VERSION: v1.0.0 | DATE: 2025-09-29 | AUTHOR: Lucas Gravina - VeloHub Development Team
// VERSION: v1.1.0 | DATE: 2025-01-30 | AUTHOR: Lucas Gravina - VeloHub Development Team
// OTIMIZAÇÃO: TTL 3min + logs detalhados + métodos de invalidação

class DataCache {
  constructor() {
    // Cache para dados do Bot_perguntas (OTIMIZADO)
    this.botPerguntasCache = {
      data: null,
      timestamp: null,
      ttl: 3 * 60 * 1000 // 3 minutos em ms (otimizado)
    };
    
    // Cache para dados dos Artigos (OTIMIZADO)
    this.articlesCache = {
      data: null,
      timestamp: null,
      ttl: 3 * 60 * 1000 // 3 minutos em ms (otimizado)
    };
    
    console.log('📦 Data Cache: Serviço de cache inicializado');
  }

  /**
   * Verifica se o cache de Bot_perguntas é válido
   * @returns {boolean} Status do cache
   */
  _isBotPerguntasCacheValid() {
    if (!this.botPerguntasCache.data || !this.botPerguntasCache.timestamp) {
      console.log('⚠️ Data Cache: Cache Bot_perguntas inválido - dados ou timestamp ausentes');
      return false;
    }
    
    const now = Date.now();
    const cacheAge = now - this.botPerguntasCache.timestamp;
    const isValid = cacheAge < this.botPerguntasCache.ttl;
    
    if (!isValid) {
      console.log(`⚠️ Data Cache: Cache Bot_perguntas expirado - idade: ${Math.round(cacheAge / 1000)}s, TTL: ${this.botPerguntasCache.ttl / 1000}s`);
    }
    
    return isValid;
  }

  /**
   * Verifica se o cache de Artigos é válido
   * @returns {boolean} Status do cache
   */
  _isArticlesCacheValid() {
    if (!this.articlesCache.data || !this.articlesCache.timestamp) {
      console.log('⚠️ Data Cache: Cache Artigos inválido - dados ou timestamp ausentes');
      return false;
    }
    
    const now = Date.now();
    const cacheAge = now - this.articlesCache.timestamp;
    const isValid = cacheAge < this.articlesCache.ttl;
    
    if (!isValid) {
      console.log(`⚠️ Data Cache: Cache Artigos expirado - idade: ${Math.round(cacheAge / 1000)}s, TTL: ${this.articlesCache.ttl / 1000}s`);
    }
    
    return isValid;
  }

  /**
   * Atualiza cache de Bot_perguntas (OTIMIZADO)
   * @param {Array} data - Dados do Bot_perguntas
   */
  updateBotPerguntas(data) {
    if (!data || !Array.isArray(data)) {
      console.error('❌ Data Cache: Dados inválidos para Bot_perguntas');
      return;
    }
    
    const now = Date.now();
    this.botPerguntasCache.data = data;
    this.botPerguntasCache.timestamp = now;
    
    console.log(`✅ Data Cache: Bot_perguntas atualizado - ${data.length} registros (TTL: 3min)`);
    console.log(`✅ Data Cache: Primeiro registro:`, data[0] ? Object.keys(data[0]) : 'Nenhum');
    console.log(`✅ Data Cache: Cache válido até: ${new Date(now + this.botPerguntasCache.ttl).toLocaleTimeString()}`);
  }

  /**
   * Atualiza cache de Artigos
   * @param {Array} data - Dados dos Artigos
   */
  updateArticles(data) {
    if (!data || !Array.isArray(data)) {
      console.error('❌ Data Cache: Dados inválidos para Artigos');
      return;
    }
    
    this.articlesCache.data = data;
    this.articlesCache.timestamp = Date.now();
    
    console.log(`✅ Data Cache: Artigos atualizados - ${data.length} registros`);
    console.log(`✅ Data Cache: Primeiro artigo:`, data[0] ? Object.keys(data[0]) : 'Nenhum');
  }

  /**
   * Obtém dados do Bot_perguntas do cache (OTIMIZADO)
   * @returns {Array|null} Dados do cache ou null se inválido
   */
  getBotPerguntasData() {
    if (this._isBotPerguntasCacheValid()) {
      const count = this.botPerguntasCache.data ? this.botPerguntasCache.data.length : 0;
      const age = this.botPerguntasCache.timestamp ? Math.round((Date.now() - this.botPerguntasCache.timestamp) / 1000) : 0;
      console.log(`✅ Data Cache: Retornando Bot_perguntas do cache - ${count} registros, idade: ${age}s`);
      return this.botPerguntasCache.data;
    }
    
    console.log('⚠️ Data Cache: Cache Bot_perguntas inválido, retornando null');
    return null;
  }

  /**
   * Obtém dados dos Artigos do cache
   * @returns {Array|null} Dados do cache ou null se inválido
   */
  getArticlesData() {
    if (this._isArticlesCacheValid()) {
      console.log('✅ Data Cache: Retornando Artigos do cache');
      return this.articlesCache.data;
    }
    
    console.log('⚠️ Data Cache: Cache Artigos inválido, retornando null');
    return null;
  }

  /**
   * Limpa todos os caches
   */
  clearAllCaches() {
    this.botPerguntasCache = {
      data: null,
      timestamp: null,
      ttl: 10 * 60 * 1000
    };
    
    this.articlesCache = {
      data: null,
      timestamp: null,
      ttl: 10 * 60 * 1000
    };
    
    console.log('🧹 Data Cache: Todos os caches limpos');
  }

  /**
   * Força invalidação do cache para recarregamento
   */
  invalidateCache() {
    this.botPerguntasCache.timestamp = null;
    this.articlesCache.timestamp = null;
    console.log('🔄 Data Cache: Cache invalidado - próximo acesso recarregará do MongoDB');
  }

  /**
   * Verifica se o cache precisa ser recarregado
   * @returns {boolean} True se precisa recarregar
   */
  needsReload() {
    const botPerguntasNeedsReload = !this._isBotPerguntasCacheValid();
    const articlesNeedsReload = !this._isArticlesCacheValid();
    
    if (botPerguntasNeedsReload || articlesNeedsReload) {
      console.log(`🔄 Data Cache: Recarregamento necessário - Bot_perguntas: ${botPerguntasNeedsReload}, Artigos: ${articlesNeedsReload}`);
      return true;
    }
    
    return false;
  }

  /**
   * Obtém status dos caches (OTIMIZADO)
   * @returns {Object} Status dos caches
   */
  getCacheStatus() {
    return {
      botPerguntas: {
        hasData: !!this.botPerguntasCache.data,
        isValid: this._isBotPerguntasCacheValid(),
        count: this.botPerguntasCache.data ? this.botPerguntasCache.data.length : 0,
        age: this.botPerguntasCache.timestamp ? Math.round((Date.now() - this.botPerguntasCache.timestamp) / 1000) : null,
        ttl: this.botPerguntasCache.ttl / 1000 // em segundos
      },
      articles: {
        hasData: !!this.articlesCache.data,
        isValid: this._isArticlesCacheValid(),
        count: this.articlesCache.data ? this.articlesCache.data.length : 0,
        age: this.articlesCache.timestamp ? Math.round((Date.now() - this.articlesCache.timestamp) / 1000) : null,
        ttl: this.articlesCache.ttl / 1000 // em segundos
      }
    };
  }
}

module.exports = new DataCache();
