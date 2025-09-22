// Search Service - Busca inteligente em FAQ e Artigos
// VERSION: v2.0.2 | DATE: 2025-01-27 | AUTHOR: Lucas Gravina - VeloHub Development Team
const cosineSimilarity = require('cosine-similarity');
const axios = require('axios');

class SearchService {
  constructor() {
    this.faqCache = [];
    this.articlesCache = [];
    this.lastCacheUpdate = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Busca FAQ relevante baseado na pergunta
   * @param {string} question - Pergunta do usuário
   * @param {Array} faqData - Dados do FAQ
   * @returns {Object|null} FAQ mais relevante ou null
   */
  async findRelevantFAQ(question, faqData) {
    try {
      if (!faqData || faqData.length === 0) {
        console.log('📋 Search: Nenhum FAQ disponível');
        return null;
      }

      const questionWords = this.normalizeText(question);
      let bestMatch = null;
      let bestScore = 0;

      console.log(`🔍 Search: Buscando FAQ para: "${question}"`);

      for (const faq of faqData) {
        const score = this.calculateRelevanceScore(questionWords, faq);
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            ...faq,
            relevanceScore: score
          };
        }
      }

      // Threshold mínimo de relevância
      if (bestScore > 0.3) {
        console.log(`✅ Search: FAQ encontrado com score ${bestScore.toFixed(2)}`);
        return bestMatch;
      }

      console.log(`❌ Search: Nenhum FAQ relevante encontrado (melhor score: ${bestScore.toFixed(2)})`);
      return null;

    } catch (error) {
      console.error('❌ Search Error (FAQ):', error.message);
      return null;
    }
  }

  /**
   * Busca artigos relevantes baseado na pergunta
   * @param {string} question - Pergunta do usuário
   * @param {Array} articlesData - Dados dos artigos
   * @returns {Array} Artigos relevantes ordenados por relevância
   */
  async findRelevantArticles(question, articlesData) {
    try {
      if (!articlesData || articlesData.length === 0) {
        console.log('📋 Search: Nenhum artigo disponível');
        return [];
      }

      const questionWords = this.normalizeText(question);
      const relevantArticles = [];

      console.log(`🔍 Search: Buscando artigos para: "${question}"`);

      for (const article of articlesData) {
        const score = this.calculateRelevanceScore(questionWords, article);
        
        if (score > 0.2) { // Threshold mais baixo para artigos
          relevantArticles.push({
            ...article,
            relevanceScore: score
          });
        }
      }

      // Ordenar por relevância
      relevantArticles.sort((a, b) => b.relevanceScore - a.relevanceScore);

      console.log(`✅ Search: ${relevantArticles.length} artigos relevantes encontrados`);
      return relevantArticles.slice(0, 5); // Máximo 5 artigos

    } catch (error) {
      console.error('❌ Search Error (Articles):', error.message);
      return [];
    }
  }

  /**
   * Calcula score de relevância entre pergunta e item
   * @param {string} questionWords - Palavras da pergunta normalizadas
   * @param {Object} item - Item do FAQ ou artigo
   * @returns {number} Score de relevância (0-1)
   */
  calculateRelevanceScore(questionWords, item) {
    try {
      // Extrair texto relevante do item
      const itemText = this.extractRelevantText(item);
      const itemWords = this.normalizeText(itemText);

      // Calcular similaridade usando cosine similarity
      const questionVector = this.createWordVector(questionWords);
      const itemVector = this.createWordVector(itemWords);

      if (questionVector.length === 0 || itemVector.length === 0) {
        return 0;
      }

      const similarity = cosineSimilarity(questionVector, itemVector);
      
      // Boost para matches exatos em keywords
      const keywordBoost = this.calculateKeywordBoost(questionWords, item);
      
      return Math.min(1, similarity + keywordBoost);

    } catch (error) {
      console.error('❌ Search Error (Score):', error.message);
      return 0;
    }
  }

  /**
   * Extrai texto relevante do item (FAQ ou artigo)
   * @param {Object} item - Item do FAQ ou artigo
   * @returns {string} Texto relevante
   */
  extractRelevantText(item) {
    const texts = [];
    
    // Para FAQ (estrutura MongoDB: Bot_perguntas)
    if (item.pergunta) texts.push(item.pergunta);
    if (item.palavras_chave) texts.push(item.palavras_chave);
    if (item.categoria) texts.push(item.categoria);
    if (item.resposta) texts.push(item.resposta.substring(0, 300)); // Primeiros 300 chars da resposta
    
    // Fallback para estrutura antiga
    if (item.question) texts.push(item.question);
    if (item.context) texts.push(item.context);
    if (item.keywords) {
      const keywordsText = Array.isArray(item.keywords) ? item.keywords.join(' ') : item.keywords;
      texts.push(keywordsText);
    }
    
    // Para Artigos
    if (item.title) texts.push(item.title);
    if (item.content) texts.push(item.content.substring(0, 500)); // Primeiros 500 chars
    
    return texts.join(' ');
  }

  /**
   * Normaliza texto para busca
   * @param {string} text - Texto a ser normalizado
   * @returns {string} Texto normalizado
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/gi, ' ') // Remove pontuação
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
  }

  /**
   * Cria vetor de palavras para cálculo de similaridade
   * @param {string} text - Texto normalizado
   * @returns {Array} Vetor de palavras
   */
  createWordVector(text) {
    const words = text.split(' ').filter(word => word.length > 2);
    const wordCount = {};
    
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.values(wordCount);
  }

  /**
   * Calcula boost para matches em keywords
   * @param {string} questionWords - Palavras da pergunta
   * @param {Object} item - Item do FAQ ou artigo
   * @returns {number} Boost score
   */
  calculateKeywordBoost(questionWords, item) {
    let boost = 0;
    
    if (item.keywords) {
      const keywords = Array.isArray(item.keywords) ? 
        item.keywords.join(' ').toLowerCase() : 
        item.keywords.toLowerCase();
      
      const questionWordsArray = questionWords.split(' ');
      
      questionWordsArray.forEach(word => {
        if (keywords.includes(word)) {
          boost += 0.1; // 0.1 de boost por keyword match
        }
      });
    }
    
    return Math.min(0.3, boost); // Máximo 0.3 de boost
  }

  /**
   * Busca em sites autorizados (baseado no chatbot Vercel)
   * @param {string} question - Pergunta do usuário
   * @returns {Promise<string|null>} Contexto encontrado nos sites
   */
  async searchAuthorizedSites(question) {
    const sites = [
      "https://www.gov.br/receitafederal",
      "https://cav.receita.fazenda.gov.br",
      "https://www.gov.br",
      "https://velotax.com.br"
    ];
    
    let contexto = "";
    
    console.log(`🌐 Search: Buscando em sites autorizados para: "${question}"`);
    
    for (const site of sites) {
      try {
        const { data } = await axios.get(site, { 
          timeout: 10000, // Aumentado para 10 segundos
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; VeloHub-Bot/1.0)'
          }
        });
        if (data.toLowerCase().includes(question.toLowerCase())) {
          contexto += `Fonte: ${site}\nTrecho encontrado que menciona a pergunta.\n\n`;
        }
      } catch (e) {
        console.error(`❌ Search: Falha ao processar site ${site}:`, e.message);
        // Continuar para o próximo site em caso de erro
        continue;
      }
    }
    
    return contexto || null;
  }

  /**
   * Busca híbrida: FAQ + Artigos (sem sites externos)
   * @param {string} question - Pergunta do usuário
   * @param {Array} faqData - Dados do FAQ
   * @param {Array} articlesData - Dados dos artigos
   * @returns {Object} Resultado da busca híbrida
   */
  async hybridSearch(question, faqData, articlesData) {
    console.log(`🔍 Search: Iniciando busca híbrida para: "${question}"`);
    
    const [faqResult, articlesResult] = await Promise.all([
      this.findRelevantFAQ(question, faqData),
      this.findRelevantArticles(question, articlesData)
    ]);

    return {
      faq: faqResult,
      articles: articlesResult,
      sitesContext: null, // Removido sites externos
      hasResults: !!(faqResult || articlesResult.length > 0)
    };
  }

  /**
   * Sistema de desduplicação e menu de esclarecimento (baseado no chatbot Vercel)
   * @param {string} question - Pergunta do usuário
   * @param {Array} faqData - Dados do FAQ
   * @returns {Object} Resultado com desduplicação e opções de esclarecimento
   */
  findMatchesWithDeduplication(question, faqData) {
    if (!faqData || faqData.length === 0) {
      return { matches: [], needsClarification: false };
    }

    const cabecalho = faqData[0];
    const dados = faqData.slice(1);
    const idxPergunta = cabecalho.indexOf("Pergunta");
    const idxPalavrasChave = cabecalho.indexOf("Palavras-chave");
    const idxResposta = cabecalho.indexOf("Resposta");

    if (idxPergunta === -1 || idxResposta === -1 || idxPalavrasChave === -1) {
      console.error("❌ Search: Colunas essenciais não encontradas");
      return { matches: [], needsClarification: false };
    }

    const palavrasDaBusca = this.normalizeText(question).split(' ').filter(p => p.length > 2);
    let todasAsCorrespondencias = [];

    for (let i = 0; i < dados.length; i++) {
      const linhaAtual = dados[i];
      const textoPalavrasChave = this.normalizeText(linhaAtual[idxPalavrasChave] || '');
      let relevanceScore = 0;
      
      palavrasDaBusca.forEach(palavra => {
        if (textoPalavrasChave.includes(palavra)) relevanceScore++;
      });
      
      if (relevanceScore > 0) {
        todasAsCorrespondencias.push({
          resposta: linhaAtual[idxResposta],
          perguntaOriginal: linhaAtual[idxPergunta],
          sourceRow: i + 2,
          score: relevanceScore,
          tabulacoes: linhaAtual[3] || null
        });
      }
    }

    // Desduplicação e ordenação
    const uniqueMatches = {};
    todasAsCorrespondencias.forEach(match => {
      const key = match.perguntaOriginal.trim();
      if (!uniqueMatches[key] || match.score > uniqueMatches[key].score) {
        uniqueMatches[key] = match;
      }
    });
    
    let correspondenciasUnicas = Object.values(uniqueMatches);
    correspondenciasUnicas.sort((a, b) => b.score - a.score);

    // Verificar se precisa de esclarecimento
    const needsClarification = correspondenciasUnicas.length > 1 && 
      correspondenciasUnicas[0].score === correspondenciasUnicas[1].score;

    return {
      matches: correspondenciasUnicas,
      needsClarification: needsClarification
    };
  }

  /**
   * Gera menu de esclarecimento para perguntas ambíguas
   * @param {Array} matches - Matches encontrados
   * @param {string} question - Pergunta original
   * @returns {Object} Menu de esclarecimento
   */
  generateClarificationMenu(matches, question) {
    const options = matches.slice(0, 12).map(match => match.perguntaOriginal);
    
    return {
      status: "clarification_needed",
      resposta: `Encontrei vários tópicos sobre "${question}". Qual deles se encaixa melhor na sua dúvida?`,
      options: options,
      source: "Planilha",
      sourceRow: 'Pergunta de Esclarecimento'
    };
  }
}

module.exports = new SearchService();
