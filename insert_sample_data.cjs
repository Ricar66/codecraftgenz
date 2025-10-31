const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database.sqlite');

// Dados dos projetos
const projetos = [
  {
    titulo: 'OverlayCraft',
    descricao: 'Um utilitário em C# Windows Forms que exibe, em tempo real, uma sobreposição flutuante (overlay) com informações do sistema — CPU, GPU, RAM, IP, sistema operacional e usuário — funcionando como uma marca d\'água transparente, sempre visível e arrastável pela tela, podendo ser minimizado para a bandeja.',
    data_inicio: '2025-05-26',
    status: 'ongoing',
    preco: 150.00,
    visivel: 1
  },
  {
    titulo: 'CleanCraft',
    descricao: 'CleanCraft é uma aplicação desenvolvida para auxiliar o usuário na organização automática de arquivos presentes em sua área de trabalho, nas pastas pessoais (como Documentos, Imagens, Vídeos e Downloads) ou em qualquer outra pasta escolhida. O sistema identifica e agrupa os arquivos por tipo ou extensão, movendo-os para pastas correspondentes.',
    data_inicio: '2025-10-26',
    status: 'rascunho',
    preco: 200.00,
    visivel: 1
  }
];

// Dados dos crafters
const crafters = [
  {
    nome: 'Marcus Facine',
    email: 'marcus.facine@codecraft.com',
    points: 850,
    active: 1
  },
  {
    nome: 'Ana Silva',
    email: 'ana.silva@codecraft.com',
    points: 620,
    active: 1
  },
  {
    nome: 'Carlos Santos',
    email: 'carlos.santos@codecraft.com',
    points: 340,
    active: 1
  },
  {
    nome: 'Beatriz Costa',
    email: 'beatriz.costa@codecraft.com',
    points: 920,
    active: 1
  },
  {
    nome: 'Ricardo Moretti',
    email: 'ricardo.moretti@codecraft.com',
    points: 20,
    active: 1
  }
];

async function insertData() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Inserir projetos
      const insertProject = db.prepare(`
        INSERT INTO projetos (titulo, descricao, data_inicio, status, preco, visivel)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      projetos.forEach(projeto => {
        insertProject.run([
          projeto.titulo,
          projeto.descricao,
          projeto.data_inicio,
          projeto.status,
          projeto.preco,
          projeto.visivel
        ]);
      });

      insertProject.finalize();

      // Inserir crafters
      const insertCrafter = db.prepare(`
        INSERT INTO crafters (nome, email, points, active)
        VALUES (?, ?, ?, ?)
      `);

      crafters.forEach(crafter => {
        insertCrafter.run([
          crafter.nome,
          crafter.email,
          crafter.points,
          crafter.active
        ]);
      });

      insertCrafter.finalize();

      console.log('Dados inseridos com sucesso!');
      
      // Verificar inserção
      db.all("SELECT COUNT(*) as count FROM projetos", (err, rows) => {
        if (err) {
          console.error('Erro ao verificar projetos:', err);
        } else {
          console.log(`Projetos inseridos: ${rows[0].count}`);
        }
      });

      db.all("SELECT COUNT(*) as count FROM crafters", (err, rows) => {
        if (err) {
          console.error('Erro ao verificar crafters:', err);
        } else {
          console.log(`Crafters inseridos: ${rows[0].count}`);
        }
        
        db.close();
        resolve();
      });
    });
  });
}

insertData().catch(console.error);