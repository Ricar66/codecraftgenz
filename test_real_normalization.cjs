// Função normalizeProjetoInput exata do server.js
function normalizeProjetoInput(input) {
  return {
    title: String(input.title || '').trim(),
    description: String(input.description || '').trim(),
    startDate: input.startDate || null,
    status: input.status || 'rascunho',
    price: Number(input.price || 0),
    progress: Number(input.progress || 0),
    visible: Boolean(input.visible),
    thumbUrl: input.thumbUrl || null,
    mentorId: input.mentorId || null
  };
}

console.log('🔍 Testando normalização real...');

// Dados exatos que estão sendo enviados pela API
const reqBody = {
  title: 'Teste Real Normalization',
  description: 'Teste da normalização real',
  progress: 95,
  visible: true
};

console.log('📤 req.body original:', reqBody);

// Passo 1: Normalizar input (função real)
const input = normalizeProjetoInput(reqBody);
console.log('📋 Input normalizado (função real):', input);

// Passo 2: Mapear campos para SQLite (código exato do server.js)
const projetoData = {
  titulo: input.title,
  descricao: input.description || '',
  data_inicio: input.startDate || (input.status !== 'draft' ? new Date().toISOString() : null),
  status: input.status || 'rascunho',
  preco: Number(input.price || 0),
  progresso: Math.max(0, Math.min(100, Number(input.progress || 0))),
  visivel: Boolean(input.visible),
  thumb_url: input.thumbUrl || null,
  mentor_id: input.mentorId || null
};

console.log('🗂️ projetoData criado (código real):', projetoData);
console.log('🎯 Progresso final:', projetoData.progresso);
console.log('📊 Tipo do progresso:', typeof projetoData.progresso);

// Verificar se há alguma diferença
if (projetoData.progresso === 95) {
  console.log('✅ SUCESSO: Progresso processado corretamente!');
} else {
  console.log('❌ PROBLEMA: Progresso não foi processado corretamente');
  console.log('   Esperado: 95, Encontrado:', projetoData.progresso);
}

// Testar casos extremos
console.log('\n🧪 Testando casos extremos...');

// Teste com progress undefined
const testUndefined = normalizeProjetoInput({ title: 'Test', progress: undefined });
console.log('Progress undefined:', testUndefined.progress);

// Teste com progress null
const testNull = normalizeProjetoInput({ title: 'Test', progress: null });
console.log('Progress null:', testNull.progress);

// Teste com progress string
const testString = normalizeProjetoInput({ title: 'Test', progress: '75' });
console.log('Progress string "75":', testString.progress);

// Teste com progress 0
const testZero = normalizeProjetoInput({ title: 'Test', progress: 0 });
console.log('Progress 0:', testZero.progress);