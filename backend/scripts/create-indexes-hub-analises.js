// VERSION: v1.0.0 | DATE: 2025-02-09 | AUTHOR: VeloHub Development Team
// Script para criar índices MongoDB otimizados para o módulo Hub Analises
// Executar: node scripts/create-indexes-hub-analises.js

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://lucasgravina:nKQu8bSN6iZl8FPo@velohubcentral.od7vwts.mongodb.net/?retryWrites=true&w=majority&appName=VelohubCentral';
const DB_NAME = 'console_conteudo';

async function createIndexes() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado ao MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Índices para hub_sessions
    console.log('\n📊 Criando índices para hub_sessions...');
    
    const hubSessionsCollection = db.collection('hub_sessions');
    
    // Índice composto para isActive + colaboradorNome (otimiza usuarios-online-offline)
    await hubSessionsCollection.createIndex(
      { isActive: 1, colaboradorNome: 1 },
      { name: 'idx_active_colaborador' }
    );
    console.log('  ✅ Índice criado: isActive + colaboradorNome');
    
    // Índice para createdAt (otimiza ordenação e paginação)
    await hubSessionsCollection.createIndex(
      { createdAt: -1 },
      { name: 'idx_created_at_desc' }
    );
    console.log('  ✅ Índice criado: createdAt (desc)');
    
    // Índice para userEmail (otimiza busca por usuário)
    await hubSessionsCollection.createIndex(
      { userEmail: 1 },
      { name: 'idx_user_email' }
    );
    console.log('  ✅ Índice criado: userEmail');
    
    // Índice para loginTimestamp (otimiza ordenação de sessões ativas)
    await hubSessionsCollection.createIndex(
      { loginTimestamp: -1 },
      { name: 'idx_login_timestamp_desc' }
    );
    console.log('  ✅ Índice criado: loginTimestamp (desc)');
    
    // Índices para velonews_acknowledgments
    console.log('\n📊 Criando índices para velonews_acknowledgments...');
    
    const acknowledgmentsCollection = db.collection('velonews_acknowledgments');
    
    // Índice composto para newsId + acknowledgedAt (otimiza ciencia-por-noticia)
    await acknowledgmentsCollection.createIndex(
      { newsId: 1, acknowledgedAt: -1 },
      { name: 'idx_news_acknowledged' }
    );
    console.log('  ✅ Índice criado: newsId + acknowledgedAt');
    
    // Índice para userEmail (otimiza busca por usuário)
    await acknowledgmentsCollection.createIndex(
      { userEmail: 1 },
      { name: 'idx_user_email_ack' }
    );
    console.log('  ✅ Índice criado: userEmail');
    
    // Índice para acknowledgedAt (otimiza ordenação)
    await acknowledgmentsCollection.createIndex(
      { acknowledgedAt: -1 },
      { name: 'idx_acknowledged_at_desc' }
    );
    console.log('  ✅ Índice criado: acknowledgedAt (desc)');
    
    console.log('\n✅ Todos os índices foram criados com sucesso!');
    console.log('\n📋 Resumo dos índices criados:');
    console.log('   hub_sessions:');
    console.log('     - isActive + colaboradorNome');
    console.log('     - createdAt (desc)');
    console.log('     - userEmail');
    console.log('     - loginTimestamp (desc)');
    console.log('   velonews_acknowledgments:');
    console.log('     - newsId + acknowledgedAt');
    console.log('     - userEmail');
    console.log('     - acknowledgedAt (desc)');
    
  } catch (error) {
    console.error('❌ Erro ao criar índices:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Conexão fechada');
  }
}

// Executar
createIndexes().catch(console.error);
