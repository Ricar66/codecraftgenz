import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Populando banco de dados com dados de exemplo...');

  // Criar mentores
  const mentor1 = await prisma.mentor.create({
    data: {
      nome: 'Ana Silva',
      email: 'ana.silva@codecraft.com',
      telefone: '(11) 99999-1111',
      especialidade: 'Frontend Development',
      bio: 'Desenvolvedora Frontend com 8 anos de experiência em React, Vue.js e Angular.',
      linkedin: 'https://linkedin.com/in/ana-silva',
      github: 'https://github.com/ana-silva',
      avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      ativo: true
    }
  });

  const mentor2 = await prisma.mentor.create({
    data: {
      nome: 'Carlos Santos',
      email: 'carlos.santos@codecraft.com',
      telefone: '(11) 99999-2222',
      especialidade: 'Backend Development',
      bio: 'Especialista em Node.js, Python e arquitetura de microsserviços.',
      linkedin: 'https://linkedin.com/in/carlos-santos',
      github: 'https://github.com/carlos-santos',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      ativo: true
    }
  });

  // Criar projetos
  const projeto1 = await prisma.projeto.create({
    data: {
      titulo: 'E-commerce Moderno',
      descricao: 'Desenvolvimento de uma plataforma de e-commerce completa com React, Node.js e PostgreSQL.',
      data_inicio: '2024-01-15',
      status: 'em_andamento',
      preco: 2500.00,
      progresso: 65,
      visivel: true,
      thumb_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=250&fit=crop',
      mentor_id: mentor1.id
    }
  });

  const projeto2 = await prisma.projeto.create({
    data: {
      titulo: 'App Mobile de Delivery',
      descricao: 'Aplicativo mobile para delivery de comida com React Native e integração com APIs de pagamento.',
      data_inicio: '2024-02-01',
      status: 'concluído',
      preco: 3200.00,
      progresso: 100,
      visivel: true,
      thumb_url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=250&fit=crop',
      mentor_id: mentor2.id
    }
  });

  const projeto3 = await prisma.projeto.create({
    data: {
      titulo: 'Dashboard Analytics',
      descricao: 'Dashboard interativo para análise de dados com gráficos em tempo real usando D3.js e WebSockets.',
      data_inicio: '2024-03-10',
      status: 'planejamento',
      preco: 1800.00,
      progresso: 25,
      visivel: true,
      thumb_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop',
      mentor_id: mentor1.id
    }
  });

  // Criar desafios
  const desafio1 = await prisma.desafio.create({
    data: {
      name: 'Desafio Frontend: Landing Page Responsiva',
      objective: 'Criar uma landing page responsiva',
      description: 'Crie uma landing page responsiva usando HTML5, CSS3 e JavaScript vanilla.',
      deadline: new Date('2024-12-31'),
      base_points: 100,
      reward: 'Certificado Frontend',
      status: 'active',
      difficulty: 'starter',
      delivery_type: 'github',
      visible: true,
      created_by: 'Sistema',
      thumb_url: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&h=250&fit=crop'
    }
  });

  const desafio2 = await prisma.desafio.create({
    data: {
      name: 'Desafio Backend: API RESTful',
      objective: 'Desenvolver uma API RESTful completa',
      description: 'Desenvolva uma API RESTful completa com autenticação JWT e documentação Swagger.',
      deadline: new Date('2024-12-31'),
      base_points: 250,
      reward: 'Certificado Backend',
      status: 'active',
      difficulty: 'intermediate',
      delivery_type: 'github',
      visible: true,
      created_by: 'Sistema',
      thumb_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=250&fit=crop'
    }
  });

  const desafio3 = await prisma.desafio.create({
    data: {
      name: 'Desafio Full Stack: Clone do Twitter',
      objective: 'Criar um clone completo do Twitter',
      description: 'Crie um clone completo do Twitter com React, Node.js, MongoDB e funcionalidades em tempo real.',
      deadline: new Date('2024-12-31'),
      base_points: 500,
      reward: 'Certificado Full Stack',
      status: 'active',
      difficulty: 'advanced',
      delivery_type: 'github',
      visible: true,
      created_by: 'Sistema',
      thumb_url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=250&fit=crop'
    }
  });

  // Criar feedbacks
  await prisma.feedback.create({
    data: {
      nome: 'Maria Oliveira',
      email: 'maria@email.com',
      mensagem: 'Excelente plataforma! Os projetos são muito bem estruturados e os mentores são extremamente qualificados.',
      origem: 'pagina_inicial'
    }
  });

  await prisma.feedback.create({
    data: {
      nome: 'João Pedro',
      email: 'joao@email.com',
      mensagem: 'Consegui evoluir muito minha carreira através dos desafios propostos. Recomendo para todos!',
      origem: 'projetos'
    }
  });

  await prisma.feedback.create({
    data: {
      nome: 'Fernanda Costa',
      email: 'fernanda@email.com',
      mensagem: 'A metodologia de ensino é fantástica. Aprendi mais em 3 meses do que em 1 ano estudando sozinha.',
      origem: 'desafios'
    }
  });

  console.log('✅ Dados de exemplo criados com sucesso!');
  console.log(`📊 Criados: ${await prisma.mentor.count()} mentores, ${await prisma.projeto.count()} projetos, ${await prisma.desafio.count()} desafios, ${await prisma.feedback.count()} feedbacks`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao popular banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });