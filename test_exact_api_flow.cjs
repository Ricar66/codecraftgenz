const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Testando fluxo exato da API...');

// Simular a função normalizeProjetoInput
function normalizeProjetoInput(input) {
  return {
    title: input.title || '',
    description: input.description || '',
    progress: input.progress || 0,
    visible: input.visible !== undefined ? input.visible : true,
    status: input.status || 'draft',
    price: input.price || 0,
    startDate: input.startDate || null,
    thumbUrl: input.thumbUrl || null,
    mentorId: input.mentorId || null
  };
}

// Dados de entrada (simulando req.body)
const reqBody = {
  title: 'Teste Fluxo API',
  description: 'Teste do fluxo exato da API',
  progress: 88,
  visible: true
};

console.log('📤 req.body original:', reqBody);

// Passo 1: Normalizar input
const input = normalizeProjetoInput(reqBody);
console.log('📋 Input normalizado:', input);

// Passo 2: Mapear campos para SQLite (exatamente como no server.js)
const projetoData = {
  titulo: input.title,
  descricao: input.description || '',
  data_inicio: input.startDate || (input.status !== 'draft' ? new Date().toISOString() : null),
  status: input.status === 'draft' ? 'rascunho' : input.status || 'rascunho',
  preco: Number(input.price || 0),
  progresso: Math.max(0, Math.min(100, Number(input.progress || 0))),
  visivel: Boolean(input.visible),
  thumb_url: input.thumbUrl || null,
  mentor_id: input.mentorId || null
};

console.log('🗂️ projetoData criado:', projetoData);
console.log('🎯 Progresso no projetoData:', projetoData.progresso);
console.log('📊 Tipo do progresso:', typeof projetoData.progresso);

// Passo 3: Simular createProjeto (exatamente como no database.js)
const { titulo, descricao, data_inicio, status, preco, progresso, visivel, thumb_url, mentor_id } = projetoData;

console.log('🔧 Valores extraídos:');
console.log('  - titulo:', titulo);
console.log('  - progresso:', progresso);
console.log('  - visivel:', visivel);

console.log('📝 Executando INSERT...');

db.run(
  'INSERT INTO projetos (titulo, descricao, data_inicio, status, preco, progresso, visivel, thumb_url, mentor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [titulo, descricao, data_inicio, status, preco, progresso || 0, visivel, thumb_url, mentor_id],
  function(err) {
    if (err) {
      console.error('❌ Erro na inserção:', err);
      return;
    }
    
    const insertedId = this.lastID;
    console.log('✅ Projeto inserido com ID:', insertedId);
    
    // Verificar o que foi salvo
    db.get('SELECT * FROM projetos WHERE id = ?', [insertedId], (err, row) => {
      if (err) {
        console.error('❌ Erro ao consultar:', err);
        return;
      }
      
      console.log('📊 Resultado final no banco:', row);
      console.log('🎯 Progresso salvo:', row.progresso);
      
      if (row.progresso === 88) {
        console.log('✅ SUCESSO: Progresso salvo corretamente!');
      } else {
        console.log('❌ PROBLEMA: Progresso não foi salvo corretamente');
        console.log('   Esperado: 88, Encontrado:', row.progresso);
      }
      
      db.close();
    });
  }
);