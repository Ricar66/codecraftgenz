// src/services/prismaAPI.js
import prisma from '../lib/prisma.js';

// ==================== PROJECTS API ====================

/**
 * Busca todos os projetos com filtros opcionais
 */
export async function getProjects(filters = {}) {
  try {
    const {
      status,
      search,
      limit = 10,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'desc'
    } = filters;

    const where = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { [orderBy]: orderDirection },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.project.count({ where });

    return {
      success: true,
      data: projects.map(project => ({
        ...project,
        technologies: project.technologies ? JSON.parse(project.technologies) : []
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

/**
 * Busca um projeto por ID
 */
export async function getProjectById(id) {
  try {
    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      return {
        success: false,
        error: 'Projeto não encontrado',
        data: null
      };
    }

    return {
      success: true,
      data: {
        ...project,
        technologies: project.technologies ? JSON.parse(project.technologies) : []
      }
    };
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Cria um novo projeto
 */
export async function createProject(projectData) {
  try {
    const project = await prisma.project.create({
      data: {
        ...projectData,
        technologies: projectData.technologies ? JSON.stringify(projectData.technologies) : null
      }
    });

    return {
      success: true,
      data: {
        ...project,
        technologies: project.technologies ? JSON.parse(project.technologies) : []
      }
    };
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Atualiza um projeto existente
 */
export async function updateProject(id, projectData) {
  try {
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...projectData,
        technologies: projectData.technologies ? JSON.stringify(projectData.technologies) : undefined,
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      data: {
        ...project,
        technologies: project.technologies ? JSON.parse(project.technologies) : []
      }
    };
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Remove um projeto
 */
export async function deleteProject(id) {
  try {
    await prisma.project.delete({
      where: { id }
    });

    return {
      success: true,
      message: 'Projeto removido com sucesso'
    };
  } catch (error) {
    console.error('Erro ao remover projeto:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ==================== FEEDBACKS API ====================

/**
 * Busca todos os feedbacks com filtros opcionais
 */
export async function getFeedbacks(filters = {}) {
  try {
    const {
      type,
      minRating = 1,
      isPublic = true,
      limit = 10,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'desc'
    } = filters;

    const where = {
      rating: { gte: parseInt(minRating) }
    };
    
    if (type && type !== 'all') {
      where.type = type;
    }
    
    if (isPublic !== undefined) {
      where.isPublic = isPublic;
    }

    const feedbacks = await prisma.feedback.findMany({
      where,
      orderBy: { [orderBy]: orderDirection },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.feedback.count({ where });

    return {
      success: true,
      data: feedbacks,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Erro ao buscar feedbacks:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

/**
 * Cria um novo feedback
 */
export async function createFeedback(feedbackData) {
  try {
    const feedback = await prisma.feedback.create({
      data: feedbackData
    });

    return {
      success: true,
      data: feedback
    };
  } catch (error) {
    console.error('Erro ao criar feedback:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Atualiza um feedback existente
 */
export async function updateFeedback(id, feedbackData) {
  try {
    const feedback = await prisma.feedback.update({
      where: { id },
      data: {
        ...feedbackData,
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      data: feedback
    };
  } catch (error) {
    console.error('Erro ao atualizar feedback:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Remove um feedback
 */
export async function deleteFeedback(id) {
  try {
    await prisma.feedback.delete({
      where: { id }
    });

    return {
      success: true,
      message: 'Feedback removido com sucesso'
    };
  } catch (error) {
    console.error('Erro ao remover feedback:', error);
    return {
      success: false,
      error: error.message
    };
  }
}