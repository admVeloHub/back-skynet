/**
 * Script para Atualizar Índices de Texto MongoDB
 * VERSION: v1.0.0 | DATE: 2024-12-19 | AUTHOR: VeloHub Development Team
 * 
 * Este script remove índices existentes e cria novos otimizados
 * baseado na análise de volume de dados.
 */

const { MongoClient } = require('mongodb');

// String de conexão MongoDB
const MONGODB_URI = 'mongodb+srv://lucasgravina:nKQu8bSN6iZl8FPo@velohubcentral.od7vwts.mongodb.net/?retryWrites=true&w=majority&appName=VelohubCentral';

/**
 * Conecta ao MongoDB
 */
const connectToMongo = async () => {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Conectado ao MongoDB');
    return client;
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    throw error;
  }
};

/**
 * Remove índices de texto existentes
 */
const removeExistingTextIndexes = async (db) => {
  console.log('\n🗑️ REMOVENDO ÍNDICES DE TEXTO EXISTENTES...');
  
  try {
    // Remover índice Bot_perguntas
    const botPerguntasCollection = db.collection('Bot_perguntas');
    try {
      await botPerguntasCollection.dropIndex('question_text_context_text');
      console.log('✅ Índice Bot_perguntas removido: question_text_context_text');
    } catch (error) {
      if (error.message.includes('index not found')) {
        console.log('ℹ️ Índice Bot_perguntas não encontrado (já removido)');
      } else {
        console.log('⚠️ Erro ao remover índice Bot_perguntas:', error.message);
      }
    }
    
    // Remover índice Artigos
    const artigosCollection = db.collection('Artigos');
    try {
      await artigosCollection.dropIndex('title_text_content_text');
      console.log('✅ Índice Artigos removido: title_text_content_text');
    } catch (error) {
      if (error.message.includes('index not found')) {
        console.log('ℹ️ Índice Artigos não encontrado (já removido)');
      } else {
        console.log('⚠️ Erro ao remover índice Artigos:', error.message);
      }
    }
    
    console.log('✅ Limpeza de índices concluída');
    
  } catch (error) {
    console.error('❌ Erro ao remover índices existentes:', error.message);
    throw error;
  }
};

/**
 * Cria índice de texto otimizado para Bot_perguntas
 */
const createBotPerguntasIndex = async (db) => {
  console.log('\n🔍 CRIANDO ÍNDICE OTIMIZADO PARA BOT_PERGUNTAS...');
  
  try {
    const collection = db.collection('Bot_perguntas');
    const indexName = 'bot_perguntas_text_index';
    
    // Criar novo índice otimizado
    console.log('🚀 Criando índice otimizado...');
    const result = await collection.createIndex({
      "palavrasChave": "text",
      "pergunta": "text"
    }, {
      name: indexName,
      weights: {
        "palavrasChave": 10,  // Peso maior (equivalente ao peso 2 atual)
        "pergunta": 1         // Peso menor (equivalente ao peso 1 atual)
      },
      default_language: "portuguese",  // Idioma padrão para stemming
      textIndexVersion: 3              // Versão mais recente
    });
    
    console.log('✅ Índice Bot_perguntas criado com sucesso!');
    console.log(`📊 Nome do índice: ${indexName}`);
    console.log('🎯 Campos indexados: palavrasChave (peso 10), pergunta (peso 1)');
    console.log('🌍 Idioma: português');
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao criar índice Bot_perguntas:', error.message);
    throw error;
  }
};

/**
 * Cria índice de texto otimizado para Artigos
 */
const createArtigosIndex = async (db) => {
  console.log('\n🔍 CRIANDO ÍNDICE OTIMIZADO PARA ARTIGOS...');
  
  try {
    const collection = db.collection('Artigos');
    const indexName = 'artigos_text_index';
    
    // Criar novo índice otimizado
    console.log('🚀 Criando índice otimizado...');
    const result = await collection.createIndex({
      "artigo_titulo": "text",
      "artigo_conteudo": "text"
    }, {
      name: indexName,
      weights: {
        "artigo_titulo": 10,    // Peso maior (título é mais relevante)
        "artigo_conteudo": 1    // Peso menor (conteúdo é menos relevante)
      },
      default_language: "portuguese",  // Idioma padrão para stemming
      textIndexVersion: 3              // Versão mais recente
    });
    
    console.log('✅ Índice Artigos criado com sucesso!');
    console.log(`📊 Nome do índice: ${indexName}`);
    console.log('🎯 Campos indexados: artigo_titulo (peso 10), artigo_conteudo (peso 1)');
    console.log('🌍 Idioma: português');
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao criar índice Artigos:', error.message);
    throw error;
  }
};

/**
 * Testa os índices criados
 */
