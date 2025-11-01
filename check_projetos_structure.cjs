const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('Conectando ao banco:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar com o banco:', err.message);
    return;
  }
  console.log('Conectado ao banco SQLite com sucesso');

  // Verificar estrutura da tabela projetos
  console.log('\n📋 Estrutura da tabela projetos:');
  db.all("PRAGMA table_info(projetos)", (err, rows) => {
    if (err) {
      console.error('Erro ao obter estrutura da tabela:', err.message);
    } else {
      rows.forEach(column => {
        console.log(`  ${column.name} (${column.type}) - ${column.notnull ? 'NOT NULL' : 'NULL'}`);
      });

      // Verificar alguns projetos de exemplo
      console.log('\n📊 Dados de exemplo (primeiros 3 projetos):');
      db.all("SELECT * FROM projetos LIMIT 3", (err, projects) => {
        if (err) {
          console.error('Erro ao obter projetos:', err.message);
        } else {
          projects.forEach(project => {
            console.log('  ', JSON.stringify(project, null, 2));
          });
        }

        db.close((err) => {
          if (err) {
            console.error('Erro ao fechar conexão:', err.message);
          } else {
            console.log('\nConexão com o banco fechada.');
          }
        });
      });
    }
  });
});