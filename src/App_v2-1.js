/**
 * VeloHub V3 - Main Application Component
 * VERSION: v2.1.88 | DATE: 2025-01-30 | AUTHOR: VeloHub Development Team
 */

import React, { useState, useEffect, useRef } from 'react';
import { Home, FileText, MessageSquare, LifeBuoy, Book, Search, User, Sun, Moon, FilePlus, Bot, GraduationCap, Map, Puzzle, PlusSquare, Send, ThumbsUp, ThumbsDown, BookOpen, X, RefreshCw } from 'lucide-react';
import { mainAPI, veloNewsAPI, articlesAPI, faqAPI } from './services/api';
import { checkAuthenticationState, updateUserInfo, getUserSession, stopHeartbeat } from './services/auth';
import { API_BASE_URL } from './config/api-config';
import NewsHistoryModal from './components/NewsHistoryModal';
import LoginPage from './components/LoginPage';
import Chatbot from './components/Chatbot';
import SupportModal from './components/SupportModal';
import EscalacoesPage from './pages/EscalacoesPage';
import { formatArticleContent, formatPreviewText, formatResponseText } from './utils/textFormatter';

// Sistema de gerenciamento de estado para modal crítico
const CriticalModalManager = {
  // Chaves para localStorage
  ACKNOWLEDGED_KEY: 'velohub-critical-acknowledged',
  REMIND_LATER_KEY: 'velohub-remind-later',
  SHOW_REMIND_BUTTON_KEY: 'velohub-show-remind-button',
  LAST_CRITICAL_KEY: 'velohub-last-critical-news',
  
  // Verificar se o usuário já foi ciente de uma notícia específica
  isAcknowledged: (newsTitle = null) => {
    if (newsTitle) {
      // Se tem título específico, verificar por título
      const acknowledgedNews = localStorage.getItem(CriticalModalManager.ACKNOWLEDGED_KEY);
      return acknowledgedNews === newsTitle;
    }
    // Fallback para compatibilidade
    return localStorage.getItem(CriticalModalManager.ACKNOWLEDGED_KEY) === 'true';
  },
  
  // Marcar como ciente de uma notícia específica
  setAcknowledged: (newsTitle = null) => {
    if (newsTitle) {
      // Salvar o título da notícia como chave de reconhecimento
      localStorage.setItem(CriticalModalManager.ACKNOWLEDGED_KEY, newsTitle);
    } else {
      // Fallback para compatibilidade
      localStorage.setItem(CriticalModalManager.ACKNOWLEDGED_KEY, 'true');
    }
  },
  
  // Verificar se deve lembrar mais tarde
  shouldRemindLater: () => {
    const remindLater = localStorage.getItem(CriticalModalManager.REMIND_LATER_KEY);
    if (!remindLater) return false;
    
    const remindTime = parseInt(remindLater);
    const now = Date.now();
    const threeMinutes = 3 * 60 * 1000; // 3 minutos em millisegundos
    
    return now >= remindTime;
  },
  
  // Definir lembrete para 3 minutos
  setRemindLater: () => {
    const threeMinutesFromNow = Date.now() + (3 * 60 * 1000);
    localStorage.setItem(CriticalModalManager.REMIND_LATER_KEY, threeMinutesFromNow.toString());
    // Marcar que o botão "Me lembre mais tarde" já foi usado
    localStorage.setItem(CriticalModalManager.SHOW_REMIND_BUTTON_KEY, 'false');
  },
  
  // Limpar lembrete
  clearRemindLater: () => {
    localStorage.removeItem(CriticalModalManager.REMIND_LATER_KEY);
  },
  
  // Verificar se deve mostrar o botão "Me lembre mais tarde"
  shouldShowRemindButton: () => {
    return localStorage.getItem(CriticalModalManager.SHOW_REMIND_BUTTON_KEY) !== 'false';
  },
  
  // Verificar se deve mostrar o modal
  shouldShowModal: (criticalNews) => {
    if (!criticalNews) return false;
    
    // Se já foi ciente desta notícia específica, não mostrar
    if (CriticalModalManager.isAcknowledged(criticalNews.title)) {
      return false;
    }
    
    // Se tem lembrete ativo, mostrar
    if (CriticalModalManager.shouldRemindLater()) {
      CriticalModalManager.clearRemindLater(); // Limpar após verificar
      return true;
    }
    
    // Se não tem lembrete, mostrar normalmente
    return true;
  },
  
  // Gerenciar a última notícia crítica vista
  getLastCriticalNews: () => {
    return localStorage.getItem(CriticalModalManager.LAST_CRITICAL_KEY);
  },
  
  setLastCriticalNews: (criticalKey) => {
    localStorage.setItem(CriticalModalManager.LAST_CRITICAL_KEY, criticalKey);
  },
  
  // Verificar se é uma notícia crítica nova
  isNewCriticalNews: (criticalKey) => {
    const lastCritical = CriticalModalManager.getLastCriticalNews();
    return lastCritical !== criticalKey;
  },
  
  // Resetar o estado para uma nova notícia crítica
  resetForNewCriticalNews: () => {
    // RESETAR COMPLETAMENTE O ESTADO
    localStorage.removeItem(CriticalModalManager.ACKNOWLEDGED_KEY);
    localStorage.removeItem(CriticalModalManager.REMIND_LATER_KEY);
    localStorage.setItem(CriticalModalManager.SHOW_REMIND_BUTTON_KEY, 'true');
  },
  
  // Função de debug para limpar manualmente o estado (útil para testes)
  debugClearState: () => {
    console.log('🧹 Limpando estado manualmente para debug...');
    localStorage.removeItem(CriticalModalManager.ACKNOWLEDGED_KEY);
    localStorage.removeItem(CriticalModalManager.REMIND_LATER_KEY);
    localStorage.setItem(CriticalModalManager.SHOW_REMIND_BUTTON_KEY, 'true');
    console.log('✅ Estado limpo manualmente');
  }
};

// ===== FUNÇÕES AUXILIARES PARA LÓGICA DE URGÊNCIA =====

/**
 * Verifica se notícia crítica passou das 12 horas
 * @param {string|Date} createdAt - Data de criação da notícia
 * @returns {boolean} true se passou de 12 horas
 */
const isExpired12Hours = (createdAt) => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now - created;
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours >= 12;
};

// Função global para debug (disponível no console do navegador)
window.debugCriticalModal = () => {
  console.log('🔧 Debug do Modal Crítico');
  console.log('📝 Estado atual:', {
    acknowledged: localStorage.getItem(CriticalModalManager.ACKNOWLEDGED_KEY),
    remindLater: localStorage.getItem(CriticalModalManager.REMIND_LATER_KEY),
    showRemindButton: localStorage.getItem(CriticalModalManager.SHOW_REMIND_BUTTON_KEY),
    lastCriticalNews: CriticalModalManager.getLastCriticalNews()
  });
  console.log('🧹 Para limpar o estado, execute: CriticalModalManager.debugClearState()');
  console.log('🔄 Para forçar nova notícia, execute: CriticalModalManager.setLastCriticalNews("")'  );
};