const testIndexes = async (db) => {
  console.log('\n🧪 TESTANDO ÍNDICES CRIADOS...');
  
  try {
    // Teste Bot_perguntas
    console.log('\n📚 Testando índice Bot_perguntas...');
    const botPerguntasCollection = db.collection('Bot_perguntas');
    
    const botPerguntasTest = await botPerguntasCollection.find({
      $text: { $search: "crédito trabalhador" }
    }, {
      score: { $meta: "textScore" }
    })
    .sort({ score: { $meta: "textScore" } })
    .limit(5)
    .toArray();
    
    console.log(`✅ Bot_perguntas: ${botPerguntasTest.length} resultados encontrados`);
    if (botPerguntasTest.length > 0) {
      console.log(`📊 Score mais alto: ${botPerguntasTest[0].score?.toFixed(2)}`);
      console.log(`📝 Primeira pergunta: ${botPerguntasTest[0].pergunta?.substring(0, 50)}...`);
    }
    
    // Teste Artigos
    console.log('\n📄 Testando índice Artigos...');
    const artigosCollection = db.collection('Artigos');
    
    const artigosTest = await artigosCollection.find({
      $text: { $search: "antecipação" }
    }, {
      score: { $meta: "textScore" }
    })
    .sort({ score: { $meta: "textScore" } })
    .limit(5)
    .toArray();
    
    console.log(`✅ Artigos: ${artigosTest.length} resultados encontrados`);
    if (artigosTest.length > 0) {
      console.log(`📊 Score mais alto: ${artigosTest[0].score?.toFixed(2)}`);
      console.log(`📝 Primeiro título: ${artigosTest[0].artigo_titulo?.substring(0, 50)}...`);
    }
    
    return {
      botPerguntas: botPerguntasTest,
      artigos: artigosTest
    };
    
  } catch (error) {
    console.error('❌ Erro ao testar índices:', error.message);
    throw error;
  }
};

/**
 * Lista todos os índices existentes
 */
const listAllIndexes = async (db) => {
  console.log('\n📋 LISTANDO TODOS OS ÍNDICES...');
  
  try {
    // Índices Bot_perguntas
    console.log('\n📚 Índices Bot_perguntas:');
    const botPerguntasIndexes = await db.collection('Bot_perguntas').listIndexes().toArray();
    botPerguntasIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name} - ${JSON.stringify(index.key)}`);
      if (index.weights) {
        console.log(`   Pesos: ${JSON.stringify(index.weights)}`);
      }
      if (index.default_language) {
        console.log(`   Idioma: ${index.default_language}`);
      }
    });
    
    // Índices Artigos
    console.log('\n📄 Índices Artigos:');
    const artigosIndexes = await db.collection('Artigos').listIndexes().toArray();
    artigosIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name} - ${JSON.stringify(index.key)}`);
      if (index.weights) {
        console.log(`   Pesos: ${JSON.stringify(index.weights)}`);
      }
      if (index.default_language) {
        console.log(`   Idioma: ${index.default_language}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar índices:', error.message);
  }
};

/**
 * Função principal de atualização de índices
 */
const updateTextIndexes = async () => {
  console.log('🚀 INICIANDO ATUALIZAÇÃO DE ÍNDICES DE TEXTO...');
  console.log('=' .repeat(60));
  
  let client;
  
  try {
    // Conectar ao MongoDB
    client = await connectToMongo();
    const db = client.db('console_conteudo');
    
    // Listar índices existentes
    await listAllIndexes(db);
    
    // Remover índices existentes
    await removeExistingTextIndexes(db);
    
    // Criar índice para Bot_perguntas
    await createBotPerguntasIndex(db);
    
    // Criar índice para Artigos
    await createArtigosIndex(db);
    
    // Testar índices criados
    const testResults = await testIndexes(db);
    
    // Listar índices após criação
    await listAllIndexes(db);
    
    // Resumo final
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 ATUALIZAÇÃO DE ÍNDICES CONCLUÍDA COM SUCESSO!');
    console.log('=' .repeat(60));
    console.log('✅ Bot_perguntas: Índice de texto otimizado criado');
    console.log('✅ Artigos: Índice de texto otimizado criado');
    console.log('✅ Testes de funcionamento: OK');
    console.log('✅ Idioma configurado: Português');
    console.log('✅ Pesos otimizados baseados na análise');
    
    console.log('\n🚀 PRÓXIMOS PASSOS:');
    console.log('1. Implementar filtro com $text search');
    console.log('2. Criar função de fallback híbrida');
    console.log('3. Testar performance');
    console.log('4. Monitorar resultados');
    
    return {
      success: true,
      botPerguntasIndex: 'bot_perguntas_text_index',
      artigosIndex: 'artigos_text_index',
      testResults
    };
    
  } catch (error) {
    console.error('❌ Erro na atualização de índices:', error.message);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('\n✅ Conexão MongoDB fechada');
    }
  }
};

// Executar atualização se script for chamado diretamente
if (require.main === module) {
  updateTextIndexes()
    .then((result) => {
      console.log('\n🎉 Índices atualizados com sucesso!');
      console.log('📊 Resultado:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro na atualização de índices:', error.message);
      process.exit(1);
    });
}

module.exports = {
  updateTextIndexes,
  removeExistingTextIndexes,
  createBotPerguntasIndex,
  createArtigosIndex,
  testIndexes
};
