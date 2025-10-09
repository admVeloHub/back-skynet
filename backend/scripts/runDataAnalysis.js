/**
 * Script para executar análise de volume de dados
 * VERSION: v1.0.0 | DATE: 2024-12-19 | AUTHOR: VeloHub Development Team
 */

const { analyzeDataVolume } = require('./analyzeDataVolume');

console.log('🔍 EXECUTANDO ANÁLISE DE VOLUME DE DADOS...');
console.log('⏰ Iniciado em:', new Date().toISOString());

analyzeDataVolume()
  .then(() => {
    console.log('\n✅ Análise concluída com sucesso!');
    console.log('⏰ Finalizado em:', new Date().toISOString());
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro na análise:', error.message);
    console.log('⏰ Finalizado em:', new Date().toISOString());
    process.exit(1);
  });
