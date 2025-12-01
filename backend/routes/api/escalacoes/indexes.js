/**
 * VeloHub V3 - Escalações MongoDB Indexes
 * VERSION: v1.0.0 | DATE: 2025-01-31 | AUTHOR: VeloHub Development Team
 * Branch: escalacoes
 * 
 * Função para criar índices MongoDB para otimização de performance
 * no módulo Escalações
 */

/**
 * Criar índices MongoDB para o módulo Escalações
 * @param {Object} client - MongoDB client
 * @param {Function} connectToMongo - Função para conectar ao MongoDB
 * @returns {Promise<void>}
 */
async function createEscalacoesIndexes(client, connectToMongo) {
  if (!client) {
    console.log('[INDEXES] MongoDB client não configurado - pulando criação de índices');
    return;
  }

  try {
    await connectToMongo();
    const db = client.db('hub_escalacoes');

    // Collection: solicitacoes_tecnicas
    const solicitacoesCollection = db.collection('solicitacoes_tecnicas');
    
    console.log('[INDEXES] Criando índices para solicitacoes_tecnicas...');
    
    await solicitacoesCollection.createIndex({ cpf: 1 }, { background: true, name: 'idx_cpf' });
    await solicitacoesCollection.createIndex({ colaboradorNome: 1 }, { background: true, name: 'idx_colaboradorNome' });
    await solicitacoesCollection.createIndex({ status: 1, createdAt: -1 }, { background: true, name: 'idx_status_createdAt' });
    await solicitacoesCollection.createIndex({ createdAt: -1 }, { background: true, name: 'idx_createdAt' });
    await solicitacoesCollection.createIndex({ waMessageId: 1 }, { background: true, name: 'idx_waMessageId' });
    
    console.log('[INDEXES] Índices de solicitacoes_tecnicas criados com sucesso');

    // Collection: erros_bugs
    const errosBugsCollection = db.collection('erros_bugs');
    
    console.log('[INDEXES] Criando índices para erros_bugs...');
    
    await errosBugsCollection.createIndex({ cpf: 1 }, { background: true, name: 'idx_cpf' });
    await errosBugsCollection.createIndex({ colaboradorNome: 1 }, { background: true, name: 'idx_colaboradorNome' });
    await errosBugsCollection.createIndex({ status: 1, createdAt: -1 }, { background: true, name: 'idx_status_createdAt' });
    await errosBugsCollection.createIndex({ tipo: 1, createdAt: -1 }, { background: true, name: 'idx_tipo_createdAt' });
    await errosBugsCollection.createIndex({ createdAt: -1 }, { background: true, name: 'idx_createdAt' });
    await errosBugsCollection.createIndex({ waMessageId: 1 }, { background: true, name: 'idx_waMessageId' });
    
    console.log('[INDEXES] Índices de erros_bugs criados com sucesso');

    // Collection: logs_uso
    const logsCollection = db.collection('logs_uso');
    
    console.log('[INDEXES] Criando índices para logs_uso...');
    
    await logsCollection.createIndex({ userEmail: 1, createdAt: -1 }, { background: true, name: 'idx_userEmail_createdAt' });
    await logsCollection.createIndex({ createdAt: -1 }, { background: true, name: 'idx_createdAt' });
    
    console.log('[INDEXES] Índices de logs_uso criados com sucesso');
    
    console.log('[INDEXES] Todos os índices do módulo Escalações foram criados com sucesso!');
  } catch (error) {
    console.error('[INDEXES] Erro ao criar índices:', error);
    // Não lançar erro para não bloquear inicialização do servidor
  }
}

module.exports = createEscalacoesIndexes;

