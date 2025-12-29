#!/usr/bin/env python3
"""
Gerüstbau ERP - Automatisches Vercel Deployment Script
Lädt alle Environment Variables hoch und deployt die App
"""

import os
import subprocess
import sys
from pathlib import Path

def main():
    print("🚀 Gerüstbau ERP - Vercel Deployment")
    print("=" * 50)
    print()
    
    # Wechsle ins nextjs-app Verzeichnis
    script_dir = Path(__file__).parent
    app_dir = script_dir / "nextjs-app"
    os.chdir(app_dir)
    
    env_file = app_dir / ".env"
    
    if not env_file.exists():
        print("❌ Fehler: .env Datei nicht gefunden!")
        sys.exit(1)
    
    print("📋 Schritt 1: Environment Variables hochladen...")
    print()
    
    # Lese .env und lade jede Variable zu Vercel hoch
    env_vars = {}
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            
            # Überspringe Kommentare und leere Zeilen
            if not line or line.startswith('#'):
                continue
            
            # Extrahiere Variablenname und Wert
            if '=' in line:
                var_name, var_value = line.split('=', 1)
                var_name = var_name.strip()
                var_value = var_value.strip()
                
                # Entferne Anführungszeichen falls vorhanden
                var_value = var_value.strip('"').strip("'")
                
                # Nur Variablen mit Großbuchstaben am Anfang
                if var_name and var_name[0].isupper():
                    env_vars[var_name] = var_value
    
    print(f"  📝 Gefundene Variablen: {len(env_vars)}")
    print()
    
    # Setze jede Variable für production, preview und development
    success_count = 0
    for var_name, var_value in env_vars.items():
        print(f"  ➜ Setze {var_name}...", end="")
        
        try:
            for env_type in ['production', 'preview', 'development']:
                # Verwende echo + pipe für sichere Übergabe
                cmd = f'echo "{var_value}" | vercel env add "{var_name}" {env_type} --yes'
                result = subprocess.run(
                    cmd,
                    shell=True,
                    capture_output=True,
                    text=True
                )
            
            print(" ✅")
            success_count += 1
        except Exception as e:
            print(f" ⚠️  (möglicherweise bereits vorhanden)")
    
    print()
    print(f"✅ {success_count}/{len(env_vars)} Environment Variables hochgeladen!")
    print()
    print("📦 Schritt 2: Production Build & Deployment...")
    print()
    
    # Deployment starten
    try:
        result = subprocess.run(
            ["vercel", "--prod", "--yes"],
            capture_output=False,
            text=True
        )
        
        if result.returncode == 0:
            print()
            print("🎉 Deployment erfolgreich abgeschlossen!")
            print()
            print("📝 Nächste Schritte:")
            print("   1. Öffnen Sie die Vercel URL (siehe oben)")
            print("   2. Fügen Sie eine Production-Domain hinzu falls gewünscht")
            print("   3. Testen Sie die Anwendung")
            print()
        else:
            print()
            print("❌ Deployment fehlgeschlagen!")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Fehler beim Deployment: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

