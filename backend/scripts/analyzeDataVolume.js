/**
 * Script de Análise de Volume de Dados MongoDB
 * VERSION: v1.0.0 | DATE: 2024-12-19 | AUTHOR: VeloHub Development Team
 * 
 * Este script analisa o volume e qualidade dos dados nas coleções
 * Bot_perguntas e Artigos para implementação de índices otimizados.
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
 * Analisa volume de dados do Bot_perguntas
 */
const analyzeBotPerguntas = async (db) => {
  console.log('\n🔍 ANALISANDO BOT_PERGUNTAS...');
  
  try {
    const collection = db.collection('Bot_perguntas');
    
    // 1. Contagem total de documentos
    const totalDocs = await collection.countDocuments();
    console.log(`📊 Total de documentos: ${totalDocs}`);
    
    // 2. Análise de campos preenchidos
    const fieldAnalysis = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalDocs: { $sum: 1 },
          withPalavrasChave: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $ne: ["$palavrasChave", null] },
                  { $ne: ["$palavrasChave", ""] }
                ]}, 1, 0] 
            } 
          },
          withSinonimos: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $ne: ["$sinonimos", null] },
                  { $ne: ["$sinonimos", ""] }
                ]}, 1, 0] 
            } 
          },
          withPergunta: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $ne: ["$pergunta", null] },
                  { $ne: ["$pergunta", ""] }
                ]}, 1, 0] 
            } 
          },
          withResposta: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $ne: ["$resposta", null] },
                  { $ne: ["$resposta", ""] }
                ]}, 1, 0] 
            } 
          }
        }
      }
    ]).toArray();
    
    const analysis = fieldAnalysis[0];
    console.log(`📝 Com palavrasChave: ${analysis.withPalavrasChave}/${totalDocs} (${((analysis.withPalavrasChave/totalDocs)*100).toFixed(1)}%)`);
    console.log(`📝 Com sinonimos: ${analysis.withSinonimos}/${totalDocs} (${((analysis.withSinonimos/totalDocs)*100).toFixed(1)}%)`);
    console.log(`📝 Com pergunta: ${analysis.withPergunta}/${totalDocs} (${((analysis.withPergunta/totalDocs)*100).toFixed(1)}%)`);
    console.log(`📝 Com resposta: ${analysis.withResposta}/${totalDocs} (${((analysis.withResposta/totalDocs)*100).toFixed(1)}%)`);
    
    // 3. Análise de tamanho dos campos
    const sizeAnalysis = await collection.aggregate([
      {
        $project: {
          palavrasChaveLength: { 
            $strLenCP: { $ifNull: ["$palavrasChave", ""] } 
          },
          sinonimosLength: { 
            $strLenCP: { $ifNull: ["$sinonimos", ""] } 
          },
          perguntaLength: { 
            $strLenCP: { $ifNull: ["$pergunta", ""] } 
          },
          respostaLength: { 
            $strLenCP: { $ifNull: ["$resposta", ""] } 
          }
        }
      },
      {
        $group: {
          _id: null,
          avgPalavrasChave: { $avg: "$palavrasChaveLength" },
          avgSinonimos: { $avg: "$sinonimosLength" },
          avgPergunta: { $avg: "$perguntaLength" },
          avgResposta: { $avg: "$respostaLength" },
          maxPalavrasChave: { $max: "$palavrasChaveLength" },
          maxSinonimos: { $max: "$sinonimosLength" },
          maxPergunta: { $max: "$perguntaLength" },
          maxResposta: { $max: "$respostaLength" }
        }
      }
    ]).toArray();
    
    const sizes = sizeAnalysis[0];
    console.log(`📏 Tamanho médio palavrasChave: ${sizes.avgPalavrasChave.toFixed(1)} chars (max: ${sizes.maxPalavrasChave})`);
    console.log(`📏 Tamanho médio sinonimos: ${sizes.avgSinonimos.toFixed(1)} chars (max: ${sizes.maxSinonimos})`);
    console.log(`📏 Tamanho médio pergunta: ${sizes.avgPergunta.toFixed(1)} chars (max: ${sizes.maxPergunta})`);
    console.log(`📏 Tamanho médio resposta: ${sizes.avgResposta.toFixed(1)} chars (max: ${sizes.maxResposta})`);
    
    // 4. Análise de tipos de dados
    const typeAnalysis = await collection.aggregate([
      {
        $group: {
          _id: null,
          palavrasChaveString: { 
            $sum: { $cond: [{ $eq: [{ $type: "$palavrasChave" }, "string"] }, 1, 0] } 
          },
          palavrasChaveArray: { 
            $sum: { $cond: [{ $eq: [{ $type: "$palavrasChave" }, "array"] }, 1, 0] } 
          },
          sinonimosString: { 
            $sum: { $cond: [{ $eq: [{ $type: "$sinonimos" }, "string"] }, 1, 0] } 
          },
          sinonimosArray: { 
            $sum: { $cond: [{ $eq: [{ $type: "$sinonimos" }, "array"] }, 1, 0] } 
          }
        }
      }
    ]).toArray();
    
    const types = typeAnalysis[0];
    console.log(`🔢 palavrasChave como String: ${types.palavrasChaveString}, Array: ${types.palavrasChaveArray}`);
    console.log(`🔢 sinonimos como String: ${types.sinonimosString}, Array: ${types.sinonimosArray}`);
    
    // 5. Amostra de dados para análise
    const sample = await collection.find({}).limit(3).toArray();
    console.log('\n📋 AMOSTRA DE DADOS:');
    sample.forEach((doc, index) => {
      console.log(`\n--- Documento ${index + 1} ---`);
      console.log(`Pergunta: ${doc.pergunta?.substring(0, 100)}...`);
      console.log(`PalavrasChave: ${doc.palavrasChave?.substring(0, 50)}...`);
      console.log(`Sinonimos: ${doc.sinonimos?.substring(0, 50)}...`);
      console.log(`Tipo palavrasChave: ${typeof doc.palavrasChave}`);
      console.log(`Tipo sinonimos: ${typeof doc.sinonimos}`);
    });
    
    return {
      totalDocs,
      fieldAnalysis: analysis,
      sizeAnalysis: sizes,
      typeAnalysis: types,
      sample
    };
    
  } catch (error) {
    console.error('❌ Erro ao analisar Bot_perguntas:', error.message);
    throw error;
  }
};

