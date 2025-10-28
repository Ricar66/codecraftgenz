// src/lib/prisma.js
import { PrismaClient } from '../generated/prisma/index.js';

// Instância global do Prisma Client
let prisma;

if (process.env.NODE_ENV === 'production') {
  // Em produção, sempre criar uma nova instância
  prisma = new PrismaClient({
    log: ['error'],
  });
} else {
  // Em desenvolvimento, reutilizar a instância para evitar múltiplas conexões
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  prisma = global.__prisma;
}

export default prisma;