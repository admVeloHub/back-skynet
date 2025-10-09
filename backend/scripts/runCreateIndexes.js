/**
 * Script para executar criação de índices de texto
 * VERSION: v1.0.0 | DATE: 2024-12-19 | AUTHOR: VeloHub Development Team
 */

const { createTextIndexes } = require('./createTextIndexes');

console.log('🚀 EXECUTANDO CRIAÇÃO DE ÍNDICES DE TEXTO...');
console.log('⏰ Iniciado em:', new Date().toISOString());

createTextIndexes()
  .then((result) => {
    console.log('\n✅ Índices criados com sucesso!');
    console.log('📊 Resultado:', result);
    console.log('⏰ Finalizado em:', new Date().toISOString());
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro na criação de índices:', error.message);
    console.log('⏰ Finalizado em:', new Date().toISOString());
    process.exit(1);
  });
