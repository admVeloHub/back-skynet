// Sistema de Autenticação Centralizado para VeloHub
// VERSION: v1.2.0 | DATE: 2025-01-30 | AUTHOR: VeloHub Development Team
import { GOOGLE_CONFIG } from '../config/google-config';
import { API_BASE_URL } from '../config/api-config';

console.log('=== auth.js carregado ===');

// Configurações
const USER_SESSION_KEY = GOOGLE_CONFIG.SESSION_KEY;
const DOMINIO_PERMITIDO = GOOGLE_CONFIG.AUTHORIZED_DOMAIN;
const SESSION_DURATION = GOOGLE_CONFIG.SESSION_DURATION;

/**
 * Salva os dados do usuário e o timestamp da sessão no localStorage.
 * @param {object} userData - Objeto com dados do usuário (name, email, picture).
 */
function saveUserSession(userData) {
    const sessionData = {
        user: userData,
        loginTimestamp: new Date().getTime()
    };
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionData));
    console.log('Sessão salva:', sessionData);
}

/**
 * Registra login no backend para controle de sessões
 * @param {object} userData - Objeto com dados do usuário (name, email, picture).
 */
async function registerLoginSession(userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/session/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                colaboradorNome: userData.name,
                userEmail: userData.email
            })
        });

        const result = await response.json();
        
        if (result.success) {
            // Salvar sessionId no localStorage
            localStorage.setItem('velohub_session_id', result.sessionId);
            console.log('✅ Login registrado no backend:', result.sessionId);
            
            // Iniciar heartbeat após login bem-sucedido
            startHeartbeat();
        } else {
            console.error('❌ Erro ao registrar login:', result.error);
        }
    } catch (error) {
        console.error('❌ Erro ao registrar login:', error);
    }
}

/**
 * Recupera os dados da sessão do localStorage.
 * @returns {object | null} - Objeto com os dados da sessão ou null se não houver.
 */
function getUserSession() {
    const sessionData = localStorage.getItem(USER_SESSION_KEY);
    return sessionData ? JSON.parse(sessionData) : null;
}

/**
 * Verifica se a sessão do usuário é válida (existe e não expirou).
 * @returns {boolean}
 */
function isSessionValid() {
    const session = getUserSession();
    if (!session || !session.loginTimestamp) {
        return false;
    }

    const now = new Date().getTime();
    const elapsedTime = now - session.loginTimestamp;

    return elapsedTime < SESSION_DURATION;
}

/**
 * Realiza o logout do usuário.
 */
/**
 * Envia heartbeat para manter sessão ativa
 */
let heartbeatInterval = null;
let isHeartbeatActive = false;

async function sendHeartbeat() {
    try {
        const sessionId = localStorage.getItem('velohub_session_id');
        
        if (!sessionId) {
            return;
        }

        // Não enviar heartbeat se aba está oculta
        if (document.hidden) {
            return;
        }

        const url = `${API_BASE_URL}/auth/session/heartbeat`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId })
        });

        // Verificar se a resposta é JSON antes de parsear
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error(`❌ [Heartbeat] Resposta não é JSON. Status: ${response.status}, URL: ${url}`);
            console.error(`❌ [Heartbeat] Conteúdo recebido:`, text.substring(0, 200));
            return;
        }

        const result = await response.json();
        
        if (result.expired) {
            console.warn('⚠️ Sessão expirada - fazendo logout');
            stopHeartbeat();
            logout();
            return;
        }
        
        if (result.success) {
            // Heartbeat enviado com sucesso (log silencioso)
        } else {
            console.warn('⚠️ Erro ao enviar heartbeat:', result.error);
        }
    } catch (error) {
        // Log apenas se não for erro de rede comum (servidor não iniciado)
        if (error.message && !error.message.includes('Failed to fetch')) {
            console.error('❌ Erro ao enviar heartbeat:', error);
        }
    }
}

/**
 * Inicia sistema de heartbeat
 */
