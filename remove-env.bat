@echo off
echo Removendo arquivo .env antes do push...
if exist .env (
    del .env
    echo Arquivo .env removido com sucesso!
) else (
    echo Arquivo .env nao encontrado.
)
echo.
echo Agora voce pode fazer o push com seguranca.
pause
