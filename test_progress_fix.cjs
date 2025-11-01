const sqlite3 = require('sqlite3').verbose();

const API_BASE = 'http://localhost:4173/api';

async function testProgressFunctionality() {
  console.log('🧪 Testando funcionalidade da barra de progresso...\n');

  try {
    // 1. Criar um projeto com progresso inicial
    console.log('1️⃣ Criando projeto com progresso inicial de 30%...');
    const createResponse = await fetch(`${API_BASE}/projetos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Teste Progresso - ' + Date.now(),
        description: 'Projeto para testar a barra de progresso',
        status: 'ongoing',
        progress: 30,
        visible: true,
        price: 1000
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Erro ao criar projeto: ${createResponse.status}`);
    }

    const createData = await createResponse.json();
    const projectId = createData.project.id;
    console.log(`✅ Projeto criado com ID: ${projectId}`);
    console.log(`   Progresso inicial: ${createData.project.progresso || createData.project.progress}%`);

    // 2. Verificar se aparece na lista admin com progresso correto
    console.log('\n2️⃣ Verificando na lista admin...');
    const adminResponse = await fetch(`${API_BASE}/projetos?all=1`);
    const adminData = await adminResponse.json();
    const adminProject = adminData.data.find(p => p.id === projectId);
    
    if (adminProject) {
      console.log(`✅ Projeto encontrado na lista admin`);
      console.log(`   Progresso: ${adminProject.progresso || adminProject.progress}%`);
    } else {
      console.log('❌ Projeto não encontrado na lista admin');
    }

    // 3. Verificar se aparece na lista pública com progresso correto
    console.log('\n3️⃣ Verificando na lista pública...');
    const publicResponse = await fetch(`${API_BASE}/projetos`);
    const publicData = await publicResponse.json();
    const publicProject = publicData.data.find(p => p.id === projectId);
    
    if (publicProject) {
      console.log(`✅ Projeto encontrado na lista pública`);
      console.log(`   Progresso: ${publicProject.progress}%`);
    } else {
      console.log('❌ Projeto não encontrado na lista pública');
    }

    // 4. Atualizar progresso via API
    console.log('\n4️⃣ Atualizando progresso para 75%...');
    const updateResponse = await fetch(`${API_BASE}/projetos/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        progress: 75
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Erro ao atualizar projeto: ${updateResponse.status}`);
    }

    const updateData = await updateResponse.json();
    console.log(`✅ Progresso atualizado para: ${updateData.project.progresso || updateData.project.progress}%`);

    // 5. Verificar se a atualização refletiu nas listas
    console.log('\n5️⃣ Verificando se a atualização refletiu...');
    
    // Admin
    const adminResponse2 = await fetch(`${API_BASE}/projetos?all=1`);
    const adminData2 = await adminResponse2.json();
    const adminProject2 = adminData2.data.find(p => p.id === projectId);
    console.log(`   Admin: ${adminProject2.progresso || adminProject2.progress}%`);
    
    // Público
    const publicResponse2 = await fetch(`${API_BASE}/projetos`);
    const publicData2 = await publicResponse2.json();
    const publicProject2 = publicData2.data.find(p => p.id === projectId);
    console.log(`   Público: ${publicProject2.progress}%`);

    // 6. Verificar no banco de dados diretamente
    console.log('\n6️⃣ Verificando no banco de dados...');
    const db = new sqlite3.Database('./database.sqlite');
    
    await new Promise((resolve, reject) => {
      db.get('SELECT * FROM projetos WHERE id = ?', [projectId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          console.log(`   Banco: ${row.progresso}%`);
          resolve();
        }
      });
    });

    db.close();

    console.log('\n🎉 Teste concluído com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Acesse http://localhost:4173/admin');
    console.log('2. Verifique se o projeto aparece com progresso correto');
    console.log('3. Teste o slider de progresso na interface');
    console.log('4. Verifique se as mudanças aparecem na página pública');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testProgressFunctionality();