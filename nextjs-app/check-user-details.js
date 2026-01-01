const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkUserDetails() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    
    const user = await db.collection('users').findOne({ 
      email: 'info@aplus-geruestbau.de' 
    });
    
    if (user) {
      console.log('📄 Vollständige Benutzerdaten:\n');
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('❌ Benutzer nicht gefunden');
    }
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await client.close();
  }
}

checkUserDetails();
