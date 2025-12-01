/**
 * VeloHub V3 - FormSolicitacao Component (Escalações Module)
 * VERSION: v1.3.1 | DATE: 2025-01-31 | AUTHOR: VeloHub Development Team
 * Branch: escalacoes
 * 
 * Componente de formulário para criação de solicitações técnicas
 * 
 * Mudanças v1.3.1:
 * - Corrigido posicionamento dos toasts de top-4 para bottom-4 (canto inferior direito)
 * 
 * Mudanças v1.3.0:
 * - Adicionada formatação e máscara de email (email@dominio.com.br) nos campos dadoAntigo e dadoNovo
 * - Adicionada validação visual (borda verde) no campo "Dado novo" quando:
 *   - Tipo é "E-mail" e formato válido (parte@dominio.extensão)
 *   - Tipo é "Telefone" e telefone completo (10 dígitos)
 * - Telefone definido como valor padrão do campo "Tipo de informação"
 * 
 * Mudanças v1.2.0:
 * - Corrigida formatação de telefone para usar estado anterior (prev) ao invés de estado atual
 * - Melhorada lógica de atualização do select de tipo de informação
 * 
 * Mudanças v1.1.0:
 * - Adicionada formatação automática de telefone (XX) XXXX-XXXX nos campos dadoAntigo e dadoNovo
 */

import React, { useEffect, useState } from 'react';
import { solicitacoesAPI, logsAPI } from '../../services/escalacoesApi';

/**
 * Componente de formulário para solicitações técnicas
 * @param {Function} registrarLog - Função para registrar logs
 */
