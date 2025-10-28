// src/services/feedbackAPI.js

// A URL base da API é a raiz do nosso próprio servidor,
// já que o server.js está servindo tanto o frontend quanto a API.
const API_BASE_URL = '/api'; // Aponta para o nosso próprio backend

const MODERATION_ENABLED = (import.meta.env.VITE_FEEDBACK_MODERATION === 'true');

// Validação (mantida do seu código original)
export const FeedbackValidator = {
  types: ['elogio', 'sugestao', 'critica'],
  maxChars: 500,
  validate(feedback) {
    const errors = [];
    if (!feedback) return { isValid: false, errors: ['Feedback ausente'] };
    const { message = '', rating, type, avatarUrl = '' } = feedback;
    // Removido a obrigatoriedade de author/company
    // if (author.trim().length === 0 && company.trim().length === 0) {
    //   errors.push('Informe seu nome ou a empresa');
    // }
    if (typeof message !== 'string' || message.trim().length === 0) {
      errors.push('Mensagem é obrigatória');
    }
    if (message.length > this.maxChars) {
      errors.push(`Mensagem deve ter no máximo ${this.maxChars} caracteres`);
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      errors.push('Avaliação deve ser de 1 a 5 estrelas');
    }
    if (!this.types.includes(type)) {
      errors.push(`Tipo deve ser um de: ${this.types.join(', ')}`);
    }
    if (avatarUrl && String(avatarUrl).trim().length > 0) {
      try {
        const u = new URL(String(avatarUrl).trim());
        if (!(u.protocol === 'http:' || u.protocol === 'https:')) {
          errors.push('Avatar/logo deve ser uma URL válida (http/https)');
        }
      } catch {
        errors.push('Avatar/logo deve ser uma URL válida (http/https)');
      }
    }
    return { isValid: errors.length === 0, errors };
  },
  sanitize(feedback) {
     // A sanitização principal agora acontece no backend
     // Aqui apenas garantimos os tipos básicos
    return {
      author: String(feedback.author || '').trim(),
      company: String(feedback.company || '').trim(),
      avatarUrl: String(feedback.avatarUrl || '').trim(),
      message: String(feedback.message || '').trim().slice(0, FeedbackValidator.maxChars),
      rating: Number(feedback.rating || 5),
      type: feedback.type,
    };
  }
};

// Rate limiting e Honeypot (mantidos do seu código)
const RATE_LIMIT_MS = 30_000;
function canSubmitNow() {
  const last = Number(localStorage.getItem(`feedback_last_submit`) || 0); // Chave específica
  const now = Date.now();
  return now - last > RATE_LIMIT_MS;
}
function markSubmitted() {
  localStorage.setItem(`feedback_last_submit`, String(Date.now()));
}
export function isSpamSubmission(honeypotValue) {
  return Boolean(honeypotValue && String(honeypotValue).trim().length > 0);
}

/**
 * Envia um novo feedback para a API backend.
 * @param {object} feedback - Os dados do feedback.
 * @param {object} options - Opções adicionais, como honeypot.
 * @returns {Promise<object>} O feedback criado retornado pela API.
 */
export async function submitFeedback(feedback, { honeypot = '' } = {}) {
  // Verificações iniciais (Honeypot, Rate Limit, Validação)
  if (isSpamSubmission(honeypot)) {
    console.warn('Submissão bloqueada: Honeypot preenchido.');
    throw new Error('Submissão inválida.'); // Mensagem genérica para spam
  }
  if (!canSubmitNow()) {
    throw new Error('Você enviou um feedback há pouco. Tente novamente em instantes.');
  }
  const { isValid, errors } = FeedbackValidator.validate(feedback);
  if (!isValid) {
    const err = new Error('Campos inválidos: ' + errors.join(', '));
    err.details = errors;
    throw err;
  }

  // Sanitiza os dados antes de enviar
  const sanitizedData = FeedbackValidator.sanitize(feedback);

  console.log('Enviando feedback para API:', sanitizedData);

  try {
    const response = await fetch(`${API_BASE_URL}/feedbacks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(sanitizedData),
    });

    // Tenta ler o corpo da resposta mesmo se não for OK, pode ter detalhes do erro
    const responseBody = await response.json().catch(() => ({})); // Retorna {} se não for JSON válido

    if (!response.ok) {
      console.error('Erro da API ao enviar feedback:', response.status, responseBody);
      // Usa a mensagem de erro da API se disponível, senão uma genérica
      throw new Error(responseBody.error || `Erro ${response.status} ao enviar feedback.`);
    }

    console.log('Feedback enviado com sucesso:', responseBody);
    markSubmitted(); // Marca como submetido apenas se a API respondeu OK
    return responseBody; // Retorna o feedback criado pela API (com ID, CreatedAt, etc.)

  } catch (error) {
    console.error('Falha na requisição de envio de feedback:', error);
    // Se for um erro de rede, dá uma mensagem mais amigável
    if (error instanceof TypeError) { // TypeError geralmente indica falha de rede
        throw new Error('Não foi possível conectar ao servidor. Verifique sua internet.');
    }
    // Re-lança o erro (pode ser o erro de validação, rate limit, ou o erro criado a partir da resposta não-OK)
    throw error;
  }
}

/**
 * Busca feedbacks da API backend.
 * @param {object} options - Opções de paginação e filtros.
 * @returns {Promise<object>} Objeto com a lista de items e informações de paginação.
 */
export async function getFeedbacks({ page = 1, limit = 10, type = 'all', minRating = 1 } = {}) {
  // Constrói a query string
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    minRating: minRating.toString()
  });
  if (type !== 'all') {
    params.append('type', type);
  }
  // No backend, a flag `onlyApproved` já é tratada por defeito (Approved = 1)

  const url = `${API_BASE_URL}/feedbacks?${params.toString()}`;
  console.log('Buscando feedbacks da API:', url);

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Erro da API ao buscar feedbacks:', response.status, responseBody);
      throw new Error(responseBody.error || `Erro ${response.status} ao buscar feedbacks.`);
    }

    // A API backend deve retornar um array de feedbacks diretamente
    const items = Array.isArray(responseBody) ? responseBody : [];
    console.log(`Recebidos ${items.length} feedbacks da API.`);

    // Simulamos a paginação aqui, já que o backend retorna apenas TOP 20 por enquanto
    // Em uma API real, o backend faria a paginação completa
    const total = items.length; // Ou viria da API se ela suportasse contagem total
    const totalPages = Math.ceil(total / limit);
    const paginatedItems = items.slice((page - 1) * limit, page * limit);

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total, // Pode não ser o total real, apenas o total retornado (20)
        totalPages // Pode não ser o total real
      }
    };

  } catch (error) {
    console.error('Falha na requisição de busca de feedbacks:', error);
    if (error instanceof TypeError) {
        throw new Error('Não foi possível conectar ao servidor. Verifique sua internet.');
    }
    throw error;
  }
}