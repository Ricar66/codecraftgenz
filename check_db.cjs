const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database.sqlite');

console.log('Verificando tabelas no banco...');

db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, rows) => {
  if (err) {
    console.error('Erro ao consultar tabelas:', err);
  } else {
    console.log('Tabelas encontradas:');
    rows.forEach(row => console.log('- ' + row.name));
    
    // Verificar dados na tabela crafters
    db.all('SELECT COUNT(*) as count FROM crafters', (err, rows) => {
      if (err) {
        console.error('Erro ao consultar crafters:', err);
      } else {
        console.log('Crafters no banco:', rows[0].count);
      }
      
      // Verificar dados na tabela top3
      db.all('SELECT COUNT(*) as count FROM top3', (err, rows) => {
        if (err) {
          console.error('Erro ao consultar top3:', err);
        } else {
          console.log('Registros top3 no banco:', rows[0].count);
        }
        
        db.close();
      });
    });
  }
});