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
});

// Verificar total de projetos
db.get('SELECT COUNT(*) as count FROM projetos', (err, row) => {
  if (err) {
    console.error('Erro ao contar projetos:', err.message);
  } else {
    console.log('Total de projetos no banco:', row.count);
  }
});

// Verificar projetos visíveis
db.get('SELECT COUNT(*) as count FROM projetos WHERE visivel = 1', (err, row) => {
  if (err) {
    console.error('Erro ao contar projetos visíveis:', err.message);
  } else {
    console.log('Projetos visíveis:', row.count);
  }
});

// Listar alguns projetos
db.all('SELECT id, titulo, descricao, visivel, status FROM projetos LIMIT 5', (err, rows) => {
  if (err) {
    console.error('Erro ao listar projetos:', err.message);
  } else {
    console.log('\nPrimeiros 5 projetos:');
    rows.forEach(project => {
      console.log(`- ID: ${project.id}, Título: ${project.titulo}, Visível: ${project.visivel}, Status: ${project.status}`);
    });
  }
  
  db.close((err) => {
    if (err) {
      console.error('Erro ao fechar o banco:', err.message);
    } else {
      console.log('\nConexão com o banco fechada.');
    }
  });
});