// prisma/seed.js
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Seed para Projects
  const projects = [
    {
      id: 'proj_001',
      title: 'Sistema de Gestão de Projetos',
      description: 'Aplicação web para gerenciamento de projetos com React e Node.js',
      status: 'completed',
      progress: 100,
      imageUrl: '/images/project1.jpg',
      demoUrl: 'https://demo.projeto1.com',
      githubUrl: 'https://github.com/user/projeto1',
      technologies: JSON.stringify(['React', 'Node.js', 'PostgreSQL', 'Prisma']),
    },
    {
      id: 'proj_002',
      title: 'E-commerce Platform',
      description: 'Plataforma de e-commerce completa com carrinho de compras e pagamentos',
      status: 'in_progress',
      progress: 75,
      imageUrl: '/images/project2.jpg',
      demoUrl: 'https://demo.projeto2.com',
      githubUrl: 'https://github.com/user/projeto2',
      technologies: JSON.stringify(['Next.js', 'Stripe', 'MongoDB', 'Tailwind CSS']),
    },
    {
      id: 'proj_003',
      title: 'Dashboard Analytics',
      description: 'Dashboard para análise de dados com gráficos interativos',
      status: 'pending',
      progress: 30,
      imageUrl: '/images/project3.jpg',
      githubUrl: 'https://github.com/user/projeto3',
      technologies: JSON.stringify(['Vue.js', 'Chart.js', 'Express', 'MySQL']),
    },
  ];

  for (const project of projects) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: project,
      create: project,
    });
  }

  // Seed para Feedbacks
  const feedbacks = [
    {
      id: 'feed_001',
      name: 'Maria Silva',
      email: 'maria@email.com',
      rating: 5,
      message: 'Excelente trabalho! Os projetos são muito bem desenvolvidos e organizados.',
      type: 'general',
      isPublic: true,
    },
    {
      id: 'feed_002',
      name: 'João Santos',
      email: 'joao@email.com',
      rating: 4,
      message: 'Ótima qualidade de código e documentação. Recomendo!',
      type: 'technical',
      isPublic: true,
    },
    {
      id: 'feed_003',
      name: 'Ana Costa',
      rating: 5,
      message: 'Interface muito intuitiva e design moderno. Parabéns!',
      type: 'design',
      isPublic: true,
    },
  ];

  for (const feedback of feedbacks) {
    await prisma.feedback.upsert({
      where: { id: feedback.id },
      update: feedback,
      create: feedback,
    });
  }

  console.log('✅ Seed concluído com sucesso!');
  console.log(`📊 Criados ${projects.length} projetos e ${feedbacks.length} feedbacks`);
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });