import pkg from '@prisma/client';
const { PrismaClient } = pkg;

// Inicializar cliente Prisma
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Conectar ao banco de dados
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados via Prisma');
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  }
}

// Desconectar do banco de dados
async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Desconectado do banco de dados');
  } catch (error) {
    console.error('❌ Erro ao desconectar do banco de dados:', error);
  }
}

// Inicializar conexão
connectDatabase();

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

export { prisma };
export default prisma;