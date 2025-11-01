const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Testando problema com boolean...');

// Teste 1: Inserir com visivel como boolean true
const testData1 = {
  titulo: 'Teste Boolean True',
  descricao: 'Teste com visivel = true',
  data_inicio: new Date().toISOString(),
  status: 'rascunho',
  preco: 0,
  progresso: 85,
  visivel: true, // Boolean
  thumb_url: null,
  mentor_id: null
};

console.log('📤 Teste 1 - Dados com visivel=true (boolean):', testData1);

db.run(
  'INSERT INTO projetos (titulo, descricao, data_inicio, status, preco, progresso, visivel, thumb_url, mentor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [testData1.titulo, testData1.descricao, testData1.data_inicio, testData1.status, testData1.preco, testData1.progresso || 0, testData1.visivel, testData1.thumb_url, testData1.mentor_id],
  function(err) {
    if (err) {
      console.error('❌ Erro no teste 1:', err);
      return;
    }
    
    const insertedId1 = this.lastID;
    console.log('✅ Teste 1 - Projeto inserido com ID:', insertedId1);
    
    // Verificar o que foi salvo
    db.get('SELECT * FROM projetos WHERE id = ?', [insertedId1], (err, row) => {
      if (err) {
        console.error('❌ Erro ao consultar teste 1:', err);
        return;
      }
      
      console.log('📊 Teste 1 - Resultado no banco:', row);
      console.log('🎯 Teste 1 - Progresso salvo:', row.progresso);
      
      // Teste 2: Inserir com visivel como número 1
      const testData2 = {
        titulo: 'Teste Boolean Number',
        descricao: 'Teste com visivel = 1',
        data_inicio: new Date().toISOString(),
        status: 'rascunho',
        preco: 0,
        progresso: 92,
        visivel: 1, // Número
        thumb_url: null,
        mentor_id: null
      };
      
      console.log('\n📤 Teste 2 - Dados com visivel=1 (número):', testData2);
      
      db.run(
        'INSERT INTO projetos (titulo, descricao, data_inicio, status, preco, progresso, visivel, thumb_url, mentor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [testData2.titulo, testData2.descricao, testData2.data_inicio, testData2.status, testData2.preco, testData2.progresso || 0, testData2.visivel, testData2.thumb_url, testData2.mentor_id],
        function(err) {
          if (err) {
            console.error('❌ Erro no teste 2:', err);
            return;
          }
          
          const insertedId2 = this.lastID;
          console.log('✅ Teste 2 - Projeto inserido com ID:', insertedId2);
          
          // Verificar o que foi salvo
          db.get('SELECT * FROM projetos WHERE id = ?', [insertedId2], (err, row) => {
            if (err) {
              console.error('❌ Erro ao consultar teste 2:', err);
              return;
            }
            
            console.log('📊 Teste 2 - Resultado no banco:', row);
            console.log('🎯 Teste 2 - Progresso salvo:', row.progresso);
            
            db.close();
          });
        }
      );
    });
  }
);