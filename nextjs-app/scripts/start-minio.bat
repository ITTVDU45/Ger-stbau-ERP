@echo off
REM MinIO Startup-Script für Windows
REM Autor: AI Assistant
REM Datum: 2025-10-15

echo.
echo MinIO fuer Gutachter-Portal starten...
echo.

REM Prüfe ob Docker läuft
docker info >nul 2>&1
if errorlevel 1 (
    echo [FEHLER] Docker laeuft nicht!
    echo.
    echo Bitte starten Sie Docker Desktop und fuehren Sie dieses Script erneut aus.
    echo.
    pause
    exit /b 1
)

echo [OK] Docker laeuft
echo.

REM Prüfe ob MinIO Container bereits existiert
docker ps -a | findstr gutachter-minio >nul 2>&1
if errorlevel 1 (
    REM Container existiert nicht, erstelle neuen
    echo Erstelle neuen MinIO Container...
    
    docker run -d ^
      -p 9000:9000 ^
      -p 9001:9001 ^
      --name gutachter-minio ^
      -e "MINIO_ROOT_USER=minioadmin" ^
      -e "MINIO_ROOT_PASSWORD=minioadmin" ^
      -v minio_data:/data ^
      quay.io/minio/minio server /data --console-address ":9001"
    
    if errorlevel 1 (
        echo.
        echo [FEHLER] Fehler beim Starten von MinIO!
        echo.
        pause
        exit /b 1
    )
    
    echo Warte auf MinIO...
    timeout /t 5 /nobreak >nul
    
    echo.
    echo [OK] MinIO wurde erfolgreich gestartet!
    goto :success
)

REM Container existiert, prüfe ob er läuft
docker ps | findstr gutachter-minio >nul 2>&1
if errorlevel 1 (
    echo Starte vorhandenen Container...
    docker start gutachter-minio
    
    echo Warte auf MinIO...
    timeout /t 3 /nobreak >nul
    
    echo.
    echo [OK] MinIO wurde gestartet
) else (
    echo [OK] MinIO laeuft bereits
)

:success
echo.
echo ========================================
echo MinIO ist erreichbar unter:
echo   - API:     http://localhost:9000
echo   - Console: http://localhost:9001
echo   - Login:   minioadmin / minioadmin
echo ========================================
echo.
echo Naechste Schritte:
echo 1. Pruefen Sie die .env Datei
echo 2. Starten Sie Ihre Next.js App neu
echo.
pause

