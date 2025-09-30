// Configuração do VeloHub V3 - Baseada em Variáveis de Ambiente
// VERSION: v1.1.0 | DATE: 2025-01-27 | AUTHOR: Lucas Gravina - VeloHub Development Team

module.exports = {
  // ===========================================
  // APIs DE INTELIGÊNCIA ARTIFICIAL
  // ===========================================
  
  // OpenAI API Key (para fallback)
  OPENAI_API_KEY: process.env.GPT_API,
  
  // Google Gemini API Key (IA primária)
  GEMINI_API_KEY: process.env.GEMINI_API,
  
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
  
  // Google Sheets API Credentials (JSON string)
  GOOGLE_CREDENTIALS: process.env.GOOGLE_CREDENTIALS,
  
  // ===========================================
  // CONFIGURAÇÕES DO SERVIDOR
  // ===========================================
  
  // Ambiente de execução
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Porta do servidor
  PORT: process.env.PORT || 8080,
  
  // ===========================================
  // CONFIGURAÇÕES DO CHATBOT
  // ===========================================
  
  // Google Sheets ID para logs do chatbot
  CHATBOT_SPREADSHEET_ID: process.env.CHATBOT_SPREADSHEET_ID || '1tnWusrOW-UXHFM8GT3o0Du93QDwv5G3Ylvgebof9wfQ',
  
  // Nome da aba para logs de uso da IA
  CHATBOT_LOG_SHEET_NAME: process.env.CHATBOT_LOG_SHEET_NAME || 'Log_IA_Usage',
  
  // ===========================================
  // CONFIGURAÇÕES OPCIONAIS
  // ===========================================
  
  // Ponto Mais API (se necessário)
  PONTO_MAIS_API_KEY: process.env.PONTO_MAIS_API_KEY,
  PONTO_MAIS_COMPANY_ID: process.env.PONTO_MAIS_COMPANY_ID,
  
  
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
      'GEMINI_API_KEY',
      'GOOGLE_CREDENTIALS'
    ];
    
    const missing = required.filter(key => !this[key]);
    const available = optional.filter(key => this[key]);
    
    return {
      isValid: missing.length === 0,
      missing,
      available,
      hasAI: this.OPENAI_API_KEY || this.GEMINI_API_KEY,
      hasSheets: !!this.GOOGLE_CREDENTIALS
    };
  }
};
