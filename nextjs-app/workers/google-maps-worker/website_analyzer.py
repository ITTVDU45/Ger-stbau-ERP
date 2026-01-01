"""
Website-Analyzer für Kunden-Import
Extrahiert E-Mails, Telefonnummern, Ansprechpartner und Unternehmensinformationen
"""

import re
import requests
from bs4 import BeautifulSoup
from typing import Dict, List, Optional
from urllib.parse import urljoin, urlparse
import logging

logger = logging.getLogger(__name__)

class WebsiteAnalyzer:
    def __init__(self, timeout: int = 10):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def analyze_website(self, url: str) -> Dict:
        """
        Analysiert eine Website und extrahiert alle relevanten Informationen
        
        Returns:
            Dict mit beschreibung, dienstleistungen, extractedEmails, extractedPhones, ansprechpartner
        """
        result = {
            'beschreibung': None,
            'dienstleistungen': [],
            'extractedEmails': [],
            'extractedPhones': [],
            'ansprechpartner': []
        }
        
        try:
            # Hauptseite analysieren
            main_content = self._fetch_page(url)
            if main_content:
                result['beschreibung'] = self._extract_description(main_content)
                result['dienstleistungen'] = self._extract_services(main_content)
                result['extractedEmails'].extend(self._extract_emails(main_content))
                result['extractedPhones'].extend(self._extract_phones(main_content))
            
            # Impressum/Kontakt-Seiten finden und analysieren
            impressum_url = self._find_impressum(url, main_content)
            if impressum_url:
                impressum_content = self._fetch_page(impressum_url)
                if impressum_content:
                    result['extractedEmails'].extend(self._extract_emails(impressum_content))
                    result['extractedPhones'].extend(self._extract_phones(impressum_content))
                    result['ansprechpartner'].extend(self._extract_contacts(impressum_content))
            
            # Kontakt-Seite finden und analysieren
            kontakt_url = self._find_kontakt(url, main_content)
            if kontakt_url and kontakt_url != impressum_url:
                kontakt_content = self._fetch_page(kontakt_url)
                if kontakt_content:
                    result['extractedEmails'].extend(self._extract_emails(kontakt_content))
                    result['extractedPhones'].extend(self._extract_phones(kontakt_content))
                    result['ansprechpartner'].extend(self._extract_contacts(kontakt_content))
            
            # Duplikate entfernen
            result['extractedEmails'] = list(set(result['extractedEmails']))
            result['extractedPhones'] = list(set(result['extractedPhones']))
            
            # Ansprechpartner deduplizieren
            seen_names = set()
            unique_contacts = []
            for contact in result['ansprechpartner']:
                name = contact.get('name', '')
                if name and name not in seen_names:
                    seen_names.add(name)
                    unique_contacts.append(contact)
            result['ansprechpartner'] = unique_contacts
            
            logger.info(f"✅ Website-Analyse: {len(result['extractedEmails'])} E-Mails, {len(result['extractedPhones'])} Telefone, {len(result['ansprechpartner'])} Ansprechpartner")
            
        except Exception as e:
            logger.error(f"❌ Fehler bei Website-Analyse: {e}")
        
        return result
    
    def _fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """Lädt eine Seite und gibt BeautifulSoup-Objekt zurück"""
        try:
            response = self.session.get(url, timeout=self.timeout, allow_redirects=True)
            response.raise_for_status()
            return BeautifulSoup(response.content, 'lxml')
        except Exception as e:
            logger.warning(f"Konnte Seite nicht laden: {url} - {e}")
            return None
    
    def _find_impressum(self, base_url: str, soup: Optional[BeautifulSoup]) -> Optional[str]:
        """Findet die Impressum-Seite"""
        if not soup:
            return None
        
        # Suche nach Impressum-Links
        impressum_keywords = ['impressum', 'imprint', 'legal', 'rechtliches']
        for link in soup.find_all('a', href=True):
            href = link['href'].lower()
            text = link.get_text().lower()
            
            if any(kw in href or kw in text for kw in impressum_keywords):
                return urljoin(base_url, link['href'])
        
        return None
    
    def _find_kontakt(self, base_url: str, soup: Optional[BeautifulSoup]) -> Optional[str]:
        """Findet die Kontakt-Seite"""
        if not soup:
            return None
        
        # Suche nach Kontakt-Links
        kontakt_keywords = ['kontakt', 'contact', 'ansprechpartner']
        for link in soup.find_all('a', href=True):
            href = link['href'].lower()
            text = link.get_text().lower()
            
            if any(kw in href or kw in text for kw in kontakt_keywords):
                return urljoin(base_url, link['href'])
        
        return None
    
    def _extract_description(self, soup: BeautifulSoup) -> Optional[str]:
        """Extrahiert Unternehmensbeschreibung"""
        # Meta-Description
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            return meta_desc['content'].strip()[:300]
        
        # Erster großer Textblock
        for tag in soup.find_all(['p', 'div'], class_=re.compile('about|description|intro|hero', re.I)):
            text = tag.get_text(strip=True)
            if len(text) > 100:
                return text[:300]
        
        return None
    
    def _extract_services(self, soup: BeautifulSoup) -> List[str]:
        """Extrahiert Dienstleistungen"""
        services = []
        
        # Suche nach "Leistungen", "Services", "Was wir tun" Sektionen
        keywords = ['leistung', 'service', 'angebot', 'produkt']
        for section in soup.find_all(['div', 'section'], class_=re.compile('|'.join(keywords), re.I)):
            # Finde Listenelemente
            for item in section.find_all(['li', 'h3', 'h4']):
                text = item.get_text(strip=True)
                if 10 < len(text) < 100:
                    services.append(text)
        
        return services[:10]  # Maximal 10 Dienstleistungen
    
    def _extract_emails(self, soup: BeautifulSoup) -> List[str]:
        """Extrahiert E-Mail-Adressen"""
        emails = []
        text = soup.get_text()
        
        # Regex für E-Mails
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        found_emails = re.findall(email_pattern, text)
        
        # Filtere gängige Spam/Placeholder-E-Mails
        blacklist = ['example.com', 'domain.com', 'email.com', 'test.com', 'placeholder']
        for email in found_emails:
            if not any(bl in email.lower() for bl in blacklist):
                emails.append(email.lower())
        
        return emails
    
    def _extract_phones(self, soup: BeautifulSoup) -> List[str]:
        """Extrahiert Telefonnummern"""
        phones = []
        text = soup.get_text()
        
        # Verschiedene Telefon-Formate
        phone_patterns = [
            r'\+49[\s-]?\d{2,4}[\s-]?\d{3,9}',  # +49 ...
            r'0\d{2,5}[\s-]?\d{3,9}',            # 0123 ...
            r'\(\d{2,5}\)[\s-]?\d{3,9}',         # (0123) ...
        ]
        
        for pattern in phone_patterns:
            found_phones = re.findall(pattern, text)
            phones.extend(found_phones)
        
        # Normalisiere Telefonnummern
        normalized = []
        for phone in phones:
            # Entferne Whitespace und Bindestriche
            clean = re.sub(r'[\s-]', '', phone)
            if 6 <= len(clean) <= 20:  # Plausible Länge
                normalized.append(clean)
        
        return normalized
    
    def _extract_contacts(self, soup: BeautifulSoup) -> List[Dict]:
        """Extrahiert Ansprechpartner (Name, Position, E-Mail, Telefon)"""
        contacts = []
        
        # Suche nach strukturierten Kontakt-Informationen
        # Typische Muster: Name + Position + Kontaktdaten
        
        # Strategie: Finde Abschnitte mit Namen (oft in <strong>, <b>, <h3>, <h4>)
        for elem in soup.find_all(['div', 'section', 'article', 'p']):
            text = elem.get_text(separator='\n', strip=True)
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            
            # Suche nach Namens-Mustern (Vorname Nachname)
            name_pattern = r'([A-ZÄÖÜ][a-zäöüß]+)\s+([A-ZÄÖÜ][a-zäöüß]+)'
            
            for i, line in enumerate(lines):
                match = re.search(name_pattern, line)
                if match and len(line) < 50:  # Nicht zu lang
                    name = match.group(0)
                    
                    # Suche Position in nächster Zeile
                    position = None
                    if i + 1 < len(lines):
                        next_line = lines[i + 1]
                        # Typische Positionen
                        position_keywords = ['geschäftsführer', 'leiter', 'inhaber', 'manager', 'direktor', 'chef']
                        if any(kw in next_line.lower() for kw in position_keywords):
                            position = next_line
                    
                    # Suche E-Mail und Telefon in den nächsten Zeilen
                    email = None
                    telefon = None
                    for j in range(i, min(i + 5, len(lines))):
                        if '@' in lines[j]:
                            emails = self._extract_emails(BeautifulSoup(lines[j], 'html.parser'))
                            if emails:
                                email = emails[0]
                        if re.search(r'[\d\+\(\)]', lines[j]):
                            phones = self._extract_phones(BeautifulSoup(lines[j], 'html.parser'))
                            if phones:
                                telefon = phones[0]
                    
                    contacts.append({
                        'name': name,
                        'position': position,
                        'email': email,
                        'telefon': telefon
                    })
        
        return contacts[:5]  # Maximal 5 Ansprechpartner

