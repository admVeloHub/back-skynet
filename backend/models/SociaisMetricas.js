// VERSION: v1.0.0 | DATE: 2025-01-30 | AUTHOR: VeloHub Development Team
const { getSociaisDatabase } = require('../config/database');

class SociaisMetricas {
  constructor() {
    this.collectionName = 'sociais_metricas';
  }

  // Obter coleção
  getCollection() {
    const db = getSociaisDatabase();
    return db.collection(this.collectionName);
  }

  // Criar nova tabulação
  async create(tabulationData) {
    try {
      // Verificar se o banco está conectado
      let collection;
      try {
        collection = this.getCollection();
      } catch (dbError) {
        console.error('❌ Erro ao obter collection:', dbError);
        return {
          success: false,
          error: `Banco de dados não conectado: ${dbError.message}`
        };
      }
      
      // Validar campos obrigatórios
      if (!tabulationData.clientName || !tabulationData.socialNetwork || !tabulationData.messageText) {
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

      const validReasons = ['Produto', 'Suporte', 'Bug', 'Elogio', 'Reclamação', ' Oculto '];
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

      const tabulation = {
        clientName: tabulationData.clientName,
        socialNetwork: tabulationData.socialNetwork,
        messageText: tabulationData.messageText,
        rating: ratingValue,  // Usar o valor convertido para número
        contactReason: tabulationData.contactReason || null,
        sentiment: tabulationData.sentiment || null,
        directedCenter: tabulationData.directedCenter !== undefined ? Boolean(tabulationData.directedCenter) : false,
        link: tabulationData.link || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(tabulation);
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
      const collection = this.getCollection();
      
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

      const tabulations = await collection.find(query).sort({ createdAt: -1 }).toArray();
      
      return {
        success: true,
        data: tabulations,
        count: tabulations.length
      };
    } catch (error) {
      console.error('Erro ao listar tabulações:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Obter tabulação por ID
  async getById(id) {
    try {
      const collection = this.getCollection();
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
      const collection = this.getCollection();
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
        const validReasons = ['Produto', 'Suporte', 'Bug', 'Elogio', 'Reclamação', ' Oculto '];
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
      const collection = this.getCollection();
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
      const collection = this.getCollection();
      
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

      return {
        success: true,
        data: {
          totalContacts: total,
          positivePercent: parseFloat(positivePercent),
          mostActiveNetwork: mostActiveNetwork,
          sentimentBreakdown: {
            positive,
            negative,
            neutral
          }
        }
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
      const collection = this.getCollection();
      
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

      return {
        success: true,
        data: {
          networkVolume: networkData.map(item => ({ socialNetwork: item._id, count: item.count })),
          reasonFrequency: reasonData.map(item => ({ reason: item._id, count: item.count }))
        }
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
      const collection = this.getCollection();
      
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

      if (result.length === 0 || result[0].count === 0) {
        return {
          success: true,
          data: {
            average: null,
            count: 0,
            total: 0
          }
        };
      }

      return {
        success: true,
        data: {
          average: parseFloat(result[0].average.toFixed(2)),
          count: result[0].count,
          total: result[0].total
        }
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
      const collection = this.getCollection();
      
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
