/**
 * VeloHub V3 - ErrosBugsTab Component
 * VERSION: v1.6.1 | DATE: 2025-01-30 | AUTHOR: VeloHub Development Team
 * Branch: escalacoes
 * 
 * Componente para reportar erros e bugs com anexos de imagem/vídeo
 * 
 * Mudanças v1.6.0:
 * - Implementada visualização e reprodução de vídeos no modal de anexos
 * - Adicionado modal de visualização de vídeo com player HTML5
 * - Implementada função de download de vídeos
 * - Vídeos agora podem ser reproduzidos quando os dados estão disponíveis no payload (videoData)
 * - Botões "Reproduzir" e "Download" adicionados para vídeos com dados disponíveis
 * 
 * Mudanças v1.5.0:
 * - Adicionado modal de visualização de imagem em tamanho maior
 * - Implementada função de download de imagens
 * - Melhorada interação com anexos: botões "Ver" e "Download" ao passar o mouse
 * - Corrigido problema de abertura de anexos que não funcionava corretamente
 * 
 * Mudanças v1.4.0:
 * - Reorganizado card de resultados da consulta de CPF para melhor visualização
 * - Removido prefixo "Erro/Bug - " do tipo de erro exibido no card
 * - Layout reorganizado: [Tipo] [CPF] na primeira linha, [agente] [data] [hora] [Status] na segunda linha, [Anexos] [ver anexos] na terceira linha
 * - Data e hora formatadas separadamente para melhor legibilidade
 * 
 * Mudanças v1.3.0:
 * - Corrigido envio de vídeos para WhatsApp: formato correto { data, type }
 * - Adicionado videoData no payload para incluir dados completos dos vídeos
 * - Formatação correta de imagens e vídeos antes de enviar para API WhatsApp
 * 
 * Mudanças v1.2.0:
 * - Adicionada funcionalidade de drag and drop para upload de arquivos
 * - Feedback visual quando arrastando arquivos sobre a área de upload
 * - Função processFiles unificada para processar arquivos de qualquer origem
 * 
 * Mudanças v1.1.0:
 * - Reorganizado layout para seguir padrão da aba Solicitações
 * - Adicionados cards de estatísticas no topo
 * - Campo agente automático movido para o topo
 * - Botão "Atualizar agora" com estilo gradiente no topo
 * - Consulta de CPF movida para sidebar superior
 * - Logs de Envio movidos para sidebar inferior
 * - Aplicados estilos consistentes (hover, focus ring reduzido)
 * - Implementada atualização automática a cada 3 minutos
 */

import React, { useEffect, useState, useRef } from 'react';
import { errosBugsAPI, logsAPI } from '../../services/escalacoesApi';
import { API_BASE_URL } from '../../config/api-config';

/**
 * Componente de aba para Erros/Bugs
 */
