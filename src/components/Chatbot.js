/**
 * VeloHub V3 - Chatbot Component
 * VERSION: v1.10.3 | DATE: 2025-01-30 | AUTHOR: VeloHub Development Team
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, BookOpen, ThumbsUp, ThumbsDown } from 'lucide-react';
import { getUserSession } from '../services/auth';
import { API_BASE_URL } from '../config/api-config';

// Log da configuração da API para debug
console.log('🔧 Chatbot - API_BASE_URL:', API_BASE_URL);

// Componente do Chatbot Inteligente - Mantendo Layout Original
// VERSION: v1.10.3 | DATE: 2025-01-30 | AUTHOR: VeloHub Development Team
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
            console.log('🔍 Buscando status dos módulos em:', url);
            console.log('🔍 API_BASE_URL completo:', API_BASE_URL);
            
            // Teste de conectividade básica
            const testResponse = await fetch(`${API_BASE_URL}/test`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            console.log('🧪 Teste de conectividade:', {
                status: testResponse.status,
                ok: testResponse.ok,
                url: `${API_BASE_URL}/test`
            });
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            console.log('📊 Resposta recebida:', {
                status: response.status,
                statusText: response.statusText,
                contentType: response.headers.get('content-type'),
                ok: response.ok
            });
            
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const statusData = await response.json();
                    console.log('✅ Status dos módulos recebido:', statusData);
                    setModuleStatus(statusData);
                } else {
                    console.error('❌ Resposta não é JSON. Content-Type:', contentType);
                    const textResponse = await response.text();
                    console.error('❌ Conteúdo da resposta:', textResponse.substring(0, 200));
                }
            } else {
                console.error('❌ Erro HTTP:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Conteúdo do erro:', errorText.substring(0, 200));
            }
        } catch (error) {
            console.error('❌ Erro ao buscar status dos módulos:', error);
            console.error('❌ Stack trace:', error.stack);
            
            // Fallback: usar dados padrão se a API não estiver disponível
            console.log('🔄 Usando dados padrão como fallback...');
            const fallbackStatus = {
                'credito-trabalhador': 'on',
                'credito-pessoal': 'on',
                'antecipacao': 'off',
                'pagamento-antecipado': 'on',
                'modulo-irpf': 'off',
                'seguro-cred': 'on',
                'seguro-cel': 'on'
            };
            setModuleStatus(fallbackStatus);
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

    // Obter userId do SSO PRIMEIRO
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

    // Inicializar VeloBot APÓS userId estar disponível
    useEffect(() => {
        if (userId) {
            console.log('🚀 VeloBot: userId disponível, inicializando sistema...');
            initializeVeloBot();
        }
    }, [userId]);

    // Refresh automático do status (independente do userId)
    useEffect(() => {
        // Buscar status inicial
        fetchModuleStatus();
        
        // Configurar refresh automático
        const interval = setInterval(fetchModuleStatus, 3 * 60 * 1000); // 3 minutos (consistente com o sistema)
        
        return () => clearInterval(interval);
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
    // Função para limpar e formatar texto da resposta (EXPANDIDA)
    const formatResponseText = (text, source = 'unknown') => {
        if (!text) return '';
        
        let cleanText = text;
        
        // 1. Processar JSON arrays (funcionalidade existente)
        if (text.includes('[{') && text.includes('}]')) {
            try {
                const jsonData = JSON.parse(text);
                if (Array.isArray(jsonData)) {
                    cleanText = jsonData.map((item, index) => {
                        const title = item.title || `Passo ${index + 1}`;
                        const content = item.content || '';
                        return `${index + 1}. **${title}**\n\n${content}`;
                    }).join('\n\n');
                } else {
                    cleanText = text;
                }
            } catch (error) {
                console.warn('⚠️ Erro ao parsear JSON:', error);
                cleanText = text.replace(/\[|\]|\{|\}/g, '').replace(/"/g, '').trim();
            }
        }
        
        // 2. Formatar listas numeradas simples
        cleanText = cleanText.replace(/(\d+)[.)]\s*([^\n]+)/g, (match, number, content) => {
            return `${number}. ${content.trim()}`;
        });
        
        // 3. Formatar listas com bullets
        cleanText = cleanText.replace(/^[\s]*[-*]\s*([^\n]+)/gm, (match, content) => {
            return `• ${content.trim()}`;
        });
        
        // 4. Formatar quebras de linha
        cleanText = cleanText
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .split('\n')
            .map(line => line.trim())
            .join('\n')
            .replace(/^\n+/, '')
            .replace(/\n+$/, '')
            .replace(/\n/g, '<br>'); // Converter quebras de linha para HTML
        
        // 5. Formatar markdown básico
        cleanText = cleanText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // 6. Formatar links simples
        cleanText = cleanText.replace(/(https?:\/\/[^\s]+)/g, (match, url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
        
        // 7. Limpar formatação excessiva
        cleanText = cleanText
            .replace(/<(\w+)[^>]*>\s*<\/\1>/g, '')
            .replace(/\s{3,}/g, ' ')
            .replace(/\n{3,}/g, '\n\n');
        
        console.log(`🔧 Chatbot: Texto formatado (${source}) - ${cleanText.length} chars`);
        
        return cleanText;
    };

    // Função para copiar texto para área de transferência
    const handleCopyText = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            console.log('✅ Texto copiado para área de transferência');
            // Opcional: mostrar feedback visual
        } catch (error) {
            console.error('❌ Erro ao copiar texto:', error);
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    };

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
                    const formattedResponse = formatResponseText(data.response);
                    const botMessage = {
                        id: Date.now() + 1,
                        text: formattedResponse,
                        sender: 'bot',
                        feedbackState: 'pending', // Adicionar estado de feedback
                        timestamp: new Date().toISOString(),
                        source: data.source,
                        sourceId: data.sourceId,
                        sourceRow: data.sourceRow,
                        tabulacao: data.tabulacao || null,
                        // Campos necessários para botões WhatsApp/Email
                        originalQuestion: trimmedInput,
                        botPerguntaResponse: formattedResponse,
                        articleContent: data.articles && data.articles.length > 0 ? data.articles[0].content : null,
                        hasArticle: data.articles && data.articles.length > 0,
                        articleId: data.articles && data.articles.length > 0 ? data.articles[0].id : null
                    };

                    let finalMessages = [...messages, botMessage];

                    // Adicionar artigos relacionados se disponíveis
                    if (data.articles && data.articles.length > 0) {
                        const articlesMessage = {
                            id: Date.now() + 2,
                            type: 'articles',
                            articles: data.articles,
                            timestamp: new Date().toISOString()
                        };
                        finalMessages.push(articlesMessage);
                    }

                    setMessages(finalMessages);
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
                
                if (data.source === 'clarification' && data.clarificationMenu) {
                    // Resposta de esclarecimento (nova estrutura)
                    responseText = data.response || 'Precisa de esclarecimento';
                    responseData = {
                        status: 'clarification_needed',
                        resposta: data.response,
                        options: data.clarificationMenu.options,
                        question: data.clarificationMenu.question
                    };
                } else if (data.data && data.data.status === 'clarification_needed') {
                    // Resposta de esclarecimento (estrutura antiga)
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
                const formattedResponseText = formatResponseText(responseText, responseData.source || 'unknown');
                const botMessage = {
                    id: data.messageId || Date.now() + 1,
                    text: formattedResponseText,
                    sender: 'bot',
                    feedbackState: 'pending',
                    source: data.source || (data.data ? data.data.source : 'unknown'),
                    timestamp: data.timestamp || (data.data ? data.data.timestamp : new Date().toISOString()),
                    tabulacao: data.tabulacao || null,
                    // Dados para o botão IA
                    originalQuestion: trimmedInput,
                    botPerguntaResponse: formattedResponseText,
                    articleContent: data.articles && data.articles.length > 0 ? data.articles[0].content : null,
                    hasArticle: data.articles && data.articles.length > 0,
                    articleId: data.articles && data.articles.length > 0 ? data.articles[0].id : null,
                    // Dados específicos para esclarecimento
                    clarificationData: (data.data && data.data.status === 'clarification_needed') ? data.data : 
                                     (data.source === 'clarification' && data.clarificationMenu) ? {
                                         status: 'clarification_needed',
                                         options: data.clarificationMenu.options,
                                         question: data.clarificationMenu.question
                                     } : null
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

            // Abrir o modal diretamente no Chatbot
            console.log('📖 Chatbot: Abrindo modal do artigo:', article.title);
            setSelectedArticle(article);

        } catch (error) {
            console.error('❌ Chatbot: Erro ao abrir modal do artigo:', error);
            // Mesmo com erro, tentar abrir o modal
            console.log('📖 Chatbot: Abrindo modal do artigo (fallback):', article.title);
            setSelectedArticle(article);
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
            {/* Grid de Status dos Serviços - Layout 5x2 */}
            <div className="grid grid-cols-5 gap-1">
                {/* Serviços Online - Primeira célula */}
                <div className="flex items-center text-xs p-1">
                    <h2 className="text-2xl font-semibold velohub-title" style={{fontFamily: 'Poppins, sans-serif'}}>Serviços Online</h2>
                </div>
                
                {/* Crédito Trabalhador */}
                {renderModuleStatus('credito-trabalhador', 'Crédito Trabalhador')}
                
                {/* Crédito Pessoal */}
                {renderModuleStatus('credito-pessoal', 'Crédito Pessoal')}
                
                {/* Antecipação */}
                {renderModuleStatus('antecipacao', 'Antecipação')}
                
                {/* Espaço vazio para alinhamento */}
                <div></div>
                
                {/* Espaço vazio para alinhamento */}
                <div></div>
                
                {/* Pagamento Antecipado */}
                {renderModuleStatus('pagamento-antecipado', 'Pagamento Antecipado')}
                
                {/* Módulo IRPF */}
                {renderModuleStatus('modulo-irpf', 'Módulo IRPF')}
                
                {/* Seguro Cred. */}
                {renderModuleStatus('seguro-cred', 'Seguro Cred.')}
                
                {/* Seguro Cel. - Coluna 5, Linha 2 */}
                {renderModuleStatus('seguro-cel', 'Seguro Cel.')}
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
                                    <img src="/mascote avatar.png" alt="Bot" className="w-14 h-14 rounded-full" />
                                    <div className="max-w-md p-4 rounded-2xl rounded-bl-none" style={{backgroundColor: 'var(--cor-container)', border: '1px solid var(--cor-borda)'}}>
                                        <h4 className="font-semibold text-sm mb-2" style={{color: 'var(--blue-dark)'}}>Artigos relacionados:</h4>
                                        <ul className="space-y-2">
                                            {msg.articles.map(article => (
                                                <li 
                                                    key={article.id} 
                                                    onClick={() => handleArticleClick(article)}
                                                    className="cursor-pointer text-sm flex items-center gap-2 p-2 rounded transition-colors hover:bg-gray-100"
                                                    style={{color: 'var(--blue-medium)'}}
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
                                {msg.sender === 'bot' && <img src="/mascote avatar.png" alt="Bot" className="w-14 h-14 rounded-full" />}
                                <div className={`max-w-md p-3 rounded-2xl ${msg.sender === 'user' ? 'rounded-br-none' : 'rounded-bl-none'}`} 
                                     style={msg.sender === 'user' ? 
                                        {backgroundColor: 'var(--blue-medium)', color: 'var(--white)'} : 
                                        {backgroundColor: 'var(--cor-container)', color: 'var(--cor-texto-principal)', border: '1px solid var(--cor-borda)'}
                                     }>
                                    {/* Texto principal */}
                                    <div dangerouslySetInnerHTML={{ __html: formatResponseText(msg.text, 'bot') }} />
                                    
                                    {/* Ícones de feedback e IA em linha separada */}
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="flex gap-2">
                                            {msg.feedbackState === 'pending' && (
                                                <>
                                                    <button onClick={() => handleFeedback(msg.id, 'positive')} className="p-1 transition-colors" style={{color: 'var(--cor-texto-secundario)'}} onMouseEnter={(e) => e.target.style.color = 'var(--blue-medium)'} onMouseLeave={(e) => e.target.style.color = 'var(--cor-texto-secundario)'}><ThumbsUp size={16}/></button>
                                                    <button onClick={() => openFeedbackModal(msg)} className="p-1 transition-colors" style={{color: 'var(--cor-texto-secundario)'}} onMouseEnter={(e) => e.target.style.color = 'var(--yellow)'} onMouseLeave={(e) => e.target.style.color = 'var(--cor-texto-secundario)'}><ThumbsDown size={16}/></button>
                                                    <button 
                                                        onClick={() => handleCopyText(msg.text)} 
                                                        className="p-1 transition-colors" 
                                                        style={{color: 'var(--cor-texto-secundario)'}} 
                                                        onMouseEnter={(e) => e.target.style.color = 'var(--blue-medium)'} 
                                                        onMouseLeave={(e) => e.target.style.color = 'var(--cor-texto-secundario)'}
                                                        title="Copiar texto"
                                                    >
                                                        📋
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        
                                        {/* Botões IA - WhatsApp e E-mail */}
                                        {msg.sender === 'bot' && msg.originalQuestion && (
                                            <div className="flex gap-2">
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
                                    </div>
                                    
                                    {/* Linha divisória e Tabulação */}
                                    {msg.sender === 'bot' && msg.tabulacao && (
                                        <>
                                            <div className="border-t mt-2 pt-2" style={{borderColor: 'var(--cor-borda)'}}>
                                                <p style={{color: 'var(--cor-texto-principal)'}}>
                                                    {msg.tabulacao}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                    
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
                                    {msg.feedbackState === 'given' && (
                                        <p className="text-xs mt-2 font-semibold" style={{color: 'var(--green)'}}>Obrigado pelo feedback!</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                    {isTyping && (
                        <div className="flex gap-3 justify-start">
                            <img src="/mascote avatar.png" alt="Bot" className="w-14 h-14 rounded-full" />
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
            
            {/* Modal de Artigo - MESMO MODAL DA PÁGINA DE ARTIGOS */}
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


