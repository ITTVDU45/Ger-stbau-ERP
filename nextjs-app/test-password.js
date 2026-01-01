const bcrypt = require('bcryptjs');

async function testPassword() {
  const hash = '$2a$12$L111kjYiB6vB6t4/XGn/deeIX2ac425TbQgmOStLY75TPgftm4Ydi';
  const password = 'tykgUt-rerpy1-rogges';
  
  const isMatch = await bcrypt.compare(password, hash);
  
  if (isMatch) {
    console.log('✅ PASSWORT KORREKT!');
    console.log('\nLogin-Daten:');
    console.log('E-Mail: info@aplus-geruestbau.de');
    console.log('Passwort: tykgUt-rerpy1-rogges');
  } else {
    console.log('❌ PASSWORT FALSCH');
    console.log('Das gespeicherte Passwort ist ein anderes.');
  }
}

testPassword();