const FormSolicitacao = ({ registrarLog }) => {
  const [form, setForm] = useState({
    agente: '',
    cpf: '',
    tipo: 'Alteração de Dados Cadastrais',
    infoTipo: 'Telefone',
    dadoAntigo: '',
    dadoNovo: '',
    fotosVerificadas: false,
    excluirVelotax: false,
    excluirCelcoin: false,
    saldoZerado: false,
    portabilidadePendente: false,
    dividaIrpfQuitada: false,
    observacoes: '',
  });
  const [loading, setLoading] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const [localLogs, setLocalLogs] = useState([]); // {cpf, tipo, waMessageId, status, createdAt}
  const [buscaCpf, setBuscaCpf] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [buscaResultados, setBuscaResultados] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  /**
   * Exibir notificação simples
   * @param {string} message - Mensagem a exibir
   * @param {string} type - Tipo da notificação (success, error, info)
   */
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

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

  // Carregar cache inicial
  useEffect(() => {
    try {
      const cached = localStorage.getItem('velotax_local_logs');
      if (cached) setLocalLogs(JSON.parse(cached));
      const agent = localStorage.getItem('velotax_agent');
      if (agent) setForm((prev) => ({ ...prev, agente: toTitleCase(agent) }));
    } catch (err) {
      console.error('Erro ao carregar cache:', err);
    }
  }, []);

  // Garantir formatação quando componente monta com Telefone como padrão
  useEffect(() => {
    if (form.tipo === 'Alteração de Dados Cadastrais') {
      // Forçar atualização dos campos para aplicar formatação
      setForm(prev => {
        const novoForm = { ...prev };
        if (prev.infoTipo === 'Telefone') {
          if (prev.dadoAntigo) {
            novoForm.dadoAntigo = formatarTelefone(prev.dadoAntigo);
          }
          if (prev.dadoNovo) {
            novoForm.dadoNovo = formatarTelefone(prev.dadoNovo);
          }
        } else if (prev.infoTipo === 'E-mail') {
          if (prev.dadoAntigo) {
            novoForm.dadoAntigo = formatarEmail(prev.dadoAntigo);
          }
          if (prev.dadoNovo) {
            novoForm.dadoNovo = formatarEmail(prev.dadoNovo);
          }
        }
        return novoForm;
      });
    }
  }, []); // Executa apenas na montagem

  /**
   * Salvar cache no localStorage
   * @param {Array} items - Itens para salvar
   */
  const saveCache = (items) => {
    setLocalLogs(items);
    try {
      localStorage.setItem('velotax_local_logs', JSON.stringify(items));
    } catch (err) {
      console.error('Erro ao salvar cache:', err);
    }
  };

  /**
   * Buscar solicitações por CPF
   */
  const buscarCpf = async () => {
    const digits = String(buscaCpf || '').replace(/\D/g, '');
    if (!digits) {
      setBuscaResultados([]);
      return;
    }
    setBuscando(true);
    try {
      const results = await solicitacoesAPI.getByCpf(digits);
      setBuscaResultados(Array.isArray(results.data) ? results.data : []);
    } catch (err) {
      console.error('Erro ao buscar CPF:', err);
      setBuscaResultados([]);
    }
    setBuscando(false);
  };

  /**
   * Atualizar status dos logs localmente
   */
  const refreshNow = async () => {
    if (!localLogs.length) return;
    try {
      const all = await solicitacoesAPI.getAll();
      const requests = Array.isArray(all.data) ? all.data : [];
      const updated = localLogs.map(item => {
        const match = item.waMessageId
          ? requests.find(r => r.waMessageId === item.waMessageId)
          : requests.find(r => r.cpf === item.cpf && r.tipo === item.tipo);
        return match ? { ...item, status: match.status } : item;
      });
      saveCache(updated);
    } catch (err) {
      console.error('Erro ao atualizar logs:', err);
    }
  };

  /**
   * Formatar telefone no formato (XX) XXXX-XXXX
   * @param {string} valor - Valor a formatar
   * @returns {string} Telefone formatado
   */
  const formatarTelefone = (valor) => {
    // Remove tudo que não é dígito
    const digits = String(valor || '').replace(/\D/g, '');
    
    // Limita a 10 dígitos (XX) XXXX-XXXX
    const limited = digits.slice(0, 10);
    
    if (limited.length === 0) return '';
    if (limited.length <= 2) return `(${limited}`;
    if (limited.length <= 6) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  };

  /**
   * Validar telefone completo (10 dígitos)
   * @param {string} valor - Valor a validar
   * @returns {boolean} True se válido
   */
  const validarTelefone = (valor) => {
    const digits = String(valor || '').replace(/\D/g, '');
    return digits.length === 10;
  };

  /**
   * Formatar email (mantém formato básico, não força máscara rígida)
   * @param {string} valor - Valor a formatar
   * @returns {string} Email formatado (em lowercase, sem espaços)
   */
  const formatarEmail = (valor) => {
    return String(valor || '').toLowerCase().trim().replace(/\s+/g, '');
  };

  /**
   * Validar formato de email (deve ter pelo menos: parte@dominio.extensão)
   * Aceita extensões: .com, .com.br, .gov, .net, .org, .co, etc.
   * @param {string} valor - Email a validar
   * @returns {boolean} True se formato válido
   */
  const validarEmail = (valor) => {
    const email = String(valor || '').trim();
    if (!email) return false;
    
    // Regex para validar formato básico: parte@dominio.extensão
    // Aceita extensões comuns: .com, .com.br, .gov, .net, .org, .co, etc.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?$/;
    
    // Verifica se tem pelo menos: parte@dominio.com (ou similar)
    return emailRegex.test(email);
  };

  // Refresh de status a cada 20s
  useEffect(() => {
    const refresh = async () => {
      if (!localLogs.length) return;
      try {
        const all = await solicitacoesAPI.getAll();
        const requests = Array.isArray(all.data) ? all.data : [];
        const updated = localLogs.map(item => {
          const match = item.waMessageId
            ? requests.find(r => r.waMessageId === item.waMessageId)
            : requests.find(r => r.cpf === item.cpf && r.tipo === item.tipo);
          return match ? { ...item, status: match.status } : item;
        });
        saveCache(updated);
      } catch (err) {
        console.error('Erro ao atualizar logs:', err);
      }
    };
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [localLogs.length]);

  // Reformatar campos quando tipo de informação mudar para Telefone ou E-mail
  useEffect(() => {
    if (form.tipo === 'Alteração de Dados Cadastrais') {
      setForm(prev => {
        let atualizado = false;
        const novoForm = { ...prev };
        
        if (prev.infoTipo === 'Telefone') {
          // Reformatar dadoAntigo se tiver valor (mesmo que parcial)
          if (prev.dadoAntigo && prev.dadoAntigo.trim() !== '') {
            const formatted = formatarTelefone(prev.dadoAntigo);
            if (formatted !== prev.dadoAntigo) {
              novoForm.dadoAntigo = formatted;
              atualizado = true;
            }
          }
          
          // Reformatar dadoNovo se tiver valor (mesmo que parcial)
          if (prev.dadoNovo && prev.dadoNovo.trim() !== '') {
            const formatted = formatarTelefone(prev.dadoNovo);
            if (formatted !== prev.dadoNovo) {
              novoForm.dadoNovo = formatted;
              atualizado = true;
            }
          }
        } else if (prev.infoTipo === 'E-mail') {
          // Reformatar dadoAntigo se tiver valor
          if (prev.dadoAntigo && prev.dadoAntigo.trim() !== '') {
            const formatted = formatarEmail(prev.dadoAntigo);
            if (formatted !== prev.dadoAntigo) {
              novoForm.dadoAntigo = formatted;
              atualizado = true;
            }
          }
          
          // Reformatar dadoNovo se tiver valor
          if (prev.dadoNovo && prev.dadoNovo.trim() !== '') {
            const formatted = formatarEmail(prev.dadoNovo);
            if (formatted !== prev.dadoNovo) {
              novoForm.dadoNovo = formatted;
              atualizado = true;
            }
          }
        }
        
        return atualizado ? novoForm : prev;
      });
    }
  }, [form.infoTipo, form.tipo]);

  /**
   * Atualizar campo do formulário
   * @param {string} campo - Nome do campo
   * @param {any} valor - Valor do campo
   */
  const atualizar = (campo, valor) => {
    setForm(prev => {
      let valorFinal = valor;
      
      // Aplicar formatação de telefone se necessário - SEMPRE quando tipo é Telefone
      if (prev.tipo === 'Alteração de Dados Cadastrais' && prev.infoTipo === 'Telefone') {
        if (campo === 'dadoAntigo' || campo === 'dadoNovo') {
          // Aplicar formatação mesmo se o valor estiver vazio ou parcial
          valorFinal = formatarTelefone(valor);
        }
      }
      
      // Aplicar formatação de email se necessário - SEMPRE quando tipo é E-mail
      if (prev.tipo === 'Alteração de Dados Cadastrais' && prev.infoTipo === 'E-mail') {
        if (campo === 'dadoAntigo' || campo === 'dadoNovo') {
          // Formatar email (lowercase, sem espaços)
          valorFinal = formatarEmail(valor);
        }
      }
      
      const novoForm = { ...prev, [campo]: valorFinal };
      
      // Processar campos específicos
      if (campo === 'cpf') {
        setCpfError('');
      }
      if (campo === 'agente') {
        const norm = toTitleCase(valor);
        try {
          localStorage.setItem('velotax_agent', norm);
        } catch (err) {
          console.error('Erro ao salvar agente:', err);
        }
      }
      
      return novoForm;
    });
  };

  /**
   * Montar mensagem para WhatsApp
   * @returns {string} Mensagem formatada
   */
  const montarMensagem = () => {
    const simNao = v => (v ? '✅ Sim' : '❌ Não');
    const typeMap = {
      'Exclusão de Conta': 'Exclusão de Conta',
      'Exclusão de Chave PIX': 'Exclusão de Chave PIX',
      'Alteração de Dados Cadastrais': 'Alteração de Dados Cadastrais',
      'Reativação de Conta': 'Reativação de Conta',
    };
    const tipoCanon = typeMap[form.tipo] || toTitleCase(String(form.tipo || ''));
    const cpfNorm = String(form.cpf || '').replace(/\s+/g, ' ').trim();
    let msg = `*Nova Solicitação Técnica - ${tipoCanon}*\n\n`;
    msg += `Agente: ${form.agente}\nCPF: ${cpfNorm}\n\n`;

    if (form.tipo === 'Exclusão de Conta') {
      msg += `Excluir conta Velotax: ${simNao(form.excluirVelotax)}\n`;
      msg += `Excluir conta Celcoin: ${simNao(form.excluirCelcoin)}\n`;
      msg += `Conta zerada: ${simNao(form.saldoZerado)}\n`;
      msg += `Portabilidade pendente: ${simNao(form.portabilidadePendente)}\n`;
      msg += `Dívida IRPF quitada: ${simNao(form.dividaIrpfQuitada)}\n`;
      msg += `Observações: ${form.observacoes || '—'}\n`;
    } else if (form.tipo === 'Alteração de Dados Cadastrais') {
      msg += `Tipo de informação: ${form.infoTipo}\n`;
      msg += `Dado antigo: ${form.dadoAntigo}\n`;
      msg += `Dado novo: ${form.dadoNovo}\n`;
      msg += `Fotos verificadas: ${simNao(form.fotosVerificadas)}\n`;
      msg += `Observações: ${form.observacoes || '—'}\n`;
    } else {
      msg += `Observações: ${form.observacoes || '—'}\n`;
    }
    return msg;
  };

  /**
   * Enviar solicitação
   * @param {Event} e - Evento do formulário
   */
  const enviar = async (e) => {
    e.preventDefault();
    const digits = String(form.cpf || '').replace(/\D/g, '');
    if (digits.length !== 11) {
      setCpfError('CPF inválido. Digite os 11 dígitos.');
      showNotification('CPF inválido. Digite os 11 dígitos.', 'error');
      return;
    }
    setLoading(true);
    if (registrarLog) registrarLog('Iniciando envio...');

    /**
     * Notificar erro via Notification API
     * @param {string} title - Título da notificação
     * @param {string} body - Corpo da notificação
     */
    const notifyError = (title, body) => {
      try {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification(title, { body });
          } else {
            Notification.requestPermission().then((p) => {
              if (p === 'granted') new Notification(title, { body });
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Erro ao exibir notificação:', err);
      }
    };

    // Garantir nome do agente normalizado
    let agenteNorm = form.agente && form.agente.trim() ? toTitleCase(form.agente) : '';
    if (!agenteNorm) {
      try {
        agenteNorm = toTitleCase(localStorage.getItem('velotax_agent') || '');
      } catch (err) {
        console.error('Erro ao obter agente:', err);
      }
      if (agenteNorm) setForm((prev) => ({ ...prev, agente: agenteNorm }));
    }
    if (agenteNorm) {
      try {
        localStorage.setItem('velotax_agent', agenteNorm);
      } catch (err) {
        console.error('Erro ao salvar agente:', err);
      }
    }

    const mensagemTexto = montarMensagem();

    try {
      // Criar solicitação via API
      const solicitacaoData = {
        agente: agenteNorm || form.agente,
        cpf: form.cpf,
        tipo: form.tipo,
        payload: { ...form },
        mensagemTexto,
      };

      const result = await solicitacoesAPI.create(solicitacaoData);
      const waMessageId = result.data?.waMessageId || null;

      // Criar log
      try {
        await logsAPI.create({
          action: 'send_request',
          detail: {
            tipo: form.tipo,
            cpf: form.cpf,
            waMessageId,
            whatsappSent: !!waMessageId,
            exclusao: form.tipo === 'Exclusão de Conta' ? {
              excluirVelotax: !!form.excluirVelotax,
              excluirCelcoin: !!form.excluirCelcoin,
              saldoZerado: !!form.saldoZerado,
              portabilidadePendente: !!form.portabilidadePendente,
              dividaIrpfQuitada: !!form.dividaIrpfQuitada,
            } : undefined,
            alteracao: form.tipo === 'Alteração de Dados Cadastrais' ? {
              infoTipo: form.infoTipo || '',
              dadoAntigo: form.dadoAntigo || '',
              dadoNovo: form.dadoNovo || '',
              fotosVerificadas: !!form.fotosVerificadas,
            } : undefined,
            observacoes: form.observacoes || '',
          },
        });
      } catch (logErr) {
        console.error('Erro ao criar log:', logErr);
      }

      // Atualizar UI/Cache
      if (!waMessageId) {
        if (registrarLog) registrarLog('ℹ️ WhatsApp não configurado: apenas registrado no painel');
        showNotification('Solicitação registrada', 'info');
      } else {
        if (registrarLog) registrarLog('✅ Enviado com sucesso');
        showNotification('Solicitação enviada', 'success');
      }

      const newItem = {
        cpf: form.cpf,
        tipo: form.tipo,
        waMessageId,
        status: waMessageId ? 'enviado' : 'em aberto',
        enviado: !!waMessageId,
        createdAt: new Date().toISOString(),
      };
      saveCache([newItem, ...localLogs].slice(0, 50));

      // Limpar formulário
      setForm({
        agente: agenteNorm || '',
        cpf: '',
        tipo: 'Alteração de Dados Cadastrais',
        infoTipo: 'Telefone',
        dadoAntigo: '',
        dadoNovo: '',
        fotosVerificadas: false,
        excluirVelotax: false,
        excluirCelcoin: false,
        saldoZerado: false,
        portabilidadePendente: false,
        dividaIrpfQuitada: false,
        observacoes: '',
      });
    } catch (err) {
      console.error('Erro ao enviar solicitação:', err);
      if (registrarLog) registrarLog('❌ Falha de conexão com a API.');
      showNotification('Falha de conexão. A API está no ar?', 'error');
      notifyError('Falha de conexão', 'Não foi possível contactar a API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Notificação simples */}
      {notification.show && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      <form
        onSubmit={enviar}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            enviar(e);
          }
        }}
        className="space-y-5 relative"
        aria-busy={loading}
        aria-live="polite"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-300">CPF</label>
            <div className="relative">
              <input
                className="w-full border border-gray-400 dark:border-gray-500 rounded-lg px-3 py-2 outline-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => atualizar('cpf', e.target.value)}
                required
              />
            </div>
            {cpfError && (
              <div className="mt-1 text-xs text-red-600">{cpfError}</div>
            )}
          </div>
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-300">Tipo de Solicitação</label>
            <select
              className="w-full border border-gray-400 dark:border-gray-500 rounded-lg px-3 py-2 outline-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              value={form.tipo}
              onChange={(e) => atualizar('tipo', e.target.value)}
            >
              <option>Alteração de Dados Cadastrais</option>
              <option>Exclusão de Chave PIX</option>
              <option>Exclusão de Conta</option>
              <option>Reativação de Conta</option>
            </select>
          </div>
        </div>

        {form.tipo === 'Exclusão de Conta' && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mt-2 border border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.excluirVelotax}
                onChange={(e) => atualizar('excluirVelotax', e.target.checked)}
                className="w-4 h-4"
              />
              Excluir conta Velotax
            </label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={form.excluirCelcoin}
                onChange={(e) => atualizar('excluirCelcoin', e.target.checked)}
                className="w-4 h-4"
              />
              Excluir conta Celcoin
            </label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={form.saldoZerado}
                onChange={(e) => atualizar('saldoZerado', e.target.checked)}
                className="w-4 h-4"
              />
              Conta zerada
            </label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={form.portabilidadePendente}
                onChange={(e) => atualizar('portabilidadePendente', e.target.checked)}
                className="w-4 h-4"
              />
              Portabilidade pendente
            </label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={form.dividaIrpfQuitada}
                onChange={(e) => atualizar('dividaIrpfQuitada', e.target.checked)}
                className="w-4 h-4"
              />
              Dívida IRPF quitada
            </label>
          </div>
        )}

        {form.tipo === 'Alteração de Dados Cadastrais' && (
          <div className="p-4 rounded-lg mt-2" style={{ background: 'transparent', border: '1.5px solid #000058', borderRadius: '8px' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300">Tipo de informação</label>
                <select
                  className="w-full border border-gray-400 dark:border-gray-500 rounded-lg px-3 py-2 outline-none transition-all duration-200 focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  value={form.infoTipo}
                  onChange={(e) => {
                    const novoTipo = e.target.value;
                    // Limpar campos quando mudar o tipo de informação
                    if (novoTipo !== form.infoTipo) {
                      setForm(prev => {
                        const novoForm = { ...prev, infoTipo: novoTipo, dadoAntigo: '', dadoNovo: '' };
                        // Se mudou para Telefone, garantir que os campos vazios estejam prontos para formatação
                        return novoForm;
                      });
                    } else {
                      atualizar('infoTipo', novoTipo);
                    }
                  }}
                >
                  <option value="Telefone">Telefone</option>
                  <option value="E-mail">E-mail</option>
                  <option value="Nome">Nome</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="flex items-center pt-7 gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={form.fotosVerificadas}
                  onChange={(e) => atualizar('fotosVerificadas', e.target.checked)}
                />
                <label className="text-gray-700 dark:text-gray-300">Fotos verificadas</label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300">Dado antigo</label>
                <input
                  className="w-full border border-gray-400 dark:border-gray-500 rounded-lg px-3 py-2 outline-none transition-all duration-200 focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  type={form.infoTipo === 'Telefone' ? 'tel' : form.infoTipo === 'E-mail' ? 'email' : 'text'}
                  placeholder={
                    form.infoTipo === 'Telefone' ? '(XX) XXXX-XXXX' :
                    form.infoTipo === 'E-mail' ? 'email@dominio.com.br' :
                    ''
                  }
                  value={
                    form.infoTipo === 'Telefone' ? formatarTelefone(form.dadoAntigo) :
                    form.infoTipo === 'E-mail' ? formatarEmail(form.dadoAntigo) :
                    form.dadoAntigo
                  }
                  onChange={(e) => atualizar('dadoAntigo', e.target.value)}
                  maxLength={form.infoTipo === 'Telefone' ? 15 : undefined}
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300">Dado novo</label>
                <input
                  className={`w-full border rounded-lg px-3 py-2 outline-none transition-all duration-200 dark:bg-gray-800 dark:text-white ${
                    form.infoTipo === 'Telefone' && validarTelefone(form.dadoNovo)
                      ? 'border-green-500 focus:ring-1 focus:ring-green-500'
                      : form.infoTipo === 'E-mail' && validarEmail(form.dadoNovo)
                      ? 'border-green-500 focus:ring-1 focus:ring-green-500'
                      : 'border-gray-400 dark:border-gray-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                  type={form.infoTipo === 'Telefone' ? 'tel' : form.infoTipo === 'E-mail' ? 'email' : 'text'}
                  placeholder={
                    form.infoTipo === 'Telefone' ? '(XX) XXXX-XXXX' :
                    form.infoTipo === 'E-mail' ? 'email@dominio.com.br' :
                    ''
                  }
                  value={
                    form.infoTipo === 'Telefone' ? formatarTelefone(form.dadoNovo) :
                    form.infoTipo === 'E-mail' ? formatarEmail(form.dadoNovo) :
                    form.dadoNovo
                  }
                  onChange={(e) => atualizar('dadoNovo', e.target.value)}
                  maxLength={form.infoTipo === 'Telefone' ? 15 : undefined}
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Observações</label>
          <textarea
            className="w-full border border-gray-400 dark:border-gray-500 rounded-lg px-3 py-2 h-28 outline-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            placeholder="Adicione observações adicionais..."
            value={form.observacoes}
            onChange={(e) => atualizar('observacoes', e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-4">
          <button
            disabled={loading}
            className={`bg-blue-600 text-white font-medium px-5 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 inline-flex items-center gap-2 ${
              loading ? 'opacity-60 cursor-not-allowed' : ''
            }`}
            type="submit"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando...
              </>
            ) : (
              'Enviar Solicitação'
            )}
          </button>
        </div>

        {buscaResultados && buscaResultados.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 backdrop-blur p-4 rounded-xl border border-gray-200 dark:border-gray-700 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-sky-500 to-emerald-500" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Histórico recente para {String(buscaCpf || form.cpf)}
              </h2>
            </div>
            <div className="space-y-2">
              {buscaResultados.slice(0, 5).map((r) => (
                <div
                  key={r._id || r.id}
                  className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {r.tipo} — {r.cpf}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Agente: {r.colaboradorNome || r.agente || '—'} • Status: {r.status || '—'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(r.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs de Envio */}
        <div className="bg-gray-50 dark:bg-gray-800 backdrop-blur p-4 rounded-xl border border-gray-200 dark:border-gray-700 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-sky-500 to-emerald-500" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Logs de Envio</h2>
          </div>
          {(!localLogs || localLogs.length === 0) && (
            <div className="text-gray-600 dark:text-gray-400">Nenhum log ainda.</div>
          )}
          <div className="space-y-2 max-h-56 overflow-auto pr-1">
            {localLogs.map((l, idx) => {
              const s = String(l.status || '').toLowerCase();
              const isDoneFail = s === 'não feito' || s === 'nao feito';
              const isDoneOk = s === 'feito';
              const sentOnly = !isDoneOk && !isDoneFail && (s === 'enviado' || l.enviado === true);
              const colorDone1 = isDoneFail ? 'bg-red-500' : 'bg-emerald-500';
              const colorDone2 = isDoneFail ? 'bg-red-500' : 'bg-emerald-500';
              const colorDone3 = isDoneFail ? 'bg-red-500' : 'bg-emerald-500';
              const bar1 = (isDoneOk || isDoneFail) ? colorDone1 : (sentOnly ? 'bg-amber-400' : 'bg-gray-300 dark:bg-gray-600');
              const bar2 = (isDoneOk || isDoneFail) ? colorDone2 : (sentOnly ? 'bg-amber-400' : 'bg-gray-300 dark:bg-gray-600');
              const bar3 = (isDoneOk || isDoneFail) ? colorDone3 : 'bg-gray-300 dark:bg-gray-600';
              const icon = isDoneOk ? '✅' : (isDoneFail ? '❌' : (sentOnly ? '📨' : '⏳'));
              return (
                <div
                  key={idx}
                  className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{icon}</span>
                      <span className="text-sm text-gray-800 dark:text-gray-200">
                        {l.cpf} — {l.tipo}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(l.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5" aria-label={`progresso: ${s || 'em aberto'}`}>
                    <span className={`h-1.5 w-8 rounded-full ${bar1}`}></span>
                    <span className={`h-1.5 w-8 rounded-full ${bar2}`}></span>
                    <span className={`h-1.5 w-8 rounded-full ${bar3}`}></span>
                    <span className="text-[11px] opacity-60 ml-2 text-gray-600 dark:text-gray-400">
                      {s || 'em aberto'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {loading && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            style={{ background: 'linear-gradient(180deg, rgba(2,6,23,0.20), rgba(2,6,23,0.35))' }}
          >
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg">
              <div className="flex flex-col items-center gap-4">
                <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-800 dark:text-gray-200">Enviando solicitação...</p>
              </div>
            </div>
          </div>
        )}
      </form>
    </>
  );
};

export default FormSolicitacao;

