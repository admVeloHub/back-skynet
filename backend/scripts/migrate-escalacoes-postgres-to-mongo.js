/**
 * Script de Migração PostgreSQL → MongoDB - Módulo Escalações
 * VERSION: v1.0.0 | DATE: 2025-01-31 | AUTHOR: VeloHub Development Team
 * Branch: escalacoes
 * 
 * Migra dados do PostgreSQL (Prisma) para MongoDB
 * 
 * Uso:
 *   node backend/scripts/migrate-escalacoes-postgres-to-mongo.js [--dry-run]
 * 
 * Requer variáveis de ambiente:
 *   - DATABASE_URL (PostgreSQL)
 *   - MONGO_ENV (MongoDB)
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const { PrismaClient } = require('@prisma/client');

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Validar CPF (11 dígitos)
 */
function isValidCpf(cpf) {
  const digits = String(cpf || '').replace(/\D/g, '');
  return digits.length === 11;
}

/**
 * Validar status
 */
function isValidStatus(status) {
  const validStatuses = ['em aberto', 'enviado', 'feito', 'não feito', 'pendente'];
  return validStatuses.includes(String(status).toLowerCase());
}

/**
 * Migrar Request (PostgreSQL) → solicitacoes_tecnicas (MongoDB)
 */
async function migrateRequests(prisma, mongoDb, stats) {
  console.log('\n📦 Migrando Requests → solicitacoes_tecnicas...');
  
  const collection = mongoDb.collection('solicitacoes_tecnicas');
  const requests = await prisma.request.findMany({
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`   Encontrados ${requests.length} registros no PostgreSQL`);
  
  let migrated = 0;
  let ignored = 0;
  let errors = 0;
  
  for (const request of requests) {
    try {
      // Validar CPF
      if (!isValidCpf(request.cpf)) {
        console.warn(`   ⚠️ CPF inválido (${request.cpf}) - ignorando ID ${request.id}`);
        ignored++;
        continue;
      }
      
      // Validar status
      if (!isValidStatus(request.status)) {
        console.warn(`   ⚠️ Status inválido (${request.status}) - usando 'em aberto'`);
      }
      
      // Verificar duplicata (cpf + tipo + createdAt com tolerância de 1 segundo)
      const cpfDigits = String(request.cpf).replace(/\D/g, '');
      const createdAt = new Date(request.createdAt);
      const createdAtMin = new Date(createdAt.getTime() - 1000);
      const createdAtMax = new Date(createdAt.getTime() + 1000);
      
      const duplicate = await collection.findOne({
        cpf: cpfDigits,
        tipo: request.tipo,
        createdAt: {
          $gte: createdAtMin,
          $lte: createdAtMax
        }
      });
      
      if (duplicate) {
        console.log(`   ⏭️ Duplicata encontrada (ID ${request.id}) - ignorando`);
        ignored++;
        continue;
      }
      
      // Preparar documento MongoDB
      const colaboradorNome = String(request.agente || '').trim();
      const payload = typeof request.payload === 'object' ? request.payload : {};
      
      // Garantir que payload tenha agente dentro
      const payloadCompleto = {
        agente: colaboradorNome,
        ...payload
      };
      
      const documento = {
        colaboradorNome: colaboradorNome,
        cpf: cpfDigits,
        tipo: String(request.tipo || '').trim(),
        payload: payloadCompleto,
        status: isValidStatus(request.status) ? String(request.status).toLowerCase() : 'em aberto',
        agentContact: request.agentContact || null,
        waMessageId: request.waMessageId || null,
        respondedAt: request.respondedAt ? new Date(request.respondedAt) : null,
        respondedBy: request.respondedBy || null,
        createdAt: createdAt,
        updatedAt: createdAt
      };
      
      if (!DRY_RUN) {
        await collection.insertOne(documento);
        migrated++;
        if (migrated % 10 === 0) {
          process.stdout.write(`   Migrados: ${migrated}...\r`);
        }
      } else {
        migrated++;
        console.log(`   [DRY-RUN] Migraria: ${request.id} → CPF ${cpfDigits}, Tipo: ${request.tipo}`);
      }
    } catch (error) {
      console.error(`   ❌ Erro ao migrar Request ID ${request.id}:`, error.message);
      errors++;
    }
  }
  
  stats.requests = { migrated, ignored, errors, total: requests.length };
  console.log(`\n   ✅ Requests: ${migrated} migrados, ${ignored} ignorados, ${errors} erros`);
}

/**
 * Migrar UsageLog (PostgreSQL) → logs_uso (MongoDB)
 */
async function migrateUsageLogs(prisma, mongoDb, stats) {
  console.log('\n📦 Migrando UsageLog → logs_uso...');
  
  const collection = mongoDb.collection('logs_uso');
  const logs = await prisma.usageLog.findMany({
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`   Encontrados ${logs.length} registros no PostgreSQL`);
  
  let migrated = 0;
  let ignored = 0;
  let errors = 0;
  
  for (const log of logs) {
    try {
      // Verificar duplicata por createdAt (tolerância 1 segundo)
      const createdAt = new Date(log.createdAt);
      const createdAtMin = new Date(createdAt.getTime() - 1000);
      const createdAtMax = new Date(createdAt.getTime() + 1000);
      
      const duplicate = await collection.findOne({
        userEmail: log.userEmail || null,
        action: log.action,
        createdAt: {
          $gte: createdAtMin,
          $lte: createdAtMax
        }
      });
      
      if (duplicate) {
        console.log(`   ⏭️ Duplicata encontrada (ID ${log.id}) - ignorando`);
        ignored++;
        continue;
      }
      
      // Preparar documento MongoDB
      const documento = {
        userEmail: log.userEmail || null,
        action: String(log.action || ''),
        detail: typeof log.detail === 'object' ? log.detail : {},
        ip: log.ip || null,
        createdAt: createdAt
      };
      
      if (!DRY_RUN) {
        await collection.insertOne(documento);
        migrated++;
        if (migrated % 10 === 0) {
          process.stdout.write(`   Migrados: ${migrated}...\r`);
        }
      } else {
        migrated++;
        console.log(`   [DRY-RUN] Migraria: ${log.id} → Action: ${log.action}`);
      }
    } catch (error) {
      console.error(`   ❌ Erro ao migrar UsageLog ID ${log.id}:`, error.message);
      errors++;
    }
  }
  
  stats.logs = { migrated, ignored, errors, total: logs.length };
  console.log(`\n   ✅ UsageLogs: ${migrated} migrados, ${ignored} ignorados, ${errors} erros`);
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando migração PostgreSQL → MongoDB (Módulo Escalações)');
  console.log(`   Modo: ${DRY_RUN ? 'DRY-RUN (apenas validação)' : 'MIGRAÇÃO REAL'}`);
  console.log('');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada');
    process.exit(1);
  }
  
  if (!process.env.MONGO_ENV) {
    console.error('❌ MONGO_ENV não configurada');
    process.exit(1);
  }
  
  const stats = {
    requests: { migrated: 0, ignored: 0, errors: 0, total: 0 },
    logs: { migrated: 0, ignored: 0, errors: 0, total: 0 }
  };
  
  let prisma = null;
  let mongoClient = null;
  
  try {
    // Conectar ao PostgreSQL
    console.log('🔌 Conectando ao PostgreSQL...');
    prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ PostgreSQL conectado');
    
    // Conectar ao MongoDB
    console.log('🔌 Conectando ao MongoDB...');
    mongoClient = new MongoClient(process.env.MONGO_ENV);
    await mongoClient.connect();
    const mongoDb = mongoClient.db('hub_escalacoes');
    console.log('✅ MongoDB conectado');
    
    // Migrar dados
    await migrateRequests(prisma, mongoDb, stats);
    await migrateUsageLogs(prisma, mongoDb, stats);
    
    // Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA MIGRAÇÃO');
    console.log('='.repeat(60));
    console.log('\nRequests:');
    console.log(`   Total: ${stats.requests.total}`);
    console.log(`   Migrados: ${stats.requests.migrated}`);
    console.log(`   Ignorados: ${stats.requests.ignored}`);
    console.log(`   Erros: ${stats.requests.errors}`);
    console.log('\nUsageLogs:');
    console.log(`   Total: ${stats.logs.total}`);
    console.log(`   Migrados: ${stats.logs.migrated}`);
    console.log(`   Ignorados: ${stats.logs.ignored}`);
    console.log(`   Erros: ${stats.logs.errors}`);
    console.log('\n' + '='.repeat(60));
    
    if (DRY_RUN) {
      console.log('\n⚠️ MODO DRY-RUN: Nenhum dado foi inserido no MongoDB');
      console.log('   Execute sem --dry-run para realizar a migração real');
    } else {
      console.log('\n✅ Migração concluída com sucesso!');
    }
    
  } catch (error) {
    console.error('\n❌ Erro durante migração:', error);
    process.exit(1);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
      console.log('\n🔌 PostgreSQL desconectado');
    }
    if (mongoClient) {
      await mongoClient.close();
      console.log('🔌 MongoDB desconectado');
    }
  }
}

// Executar migração
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = { main, migrateRequests, migrateUsageLogs };

