/**
 * Script para correção de datas (createdAt/updatedAt) inseridas incorretamente
 * 
 * OBJETIVO: Reconhecer todos os documentos com createdAt posterior a 03/03/2026
 * e modificar para essa data (03/03/2026 00:00:00 UTC).
 * 
 * Baseado nos schemas de front/LISTA_SCHEMAS.rb (linha 471 - createdAt: Date)
 * 
 * USO: node backend/scripts/fix-createdAt-dates.js
 * 
 * Modo DRY-RUN (apenas simula): DRY_RUN=1 node backend/scripts/fix-createdAt-dates.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { MongoClient } = require('mongodb');
const { getMongoUri } = require('../config/mongodb');

// Data limite: 03/03/2026 00:00:00 UTC
const DATA_LIMITE = new Date('2026-03-03T00:00:00.000Z');
const DATA_CORRIGIDA = new Date('2026-03-03T00:00:00.000Z');

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

/**
 * Coleção EXCLUSIVA: sociais_metricas (conforme LISTA_SCHEMAS.rb linha 471)
 * O schema indicado refere-se EXCLUSIVAMENTE a sociais_metricas.
 * Não deve ser usado em nenhum registro além desta collection.
 */
const COLECOES_COM_DATAS = [
  { db: 'console_sociais', coll: 'sociais_metricas', fields: ['createdAt', 'updatedAt'] },
];

async function corrigirColecao(client, { db, coll, fields }) {
  const database = client.db(db);
  const collection = database.collection(coll);

  // Verificar se a coleção existe
  const collections = await database.listCollections({ name: coll }).toArray();
  if (collections.length === 0) {
    return { found: 0, modified: 0, skipped: true, reason: 'coleção não existe' };
  }

  const primaryField = fields[0]; // createdAt ou salaCreatedAt
  const secondaryField = fields[1]; // updatedAt ou salaUpdatedAt

  // Buscar documentos com primaryField > 03/03/2026
  const query = { [primaryField]: { $gt: DATA_LIMITE } };
  const docs = await collection.find(query).toArray();
  const found = docs.length;

  if (found === 0) {
    return { found: 0, modified: 0 };
  }

  let modified = 0;
  if (!DRY_RUN) {
    const updateDoc = {
      $set: {
        [primaryField]: DATA_CORRIGIDA,
        ...(secondaryField ? { [secondaryField]: DATA_CORRIGIDA } : {}),
      },
    };
    const result = await collection.updateMany(query, updateDoc);
    modified = result.modifiedCount;
  } else {
    modified = found; // em dry-run, consideramos que seriam modificados
  }

  return { found, modified };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Correção de datas createdAt/updatedAt no MongoDB');
  console.log('  Data alvo: 03/03/2026 00:00:00 UTC');
  console.log('  Critério: documentos com createdAt > 03/03/2026');
  console.log('═══════════════════════════════════════════════════════════');
  if (DRY_RUN) {
    console.log('  ⚠️  MODO DRY-RUN: Nenhuma alteração será aplicada');
    console.log('═══════════════════════════════════════════════════════════');
  }

  let client;
  try {
    const MONGODB_URI = getMongoUri();
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Conectado ao MongoDB\n');

    let totalFound = 0;
    let totalModified = 0;

    for (const config of COLECOES_COM_DATAS) {
      const key = `${config.db}.${config.coll}`;
      try {
        const { found, modified, skipped, reason } = await corrigirColecao(client, config);
        if (skipped) {
          console.log(`  ${key}: ${reason}`);
        } else if (found > 0) {
          totalFound += found;
          totalModified += modified;
          const action = DRY_RUN ? '(seriam modificados)' : 'modificados';
          console.log(`  ${key}: ${found} encontrados, ${modified} ${action}`);
        }
      } catch (err) {
        console.error(`  ${key}: ERRO - ${err.message}`);
      }
    }

    console.log('\n───────────────────────────────────────────────────────────');
    console.log(`  Total: ${totalFound} documentos encontrados`);
    console.log(`  Total: ${totalModified} documentos ${DRY_RUN ? '(seriam)' : ''} modificados`);
    console.log('───────────────────────────────────────────────────────────');
    if (DRY_RUN && totalFound > 0) {
      console.log('\n  Para aplicar as alterações, execute sem DRY_RUN:');
      console.log('  node backend/scripts/fix-createdAt-dates.js');
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n✅ Conexão encerrada.');
    }
  }
}

main();
