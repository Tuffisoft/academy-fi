@echo off
setlocal EnableExtensions
title Academy FI - Webseite starten

set "PROJECT_DIR=%~dp0"
if not exist "%PROJECT_DIR%package.json" set "PROJECT_DIR=C:\Users\adria\source\repos\academy-fi-adrian-db\"
if not exist "%PROJECT_DIR%package.json" (
    echo Der Projektordner wurde nicht gefunden.
    goto :error
)
pushd "%PROJECT_DIR%"
if errorlevel 1 goto :error
set "PROJECT_ENTERED=1"
set "SWC_NATIVE_BINDING_CACHE=%CD%\.next\swc"

where node.exe >nul 2>&1
if errorlevel 1 (
    echo Node.js wurde nicht gefunden. Bitte Node.js installieren und erneut starten.
    goto :error
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo npm wurde nicht gefunden. Bitte die Node.js-Installation pruefen.
    goto :error
)

node.exe -e "const [major,minor]=process.versions.node.split('.').map(Number); if(major<22 || (major===22 && minor<16)) process.exit(1)"
if errorlevel 1 (
    echo Fuer Webseite und Chat wird Node.js ab Version 22.16 benoetigt.
    goto :error
)

if not exist "node_modules\.bin\next.cmd" (
    echo Die benoetigten Pakete werden eingerichtet. Bitte warten ...
    call npm.cmd ci --no-audit --no-fund
    if errorlevel 1 goto :error
)

powershell.exe -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) { exit 1 }; exit 0"
if errorlevel 1 (
    echo Port 3000 ist bereits belegt. Bitte das andere Serverfenster schliessen.
    goto :error
)

echo Die Webseite startet unter http://localhost:3000
echo Der Browser oeffnet sich automatisch, sobald die Webseite bereit ist.
echo Dieses Fenster offen lassen. Zum Beenden Strg+C druecken.
echo.
start "" /b powershell.exe -NoProfile -WindowStyle Hidden -Command "$target='http://localhost:3000'; for ($attempt=0; $attempt -lt 60; $attempt++) { try { $response=Invoke-WebRequest -Uri $target -UseBasicParsing -TimeoutSec 5; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) { Start-Process $target; exit } } catch {}; Start-Sleep -Seconds 1 }"
call npm.cmd run dev -- --hostname localhost --port 3000
if errorlevel 1 goto :error
popd
exit /b 0

:error
if defined PROJECT_ENTERED popd
echo.
echo Der Start konnte nicht abgeschlossen werden. Die Meldung steht oben.
pause
exit /b 1
