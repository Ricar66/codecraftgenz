const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar ao banco de dados
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

async function testSyncronization() {
  console.log('🔄 Testando sincronização entre admin e ranking público...\n');

  // 1. Buscar crafters disponíveis
  const crafters = await new Promise((resolve, reject) => {
    db.all('SELECT * FROM crafters ORDER BY points DESC LIMIT 5', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  console.log('📊 Crafters disponíveis:');
  crafters.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.nome} - ${c.points} pontos`);
  });
  console.log('');

  // 2. Definir um novo top 3 diferente
  const newTop3 = [
    { crafter_id: crafters[2].id, position: 1, reward: 'Troféu de Ouro' },
    { crafter_id: crafters[0].id, position: 2, reward: 'Troféu de Prata' },
    { crafter_id: crafters[4].id, position: 3, reward: 'Troféu de Bronze' }
  ];

  console.log('🏆 Novo top 3 a ser definido:');
  newTop3.forEach(t => {
    const crafter = crafters.find(c => c.id === t.crafter_id);
    console.log(`  ${t.position}º lugar: ${crafter.nome} (${crafter.points} pts) - ${t.reward}`);
  });
  console.log('');

  // 3. Limpar top 3 atual
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM top3', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // 4. Inserir novo top 3
  for (const entry of newTop3) {
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO top3 (crafter_id, position, reward) VALUES (?, ?, ?)',
        [entry.crafter_id, entry.position, entry.reward],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // 5. Verificar se foi salvo corretamente
  const savedTop3 = await new Promise((resolve, reject) => {
    db.all(`
      SELECT t.position, t.reward, c.nome, c.points 
      FROM top3 t 
      JOIN crafters c ON t.crafter_id = c.id 
      ORDER BY t.position
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  console.log('✅ Top 3 salvo no banco:');
  savedTop3.forEach(t => {
    console.log(`  ${t.position}º lugar: ${t.nome} (${t.points} pts) - ${t.reward}`);
  });
  console.log('');

  // 6. Atualizar ranking_settings para simular mudança via admin
  await new Promise((resolve, reject) => {
    db.run(
      'UPDATE ranking_settings SET updated_at = datetime("now"), updated_by = ? WHERE id = 1',
      ['test_sync'],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  console.log('🔄 Ranking atualizado! Agora teste:');
  console.log('  1. Abra http://localhost:8080/admin/ranking');
  console.log('  2. Verifique se o pódio mostra os crafters corretos');
  console.log('  3. Abra http://localhost:8080/ranking');
  console.log('  4. Verifique se o pódio público foi atualizado automaticamente');
  console.log('');
  console.log('🎯 Se ambas as páginas mostram o mesmo pódio, a sincronização está funcionando!');

  db.close();
}

testSyncronization().catch(console.error);