// Componente do Footer
const Footer = ({ isDarkMode }) => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="velohub-footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <p className="footer-text">
              © {currentYear} VeloHub VeloTax. 
            </p>
          </div>
          <div className="footer-section">
            <p className="footer-text">
              v2.2.0
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Componente do Cabeçalho
const Header = ({ activePage, setActivePage, isDarkMode, toggleDarkMode }) => {
  const navItems = ['Home', 'VeloBot', 'Artigos', 'Apoio', 'Escalações', 'VeloAcademy'];
  const [unreadTicketsCount, setUnreadTicketsCount] = useState(0);

  // Função para buscar contagem de tickets não visualizados
  const fetchUnreadTicketsCount = async () => {
    try {
      const session = getUserSession();
      if (!session?.user?.email) {
        setUnreadTicketsCount(0);
        return;
      }

      // Buscar tickets não visualizados do servidor
      const response = await fetch(`${API_BASE_URL}/support/tickets/unread-count?userEmail=${encodeURIComponent(session.user.email)}`);
      const data = await response.json();
      
      if (data.success) {
        // Obter objeto de tickets visualizados do localStorage (estrutura: { "TKC-000001": "2025-01-30T10:00:00.000Z" })
        const viewedTicketsRaw = localStorage.getItem('velohub-viewed-tickets');
        let viewedTickets = {};
        
        // Migração: se for array antigo, converter para objeto
        if (viewedTicketsRaw) {
          try {
            const parsed = JSON.parse(viewedTicketsRaw);
            if (Array.isArray(parsed)) {
              // Migrar array antigo para objeto (usar timestamp atual como fallback)
              viewedTickets = {};
              parsed.forEach(ticketId => {
                viewedTickets[ticketId] = new Date().toISOString();
              });
              // Salvar estrutura nova
              localStorage.setItem('velohub-viewed-tickets', JSON.stringify(viewedTickets));
            } else {
              viewedTickets = parsed;
            }
          } catch (e) {
            console.error('Erro ao parsear viewedTickets:', e);
            viewedTickets = {};
          }
        }
        
        // Filtrar tickets que têm novas mensagens após a última visualização
        const unviewedTickets = data.tickets.filter(ticket => {
          const lastViewedTimestamp = viewedTickets[ticket._id];
          
          // Se nunca foi visualizado, considerar como não visualizado
          if (!lastViewedTimestamp) {
            return true;
          }
          
          // Se não tem lastMessageTimestamp, considerar como visualizado (ticket antigo)
          if (!ticket.lastMessageTimestamp) {
            return false;
          }
          
          // Comparar timestamps: se última mensagem é mais recente que última visualização, há novas mensagens
          const lastMessageDate = new Date(ticket.lastMessageTimestamp);
          const lastViewedDate = new Date(lastViewedTimestamp);
          
          return lastMessageDate > lastViewedDate;
        });
        
        setUnreadTicketsCount(unviewedTickets.length);
      }
    } catch (error) {
      console.error('Erro ao buscar contagem de tickets não visualizados:', error);
    }
  };

  // Buscar contagem quando componente monta e quando página muda para Apoio
  useEffect(() => {
    fetchUnreadTicketsCount();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchUnreadTicketsCount, 30000);
    
    // Escutar evento de tickets visualizados
    const handleTicketsViewed = () => {
      fetchUnreadTicketsCount();
    };
    
    window.addEventListener('tickets-viewed', handleTicketsViewed);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('tickets-viewed', handleTicketsViewed);
    };
  }, [activePage]);

  // Quando usuário clica em Apoio, marcar todos os tickets como visualizados
  const handleNavClick = (item) => {
    console.log('Clicou em:', item); // Debug
    
    if (item === 'VeloAcademy') {
      console.log('Redirecionando para VeloAcademy...'); // Debug
      window.open('https://veloacademy.vercel.app', '_blank');
      return; // Não muda a página ativa para VeloAcademy
    }
    
    // Se clicou em Apoio, marcar tickets como visualizados
    if (item === 'Apoio') {
      markTicketsAsViewed();
    }
    
    console.log('Mudando para página:', item); // Debug
    setActivePage(item);
  };

  // Função para marcar tickets como visualizados
  const markTicketsAsViewed = async () => {
    try {
      const session = getUserSession();
      if (!session?.user?.email) return;

      // Buscar tickets não visualizados
      const response = await fetch(`${API_BASE_URL}/support/tickets/unread-count?userEmail=${encodeURIComponent(session.user.email)}`);
      const data = await response.json();
      
      if (data.success && data.tickets.length > 0) {
        // Obter lista atual de tickets visualizados
        const viewedTickets = JSON.parse(localStorage.getItem('velohub-viewed-tickets') || '[]');
        
        // Adicionar IDs dos tickets não visualizados à lista
        const ticketIds = data.tickets.map(ticket => ticket._id);
        const updatedViewedTickets = [...new Set([...viewedTickets, ...ticketIds])];
        
        // Salvar no localStorage
        localStorage.setItem('velohub-viewed-tickets', JSON.stringify(updatedViewedTickets));
        
        // Atualizar contagem
        setUnreadTicketsCount(0);
      }
    } catch (error) {
      console.error('Erro ao marcar tickets como visualizados:', error);
    }
  };

  return (
    <header className="velohub-header">
      <div className="header-container">
        <div className="velohub-logo" id="logo-container">
          <img 
            id="logo-image" 
            className="logo-image" 
            src={isDarkMode ? "/VeloHubLogo darktheme.png" : "/VeloHubLogo 2.png"} 
            alt="VeloHub Logo" 
          />
        </div>
        
        <nav className="nav-menu">
          {navItems.map(item => (
            <button
              key={item}
              onClick={() => handleNavClick(item)}
              className={`nav-link ${activePage === item ? 'active' : ''}`}
              style={{ position: 'relative' }}
            >
              {item}
              {item === 'Apoio' && unreadTicketsCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    backgroundColor: '#ff0000',
                    color: 'white',
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: '1',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                  title={`${unreadTicketsCount} ticket(s) não visualizado(s)`}
                >
                  {unreadTicketsCount > 9 ? '9+' : unreadTicketsCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="user-section">
          <div className="user-info">
            <img id="user-avatar" className="user-avatar" src="" alt="Avatar" />
            <span id="user-name" className="user-name">Usuário VeloHub</span>
            <button id="logout-btn" className="logout-btn">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>

        <div className="theme-switch-wrapper" id="theme-toggle" onClick={toggleDarkMode}>
          <i className='bx bx-sun theme-icon'></i>
          <i className='bx bx-moon theme-icon'></i>
        </div>
      </div>
    </header>
  );
};

// Componente do Modal de Notícia Crítica - VERSÃO MELHORADA
const CriticalNewsModal = ({ news, onClose, onAcknowledge }) => {
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  const handleClose = async () => {
    if (isAcknowledged) {
      CriticalModalManager.setAcknowledged(news.title);
      // Enviar confirmação para o MongoDB
      if (onAcknowledge && news._id) {
        try {
          await onAcknowledge(news._id);
        } catch (error) {
          console.error('❌ Erro ao enviar confirmação de ciência:', error);
        }
      }
    }
    onClose();
  };

  const handleRemindLater = () => {
    CriticalModalManager.setRemindLater();
    onClose();
  };

  // Verificar se deve mostrar o botão "Me lembre mais tarde"
  const shouldShowRemindButton = CriticalModalManager.shouldShowRemindButton();

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{backgroundColor: 'rgba(39, 42, 48, 0.8)'}}>
              <div className="rounded-lg shadow-2xl p-8 max-w-2xl w-full mx-4 velohub-container" style={{borderRadius: '12px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'}}>
        <h2 className="text-2xl font-bold text-red-600 mb-4">{news.title}</h2>
                 <div 
             className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200"
             dangerouslySetInnerHTML={{ __html: news.content || '' }}
         />
        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={handleClose}
            disabled={!isAcknowledged}
            className={`px-6 py-2 rounded-md font-semibold text-white transition-colors duration-300 ${isAcknowledged ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-500 cursor-not-allowed'}`}
          >
            Fechar
          </button>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center">
              <input
                id="acknowledge"
                type="checkbox"
                checked={isAcknowledged}
                onChange={() => setIsAcknowledged(!isAcknowledged)}
                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="acknowledge" className="ml-2 text-gray-800 dark:text-gray-200 font-medium">
                Ciente
              </label>
            </div>
            {shouldShowRemindButton && (
              <button
                onClick={handleRemindLater}
                className="text-[#272A30] hover:underline font-medium text-sm -mt-1"
              >
                Me lembre mais tarde
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente da Página Principal - VERSÃO MELHORADA
export default function App_v2() {
  const [activePage, setActivePage] = useState('Home');
  const [criticalNews, setCriticalNews] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showRemindLater, setShowRemindLater] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [veloNews, setVeloNews] = useState([]);
  const [acknowledgedNewsIds, setAcknowledgedNewsIds] = useState([]);

  useEffect(() => {
    // Verificar autenticação primeiro
    const checkAuth = async () => {
      const isAuth = await checkAuthenticationState();
      setIsAuthenticated(isAuth);
      setIsCheckingAuth(false);
    };

    // Aguardar um pouco para garantir que o DOM está pronto
    setTimeout(checkAuth, 100);
    
    // Cleanup: parar heartbeat quando componente desmonta
    return () => {
      if (typeof stopHeartbeat === 'function') {
        stopHeartbeat();
      }
    };
  }, []);

  useEffect(() => {
    // Carregar tema salvo
    const savedTheme = localStorage.getItem('velohub-theme') || 'light';
    const isDark = savedTheme === 'dark';
    setIsDarkMode(isDark);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('velohub-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('velohub-theme', 'light');
    }
  }, [isDarkMode]);


  // Inicializar funcionalidades do header
  useEffect(() => {
    // Importar e inicializar o header dinamicamente
    const initHeader = async () => {
      try {
        const { VeloHubHeader } = await import('./header-theme.js');
        if (VeloHubHeader && VeloHubHeader.init) {
          VeloHubHeader.init();
        }
      } catch (error) {
        console.log('Header inicializado via DOM');
      }
    };
    
    initHeader();
  }, []);

  const handleLoginSuccess = (userData) => {
    console.log('Login realizado com sucesso:', userData);
    setIsAuthenticated(true);
    updateUserInfo(userData);
  };

  const [refreshAcknowledgedNews, setRefreshAcknowledgedNews] = useState(null);
  const [updateAcknowledgedNewsCallback, setUpdateAcknowledgedNewsCallback] = useState(null);

  const renderContent = () => {
    switch (activePage) {
      case 'Home':
        return <HomePage 
          setCriticalNews={setCriticalNews} 
          setShowHistoryModal={setShowHistoryModal} 
          setVeloNews={setVeloNews} 
          veloNews={veloNews}
          setRefreshAcknowledgedNews={setRefreshAcknowledgedNews}
          setAcknowledgedNewsIds={setAcknowledgedNewsIds}
          setUpdateAcknowledgedNewsCallback={setUpdateAcknowledgedNewsCallback}
        />;
             case 'VeloBot':
        return <ProcessosPage />;
      case 'Artigos':
        return <ArtigosPage />;
      case 'Apoio':
        return <ApoioPage />;
      case 'Escalações':
        return <EscalacoesPage />;
      case 'VeloAcademy':
        return <div className="text-center p-10 text-gray-800 dark:text-gray-200"><h1 className="text-3xl">VeloAcademy</h1><p>Clique no botão VeloAcademy no header para acessar a plataforma.</p></div>;
      default:
        return <HomePage 
          setCriticalNews={setCriticalNews} 
          setShowHistoryModal={setShowHistoryModal} 
          setVeloNews={setVeloNews} 
          veloNews={veloNews}
          setRefreshAcknowledgedNews={setRefreshAcknowledgedNews}
          setAcknowledgedNewsIds={setAcknowledgedNewsIds}
        />;
    }
  };

  // Mostrar tela de carregamento enquanto verifica autenticação
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Mostrar tela de login se não estiver autenticado
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Mostrar aplicação principal se estiver autenticado
  return (
    <div className="min-h-screen font-sans velohub-bg">
      <Header activePage={activePage} setActivePage={setActivePage} isDarkMode={isDarkMode} toggleDarkMode={() => setIsDarkMode(!isDarkMode)} />
      <main>
        {renderContent()}
      </main>
      {criticalNews && (
        <CriticalNewsModal 
          news={criticalNews} 
          onClose={() => setCriticalNews(null)}
          onAcknowledge={async (newsId) => {
            try {
              const session = getUserSession();
              const userEmail = session?.user?.email || 'unknown';
              const userName = session?.user?.name || 'Usuário';
              
              const response = await fetch(`${API_BASE_URL}/velo-news/${newsId}/acknowledge`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: userEmail,
                  userName: userName
                })
              });

              const result = await response.json();
              
              if (result.success) {
                console.log('✅ Notícia confirmada no MongoDB:', result.message);
                // Adicionar ID imediatamente ao estado local para remover destaque vermelho
                if (updateAcknowledgedNewsCallback) {
                  updateAcknowledgedNewsCallback(newsId);
                }
                // Recarregar acknowledges do servidor para garantir sincronização
                if (refreshAcknowledgedNews) {
                  await refreshAcknowledgedNews();
                }
              } else {
                console.error('❌ Erro ao confirmar notícia:', result.error);
              }
            } catch (error) {
              console.error('❌ Erro ao confirmar notícia:', error);
            }
          }}
        />
      )}
      
      {/* Modal de Histórico de Notícias */}
      <NewsHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        news={veloNews}
        acknowledgedNewsIds={acknowledgedNewsIds}
        onAcknowledge={async (newsId, userName) => {
          try {
            const session = getUserSession();
            const userEmail = session?.user?.email || 'unknown';
            const finalUserName = userName || session?.user?.name || 'Usuário';
            
            const response = await fetch(`${API_BASE_URL}/velo-news/${newsId}/acknowledge`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: userEmail,
                userName: finalUserName
              })
            });

            const result = await response.json();
            
            if (result.success) {
              console.log('✅ Notícia marcada como ciente no MongoDB:', result.message);
              // Recarregar acknowledges após confirmação
              if (refreshAcknowledgedNews) {
                await refreshAcknowledgedNews();
              }
            } else {
              console.error('❌ Erro ao marcar notícia como ciente:', result.error);
            }
          } catch (error) {
            console.error('❌ Erro ao marcar notícia como ciente:', error);
          }
        }}
      />
      <Footer isDarkMode={isDarkMode} />
      </div>
    );
}

// Componente do Widget de Ponto
const PontoWidget = () => {
  const [status, setStatus] = useState('loading');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handlePonto = async (tipo) => {
    try {
      setLoading(true);
      setMessage('');
      
      const response = await fetch(`${API_BASE_URL}/ponto/${tipo}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(data.message);
        // Atualizar status após bater ponto
        setTimeout(() => fetchStatus(), 1000);
      } else {
        setMessage(`Erro: ${data.error}`);
      }
    } catch (error) {
      setMessage('Erro ao conectar com o sistema');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ponto/status`);
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data.status || 'unknown');
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'in': return 'bg-green-500';
      case 'out': return 'bg-gray-400';
      case 'loading': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'in': return 'Dentro';
      case 'out': return 'Fora';
      case 'loading': return 'Carregando...';
      default: return 'Indefinido';
    }
  };

  return (
    <div className="velohub-container rounded-lg p-4" style={{border: '1px solid var(--cor-borda)'}}>
      {/* Status Atual */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className={`h-3 w-3 ${getStatusColor()} rounded-full`}></span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {getStatusText()}
          </span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>

      {/* Botões de Ponto */}
      <div className="space-y-2">
        <button
          onClick={() => handlePonto('entrada')}
          disabled={loading || status === 'in'}
          className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            status === 'in' 
              ? 'bg-green-100 text-green-800 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? 'Registrando...' : 'Entrada'}
        </button>
        
        <button
          onClick={() => handlePonto('saida')}
          disabled={loading || status === 'out'}
          className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            status === 'out' 
              ? 'bg-gray-100 text-gray-800 cursor-not-allowed' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {loading ? 'Registrando...' : 'Saída'}
        </button>
      </div>

      {/* Mensagem de Status */}
      {message && (
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-xs text-blue-800 dark:text-blue-200 text-center">
            {message}
          </p>
        </div>
      )}
    </div>
  );
};

