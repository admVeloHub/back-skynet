# VeloHub V3 - Script de Inicialização do Frontend
# VERSION: v1.0.0 | DATE: 2025-01-30 | AUTHOR: VeloHub Development Team
# REGRA: Frontend porta 8080 | Backend porta 8090 na rede local

$env:PORT = "8080"
Write-Host "🚀 Iniciando frontend na porta 8080..." -ForegroundColor Green
npm start

