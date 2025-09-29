// AI Service - Integração híbrida com IA para respostas inteligentes
// VERSION: v2.5.0 | DATE: 2025-09-29 | AUTHOR: Lucas Gravina - VeloHub Development Team
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config');

class AIService {
  constructor() {
    this.openai = null;
    this.gemini = null;
    this.openaiModel = "gpt-4o-mini"; // Modelo OpenAI (primário)
    this.geminiModel = "gemini-2.5-pro"; // Modelo Gemini (fallback)
    
    // Cache de status das IAs (TTL 5min)
    this.statusCache = {
      data: null,
      timestamp: null,
      ttl: 5 * 60 * 1000 // 5 minutos em ms
    };
  }

  /**
   * Inicializa o cliente OpenAI apenas quando necessário
   */
  _initializeOpenAI() {
    if (!this.openai && this.isOpenAIConfigured()) {
      this.openai = new OpenAI({
        apiKey: config.OPENAI_API_KEY,
      });
    }
    return this.openai;
  }

  /**
   * Inicializa o cliente Gemini apenas quando necessário
   */
  _initializeGemini() {
    if (!this.gemini && this.isGeminiConfigured()) {
      this.gemini = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    }
    return this.gemini;
  }

  /**
   * Gera resposta inteligente baseada na pergunta e contexto
   * FLUXO: Primária (handshake) → Secundária (fallback) → Resposta padrão
   * @param {string} question - Pergunta do usuário
   * @param {string} context - Contexto da base de conhecimento
   * @param {Array} sessionHistory - Histórico da sessão
   * @param {string} userId - ID do usuário
   * @param {string} email - Email do usuário
   * @param {Object} searchResults - Resultados da busca híbrida (opcional)
   * @param {string} formatType - Tipo de formatação (conversational, whatsapp, email)
   * @param {string} primaryAI - IA primária definida pelo handshake ('OpenAI' ou 'Gemini')
   * @returns {Promise<Object>} Resposta com provider usado
   */
  async generateResponse(question, context = "", sessionHistory = [], userId = null, email = null, searchResults = null, formatType = 'conversational', primaryAI = 'OpenAI') {
    try {
      console.log(`🤖 AI Service: Gerando resposta para usuário ${userId || 'anônimo'} - Primária: ${primaryAI}`);
      
      // 1. TENTAR IA PRIMÁRIA (definida pelo handshake)
      if (primaryAI === 'OpenAI' && this.isOpenAIConfigured()) {
        try {
          console.log(`🤖 AI Service: Tentando OpenAI (primária) para usuário ${userId || 'anônimo'}`);
          const response = await this._generateWithOpenAI(question, context, sessionHistory, userId, email, searchResults, formatType);
          return {
            response: response,
            provider: 'OpenAI',
            model: this.openaiModel,
            success: true
          };
        } catch (openaiError) {
          console.warn('⚠️ AI Service: OpenAI falhou, tentando Gemini fallback:', openaiError.message);
        }
      } else if (primaryAI === 'Gemini' && this.isGeminiConfigured()) {
        try {
          console.log(`🤖 AI Service: Tentando Gemini (primária) para usuário ${userId || 'anônimo'}`);
          const response = await this._generateWithGemini(question, context, sessionHistory, userId, email, searchResults, formatType);
          return {
            response: response,
            provider: 'Gemini',
            model: this.geminiModel,
            success: true
          };
        } catch (geminiError) {
          console.warn('⚠️ AI Service: Gemini falhou, tentando OpenAI fallback:', geminiError.message);
        }
      }

      // 2. FALLBACK PARA IA SECUNDÁRIA
      if (primaryAI === 'OpenAI' && this.isGeminiConfigured()) {
        try {
          console.log(`🤖 AI Service: Usando Gemini (fallback) para usuário ${userId || 'anônimo'}`);
          const response = await this._generateWithGemini(question, context, sessionHistory, userId, email, searchResults, formatType);
          return {
            response: response,
            provider: 'Gemini',
            model: this.geminiModel,
            success: true
          };
        } catch (geminiError) {
          console.error('❌ AI Service: Gemini também falhou:', geminiError.message);
        }
      } else if (primaryAI === 'Gemini' && this.isOpenAIConfigured()) {
        try {
          console.log(`🤖 AI Service: Usando OpenAI (fallback) para usuário ${userId || 'anônimo'}`);
          const response = await this._generateWithOpenAI(question, context, sessionHistory, userId, email, searchResults, formatType);
          return {
            response: response,
            provider: 'OpenAI',
            model: this.openaiModel,
            success: true
          };
        } catch (openaiError) {
          console.error('❌ AI Service: OpenAI também falhou:', openaiError.message);
        }
      }

      // 3. SE AMBOS FALHARAM
      throw new Error('Nenhuma API de IA disponível');
      
    } catch (error) {
      console.error('❌ AI Service Error:', error.message);
      
      // 4. FALLBACK PARA RESPOSTA PADRÃO
      return {
        response: `Desculpe, não consegui processar sua pergunta no momento. 
        Por favor, tente novamente ou entre em contato com nosso suporte.`,
        provider: 'Fallback',
        model: 'none',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtém a persona padrão do VeloBot
   * @returns {string} Persona formatada
   */
  getPersona() {
    return `# VELOBOT - ASSISTENTE OFICIAL VELOTAX

## IDENTIDADE
- Nome: VeloBot
- Empresa: Velotax
- Função: Assistente de atendimento ao cliente
- Tom: Profissional, direto, prestativo, conversacional, solidário.

## COMPORTAMENTO
- Responda APENAS com a informação solicitada
- Seja direto, sem preâmbulos ou confirmações
- Use português brasileiro claro e objetivo
- As interações esperadas são de chunho textual, sem adicionar informações genéricas, criadas, ou realizar pesquisas externas.
- Apenas os conhecimentos fornecidos são válidos. Não invente informações.
- NÃO use conhecimento externo ou associações que não estejam nos dados fornecidos.
- Se a resposta contiver muitos termos técnicos, simplifique para um nível de fácil compreensão.
- Se não souber, diga: "Não encontrei essa informação na base de conhecimento disponível"

## FONTES DE INFORMAÇÃO
- Base de dados: Bot_perguntas (MongoDB)
- Artigos: Documentação interna
- Prioridade: Informação sólida > IA generativa

## FORMATO DE RESPOSTA
- Direto ao ponto
- Sem "Entendi", "Compreendo", etc.
- Máximo 200 palavras
- Foco na solução prática`;
  }

  /**
   * Obtém a persona para formatação WhatsApp
   * @returns {string} Persona formatada para WhatsApp
   */
  getWhatsAppPersona() {
    return `# VELOBOT - REFORMULADOR WHATSAPP

## IDENTIDADE
- Nome: VeloBot
- Empresa: Velotax
- Função: Reformulador de respostas para WhatsApp
- Tom: Informal, amigável, direto, com emojis

## COMPORTAMENTO
- Reformule a resposta para o formato WhatsApp
- Use linguagem informal e amigável
- Seja conciso e direto
- Use quebras de linha para facilitar leitura
- Evite jargões técnicos complexos
- Use abreviações comuns do WhatsApp quando apropriado

## FORMATO WHATSAPP
- Máximo 150 palavras
- Quebras de linha frequentes
- Emojis estratégicos
- Linguagem coloquial
- Foco na praticidade

## ESTRUTURA
- Saudação informal (se apropriado)
- Informação principal
- Detalhes importantes
- Encerramento amigável`;
  }

  /**
   * Obtém a persona para formatação E-mail formal
   * @returns {string} Persona formatada para E-mail
   */
  getEmailPersona() {
    return `# VELOBOT - REFORMULADOR E-MAIL FORMAL

## IDENTIDADE
- Nome: VeloBot
- Empresa: Velotax
- Função: Reformulador de respostas para E-mail formal
- Tom: Profissional, formal, estruturado, cortês

## COMPORTAMENTO
- Reformule a resposta para o formato de e-mail formal
- Use linguagem profissional e cortês
- Estruture a informação de forma clara e organizada
- Use títulos e subtítulos quando apropriado
- Seja detalhado mas objetivo
- Mantenha tom respeitoso e profissional

## FORMATO E-MAIL FORMAL
- Máximo 300 palavras
- Estrutura clara com títulos
- Linguagem formal e cortês
- Detalhamento apropriado
- Foco na completude da informação

## ESTRUTURA
- Saudação formal
- Assunto/contexto
- Informação principal estruturada
- Detalhes relevantes
- Encerramento cortês
- Assinatura da empresa`;
  }

  /**
   * Obtém a persona baseada no tipo de formatação
   * @param {string} formatType - Tipo de formatação (conversational, whatsapp, email)
   * @returns {string} Persona apropriada
   */
  _getPersonaByFormat(formatType) {
    console.log(`🔍 Persona Debug: formatType recebido: "${formatType}"`);
    
    switch (formatType) {
      case 'whatsapp':
        console.log('🔍 Persona Debug: Selecionando persona WhatsApp');
        return this.getWhatsAppPersona();
      case 'email':
        console.log('🔍 Persona Debug: Selecionando persona E-mail');
        return this.getEmailPersona();
      case 'conversational':
      default:
        console.log('🔍 Persona Debug: Selecionando persona conversacional (padrão)');
        return this.getPersona();
    }
  }

  /**
   * Analisa pergunta do usuário contra base de dados usando IA
   * @param {string} question - Pergunta do usuário
   * @param {Array} botPerguntasData - Dados do MongoDB Bot_perguntas
   * @returns {Promise<Object>} Análise da IA com opções relevantes
   */
  async analyzeQuestionWithAI(question, botPerguntasData) {
    try {
      console.log(`🤖 AI Analyzer: Analisando pergunta: "${question}"`);
      
      if (!this.isGeminiConfigured()) {
        throw new Error('IA não configurada para análise');
      }

      // Construir contexto com as perguntas filtradas por palavras chave e sinônimos da base
      const contextData = botPerguntasData.map((item, index) => {
        return `${index + 1}. **Pergunta:** ${item.Pergunta || 'N/A'}
   **Palavras-chave:** ${item["Palavras-chave"] || 'N/A'}
   **Sinônimos:** ${item.Sinonimos || 'N/A'}`;
      }).join('\n\n');

      const analysisPrompt = `# ANALISADOR DE PERGUNTAS - VELOBOT

## TAREFA E REGRAS
- A tarefa esperada é a depuraçao da pergunta do usuário com as palavras chave e títulos do banco de dados que serão fornecidos. 
- Use APENAS as informações da base de dados - NÃO faça associações externas
- Identifique APENAS matches diretos e óbvios
- Se não houver match claro, responda: NENHUM
- Retorne APENAS os números das opções com match direto, separados por vírgula

## PERGUNTA DO USUÁRIO
"${question}"

## BASE DE DADOS DISPONÍVEL
${contextData}

## RESPOSTA:`;

      const gemini = this._initializeGemini();
      const model = gemini.getGenerativeModel({ model: this.geminiModel });
      
      const result = await model.generateContent(analysisPrompt);
      const response = result.response.text().trim();
      
      console.log(`🤖 AI Analyzer: Resposta da IA: "${response}"`);
      console.log(`🔍 AI Analyzer: Tamanho da resposta: ${response.length} caracteres`);
      
      // Verificar se a IA retornou "NENHUM" (sem matches)
      if (response.toUpperCase().includes('NENHUM') || response.trim() === '') {
        console.log('❌ AI Analyzer: IA retornou NENHUM - nenhuma opção relevante identificada');
        return { relevantOptions: [], needsClarification: false };
      }

      // Extrair números da resposta
      const relevantIndices = response.match(/\d+/g);
      if (!relevantIndices || relevantIndices.length === 0) {
        console.log('❌ AI Analyzer: Nenhuma opção relevante identificada');
        return { relevantOptions: [], needsClarification: false };
      }

      // Converter para índices reais (subtrair 1)
      const indices = relevantIndices.map(num => parseInt(num) - 1).filter(idx => idx >= 0 && idx < botPerguntasData.length);
      
      console.log(`✅ AI Analyzer: ${indices.length} opções relevantes identificadas: ${indices.join(', ')}`);
      
      // Se apenas 1 opção relevante, não precisa de esclarecimento
      if (indices.length === 1) {
        return {
          relevantOptions: [botPerguntasData[indices[0]]],
          needsClarification: false,
          bestMatch: botPerguntasData[indices[0]]
        };
      }
      
      // Múltiplas opções = precisa de esclarecimento
      const relevantOptions = indices.map(idx => botPerguntasData[idx]);
      
      return {
        relevantOptions: relevantOptions,
        needsClarification: true,
        bestMatch: null
      };

    } catch (error) {
      console.error('❌ AI Analyzer Error:', error.message);
      return { relevantOptions: [], needsClarification: false, error: error.message };
    }
  }

  /**
   * Gera resposta usando Gemini (IA PRIMÁRIA)
   */
  async _generateWithGemini(question, context, sessionHistory, userId, email, searchResults = null, formatType = 'conversational') {
    console.log(`🔍 Gemini Debug: formatType recebido: "${formatType}"`);
    
    const gemini = this._initializeGemini();
    if (!gemini) {
      throw new Error('Falha ao inicializar cliente Gemini');
    }

    const model = gemini.getGenerativeModel({ model: this.geminiModel });
    
    // Construir prompt completo (system + user) otimizado para Gemini
    const systemPrompt = this._getPersonaByFormat(formatType);
    console.log(`🔍 Gemini Debug: Persona selecionada para formatType "${formatType}"`);

    const userPrompt = this.buildOptimizedPrompt(question, context, sessionHistory, searchResults);
    
    // Combinar system + user prompt para Gemini
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    console.log(`🤖 Gemini: Processando pergunta para usuário ${userId || 'anônimo'}`);
    
    const result = await model.generateContent(fullPrompt);
    const response = result.response.text();
    
    console.log(`✅ Gemini: Resposta gerada com sucesso (${response.length} caracteres)`);
    
    return response;
  }

  /**
   * Gera resposta usando OpenAI (IA FALLBACK)
   */
  async _generateWithOpenAI(question, context, sessionHistory, userId, email, searchResults = null, formatType = 'conversational') {
    const openai = this._initializeOpenAI();
    if (!openai) {
      throw new Error('Falha ao inicializar cliente OpenAI');
    }

    // Construir prompt otimizado (baseado no chatbot Vercel)
    const prompt = this.buildOptimizedPrompt(question, context, sessionHistory, searchResults);
    
    console.log(`🤖 OpenAI: Processando pergunta para usuário ${userId || 'anônimo'}`);
    
    const completion = await openai.chat.completions.create({
      model: this.openaiModel,
      messages: [
        {
          role: "system",
          content: this._getPersonaByFormat(formatType)
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Mais determinístico
      max_tokens: 512, // Respostas mais concisas
      top_p: 0.8,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    });

    const response = completion.choices[0].message.content;
    
    console.log(`✅ OpenAI: Resposta gerada com sucesso (${response.length} caracteres)`);
    
    return response;
  }

  /**
   * Constrói contexto estruturado com informações organizadas
   * @param {Object} searchResults - Resultados da busca híbrida
   * @param {Array} sessionHistory - Histórico da sessão
   * @returns {string} Contexto estruturado
   */
  buildStructuredContext(searchResults, sessionHistory) {
    let context = `## CONTEXTO DA CONSULTA\n\n`;
    
    // Informação principal (Bot_perguntas)
    if (searchResults && searchResults.botPergunta) {
      context += `### INFORMAÇÃO PRINCIPAL
**Pergunta:** ${searchResults.botPergunta.Pergunta || searchResults.botPergunta.pergunta}
**Resposta:** ${searchResults.botPergunta.Resposta || searchResults.botPergunta.resposta}
**Relevância:** ${searchResults.botPergunta.relevanceScore || 'N/A'}/10
**Fonte:** Bot_perguntas (MongoDB)

`;
    }
    
    // Artigos relacionados
    if (searchResults && searchResults.articles && searchResults.articles.length > 0) {
      context += `### ARTIGOS RELACIONADOS\n`;
      searchResults.articles.forEach((article, index) => {
        context += `${index + 1}. **${article.title}**
   - Relevância: ${article.relevanceScore || 'N/A'}/10
   - Conteúdo: ${article.content.substring(0, 150)}...
   
`;
      });
    }
    
    // Histórico da sessão
    if (sessionHistory && sessionHistory.length > 0) {
      context += `### HISTÓRICO DA CONVERSA\n`;
      sessionHistory.slice(-3).forEach(h => {
        context += `- ${h.role}: ${h.content}\n`;
      });
      context += `\n`;
    }
    
    return context;
  }

  /**
   * Constrói o prompt otimizado com contexto e histórico
   * @param {string} question - Pergunta atual
   * @param {string} context - Contexto da base de conhecimento (legado)
   * @param {Array} sessionHistory - Histórico da sessão
   * @param {Object} searchResults - Resultados da busca híbrida (novo)
   * @returns {string} Prompt formatado
   */
  buildOptimizedPrompt(question, context, sessionHistory, searchResults = null) {
    // Usar contexto estruturado se searchResults estiver disponível
    const structuredContext = searchResults ? 
      this.buildStructuredContext(searchResults, sessionHistory) : 
      `### CONTEXTO DA BASE DE CONHECIMENTO
${context || "Nenhum contexto específico encontrado."}

### HISTÓRICO DE CONVERSA
${sessionHistory.length > 0 ? 
  sessionHistory.map(h => `${h.role}: ${h.content}`).join("\n") : 
  'Primeira pergunta da sessão.'}`;

    return `${structuredContext}
## PERGUNTA ATUAL
**Usuário:** ${question}

## INSTRUÇÕES
- Use APENAS as informações do contexto acima
- Se a pergunta for sobre crédito, foco em prazos e processos
- Se for sobre documentos, liste exatamente o que é necessário
- Se for sobre prazos, seja específico com datas e tempos
- Se não houver informação suficiente, diga claramente

## RESPOSTA:`;
  }

  /**
   * Valida a qualidade da resposta gerada pela IA
   * @param {string} response - Resposta da IA
   * @param {string} question - Pergunta original
   * @returns {Object} Resultado da validação
   */
  validateResponse(response, question) {
    // Verificar se a resposta é muito genérica
    const genericResponses = [
      "não encontrei essa informação",
      "não tenho essa informação",
      "não posso ajudar com isso",
      "não sei",
      "não consigo"
    ];
    
    const isGeneric = genericResponses.some(generic => 
      response.toLowerCase().includes(generic)
    );
    
    if (isGeneric && response.length < 50) {
      return {
        valid: false,
        reason: "Resposta muito genérica",
        suggestion: "Buscar em outras fontes ou reformular pergunta"
      };
    }
    
    // Verificar se a resposta é muito longa
    if (response.length > 500) {
      return {
        valid: false,
        reason: "Resposta muito longa",
        suggestion: "Resumir para máximo 200 palavras"
      };
    }
    
    return { valid: true };
  }

  /**
   * Constrói o prompt com contexto e histórico (método legado)
   * @param {string} question - Pergunta atual
   * @param {string} context - Contexto da base de conhecimento
   * @param {Array} sessionHistory - Histórico da sessão
   * @returns {string} Prompt formatado
   */
  buildPrompt(question, context, sessionHistory) {
    return this.buildOptimizedPrompt(question, context, sessionHistory);
  }

  /**
   * Verifica se a API OpenAI está configurada corretamente
   * @returns {boolean} Status da configuração
   */
  isOpenAIConfigured() {
    const configured = !!config.OPENAI_API_KEY && config.OPENAI_API_KEY !== 'your_openai_api_key_here';
    if (!configured) {
      console.warn('⚠️ AI Service: OpenAI não configurado - OPENAI_API_KEY ausente ou inválida');
    }
    return configured;
  }

  /**
   * Verifica se a API Gemini está configurada corretamente
   * @returns {boolean} Status da configuração
   */
  isGeminiConfigured() {
    const configured = !!config.GEMINI_API_KEY && config.GEMINI_API_KEY !== 'your_gemini_api_key_here';
    if (!configured) {
      console.warn('⚠️ AI Service: Gemini não configurado - GEMINI_API_KEY ausente ou inválida');
    }
    return configured;
  }

  /**
   * Verifica se alguma API está configurada
   * @returns {boolean} Status da configuração
   */
  isConfigured() {
    return this.isOpenAIConfigured() || this.isGeminiConfigured();
  }

  /**
   * Obtém status das configurações de IA
   * @returns {Object} Status das configurações
   */
  getConfigurationStatus() {
    return {
      gemini: {
        configured: this.isGeminiConfigured(),
        model: this.geminiModel,
        priority: 'primary'
      },
      openai: {
        configured: this.isOpenAIConfigured(),
        model: this.openaiModel,
        priority: 'fallback'
      },
      anyAvailable: this.isConfigured()
    };
  }

  /**
   * Verifica se o cache de status ainda é válido
   * @returns {boolean} Status do cache
   */
  _isCacheValid() {
    // Cache inválido se não há dados ou timestamp
    if (!this.statusCache.data || !this.statusCache.timestamp) {
      console.log('⚠️ AI Service: Cache inválido - dados ou timestamp ausentes');
      return false;
    }
    
    // Verificar se cache expirou
    const now = Date.now();
    const cacheAge = now - this.statusCache.timestamp;
    const isValid = cacheAge < this.statusCache.ttl;
    
    if (!isValid) {
      console.log(`⚠️ AI Service: Cache expirado - idade: ${Math.round(cacheAge / 1000)}s, TTL: ${this.statusCache.ttl / 1000}s`);
    }
    
    return isValid;
  }

  /**
   * Testa a conexão com as APIs de IA (com cache)
   * @returns {Promise<Object>} Status das conexões
   */
  async testConnection() {
    // Verificar cache primeiro
    if (this._isCacheValid()) {
      console.log('✅ AI Service: Usando cache de status das IAs');
      return this.statusCache.data;
    }
    
    console.log('🔍 AI Service: Testando conexões das IAs (cache expirado ou inexistente)');
    const results = {
      openai: { available: false, model: this.openaiModel, priority: 'primary' },
      gemini: { available: false, model: this.geminiModel, priority: 'fallback' },
      anyAvailable: false
    };

    // Teste OpenAI (primário)
    if (this.isOpenAIConfigured()) {
      try {
        const openai = this._initializeOpenAI();
        if (openai) {
          const completion = await openai.chat.completions.create({
            model: this.openaiModel,
            messages: [{ role: "user", content: "Teste de conexão" }],
            max_tokens: 10,
          });
          results.openai.available = true;
          console.log('✅ OpenAI: Conexão testada com sucesso');
        }
      } catch (error) {
        console.error('❌ OpenAI: Erro no teste de conexão:', error.message);
      }
    }

    // Teste Gemini (fallback)
    if (this.isGeminiConfigured()) {
      try {
        const gemini = this._initializeGemini();
        if (gemini) {
          const model = gemini.getGenerativeModel({ model: this.geminiModel });
          const result = await model.generateContent("Teste de conexão");
          results.gemini.available = true;
          console.log('✅ Gemini: Conexão testada com sucesso');
        }
      } catch (error) {
        console.error('❌ Gemini: Erro no teste de conexão:', error.message);
      }
    }

    results.anyAvailable = results.gemini.available || results.openai.available;
    
    // Atualizar cache
    this.statusCache.data = results;
    this.statusCache.timestamp = Date.now();
    
    // Logs assertivos sobre o resultado
    if (results.anyAvailable) {
      const primaryAI = results.openai.available ? 'OpenAI' : 'Gemini';
      const fallbackAI = results.openai.available && results.gemini.available ? 'Gemini' : 
                        results.gemini.available && results.openai.available ? 'OpenAI' : null;
      
      console.log(`✅ AI Service: Cache atualizado - Primária: ${primaryAI}${fallbackAI ? `, Fallback: ${fallbackAI}` : ''}`);
    } else {
      console.error('❌ AI Service: NENHUMA API DE IA DISPONÍVEL - Verificar configuração das chaves');
      console.error('❌ AI Service: OpenAI configurado:', this.isOpenAIConfigured());
      console.error('❌ AI Service: Gemini configurado:', this.isGeminiConfigured());
    }

    return results;
  }
}

module.exports = new AIService();
