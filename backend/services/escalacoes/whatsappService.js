/**
 * VeloHub V3 - WhatsApp Service para Módulo Escalações
 * VERSION: v1.1.1 | DATE: 2025-01-31 | AUTHOR: VeloHub Development Team
 * Branch: escalacoes
 * 
 * Mudanças v1.1.2:
 * - Normalização da URL da API WhatsApp (remove barra final)
 * - Logs melhorados para diagnóstico
 * 
 * Mudanças v1.1.1:
 * - Adicionados logs detalhados para diagnóstico de envio de mensagens
 * 
 * Serviço para integração com API WhatsApp externa (Baileys)
 * Referência: painel de serviços/api wpp/index.js
 * 
 * Este serviço faz chamadas HTTP para a API WhatsApp externa,
 * não implementa Baileys diretamente.
 */

const config = require('../../config');

/**
 * Formatar número para JID WhatsApp
 * @param {string} numero - Número no formato numérico
 * @returns {string} JID formatado
 */
function formatJid(numero) {
  if (!numero || typeof numero !== 'string') {
    return null;
  }
  
  // Se já contém @, retornar como está
  if (numero.includes('@')) {
    return numero;
  }
  
  // Se contém -, é grupo
  if (numero.includes('-')) {
    return `${numero}@g.us`;
  }
  
  // Caso contrário, é individual
  return `${numero}@s.whatsapp.net`;
}

/**
 * Extrair CPF e tipo de solicitação do texto
 * Mesma lógica da API externa
 * @param {string} texto - Texto da mensagem
 * @returns {Object} { cpf, solicitacao }
 */
function parseMetaFromText(texto) {
  try {
    const s = String(texto || '');
    let cpfTxt = null;
    
    // Procurar linha que começa com CPF:
    const mCpf = s.match(/^\s*CPF\s*:\s*(.+)$/im);
    if (mCpf && mCpf[1]) {
      const dig = String(mCpf[1]).replace(/\D/g, '');
      if (dig) cpfTxt = dig;
    }
    
    let sol = null;
    // Tentar padrão do título: *Nova Solicitação Técnica - X*
    const mSol1 = s.match(/\*Nova\s+Solicitação\s+Técnica\s*-\s*([^*]+)\*/i);
    if (mSol1 && mSol1[1]) {
      sol = mSol1[1].trim();
    }
    
    // Fallback: procurar linha que começa com Tipo de Solicitação:
    if (!sol) {
      const mSol2 = s.match(/^\s*Tipo\s+de\s+Solicitação\s*:\s*(.+)$/im);
      if (mSol2 && mSol2[1]) {
        sol = mSol2[1].trim();
      }
    }
    
    return { cpf: cpfTxt, solicitacao: sol };
  } catch (error) {
    console.error('[WHATSAPP] Erro ao parsear meta do texto:', error);
    return { cpf: null, solicitacao: null };
  }
}

/**
 * Enviar mensagem via WhatsApp
 * @param {string} jid - JID WhatsApp ou número
 * @param {string} mensagem - Texto da mensagem
 * @param {Array} imagens - Array de imagens [{ data: base64, type: mimeType }]
 * @param {Array} videos - Array de vídeos (opcional, não suportado pela API atual)
 * @param {Object} options - Opções adicionais { cpf, solicitacao, agente }
 * @returns {Promise<Object>} { ok: boolean, messageId?: string, messageIds?: Array, error?: string }
 */
