async function testAPI() {
  console.log('🌐 Testando API diretamente...');
  
  const testData = {
    title: 'Teste API Direct',
    description: 'Teste direto da API',
    progress: 77,
    visible: true
  };
  
  console.log('📤 Enviando dados:', testData);
  
  try {
    const response = await fetch('http://localhost:4173/api/projetos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    console.log('📥 Resposta da API:', result);
    
    if (result.success && result.project) {
      // Verificar no banco
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database('./database.sqlite');
      
      db.get('SELECT * FROM projetos WHERE id = ?', [result.project.id], (err, row) => {
        if (err) {
          console.error('❌ Erro ao consultar banco:', err);
        } else {
          console.log('📊 Projeto no banco:', row);
          console.log('🎯 Progresso no banco:', row.progresso);
          
          if (row.progresso === 77) {
            console.log('✅ SUCESSO: Progresso salvo corretamente!');
          } else {
            console.log('❌ PROBLEMA: Progresso não foi salvo corretamente');
            console.log('   Esperado: 77, Encontrado:', row.progresso);
          }
        }
        db.close();
      });
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

testAPI();