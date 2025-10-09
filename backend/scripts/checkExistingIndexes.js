/**
 * Script para verificar índices existentes
 * VERSION: v1.0.0 | DATE: 2024-12-19 | AUTHOR: VeloHub Development Team
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://lucasgravina:nKQu8bSN6iZl8FPo@velohubcentral.od7vwts.mongodb.net/?retryWrites=true&w=majority&appName=VelohubCentral';

const checkExistingIndexes = async () => {
  let client;
  
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('console_conteudo');
    
    console.log('🔍 VERIFICANDO ÍNDICES EXISTENTES...\n');
    
    // Bot_perguntas
    console.log('📚 ÍNDICES BOT_PERGUNTAS:');
    const botIndexes = await db.collection('Bot_perguntas').listIndexes().toArray();
    botIndexes.forEach((idx, i) => {
      console.log(`${i+1}. ${idx.name}`);
      console.log(`   Campos: ${JSON.stringify(idx.key)}`);
      if (idx.weights) console.log(`   Pesos: ${JSON.stringify(idx.weights)}`);
      if (idx.default_language) console.log(`   Idioma: ${idx.default_language}`);
      console.log('');
    });
    
    // Artigos
    console.log('📄 ÍNDICES ARTIGOS:');
    const artIndexes = await db.collection('Artigos').listIndexes().toArray();
    artIndexes.forEach((idx, i) => {
      console.log(`${i+1}. ${idx.name}`);
      console.log(`   Campos: ${JSON.stringify(idx.key)}`);
      if (idx.weights) console.log(`   Pesos: ${JSON.stringify(idx.weights)}`);
      if (idx.default_language) console.log(`   Idioma: ${idx.default_language}`);
      console.log('');
    });
    
    // Testar os índices existentes
    console.log('🧪 TESTANDO ÍNDICES EXISTENTES...\n');
    
    // Teste Bot_perguntas
    console.log('📚 Testando Bot_perguntas com "crédito":');
    const botTest = await db.collection('Bot_perguntas').find({
      $text: { $search: "crédito" }
    }, {
      score: { $meta: "textScore" }
    })
    .sort({ score: { $meta: "textScore" } })
    .limit(3)
    .toArray();
    
    console.log(`   Resultados: ${botTest.length}`);
    botTest.forEach((doc, i) => {
      console.log(`   ${i+1}. Score: ${doc.score?.toFixed(2)} - ${doc.pergunta?.substring(0, 50)}...`);
    });
    
    // Teste Artigos
    console.log('\n📄 Testando Artigos com "antecipação":');
    const artTest = await db.collection('Artigos').find({
      $text: { $search: "antecipação" }
    }, {
      score: { $meta: "textScore" }
    })
    .sort({ score: { $meta: "textScore" } })
    .limit(3)
    .toArray();
    
    console.log(`   Resultados: ${artTest.length}`);
    artTest.forEach((doc, i) => {
      console.log(`   ${i+1}. Score: ${doc.score?.toFixed(2)} - ${doc.artigo_titulo?.substring(0, 50)}...`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (client) await client.close();
  }
};

checkExistingIndexes();
