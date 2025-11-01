const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

// Teste direto no banco de dados
console.log('🔍 Testando inserção direta no banco...');

const testData = {
  titulo: 'Teste Direto DB',
  descricao: 'Teste direto no banco',
  data_inicio: new Date().toISOString(),
  status: 'rascunho',
  preco: 0,
  progresso: 95,
  visivel: 1,
  thumb_url: null,
  mentor_id: null
};

console.log('📝 Dados para inserir:', testData);

db.run(
  'INSERT INTO projetos (titulo, descricao, data_inicio, status, preco, progresso, visivel, thumb_url, mentor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [testData.titulo, testData.descricao, testData.data_inicio, testData.status, testData.preco, testData.progresso, testData.visivel, testData.thumb_url, testData.mentor_id],
  function(err) {
    if (err) {
      console.error('❌ Erro ao inserir:', err);
    } else {
      console.log('✅ Projeto inserido com ID:', this.lastID);
      
      // Verificar o que foi salvo
      db.get('SELECT * FROM projetos WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          console.error('❌ Erro ao consultar:', err);
        } else {
          console.log('📊 Projeto salvo:', row);
          console.log('🎯 Progresso salvo:', row.progresso);
        }
        db.close();
      });
    }
  }
);