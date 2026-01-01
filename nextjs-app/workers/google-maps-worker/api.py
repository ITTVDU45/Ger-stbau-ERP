#!/usr/bin/env python3
"""
FastAPI REST API für Google Maps Customer Import Worker
Läuft als eigenständiger Service auf einem Docker Server
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import sys
from datetime import datetime
import uvicorn

# Import worker logic
from worker import process_job_sync

app = FastAPI(
    title="Customer Import Worker API",
    description="Google Maps & Website Analysis Service",
    version="1.0.0"
)

# CORS Configuration - erlaubt Requests von Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.aplus-geruestbau.de",
        "https://geruestbau-ittvdu45s-projects.vercel.app",
        "https://*.vercel.app",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class ProcessJobRequest(BaseModel):
    jobId: str
    mongoUri: str
    googleMapsApiKey: str

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    mongodb_connected: bool
    google_maps_configured: bool

# In-Memory Job Status (für einfaches Tracking)
active_jobs = {}

@app.get("/")
async def root():
    """Root endpoint - zeigt API Info"""
    return {
        "service": "Customer Import Worker",
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "process": "POST /process-job"
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health Check - prüft ob Service bereit ist"""
    
    # Prüfe MongoDB Connection
    mongodb_ok = bool(os.getenv('MONGODB_URI'))
    
    # Prüfe Google Maps API Key
    gmaps_ok = bool(os.getenv('GOOGLE_MAPS_API_KEY'))
    
    return HealthResponse(
        status="healthy" if (mongodb_ok and gmaps_ok) else "degraded",
        timestamp=datetime.utcnow().isoformat(),
        version="1.0.0",
        mongodb_connected=mongodb_ok,
        google_maps_configured=gmaps_ok
    )

@app.post("/process-job")
async def process_job(request: ProcessJobRequest, background_tasks: BackgroundTasks):
    """
    Startet die Verarbeitung eines Import-Jobs
    
    Der Job wird asynchron im Hintergrund verarbeitet.
    Die API gibt sofort eine Bestätigung zurück.
    """
    job_id = request.jobId
    
    # Validierung
    if not job_id:
        raise HTTPException(status_code=400, detail="jobId ist erforderlich")
    
    # Prüfe ob Job bereits läuft
    if job_id in active_jobs and active_jobs[job_id].get('status') == 'running':
        raise HTTPException(
            status_code=409, 
            detail=f"Job {job_id} wird bereits verarbeitet"
        )
    
    # Job als aktiv markieren
    active_jobs[job_id] = {
        'status': 'running',
        'started_at': datetime.utcnow().isoformat()
    }
    
    # Starte Verarbeitung im Hintergrund
    background_tasks.add_task(
        run_job_processing,
        job_id,
        request.mongoUri,
        request.googleMapsApiKey
    )
    
    return {
        "success": True,
        "jobId": job_id,
        "status": "processing",
        "message": "Job wurde gestartet und wird im Hintergrund verarbeitet"
    }

@app.get("/job-status/{job_id}")
async def get_job_status(job_id: str):
    """
    Gibt den Status eines Jobs zurück
    (Optional - für Debugging)
    """
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Job nicht gefunden")
    
    return active_jobs[job_id]

async def run_job_processing(job_id: str, mongo_uri: str, google_maps_key: str):
    """
    Führt die Job-Verarbeitung asynchron aus
    """
    try:
        print(f"🚀 Starte Verarbeitung für Job {job_id}")
        
        # Setze Environment Variables für den Worker
        os.environ['MONGODB_URI'] = mongo_uri
        os.environ['GOOGLE_MAPS_API_KEY'] = google_maps_key
        
        # Rufe synchronen Worker auf
        process_job_sync(job_id)
        
        # Job als abgeschlossen markieren
        active_jobs[job_id] = {
            'status': 'completed',
            'started_at': active_jobs[job_id]['started_at'],
            'completed_at': datetime.utcnow().isoformat()
        }
        
        print(f"✅ Job {job_id} erfolgreich abgeschlossen")
        
    except Exception as e:
        print(f"❌ Fehler bei Job {job_id}: {str(e)}")
        
        # Job als fehlgeschlagen markieren
        active_jobs[job_id] = {
            'status': 'failed',
            'started_at': active_jobs[job_id].get('started_at'),
            'failed_at': datetime.utcnow().isoformat(),
            'error': str(e)
        }

if __name__ == "__main__":
    # Port aus ENV oder Default 8000
    port = int(os.getenv("PORT", 8000))
    
    print(f"""
    ========================================
    🚀 Customer Import Worker API
    ========================================
    Port: {port}
    Environment: {os.getenv('ENVIRONMENT', 'development')}
    MongoDB: {'✓' if os.getenv('MONGODB_URI') else '✗'}
    Google Maps: {'✓' if os.getenv('GOOGLE_MAPS_API_KEY') else '✗'}
    ========================================
    """)
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv('ENVIRONMENT') == 'development',
        log_level="info"
    )

