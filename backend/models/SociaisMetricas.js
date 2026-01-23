// VERSION: v1.0.0 | DATE: 2025-01-30 | AUTHOR: VeloHub Development Team
const { getSociaisDatabase } = require('../config/database');

class SociaisMetricas {
  constructor() {
    this.collectionName = 'sociais_metricas';
  }

  // Obter coleção
  async getCollection() {
    const db = await getSociaisDatabase();
    return db.collection(this.collectionName);
  }

  // Criar nova tabulação
  async create(tabulationData) {
    try {
      console.log('📥 [SociaisMetricas] create - Dados recebidos:', {
        clientName: tabulationData.clientName,
        socialNetwork: tabulationData.socialNetwork,
        messageText: tabulationData.messageText ? `${tabulationData.messageText.substring(0, 50)}...` : null,
        rating: tabulationData.rating,
        contactReason: tabulationData.contactReason,
        sentiment: tabulationData.sentiment,
        directedCenter: tabulationData.directedCenter,
        link: tabulationData.link,
        dataKeys: Object.keys(tabulationData)
      });
      
      // Verificar se o banco está conectado
      let collection;
      try {
        collection = await this.getCollection();
      } catch (dbError) {
        console.error('❌ [SociaisMetricas] create - Erro ao obter collection:', dbError);
        return {
          success: false,
          error: `Banco de dados não conectado: ${dbError.message}`
        };
      }
      
      // Validar campos obrigatórios
      if (!tabulationData.clientName || !tabulationData.socialNetwork || !tabulationData.messageText) {
        console.error('❌ [SociaisMetricas] create - Campos obrigatórios ausentes:', {
          hasClientName: !!tabulationData.clientName,
          hasSocialNetwork: !!tabulationData.socialNetwork,
          hasMessageText: !!tabulationData.messageText
        });
        return {
          success: false,
          error: 'Campos obrigatórios: clientName, socialNetwork, messageText'
        };
      }

      // Validar enums
      const validNetworks = ['WhatsApp', 'Instagram', 'Facebook', 'TikTok', 'Messenger', 'YouTube', 'PlayStore'];
      if (!validNetworks.includes(tabulationData.socialNetwork)) {
        return {
          success: false,
          error: `socialNetwork deve ser um dos seguintes: ${validNetworks.join(', ')}`
        };
      }

<<<<<<< HEAD
      const validReasons = ['Produto', 'Suporte', 'Bug', 'Elogio', 'Reclamação', 'Oculto', 'Outro'];
=======
      const validReasons = ['Produto', 'Suporte', 'Bug', 'Elogio', 'Reclamação', ' Oculto ', 'Outro'];
>>>>>>> a753bc9e729d5e2b9932f5dd0f67edd5ed3f5aca
      if (tabulationData.contactReason && !validReasons.includes(tabulationData.contactReason)) {
        return {
          success: false,
          error: `contactReason deve ser um dos seguintes: ${validReasons.join(', ')}`
        };
      }

      const validSentiments = ['Positivo', 'Neutro', 'Negativo'];
      if (tabulationData.sentiment && !validSentiments.includes(tabulationData.sentiment)) {
        return {
          success: false,
          error: `sentiment deve ser um dos seguintes: ${validSentiments.join(', ')}`
        };
      }

      // Validar rating se PlayStore
      if (tabulationData.socialNetwork === 'PlayStore' && !tabulationData.rating) {
        return {
          success: false,
          error: 'rating é obrigatório para PlayStore'
        };
      }

      // Converter rating para número se existir
      let ratingValue = null;
      if (tabulationData.rating !== null && tabulationData.rating !== undefined && tabulationData.rating !== '') {
        ratingValue = typeof tabulationData.rating === 'string' 
          ? parseInt(tabulationData.rating, 10) 
          : Number(tabulationData.rating);
        
        // Validar se é um número válido entre 1 e 5
        if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
          return {
            success: false,
            error: 'rating deve ser um número entre 1 e 5'
          };
        }
      }

      // Processar data: se fornecida, usar; caso contrário, usar data atual
      let createdAtDate = new Date()
      if (tabulationData.createdAt) {
        // Tentar converter a data fornecida
        const dateString = tabulationData.createdAt
        
        // Se for apenas uma data (formato YYYY-MM-DD), criar Date no timezone local
        // Isso garante que a data seja interpretada como a data local do usuário
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // É apenas uma data, criar Date com meia-noite no timezone local
          // Adicionar 'T00:00:00' para forçar interpretação como hora local
          const [year, month, day] = dateString.split('-')
          // Criar como string ISO com T00:00:00 para forçar hora local
          const isoString = `${dateString}T00:00:00`
          createdAtDate = new Date(isoString)
          
          // Se ainda assim houver problema de timezone, usar método alternativo
          if (isNaN(createdAtDate.getTime())) {
            // Fallback: criar Date diretamente no timezone local
            createdAtDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0)
          }
          
          console.log('📅 [SociaisMetricas] Data manual processada:', {
            input: dateString,
            output: createdAtDate.toISOString(),
            local: createdAtDate.toLocaleString('pt-BR'),
            getDate: createdAtDate.getDate(),
            getMonth: createdAtDate.getMonth() + 1,
            getFullYear: createdAtDate.getFullYear()
          })
        } else {
          // É uma data completa com hora, usar como está
          const providedDate = new Date(dateString)
          if (!isNaN(providedDate.getTime())) {
            createdAtDate = providedDate
            console.log('📅 [SociaisMetricas] Data completa processada:', {
              input: dateString,
              output: createdAtDate.toISOString(),
              local: createdAtDate.toLocaleString('pt-BR')
            })
          }
        }
      } else {
        console.log('📅 [SociaisMetricas] Usando data atual:', createdAtDate.toISOString())
      }

      const tabulation = {
        clientName: tabulationData.clientName,
        socialNetwork: tabulationData.socialNetwork,
        messageText: tabulationData.messageText,
        rating: ratingValue,  // Usar o valor convertido para número
        contactReason: tabulationData.contactReason || null,
        sentiment: tabulationData.sentiment || null,
        directedCenter: tabulationData.directedCenter !== undefined ? Boolean(tabulationData.directedCenter) : false,
        link: tabulationData.link || null,
        createdAt: createdAtDate,
        updatedAt: new Date()
      };
      
      console.log('🔄 [SociaisMetricas] create - Dados processados para inserção:', {
        ...tabulation,
        messageText: tabulation.messageText ? `${tabulation.messageText.substring(0, 50)}...` : null,
        rating: tabulation.rating,
        createdAt: tabulation.createdAt.toISOString()
      });
      
      const result = await collection.insertOne(tabulation);
      
      console.log('✅ [SociaisMetricas] create - Tabulação inserida com sucesso:', {
        insertedId: result.insertedId,
        acknowledged: result.acknowledged
      });
      
      return {
        success: true,
        data: { ...tabulation, _id: result.insertedId },
        message: 'Tabulação criada com sucesso'
      };
    } catch (error) {
      console.error('❌ Erro ao criar tabulação:', error);
      console.error('❌ Stack trace:', error.stack);
      console.error('❌ Dados recebidos:', tabulationData);
      
      // Verificar se é erro de conexão com banco
      if (error.message && error.message.includes('não conectado')) {
        return {
          success: false,
          error: `Banco de dados não conectado: ${error.message}`
        };
      }
      
      return {
        success: false,
        error: `Erro ao criar tabulação: ${error.message}`,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  // Listar todas as tabulações com filtros
  async getAll(filters = {}) {
    try {
      console.log('📥 [SociaisMetricas] getAll - Filtros recebidos:', filters);
      
      // Verificar conexão do banco antes de executar
      let collection;
      try {
        collection = await this.getCollection();
      } catch (dbError) {
        console.error('❌ [SociaisMetricas] getAll - Banco não conectado:', dbError.message);
        return {
          success: false,
          error: 'Banco de dados não conectado',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        };
      }
      
      // Construir query de filtros
      const query = {};
      
      if (filters.socialNetwork && Array.isArray(filters.socialNetwork) && filters.socialNetwork.length > 0) {
        query.socialNetwork = { $in: filters.socialNetwork };
      }
      
      if (filters.contactReason && Array.isArray(filters.contactReason) && filters.contactReason.length > 0) {
        query.contactReason = { $in: filters.contactReason };
      }
      
      if (filters.sentiment && Array.isArray(filters.sentiment) && filters.sentiment.length > 0) {
        query.sentiment = { $in: filters.sentiment };
      }
      
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) {
          query.createdAt.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          const dateTo = new Date(filters.dateTo);
          dateTo.setHours(23, 59, 59, 999); // Fim do dia
          query.createdAt.$lte = dateTo;
        }
      }

      console.log('🔍 [SociaisMetricas] getAll - Query MongoDB construída:', JSON.stringify(query, null, 2));

      const tabulations = await collection.find(query).sort({ createdAt: -1 }).toArray();
      
      console.log('✅ [SociaisMetricas] getAll - Resultado da consulta:', {
        count: tabulations.length,
        hasData: tabulations.length > 0,
        firstItem: tabulations.length > 0 ? {
          _id: tabulations[0]._id,
          clientName: tabulations[0].clientName,
          socialNetwork: tabulations[0].socialNetwork,
          createdAt: tabulations[0].createdAt
        } : null
      });
      
      return {
        success: true,
        data: tabulations,
        count: tabulations.length
      };
    } catch (error) {
      console.error('❌ [SociaisMetricas] Erro ao listar tabulações:', error);
      console.error('❌ [SociaisMetricas] Stack:', error.stack);
      return {
        success: false,
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // Obter tabulação por ID
  async getById(id) {
    try {
      const collection = await this.getCollection();
      const { ObjectId } = require('mongodb');
      const tabulation = await collection.findOne({ _id: new ObjectId(id) });
      
      if (!tabulation) {
        return {
          success: false,
          error: 'Tabulação não encontrada'
        };
      }

      return {
        success: true,
        data: tabulation
      };
    } catch (error) {
      console.error('Erro ao obter tabulação:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Atualizar tabulação
  async update(id, updateData) {
    try {
      const collection = await this.getCollection();
      const { ObjectId } = require('mongodb');
      
      // Validar enums se fornecidos
      if (updateData.socialNetwork) {
        const validNetworks = ['WhatsApp', 'Instagram', 'Facebook', 'TikTok', 'Messenger', 'YouTube', 'PlayStore'];
        if (!validNetworks.includes(updateData.socialNetwork)) {
          return {
            success: false,
            error: `socialNetwork deve ser um dos seguintes: ${validNetworks.join(', ')}`
          };
        }
      }

      if (updateData.contactReason) {
<<<<<<< HEAD
        const validReasons = ['Produto', 'Suporte', 'Bug', 'Elogio', 'Reclamação', 'Oculto', 'Outro'];
=======
        const validReasons = ['Produto', 'Suporte', 'Bug', 'Elogio', 'Reclamação', ' Oculto '];
>>>>>>> a753bc9e729d5e2b9932f5dd0f67edd5ed3f5aca
        if (!validReasons.includes(updateData.contactReason)) {
          return {
            success: false,
            error: `contactReason deve ser um dos seguintes: ${validReasons.join(', ')}`
          };
        }
      }

      if (updateData.sentiment) {
        const validSentiments = ['Positivo', 'Neutro', 'Negativo'];
        if (!validSentiments.includes(updateData.sentiment)) {
          return {
            success: false,
            error: `sentiment deve ser um dos seguintes: ${validSentiments.join(', ')}`
          };
        }
      }

      const updateDoc = {
        ...updateData,
        updatedAt: new Date()
      };

      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateDoc }
      );

      if (result.matchedCount === 0) {
        return {
          success: false,
          error: 'Tabulação não encontrada'
        };
      }

      return {
        success: true,
        message: 'Tabulação atualizada com sucesso'
      };
    } catch (error) {
      console.error('Erro ao atualizar tabulação:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Deletar tabulação
  async delete(id) {
    try {
      const collection = await this.getCollection();
      const { ObjectId } = require('mongodb');
      
      const result = await collection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return {
          success: false,
          error: 'Tabulação não encontrada'
        };
      }

      return {
        success: true,
        message: 'Tabulação deletada com sucesso'
      };
    } catch (error) {
      console.error('Erro ao deletar tabulação:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Obter métricas para dashboard
  async getMetrics(filters = {}) {
    try {
      console.log('📥 [SociaisMetricas] getMetrics - Filtros recebidos:', filters);
      
      const collection = await this.getCollection();
      
      // Construir query de filtros (mesmo padrão do getAll)
      const query = {};
      
      if (filters.socialNetwork && Array.isArray(filters.socialNetwork) && filters.socialNetwork.length > 0) {
        query.socialNetwork = { $in: filters.socialNetwork };
      }
      
      if (filters.contactReason && Array.isArray(filters.contactReason) && filters.contactReason.length > 0) {
        query.contactReason = { $in: filters.contactReason };
      }
      
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) {
          query.createdAt.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          const dateTo = new Date(filters.dateTo);
          dateTo.setHours(23, 59, 59, 999);
          query.createdAt.$lte = dateTo;
        }
      }

      console.log('🔍 [SociaisMetricas] getMetrics - Query MongoDB construída:', JSON.stringify(query, null, 2));

      const total = await collection.countDocuments(query);
      
      // Contar por sentimento
      const positive = await collection.countDocuments({ ...query, sentiment: 'Positivo' });
      const negative = await collection.countDocuments({ ...query, sentiment: 'Negativo' });
      const neutral = await collection.countDocuments({ ...query, sentiment: 'Neutro' });
      
      // Rede mais ativa
      const networkCounts = await collection.aggregate([
        { $match: query },
        { $group: { _id: '$socialNetwork', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ]).toArray();
      
      const mostActiveNetwork = networkCounts.length > 0 ? networkCounts[0]._id : null;
      
      // Calcular percentual positivo
      const positivePercent = total > 0 ? ((positive / total) * 100).toFixed(1) : 0;

      const metricsData = {
        totalContacts: total,
        positivePercent: parseFloat(positivePercent),
        mostActiveNetwork: mostActiveNetwork,
        sentimentBreakdown: {
          positive,
          negative,
          neutral
        }
      };

      console.log('✅ [SociaisMetricas] getMetrics - Métricas calculadas:', metricsData);

      return {
        success: true,
        data: metricsData
      };
    } catch (error) {
      console.error('Erro ao obter métricas:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Obter dados para gráficos
  async getChartData(filters = {}) {
    try {
      console.log('📥 [SociaisMetricas] getChartData - Filtros recebidos:', filters);
      
      const collection = await this.getCollection();
      
      // Construir query de filtros
      const query = {};
      
      if (filters.socialNetwork && Array.isArray(filters.socialNetwork) && filters.socialNetwork.length > 0) {
        query.socialNetwork = { $in: filters.socialNetwork };
      }
      
      if (filters.contactReason && Array.isArray(filters.contactReason) && filters.contactReason.length > 0) {
        query.contactReason = { $in: filters.contactReason };
      }
      
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) {
          query.createdAt.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          const dateTo = new Date(filters.dateTo);
          dateTo.setHours(23, 59, 59, 999);
          query.createdAt.$lte = dateTo;
        }
      }

      console.log('🔍 [SociaisMetricas] getChartData - Query MongoDB construída:', JSON.stringify(query, null, 2));

      // Volume por rede social
      const networkData = await collection.aggregate([
        { $match: query },
        { $group: { _id: '$socialNetwork', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray();

      // Motivos frequentes
      const reasonData = await collection.aggregate([
        { $match: query },
        { $group: { _id: '$contactReason', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray();

      const chartData = {
        networkVolume: networkData.map(item => ({ socialNetwork: item._id, count: item.count })),
        reasonFrequency: reasonData.map(item => ({ reason: item._id, count: item.count }))
      };

      console.log('✅ [SociaisMetricas] getChartData - Dados calculados:', {
        networkVolumeCount: chartData.networkVolume.length,
        reasonFrequencyCount: chartData.reasonFrequency.length
      });

      return {
        success: true,
        data: chartData
      };
    } catch (error) {
      console.error('Erro ao obter dados de gráficos:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Obter média de ratings
  async getRatingAverage(filters = {}) {
    try {
      console.log('📥 [SociaisMetricas] getRatingAverage - Filtros recebidos:', filters);
      
      const collection = await this.getCollection();
      
      // Construir query de filtros
      const query = {};
      
      // Aceitar ratings válidos (não null, não vazio, não zero)
      query.rating = { 
        $exists: true, 
        $ne: null,
        $nin: [0, '', '0']  // Excluir valores inválidos
      };
      
      // Aplicar filtro de rede social (aceitar tanto array quanto string)
      if (filters.socialNetwork) {
        if (Array.isArray(filters.socialNetwork) && filters.socialNetwork.length > 0) {
          query.socialNetwork = { $in: filters.socialNetwork };
        } else if (typeof filters.socialNetwork === 'string' && filters.socialNetwork !== '') {
          query.socialNetwork = filters.socialNetwork;
        }
      }
      
      // Aplicar filtros de data
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) {
          query.createdAt.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          const dateTo = new Date(filters.dateTo);
          dateTo.setHours(23, 59, 59, 999);
          query.createdAt.$lte = dateTo;
        }
      }

      console.log('🔍 [SociaisMetricas] getRatingAverage - Query MongoDB construída:', JSON.stringify(query, null, 2));

      // Calcular média usando agregação com conversão de tipos
      const result = await collection.aggregate([
        { $match: query },
        {
          $addFields: {
            // Converter rating para número (funciona tanto para números quanto strings numéricas)
            ratingNumber: {
              $cond: {
                if: { $eq: [{ $type: '$rating' }, 'string'] },
                then: {
                  $cond: {
                    if: { $in: ['$rating', ['1', '2', '3', '4', '5']] },
                    then: { $toInt: '$rating' },
                    else: null
                  }
                },
                else: {
                  $cond: {
                    if: { $and: [
                      { $gte: ['$rating', 1] },
                      { $lte: ['$rating', 5] }
                    ]},
                    then: '$rating',
                    else: null
                  }
                }
              }
            }
          }
        },
        {
          $match: {
            ratingNumber: { $ne: null, $gte: 1, $lte: 5 }
          }
        },
        {
          $group: {
            _id: null,
            average: { $avg: '$ratingNumber' },
            count: { $sum: 1 },
            total: { $sum: '$ratingNumber' }
          }
        }
      ]).toArray();

      console.log('📊 [SociaisMetricas] getRatingAverage - Resultado da agregação:', {
        resultLength: result.length,
        result: result.length > 0 ? result[0] : null
      });

      if (result.length === 0 || result[0].count === 0) {
        console.log('⚠️ [SociaisMetricas] getRatingAverage - Nenhum rating encontrado');
        return {
          success: true,
          data: {
            average: null,
            count: 0,
            total: 0
          }
        };
      }

      const ratingData = {
        average: parseFloat(result[0].average.toFixed(2)),
        count: result[0].count,
        total: result[0].total
      };

      console.log('✅ [SociaisMetricas] getRatingAverage - Média calculada:', ratingData);

      return {
        success: true,
        data: ratingData
      };
    } catch (error) {
      console.error('Erro ao obter média de ratings:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Criar índices para performance
  async createIndexes() {
    try {
      const collection = await this.getCollection();
      
      await collection.createIndex({ socialNetwork: 1 });
      await collection.createIndex({ createdAt: -1 });
      await collection.createIndex({ sentiment: 1 });
      await collection.createIndex({ contactReason: 1 });
      
      console.log('✅ Índices criados para sociais_metricas');
      return {
        success: true,
        message: 'Índices criados com sucesso'
      };
    } catch (error) {
      console.error('Erro ao criar índices:', error);
      return {
        success: false,
        error: 'Erro ao criar índices'
      };
    }
  }
}

module.exports = new SociaisMetricas();
