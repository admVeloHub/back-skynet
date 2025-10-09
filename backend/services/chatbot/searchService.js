// Search Service - Busca inteligente em Bot_perguntas e Artigos
// VERSION: v1.2.0 | DATE: 2024-12-19 | AUTHOR: VeloHub Development Team
// VERSION: v2.3.0 | DATE: 2025-01-27 | AUTHOR: Lucas Gravina - VeloHub Development Team
const cosineSimilarity = require('cosine-similarity');

class SearchService {
  constructor() {
    this.botPerguntasCache = [];
    this.articlesCache = [];
    this.lastCacheUpdate = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Busca pergunta relevante no banco Bot_perguntas
   * @param {string} question - Pergunta do usuário
   * @param {Array} botPerguntasData - Dados do MongoDB Bot_perguntas
   * @returns {Object|null} Pergunta mais relevante ou null
   */
  async findRelevantBotPergunta(question, botPerguntasData) {
    try {
      if (!botPerguntasData || botPerguntasData.length === 0) {
        console.log('📋 Search: Nenhuma pergunta do Bot_perguntas disponível');
        return null;
      }

      const questionWords = this.normalizeText(question);
      let bestMatch = null;
      let bestScore = 0;

      console.log(`🔍 Search: Buscando em Bot_perguntas para: "${question}"`);
      console.log(`📊 Search: Analisando ${botPerguntasData.length} perguntas do Bot_perguntas`);

      for (let i = 0; i < botPerguntasData.length; i++) {
        const pergunta = botPerguntasData[i];
        const score = this.calculateRelevanceScore(questionWords, pergunta);
        
        // Log detalhado para as primeiras 3 perguntas ou scores > 0.05
        if (i < 3 || score > 0.05) {
          console.log(`🔍 Search: Pergunta ${i+1}: "${pergunta.pergunta || 'Sem título'}" - Score: ${score.toFixed(3)}`);
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            ...pergunta,
            relevanceScore: score
          };
        }
      }

      // Threshold mínimo de relevância (reduzido significativamente para melhor detecção)
      if (bestScore > 0.05) {
        console.log(`✅ Search: Pergunta encontrada em Bot_perguntas com score ${bestScore.toFixed(3)}`);
        console.log(`📋 Search: Match encontrado: "${bestMatch.pergunta}"`);
        console.log(`🔍 Search: Palavras-chave: "${bestMatch.palavrasChave}"`);
        console.log(`🔍 Search: Sinônimos: "${bestMatch.sinonimos}"`);
        return bestMatch;
      }

      console.log(`❌ Search: Nenhuma pergunta relevante encontrada (melhor score: ${bestScore.toFixed(3)})`);
      console.log(`🔍 Search: Total de perguntas analisadas: ${botPerguntasData.length}`);
      return null;

    } catch (error) {
      console.error('❌ Search Error (Bot_perguntas):', error.message);
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
        
        if (score > 0.05) { // Threshold reduzido para artigos (mesmo do Bot_perguntas)
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
   * @param {Object} item - Item do Bot_perguntas ou artigo
   * @returns {number} Score de relevância (0-1)
   */
  calculateRelevanceScore(questionWords, item) {
    try {
      // Extrair texto relevante do item
      const itemText = this.extractRelevantText(item);
      const itemWords = this.normalizeText(itemText);

      console.log(`🔍 Search: Calculando score para pergunta: "${questionWords}"`);
      console.log(`🔍 Search: Item texto: "${itemWords.substring(0, 100)}..."`);

      // 1. Calcular similaridade usando cosine similarity
      const questionVector = this.createWordVector(questionWords);
      const itemVector = this.createWordVector(itemWords);

      let similarity = 0;
      if (questionVector.length > 0 && itemVector.length > 0) {
        similarity = cosineSimilarity(questionVector, itemVector);
        console.log(`🔍 Search: Cosine similarity: ${similarity.toFixed(3)}`);
      }

      // 2. Boost para matches exatos em keywords
      const keywordBoost = this.calculateKeywordBoost(questionWords, item);
      console.log(`🔍 Search: Keyword boost: ${keywordBoost.toFixed(3)}`);

      // 3. Fuzzy matching para palavras-chave e sinônimos
      const fuzzyScore = this.calculateFuzzyMatch(questionWords, item);
      console.log(`🔍 Search: Fuzzy match score: ${fuzzyScore.toFixed(3)}`);

      // 4. Match exato na pergunta
      const exactMatchScore = this.calculateExactMatch(questionWords, item);
      console.log(`🔍 Search: Exact match score: ${exactMatchScore.toFixed(3)}`);

      const finalScore = Math.min(1, similarity + keywordBoost + fuzzyScore + exactMatchScore);
      console.log(`🔍 Search: Score final: ${finalScore.toFixed(3)}`);
      
      return finalScore;

    } catch (error) {
      console.error('❌ Search Error (Score):', error.message);
      return 0;
    }
  }

  /**
   * Extrai texto relevante do item (Bot_perguntas ou artigo)
   * @param {Object} item - Item do Bot_perguntas ou artigo
   * @returns {string} Texto relevante
   */
  extractRelevantText(item) {
    const texts = [];
    
    // DEBUG: Verificar estrutura do item
    console.log(`🔍 Search: DEBUG - Estrutura do item:`, Object.keys(item));
    console.log(`🔍 Search: DEBUG - Item completo:`, JSON.stringify(item, null, 2));
    
    // Para Bot_perguntas (estrutura MongoDB correta)
    if (item.pergunta) {
      texts.push(item.pergunta);
      console.log(`🔍 Search: Pergunta: "${item.pergunta}"`);
    } else {
      console.log(`⚠️ Search: Campo 'pergunta' não encontrado no item`);
    }
    
    if (item.palavrasChave) {
      texts.push(item.palavrasChave);
      console.log(`🔍 Search: Palavras-chave: "${item.palavrasChave}"`);
    } else {
      console.log(`⚠️ Search: Campo 'palavrasChave' não encontrado no item`);
    }
    
    if (item.sinonimos) {
      texts.push(item.sinonimos);
      console.log(`🔍 Search: Sinônimos: "${item.sinonimos}"`);
    } else {
      console.log(`⚠️ Search: Campo 'sinonimos' não encontrado no item`);
    }
    
    // Para Artigos (estrutura MongoDB correta)
    if (item.artigo_titulo) {
      texts.push(item.artigo_titulo);
      console.log(`🔍 Search: Título do artigo: "${item.artigo_titulo}"`);
    } else {
      console.log(`⚠️ Search: Campo 'artigo_titulo' não encontrado no item`);
    }
    
    if (item.artigo_conteudo) {
      texts.push(item.artigo_conteudo.substring(0, 500)); // Primeiros 500 chars
      console.log(`🔍 Search: Conteúdo do artigo: "${item.artigo_conteudo.substring(0, 100)}..."`);
    } else {
      console.log(`⚠️ Search: Campo 'artigo_conteudo' não encontrado no item`);
    }
    
    if (item.categoria_titulo) {
      texts.push(item.categoria_titulo);
      console.log(`🔍 Search: Categoria do artigo: "${item.categoria_titulo}"`);
    }
    
    if (item.tag) {
      texts.push(item.tag);
      console.log(`🔍 Search: Tag do artigo: "${item.tag}"`);
    }
    
    const result = texts.join(' ').trim();
    console.log(`🔍 Search: Texto final extraído para busca: "${result.substring(0, 150)}..."`);
    console.log(`🔍 Search: DEBUG - Total de textos encontrados: ${texts.length}`);
    console.log(`🔍 Search: DEBUG - Resultado final length: ${result.length}`);
    
    return result;
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
   * @param {Object} item - Item do Bot_perguntas ou artigo
   * @returns {number} Boost score
   */
  calculateKeywordBoost(questionWords, item) {
    let boost = 0;
    
    // Buscar apenas no campo correto do MongoDB
    if (item.palavrasChave) {
      const keywordsText = item.palavrasChave.toLowerCase();
      const questionWordsArray = questionWords.toLowerCase().split(' ');
      
      questionWordsArray.forEach(word => {
        if (word.length > 2 && keywordsText.includes(word)) {
          boost += 0.15; // Boost maior para matches exatos
        }
      });
    }
    
    return Math.min(0.4, boost); // Máximo 0.4 de boost
  }

  /**
   * Calcula fuzzy matching para palavras-chave e sinônimos
   * @param {string} questionWords - Palavras da pergunta
   * @param {Object} item - Item do Bot_perguntas
   * @returns {number} Fuzzy match score
   */
  calculateFuzzyMatch(questionWords, item) {
    let fuzzyScore = 0;
    const questionLower = questionWords.toLowerCase();
    
    // Fuzzy match em Palavras-chave
    if (item.palavrasChave) {
      const keywords = item.palavrasChave.toLowerCase();
      const questionWordsArray = questionLower.split(' ');
      
      questionWordsArray.forEach(word => {
        if (word.length > 2) {
          // Verificar se a palavra está contida nas keywords
          if (keywords.includes(word)) {
            fuzzyScore += 0.1;
          }
          // Verificar se alguma keyword está contida na palavra
          const keywordArray = keywords.split(/[,\s]+/);
          keywordArray.forEach(keyword => {
            if (keyword.length > 2 && (word.includes(keyword) || keyword.includes(word))) {
              fuzzyScore += 0.05;
            }
          });
        }
      });
    }
    
    // Fuzzy match em Sinônimos
    if (item.Sinonimos) {
      const synonyms = item.Sinonimos.toLowerCase();
      const questionWordsArray = questionLower.split(' ');
      
      questionWordsArray.forEach(word => {
        if (word.length > 2 && synonyms.includes(word)) {
          fuzzyScore += 0.08; // Boost menor para sinônimos
        }
      });
    }
    
    return Math.min(0.3, fuzzyScore); // Máximo 0.3 de fuzzy score
  }

  /**
   * Calcula match exato na pergunta
   * @param {string} questionWords - Palavras da pergunta
   * @param {Object} item - Item do Bot_perguntas
   * @returns {number} Exact match score
   */
  calculateExactMatch(questionWords, item) {
    if (!item.pergunta) return 0;
    
    const questionLower = questionWords.toLowerCase();
    const perguntaLower = item.pergunta.toLowerCase();
    
    // Match exato completo
    if (perguntaLower.includes(questionLower) || questionLower.includes(perguntaLower)) {
      return 0.5; // Score alto para match exato
    }
    
    // Match parcial significativo
    const questionWordsArray = questionLower.split(' ');
    let matchCount = 0;
    
    questionWordsArray.forEach(word => {
      if (word.length > 3 && perguntaLower.includes(word)) {
        matchCount++;
      }
    });
    
    // Se mais de 50% das palavras fazem match
    if (matchCount / questionWordsArray.length > 0.5) {
      return 0.3;
    }
    
    return 0;
  }


  /**
   * Busca híbrida: Bot_perguntas + Artigos (apenas banco de dados)
   * @param {string} question - Pergunta do usuário
   * @param {Array} botPerguntasData - Dados do MongoDB Bot_perguntas
   * @param {Array} articlesData - Dados dos artigos
   * @returns {Object} Resultado da busca híbrida
   */
  async hybridSearch(question, botPerguntasData, articlesData) {
    console.log(`🔍 Search: Iniciando busca híbrida para: "${question}"`);
    
    const [botPerguntaResult, articlesResult] = await Promise.all([
      this.findRelevantBotPergunta(question, botPerguntasData),
      this.findRelevantArticles(question, articlesData)
    ]);

    return {
      botPergunta: botPerguntaResult,
      articles: articlesResult,
      hasResults: !!(botPerguntaResult || articlesResult.length > 0)
    };
  }

  /**
   * Sistema de desduplicação e menu de esclarecimento (adaptado para MongoDB)
   * @param {string} question - Pergunta do usuário
   * @param {Array} botPerguntasData - Dados do MongoDB Bot_perguntas
   * @returns {Object} Resultado com desduplicação e opções de esclarecimento
   */
  findMatchesWithDeduplication(question, botPerguntasData) {
    if (!botPerguntasData || botPerguntasData.length === 0) {
      return { matches: [], needsClarification: false };
    }

    const palavrasDaBusca = this.normalizeText(question).split(' ').filter(p => p.length > 2);
    let todasAsCorrespondencias = [];

    // Processar cada documento do MongoDB
    for (let i = 0; i < botPerguntasData.length; i++) {
      const documento = botPerguntasData[i];
      
      // Extrair campos do documento MongoDB
      const pergunta = documento.pergunta || '';
      const resposta = documento.resposta || '';
      const palavrasChave = documento.palavrasChave || '';
      const sinonimos = documento.sinonimos || '';
      
      // Combinar palavras-chave e sinônimos para busca
      const textoBusca = `${palavrasChave} ${sinonimos}`.toLowerCase();
      let relevanceScore = 0;
      
      // Calcular score baseado nas palavras da busca
      palavrasDaBusca.forEach(palavra => {
        if (textoBusca.includes(palavra.toLowerCase())) {
          relevanceScore++;
        }
        // Bonus para match na pergunta
        if (pergunta.toLowerCase().includes(palavra.toLowerCase())) {
          relevanceScore += 0.5;
        }
      });
      
      if (relevanceScore > 0) {
        todasAsCorrespondencias.push({
          resposta: resposta,
          perguntaOriginal: pergunta,
          sourceRow: i + 1,
          score: relevanceScore,
          _id: documento._id,
          palavrasChave: palavrasChave,
          sinonimos: sinonimos
        });
      }
    }

    // Desduplicação e ordenação
    const uniqueMatches = {};
    todasAsCorrespondencias.forEach(match => {
      const key = (match.perguntaOriginal || match.Pergunta || '').trim();
      if (!uniqueMatches[key] || match.score > uniqueMatches[key].score) {
        uniqueMatches[key] = match;
      }
    });
    
    let correspondenciasUnicas = Object.values(uniqueMatches);
    correspondenciasUnicas.sort((a, b) => b.score - a.score);

    return {
      matches: correspondenciasUnicas
    };
  }


  /**
   * Gera menu de esclarecimento baseado na análise da IA
   * @param {Array} relevantOptions - Opções relevantes identificadas pela IA
   * @param {string} question - Pergunta original
   * @returns {Object} Menu de esclarecimento
   */
  generateClarificationMenuFromAI(relevantOptions, question) {
    const options = relevantOptions.slice(0, 12).map(option => option.pergunta || option.Pergunta || 'Opção não disponível');
    
    return {
      status: "clarification_needed",
      resposta: `Encontrei vários tópicos sobre "${question}". Qual deles se encaixa melhor na sua dúvida?`,
      options: options,
      source: "Bot_perguntas",
      sourceRow: 'Análise IA'
    };
  }
}

module.exports = new SearchService();
