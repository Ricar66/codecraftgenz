// Como o database.js usa ES modules, vou testar diretamente com SQLite
const sqlite3 = require('sqlite3').verbose();

// Simular a função createProjeto
async function createProjeto(projeto) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database('./database.sqlite');
    const { titulo, descricao, data_inicio, status, preco, progresso, visivel, thumb_url, mentor_id } = projeto;
    
    console.log('DEBUG createProjeto - Projeto recebido:', projeto);
    console.log('DEBUG createProjeto - Progresso extraído:', progresso);
    console.log('DEBUG createProjeto - Valores para inserção:', [titulo, descricao, data_inicio, status, preco, progresso || 0, visivel, thumb_url, mentor_id]);
    
    db.run(
      'INSERT INTO projetos (titulo, descricao, data_inicio, status, preco, progresso, visivel, thumb_url, mentor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [titulo, descricao, data_inicio, status, preco, progresso || 0, visivel, thumb_url, mentor_id],
      function(err) {
        if (err) {
          console.error('Erro na inserção:', err);
          reject(err);
        } else {
          console.log('Inserção bem-sucedida, ID:', this.lastID);
          resolve({ id: this.lastID, ...projeto });
        }
        db.close();
      }
    );
  });
}

async function testCreateProjeto() {
  console.log('🧪 Testando função createProjeto simulada...');
  
  const testData = {
    titulo: 'Teste CreateProjeto',
    descricao: 'Teste da função createProjeto',
    data_inicio: new Date().toISOString(),
    status: 'rascunho',
    preco: 0,
    progresso: 88,
    visivel: true,
    thumb_url: null,
    mentor_id: null
  };
  
  console.log('📝 Dados de entrada:', testData);
  
  try {
    const resultado = await createProjeto(testData);
    console.log('✅ Resultado da função:', resultado);
    
    // Verificar no banco
    const db = new sqlite3.Database('./database.sqlite');
    
    db.get('SELECT * FROM projetos WHERE id = ?', [resultado.id], (err, row) => {
      if (err) {
        console.error('❌ Erro ao consultar:', err);
      } else {
        console.log('📊 Projeto no banco:', row);
        console.log('🎯 Progresso no banco:', row.progresso);
      }
      db.close();
    });
    
  } catch (error) {
    console.error('❌ Erro na função createProjeto:', error);
  }
}

testCreateProjeto();