function startHeartbeat() {
    if (heartbeatInterval) {
        return; // Já está rodando
    }

    isHeartbeatActive = true;
    
    // Enviar heartbeat imediatamente
    sendHeartbeat();
    
    // Enviar heartbeat a cada 30 segundos
    heartbeatInterval = setInterval(() => {
        if (isHeartbeatActive && !document.hidden) {
            sendHeartbeat();
        }
    }, 30000); // 30 segundos

    console.log('💓 Heartbeat iniciado');
}

/**
 * Para sistema de heartbeat
 */
function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
    isHeartbeatActive = false;
    console.log('💓 Heartbeat parado');
}

/**
 * Reativa sessão existente quando usuário retorna
 */
async function reactivateSession() {
    try {
        const session = getUserSession();
        
        if (!session || !session.user || !session.user.email) {
            return false;
        }

        const response = await fetch(`${API_BASE_URL}/auth/session/reactivate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userEmail: session.user.email })
        });

        const result = await response.json();
        
        if (result.expired) {
            console.warn('⚠️ Sessão expirada - novo login necessário');
            logout();
            return false;
        }
        
        if (result.success) {
            // Atualizar sessionId se necessário
            if (result.sessionId) {
                localStorage.setItem('velohub_session_id', result.sessionId);
            }
            console.log('✅ Sessão reativada:', result.sessionId);
            return true;
        } else {
            console.warn('⚠️ Erro ao reativar sessão:', result.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao reativar sessão:', error);
        return false;
    }
}

/**
 * Registra logout no backend para controle de sessões
 */
async function registerLogoutSession() {
    try {
        const sessionId = localStorage.getItem('velohub_session_id');
        
        if (sessionId) {
            // Usar sendBeacon para garantir envio mesmo ao fechar janela
            const data = JSON.stringify({ sessionId });
            
            if (navigator.sendBeacon) {
                navigator.sendBeacon(
                    `${API_BASE_URL}/auth/session/logout`,
                    new Blob([data], { type: 'application/json' })
                );
            } else {
                // Fallback para fetch síncrono
                const response = await fetch(`${API_BASE_URL}/auth/session/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: data,
                    keepalive: true
                });

                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Logout registrado:', result.duration + ' min');
                }
            }
            
            // Limpar sessionId
            localStorage.removeItem('velohub_session_id');
        }
    } catch (error) {
        console.error('❌ Erro ao registrar logout:', error);
    }
}

function logout() {
    console.log('Logout realizado');
    
    // Parar heartbeat
    stopHeartbeat();
    
    // Registrar logout no backend antes de limpar localStorage
    registerLogoutSession();
    
    localStorage.removeItem(USER_SESSION_KEY);
    localStorage.removeItem('velohub_session_id');
    // Limpar também os dados antigos para compatibilidade
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPicture');
    
    // Recarregar a página para voltar ao login
    window.location.reload();
}

/**
 * Atualiza o cabeçalho da página para mostrar as informações do usuário logado.
 * @param {object} userData - Objeto com os dados do usuário (name, picture).
 */
function updateUserInfo(userData) {
    console.log('Atualizando informações do usuário:', userData);
    
    // Aguardar um pouco para garantir que o DOM esteja pronto
    setTimeout(() => {
        // Atualizar nome do usuário
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = userData.name || 'Usuário';
            console.log('Nome do usuário atualizado:', userData.name);
        } else {
            console.warn('Elemento user-name não encontrado');
        }
        
        // Atualizar avatar do usuário
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            if (userData.picture) {
                userAvatar.src = userData.picture;
                userAvatar.style.display = 'block';
                console.log('Avatar do usuário atualizado:', userData.picture);
            } else {
                userAvatar.style.display = 'none';
            }
        } else {
            console.warn('Elemento user-avatar não encontrado');
        }
        
        // Adicionar listener para logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            // Remove listeners existentes
            const newLogoutBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
            
            newLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                logout();
            });
            console.log('Botão de logout configurado');
        } else {
            console.warn('Elemento logout-btn não encontrado');
        }
        
        console.log('Informações do usuário atualizadas com sucesso');
    }, 100);
}

/**
 * Verifica o estado de autenticação e atualiza a UI.
 * @returns {Promise<boolean>} - true se usuário está logado, false caso contrário
 */
