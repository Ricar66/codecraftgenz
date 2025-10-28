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
      title: 'OverlayCraft',
      description: 'Um utilitário em C# Windows Forms que exibe, em tempo real, uma sobreposição flutuante (overlay) com informações do sistema — CPU, GPU, RAM, IP, sistema operacional e usuário — funcionando como uma marca d\'água transparente, sempre visível e arrastável pela tela, podendo ser minimizado para a bandeja.',
      status: 'in_progress',
      progress: 80,
      imageUrl: '/images/overlaycraft.jpg',
      githubUrl: 'https://github.com/codecraft/overlaycraft',
      technologies: JSON.stringify(['C#', 'Windows Forms', '.NET Framework']),
    },
    {
      id: 'proj_002',
      title: 'CleanCraft',
      description: 'CleanCraft é uma aplicação desenvolvida para auxiliar o usuário na organização automática de arquivos presentes em sua área de trabalho, nas pastas pessoais (como Documentos, Imagens, Vídeos e Downloads) ou em qualquer outra pasta escolhida. O sistema identifica e agrupa os arquivos por tipo ou extensão, movendo-os para pastas correspondentes.',
      status: 'pending',
      progress: 0,
      imageUrl: '/images/cleancraft.jpg',
      githubUrl: 'https://github.com/codecraft/cleancraft',
      technologies: JSON.stringify(['C#', 'File System API', '.NET Core']),
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