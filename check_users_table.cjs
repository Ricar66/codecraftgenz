const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Verificando tabelas no banco...');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('Erro:', err);
    return;
  }
  
  console.log('Tabelas existentes:');
  tables.forEach(table => {
    console.log('- ' + table.name);
  });
  
  // Verificar se existe tabela users ou usuarios
  const hasUsers = tables.some(t => t.name === 'users' || t.name === 'usuarios');
  console.log('\nTabela de usuários existe:', hasUsers);
  
  if (hasUsers) {
    const tableName = tables.find(t => t.name === 'users' || t.name === 'usuarios').name;
    console.log(`\nEstrutura da tabela ${tableName}:`);
    db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
      if (err) {
        console.error('Erro ao verificar estrutura:', err);
      } else {
        columns.forEach(col => {
          console.log(`- ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
        });
      }
      db.close();
    });
  } else {
    console.log('\nNenhuma tabela de usuários encontrada.');
    db.close();
  }
});