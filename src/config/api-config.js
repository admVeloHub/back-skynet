/**
 * VeloHub V3 - API Configuration
 * VERSION: v1.0.1 | DATE: 2025-01-27 | AUTHOR: VeloHub Development Team
 */

/**
 * Obtém a URL base da API automaticamente baseada no ambiente
 * @returns {string} URL base da API
 */
export const getApiBaseUrl = () => {
  // Se há uma variável de ambiente definida, usar ela
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Se estamos em desenvolvimento, usar localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000/api';
  }
  
  // Em produção, detectar automaticamente a URL baseada no domínio atual
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    
    // Se estamos no Cloud Run, usar o mesmo domínio
    if (currentHost.includes('run.app')) {
      return `https://${currentHost}/api`;
    }
    
    // Fallback para URL padrão
    return process.env.REACT_APP_API_URL || 'https://velohub-278491073220.us-east1.run.app/api';
  }
  
  // Fallback para server-side rendering
  return process.env.REACT_APP_API_URL || 'https://velohub-278491073220.us-east1.run.app/api';
};

/**
 * URL base da API (calculada automaticamente)
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Log da configuração da API (apenas em desenvolvimento)
 */
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 API Config:', {
    baseUrl: API_BASE_URL,
    environment: process.env.NODE_ENV,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side'
  });
}
