#!/usr/bin/env python3
"""
Google Maps Worker für KI-Kunden-Import
Führt Places-Suche durch und speichert Ergebnisse in MongoDB
"""

import os
import sys
import time
import requests
from typing import List, Dict, Optional
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
import logging
from website_analyzer import WebsiteAnalyzer

# Logging konfigurieren
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Konfiguration
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')
MONGODB_URI = os.getenv('MONGODB_URI')
MONGODB_DB = os.getenv('MONGODB_DB', 'geruestbau_erp')

# API Endpoints
PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places'

class GoogleMapsWorker:
    def __init__(self):
        """Initialize worker with MongoDB and Google Maps API"""
        if not GOOGLE_MAPS_API_KEY:
            raise ValueError("GOOGLE_MAPS_API_KEY not set in environment")
        
        if not MONGODB_URI:
            raise ValueError("MONGODB_URI not set in environment")
        
        self.api_key = GOOGLE_MAPS_API_KEY
        self.mongo_client = MongoClient(MONGODB_URI)
        self.db = self.mongo_client[MONGODB_DB]
        self.jobs_collection = self.db['customer_import_jobs']
        self.website_analyzer = WebsiteAnalyzer()
        
        logger.info("✅ Worker initialized")
    
    def search_places(self, query: str, location: str) -> List[Dict]:
        """
        Suche nach Places mit Text Search API
        
        Args:
            query: Suchquery (z.B. "Bauunternehmen")
            location: Standort (z.B. "Berlin")
        
        Returns:
            Liste von Place-IDs
        """
        headers = {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': self.api_key,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location'
        }
        
        data = {
            'textQuery': f"{query} in {location}",
            'languageCode': 'de'
        }
        
        try:
            response = requests.post(PLACES_SEARCH_URL, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()
            places = result.get('places', [])
            
            logger.info(f"📍 {len(places)} Places gefunden für '{query} in {location}'")
            return places
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Fehler bei Places-Suche: {e}")
            return []
    
    def get_place_details(self, place_id: str) -> Optional[Dict]:
        """
        Hole detaillierte Informationen zu einem Place
        
        Args:
            place_id: Google Places ID
        
        Returns:
            Detaillierte Place-Informationen oder None
        """
        headers = {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': self.api_key,
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,types,addressComponents'
        }
        
        try:
            url = f"{PLACE_DETAILS_URL}/{place_id}"
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Fehler bei Place-Details für {place_id}: {e}")
            return None
    
    def extract_contact_from_website(self, website_url: str) -> Dict[str, Optional[str]]:
        """
        Extrahiert E-Mail und Telefon von einer Website (Impressum-Scraping)
        
        Args:
            website_url: URL der Website
        
        Returns:
            Dict mit 'email' und 'telefon' (oder None)
        """
        # TODO: Implementierung mit BeautifulSoup oder Scrapy
        # Für MVP: Placeholder
        logger.info(f"🌐 Website-Analyse für {website_url} (TODO)")
        return {'email': None, 'telefon': None}
    
    def process_job(self, job_id: str):
        """
        Verarbeitet einen Import-Job
        
        Args:
            job_id: MongoDB ObjectId des Jobs
        """
        logger.info(f"🚀 Starte Job {job_id}")
        
        try:
            # Job aus DB holen
            job = self.jobs_collection.find_one({'_id': ObjectId(job_id)})
            
            if not job:
                logger.error(f"❌ Job {job_id} nicht gefunden")
                return
            
            # Job-Status auf 'running' setzen
            self.jobs_collection.update_one(
                {'_id': ObjectId(job_id)},
                {'$set': {'status': 'running', 'updatedAt': time.time()}}
            )
            
            params = job['params']
            branche = params['branche']
            standort = params['standort']
            max_results = params['anzahlErgebnisse']
            analyze_website = params.get('websiteAnalysieren', False)
            extract_contacts = params.get('kontaktdatenHinzufuegen', False)
            
            results = []
            
            # Phase 1: Searching
            self.update_job_progress(job_id, 0, max_results, 'searching')
            places = self.search_places(branche, standort)
            
            # Limitiere auf max_results
            places = places[:max_results]
            
            # Phase 2: Loading Details
            for i, place in enumerate(places):
                # Check if job was cancelled
                current_job = self.jobs_collection.find_one({'_id': ObjectId(job_id)})
                if current_job and current_job.get('status') == 'cancelled':
                    logger.info(f"⚠️ Job {job_id} wurde abgebrochen")
                    return
                
                self.update_job_progress(job_id, i, max_results, 'loading_details')
                
                place_id = place.get('id')
                if not place_id:
                    continue
                
                # Detaillierte Informationen abrufen
                details = self.get_place_details(place_id)
                if not details:
                    continue
                
                # Adresse parsen
                address_components = details.get('addressComponents', [])
                parsed_address = self.parse_address(address_components)
                
                result = {
                    'id': place_id,
                    'externalId': place_id,
                    'firmenname': details.get('displayName', {}).get('text', ''),
                    'standort': parsed_address.get('ort', standort),
                    'adresse': parsed_address,
                    'branche': self.extract_industry(details.get('types', [])),
                    'telefon': details.get('nationalPhoneNumber'),
                    'website': details.get('websiteUri'),
                    'email': None,
                    'websiteAnalyse': None,
                    'ansprechpartner': None,
                    'analyseScore': 70  # Basis-Score
                }
                
                # Phase 3 & 4: Website-Analyse (wenn aktiviert)
                if (analyze_website or extract_contacts) and result['website']:
                    self.update_job_progress(job_id, i, max_results, 'analyzing_websites')
                    
                    try:
                        # Website analysieren
                        website_data = self.website_analyzer.analyze_website(result['website'])
                        
                        if website_data:
                            result['websiteAnalyse'] = website_data
                            
                            # Primäre E-Mail aus Website-Analyse
                            if website_data.get('extractedEmails'):
                                result['email'] = website_data['extractedEmails'][0]
                                result['analyseScore'] += 15
                            
                            # Primärer Ansprechpartner
                            if website_data.get('ansprechpartner') and len(website_data['ansprechpartner']) > 0:
                                primary_contact = website_data['ansprechpartner'][0]
                                result['ansprechpartner'] = {
                                    'vorname': primary_contact.get('name', '').split()[0] if primary_contact.get('name') else None,
                                    'nachname': ' '.join(primary_contact.get('name', '').split()[1:]) if primary_contact.get('name') and len(primary_contact.get('name', '').split()) > 1 else None,
                                    'position': primary_contact.get('position'),
                                    'telefon': primary_contact.get('telefon'),
                                    'email': primary_contact.get('email')
                                }
                                result['analyseScore'] += 10
                            
                            # Bonus für Beschreibung
                            if website_data.get('beschreibung'):
                                result['analyseScore'] += 5
                            
                            logger.info(f"✅ Website analysiert: {result['firmenname']} - {len(website_data.get('extractedEmails', []))} E-Mails gefunden")
                    
                    except Exception as e:
                        logger.error(f"❌ Fehler bei Website-Analyse für {result['firmenname']}: {e}")
                        # Fortfahren ohne Website-Daten
                
                # Score begrenzen auf max 100
                result['analyseScore'] = min(result['analyseScore'], 100)
                
                results.append(result)
                
                # Rate Limiting (500 Anfragen/Sekunde laut Google)
                time.sleep(0.1)
            
            # Job als completed markieren
            self.jobs_collection.update_one(
                {'_id': ObjectId(job_id)},
                {
                    '$set': {
                        'status': 'completed',
                        'results': results,
                        'completedAt': time.time(),
                        'updatedAt': time.time()
                    }
                }
            )
            
            logger.info(f"✅ Job {job_id} abgeschlossen - {len(results)} Ergebnisse")
            
        except Exception as e:
            logger.error(f"❌ Fehler bei Job {job_id}: {e}")
            self.jobs_collection.update_one(
                {'_id': ObjectId(job_id)},
                {
                    '$set': {
                        'status': 'failed',
                        'error': str(e),
                        'updatedAt': time.time()
                    }
                }
            )
    
    def update_job_progress(self, job_id: str, current: int, total: int, phase: str):
        """Aktualisiert den Fortschritt eines Jobs"""
        self.jobs_collection.update_one(
            {'_id': ObjectId(job_id)},
            {
                '$set': {
                    'progress': {
                        'current': current,
                        'total': total,
                        'phase': phase
                    },
                    'updatedAt': time.time()
                }
            }
        )
    
    def parse_address(self, address_components: List[Dict]) -> Dict:
        """Parst address_components in strukturierte Adresse"""
        address = {}
        
        for component in address_components:
            types = component.get('types', [])
            long_name = component.get('longText', '')
            
            if 'route' in types:
                address['strasse'] = long_name
            elif 'street_number' in types:
                address['hausnummer'] = long_name
            elif 'postal_code' in types:
                address['plz'] = long_name
            elif 'locality' in types:
                address['ort'] = long_name
            elif 'country' in types:
                address['land'] = long_name
        
        return address
    
    def extract_industry(self, types: List[str]) -> Optional[str]:
        """Extrahiert Branche aus Google Places types"""
        # Mapping von Google types zu Branchen
        industry_map = {
            'general_contractor': 'Bauunternehmen',
            'roofing_contractor': 'Dachdecker',
            'electrician': 'Elektriker',
            'plumber': 'Installateur',
            'painter': 'Maler',
            'construction_company': 'Baufirma',
        }
        
        for type_key in types:
            if type_key in industry_map:
                return industry_map[type_key]
        
        return None

def process_job_sync(job_id: str):
    """
    Synchrone Funktion zum Verarbeiten eines Jobs
    Wird von der FastAPI aufgerufen
    """
    logger.info(f"🚀 Starting worker for job {job_id}")
    
    try:
        worker = GoogleMapsWorker()
        worker.process_job(job_id)
        logger.info(f"✅ Worker completed for job {job_id}")
    except Exception as e:
        logger.error(f"❌ Worker failed for job {job_id}: {str(e)}")
        raise

def main():
    """Main entry point for command-line execution"""
    if len(sys.argv) < 2:
        logger.error("Usage: python worker.py <job_id>")
        sys.exit(1)
    
    job_id = sys.argv[1]
    
    try:
        process_job_sync(job_id)
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()

