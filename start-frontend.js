/**
 * VeloHub V3 - Script de Inicialização do Frontend
 * VERSION: v1.0.1 | DATE: 2025-01-30 | AUTHOR: VeloHub Development Team
 * REGRA: Frontend porta 8080 | Backend porta 8090 na rede local
 */

const { spawn } = require('child_process');

// Definir porta do frontend
process.env.PORT = '8080';

console.log('🚀 Iniciando frontend na porta 8080...');
console.log('📡 Backend deve estar rodando na porta 8090');
console.log('');

// Iniciar react-scripts com a porta definida
const reactScripts = spawn('npx', ['react-scripts', 'start'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '8080' }
});

reactScripts.on('error', (error) => {
  console.error('❌ Erro ao iniciar react-scripts:', error);
  process.exit(1);
});

reactScripts.on('exit', (code) => {
  process.exit(code);
});

