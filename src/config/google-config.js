// Configurações do Google OAuth 2.0 para VeloHub
// VERSION: v1.2.0 | DATE: 2025-01-30 | AUTHOR: Lucas Gravina - VeloHub Development Team
// 
// INSTRUÇÕES:
// 1. Acesse https://console.cloud.google.com/
// 2. Crie um novo projeto ou selecione existente
// 3. Ative a API "Google Identity Services"
// 4. Vá para "APIs & Services" > "Credentials"
// 5. Clique em "Create Credentials" > "OAuth 2.0 Client IDs"
// 6. Configure:
//    - Application type: Web application
//    - Name: VeloHub
//    - Authorized JavaScript origins: 
//      - http://localhost:3000 (desenvolvimento)
//      - https://seudominio.com (produção)
//    - Authorized redirect URIs:
//      - http://localhost:3000 (desenvolvimento)
//      - https://seudominio.com (produção)
// 7. Copie o Client ID gerado e substitua abaixo

export const GOOGLE_CONFIG = {
  // Client ID do Google Cloud Console para VeloHub
  CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID || "278491073220-eb4ogvn3aifu0ut9mq3rvu5r9r9l3137.apps.googleusercontent.com",
  
  // Domínio de email autorizado
  AUTHORIZED_DOMAIN: process.env.REACT_APP_AUTHORIZED_DOMAIN || "velotax.com.br",
  
  // Duração da sessão em milissegundos (6 horas)
  SESSION_DURATION: 6 * 60 * 60 * 1000,
  
  // Chave para localStorage
  SESSION_KEY: 'velohub_user_session'
};

// Função para verificar se o domínio do email é autorizado
export function isAuthorizedDomain(email) {
  if (!email) return false;
  return email.endsWith(GOOGLE_CONFIG.AUTHORIZED_DOMAIN);
}

// Função para obter o Client ID
export function getClientId() {
  console.log('=== DEBUG GOOGLE CONFIG ===');
  console.log('GOOGLE_CONFIG.CLIENT_ID:', GOOGLE_CONFIG.CLIENT_ID);
  console.log('process.env.REACT_APP_GOOGLE_CLIENT_ID:', process.env.REACT_APP_GOOGLE_CLIENT_ID);
  console.log('Tipo do CLIENT_ID:', typeof GOOGLE_CONFIG.CLIENT_ID);
  console.log('========================');
  return GOOGLE_CONFIG.CLIENT_ID;
}
