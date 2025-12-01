// Configuração do VeloHub V3 - Baseada em Variáveis de Ambiente
// VERSION: v1.3.0 | DATE: 2025-01-30 | AUTHOR: Lucas Gravina - VeloHub Development Team

module.exports = {
  // ===========================================
  // APIs DE INTELIGÊNCIA ARTIFICIAL
  // ===========================================
  
  // OpenAI API Key (para fallback)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // Google Gemini API Key (IA primária)
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  
  // ===========================================
  // BANCO DE DADOS
  // ===========================================
  
  // MongoDB Connection String
  MONGODB_URI: process.env.MONGO_ENV,
  
  // ===========================================
  // GOOGLE SERVICES
  // ===========================================
  
  // Google OAuth (para SSO)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  
  
  // ===========================================
  // CONFIGURAÇÕES DO SERVIDOR
  // ===========================================
  
  // Ambiente de execução
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Porta do servidor
  PORT: process.env.PORT || 8080,
  
  
  // ===========================================
  // CONFIGURAÇÕES OPCIONAIS
  // ===========================================
  
  // Ponto Mais API (se necessário)
  PONTO_MAIS_API_KEY: process.env.PONTO_MAIS_API_KEY,
  PONTO_MAIS_COMPANY_ID: process.env.PONTO_MAIS_COMPANY_ID,
  
  // WhatsApp API URL (para módulo Escalações)
  // Em produção: vem do secret 'whatsapp-api-url'
  WHATSAPP_API_URL: process.env.WHATSAPP_API_URL,
  
  // WhatsApp Default JID (destinatário padrão para envio de mensagens)
  // Em produção: vem do secret 'whatsapp-default-jid'
  // Formato: número individual (5511999999999@s.whatsapp.net) ou grupo (120363400851545835@g.us)
  WHATSAPP_DEFAULT_JID: process.env.WHATSAPP_JID || process.env.WHATSAPP_DEFAULT_JID,
  
  // Cache timeout para dados do chatbot (em ms)
  CHATBOT_CACHE_TIMEOUT: parseInt(process.env.CHATBOT_CACHE_TIMEOUT) || 300000,
  
  // ===========================================
  // VALIDAÇÃO DE CONFIGURAÇÃO
  // ===========================================
  
  /**
   * Valida se as configurações essenciais estão presentes
   * @returns {Object} Status da validação
   */
  validateConfig() {
    const required = [
      'MONGO_ENV',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET'
    ];
    
    const optional = [
      'OPENAI_API_KEY',
      'GEMINI_API_KEY'
    ];
    
    const missing = required.filter(key => !this[key]);
    const available = optional.filter(key => this[key]);
    
    return {
      isValid: missing.length === 0,
      missing,
      available,
      hasAI: this.OPENAI_API_KEY || this.GEMINI_API_KEY
    };
  }
};
