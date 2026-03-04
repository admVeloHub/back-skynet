/**
 * Script mongosh para correção de datas (createdAt/updatedAt)
 * 
 * OBJETIVO: Documentos com createdAt > 03/03/2026 → alterar para 03/03/2026
 * 
 * USO no mongosh:
 *   mongosh "mongodb+srv://user:pass@cluster.mongodb.net" --file fix-createdAt-dates.mongosh.js
 * 
 * Ou copie e cole no mongosh conectado.
 */

const DATA_LIMITE = new Date('2026-03-03T00:00:00.000Z');
const DATA_CORRIGIDA = new Date('2026-03-03T00:00:00.000Z');

// EXCLUSIVO: sociais_metricas (LISTA_SCHEMAS.rb linha 471). Não usar em outras collections.
const colecoes = [
  { db: 'console_sociais', coll: 'sociais_metricas', primary: 'createdAt', secondary: 'updatedAt' },
];

let totalFound = 0;
let totalModified = 0;

// db = database atual do mongosh (ex: test). Usamos getSiblingDB para acessar outros DBs.
colecoes.forEach(({ db: dbName, coll, primary, secondary }) => {
  const database = db.getSiblingDB(dbName);
  if (!database.getCollectionNames().includes(coll)) return;

  const col = database.getCollection(coll);
  const query = { [primary]: { $gt: DATA_LIMITE } };
  const count = col.countDocuments(query);

  if (count > 0) {
    const update = { $set: { [primary]: DATA_CORRIGIDA } };
    if (secondary) update.$set[secondary] = DATA_CORRIGIDA;

    const result = col.updateMany(query, update);
    totalFound += count;
    totalModified += result.modifiedCount;
    print(`${dbName}.${coll}: ${count} encontrados, ${result.modifiedCount} modificados`);
  }
});

print('---');
print(`Total: ${totalFound} encontrados, ${totalModified} modificados`);
