/**
 * VeloHub V3 - Escalações API Service
 * VERSION: v1.1.1 | DATE: 2025-01-30 | AUTHOR: VeloHub Development Team
 * Branch: main (recuperado de escalacoes)
 * 
 * Serviço de API para o módulo de Escalações (Painel de Serviços)
 * 
 * Mudanças v1.1.0:
 * - Adicionado método getByColaborador para usar colaboradorNome
 * - Método getByAgente mantido para compatibilidade (usa colaboradorNome internamente)
 */

import { API_BASE_URL } from '../config/api-config';

/**
 * Função genérica para fazer requisições
 * @param {string} endpoint - Endpoint da API
 * @param {object} options - Opções da requisição
 * @returns {Promise<any>} Resposta da API
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`🔍 [escalacoesApi] Fazendo requisição para: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // Verificar se a resposta é JSON antes de tentar parsear
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`❌ [escalacoesApi] Resposta não é JSON. Status: ${response.status}, Content-Type: ${contentType}`);
      console.error(`❌ [escalacoesApi] Conteúdo recebido:`, text.substring(0, 200));
      throw new Error(`Resposta não é JSON. Status: ${response.status}. A rota pode não estar registrada no servidor.`);
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Erro na requisição');
    }
    
    return data;
  } catch (error) {
    console.error(`❌ [escalacoesApi] Erro na API ${endpoint}:`, error);
    console.error(`❌ [escalacoesApi] URL completa: ${url}`);
    throw error;
  }
}

/**
 * API para Solicitações Técnicas
 */
export const solicitacoesAPI = {
  /**
   * Buscar todas as solicitações
   * @returns {Promise<Array>} Lista de solicitações
   */
  getAll: () => apiRequest('/escalacoes/solicitacoes'),

  /**
   * Buscar solicitação por ID
   * @param {string} id - ID da solicitação
   * @returns {Promise<Object>} Solicitação
   */
  getById: (id) => apiRequest(`/escalacoes/solicitacoes/${id}`),

  /**
   * Criar nova solicitação
   * @param {Object} data - Dados da solicitação
   * @returns {Promise<Object>} Solicitação criada
   */
  create: (data) => apiRequest('/escalacoes/solicitacoes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  /**
   * Atualizar solicitação
   * @param {string} id - ID da solicitação
   * @param {Object} data - Dados atualizados
   * @returns {Promise<Object>} Solicitação atualizada
   */
  update: (id, data) => apiRequest(`/escalacoes/solicitacoes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  /**
   * Buscar solicitações por CPF
   * @param {string} cpf - CPF para buscar
   * @returns {Promise<Array>} Lista de solicitações
   */
  getByCpf: (cpf) => apiRequest(`/escalacoes/solicitacoes?cpf=${cpf}`),

  /**
   * Buscar solicitações por colaborador
   * @param {string} colaboradorNome - Nome do colaborador
   * @returns {Promise<Array>} Lista de solicitações
   */
  getByColaborador: (colaboradorNome) => apiRequest(`/escalacoes/solicitacoes?colaboradorNome=${encodeURIComponent(colaboradorNome)}`),
  
  /**
   * Buscar solicitações por agente (compatibilidade - usa colaboradorNome internamente)
   * @param {string} agente - Nome do agente
   * @returns {Promise<Array>} Lista de solicitações
   * @deprecated Use getByColaborador ao invés disso
   */
  getByAgente: (agente) => apiRequest(`/escalacoes/solicitacoes?colaboradorNome=${encodeURIComponent(agente)}`),
};

/**
 * API para Erros/Bugs
 */
export const errosBugsAPI = {
  /**
   * Buscar todos os erros/bugs
   * @returns {Promise<Array>} Lista de erros/bugs
   */
  getAll: () => apiRequest('/escalacoes/erros-bugs'),

  /**
   * Criar novo erro/bug
   * @param {Object} data - Dados do erro/bug
   * @returns {Promise<Object>} Erro/bug criado
   */
  create: (data) => apiRequest('/escalacoes/erros-bugs', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  /**
   * Buscar erros/bugs por CPF
   * @param {string} cpf - CPF para buscar
   * @returns {Promise<Array>} Lista de erros/bugs
   */
  getByCpf: (cpf) => apiRequest(`/escalacoes/erros-bugs?cpf=${cpf}`),
};

/**
 * API para Logs
 */
export const logsAPI = {
  /**
   * Buscar logs de uso
   * @param {Object} params - Parâmetros de busca (limit, etc)
   * @returns {Promise<Array>} Lista de logs
   */
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/escalacoes/logs${query ? `?${query}` : ''}`);
  },

  /**
   * Criar novo log
   * @param {Object} data - Dados do log
   * @returns {Promise<Object>} Log criado
   */
  create: (data) => apiRequest('/escalacoes/logs', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

/**
 * API para Atendimento (Otimizador)
 */
export const atendimentoAPI = {
  /**
   * Processar pergunta e retornar resposta otimizada
   * @param {string} pergunta - Pergunta do cliente
   * @returns {Promise<Object>} Resposta otimizada
   */
  processar: (pergunta) => apiRequest('/escalacoes/atendimento', {
    method: 'POST',
    body: JSON.stringify({ pergunta }),
  }),
};

/**
 * API para Feedback
 */
export const feedbackAPI = {
  /**
   * Enviar feedback sobre resposta
   * @param {Object} data - Dados do feedback
   * @returns {Promise<Object>} Feedback criado
   */
  create: (data) => apiRequest('/escalacoes/feedback', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

export default {
  solicitacoes: solicitacoesAPI,
  errosBugs: errosBugsAPI,
  logs: logsAPI,
  atendimento: atendimentoAPI,
  feedback: feedbackAPI,
};