const ErrosBugsTab = () => {
  const [agente, setAgente] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [cpf, setCpf] = useState('');
  const [tipo, setTipo] = useState('App');
  const [descricao, setDescricao] = useState('');
  const [imagens, setImagens] = useState([]); // [{ name, type, data, preview }]
  const [videos, setVideos] = useState([]); // [{ name, type, data, thumbnail }]
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // URL da imagem selecionada para visualização
  const [selectedVideo, setSelectedVideo] = useState(null); // { data, type, name } do vídeo selecionado para visualização
  const [localLogs, setLocalLogs] = useState([]); // {cpf, tipo, waMessageId, status, createdAt}
  const [searchCpf, setSearchCpf] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [stats, setStats] = useState({ today: 0, pending: 0, done: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [errosBugsRaw, setErrosBugsRaw] = useState([]);
  const prevErrosBugsRef = useRef([]);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Normalizar nome do agente (Title Case, espaços simples)
   * @param {string} s - String a normalizar
   * @returns {string} String normalizada
   */
  const toTitleCase = (s = '') => {
    const lower = String(s).toLowerCase().replace(/\s+/g, ' ').trim();
    const keepLower = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
    return lower.split(' ').filter(Boolean).map((p, i) => {
      if (i > 0 && keepLower.has(p)) return p;
      return p.charAt(0).toUpperCase() + p.slice(1);
    }).join(' ');
  };

  /**
   * Carregar nome do agente da sessão do usuário
   */
  useEffect(() => {
    try {
      // Tentar obter da sessão do VeloHub primeiro
      const sessionData = localStorage.getItem('velohub_user_session');
      let agentName = '';
      
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          if (session?.user?.name) {
            agentName = session.user.name;
          }
        } catch (err) {
          console.error('Erro ao decodificar sessão:', err);
        }
      }
      
      // Fallback para localStorage antigo se não houver sessão
      if (!agentName) {
        agentName = localStorage.getItem('velotax_agent') || '';
      }
      
      if (agentName) {
        const normalized = toTitleCase(agentName);
        setSelectedAgent(normalized);
        setAgente(normalized);
        // Salvar também no localStorage para compatibilidade
        try {
          localStorage.setItem('velotax_agent', normalized);
        } catch (err) {
          console.error('Erro ao salvar agente:', err);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar agente:', err);
    }
  }, []);

  /**
   * Carregar logs do cache local
   */
  useEffect(() => {
    try {
      const cached = localStorage.getItem('velotax_local_logs_bugs');
      if (cached) setLocalLogs(JSON.parse(cached));
    } catch (err) {
      console.error('Erro ao carregar logs do cache:', err);
    }
  }, []);

  /**
   * Carregar estatísticas e erros/bugs
   */
  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const result = await errosBugsAPI.getAll();
      const list = Array.isArray(result.data) ? result.data : [];
      setErrosBugsRaw(list);
      setLastUpdated(new Date());

      // Calcular estatísticas
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayCount = list.filter(item => {
        const createdAt = new Date(item.createdAt);
        createdAt.setHours(0, 0, 0, 0);
        return createdAt.getTime() === today.getTime();
      }).length;

      const pendingCount = list.filter(item => {
        const status = String(item.status || '').toLowerCase();
        return status === 'em aberto' || status === 'enviado';
      }).length;

      const doneCount = list.filter(item => {
        const status = String(item.status || '').toLowerCase();
        return status === 'feito' || status === 'não feito' || status === 'nao feito';
      }).length;

      setStats({
        today: todayCount,
        pending: pendingCount,
        done: doneCount
      });
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
    setStatsLoading(false);
  };

  // Carregar estatísticas ao montar componente
  useEffect(() => {
    loadStats();
    
    // Atualização automática a cada 3 minutos (padrão VeloHub - intelligent refresh)
    const refreshInterval = setInterval(() => {
      loadStats();
    }, 3 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  /**
   * Salvar logs no cache local
   * @param {Array} items - Array de logs
   */
  const saveCache = (items) => {
    setLocalLogs(items);
    try {
      localStorage.setItem('velotax_local_logs_bugs', JSON.stringify(items));
    } catch (err) {
      console.error('Erro ao salvar logs no cache:', err);
    }
  };

  /**
   * Gerar thumbnail de imagem (~400px)
   * @param {string} dataUrl - Data URL da imagem
   * @returns {Promise<string|null>} Data URL do thumbnail ou null
   */
  const makeThumb = (dataUrl) => new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const maxW = 400;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    } catch (err) {
      resolve(null);
    }
  });

  /**
   * Processar arquivos arrastados ou selecionados
   * @param {FileList|Array<File>} files - Lista de arquivos
   */
  const processFiles = async (files) => {
    const fileArray = Array.from(files || []);
    const newImagens = [];
    const newVideos = [];

    for (const file of fileArray) {
      try {
        // Verificar tamanho máximo (50MB)
        if (file.size > 50 * 1024 * 1024) {
          alert(`O arquivo "${file.name}" é muito grande. Máximo permitido: 50MB`);
          continue;
        }

        // Verificar se é imagem
        if (file.type && file.type.startsWith('image/')) {
          const dataUrl = await new Promise((ok, err) => {
            const r = new FileReader();
            r.onload = () => ok(String(r.result));
            r.onerror = err;
            r.readAsDataURL(file);
          });
          const base64 = String(dataUrl).split(',')[1];
          const preview = await makeThumb(String(dataUrl));
          newImagens.push({
            name: file.name,
            type: file.type || 'image/jpeg',
            data: base64,
            preview
          });
        }
        // Verificar se é vídeo
        else if (file.type && file.type.startsWith('video/')) {
          const dataUrl = await new Promise((ok, err) => {
            const r = new FileReader();
            r.onload = () => ok(String(r.result));
            r.onerror = err;
            r.readAsDataURL(file);
          });
          const base64 = String(dataUrl).split(',')[1];
          const thumbnail = await makeVideoThumb(file);
          newVideos.push({
            name: file.name,
            type: file.type || 'video/mp4',
            data: base64,
            thumbnail
          });
        }
      } catch (err) {
        console.error('Erro ao processar arquivo:', err);
      }
    }

    if (newImagens.length > 0) {
      setImagens((prev) => [...prev, ...newImagens]);
    }
    if (newVideos.length > 0) {
      setVideos((prev) => [...prev, ...newVideos]);
    }
  };

  /**
   * Gerar thumbnail de vídeo
   * @param {File} videoFile - Arquivo de vídeo
   * @returns {Promise<string|null>} Data URL do thumbnail ou null
   */
  const makeVideoThumb = (videoFile) => new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.preload = 'metadata';
      video.addEventListener('loadedmetadata', () => {
        canvas.width = 320;
        canvas.height = (canvas.width / video.videoWidth) * video.videoHeight;
        video.currentTime = 1;
      });
      
      video.addEventListener('seeked', () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      });
      
      video.addEventListener('error', () => resolve(null));
      video.src = URL.createObjectURL(videoFile);
    } catch (err) {
      resolve(null);
    }
  });

  /**
   * Abrir modal de anexos
   * @param {Object} request - Requisição com anexos
   */
  const openAttachmentsModal = (request) => {
    setSelectedRequest(request);
    setShowAttachmentsModal(true);
  };

  /**
   * Fechar modal de anexos
   */
  const closeAttachmentsModal = () => {
    setSelectedRequest(null);
    setShowAttachmentsModal(false);
    setSelectedImage(null);
    setSelectedVideo(null);
  };

  /**
   * Abrir imagem em visualização ampliada
   * @param {string} imageUrl - URL da imagem (data URL)
   */
  const openImage = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  /**
   * Fechar visualização de imagem
   */
  const closeImage = () => {
    setSelectedImage(null);
  };

  /**
   * Download de imagem
   * @param {string} imageUrl - URL da imagem (data URL)
   * @param {string} filename - Nome do arquivo
   */
  const downloadImage = (imageUrl, filename = 'imagem') => {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename || 'imagem.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao fazer download da imagem:', err);
      // Fallback: abrir em nova aba
      window.open(imageUrl, '_blank');
    }
  };

  /**
   * Abrir vídeo em visualização ampliada
   * @param {Object} videoData - Dados do vídeo { data, type, name }
   */
  const openVideo = (videoData) => {
    if (videoData && videoData.data) {
      setSelectedVideo(videoData);
    }
  };

  /**
   * Fechar visualização de vídeo
   */
  const closeVideo = () => {
    setSelectedVideo(null);
  };

  /**
   * Download de vídeo
   * @param {string} videoDataUrl - Data URL do vídeo
   * @param {string} filename - Nome do arquivo
   */
  const downloadVideo = (videoDataUrl, filename = 'video') => {
    try {
      const link = document.createElement('a');
      link.href = videoDataUrl;
      link.download = filename || 'video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao fazer download do vídeo:', err);
    }
  };

  /**
   * Buscar erros/bugs por CPF
   */
  const buscarCpf = async () => {
    const digits = String(searchCpf || '').replace(/\D/g, '');
    if (!digits) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const result = await errosBugsAPI.getByCpf(digits);
      setSearchResults(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error('Erro ao buscar CPF:', err);
      setSearchResults([]);
    }
    setSearchLoading(false);
  };

  /**
   * Atualizar status dos logs locais e estatísticas
   */
  const refreshNow = async () => {
    await loadStats();
    if (!localLogs.length) return;
    try {
      const result = await errosBugsAPI.getAll();
      const all = Array.isArray(result.data) ? result.data : [];
      const updated = localLogs.map(item => {
        const match = item.waMessageId
          ? all.find(r => r.waMessageId === item.waMessageId)
          : all.find(r => r.cpf === item.cpf && String(r.tipo || '').startsWith('Erro/Bug'));
        return match ? { ...item, status: match.status } : item;
      });
      saveCache(updated);
    } catch (err) {
      console.error('Erro ao atualizar logs:', err);
    }
  };

  /**
   * Montar legenda para WhatsApp
   * @returns {string} Legenda formatada
   */
  const montarLegenda = () => {
    const agentName = selectedAgent || agente || '';
    let m = `*Novo Erro/Bug - ${tipo}*\n\n`;
    m += `Agente: ${agentName}\n`;
    if (cpf) m += `CPF: ${cpf}\n`;
    m += `\nDescrição:\n${descricao || '—'}\n`;
    if (imagens?.length || videos?.length) {
      const totalAnexos = (imagens?.length || 0) + (videos?.length || 0);
      const tipos = [];
      if (imagens?.length) tipos.push(`${imagens.length} imagem(ns)`);
      if (videos?.length) tipos.push(`${videos.length} vídeo(s)`);
      m += `\n[Anexos: ${totalAnexos} - ${tipos.join(', ')}]\n`;
    }
    return m;
  };

  /**
   * Enviar erro/bug
   * @param {Event} e - Evento do formulário
   */
  const enviar = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    // TODO: Configurar via variáveis de ambiente
    const apiUrl = process.env.REACT_APP_WHATSAPP_API_URL || '';
    const defaultJid = process.env.REACT_APP_WHATSAPP_DEFAULT_JID || '';

    const legenda = montarLegenda();

    try {
      // 1) Enviar via WhatsApp se configurado
      let waMessageId = null;
      let messageIdsArr = [];
      if (apiUrl && defaultJid) {
        try {
          // Formatar imagens e vídeos para o formato esperado pela API ({ data, type })
          const imagensFormatadas = imagens?.map(({ data, type }) => ({ data, type })).filter(img => img.data && img.type) || [];
          const videosFormatados = videos?.map(({ data, type }) => ({ data, type })).filter(vid => vid.data && vid.type) || [];
          
          const resp = await fetch(`${apiUrl}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jid: defaultJid,
              mensagem: legenda,
              imagens: imagensFormatadas,
              videos: videosFormatados
            })
          });
          const d = await resp.json().catch(() => ({}));
          waMessageId = d?.messageId || d?.key?.id || null;
          if (Array.isArray(d?.messageIds)) messageIdsArr = d.messageIds;
        } catch (err) {
          console.error('Erro ao enviar via WhatsApp:', err);
        }
      }

      // 2) Criar registro no backend
      const agentName = selectedAgent || agente || '';
      const erroBugData = {
        agente: agentName,
        cpf: cpf || '',
        tipo,
        payload: {
          agente: agentName,
          cpf,
          tipo,
          descricao,
          imagens: imagens?.map(({ name, type, data, preview }) => ({
            name,
            type,
            size: (data || '').length
          })),
          previews: imagens?.map(({ preview }) => preview).filter(Boolean),
          videos: videos?.map(({ name, type, data, thumbnail }) => ({
            name,
            type,
            size: (data || '').length
          })),
          videoThumbnails: videos?.map(({ thumbnail }) => thumbnail).filter(Boolean),
          // Incluir dados completos dos vídeos para envio via WhatsApp
          videoData: videos?.map(({ data, type }) => ({ data, type })).filter(vid => vid.data && vid.type) || [],
          messageIds: messageIdsArr
        },
        agentContact: defaultJid || null,
        waMessageId
      };

      const result = await errosBugsAPI.create(erroBugData);

      // 3) Criar log
      try {
        await logsAPI.create({
          action: 'send_request',
          detail: {
            tipo: `Erro/Bug - ${tipo}`,
            cpf,
            waMessageId,
            whatsappSent: !!(apiUrl && defaultJid)
          }
        });
      } catch (logErr) {
        console.error('Erro ao criar log:', logErr);
      }

      // 4) Adicionar ao cache local
      const newItem = {
        cpf,
        tipo: `Erro/Bug - ${tipo}`,
        waMessageId,
        status: 'em aberto',
        createdAt: new Date().toISOString()
      };
      saveCache([newItem, ...localLogs].slice(0, 50));

      setMsg(apiUrl && defaultJid ? 'Enviado e registrado com sucesso.' : 'Registrado no painel. WhatsApp não configurado.');
      // Não limpar agente, pois é automático
      setCpf('');
      setDescricao('');
      setImagens([]);
      setVideos([]);
      // Recarregar estatísticas após envio
      await loadStats();
    } catch (err) {
      console.error('Erro ao enviar erro/bug:', err);
      setMsg('Falha ao enviar/registrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-8">
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-gray-800 dark:text-gray-200">Enviando solicitação…</div>
            </div>
          </div>
        </div>
      )}

      {/* Container Principal */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:-translate-y-0.5 transition-transform" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Cards de Estatísticas + Campo Agente + Botão Atualizar */}
        <div className="mb-6 flex items-center justify-between gap-3 relative">
          <div
            className="grid grid-cols-3 gap-3 w-full max-w-xl"
            aria-busy={statsLoading}
            aria-live="polite"
          >
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl text-center border" style={{ borderColor: '#000058' }}>
              <div className="text-xs text-gray-600 dark:text-gray-400">Hoje</div>
              <div className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                {statsLoading ? (
                  <span className="inline-block h-6 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                ) : (
                  stats.today
                )}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl text-center border" style={{ borderColor: '#000058' }}>
              <div className="text-xs text-gray-600 dark:text-gray-400">Pendentes</div>
              <div className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                {statsLoading ? (
                  <span className="inline-block h-6 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                ) : (
                  stats.pending
                )}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl text-center border" style={{ borderColor: '#000058' }}>
              <div className="text-xs text-gray-600 dark:text-gray-400">Feitas</div>
              <div className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                {statsLoading ? (
                  <span className="inline-block h-6 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                ) : (
                  stats.done
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-gray-600 dark:text-gray-400 min-w-[120px] text-right">
              {lastUpdated
                ? `Atualizado às ${new Date(lastUpdated).toLocaleTimeString()}`
                : ''}
            </div>
            <button
              onClick={refreshNow}
              disabled={statsLoading}
              className="text-sm px-3 py-2 rounded border inline-flex items-center gap-2 transition-all duration-300 dark:bg-gray-700"
              style={{
                borderColor: '#006AB9',
                color: '#006AB9',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!statsLoading) {
                  e.target.style.background = 'linear-gradient(135deg, #006AB9 0%, #006AB9 100%)';
                  e.target.style.color = '#F3F7FC';
                  e.target.style.borderColor = '#006AB9';
                }
              }}
              onMouseLeave={(e) => {
                if (!statsLoading) {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#006AB9';
                  e.target.style.borderColor = '#006AB9';
                }
              }}
            >
              {statsLoading ? (
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                'Atualizar agora'
              )}
            </button>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={enviar} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">Tipo</label>
            <select
              className="w-full px-3 py-2 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none transition-all duration-200 focus:ring-1 focus:ring-blue-500"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option>App</option>
              <option>Crédito Pessoal</option>
              <option>Crédito do Trabalhador</option>
              <option>Antecipação</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">CPF (opcional)</label>
            <input
              className="w-full px-3 py-2 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none transition-all duration-200 focus:ring-1 focus:ring-blue-500"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">Descrição</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 h-32 outline-none transition-all duration-200 focus:ring-1 focus:ring-blue-500"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Explique o problema, passos para reproduzir, telas envolvidas...&#10;(Dica: você pode colar imagens aqui)"
            onPaste={async (e) => {
              const items = Array.from(e.clipboardData?.items || []);
              const imgs = items.filter((it) => it.type && it.type.startsWith('image/'));
              if (!imgs.length) return;
              e.preventDefault();
              const arr = [...imagens];
              for (const it of imgs) {
                try {
                  const file = it.getAsFile();
                  if (!file) continue;
                  const dataUrl = await new Promise((ok, err) => {
                    const r = new FileReader();
                    r.onload = () => ok(String(r.result));
                    r.onerror = err;
                    r.readAsDataURL(file);
                  });
                  const base64 = String(dataUrl).split(',')[1];
                  const preview = await makeThumb(String(dataUrl));
                  arr.push({
                    name: file.name || 'clipboard.png',
                    type: file.type || 'image/png',
                    data: base64,
                    preview
                  });
                } catch (err) {
                  console.error('Erro ao processar imagem:', err);
                }
              }
              setImagens(arr);
            }}
          />
        </div>

        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">Anexos (imagens e vídeos)</label>
          <div
            className={`mt-1 p-6 border-2 border-dashed rounded-lg text-center transition-all duration-200 ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 border-solid'
                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
            style={{ minHeight: '180px' }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Só desativa se realmente saiu da área (não apenas de um filho)
              if (e.currentTarget === e.target) {
                setIsDragging(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
              
              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                processFiles(files);
              }
            }}
          >
            <div className={`mb-2 transition-colors ${
              isDragging
                ? 'text-blue-600 dark:text-blue-400 font-medium'
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {isDragging
                ? 'Solte os arquivos aqui'
                : 'Arraste e solte aqui, clique para selecionar ou cole imagens no campo de descrição'}
            </div>
            <div className="mb-2 text-xs text-gray-600 dark:text-gray-400">
              Aceitamos imagens (JPG, PNG, GIF) e vídeos (MP4, WebM, MOV) - Máx 50MB por arquivo
            </div>
            <div className="flex gap-2 justify-center">
              <label className="inline-block px-3 py-2 rounded bg-sky-600 text-white cursor-pointer hover:bg-sky-700 transition-colors">
                Selecionar imagens
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      await processFiles(files);
                    }
                    // Limpar o input para permitir selecionar o mesmo arquivo novamente
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
              <label className="inline-block px-3 py-2 rounded bg-purple-600 text-white cursor-pointer hover:bg-purple-700 transition-colors">
                Selecionar vídeos
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      await processFiles(files);
                    }
                    // Limpar o input para permitir selecionar o mesmo arquivo novamente
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          {(imagens?.length > 0 || videos?.length > 0) && (
            <>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                {imagens?.length || 0} imagem(ns) e {videos?.length || 0} vídeo(s) anexado(s)
              </div>
              {imagens?.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">Imagens:</div>
                  <div className="flex gap-2 flex-wrap">
                    {imagens.map((im, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={im.preview ? im.preview : im.data ? `data:${im.type || 'image/jpeg'};base64,${im.data}` : ''}
                          alt={`anexo-${idx}`}
                          className="h-16 w-auto rounded border border-gray-300 dark:border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => setImagens((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {videos?.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">Vídeos:</div>
                  <div className="flex gap-2 flex-wrap">
                    {videos.map((vid, idx) => (
                      <div key={idx} className="relative group">
                        <div className="relative">
                          <img
                            src={vid.thumbnail || ''}
                            alt={`video-thumb-${idx}`}
                            className="h-16 w-auto rounded border border-gray-300 dark:border-gray-600"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                            <span className="text-white text-xs">▶</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 max-w-32 truncate">{vid.name}</div>
                        <button
                          type="button"
                          onClick={() => setVideos((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-4">
          {msg && <span className="text-sm text-gray-700 dark:text-gray-300">{msg}</span>}
          <button
            type="submit"
            disabled={loading}
            className={`bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 ${
              loading ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Enviando...
              </>
            ) : (
              'Enviar'
            )}
          </button>
        </div>
      </form>
      </div>

      {/* Container de Sidebars */}
      <div className="flex flex-col gap-4 w-[400px] flex-shrink-0" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Sidebar Superior - Consulta de CPF */}
        <div className="w-[400px] h-[400px] flex-shrink-0 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-sky-500 to-emerald-500" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Consulta de CPF
            </h2>
          </div>
          <div
            className="flex flex-col gap-2"
            aria-busy={searchLoading}
            aria-live="polite"
          >
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">CPF</label>
                <input
                  className="w-full border border-gray-400 dark:border-gray-500 rounded-lg px-3 py-2 outline-none transition-all duration-200 focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  placeholder="Digite o CPF"
                  value={searchCpf}
                  onChange={(e) => setSearchCpf(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      buscarCpf();
                    }
                  }}
                />
              </div>
              <div className="flex flex-col">
                <div className="h-5"></div>
                <button
                  type="button"
                  onClick={buscarCpf}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg inline-flex items-center justify-center gap-2 transition-all duration-200 hover:bg-blue-700"
                  disabled={searchLoading}
                >
              {searchLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Buscando...
                </>
              ) : (
                'Buscar'
              )}
                </button>
              </div>
            </div>
          </div>
          {searchCpf && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {searchResults.length} registro(s) encontrado(s)
            </div>
          )}
          <div className="mt-3 flex-1 overflow-auto pr-1">
            {searchLoading && (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 flex items-center justify-between animate-pulse"
                  >
                    <div>
                      <div className="h-4 w-40 bg-gray-200 dark:bg-gray-600 rounded mb-1" />
                      <div className="h-3 w-32 bg-gray-200 dark:bg-gray-600 rounded" />
                    </div>
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-600 rounded" />
                  </div>
                ))}
              </div>
            )}
            {searchResults && searchResults.length > 0 && !searchLoading && (
              <div className="space-y-2">
                {searchResults.slice(0, 8).map((r) => {
                  const imgCount = Array.isArray(r?.payload?.previews)
                    ? r.payload.previews.length
                    : Array.isArray(r?.payload?.imagens)
                    ? r.payload.imagens.length
                    : 0;
                  const videoCount = Array.isArray(r?.payload?.videos)
                    ? r.payload.videos.length
                    : 0;
                  const total = imgCount + videoCount;
                  // Remover prefixo "Erro/Bug - " do tipo
                  const tipoLimpo = String(r.tipo || '').replace(/^Erro\/Bug\s*-\s*/i, '').trim() || r.tipo || '—';
                  // Formatar data e hora separadamente
                  const dataHora = r.createdAt ? new Date(r.createdAt) : null;
                  const dataFormatada = dataHora ? dataHora.toLocaleDateString('pt-BR') : '—';
                  const horaFormatada = dataHora ? dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
                  return (
                    <div
                      key={r._id || r.id}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                    >
                      {/* Primeira linha: [Tipo] [CPF] */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                          {tipoLimpo}
                        </span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                          {r.cpf || '—'}
                        </span>
                      </div>
                      {/* Segunda linha: [agente] [data] [hora] [Status] */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {r.colaboradorNome || r.agente || '—'}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {dataFormatada}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {horaFormatada}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {r.status || '—'}
                        </span>
                      </div>
                      {/* Terceira linha: [Anexos] [ver anexos] */}
                      {total > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Anexos: {imgCount > 0 ? `${imgCount} img` : ''}
                            {imgCount > 0 && videoCount > 0 ? ' + ' : ''}
                            {videoCount > 0 ? `${videoCount} vid` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => openAttachmentsModal(r)}
                            className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                          >
                            Ver anexos
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Inferior - Histórico do Agente */}
        <div className="w-[400px] bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 hover:-translate-y-0.5 transition-transform flex flex-col" style={{ height: '280px' }}>
          <div className="mb-4 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-sky-500 to-emerald-500" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Histórico do agente
              </h2>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedAgent || 'Selecione um agente'}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 min-h-0">
            {(!localLogs || localLogs.length === 0) && (
              <div className="text-sm opacity-70 text-gray-600 dark:text-gray-400 text-center py-8">
                Nenhum registro.
              </div>
            )}
            {localLogs && localLogs.length > 0 && (
              <div className="space-y-2">
                {localLogs.map((l, idx) => {
                  const s = String(l.status || '').toLowerCase();
                  const badge =
                    s === 'feito'
                      ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200'
                      : s === 'não feito' || s === 'nao feito'
                      ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'
                      : s === 'enviado'
                      ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200';
                  const created = l.createdAt
                    ? new Date(l.createdAt).toLocaleString()
                    : '—';
                  return (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                    >
                      <div className="font-medium text-sm text-gray-800 dark:text-gray-200 mb-1">
                        {l.tipo} — {l.cpf || '—'}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-1">
                        <span>Status:</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium ${badge}`}
                        >
                          {s || '—'}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-600 dark:text-gray-400">
                        <div>Aberto: {created}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Anexos */}
      {showAttachmentsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Anexos - {selectedRequest.tipo}
              </h3>
              <button
                type="button"
                onClick={closeAttachmentsModal}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              <div className="space-y-4">
                {/* Informações básicas */}
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <div className="text-sm space-y-1 text-gray-800 dark:text-gray-200">
                    <div>
                      <strong>CPF:</strong> {selectedRequest.cpf || '—'}
                    </div>
                    <div>
                      <strong>Agente:</strong> {selectedRequest.colaboradorNome || selectedRequest.agente || '—'}
                    </div>
                    <div>
                      <strong>Status:</strong> {selectedRequest.status || '—'}
                    </div>
                    <div>
                      <strong>Descrição:</strong> {selectedRequest.payload?.descricao || '—'}
                    </div>
                  </div>
                </div>

                {/* Imagens */}
                {(() => {
                  const previews = selectedRequest.payload?.previews || [];
                  if (previews.length === 0) return null;
                  return (
                    <div>
                      <h4 className="font-medium mb-2 text-gray-800 dark:text-gray-200">
                        Imagens ({previews.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {previews.map((preview, idx) => {
                          const imageName = selectedRequest.payload?.imagens?.[idx]?.name || `imagem-${idx + 1}.png`;
                          return (
                            <div key={idx} className="relative group">
                              <img
                                src={preview}
                                alt={`imagem-${idx}`}
                                className="w-full h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => openImage(preview)}
                              />
                              <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openImage(preview);
                                  }}
                                  className="bg-white text-gray-800 text-xs px-3 py-1.5 rounded hover:bg-gray-100 transition-colors"
                                >
                                  Ver
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadImage(preview, imageName);
                                  }}
                                  className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 transition-colors"
                                >
                                  Download
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Vídeos */}
                {(() => {
                  const videos = selectedRequest.payload?.videos || [];
                  const thumbnails = selectedRequest.payload?.videoThumbnails || [];
                  const videoData = selectedRequest.payload?.videoData || [];
                  if (videos.length === 0) return null;
                  return (
                    <div>
                      <h4 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Vídeos ({videos.length})</h4>
                      <div className="space-y-2">
                        {videos.map((video, idx) => {
                          const videoDataItem = videoData[idx];
                          const hasVideoData = videoDataItem && videoDataItem.data && videoDataItem.type;
                          const videoDataUrl = hasVideoData 
                            ? `data:${videoDataItem.type};base64,${videoDataItem.data}`
                            : null;
                          return (
                            <div
                              key={idx}
                              className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg ${
                                hasVideoData ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors' : ''
                              }`}
                              onClick={() => {
                                if (hasVideoData) {
                                  openVideo({
                                    data: videoDataItem.data,
                                    type: videoDataItem.type,
                                    name: video.name || `video-${idx + 1}.mp4`
                                  });
                                }
                              }}
                            >
                              <div className="relative">
                                {thumbnails[idx] && (
                                  <img
                                    src={thumbnails[idx]}
                                    alt={`video-thumb-${idx}`}
                                    className="w-20 h-14 object-cover rounded border border-gray-300 dark:border-gray-600"
                                  />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                                  <span className="text-white text-xs">▶</span>
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{video.name}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {video.type} • {Math.round(video.size / 1024 / 1024 * 100) / 100} MB
                                </div>
                              </div>
                              {hasVideoData ? (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openVideo({
                                        data: videoDataItem.data,
                                        type: videoDataItem.type,
                                        name: video.name || `video-${idx + 1}.mp4`
                                      });
                                    }}
                                    className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                  >
                                    Reproduzir
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (videoDataUrl) {
                                        downloadVideo(videoDataUrl, video.name || `video-${idx + 1}.mp4`);
                                      }
                                    }}
                                    className="text-xs px-3 py-1.5 rounded bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                                  >
                                    Download
                                  </button>
                                </div>
                              ) : (
                                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded">
                                  Vídeo não disponível
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Mensagem se não houver anexos */}
                {(!selectedRequest.payload?.previews?.length && !selectedRequest.payload?.videos?.length) && (
                  <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                    Nenhum anexo disponível para esta solicitação.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Imagem */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60]"
          onClick={closeImage}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              type="button"
              onClick={closeImage}
              className="absolute -top-10 right-0 text-white text-3xl hover:text-gray-300 transition-colors z-10"
              aria-label="Fechar"
            >
              ×
            </button>
            <img
              src={selectedImage}
              alt="Visualização ampliada"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(selectedImage, 'imagem.png');
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Download
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(selectedImage, '_blank');
                }}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Abrir em nova aba
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Vídeo */}
      {selectedVideo && selectedVideo.data && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60]"
          onClick={closeVideo}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              type="button"
              onClick={closeVideo}
              className="absolute -top-10 right-0 text-white text-3xl hover:text-gray-300 transition-colors z-10"
              aria-label="Fechar"
            >
              ×
            </button>
            <video
              src={`data:${selectedVideo.type};base64,${selectedVideo.data}`}
              controls
              autoPlay
              className="max-w-full max-h-[90vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              Seu navegador não suporta a reprodução de vídeo.
            </video>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const videoUrl = `data:${selectedVideo.type};base64,${selectedVideo.data}`;
                  downloadVideo(videoUrl, selectedVideo.name || 'video.mp4');
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrosBugsTab;

