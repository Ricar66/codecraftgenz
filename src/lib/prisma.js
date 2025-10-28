// src/lib/prisma.js
import { PrismaClient } from '../generated/prisma/index.js';

// Instância global do Prisma Client
let prisma;

// eslint-disable-next-line no-undef
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  // Em produção, sempre criar uma nova instância
  prisma = new PrismaClient({
    log: ['error'],
  });
} else {
  // Em desenvolvimento, reutilizar a instância para evitar múltiplas conexões
  // eslint-disable-next-line no-undef
  if (!global.__prisma) {
    // eslint-disable-next-line no-undef
    global.__prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  // eslint-disable-next-line no-undef
  prisma = global.__prisma;
}

export default prisma;