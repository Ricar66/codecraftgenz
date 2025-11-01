const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Conectado ao banco de dados SQLite.');

// Verificar se a coluna 'progresso' já existe
db.all("PRAGMA table_info(projetos)", (err, columns) => {
  if (err) {
    console.error('Erro ao verificar estrutura da tabela:', err);
    return;
  }

  const hasProgressoField = columns.some(col => col.name === 'progresso');
  
  if (hasProgressoField) {
    console.log('Campo "progresso" já existe na tabela projetos.');
    db.close();
    return;
  }

  console.log('Adicionando campo "progresso" na tabela projetos...');
  
  // Adicionar a coluna progresso
  db.run("ALTER TABLE projetos ADD COLUMN progresso INTEGER DEFAULT 0", (err) => {
    if (err) {
      console.error('Erro ao adicionar coluna progresso:', err);
    } else {
      console.log('Campo "progresso" adicionado com sucesso!');
      
      // Verificar a estrutura atualizada
      db.all("PRAGMA table_info(projetos)", (err, updatedColumns) => {
        if (err) {
          console.error('Erro ao verificar estrutura atualizada:', err);
        } else {
          console.log('\nEstrutura atualizada da tabela projetos:');
          updatedColumns.forEach(col => {
            console.log(`- ${col.name}: ${col.type} (default: ${col.dflt_value})`);
          });
        }
        
        db.close();
      });
    }
  });
});