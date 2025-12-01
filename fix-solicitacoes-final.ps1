$file = Resolve-Path 'backend\routes\api\escalacoes\solicitacoes.js'
Write-Host "Corrigindo: $file"

# Ler como texto UTF-8
$content = Get-Content $file -Raw -Encoding UTF8

# Remover qualquer BOM ou caracteres inválidos no início
$content = $content -replace '^\uFEFF', ''
$content = $content -replace '^[^\x00-\x7F]+', ''

# Reescrever sem BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, $content, $utf8NoBom)

Write-Host "Arquivo corrigido!" -ForegroundColor Green

