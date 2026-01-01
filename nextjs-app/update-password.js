const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function updatePassword() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Mit Datenbank verbunden');
    
    const db = client.db(process.env.MONGODB_DB);
    const usersCollection = db.collection('users');
    
    // Neues Passwort hashen
    const newPassword = 'tykgUt-rerpy1-rogges';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    console.log('🔐 Passwort gehashed');
    
    // Passwort aktualisieren
    const result = await usersCollection.updateOne(
      { email: 'info@aplus-geruestbau.de' },
      { 
        $set: { 
          passwordHash: hashedPassword,
          updatedAt: new Date()
        } 
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('\n✅ PASSWORT ERFOLGREICH GEÄNDERT!\n');
      console.log('Login-Daten:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('E-Mail:   info@aplus-geruestbau.de');
      console.log('Passwort: tykgUt-rerpy1-rogges');
      console.log('Rolle:    ADMIN');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Passwort verifizieren
      const user = await usersCollection.findOne({ email: 'info@aplus-geruestbau.de' });
      const isValid = await bcrypt.compare(newPassword, user.passwordHash);
      
      if (isValid) {
        console.log('\n✅ Passwort-Verifikation erfolgreich!');
      } else {
        console.log('\n❌ Warnung: Verifikation fehlgeschlagen');
      }
    } else {
      console.log('❌ Fehler: Benutzer nicht gefunden oder nicht aktualisiert');
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await client.close();
  }
}

updatePassword();
