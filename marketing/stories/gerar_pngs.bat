@echo off
REM Gera 4 PNGs de 1080x1920 a partir dos HTMLs dos stories.
REM Tenta achar o chrome.exe automaticamente em locais padrao.
REM Uso: clicar duas vezes neste .bat ou rodar pelo cmd.

setlocal enabledelayedexpansion

REM Tenta encontrar o Chrome
set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if "%CHROME%"=="" (
    echo [ERRO] Chrome nao encontrado nos locais padrao.
    echo Instale o Chrome ou ajuste manualmente o caminho neste .bat.
    pause
    exit /b 1
)

echo Chrome encontrado em: %CHROME%
echo.

REM Pasta atual deste .bat
set "DIR=%~dp0"

REM Cria pasta de saida
if not exist "%DIR%png" mkdir "%DIR%png"

echo === Gerando PNGs (pode demorar 5-10s cada) ===
echo.

for %%F in (story-1-lancamento story-2-loja-desktop story-3-craftcard story-4-feedback) do (
    echo -^> %%F.png
    "%CHROME%" --headless=new --disable-gpu --hide-scrollbars ^
        --window-size=1080,1920 ^
        --screenshot="%DIR%png\%%F.png" ^
        --default-background-color=00000000 ^
        "file:///%DIR:\=/%%%F.html" >nul 2>&1
)

echo.
echo === Concluido ===
echo PNGs em: %DIR%png\
echo.
explorer "%DIR%png"
pause
