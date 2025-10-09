/**
 * Script para testar índices existentes com campos corretos
 * VERSION: v1.0.0 | DATE: 2024-12-19 | AUTHOR: VeloHub Development Team
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://lucasgravina:nKQu8bSN6iZl8FPo@velohubcentral.od7vwts.mongodb.net/?retryWrites=true&w=majority&appName=VelohubCentral';

const testExistingIndexes = async () => {
  let client;
  
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('console_conteudo');
    
    console.log('🧪 TESTANDO ÍNDICES EXISTENTES COM CAMPOS CORRETOS...\n');
    
    // Verificar estrutura dos dados
    console.log('📋 VERIFICANDO ESTRUTURA DOS DADOS...\n');
    
    // Bot_perguntas - verificar campos disponíveis
    const botSample = await db.collection('Bot_perguntas').findOne({});
    console.log('📚 Bot_perguntas - Campos disponíveis:');
    console.log('   Campos:', Object.keys(botSample || {}));
    if (botSample) {
      console.log('   question:', botSample.question ? '✅' : '❌');
      console.log('   context:', botSample.context ? '✅' : '❌');
      console.log('   pergunta:', botSample.pergunta ? '✅' : '❌');
      console.log('   palavrasChave:', botSample.palavrasChave ? '✅' : '❌');
    }
    
    // Artigos - verificar campos disponíveis
    const artSample = await db.collection('Artigos').findOne({});
    console.log('\n📄 Artigos - Campos disponíveis:');
    console.log('   Campos:', Object.keys(artSample || {}));
    if (artSample) {
      console.log('   title:', artSample.title ? '✅' : '❌');
      console.log('   content:', artSample.content ? '✅' : '❌');
      console.log('   artigo_titulo:', artSample.artigo_titulo ? '✅' : '❌');
      console.log('   artigo_conteudo:', artSample.artigo_conteudo ? '✅' : '❌');
    }
    
    // Testar com campos que existem nos índices
    console.log('\n🔍 TESTANDO COM CAMPOS INDEXADOS...\n');
    
    // Se existem campos question/context, testar
    if (botSample && (botSample.question || botSample.context)) {
      console.log('📚 Testando Bot_perguntas com campos indexados:');
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
        console.log(`   ${i+1}. Score: ${doc.score?.toFixed(2)}`);
        if (doc.question) console.log(`       Question: ${doc.question.substring(0, 50)}...`);
        if (doc.context) console.log(`       Context: ${doc.context.substring(0, 50)}...`);
        if (doc.pergunta) console.log(`       Pergunta: ${doc.pergunta.substring(0, 50)}...`);
      });
    }
    
    // Se existem campos title/content, testar
    if (artSample && (artSample.title || artSample.content)) {
      console.log('\n📄 Testando Artigos com campos indexados:');
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
        console.log(`   ${i+1}. Score: ${doc.score?.toFixed(2)}`);
        if (doc.title) console.log(`       Title: ${doc.title.substring(0, 50)}...`);
        if (doc.content) console.log(`       Content: ${doc.content.substring(0, 50)}...`);
        if (doc.artigo_titulo) console.log(`       Artigo Titulo: ${doc.artigo_titulo.substring(0, 50)}...`);
      });
    }
    
    console.log('\n💡 RECOMENDAÇÃO:');
    console.log('Se os campos indexados (question/context, title/content) não existem,');
    console.log('precisamos criar novos índices para os campos que realmente existem.');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (client) await client.close();
  }
};

testExistingIndexes();
