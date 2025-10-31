const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database.sqlite');

async function testTop3() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Primeiro, vamos buscar os crafters disponíveis
      db.all("SELECT id, nome, points FROM crafters ORDER BY points DESC", (err, crafters) => {
        if (err) {
          console.error('Erro ao buscar crafters:', err);
          return reject(err);
        }
        
        console.log('Crafters disponíveis:');
        crafters.forEach(c => console.log(`- ID: ${c.id}, Nome: ${c.nome}, Pontos: ${c.points}`));
        
        if (crafters.length < 3) {
          console.log('Não há crafters suficientes para formar um top 3');
          return resolve();
        }
        
        // Definir top 3 baseado nos pontos
        const top3Data = [
          { crafter_id: crafters[0].id, position: 1, reward: 'Troféu de Ouro 🏆' },
          { crafter_id: crafters[1].id, position: 2, reward: 'Troféu de Prata 🥈' },
          { crafter_id: crafters[2].id, position: 3, reward: 'Troféu de Bronze 🥉' }
        ];
        
        console.log('\nDefinindo top 3:');
        top3Data.forEach(t => {
          const crafter = crafters.find(c => c.id === t.crafter_id);
          console.log(`${t.position}º lugar: ${crafter.nome} (${crafter.points} pts) - ${t.reward}`);
        });
        
        // Limpar top3 atual
        db.run('DELETE FROM top3', (deleteErr) => {
          if (deleteErr) {
            console.error('Erro ao limpar top3:', deleteErr);
            return reject(deleteErr);
          }
          
          // Inserir novos dados
          const insertPromises = top3Data.map(item => 
            new Promise((res, rej) => {
              db.run(
                'INSERT INTO top3 (crafter_id, position, reward) VALUES (?, ?, ?)',
                [item.crafter_id, item.position, item.reward],
                function(insertErr) {
                  if (insertErr) rej(insertErr);
                  else res(this.lastID);
                }
              );
            })
          );
          
          Promise.all(insertPromises).then(() => {
            console.log('\nTop 3 definido com sucesso!');
            
            // Verificar se foi inserido corretamente
            db.all(`
              SELECT t.crafter_id, t.position, t.reward, c.nome as name, c.points
              FROM top3 t
              LEFT JOIN crafters c ON t.crafter_id = c.id
              ORDER BY t.position
            `, (verifyErr, results) => {
              if (verifyErr) {
                console.error('Erro ao verificar top3:', verifyErr);
                return reject(verifyErr);
              }
              
              console.log('\nTop 3 atual no banco:');
              results.forEach(r => {
                console.log(`${r.position}º: ${r.name} (${r.points} pts) - ${r.reward}`);
              });
              
              db.close();
              resolve();
            });
          }).catch(reject);
        });
      });
    });
  });
}

testTop3().catch(console.error);