// Conteúdo da Página Home - VERSÃO MELHORADA
const HomePage = ({ setCriticalNews, setShowHistoryModal, setVeloNews, veloNews, setRefreshAcknowledgedNews, setAcknowledgedNewsIds: setParentAcknowledgedNewsIds, setUpdateAcknowledgedNewsCallback }) => {
    const [selectedNews, setSelectedNews] = useState(null);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [recentItems, setRecentItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(Date.now());
    const [lastCriticalNewsId, setLastCriticalNewsId] = useState(null);
    const [acknowledgedNewsIds, setAcknowledgedNewsIds] = useState([]);
    
    // Estados dos módulos - controlados pelo Console VeloHub
    const [moduleStatus, setModuleStatus] = useState({
        'credito-trabalhador': 'on',
        'credito-pessoal': 'on', 
        'antecipacao': 'off',
        'pagamento-antecipado': 'on',
        'modulo-irpf': 'off',
        'seguro-cred': 'on',
        'seguro-cel': 'on'
    });

    // Função para buscar status dos módulos do Console VeloHub
    const fetchModuleStatus = async () => {
        try {
            const url = `${API_BASE_URL}/module-status`;
            console.log('🔍 HomePage: Buscando status dos módulos em:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                const statusData = await response.json();
                console.log('✅ HomePage: Status dos módulos recebido:', statusData);
                setModuleStatus(statusData);
            } else {
                console.error('❌ HomePage: Erro HTTP:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('❌ HomePage: Erro ao buscar status dos módulos:', error);
        }
    };

    // Função para carregar acknowledges do usuário
    const loadAcknowledgedNews = async () => {
        try {
            const session = getUserSession();
            if (!session?.user?.email) {
                console.log('⚠️ Usuário não autenticado, não é possível carregar acknowledges');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/velo-news/acknowledgments/${encodeURIComponent(session.user.email)}`);
            const data = await response.json();
            
            if (data.success) {
                console.log(`✅ Acknowledges carregados: ${data.acknowledgedNewsIds.length} notícias confirmadas`);
                const acknowledgedIds = data.acknowledgedNewsIds || [];
                setAcknowledgedNewsIds(acknowledgedIds);
                // Atualizar também no componente pai
                if (setParentAcknowledgedNewsIds) {
                    setParentAcknowledgedNewsIds(acknowledgedIds);
                }
            } else {
                console.error('❌ Erro ao carregar acknowledges:', data.error);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar acknowledges:', error);
        }
    };

    // Função para adicionar ID imediatamente ao estado local
    const addAcknowledgedNewsId = (newsId) => {
        const newsIdString = String(newsId);
        setAcknowledgedNewsIds(prev => {
            if (!prev.includes(newsIdString) && !prev.some(id => String(id) === newsIdString)) {
                const updated = [...prev, newsIdString];
                // Atualizar também no componente pai
                if (setParentAcknowledgedNewsIds) {
                    setParentAcknowledgedNewsIds(updated);
                }
                return updated;
            }
            return prev;
        });
    };

    // Passar função de refresh e callback de atualização para o componente pai
    useEffect(() => {
        if (setRefreshAcknowledgedNews) {
            setRefreshAcknowledgedNews(() => loadAcknowledgedNews);
        }
        if (setUpdateAcknowledgedNewsCallback) {
            setUpdateAcknowledgedNewsCallback(() => addAcknowledgedNewsId);
        }
    }, [setRefreshAcknowledgedNews, setUpdateAcknowledgedNewsCallback]);

    // Função para abrir modal de artigo
    const handleArticleClick = (article) => {
        setSelectedArticle(article);
    };

    // Função para renderizar status do módulo
    const renderModuleStatus = (moduleKey, moduleName, title) => {
        const status = moduleStatus[moduleKey];
        let statusConfig = {};
        
        switch (status) {
            case 'on':
                statusConfig = {
                    color: 'bg-green-500',
                    animate: 'animate-pulse',
                    title: 'Serviço Online - Funcionando normalmente'
                };
                break;
            case 'revisao':
                statusConfig = {
                    color: 'bg-yellow-500',
                    animate: '',
                    title: 'Em Revisão - Serviço temporariamente indisponível'
                };
                break;
            case 'off':
                statusConfig = {
                    color: 'bg-red-500',
                    animate: '',
                    title: 'Serviço Offline - Indisponível no momento'
                };
                break;
            default:
                statusConfig = {
                    color: 'bg-gray-500',
                    animate: '',
                    title: 'Status Desconhecido'
                };
        }
        
        return (
            <div className="flex items-center gap-1 text-sm p-1 rounded hover:bg-gray-50 transition-colors" title={statusConfig.title}>
                <span className={`h-2 w-2 ${statusConfig.color} rounded-full ${statusConfig.animate}`}></span>
                <span style={{color: 'var(--cor-texto-principal)'}}>{moduleName}</span>
            </div>
        );
    };

    // ===== FUNÇÃO PARA ACKNOWLEDGE DE NOTÍCIAS =====
    const handleAcknowledgeNews = async (newsId, userName) => {
        try {
            const response = await fetch(`${API_BASE_URL}/velo-news/${newsId}/acknowledge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user?.email || 'unknown',
                    userName: userName || user?.name || 'Usuário'
                })
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Notícia confirmada:', result.message);
                // Atualizar a notícia local para mostrar como confirmada
                setVeloNews(prevNews => 
                    prevNews.map(news => 
                        news._id === newsId 
                            ? { ...news, acknowledged: true }
                            : news
                    )
                );
            } else {
                console.error('❌ Erro ao confirmar notícia:', result.error);
            }
        } catch (error) {
            console.error('❌ Erro ao confirmar notícia:', error);
        }
    };

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                const velonewsResponse = await veloNewsAPI.getAll();
                
                // ✅ Handshake das IAs do VeloBot movido para o componente Chatbot.js
                // O handshake agora é executado apenas quando a aba VeloBot é acessada
                
                // ✅ Usar todos os velonews recebidos da API
                const sortedVeloNews = [...velonewsResponse.data].sort((a, b) => {
                    const da = new Date(a.createdAt || a.updatedAt || 0) || 0;
                    const db = new Date(b.createdAt || b.updatedAt || 0) || 0;
                    return db - da;
                });
                
                console.log('🔍 FRONTEND - veloNews[0]:', sortedVeloNews[0]);
                console.log('🔍 FRONTEND - solved tipo:', typeof sortedVeloNews[0]?.solved);
                console.log('🔍 FRONTEND - solved valor:', sortedVeloNews[0]?.solved);
                setVeloNews(sortedVeloNews);
                
                // Carregar acknowledges primeiro
                await loadAcknowledgedNews();
                
                // Aguardar um pouco para garantir que acknowledgedNewsIds foi atualizado
                // (usar uma função auxiliar para verificar após carregar)
                const checkCriticalNews = async () => {
                    // Buscar acknowledges novamente para garantir que temos os dados mais recentes
                    const session = getUserSession();
                    if (session?.user?.email) {
                        try {
                            const ackResponse = await fetch(`${API_BASE_URL}/velo-news/acknowledgments/${encodeURIComponent(session.user.email)}`);
                            const ackData = await ackResponse.json();
                            const currentAcknowledgedIds = ackData.success ? (ackData.acknowledgedNewsIds || []) : [];
                            
                            // Verificar notícias críticas - buscar a MAIS RECENTE
                            const criticalNews = sortedVeloNews.filter(n => n.is_critical === 'Y');
                            const mostRecentCritical = criticalNews.length > 0 ? criticalNews[0] : null;
                            
                            if (mostRecentCritical) {
                                // Verificar se já foi confirmada
                                const isAcknowledged = currentAcknowledgedIds.includes(mostRecentCritical._id);
                                
                                if (!isAcknowledged) {
                                    // Criar uma chave única para a notícia crítica mais recente (ID + título)
                                    const criticalKey = `${mostRecentCritical._id}-${mostRecentCritical.title}`;
                                    
                                    // Verificar se é uma notícia crítica nova usando localStorage
                                    if (CriticalModalManager.isNewCriticalNews(criticalKey)) {
                                        CriticalModalManager.resetForNewCriticalNews();
                                        CriticalModalManager.setLastCriticalNews(criticalKey);
                                        setLastCriticalNewsId(criticalKey);
                                    }
                                    
                                    if (CriticalModalManager.shouldShowModal(mostRecentCritical)) {
                                        console.log('🚨 Modal crítico exibido para notícia mais recente:', mostRecentCritical.title);
                                        setCriticalNews(mostRecentCritical);
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('❌ Erro ao verificar notícia crítica:', error);
                        }
                    }
                };
                
                await checkCriticalNews();

                // Buscar artigos recentes para o sidebar
                const fetchRecentItems = async () => {
                    try {
                        const articlesResponse = await articlesAPI.getAll();
                        
                        if (articlesResponse.data && articlesResponse.data.length > 0) {
                            const recentArticles = articlesResponse.data
                                .filter(article => article.createdAt)
                                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                .slice(0, 3);

                            setRecentItems(recentArticles);
                        } else {
                            setRecentItems([]);
                        }
                    } catch (error) {
                        console.error('Erro ao buscar artigos recentes:', error);
                        setRecentItems([]);
                    }
                };

                fetchRecentItems();
                
                // Carregar status dos módulos
                fetchModuleStatus();
            } catch (error) {
                console.error('❌ Erro ao carregar dados da API:', error);
                setVeloNews([]);
                setCriticalNews(null);
                setRecentItems([]);
            } finally {
                setLoading(false);
            }
        };
        
        fetchAllData();
        
        // Carregar status dos módulos imediatamente ao carregar a página
        fetchModuleStatus();
    }, [setCriticalNews, lastCriticalNewsId]);

    // Refresh inteligente - verifica mudanças antes de atualizar
    useEffect(() => {
        const intelligentRefresh = async () => {
            try {
                // Buscar novos dados
                const [newVeloNewsData, newArticlesData, newModuleStatusData] = await Promise.all([
                    veloNewsAPI.getAll().then(res => res.data || []),
                    articlesAPI.getAll().then(res => res.data || []),
                    fetch(`${API_BASE_URL}/module-status`).then(res => res.ok ? res.json() : {})
                ]);
                
                // Comparar veloNews
                const sortedNewVeloNews = [...newVeloNewsData].sort((a, b) => {
                    const da = new Date(a.createdAt || a.updatedAt || 0) || 0;
                    const db = new Date(b.createdAt || b.updatedAt || 0) || 0;
                    return db - da;
                });
                
                const veloNewsChanged = JSON.stringify(sortedNewVeloNews) !== JSON.stringify(veloNews);
                const moduleStatusChanged = JSON.stringify(newModuleStatusData) !== JSON.stringify(moduleStatus);
                
                // Atualizar apenas se houver mudanças
                if (veloNewsChanged) {
                    console.log('🔄 Mudanças detectadas em VeloNews, atualizando...');
                    setVeloNews(sortedNewVeloNews);
                    
                    // Recarregar acknowledges antes de verificar notícias críticas
                    await loadAcknowledgedNews();
                    
                    // Verificar notícias críticas após carregar acknowledges
                    const session = getUserSession();
                    if (session?.user?.email) {
                        try {
                            const ackResponse = await fetch(`${API_BASE_URL}/velo-news/acknowledgments/${encodeURIComponent(session.user.email)}`);
                            const ackData = await ackResponse.json();
                            const currentAcknowledgedIds = ackData.success ? (ackData.acknowledgedNewsIds || []) : [];
                            
                            const criticalNews = sortedNewVeloNews.filter(n => n.is_critical === 'Y');
                            const mostRecentCritical = criticalNews.length > 0 ? criticalNews[0] : null;
                            
                            if (mostRecentCritical) {
                                // Verificar se já foi confirmada
                                const isAcknowledged = currentAcknowledgedIds.includes(mostRecentCritical._id);
                                
                                if (!isAcknowledged) {
                                    const criticalKey = `${mostRecentCritical._id}-${mostRecentCritical.title}`;
                                    if (CriticalModalManager.isNewCriticalNews(criticalKey)) {
                                        CriticalModalManager.resetForNewCriticalNews();
                                        CriticalModalManager.setLastCriticalNews(criticalKey);
                                        setLastCriticalNewsId(criticalKey);
                                    }
                                    if (CriticalModalManager.shouldShowModal(mostRecentCritical)) {
                                        setCriticalNews(mostRecentCritical);
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('❌ Erro ao verificar notícia crítica no refresh:', error);
                        }
                    }
                } else {
                    console.log('✅ Sem mudanças em VeloNews, mantendo dados atuais');
                }
                
                if (moduleStatusChanged) {
                    console.log('🔄 Mudanças detectadas em ModuleStatus, atualizando...');
                    setModuleStatus(newModuleStatusData);
                } else {
                    console.log('✅ Sem mudanças em ModuleStatus, mantendo dados atuais');
                }
                
                // Atualizar recentItems apenas se necessário
                const newRecentItems = newArticlesData
                    .filter(article => article.createdAt)
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 3);
                
                const recentItemsChanged = JSON.stringify(newRecentItems) !== JSON.stringify(recentItems);
                if (recentItemsChanged) {
                    console.log('🔄 Mudanças detectadas em RecentItems, atualizando...');
                    setRecentItems(newRecentItems);
                } else {
                    console.log('✅ Sem mudanças em RecentItems, mantendo dados atuais');
                }
                
            } catch (error) {
                console.error('❌ Erro no refresh inteligente:', error);
            }
        };
        
        // Refresh inteligente a cada 3 minutos
        const intelligentInterval = setInterval(intelligentRefresh, 3 * 60 * 1000);
        
        return () => clearInterval(intelligentInterval);
    }, [veloNews, moduleStatus, recentItems, setCriticalNews, lastCriticalNewsId]);


    return (
        <div className="w-full px-4 py-8 grid gap-4" style={{gridTemplateColumns: '25% 50% 25%'}}>
            <aside className="p-4 rounded-lg shadow-sm velohub-container" style={{borderRadius: '9.6px', boxShadow: '0 3.2px 16px rgba(0, 0, 0, 0.1)', padding: '19.2px'}}>
                {/* Widget Serviços - NOVO NO TOPO */}
                <div className="mb-6">
                    <h3 className="font-bold text-xl mb-4 border-b pb-2 text-center velohub-title" style={{borderColor: 'var(--blue-opaque)'}}>
                        Serviços
                    </h3>
                    {/* Grid de Status dos Serviços - Layout 2x4 */}
                    <div className="grid grid-cols-2 gap-1">
                        {/* Crédito Trabalhador */}
                        {renderModuleStatus('credito-trabalhador', 'C. Trabalhador')}
                        
                        {/* Crédito Pessoal */}
                        {renderModuleStatus('credito-pessoal', 'C. Pessoal')}
                        
                        {/* Antecipação */}
                        {renderModuleStatus('antecipacao', 'Antecipação')}
                        
                        {/* Pagamento Antecipado */}
                        {renderModuleStatus('pagamento-antecipado', 'Pgto Antecipado')}
                        
                        {/* Módulo IRPF */}
                        {renderModuleStatus('modulo-irpf', 'IRPF')}
                        
                        {/* Seguro Cel. - Coluna 2 */}
                        {renderModuleStatus('seguro-cel', 'Seguro Cel.')}
                        
                        {/* Seguro Cred. */}
                        {renderModuleStatus('seguro-cred', 'Seguro Cred.')}
                    </div>
                </div>

                {/* Widget Recentes - SIMPLIFICADO */}
                <div className="mt-6">
                    <h3 className="font-bold text-xl mb-4 border-b pb-2 text-center velohub-title" style={{borderColor: 'var(--blue-opaque)'}}>Recentes</h3>
                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Carregando...</p>
                    </div>
                 ) : recentItems.length > 0 ? (
                    <div className="space-y-3">
                         {recentItems.map(item => (
                             <div key={item._id || item.id} className="border-b dark:border-gray-700 pb-3 last:border-b-0">
                                 <div className="flex items-center justify-between gap-2 mb-2">
                                     <div className="flex items-center gap-2">
                                         <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-2 py-1 rounded-full">
                                             Artigo
                                         </span>
                                         {item.category && (
                                             <span className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs px-2 py-1 rounded-full">
                                                 {item.category}
                                             </span>
                                         )}
                                     </div>
                                     <span className="text-xs text-green-600 dark:text-green-400 whitespace-nowrap">
                                         {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                                     </span>
                                 </div>
                                 <h4 
                                     className="font-semibold text-sm text-gray-800 dark:text-gray-200 line-clamp-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                                     onClick={() => handleArticleClick(item)}
                                     title="Clique para ler o artigo completo"
                                 >
                                     {item.title}
                                 </h4>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                         <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum item recente</p>
                    </div>
                )}
                </div>

                {/* Widget de Ponto - RESTAURADO NO LOCAL ORIGINAL */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
                    <div style={{
                        background: 'transparent',
                        border: '1.5px solid var(--blue-dark)',
                        borderRadius: '8px',
                        padding: '16px',
                        margin: '8px',
                        marginTop: 'auto',
                        flexGrow: 1,
                        minHeight: '330px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '16px',
                        position: 'relative'
                    }}>
                        {/* Overlay "Em Breve" */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(128, 128, 128, 0.8)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            backdropFilter: 'blur(2px)'
                        }}>
                            <div style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                padding: '20px 30px',
                                borderRadius: '12px',
                                textAlign: 'center',
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                                border: '2px solid var(--blue-dark)'
                            }}>
                                <h4 style={{
                                    color: 'var(--blue-dark)',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    margin: 0
                                }}>
                                    Em Breve
                                </h4>
                                <p style={{
                                    color: 'var(--blue-opaque)',
                                    fontSize: '14px',
                                    margin: '8px 0 0 0'
                                }}>
                                    Funcionalidade em desenvolvimento
                                </p>
                            </div>
                        </div>
                        {/* Título Ponto */}
                        <h3 className="font-bold text-lg text-center" style={{color: 'var(--blue-dark)'}}>Ponto</h3>
                        
                        {/* Marcador de Status do Agente */}
                        <img 
                            src="/simbolo_velotax_ajustada_cor (1).png" 
                            alt="Status VeloTax" 
                            style={{
                                width: '60px',
                                height: 'auto',
                                opacity: '0.9',
                                filter: 'brightness(0) invert(1)',
                                transition: 'all 0.3s ease'
                            }}
                            className="agent-status-indicator offline"
                        />
                        
                        {/* Relógio */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            marginTop: '32px'
                        }}>
                            <div style={{
                                fontSize: '24px',
                                fontWeight: 'bold',
                                color: 'var(--blue-dark)',
                                fontFamily: 'monospace'
                            }}>
                                {new Date().toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                })}
                            </div>
                            <div style={{
                                fontSize: '14px',
                                color: 'var(--blue-opaque)',
                                fontWeight: '500',
                                whiteSpace: 'nowrap'
                            }}>
                                {new Date().toLocaleDateString('pt-BR', {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </div>
                        </div>
                        
                        {/* Botões de Ponto */}
                        <div style={{
                            display: 'flex',
                            gap: '20px',
                            alignItems: 'center',
                            marginTop: 'auto'
                        }}>
                            {/* Botão de Entrada */}
                            <div style={{
                                position: 'relative',
                                width: '64px',
                                height: '64px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {/* Círculo externo vazio */}
                                <div style={{
                                    position: 'absolute',
                                    width: '67px',
                                    height: '67px',
                                    borderRadius: '50%',
                                    border: '2px solid var(--blue-opaque)',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)'
                                }}></div>
                                {/* Círculo interno sólido */}
                                <div 
                                    style={{
                                        position: 'absolute',
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--blue-opaque)',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                        const indicator = document.querySelector('.agent-status-indicator');
                                        indicator.classList.remove('offline');
                                        indicator.classList.add('online');
                                    }}
                                >
                                    Entrada
                                </div>
                            </div>
                            
                            {/* Botão de Saída */}
                            <div style={{
                                position: 'relative',
                                width: '64px',
                                height: '64px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {/* Círculo externo vazio */}
                                <div style={{
                                    position: 'absolute',
                                    width: '67px',
                                    height: '67px',
                                    borderRadius: '50%',
                                    border: '2px solid var(--yellow)',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)'
                                }}></div>
                                {/* Círculo interno sólido */}
                                <div 
                                    style={{
                                        position: 'absolute',
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--yellow)',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--blue-dark)',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                        const indicator = document.querySelector('.agent-status-indicator');
                                        indicator.classList.remove('online');
                                        indicator.classList.add('offline');
                                    }}
                                >
                                    Saída
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* CSS para estados do agente */}
                <style jsx>{`
                    .agent-status-indicator.online {
                        opacity: 1 !important;
                        filter: none !important;
                        filter: drop-shadow(0 0 40px var(--green)) !important;
                    }
                    
                    .agent-status-indicator.offline {
                        opacity: 0.3 !important;
                        filter: grayscale(100%) drop-shadow(0 0 40px var(--yellow)) !important;
                    }
                `}</style>
            </aside>
                            <section className="p-4 rounded-lg shadow-sm velohub-container" style={{borderRadius: '9.6px', boxShadow: '0 3.2px 16px rgba(0, 0, 0, 0.1)', padding: '19.2px'}}>
                <h2 className="text-center font-bold text-3xl mb-6">
                    <span style={{color: 'var(--blue-medium)'}}>velo</span>
                    <span style={{color: 'var(--blue-dark)'}}>news</span>
                </h2>
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">Carregando dados do MongoDB...</p>
                        </div>
                    ) : veloNews.length > 0 ? (
                        veloNews.slice(0, 4).map(news => {
                            const isSolved = news.solved === true;
                            // Converter ambos para string para garantir comparação correta
                            const newsIdString = String(news._id);
                            // Verificar se está na lista de acknowledges (comparando como strings)
                            const isAcknowledged = acknowledgedNewsIds.some(id => String(id) === newsIdString);
                            const isCritical = news.is_critical === 'Y';
                            // Remover destaque vermelho se foi confirmada ou se está resolvida
                            const shouldRemoveHighlight = isAcknowledged || isSolved;
                            
                            // Handler para "Ler mais"
                            const handleReadMore = () => {
                                if (isCritical && !isAcknowledged) {
                                    // Abrir modal obrigatório para notícia crítica não confirmada
                                    setCriticalNews(news);
                                } else {
                                    // Abrir modal normal
                                    setSelectedNews(news);
                                }
                            };
                            
                            return (
                                <div key={news._id} className={`${
                                    isSolved ? 'solved-news-frame' : 
                                    (isCritical && !shouldRemoveHighlight ? 'critical-news-frame' : 'border-b dark:border-gray-700 pb-4 last:border-b-0')
                                }`} style={isSolved ? {opacity: 1} : {}}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                                            {news.title}
                                        </h3>
                                        <div className="flex flex-col items-end gap-2">
                                            {isSolved && (
                                                <span className="solved-badge">
                                                    Resolvido
                                                </span>
                                            )}
                                            {isCritical && !isSolved && !shouldRemoveHighlight && (
                                                <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded-full text-xs font-medium">
                                                    Crítica
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div 
                                        className={`text-gray-600 dark:text-gray-400 line-clamp-3 mb-2 prose prose-sm dark:prose-invert max-w-none ${isSolved ? 'solved-news-content' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: news.content || '' }}
                                    />
                                    
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-2">
                                            <button onClick={handleReadMore} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                                                Ler mais
                                            </button>
                                            
                                        </div>
                                        
                                        {news.createdAt && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(news.createdAt).toLocaleDateString('pt-BR')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-500 dark:text-gray-400">Nenhuma notícia encontrada</p>
                        </div>
                    )}
                    
                    {/* Botão Ver Notícias Anteriores */}
                    {veloNews.length > 4 && (
                        <div className="text-center mt-6">
                            <button
                                onClick={() => {
                                    console.log('🔍 Abrindo modal de histórico de notícias');
                                    setShowHistoryModal(true);
                                }}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                style={{
                                    background: 'linear-gradient(135deg, var(--blue-dark) 0%, var(--blue-medium) 100%)',
                                    border: 'none',
                                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                                }}
                            >
                                Ver Notícias Anteriores
                            </button>
                        </div>
                    )}
                </div>
            </section>
            <aside className="rounded-lg shadow-sm flex flex-col min-h-[calc(100vh-160px)] velohub-container" style={{borderRadius: '9.6px', boxShadow: '0 3.2px 16px rgba(0, 0, 0, 0.1)', padding: '19.2px', position: 'relative', marginRight: '20px'}}>
                {/* Widget de Chat - OCUPA TODO O ESPAÇO */}
                <div className="flex-1 flex flex-col">
                    <h3 className="font-bold text-xl border-b text-center mb-4 velohub-title" style={{borderColor: 'var(--blue-opaque)'}}>Chat</h3>
                    
                    {/* Container preparado para implementação futura do chat */}
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-gray-500 dark:text-gray-400">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="text-sm">Chat em desenvolvimento</p>
                        </div>
                    </div>
                </div>
            </aside>
            {selectedNews && (
                 <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={() => setSelectedNews(null)}>
                                         <div className="rounded-lg shadow-2xl p-8 max-w-2xl w-full mx-4 bg-white dark:bg-gray-800" onClick={e => e.stopPropagation()} style={{borderRadius: '12px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'}}>
                        <div className="flex justify-between items-center mb-4">
                           <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{selectedNews.title}</h2>
                           <button onClick={() => setSelectedNews(null)} className="text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white text-3xl">&times;</button>
                        </div>
                                                 <div 
                             className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                             dangerouslySetInnerHTML={{ __html: selectedNews.content || '' }}
                         />
                    </div>
                </div>
            )}

            {selectedArticle && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedArticle(null)}>
                    <div className="rounded-lg shadow-2xl max-w-4xl w-full max-h-[70vh] bg-white dark:bg-gray-800 flex flex-col" onClick={e => e.stopPropagation()} style={{borderRadius: '12px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'}}>
                        {/* Header fixo */}
                        <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 pr-3 line-clamp-2">{selectedArticle.title}</h2>
                            <button onClick={() => setSelectedArticle(null)} className="text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white text-xl flex-shrink-0">&times;</button>
                        </div>
                        
                        {/* Metadados fixos */}
                        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <div className="flex flex-wrap items-center gap-1">
                                {selectedArticle.category && (
                                    <span className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs px-2 py-0.5 rounded-full">
                                        {selectedArticle.category}
                                    </span>
                                )}
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(selectedArticle.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                        </div>
                        
                        {/* Conteúdo com scroll */}
                        <div className="flex-1 overflow-y-auto p-3">
                            <div 
                                className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                                dangerouslySetInnerHTML={{ __html: selectedArticle.content || '' }}
                            />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

// Componente para listagem de tickets do usuário
const TicketsListPage = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('date'); // 'date' | 'status'
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Função para carregar tickets do usuário logado
    const loadTickets = async () => {
        try {
            const session = getUserSession();
            if (!session?.user?.email) {
                setError('Usuário não autenticado');
                setLoading(false);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/support/tickets?userEmail=${encodeURIComponent(session.user.email)}`);
            const data = await response.json();
            
            if (data.success) {
                setTickets(data.tickets || []);
            } else {
                setError(data.error || 'Erro ao carregar tickets');
            }
        } catch (err) {
            console.error('Erro ao carregar tickets:', err);
            setError('Erro ao carregar tickets');
        } finally {
            setLoading(false);
        }
    };

    // Função para atualizar tickets
    const handleRefreshTickets = async () => {
        setIsRefreshing(true);
        await loadTickets();
        setIsRefreshing(false);
    };

    // Carregar tickets do usuário logado
    useEffect(() => {
        loadTickets();
    }, []);

    // Função para obter cor do status
    const getStatusColor = (status) => {
        switch (status) {
            case 'novo':
                return { background: 'var(--blue-light)', color: 'white' };
            case 'aberto':
                return { background: '#ff0000', color: 'white' };
            case 'em espera':
                return { background: 'var(--yellow)', color: 'white' };
            case 'pendente':
                return { background: 'var(--green)', color: 'white' };
            case 'resolvido':
                return { background: '#e5e7eb', color: '#374151' };
            default:
                return { background: '#e5e7eb', color: '#374151' };
        }
    };

    // Filtrar e ordenar tickets
    const filteredTickets = tickets.filter(ticket => {
        if (filterStatus === 'all') return true;
        return ticket._statusHub === filterStatus;
    }).sort((a, b) => {
        if (sortBy === 'date') {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        } else if (sortBy === 'status') {
            const statusOrder = { 'novo': 0, 'pendente': 1, 'aberto': 2, 'resolvido': 3 };
            return statusOrder[a._statusHub] - statusOrder[b._statusHub];
        }
        return 0;
    });

    // Separar tickets ativos e resolvidos
    const activeTickets = filteredTickets.filter(ticket => ticket._statusHub !== 'resolvido');
    const resolvedTickets = filteredTickets.filter(ticket => ticket._statusHub === 'resolvido');

    // Função para visualizar ticket
    const handleViewTicket = (ticket) => {
        setSelectedTicket(ticket);
        setOpenModal(true);
        setReplyText('');
    };

    // Função para fechar modal
    const handleCloseModal = () => {
        setOpenModal(false);
        setSelectedTicket(null);
        setReplyText('');
    };

    // Função para enviar resposta
    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedTicket) return;

        setIsSubmittingReply(true);
        try {
            const session = getUserSession();
            
            // Determinar endpoint baseado no prefixo do ID
            const endpoint = selectedTicket._id.startsWith('TKC-') 
                ? '/support/tk-conteudos' 
                : '/support/tk-gestao';
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    _id: selectedTicket._id,
                    _userEmail: selectedTicket._userEmail,
                    _genero: selectedTicket._genero,
                    _tipo: selectedTicket._tipo,
                    _corpo: [
                        ...(selectedTicket._corpo || []),
                        {
                            autor: 'user',
                            userName: session.user.name,
                            mensagem: replyText,
                            timestamp: new Date()
                        }
                    ],
                    _obs: selectedTicket._obs,
                    _direcionamento: selectedTicket._direcionamento,
                    _statusHub: 'pendente',
                    _statusConsole: 'aberto',
                    _lastUpdatedBy: 'user',
                    createdAt: selectedTicket.createdAt,
                    updatedAt: new Date()
                })
            });

            const result = await response.json();
            if (result.success) {
                // Recarregar tickets
                const ticketsResponse = await fetch(`${API_BASE_URL}/support/tickets?userEmail=${encodeURIComponent(session.user.email)}`);
                const ticketsData = await ticketsResponse.json();
                if (ticketsData.success) {
                    setTickets(ticketsData.tickets || []);
                }
                
                // Atualizar ticket selecionado
                const updatedTicket = ticketsData.tickets?.find(t => t._id === selectedTicket._id);
                if (updatedTicket) {
                    setSelectedTicket(updatedTicket);
                }
                
                setReplyText('');
                alert('Resposta enviada com sucesso!');
            } else {
                alert('Erro ao enviar resposta: ' + (result.error || 'Erro desconhecido'));
            }
        } catch (err) {
            console.error('Erro ao enviar resposta:', err);
            alert('Erro ao enviar resposta');
        } finally {
            setIsSubmittingReply(false);
        }
    };

    // Função para formatar data
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Carregando seus tickets...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16">
                <div className="bg-red-100 dark:bg-red-900 rounded-lg p-8 max-w-md mx-auto">
                    <h3 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-4">
                        Erro
                    </h3>
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filtros e ordenação */}
            <div className="flex justify-end items-center gap-3 mb-4" style={{paddingLeft: '20px', paddingRight: '20px'}}>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="velohub-input bg-white dark:bg-transparent border-blue-dark velohub-filter-select text-gray-700 dark:text-gray-300"
                    style={{
                        border: '1.2px solid',
                        borderRadius: '6.4px',
                        padding: '6.6px 12.8px',
                        fontFamily: 'Poppins, sans-serif',
                        transition: 'border-color 0.3s ease',
                        fontSize: '0.875rem'
                    }}
                >
                    <option value="all">Todos os status</option>
                    <option value="novo">Novo</option>
                    <option value="pendente">Pendente</option>
                    <option value="aberto">Aberto</option>
                    <option value="resolvido">Resolvido</option>
                </select>
                
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="velohub-input bg-white dark:bg-transparent border-blue-dark velohub-filter-select text-gray-700 dark:text-gray-300"
                    style={{
                        border: '1.2px solid',
                        borderRadius: '6.4px',
                        padding: '6.6px 12.8px',
                        fontFamily: 'Poppins, sans-serif',
                        transition: 'border-color 0.3s ease',
                        fontSize: '0.875rem'
                    }}
                >
                    <option value="date">Ordenar por data</option>
                    <option value="status">Ordenar por status</option>
                </select>
                
                <div className="text-sm" style={{color: 'var(--blue-opaque)', fontFamily: 'Poppins, sans-serif'}}>
                    {tickets.length} ticket(s) encontrado(s)
                </div>
                <button
                    onClick={handleRefreshTickets}
                    disabled={isRefreshing}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Atualizar tickets"
                >
                    <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Tickets Ativos */}
            {activeTickets.length > 0 && (
                <div style={{marginTop: '-1rem'}}>
                    <h3 className="text-lg font-semibold mb-4 velohub-title" style={{fontFamily: 'Poppins, sans-serif'}}>
                        Tickets Ativos ({activeTickets.length})
                    </h3>
                    <div className="velohub-container" style={{
                        borderRadius: '13.2px',
                        boxShadow: '0 4.4px 22px rgba(0, 0, 0, 0.1)',
                        padding: '26.4px',
                        margin: '17.6px 20px',
                        border: '1px solid rgba(22, 52, 255, 0.1)'
                    }}>
                        {/* Cabeçalho da tabela */}
                        <div className="grid grid-cols-5 gap-4 py-3 px-4 font-semibold border-b" style={{
                            borderColor: 'var(--blue-opaque)',
                            fontFamily: 'Poppins, sans-serif',
                            color: 'var(--blue-opaque)'
                        }}>
                            <div>ID</div>
                            <div>Data</div>
                            <div>Motivo</div>
                            <div>Tipo</div>
                            <div>Status</div>
                        </div>
                        
                        {/* Linhas dos tickets */}
                        <div className="space-y-2">
                            {activeTickets.map((ticket) => {
                                const statusColor = getStatusColor(ticket._statusHub);
                                return (
                                    <div
                                        key={ticket._id}
                                        className="grid grid-cols-5 gap-4 py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                                        onClick={() => handleViewTicket(ticket)}
                                    >
                                        <div className="font-mono text-sm text-gray-700 dark:text-gray-300" style={{fontFamily: 'Poppins, sans-serif'}}>
                                            {ticket._id}
                                        </div>
                                        <div className="text-sm text-gray-700 dark:text-gray-300" style={{fontFamily: 'Poppins, sans-serif'}}>
                                            {formatDate(ticket.createdAt)}
                                        </div>
                                        <div className="text-sm text-blue-dark dark:text-blue-light" style={{fontFamily: 'Poppins, sans-serif'}}>
                                            {ticket._genero}
                                        </div>
                                        <div className="text-sm text-gray-700 dark:text-gray-300" style={{fontFamily: 'Poppins, sans-serif'}}>
                                            {ticket._tipo}
                                        </div>
                                        <div>
                                            <span
                                                className="px-2 py-1 rounded-full text-xs font-medium"
                                                style={statusColor}
                                            >
                                                {ticket._statusHub}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Tickets Resolvidos - SEMPRE VISÍVEL */}
            <div>
                <h3 className="text-lg font-semibold mb-4 velohub-title" style={{fontFamily: 'Poppins, sans-serif'}}>
                    Tickets Resolvidos ({resolvedTickets.length})
                </h3>
                <div className="velohub-container" style={{
                    borderRadius: '13.2px',
                    boxShadow: '0 4.4px 22px rgba(0, 0, 0, 0.1)',
                    padding: '26.4px',
                    margin: '17.6px 20px',
                    border: '1px solid rgba(22, 52, 255, 0.1)'
                }}>
                    {/* Cabeçalho da tabela */}
                    <div className="grid grid-cols-5 gap-4 py-3 px-4 font-semibold border-b" style={{
                        borderColor: 'var(--blue-opaque)',
                        fontFamily: 'Poppins, sans-serif',
                        color: 'var(--blue-opaque)'
                    }}>
                        <div>ID</div>
                        <div>Data</div>
                        <div>Motivo</div>
                        <div>Tipo</div>
                        <div>Status</div>
                    </div>
                    
                    {/* Linhas dos tickets */}
                    <div className="space-y-2">
                        {resolvedTickets.length > 0 ? (
                            resolvedTickets.map((ticket) => {
                                const statusColor = getStatusColor(ticket._statusHub);
                                return (
                                    <div
                                        key={ticket._id}
                                        className="grid grid-cols-5 gap-4 py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors opacity-75"
                                        onClick={() => handleViewTicket(ticket)}
                                    >
                                        <div className="font-mono text-sm text-gray-700 dark:text-gray-300" style={{fontFamily: 'Poppins, sans-serif'}}>
                                            {ticket._id}
                                        </div>
                                        <div className="text-sm text-gray-700 dark:text-gray-300" style={{fontFamily: 'Poppins, sans-serif'}}>
                                            {formatDate(ticket.createdAt)}
                                        </div>
                                        <div className="text-sm text-blue-dark dark:text-blue-light" style={{fontFamily: 'Poppins, sans-serif'}}>
                                            {ticket._genero}
                                        </div>
                                        <div className="text-sm text-gray-700 dark:text-gray-300" style={{fontFamily: 'Poppins, sans-serif'}}>
                                            {ticket._tipo}
                                        </div>
                                        <div>
                                            <span
                                                className="px-2 py-1 rounded-full text-xs font-medium"
                                                style={statusColor}
                                            >
                                                {ticket._statusHub}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 col-span-5">
                                <p style={{color: 'var(--gray)', fontFamily: 'Poppins, sans-serif'}}>
                                    Nenhum ticket resolvido encontrado.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mensagem quando não há tickets */}
            {tickets.length === 0 && (
                <div className="text-center py-16">
                    <div className="velohub-card" style={{
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                        padding: '32px',
                        margin: '16px auto',
                        maxWidth: '448px',
                        border: '1px solid rgba(22, 52, 255, 0.1)'
                    }}>
                        <h3 className="text-xl font-semibold mb-4" style={{color: 'var(--blue-dark)', fontFamily: 'Poppins, sans-serif'}}>
                            Nenhum ticket encontrado
                        </h3>
                        <p style={{color: 'var(--gray)', fontFamily: 'Poppins, sans-serif'}}>
                            Você ainda não possui tickets de apoio. Use a aba "Solicite Apoio" para criar um novo ticket.
                        </p>
                    </div>
                </div>
            )}

            {/* Modal de visualização e resposta */}
            {openModal && selectedTicket && (
                <div className="fixed bg-black bg-opacity-50" style={{
                    zIndex: 99999,
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    width: '100vw', 
                    height: '100vh',
                    position: 'fixed'
                }}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden" style={{
                        position: 'absolute',
                        top: '22px',
                        left: '22px',
                        right: '22px',
                        bottom: '0px',
                        zIndex: 10000
                    }}>
                        {/* Cabeçalho do modal */}
                        <div className="border-b border-gray-200 dark:border-gray-700" style={{padding: '19.8px'}}>
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                    {selectedTicket._id} - {selectedTicket._genero}
                                    {selectedTicket._assunto && ` - ${selectedTicket._assunto}`}
                                </h2>
                                <button
                                    onClick={handleCloseModal}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Container Principal com padding correto */}
                        <div style={{
                            padding: '16.5px 27.5px 0 27.5px',
                            height: 'calc(100% - 132px)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            {/* Área de Mensagens */}
                            <div style={{
                                flex: '1',
                                overflowY: 'auto'
                            }}>
                                <div className="space-y-3">
                                    {Array.isArray(selectedTicket._corpo) ? selectedTicket._corpo.map((mensagem, index) => (
                                        <div
                                            key={index}
                                            className={`container-secondary ${mensagem.autor === 'admin' ? 'admin-message' : 'user-message'}`}
                                            style={{
                                                background: 'transparent',
                                                border: `2.2px solid ${mensagem.autor === 'admin' ? 'var(--blue-medium)' : 'var(--blue-dark)'}`,
                                                borderRadius: '8.8px',
                                                padding: '17.6px',
                                                margin: '8.8px 0',
                                                fontFamily: 'Poppins, sans-serif'
                                            }}
                                        >
                                            {/* Header da mensagem - userName e timestamp */}
                                            <div className="mb-3">
                                                <span className="font-medium text-sm" style={{color: 'var(--gray)', fontFamily: 'Poppins, sans-serif'}}>
                                                    {mensagem.userName}
                                                </span>
                                                <span className="text-xs ml-2" style={{color: 'var(--blue-opaque)', fontFamily: 'Poppins, sans-serif'}}>
                                                    - {new Date(mensagem.timestamp).toLocaleDateString('pt-BR', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            
                                            {/* Conteúdo da mensagem */}
                                            <div className="text-base whitespace-pre-wrap" style={{color: 'var(--gray)', fontFamily: 'Poppins, sans-serif'}}>
                                                {mensagem.mensagem}
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-8">
                                            <p style={{color: 'var(--gray)', fontFamily: 'Poppins, sans-serif'}}>
                                                Nenhuma mensagem encontrada.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Área de Resposta */}
                            {selectedTicket._statusHub !== 'resolvido' && (
                                <div style={{
                                    flex: '0 0 auto',
                                    marginTop: 'auto'
                                }}>
                                    <div className="relative">
                                        <textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder="Digite sua resposta..."
                                            className="w-full resize-none pr-12"
                                            style={{
                                                border: '1.5px solid var(--blue-opaque)',
                                                borderRadius: '8px',
                                                padding: '12px 16px',
                                                fontFamily: 'Poppins, sans-serif',
                                                minHeight: '120px',
                                                background: 'transparent'
                                            }}
                                        />
                                        <button
                                            onClick={handleSendReply}
                                            disabled={!replyText.trim() || isSubmittingReply}
                                            className="absolute bottom-2 right-2 transition-all duration-300"
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: replyText.trim() && !isSubmittingReply ? 'pointer' : 'not-allowed'
                                            }}
                                        >
                                            {isSubmittingReply ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            ) : (
                                                <Send 
                                                    size={25} 
                                                    style={{
                                                        color: replyText.trim() && !isSubmittingReply ? 'var(--blue-medium)' : 'rgba(59, 130, 246, 0.5)'
                                                    }}
                                                />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Conteúdo da Página de Apoio
const ApoioPage = () => {
    const [activeModal, setActiveModal] = useState(null);
    const [activeTab, setActiveTab] = useState('solicitar');
    
    // Marcar tickets como visualizados quando a página é aberta
    useEffect(() => {
        const markTicketsAsViewed = async () => {
            try {
                const session = getUserSession();
                if (!session?.user?.email) return;

                // Buscar tickets não visualizados
                const response = await fetch(`${API_BASE_URL}/support/tickets/unread-count?userEmail=${encodeURIComponent(session.user.email)}`);
                const data = await response.json();
                
                if (data.success && data.tickets.length > 0) {
                    // Obter objeto atual de tickets visualizados
                    const viewedTicketsRaw = localStorage.getItem('velohub-viewed-tickets');
                    let viewedTickets = {};
                    
                    // Migração: se for array antigo, converter para objeto
                    if (viewedTicketsRaw) {
                        try {
                            const parsed = JSON.parse(viewedTicketsRaw);
                            if (Array.isArray(parsed)) {
                                // Migrar array antigo para objeto
                                parsed.forEach(ticketId => {
                                    viewedTickets[ticketId] = new Date().toISOString();
                                });
                            } else {
                                viewedTickets = parsed;
                            }
                        } catch (e) {
                            console.error('Erro ao parsear viewedTickets:', e);
                            viewedTickets = {};
                        }
                    }
                    
                    // Timestamp atual para marcar visualização (momento em que o usuário está visualizando)
                    const currentTimestamp = new Date().toISOString();
                    
                    // Atualizar timestamp de visualização para cada ticket visível
                    // Usar timestamp atual para garantir que todas as mensagens até este momento sejam consideradas visualizadas
                    data.tickets.forEach(ticket => {
                        viewedTickets[ticket._id] = currentTimestamp;
                    });
                    
                    // Salvar no localStorage
                    localStorage.setItem('velohub-viewed-tickets', JSON.stringify(viewedTickets));
                    
                    // Disparar evento customizado para atualizar o header
                    window.dispatchEvent(new CustomEvent('tickets-viewed'));
                }
            } catch (error) {
                console.error('Erro ao marcar tickets como visualizados:', error);
            }
        };

        markTicketsAsViewed();
    }, []);
    
    const supportItems = [
        // Primeira linha
        { 
            name: 'Artigo', 
            icon: <FileText size={32} />, 
            type: 'artigo',
            title: 'Solicitar Artigo',
            description: 'solicite a criação ou alteração de artigos da central'
        }, 
        { 
            name: 'Processo', 
            icon: <Bot size={32} />, 
            type: 'bot',
            title: 'Solicitar Processo/Informação',
            description: 'Adição ou Correção de respostas do bot'
        },
        { 
            name: 'Roteiro', 
            icon: <Map size={32} />, 
            type: 'roteiro',
            title: 'Solicitar Roteiro',
            description: 'Macros, respostas prontas e roteiros de atendimento'
        },
        // Segunda linha
        { 
            name: 'Treinamento', 
            icon: <GraduationCap size={32} />, 
            type: 'treinamento',
            title: 'Solicitar Treinamento',
            description: 'Solicite treinamentos e capacitações'
        }, 
        { 
            name: 'Funcionalidade', 
            icon: <Puzzle size={32} />, 
            type: 'funcionalidade',
            title: 'Solicitar Funcionalidade',
            description: 'Solicite melhorias ou novas funcionalidades'
        }, 
        { 
            name: 'Recurso Adicional', 
            icon: <PlusSquare size={32} />, 
            type: 'recurso',
            title: 'Solicitar Recurso Adicional',
            description: 'Solicite recursos visuais, ou outros materiais para auxiliar em atendimentos.'
        },
        // Terceira linha
        { 
            name: 'Gestão', 
            icon: <User size={32} />, 
            type: 'gestao',
            title: 'Solicitar Gestão',
            description: 'Solicitações, agendamentos e notificações para gestão'
        },
        { 
            name: 'RH e Financeiro', 
            icon: <BookOpen size={32} />, 
            type: 'rh_financeiro',
            title: 'Solicitar RH e Financeiro',
            description: 'Solicitações para RH ou setor financeiro'
        },
        { 
            name: 'Facilities', 
            icon: <LifeBuoy size={32} />, 
            type: 'facilities',
            title: 'Solicitar Facilities',
            description: 'Solicitações para facilities e infraestrutura'
        },
    ];

    const handleCardClick = (item) => {
        setActiveModal(item);
    };

    const handleCloseModal = () => {
        setActiveModal(null);
    };

    return (
        <div className="w-full py-12" style={{paddingLeft: '20px', paddingRight: '20px'}}>
            {/* Sistema de Abas */}
            <div className="mb-8" style={{marginTop: '-15px'}}>
                {/* Abas */}
                <div className="flex justify-start mb-2" style={{gap: '2rem'}}>
                    <button
                        onClick={() => setActiveTab('solicitar')}
                        className={`px-6 py-3 text-2xl font-semibold transition-colors duration-200 ${activeTab === 'solicitar' ? '' : 'opacity-50'}`}
                        style={{
                            color: activeTab === 'solicitar' ? 'var(--blue-light)' : 'var(--cor-texto-secundario)'
                        }}
                    >
                        Solicite Apoio
                    </button>
                    <button
                        onClick={() => setActiveTab('acompanhar')}
                        className={`px-6 py-3 text-2xl font-semibold transition-colors duration-200 ${activeTab === 'acompanhar' ? '' : 'opacity-50'}`}
                        style={{
                            color: activeTab === 'acompanhar' ? 'var(--blue-light)' : 'var(--cor-texto-secundario)'
                        }}
                    >
                        Acompanhe seus Tickets
                    </button>
                </div>
                
                {/* Linha divisória */}
                <div className="w-full" style={{ height: '1px', backgroundColor: 'var(--cor-borda)', opacity: 0.5 }}></div>
            </div>

            {/* Conteúdo baseado na aba ativa */}
            {activeTab === 'solicitar' && (
            <div className="space-y-4">
                {/* Primeira linha - Artigo, Processo, Roteiro */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {supportItems.slice(0, 3).map(item => (
                    <button 
                        key={item.name} 
                        onClick={() => handleCardClick(item)}
                        className="rounded-lg flex flex-col items-center justify-center velohub-card" 
                        style={{
                            padding: '18.432px',
                            borderRadius: '11.52px',
                            boxShadow: '0 5.76px 23.04px rgba(0, 0, 0, 0.1)',
                            transition: 'box-shadow 0.3s ease, border 0.3s ease, transform 0.3s ease',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                            width: '100%',
                            height: 'auto'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.15)';
                            e.currentTarget.style.outline = '2px solid var(--blue-medium)';
                            e.currentTarget.style.outlineOffset = '-2px';
                            e.currentTarget.style.transform = 'translateY(-3.2px)';
                            // Barra superior animada
                            e.currentTarget.style.setProperty('--bar-width', '100%');
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 6.4px 25.6px rgba(0, 0, 0, 0.1)';
                            e.currentTarget.style.outline = 'none';
                            e.currentTarget.style.transform = 'translateY(0)';
                            // Barra superior desaparece
                            e.currentTarget.style.setProperty('--bar-width', '0%');
                        }}
                    >
                        {/* Barra Superior Animada */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '3.2px',
                            background: 'linear-gradient(90deg, var(--blue-medium), var(--blue-light), var(--blue-medium))',
                            transform: 'scaleX(var(--bar-width, 0%))',
                            transition: 'transform 0.3s ease',
                            zIndex: 1
                        }}></div>
                        <div className="text-blue-500 dark:text-blue-400 mb-3">{item.icon}</div>
                        <span className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-1.5">{item.name}</span>
                        <p className="text-xs text-center" style={{color: 'var(--cor-texto-secundario)'}}>
                            {item.description}
                        </p>
                    </button>
                ))}
                </div>

                {/* Linha separadora */}
                <div className="w-full h-px" style={{ backgroundColor: 'var(--cor-borda)', opacity: 0.5 }}></div>

                {/* Segunda linha - Treinamento, Funcionalidade, Recurso Adicional */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {supportItems.slice(3, 6).map(item => (
                    <button 
                        key={item.name} 
                        onClick={() => handleCardClick(item)}
                        className="rounded-lg flex flex-col items-center justify-center velohub-card" 
                        style={{
                            padding: '18.432px',
                            borderRadius: '11.52px',
                            boxShadow: '0 5.76px 23.04px rgba(0, 0, 0, 0.1)',
                            transition: 'box-shadow 0.3s ease, border 0.3s ease, transform 0.3s ease',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                            width: '100%',
                            height: 'auto'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.15)';
                            e.currentTarget.style.outline = '2px solid var(--blue-medium)';
                            e.currentTarget.style.outlineOffset = '-2px';
                            e.currentTarget.style.transform = 'translateY(-3.2px)';
                            // Barra superior animada
                            e.currentTarget.style.setProperty('--bar-width', '100%');
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 6.4px 25.6px rgba(0, 0, 0, 0.1)';
                            e.currentTarget.style.outline = 'none';
                            e.currentTarget.style.transform = 'translateY(0)';
                            // Barra superior desaparece
                            e.currentTarget.style.setProperty('--bar-width', '0%');
                        }}
                    >
                        {/* Barra Superior Animada */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '3.2px',
                            background: 'linear-gradient(90deg, var(--blue-medium), var(--blue-light), var(--blue-medium))',
                            transform: 'scaleX(var(--bar-width, 0%))',
                            transition: 'transform 0.3s ease',
                            zIndex: 1
                        }}></div>
                        <div className="text-blue-500 dark:text-blue-400 mb-3">{item.icon}</div>
                        <span className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-1.5">{item.name}</span>
                        <p className="text-xs text-center" style={{color: 'var(--cor-texto-secundario)'}}>
                            {item.description}
                        </p>
                    </button>
                ))}
                </div>

                {/* Linha separadora */}
                <div className="w-full h-px" style={{ backgroundColor: 'var(--cor-borda)', opacity: 0.5 }}></div>

                {/* Terceira linha - Gestão, RH e Financeiro, Facilities */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {supportItems.slice(6, 9).map(item => {
                    const isDisabled = item.type === 'rh_financeiro' || item.type === 'facilities';
                    return (
                    <button 
                        key={item.name} 
                        onClick={() => !isDisabled && handleCardClick(item)}
                        className="rounded-lg flex flex-col items-center justify-center velohub-card" 
                        style={{
                            padding: '18.432px',
                            borderRadius: '11.52px',
                            boxShadow: '0 5.76px 23.04px rgba(0, 0, 0, 0.1)',
                            transition: 'box-shadow 0.3s ease, border 0.3s ease, transform 0.3s ease',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                            width: '100%',
                            height: 'auto',
                            opacity: isDisabled ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (!isDisabled) {
                                e.currentTarget.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.15)';
                                e.currentTarget.style.outline = '2px solid var(--blue-medium)';
                                e.currentTarget.style.outlineOffset = '-2px';
                                e.currentTarget.style.transform = 'translateY(-3.2px)';
                                // Barra superior animada
                                e.currentTarget.style.setProperty('--bar-width', '100%');
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isDisabled) {
                                e.currentTarget.style.boxShadow = '0 6.4px 25.6px rgba(0, 0, 0, 0.1)';
                                e.currentTarget.style.outline = 'none';
                                e.currentTarget.style.transform = 'translateY(0)';
                                // Barra superior desaparece
                                e.currentTarget.style.setProperty('--bar-width', '0%');
                            }
                        }}
                    >
                        {/* Barra Superior Animada */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '3.2px',
                            background: 'linear-gradient(90deg, var(--blue-medium), var(--blue-light), var(--blue-medium))',
                            transform: 'scaleX(var(--bar-width, 0%))',
                            transition: 'transform 0.3s ease',
                            zIndex: 1
                        }}></div>
                        <div className="text-blue-500 dark:text-blue-400 mb-3">{item.icon}</div>
                        <span className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-1.5">{item.name}</span>
                        <p className="text-xs text-center" style={{color: 'var(--cor-texto-secundario)'}}>
                            {item.description}
                        </p>
                        {/* Overlay "EM BREVE" para cards desativados */}
                        {isDisabled && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '11.52px',
                                zIndex: 10
                            }}>
                                <span style={{
                                    color: 'white',
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold',
                                    fontFamily: 'Poppins, sans-serif',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1.6px'
                                }}>
                                    EM BREVE
                                </span>
                            </div>
                        )}
                    </button>
                    );
                })}
                </div>
            </div>
            )}

            {/* Aba Acompanhe seus Tickets */}
            {activeTab === 'acompanhar' && (
                <TicketsListPage />
            )}

            {/* Modal */}
            {activeModal && (
                <SupportModal
                    isOpen={!!activeModal}
                    onClose={handleCloseModal}
                    type={activeModal.type}
                    title={activeModal.title}
                />
            )}
        </div>
    );
};

// Página de Artigos
const ArtigosPage = () => {
    const [articles, setArticles] = useState([]);
    const [filteredArticles, setFilteredArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('Todas');
    const [categories, setCategories] = useState([]);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    // Função para renderizar HTML de forma segura
    const renderHTML = (htmlContent) => {
        if (!htmlContent) return '';
        return { __html: htmlContent };
    };

    // Função para buscar artigos por título e palavras-chave
    const searchArticles = (term, articlesList) => {
        if (!term || term.trim() === '') {
            return articlesList;
        }

        const searchTerm = term.toLowerCase().trim();
        
        return articlesList.filter(article => {
            // Buscar no título
            const titleMatch = article.title && article.title.toLowerCase().includes(searchTerm);
            
            // Buscar no conteúdo (removendo tags HTML)
            const contentText = article.content ? article.content.replace(/<[^>]*>/g, '').toLowerCase() : '';
            const contentMatch = contentText.includes(searchTerm);
            
            // Buscar na tag (campo do schema)
            const tagMatch = article.tag && article.tag.toLowerCase().includes(searchTerm);
            
            // Buscar na categoria
            const categoryMatch = article.category && article.category.toLowerCase().includes(searchTerm);
            
            return titleMatch || contentMatch || tagMatch || categoryMatch;
        });
    };

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                setLoading(true);
                const response = await articlesAPI.getAll();
                console.log('Artigos carregados:', response.data);
                
                if (response.data && response.data.length > 0) {
                    setArticles(response.data);
                } else {
                    console.warn('⚠️ Dados de artigos não encontrados ou vazios, usando mock...');
                    throw new Error('Dados vazios da API');
                }
            } catch (error) {
                console.error('Erro ao carregar artigos da API:', error);
                console.log('📋 Usando dados mock como fallback...');
                
                // Em caso de erro, usar arrays vazios
                console.warn('⚠️ Usando arrays vazios como fallback');
                setArticles([]);
            } finally {
                setLoading(false);
            }
        };
        
        fetchArticles();
    }, []);

    // Extrair categorias únicas dos artigos
    useEffect(() => {
        if (articles.length > 0) {
            const uniqueCategories = ['Todas', ...new Set(articles.map(article => article.category).filter(Boolean))];
            setCategories(uniqueCategories);
        }
    }, [articles]);

    // Debounce para o termo de busca
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Filtrar artigos por categoria e busca
    useEffect(() => {
        let filtered = articles;
        
        // Filtrar por categoria
        if (selectedCategory !== 'Todas') {
            filtered = filtered.filter(article => article.category === selectedCategory);
        }
        
        // Aplicar busca se houver termo de busca
        if (debouncedSearchTerm && debouncedSearchTerm.trim() !== '') {
            filtered = searchArticles(debouncedSearchTerm, filtered);
        }
        
        setFilteredArticles(filtered);
    }, [selectedCategory, articles, debouncedSearchTerm]);

    const handleCategoryChange = (category) => {
        setSelectedCategory(category);
    };

    const handleSearchChange = (term) => {
        setSearchTerm(term);
    };

    const handleArticleClick = (article) => {
        setSelectedArticle(article);
    };

    return (
        <div className="w-full py-8" style={{paddingLeft: '20px', paddingRight: '20px'}}>
            <div className="grid grid-cols-1 lg:grid-cols-4" style={{gap: '30px'}}>
                {/* Sidebar de Categorias */}
                <aside className="lg:col-span-1 p-6 rounded-lg shadow-sm h-fit velohub-container" style={{borderRadius: '9.6px', boxShadow: '0 3.2px 16px rgba(0, 0, 0, 0.1)', padding: '19.2px'}}>
                    {/* Campo de Busca */}
                    <div className="mb-6">
                        <div className="relative w-full">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="Buscar artigos..."
                                className="w-full px-4 pl-12 pr-4 border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                style={{
                                    backgroundColor: 'var(--cor-container)',
                                    color: 'var(--cor-texto-principal)',
                                    borderColor: 'var(--cor-borda)',
                                    paddingTop: '8px',
                                    paddingBottom: '8px',
                                    borderRadius: '16px'
                                }}
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            {searchTerm && (
                                <button
                                    onClick={() => handleSearchChange('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        
                        {/* Indicador de resultados */}
                        {debouncedSearchTerm && (
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                {filteredArticles.length > 0 ? (
                                    <span>
                                        {filteredArticles.length} artigo{filteredArticles.length !== 1 ? 's' : ''} encontrado{filteredArticles.length !== 1 ? 's' : ''} para "{debouncedSearchTerm}"
                                    </span>
                                ) : (
                                    <span className="text-red-500 dark:text-red-400">
                                        Nenhum artigo encontrado para "{debouncedSearchTerm}"
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <h3 className="font-bold text-xl mb-4 border-b pb-2 text-center velohub-title" style={{borderColor: 'var(--blue-opaque)'}}>
                        Categorias
                    </h3>
                    
                    {loading ? (
                        <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">Carregando...</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {categories.map((category, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleCategoryChange(category)}
                                    className={`w-full text-left px-3 py-2 rounded-md transition-colors duration-200 text-sm ${
                                        selectedCategory === category
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    )}
                    
                    {!loading && (
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {debouncedSearchTerm ? (
                                    <span>
                                        {filteredArticles.length} de {articles.length} artigo{articles.length !== 1 ? 's' : ''}
                                    </span>
                                ) : (
                                    <span>
                                        {filteredArticles.length} artigo{filteredArticles.length !== 1 ? 's' : ''} encontrado{filteredArticles.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </p>
                        </div>
                    )}
                </aside>

                {/* Lista de Artigos */}
                <div className="lg:col-span-3">
                    {loading && (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                            <p className="text-gray-600 dark:text-gray-400 mt-4">Carregando artigos...</p>
                        </div>
                    )}
                    
                    {!loading && (
                        <>
                            {filteredArticles.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2" style={{gap: '25px'}}>
                                    {filteredArticles.map(article => (
                                         <div 
                                             key={article._id || article.id} 
                                             className="rounded-lg shadow-md p-6 cursor-pointer velohub-card"
                                             style={{
                                                 borderRadius: '16px',
                                                 boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                                                 transition: 'box-shadow 0.3s ease, border 0.3s ease',
                                                 cursor: 'pointer',
                                                 position: 'relative',
                                                 overflow: 'hidden',
                                                 width: '100%',
                                                 height: 'auto'
                                             }}
                                             onMouseEnter={(e) => {
                                                 e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
                                                 e.currentTarget.style.outline = '2px solid var(--blue-medium)';
                                                 e.currentTarget.style.outlineOffset = '-2px';
                                                 // Barra superior animada
                                                 e.currentTarget.style.setProperty('--bar-width', '100%');
                                             }}
                                             onMouseLeave={(e) => {
                                                 e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
                                                 e.currentTarget.style.outline = 'none';
                                                 // Barra superior desaparece
                                                 e.currentTarget.style.setProperty('--bar-width', '0%');
                                             }}
                                             onClick={() => handleArticleClick(article)}
                                         >
                                             {/* Barra Superior Animada */}
                                             <div style={{
                                                 position: 'absolute',
                                                 top: 0,
                                                 left: 0,
                                                 right: 0,
                                                 height: '4px',
                                                 background: 'linear-gradient(90deg, var(--blue-medium), var(--blue-light), var(--blue-medium))',
                                                 transform: 'scaleX(var(--bar-width, 0%))',
                                                 transition: 'transform 0.3s ease',
                                                 zIndex: 1
                                             }}></div>
                                            <div className="mb-3 flex justify-between items-start">
                                                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                                                    {article.category}
                                                </span>
                                                {article.createdAt && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {new Date(article.createdAt).toLocaleDateString('pt-BR')}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">{article.title}</h3>
                                            {article.content && (
                                                 <div 
                                                     className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 prose prose-sm dark:prose-invert max-w-none"
                                                     dangerouslySetInnerHTML={{ __html: formatArticleContent(article.content, 200) }}
                                                 />
                                            )}
                                            {article.tag && (
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                                                        {article.tag}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                                        Nenhum artigo encontrado na categoria "{selectedCategory}"
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modal do Artigo */}
            {selectedArticle && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
                                         <div className="rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden bg-white dark:bg-gray-800" style={{borderRadius: '12px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'}}>
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                                    {selectedArticle.category}
                                </span>
                                {selectedArticle.createdAt && (
                                    <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(selectedArticle.createdAt).toLocaleDateString('pt-BR')}
                                    </span>
                                )}
                            </div>
                            <button 
                                onClick={() => setSelectedArticle(null)}
                                className="text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white text-2xl font-bold"
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
                                {selectedArticle.title}
                            </h2>
                            
                            <div 
                                className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                                dangerouslySetInnerHTML={{ __html: formatResponseText(selectedArticle.content, 'article') }}
                            />
                            
                            {selectedArticle.tag && (
                                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Tag:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm">
                                            {selectedArticle.tag}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
};

// Página de Processos (Chatbot)
const ProcessosPage = () => {
    const [promptFromFaq, setPromptFromFaq] = useState(null);
    const [faq, setFaq] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTop10FAQ = async () => {
            try {
                setLoading(true);
                
                // Usar novo endpoint do backend para Top 10 FAQ
                const response = await fetch(`${API_BASE_URL}/faq/top10`);
                const result = await response.json();
                
                console.log('Top 10 FAQ carregado:', result);
                
                if (result.success && result.data && result.data.length > 0) {
                    setFaq(result.data);
                } else {
                    console.warn('⚠️ Nenhuma pergunta frequente encontrada');
                    setFaq([]);
                }
            } catch (error) {
                console.error('Erro ao carregar Top 10 FAQ do backend:', error);
                console.log('📋 Usando fallback para FAQ padrão...');
                
                // Fallback para FAQ padrão se Apps Script falhar
                try {
                    const fallbackResponse = await faqAPI.getAll();
                    if (fallbackResponse.data && fallbackResponse.data.length > 0) {
                        setFaq(fallbackResponse.data.slice(0, 10)); // Pegar apenas 10
                    } else {
                        setFaq([]);
                    }
                } catch (fallbackError) {
                    console.error('Erro no fallback FAQ:', fallbackError);
                    setFaq([]);
                }
            } finally {
                setLoading(false);
            }
        };
        
        fetchTop10FAQ();
    }, []);

    const handleFaqClick = (question) => {
        setPromptFromFaq({ text: question, id: Date.now() }); 
    };

    return (
        <div className="w-full py-8" style={{paddingLeft: '20px', paddingRight: '20px'}}>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                    <Chatbot prompt={promptFromFaq} />
                </div>
                                <aside className="lg:col-span-1 p-6 rounded-lg shadow-sm h-fit velohub-container" style={{borderRadius: '9.6px', boxShadow: '0 3.2px 16px rgba(0, 0, 0, 0.1)', padding: '19.2px'}}>
                    <h3 className="font-bold text-xl mb-4 border-b pb-2 text-center velohub-title" style={{borderColor: 'var(--blue-opaque)'}}>Perguntas Frequentes</h3>
                    
                    {loading && (
                        <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">Carregando...</p>
                        </div>
                    )}
                    
                    {!loading && (
                        <>
                            <ul className="space-y-3">
                                {faq.slice(0, 10).map((item, index) => {
                                    // Estrutura do Apps Script: {pergunta: string, frequencia: number}
                                    // Estrutura do MongoDB: {pergunta: string, palavras_chave: string, resposta: string, ...}
                                    const questionText = item.pergunta || item.question || 'Pergunta não disponível';
                                    return (
                                        <li key={index} onClick={() => handleFaqClick(questionText)} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-sm">
                                            {questionText}
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
};

// Componente FeedbackModal - REMOVIDO (agora no componente Chatbot)

// Componente do Chatbot - REMOVIDO (agora usando componente separado)
