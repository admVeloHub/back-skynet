/**
 * VeloHub V3 - Chatbot Component
 * VERSION: v1.3.2 | DATE: 2025-01-29 | AUTHOR: VeloHub Development Team
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, BookOpen, ThumbsUp, ThumbsDown } from 'lucide-react';
import { getUserSession } from '../services/auth';
import { API_BASE_URL } from '../config/api-config';
import ArticleModal from './ArticleModal';

// Componente do Chatbot Inteligente - Mantendo Layout Original
const Chatbot = ({ prompt }) => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [userId, setUserId] = useState(null);
    const chatBoxRef = useRef(null);
    const [feedbackForMessage, setFeedbackForMessage] = useState(null);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [selectedArticle, setSelectedArticle] = useState(null);
    
    // Estados dos módulos - controlados pelo Console VeloHub
    const [moduleStatus, setModuleStatus] = useState({
        'credito-trabalhador': 'on',
        'credito-pessoal': 'on', 
        'antecipacao': 'revisao',
        'pagamento-antecipado': 'off',
        'modulo-irpf': 'on'
    });

    // Função para buscar status dos módulos do Console VeloHub
    const fetchModuleStatus = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/module-status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                const statusData = await response.json();
                setModuleStatus(statusData);
            }
        } catch (error) {
            console.log('Erro ao buscar status dos módulos:', error);
        }
    };

    // Função para inicializar o VeloBot (handshake + carregamento do cache)
    const initializeVeloBot = async () => {
        try {
            console.log('🚀 VeloBot: Inicializando sistema completo...');
            
            // 1. Inicializar VeloBot (carregar Bot_perguntas em cache + handshake)
            if (userId && userId !== 'anonymous') {
                console.log('📦 VeloBot: Carregando Bot_perguntas em cache...');
                const initResponse = await fetch(`${API_BASE_URL}/chatbot/init?userId=${encodeURIComponent(userId)}`);
                if (initResponse.ok) {
                    const initData = await initResponse.json();
                    console.log('✅ VeloBot: Inicialização completa - IA primária:', initData.primaryAI);
                    console.log('✅ VeloBot: Bot_perguntas carregado em cache');
                } else {
                    console.warn('⚠️ VeloBot: Inicialização falhou - status:', initResponse.status);
                }
            } else {
                console.warn('⚠️ VeloBot: Usuário não identificado, pulando inicialização');
            }
            
            // 2. Health check das IAs
            console.log('🚀 VeloBot: Verificando saúde das IAs...');
            const handshakeResponse = await fetch(`${API_BASE_URL}/chatbot/health-check`);
            if (handshakeResponse.ok) {
                const handshakeData = await handshakeResponse.json();
                console.log('✅ VeloBot: Health check executado - IA primária:', handshakeData.primaryAI);
            } else {
                console.warn('⚠️ VeloBot: Health check falhou - status:', handshakeResponse.status);
            }
        } catch (error) {
            console.warn('⚠️ VeloBot: Erro na inicialização:', error.message);
        }
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

    // Refresh automático do status e inicialização do VeloBot
    useEffect(() => {
        // Buscar status inicial
        fetchModuleStatus();
        
        // Inicializar VeloBot (handshake das IAs) apenas quando a aba é acessada
        initializeVeloBot();
        
        // Configurar refresh automático
        const interval = setInterval(fetchModuleStatus, 3 * 60 * 1000); // 3 minutos (consistente com o sistema)
        
        return () => clearInterval(interval);
    }, []);

    // Obter userId do SSO
    useEffect(() => {
        try {
            const session = getUserSession();
            if (session && session.user && session.user.email) {
                setUserId(session.user.email); // Usar email como userId
                console.log('🤖 Chatbot: Usuário identificado:', session.user.email);
            } else {
                setUserId('anonymous');
                console.log('🤖 Chatbot: Usuário anônimo');
            }
        } catch (error) {
            console.error('❌ Chatbot: Erro ao obter sessão:', error);
            setUserId('anonymous');
        }
    }, []);

    useEffect(() => {
        if (prompt) {
            handleSendMessage(prompt.text);
        }
    }, [prompt]);

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Função para chamar o botão IA com formatação específica
    const handleAIButton = async (question, botPerguntaResponse, articleContent, formatType = 'conversational') => {
        try {
            console.log('🤖 AI Button: Enviando solicitação para resposta conversacional');
            console.log('🤖 AI Button: Dados sendo enviados:', {
                question: question ? 'presente' : 'ausente',
                botPerguntaResponse: botPerguntaResponse ? 'presente' : 'ausente',
                articleContent: articleContent ? 'presente' : 'ausente',
                userId: userId || 'não fornecido',
                sessionId: sessionId || 'não fornecido'
            });
            
            const response = await fetch(`${API_BASE_URL}/chatbot/ai-response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: question,
                    botPerguntaResponse: botPerguntaResponse,
                    articleContent: articleContent,
                    userId: userId,
                    sessionId: sessionId,
                    formatType: formatType
                })
            });

            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                console.log('✅ AI Button: Resposta conversacional recebida:', data);

                // Adicionar resposta da IA como nova mensagem
                const aiMessage = {
                    id: Date.now() + Math.random(),
                    text: data.response,
                    sender: 'bot',
                    feedbackState: 'pending',
                    source: 'ai_button',
                    aiProvider: data.aiProvider,
                    timestamp: data.timestamp
                };

                setMessages(prev => [...prev, aiMessage]);

                // Log da atividade
                try {
                    await fetch(`${API_BASE_URL}/chatbot/activity`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            action: 'ai_button_used',
                            details: {
                                originalQuestion: question,
                                aiProvider: data.aiProvider,
                                responseLength: data.response ? data.response.length : 0
                            },
                            userId: userId,
                            sessionId: sessionId
                        })
                    });
                } catch (activityError) {
                    console.warn('⚠️ AI Button: Erro ao logar atividade:', activityError);
                }

            } else {
                throw new Error(data.error || 'Erro desconhecido na API');
            }

        } catch (error) {
            console.error('❌ AI Button: Erro ao enviar solicitação:', error);
            
            // Fallback para resposta de erro
            const errorMessage = {
                id: Date.now() + Math.random(),
                text: 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.',
                sender: 'bot',
                feedbackState: 'pending',
                source: 'ai_button_error'
            };

            setMessages(prev => [...prev, errorMessage]);
        }
    };

    // Função para clarification direto (sem re-análise da IA)
    const handleClarificationClick = async (option) => {
        try {
            const trimmedInput = option.trim();
            if (!trimmedInput || isTyping) return;

            const newMessages = [...messages, { id: Date.now(), text: trimmedInput, sender: 'user' }];
            setMessages(newMessages);
            setIsTyping(true);

            try {
                console.log('🔍 Clarification Direto: Enviando opção selecionada:', trimmedInput);

                // Chamar API de clarification direto
                const response = await fetch(`${API_BASE_URL}/chatbot/clarification`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        question: trimmedInput,
                        userId: userId,
                        sessionId: sessionId
                    })
                });

                if (!response.ok) {
                    throw new Error(`Erro na API: ${response.status}`);
                }

                const data = await response.json();

                if (data.success) {
                    console.log('✅ Clarification Direto: Resposta recebida:', data);

                    // Atualizar sessionId se fornecido
                    if (data.sessionId) {
                        setSessionId(data.sessionId);
                    }

                    // Adicionar resposta do bot
                    const botMessage = {
                        id: Date.now() + 1,
                        text: data.response,
                        sender: 'bot',
                        timestamp: new Date().toISOString(),
                        source: data.source,
                        sourceId: data.sourceId,
                        sourceRow: data.sourceRow
                    };

                    setMessages(prev => [...prev, botMessage]);
                } else {
                    throw new Error(data.error || 'Erro na resposta da API');
                }

            } catch (error) {
                console.error('❌ Clarification Direto: Erro ao enviar solicitação:', error);
                
                const errorMessage = {
                    id: Date.now() + 1,
                    text: 'Desculpe, ocorreu um erro ao processar sua seleção. Tente novamente.',
                    sender: 'bot',
                    timestamp: new Date().toISOString()
                };
                
                setMessages(prev => [...prev, errorMessage]);
            }

        } catch (error) {
            console.error('❌ Clarification Direto: Erro geral:', error);
        } finally {
            setIsTyping(false);
        }
    };

    // Função para enviar mensagem para a nova API inteligente
    const handleSendMessage = async (text) => {
        try {
            const trimmedInput = text.trim();
        if (!trimmedInput || isTyping) return;

        const newMessages = [...messages, { id: Date.now(), text: trimmedInput, sender: 'user' }];
        setMessages(newMessages);
        setInputValue('');
        setIsTyping(true);

        try {
            console.log('🤖 Chatbot: Enviando pergunta para API inteligente:', trimmedInput);

            // Chamar a nova API de chat inteligente
            const response = await fetch(`${API_BASE_URL}/chatbot/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: trimmedInput,
                    userId: userId,
                    sessionId: sessionId
                })
            });

            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                console.log('✅ Chatbot: Resposta recebida da API:', data);

                // Atualizar sessionId se fornecido
                if (data.sessionId) {
                    setSessionId(data.sessionId);
                }

                // Determinar o texto da resposta (diferentes estruturas de resposta)
                let responseText = '';
                let responseData = null;
                
                if (data.data && data.data.status === 'clarification_needed') {
                    // Resposta de esclarecimento
                    responseText = data.data.resposta || 'Precisa de esclarecimento';
                    responseData = data.data;
                } else if (data.response) {
                    // Resposta normal
                    responseText = data.response;
                    responseData = data;
                } else if (data.data && data.data.resposta) {
                    // Resposta alternativa
                    responseText = data.data.resposta;
                    responseData = data.data;
                } else if (data.message) {
                    // Resposta com message
                    responseText = data.message;
                    responseData = data;
                } else {
                    // Fallback para resposta desconhecida
                    responseText = 'Resposta recebida, mas formato não reconhecido';
                    responseData = data;
                    console.warn('⚠️ Chatbot: Estrutura de resposta não reconhecida:', data);
                }

                // Adicionar resposta do bot
                const botMessage = {
                    id: data.messageId || Date.now() + 1,
                    text: responseText,
                    sender: 'bot',
                    feedbackState: 'pending',
                    source: data.source || (data.data ? data.data.source : 'unknown'),
                    timestamp: data.timestamp || (data.data ? data.data.timestamp : new Date().toISOString()),
                    // Dados para o botão IA
                    originalQuestion: trimmedInput,
                    botPerguntaResponse: responseText,
                    articleContent: data.articles && data.articles.length > 0 ? data.articles[0].content : null,
                    hasArticle: data.articles && data.articles.length > 0,
                    articleId: data.articles && data.articles.length > 0 ? data.articles[0].id : null,
                    // Dados específicos para esclarecimento
                    clarificationData: data.data && data.data.status === 'clarification_needed' ? data.data : null
                };

                let finalMessages = [...newMessages, botMessage];

                // Adicionar artigos sugeridos se disponíveis
                if (data.articles && data.articles.length > 0) {
                    const articlesMessage = {
                        id: Date.now() + 2,
                        type: 'articles',
                        articles: data.articles,
                        sender: 'bot'
                    };
                    finalMessages.push(articlesMessage);
                }

                setMessages(finalMessages);

                // Log da atividade (opcional - pode ser feito no backend)
                try {
                    await fetch(`${API_BASE_URL}/chatbot/activity`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            action: 'question_answered',
                            details: {
                                question: trimmedInput,
                                responseLength: data.response ? data.response.length : 0,
                                source: data.source,
                                hasArticles: data.articles && data.articles.length > 0
                            },
                            userId: userId,
                            sessionId: sessionId
                        })
                    });
                } catch (activityError) {
                    console.warn('⚠️ Chatbot: Erro ao logar atividade:', activityError);
                }

            } else {
                // Tratar resposta de erro
                console.error('❌ Chatbot: Erro na API:', data);
                
                const errorMessage = {
                    id: Date.now() + Math.random(),
                    text: data.error || 'Desculpe, ocorreu um erro. Tente novamente.',
                    sender: 'bot',
                    feedbackState: 'pending',
                    source: 'error',
                    timestamp: new Date().toISOString()
                };

                setMessages(prev => [...prev, errorMessage]);
                return;
            }

        } catch (error) {
            console.error('❌ Chatbot: Erro ao enviar mensagem:', error);
            
            // Fallback para resposta de erro
            const errorMessage = {
                id: Date.now() + 1,
                text: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente em alguns instantes.',
                sender: 'bot',
                feedbackState: 'pending',
                source: 'error'
            };

            setMessages([...newMessages, errorMessage]);
        } finally {
            setIsTyping(false);
        }
        } catch (error) {
            console.error('❌ Chatbot: Erro crítico na função handleSendMessage:', error);
            setIsTyping(false);
        }
    };

    // Função para enviar feedback
    const handleFeedback = async (messageId, feedbackType, comment = '') => {
        try {
            console.log('📝 Chatbot: Enviando feedback:', { messageId, feedbackType, comment });

            const response = await fetch(`${API_BASE_URL}/chatbot/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messageId: messageId,
                    feedbackType: feedbackType,
                    comment: comment,
                    userId: userId,
                    sessionId: sessionId,
                    question: messages.find(m => m.id === messageId)?.text || '',
                    answer: messages.find(m => m.id === messageId)?.text || ''
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Chatbot: Feedback enviado com sucesso:', data.data.message);
            } else {
                console.error('❌ Chatbot: Erro ao enviar feedback:', response.status);
            }

        } catch (error) {
            console.error('❌ Chatbot: Erro ao enviar feedback:', error);
        }

        // Atualizar estado local independente do resultado da API
        setMessages(currentMessages =>
            currentMessages.map(msg =>
                msg.id === messageId ? { ...msg, feedbackState: 'given' } : msg
            )
        );
    };

    // Função para clicar em artigo (MELHORIA)
    const handleArticleClick = async (article) => {
        try {
            console.log('📖 Chatbot: Artigo clicado:', article.title);

            // Log da atividade
            await fetch(`${API_BASE_URL}/chatbot/activity`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'article_viewed',
                    details: {
                        articleId: article.id,
                        articleTitle: article.title,
                        fromChatbot: true
                    },
                    userId: userId,
                    sessionId: sessionId
                })
            });

            // Navegar para a aba Artigos e abrir o modal
            // Disparar evento customizado para mudar de aba
            const event = new CustomEvent('navigateToArticles', {
                detail: { articleId: article.id }
            });
            window.dispatchEvent(event);
            
            console.log('📖 Chatbot: Navegando para aba Artigos com artigo:', article.title);

        } catch (error) {
            console.error('❌ Chatbot: Erro ao logar visualização de artigo:', error);
            // Mesmo com erro no log, navegar para a aba
            const event = new CustomEvent('navigateToArticles', {
                detail: { articleId: article.id }
            });
            window.dispatchEvent(event);
        }
    };

    // Funções do modal de feedback (mantendo exatamente como antes)
    const openFeedbackModal = (message) => { 
        setFeedbackForMessage(message); 
    };
    
    const closeFeedbackModal = () => { 
        setFeedbackForMessage(null); 
        setFeedbackComment(''); 
    };
    
    const submitFeedbackModal = (comment) => { 
        handleFeedback(feedbackForMessage.id, 'negative', comment); 
        closeFeedbackModal(); 
    };

    return (
        <>
            <div className="flex flex-col h-[80vh] velohub-modal" style={{borderRadius: '12px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)', border: '1px solid var(--cor-borda)'}}>
        {/* Header - Sistema de Status de Serviços */}
        <div className="flex-shrink-0 p-3" style={{borderBottom: '1px solid var(--cor-borda)'}}>
            {/* Grid de Status dos Serviços - Layout 4x2 */}
            <div className="grid grid-cols-4 gap-1">
                {/* Status do APP - Primeira célula */}
                <div className="flex items-center text-xs p-1">
                    <h2 className="text-2xl font-semibold" style={{color: 'var(--blue-dark)', fontFamily: 'Poppins, sans-serif'}}>Status do APP</h2>
                </div>
                
                {/* Crédito Trabalhador */}
                {renderModuleStatus('credito-trabalhador', 'Crédito Trabalhador')}
                
                {/* Crédito Pessoal */}
                {renderModuleStatus('credito-pessoal', 'Crédito Pessoal')}
                
                {/* Antecipação */}
                {renderModuleStatus('antecipacao', 'Antecipação')}
                
                {/* Espaço vazio para alinhamento */}
                <div></div>
                
                {/* Pagamento Antecipado */}
                {renderModuleStatus('pagamento-antecipado', 'Pagamento Antecipado')}
                
                {/* Módulo IRPF */}
                {renderModuleStatus('modulo-irpf', 'Módulo IRPF')}
                
                {/* Espaço reservado para 6º módulo */}
                <div></div>
            </div>
                </div>

                {/* Chat Box - MANTENDO EXATAMENTE IGUAL */}
                <div ref={chatBoxRef} className="flex-grow p-6 overflow-y-auto space-y-6">
                    {messages.length === 0 && !isTyping && (
                        <div className="flex justify-center items-center h-full">
                            <div className="text-center">
                                <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/50 rounded-full mx-auto animate-pulse flex items-center justify-center">
                                    <Bot size={48} className="text-blue-500"/>
                                </div>
                                <p className="mt-4" style={{color: 'var(--cor-texto-secundario)'}}>Faça uma pergunta para começar.</p>
                            </div>
                        </div>
                    )}
                    
                    {messages.map(msg => {
                        if (msg.type === 'articles') {
                            return (
                                <div key={msg.id} className="flex gap-3 justify-start">
                                    <img src="https://github.com/VeloProcess/PDP-Portal-de-Processos-/blob/main/unnamed%20(2).png?raw=true" alt="Bot" className="w-8 h-8 rounded-full" />
                                    <div className="max-w-md p-4 rounded-2xl rounded-bl-none" style={{backgroundColor: 'var(--cor-container)', border: '1px solid var(--cor-borda)'}}>
                                        <h4 className="font-semibold text-sm mb-2" style={{color: 'var(--blue-dark)'}}>Artigos relacionados:</h4>
                                        <ul className="space-y-2">
                                            {msg.articles.map(article => (
                                                <li 
                                                    key={article.id} 
                                                    onClick={() => handleArticleClick(article)}
                                                    className="cursor-pointer text-sm flex items-center gap-2 p-2 rounded transition-colors"
                                                    style={{color: 'var(--blue-medium)', backgroundColor: 'transparent'}}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.backgroundColor = 'var(--cor-borda)';
                                                        e.target.style.color = 'var(--blue-dark)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.backgroundColor = 'transparent';
                                                        e.target.style.color = 'var(--blue-medium)';
                                                    }}
                                                >
                                                    <BookOpen size={14} /> {article.title}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )
                        }
                        return (
                            <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.sender === 'bot' && <img src="https://github.com/VeloProcess/PDP-Portal-de-Processos-/blob/main/unnamed%20(2).png?raw=true" alt="Bot" className="w-8 h-8 rounded-full" />}
                                <div className={`max-w-md p-3 rounded-2xl ${msg.sender === 'user' ? 'rounded-br-none' : 'rounded-bl-none'}`} 
                                     style={msg.sender === 'user' ? 
                                        {backgroundColor: 'var(--blue-medium)', color: 'var(--white)'} : 
                                        {backgroundColor: 'var(--cor-container)', color: 'var(--cor-texto-principal)', border: '1px solid var(--cor-borda)'}
                                     }>
                                    <p>{msg.text}</p>
                                    
                                    {/* Opções de esclarecimento */}
                                    {msg.clarificationData && msg.clarificationData.options && (
                                        <div className="mt-3 space-y-2">
                                            <p className="text-sm font-medium text-gray-600">Escolha uma das opções:</p>
                                            <div className="space-y-1">
                                                {msg.clarificationData.options.slice(0, 5).map((option, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => handleClarificationClick(option)}
                                                        className="w-full text-left p-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                                        style={{color: 'var(--cor-texto-principal)'}}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Botões IA - WhatsApp e E-mail */}
                                    {msg.sender === 'bot' && msg.originalQuestion && (
                                        <div className="flex justify-end gap-2 mt-2">
                                            {/* Botão WhatsApp */}
                                            <button 
                                                onClick={() => handleAIButton(msg.originalQuestion, msg.botPerguntaResponse, msg.articleContent, 'whatsapp')}
                                                title="Formatação para WhatsApp"
                                            >
                                                <img 
                                                    src="/wpp logo.png" 
                                                    alt="WhatsApp" 
                                                    style={{ width: '20px', height: '20px' }}
                                                />
                                            </button>
                                            
                                            {/* Botão E-mail */}
                                            <button 
                                                onClick={() => handleAIButton(msg.originalQuestion, msg.botPerguntaResponse, msg.articleContent, 'email')}
                                                title="Formatação para E-mail formal"
                                            >
                                                <img 
                                                    src="/octa logo.png" 
                                                    alt="E-mail" 
                                                    style={{ width: '20px', height: '20px' }}
                                                />
                                            </button>
                                        </div>
                                    )}
                                    
                                    {msg.feedbackState === 'pending' && (
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => handleFeedback(msg.id, 'positive')} className="p-1 transition-colors" style={{color: 'var(--cor-texto-secundario)'}} onMouseEnter={(e) => e.target.style.color = 'var(--blue-medium)'} onMouseLeave={(e) => e.target.style.color = 'var(--cor-texto-secundario)'}><ThumbsUp size={16}/></button>
                                            <button onClick={() => openFeedbackModal(msg)} className="p-1 transition-colors" style={{color: 'var(--cor-texto-secundario)'}} onMouseEnter={(e) => e.target.style.color = 'var(--yellow)'} onMouseLeave={(e) => e.target.style.color = 'var(--cor-texto-secundario)'}><ThumbsDown size={16}/></button>
                                        </div>
                                    )}
                                    {msg.feedbackState === 'given' && (
                                        <p className="text-xs mt-2 font-semibold" style={{color: 'var(--green)'}}>Obrigado pelo feedback!</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                    {isTyping && (
                        <div className="flex gap-3 justify-start">
                            <img src="https://github.com/VeloProcess/PDP-Portal-de-Processos-/blob/main/unnamed%20(2).png?raw=true" alt="Bot" className="w-8 h-8 rounded-full" />
                            <div className="max-w-md p-3 rounded-2xl rounded-bl-none" style={{backgroundColor: 'var(--cor-container)', color: 'var(--cor-texto-principal)', border: '1px solid var(--cor-borda)'}}>
                                <div className="flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full animate-bounce [animation-delay:-0.3s]" style={{backgroundColor: 'var(--blue-medium)'}}></span>
                                    <span className="h-2 w-2 rounded-full animate-bounce [animation-delay:-0.15s]" style={{backgroundColor: 'var(--blue-medium)'}}></span>
                                    <span className="h-2 w-2 rounded-full animate-bounce" style={{backgroundColor: 'var(--blue-medium)'}}></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area - MANTENDO EXATAMENTE IGUAL */}
                <div className="flex-shrink-0 p-4" style={{borderTop: '1px solid var(--cor-borda)'}}>
                    <div className="relative">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                            placeholder="Digite sua mensagem..."
                            className="w-full border-transparent rounded-full py-3 px-5 pr-14 focus:outline-none"
                            style={{backgroundColor: 'var(--cor-container)', color: 'var(--cor-texto-principal)', border: '1px solid var(--cor-borda)'}}
                        />
                        <button onClick={() => handleSendMessage(inputValue)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 transition-colors" style={{backgroundColor: 'var(--blue-medium)', color: 'var(--white)'}} onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--blue-dark)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--blue-medium)'} disabled={isTyping || !inputValue}>
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Modal de Artigo - NOVA FUNCIONALIDADE */}
            <ArticleModal 
                isOpen={!!selectedArticle}
                onClose={() => setSelectedArticle(null)}
                article={selectedArticle}
            />
            
            {/* Modal de Feedback - MANTENDO EXATAMENTE IGUAL */}
            <FeedbackModal 
                isOpen={!!feedbackForMessage}
                onClose={closeFeedbackModal}
                onSubmit={submitFeedbackModal}
                comment={feedbackComment}
                setComment={setFeedbackComment}
            />
        </>
    );
};

// Componente do Modal de Feedback - MANTENDO EXATAMENTE IGUAL
const FeedbackModal = ({ isOpen, onClose, onSubmit, comment, setComment }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="p-6 rounded-lg shadow-xl max-w-md w-full mx-4" style={{backgroundColor: 'var(--cor-container)', border: '1px solid var(--cor-borda)'}}>
                <h3 className="text-2x1 font-semibold mb-4" style={{color: 'var(--blue-dark)'}}>Feedback</h3>
                <p className="mb-4" style={{color: 'var(--cor-texto-secundario)'}}>Como podemos melhorar nossa resposta?</p>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Digite seu comentário..."
                    className="w-full p-3 rounded-md resize-none"
                    style={{backgroundColor: 'var(--cor-fundo)', color: 'var(--cor-texto-principal)', border: '1px solid var(--cor-borda)'}}
                    rows={4}
                />
                <div className="flex gap-3 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-md transition-colors"
                        style={{color: 'var(--cor-texto-secundario)', border: '1px solid var(--cor-borda)', backgroundColor: 'transparent'}}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--cor-borda)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSubmit(comment)}
                        className="flex-1 px-4 py-2 rounded-md transition-colors"
                        style={{backgroundColor: 'var(--blue-medium)', color: 'var(--white)'}}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--blue-dark)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--blue-medium)'}
                    >
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;