/**
 * Analisa volume de dados dos Artigos
 */
const analyzeArtigos = async (db) => {
  console.log('\n🔍 ANALISANDO ARTIGOS...');
  
  try {
    const collection = db.collection('Artigos');
    
    // 1. Contagem total de documentos
    const totalDocs = await collection.countDocuments();
    console.log(`📊 Total de documentos: ${totalDocs}`);
    
    // 2. Análise de campos preenchidos
    const fieldAnalysis = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalDocs: { $sum: 1 },
          withTitulo: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $ne: ["$artigo_titulo", null] },
                  { $ne: ["$artigo_titulo", ""] }
                ]}, 1, 0] 
            } 
          },
          withConteudo: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $ne: ["$artigo_conteudo", null] },
                  { $ne: ["$artigo_conteudo", ""] }
                ]}, 1, 0] 
            } 
          },
          withTag: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $ne: ["$tag", null] },
                  { $ne: ["$tag", ""] }
                ]}, 1, 0] 
            } 
          }
        }
      }
    ]).toArray();
    
    const analysis = fieldAnalysis[0];
    console.log(`📝 Com titulo: ${analysis.withTitulo}/${totalDocs} (${((analysis.withTitulo/totalDocs)*100).toFixed(1)}%)`);
    console.log(`📝 Com conteudo: ${analysis.withConteudo}/${totalDocs} (${((analysis.withConteudo/totalDocs)*100).toFixed(1)}%)`);
    console.log(`📝 Com tag: ${analysis.withTag}/${totalDocs} (${((analysis.withTag/totalDocs)*100).toFixed(1)}%)`);
    
    // 3. Análise de tamanho dos campos
    const sizeAnalysis = await collection.aggregate([
      {
        $project: {
          tituloLength: { 
            $strLenCP: { $ifNull: ["$artigo_titulo", ""] } 
          },
          conteudoLength: { 
            $strLenCP: { $ifNull: ["$artigo_conteudo", ""] } 
          }
        }
      },
      {
        $group: {
          _id: null,
          avgTitulo: { $avg: "$tituloLength" },
          avgConteudo: { $avg: "$conteudoLength" },
          maxTitulo: { $max: "$tituloLength" },
          maxConteudo: { $max: "$conteudoLength" }
        }
      }
    ]).toArray();
    
    const sizes = sizeAnalysis[0];
    console.log(`📏 Tamanho médio titulo: ${sizes.avgTitulo.toFixed(1)} chars (max: ${sizes.maxTitulo})`);
    console.log(`📏 Tamanho médio conteudo: ${sizes.avgConteudo.toFixed(1)} chars (max: ${sizes.maxConteudo})`);
    
    // 4. Análise de categorias
    const categoryAnalysis = await collection.aggregate([
      {
        $group: {
          _id: "$categoria_titulo",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray();
    
    console.log('\n📂 TOP 10 CATEGORIAS:');
    categoryAnalysis.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat._id || 'Sem categoria'}: ${cat.count} artigos`);
    });
    
    // 5. Amostra de dados para análise
    const sample = await collection.find({}).limit(3).toArray();
    console.log('\n📋 AMOSTRA DE DADOS:');
    sample.forEach((doc, index) => {
      console.log(`\n--- Artigo ${index + 1} ---`);
      console.log(`Titulo: ${doc.artigo_titulo?.substring(0, 100)}...`);
      console.log(`Conteudo: ${doc.artigo_conteudo?.substring(0, 150)}...`);
      console.log(`Categoria: ${doc.categoria_titulo}`);
      console.log(`Tag: ${doc.tag}`);
    });
    
    return {
      totalDocs,
      fieldAnalysis: analysis,
      sizeAnalysis: sizes,
      categoryAnalysis,
      sample
    };
    
  } catch (error) {
    console.error('❌ Erro ao analisar Artigos:', error.message);
    throw error;
  }
};

/**
 * Função principal de análise
 */
const analyzeDataVolume = async () => {
  console.log('🚀 INICIANDO ANÁLISE DE VOLUME DE DADOS...');
  console.log('=' .repeat(60));
  
  let client;
  
  try {
    // Conectar ao MongoDB
    client = await connectToMongo();
    const db = client.db('console_conteudo');
    
    // Analisar Bot_perguntas
    const botPerguntasAnalysis = await analyzeBotPerguntas(db);
    
    // Analisar Artigos
    const artigosAnalysis = await analyzeArtigos(db);
    
    // Resumo final
    console.log('\n' + '=' .repeat(60));
    console.log('📊 RESUMO FINAL:');
    console.log('=' .repeat(60));
    console.log(`📚 Bot_perguntas: ${botPerguntasAnalysis.totalDocs} documentos`);
    console.log(`📄 Artigos: ${artigosAnalysis.totalDocs} documentos`);
    console.log(`📈 Total: ${botPerguntasAnalysis.totalDocs + artigosAnalysis.totalDocs} documentos`);
    
    // Recomendações para índices
    console.log('\n🎯 RECOMENDAÇÕES PARA ÍNDICES:');
    console.log('=' .repeat(60));
    
    if (botPerguntasAnalysis.totalDocs > 0) {
      console.log('✅ Bot_perguntas: Pronto para índices de texto');
      console.log(`   - ${botPerguntasAnalysis.fieldAnalysis.withPalavrasChave} documentos com palavrasChave`);
      console.log(`   - ${botPerguntasAnalysis.fieldAnalysis.withSinonimos} documentos com sinonimos`);
      console.log(`   - Tamanho médio: ${botPerguntasAnalysis.sizeAnalysis.avgPalavrasChave.toFixed(1)} chars`);
    }
    
    if (artigosAnalysis.totalDocs > 0) {
      console.log('✅ Artigos: Pronto para índices de texto');
      console.log(`   - ${artigosAnalysis.fieldAnalysis.withTitulo} documentos com titulo`);
      console.log(`   - ${artigosAnalysis.fieldAnalysis.withConteudo} documentos com conteudo`);
      console.log(`   - Tamanho médio: ${artigosAnalysis.sizeAnalysis.avgTitulo.toFixed(1)} chars`);
    }
    
    console.log('\n🚀 PRÓXIMOS PASSOS:');
    console.log('1. Executar script de criação de índices');
    console.log('2. Implementar filtro com $text search');
    console.log('3. Testar performance');
    console.log('4. Monitorar resultados');
    
  } catch (error) {
    console.error('❌ Erro na análise:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n✅ Conexão MongoDB fechada');
    }
  }
};

// Executar análise se script for chamado diretamente
if (require.main === module) {
  analyzeDataVolume()
    .then(() => {
      console.log('\n🎉 Análise concluída com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro na análise:', error.message);
      process.exit(1);
    });
}

module.exports = {
  analyzeDataVolume,
  analyzeBotPerguntas,
  analyzeArtigos
};
