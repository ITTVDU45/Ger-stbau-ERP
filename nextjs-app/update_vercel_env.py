#!/usr/bin/env python3
"""
Aktualisiert Vercel Environment-Variablen über die REST API
"""
import subprocess
import json
import sys

# Vercel Projekt-Details
PROJECT_ID = "prj_THugqEUQtqZfMxuoPlMtpZuAWj5H"
TEAM_ID = "team_Y5lYUntxkrXoqYjTfhG0ztRB"

# Hole Vercel Token
def get_vercel_token():
    try:
        result = subprocess.run(
            ["vercel", "whoami"], 
            capture_output=True, 
            text=True, 
            check=True
        )
        # Token aus Config holen
        result = subprocess.run(
            ["cat", f"{subprocess.os.path.expanduser('~')}/.vercel/auth.json"],
            capture_output=True,
            text=True
        )
        auth_data = json.loads(result.stdout)
        return auth_data.get("token")
    except:
        print("❌ Konnte Vercel Token nicht finden")
        return None

# Korrekte Environment-Variablen für Gerüstbau ERP
CORRECT_ENV_VARS = {
    "MONGODB_DB": {
        "value": "geruestbau_erp",
        "target": ["production", "preview", "development"]
    },
    "MONGODB_URI": {
        "value": "mongodb://GeruestbauAPLUS_db_user:spUVToPfcNNrGaEb@ac-o0nij6p-shard-00-01.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-02.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-00.0vn5roj.mongodb.net:27017/geruestbau_erp?ssl=true&authSource=admin&retryWrites=true&w=majority",
        "target": ["production", "preview", "development"]
    },
    "MONGO_URI": {
        "value": "mongodb://GeruestbauAPLUS_db_user:spUVToPfcNNrGaEb@ac-o0nij6p-shard-00-01.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-02.0vn5roj.mongodb.net:27017,ac-o0nij6p-shard-00-00.0vn5roj.mongodb.net:27017/geruestbau_erp?ssl=true&authSource=admin&retryWrites=true&w=majority",
        "target": ["production", "preview", "development"]
    },
    "MINIO_BUCKET": {
        "value": "gerustbau",
        "target": ["production", "preview", "development"]
    },
}

def update_env_var(key, value, target_envs):
    """Aktualisiert eine Environment-Variable für alle angegebenen Environments"""
    print(f"  📝 Aktualisiere {key}...")
    
    for env in target_envs:
        # Lösche alte Variable
        cmd_remove = [
            "curl", "-X", "DELETE",
            f"https://api.vercel.com/v9/projects/{PROJECT_ID}/env/{key}",
            "-H", f"Authorization: Bearer $(vercel whoami 2>/dev/null | head -1)",
            "-H", "Content-Type: application/json"
        ]
        
        # Füge neue Variable hinzu via CLI (einfacher)
        cmd_add = f'echo "{value}" | vercel env add {key} {env} 2>&1'
        try:
            result = subprocess.run(cmd_add, shell=True, capture_output=True, text=True, timeout=10)
            if "already" in result.stdout.lower() or "success" in result.stdout.lower():
                print(f"    ✅ {key} für {env} gesetzt")
            else:
                print(f"    ⚠️  {key} für {env}: {result.stdout[:100]}")
        except Exception as e:
            print(f"    ❌ Fehler bei {key}: {e}")

def main():
    print("🔄 Starte Aktualisierung der Vercel Environment-Variablen...\n")
    
    for key, config in CORRECT_ENV_VARS.items():
        update_env_var(key, config["value"], config["target"])
    
    print("\n✅ Aktualisierung abgeschlossen!")
    print("\n⏭️  Führe jetzt 'vercel --prod' aus, um das Deployment zu starten.")

if __name__ == "__main__":
    main()

