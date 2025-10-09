/**
 * Script para executar atualização de índices de texto
 * VERSION: v1.0.0 | DATE: 2024-12-19 | AUTHOR: VeloHub Development Team
 */

const { updateTextIndexes } = require('./updateTextIndexes');

console.log('🚀 EXECUTANDO ATUALIZAÇÃO DE ÍNDICES DE TEXTO...');
console.log('⏰ Iniciado em:', new Date().toISOString());

updateTextIndexes()
  .then((result) => {
    console.log('\n✅ Índices atualizados com sucesso!');
    console.log('📊 Resultado:', result);
    console.log('⏰ Finalizado em:', new Date().toISOString());
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro na atualização de índices:', error.message);
    console.log('⏰ Finalizado em:', new Date().toISOString());
    process.exit(1);
  });
