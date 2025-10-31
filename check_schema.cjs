const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando estrutura das tabelas...\n');

// Verificar estrutura da tabela crafters
db.all("PRAGMA table_info(crafters)", (err, rows) => {
  if (err) {
    console.error('Erro ao verificar crafters:', err);
  } else {
    console.log('📋 Estrutura da tabela crafters:');
    rows.forEach(row => {
      console.log(`  ${row.name} (${row.type}) - ${row.notnull ? 'NOT NULL' : 'NULL'}`);
    });
  }
  
  // Verificar alguns dados da tabela
  db.all("SELECT * FROM crafters LIMIT 3", (err, rows) => {
    if (err) {
      console.error('Erro ao buscar crafters:', err);
    } else {
      console.log('\n📊 Dados de exemplo:');
      rows.forEach(row => {
        console.log('  ', row);
      });
    }
    
    // Verificar estrutura da tabela top3
    db.all("PRAGMA table_info(top3)", (err, rows) => {
      if (err) {
        console.error('Erro ao verificar top3:', err);
      } else {
        console.log('\n🏆 Estrutura da tabela top3:');
        rows.forEach(row => {
          console.log(`  ${row.name} (${row.type}) - ${row.notnull ? 'NOT NULL' : 'NULL'}`);
        });
      }
      
      db.close();
    });
  });
});