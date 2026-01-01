#!/bin/bash

# Start-Script für Google Maps Worker
# Verwendung: ./start-worker.sh <job_id>

if [ -z "$1" ]; then
    echo "❌ Fehler: Job-ID fehlt"
    echo "Verwendung: ./start-worker.sh <job_id>"
    exit 1
fi

JOB_ID="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starte Google Maps Worker für Job: $JOB_ID"
echo "📂 Working Directory: $SCRIPT_DIR"
echo ""

# Virtual Environment aktivieren
if [ ! -d "$SCRIPT_DIR/venv" ]; then
    echo "❌ Virtual Environment nicht gefunden!"
    echo "Bitte führen Sie zuerst aus: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Worker starten
source "$SCRIPT_DIR/venv/bin/activate"
python3 "$SCRIPT_DIR/worker.py" "$JOB_ID"

echo ""
echo "✅ Worker beendet"