async function checkAuthenticationState() {
    console.log('=== Verificando estado de autenticação ===');
    
    // Verificar se há dados no localStorage (compatibilidade)
    const userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');
    const userPicture = localStorage.getItem('userPicture');
    console.log('Dados do localStorage:', { userEmail, userName, userPicture });
    
    if (isSessionValid()) {
        const session = getUserSession();
        console.log('Sessão válida encontrada:', session);
        
        // Tentar reativar sessão se necessário
        const reactivated = await reactivateSession();
        
        if (reactivated) {
            console.log('✅ Sessão reativada com sucesso');
        }
        
        // Iniciar heartbeat
        startHeartbeat();
        
        updateUserInfo(session.user);
        return true;
    } else {
        console.log('Sessão inválida ou expirada - fazendo logout');
        
        // Parar heartbeat se estiver rodando
        stopHeartbeat();
        
        // Se a sessão for inválida ou não existir, limpa qualquer resquício
        localStorage.removeItem(USER_SESSION_KEY);
        localStorage.removeItem('velohub_session_id');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('userPicture');
        
        return false;
    }
}

/**
 * Verifica se o domínio do email é autorizado
 * @param {string} email - Email do usuário
 * @returns {boolean}
 */
function isAuthorizedDomain(email) {
    if (!email) return false;
    return email.endsWith(DOMINIO_PERMITIDO);
}

/**
 * Função para decodificar JWT (compatibilidade com código existente)
 * @param {string} token - JWT token
 * @returns {object|null} - Payload decodificado ou null se erro
 */
function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Erro ao decodificar JWT:', error);
        return null;
    }
}

/**
 * Inicializa o Google Identity Services
 * @param {string} clientId - Client ID do Google (opcional, usa config se não fornecido)
 * @param {function} callback - Função de callback para o login
 */
function initializeGoogleSignIn(clientId = null, callback) {
    if (window.google && window.google.accounts) {
        const finalClientId = clientId || GOOGLE_CONFIG.CLIENT_ID;
        window.google.accounts.id.initialize({
            client_id: finalClientId,
            callback: callback,
            auto_select: false,
            cancel_on_tap_outside: true
        });
        console.log('Google Sign-In inicializado com Client ID:', finalClientId);
    } else {
        console.error('Google Identity Services não está disponível');
    }
}

// Exportar funções para uso global
export {
    saveUserSession,
    getUserSession,
    isSessionValid,
    logout,
    updateUserInfo,
    checkAuthenticationState,
    isAuthorizedDomain,
    decodeJWT,
    initializeGoogleSignIn,
    registerLoginSession,
    registerLogoutSession,
    startHeartbeat,
    stopHeartbeat,
    reactivateSession
};

// Listener para logout automático ao fechar página/navegador
window.addEventListener('beforeunload', () => {
    stopHeartbeat();
    registerLogoutSession();
});

// Listener para quando página fica oculta (aba muda, minimiza, etc)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pausar heartbeat quando aba está oculta
        // Mas não marcar como logout ainda
        console.log('👁️ Aba oculta - heartbeat pausado');
    } else {
        // Retomar heartbeat quando aba fica visível novamente
        if (isSessionValid() && !heartbeatInterval) {
            startHeartbeat();
            console.log('👁️ Aba visível - heartbeat retomado');
        }
    }
});

// Listener adicional para pagehide (mais confiável que beforeunload)
window.addEventListener('pagehide', (event) => {
    // Se página está sendo descarregada permanentemente
    if (event.persisted === false) {
        stopHeartbeat();
        registerLogoutSession();
    }
});

// Também disponibilizar globalmente para compatibilidade
window.saveUserSession = saveUserSession;
window.getUserSession = getUserSession;
window.isSessionValid = isSessionValid;
window.logout = logout;
window.updateUserInfo = updateUserInfo;
window.checkAuthenticationState = checkAuthenticationState;
window.isAuthorizedDomain = isAuthorizedDomain;
window.decodeJWT = decodeJWT;
window.initializeGoogleSignIn = initializeGoogleSignIn;
