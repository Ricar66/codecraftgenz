const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🧪 Testando sincronização admin-usuário...\n');

// Função para criar um projeto de teste
function createTestProject() {
  return new Promise((resolve, reject) => {
    const testProject = {
      titulo: `Projeto Teste ${Date.now()}`,
      descricao: 'Projeto criado para testar sincronização',
      data_inicio: new Date().toISOString(),
      status: 'ongoing',
      preco: 1500,
      progresso: 45,
      visivel: true,
      thumb_url: 'https://example.com/thumb.jpg',
      mentor_id: 1
    };

    const query = `
      INSERT INTO projetos (titulo, descricao, data_inicio, status, preco, progresso, visivel, thumb_url, mentor_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [
      testProject.titulo,
      testProject.descricao,
      testProject.data_inicio,
      testProject.status,
      testProject.preco,
      testProject.progresso,
      testProject.visivel,
      testProject.thumb_url,
      testProject.mentor_id
    ], function(err) {
      if (err) {
        reject(err);
      } else {
        console.log(`✅ Projeto de teste criado com ID: ${this.lastID}`);
        resolve({ id: this.lastID, ...testProject });
      }
    });
  });
}

// Função para verificar se o projeto aparece na consulta admin
function checkAdminView() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM projetos ORDER BY created_at DESC LIMIT 5', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        console.log('\n📋 Últimos 5 projetos (visão admin):');
        rows.forEach(project => {
          console.log(`- ID: ${project.id}, Título: ${project.titulo}, Status: ${project.status}, Progresso: ${project.progresso}%, Visível: ${project.visivel}`);
        });
        resolve(rows);
      }
    });
  });
}

// Função para verificar se o projeto aparece na consulta pública
function checkPublicView() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM projetos WHERE visivel = 1 AND status != "rascunho" ORDER BY created_at DESC LIMIT 5', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        console.log('\n🌐 Últimos 5 projetos (visão pública):');
        rows.forEach(project => {
          console.log(`- ID: ${project.id}, Título: ${project.titulo}, Status: ${project.status}, Progresso: ${project.progresso}%, Visível: ${project.visivel}`);
        });
        resolve(rows);
      }
    });
  });
}

// Função para atualizar o progresso de um projeto
function updateProjectProgress(id, newProgress) {
  return new Promise((resolve, reject) => {
    const query = 'UPDATE projetos SET progresso = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    db.run(query, [newProgress, id], function(err) {
      if (err) {
        reject(err);
      } else {
        console.log(`✅ Progresso do projeto ${id} atualizado para ${newProgress}%`);
        resolve();
      }
    });
  });
}

// Executar testes
async function runTests() {
  try {
    // 1. Criar projeto de teste
    const testProject = await createTestProject();
    
    // 2. Verificar visão admin
    await checkAdminView();
    
    // 3. Verificar visão pública
    await checkPublicView();
    
    // 4. Testar atualização de progresso
    console.log('\n🔄 Testando atualização de progresso...');
    await updateProjectProgress(testProject.id, 75);
    
    // 5. Verificar se a atualização foi aplicada
    console.log('\n📊 Verificando atualização:');
    await checkAdminView();
    
    console.log('\n✅ Todos os testes concluídos com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('1. Acesse a página admin em http://localhost:4173/admin');
    console.log('2. Verifique se o novo projeto aparece na lista');
    console.log('3. Teste a barra de progresso');
    console.log('4. Verifique se as mudanças aparecem na página pública');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  } finally {
    db.close();
  }
}

runTests();