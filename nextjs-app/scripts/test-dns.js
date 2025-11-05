const dns = require('dns');
const { promisify } = require('util');

const resolveSrv = promisify(dns.resolveSrv);
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

async function testDNS() {
  console.log('🔍 DNS Diagnose für MongoDB Atlas\n');
  
  const hostname = '_mongodb._tcp.geruestbauaplus.0vn5roj.mongodb.net';
  
  console.log('Testing SRV record lookup...');
  console.log(`Hostname: ${hostname}\n`);
  
  try {
    const startTime = Date.now();
    const addresses = await resolveSrv(hostname);
    const elapsed = Date.now() - startTime;
    
    console.log(`✅ SRV Lookup erfolgreich in ${elapsed}ms`);
    console.log(`   Gefundene Server: ${addresses.length}`);
    addresses.forEach((addr, i) => {
      console.log(`   ${i + 1}. ${addr.name}:${addr.port} (priority: ${addr.priority})`);
    });
    console.log('');
    
    // Test IPv4 Auflösung für den ersten Server
    if (addresses.length > 0) {
      const serverHost = addresses[0].name;
      console.log(`Testing IPv4 resolution for ${serverHost}...`);
      
      try {
        const ipv4Start = Date.now();
        const ipv4Addresses = await resolve4(serverHost);
        const ipv4Elapsed = Date.now() - ipv4Start;
        
        console.log(`✅ IPv4 Lookup erfolgreich in ${ipv4Elapsed}ms`);
        ipv4Addresses.forEach(ip => console.log(`   ${ip}`));
      } catch (err) {
        console.log(`❌ IPv4 Lookup fehlgeschlagen: ${err.message}`);
      }
      
      console.log('');
      
      // Test IPv6 Auflösung
      console.log(`Testing IPv6 resolution for ${serverHost}...`);
      try {
        const ipv6Start = Date.now();
        const ipv6Addresses = await resolve6(serverHost);
        const ipv6Elapsed = Date.now() - ipv6Start;
        
        console.log(`✅ IPv6 Lookup erfolgreich in ${ipv6Elapsed}ms`);
        ipv6Addresses.forEach(ip => console.log(`   ${ip}`));
      } catch (err) {
        console.log(`⚠️  IPv6 Lookup fehlgeschlagen: ${err.message}`);
        console.log('   (Das ist normal wenn IPv6 nicht verfügbar ist)');
      }
    }
    
    console.log('\n✅ DNS funktioniert korrekt!');
    console.log('\nWenn MongoDB Atlas trotzdem Timeouts hat, liegt es wahrscheinlich an:');
    console.log('1. Firewall/VPN Einstellungen');
    console.log('2. MongoDB Atlas IP Whitelist (Network Access Settings)');
    console.log('3. Langsame Netzwerkverbindung');
    
  } catch (err) {
    console.log(`❌ SRV Lookup fehlgeschlagen: ${err.code} - ${err.message}\n`);
    console.log('🔧 Mögliche Lösungen:\n');
    console.log('1. DNS Server Problem - versuchen Sie Google DNS:');
    console.log('   sudo networksetup -setdnsservers Wi-Fi 8.8.8.8 8.8.4.4');
    console.log('\n2. VPN/Firewall blockiert DNS SRV Lookups');
    console.log('\n3. Verwenden Sie stattdessen die Standard-MongoDB-URI:');
    console.log('   mongodb://host1:27017,host2:27017/database');
  }
}

testDNS();

