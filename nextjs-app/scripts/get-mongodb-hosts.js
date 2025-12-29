/**
 * Dieses Script versucht, die MongoDB Atlas Hosts herauszufinden
 * Falls SRV-Lookup nicht funktioniert, zeigt es alternative Verbindungsstrings
 */

const dns = require('dns');
const { Resolver } = require('dns');

const resolver = new Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const srvHost = '_mongodb._tcp.geruestbauaplus.0vn5roj.mongodb.net';

console.log('🔍 Teste DNS SRV Lookup für MongoDB Atlas...\n');

// Test mit System DNS
dns.resolveSrv(srvHost, (err, addresses) => {
  if (err) {
    console.log('❌ System DNS SRV Lookup fehlgeschlagen');
    console.log('   Fehler:', err.message);
  } else {
    console.log('✅ System DNS funktioniert:');
    addresses.forEach(addr => {
      console.log(`   - ${addr.name}:${addr.port} (priority: ${addr.priority})`);
    });
  }
});

// Test mit Google DNS
resolver.resolveSrv(srvHost, (err, addresses) => {
  if (err) {
    console.log('\n❌ Google DNS SRV Lookup fehlgeschlagen');
    console.log('   Fehler:', err.message);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 LÖSUNG: Verwende Standard MongoDB URI statt mongodb+srv://');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('1. Gehe zu MongoDB Atlas: https://cloud.mongodb.com');
    console.log('2. Klicke auf "Connect" → "Connect your application"');
    console.log('3. Wähle "Standard connection string (not SRV)"');
    console.log('4. Kopiere die URI und füge sie in .env ein:\n');
    console.log('   MONGO_URI=mongodb://GeruestbauAPLUS_db_user:DEIN_PASSWORT@...\n');
    console.log('Alternative: Nutze VPN/Netzwerk das DNS SRV unterstützt\n');
  } else {
    console.log('\n✅ Google DNS funktioniert:');
    addresses.forEach(addr => {
      console.log(`   - ${addr.name}:${addr.port} (priority: ${addr.priority})`);
    });
    
    console.log('\nGenerate standard URI:');
    const hosts = addresses
      .sort((a, b) => a.priority - b.priority)
      .map(addr => `${addr.name}:${addr.port}`)
      .join(',');
    
    console.log(`\nmongodb://USERNAME:PASSWORD@${hosts}/?replicaSet=atlas-xxxxx-shard-0&ssl=true&authSource=admin`);
  }
});