async function sendMessage(jid, mensagem, imagens = [], videos = [], options = {}) {
  // Normalizar URL removendo barra final se existir
  const apiUrlRaw = config.WHATSAPP_API_URL;
  const apiUrl = apiUrlRaw ? String(apiUrlRaw).replace(/\/+$/, '') : null;
  
  console.log(`[WHATSAPP SERVICE] Iniciando envio de mensagem...`);
  console.log(`[WHATSAPP SERVICE] JID recebido: ${jid}`);
  console.log(`[WHATSAPP SERVICE] Mensagem length: ${mensagem ? mensagem.length : 0}`);
  console.log(`[WHATSAPP SERVICE] Imagens: ${Array.isArray(imagens) ? imagens.length : 0}`);
  console.log(`[WHATSAPP SERVICE] Vídeos: ${Array.isArray(videos) ? videos.length : 0}`);
  
  if (!apiUrl) {
    console.log('[WHATSAPP SERVICE] ❌ API URL não configurada - pulando envio');
    console.log(`[WHATSAPP SERVICE] Valor bruto: ${apiUrlRaw}`);
    return { ok: false, error: 'WhatsApp API não configurada' };
  }
  
  console.log(`[WHATSAPP SERVICE] API URL (normalizada): ${apiUrl}`);
  
  try {
    // Formatar JID se necessário
    let destinatario = formatJid(jid);
    console.log(`[WHATSAPP SERVICE] Destinatário formatado: ${destinatario}`);
    if (!destinatario) {
      console.log('[WHATSAPP SERVICE] ❌ Destino inválido após formatação');
      return { ok: false, error: 'Destino inválido' };
    }
    
    // Extrair CPF e solicitação de options ou mensagem
    const { cpf: cpfOption, solicitacao: solOption, agente } = options;
    const parsed = parseMetaFromText(mensagem);
    const cpf = cpfOption || parsed.cpf || null;
    const solicitacao = solOption || parsed.solicitacao || null;
    
    // Preparar payload conforme API externa
    const payload = {
      jid: destinatario,
      mensagem: mensagem || '',
      imagens: Array.isArray(imagens) ? imagens : [],
      videos: Array.isArray(videos) ? videos : [],
      cpf: cpf,
      solicitacao: solicitacao,
      agente: agente || null
    };
    
    console.log(`[WHATSAPP SERVICE] Enviando mensagem para ${destinatario}...`);
    console.log(`[WHATSAPP SERVICE] Payload:`, JSON.stringify({
      ...payload,
      mensagem: payload.mensagem ? `${payload.mensagem.substring(0, 100)}...` : '',
      imagens: payload.imagens ? `${payload.imagens.length} imagens` : [],
      videos: payload.videos ? `${payload.videos.length} vídeos` : []
    }));
    
    // Fazer requisição com timeout de 30 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const url = `${apiUrl}/send`;
      console.log(`[WHATSAPP SERVICE] Fazendo requisição POST para: ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      console.log(`[WHATSAPP SERVICE] Resposta recebida: Status ${response.status} ${response.statusText}`);
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erro desconhecido');
        
        if (response.status === 503) {
          console.error('[WHATSAPP] WhatsApp desconectado (503)');
          return { ok: false, error: 'WhatsApp desconectado' };
        }
        
        if (response.status === 400) {
          console.error('[WHATSAPP] Destino inválido (400)');
          return { ok: false, error: 'Destino inválido' };
        }
        
        console.error(`[WHATSAPP] Erro HTTP ${response.status}:`, errorText);
        return { ok: false, error: `Erro HTTP ${response.status}: ${errorText}` };
      }
      
      const data = await response.json();
      
      if (data.ok) {
        console.log(`[WHATSAPP] Mensagem enviada com sucesso! messageId: ${data.messageId}`);
        return {
          ok: true,
          messageId: data.messageId || null,
          messageIds: Array.isArray(data.messageIds) ? data.messageIds : (data.messageId ? [data.messageId] : [])
        };
      } else {
        console.error('[WHATSAPP] Erro na resposta:', data.error);
        return { ok: false, error: data.error || 'Erro desconhecido' };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('[WHATSAPP] Timeout ao enviar mensagem');
        return { ok: false, error: 'Timeout ao enviar mensagem' };
      }
      
      console.error('[WHATSAPP] Erro ao fazer requisição:', fetchError.message);
      return { ok: false, error: fetchError.message };
    }
  } catch (error) {
    console.error('[WHATSAPP] Erro geral:', error);
    return { ok: false, error: error.message || 'Erro desconhecido' };
  }
}

/**
 * Enviar imagem única via WhatsApp
 * @param {string} jid - JID WhatsApp ou número
 * @param {string} imageBase64 - Imagem em base64 (sem prefixo data:image)
 * @param {string} caption - Legenda da imagem
 * @param {string} mimeType - Tipo MIME (ex: 'image/jpeg')
 * @returns {Promise<Object>} { ok: boolean, messageId?: string, messageIds?: Array, error?: string }
 */
async function sendImage(jid, imageBase64, caption = '', mimeType = 'image/jpeg') {
  const imagens = [{
    data: imageBase64,
    type: mimeType
  }];
  
  return sendMessage(jid, caption, imagens, [], {});
}

module.exports = {
  sendMessage,
  sendImage,
  formatJid,
  parseMetaFromText
};

