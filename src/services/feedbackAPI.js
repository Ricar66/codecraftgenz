// src/services/feedbackAPI.js

// A URL base da API é a raiz do nosso próprio servidor,
// já que o server.js está servindo tanto o frontend quanto a API.
const API_BASE_URL = '/api'; // Aponta para o nosso próprio backend

const MODERATION_ENABLED = (import.meta.env.VITE_FEEDBACK_MODERATION === 'true');

// Validação (mantida do seu código original)
export const FeedbackValidator = {
  maxChars: 500,

  validate(feedback) {
    const errors = [];
    if (!feedback) return { isValid: false, errors: ['Feedback ausente'] };
    const { nome = '', mensagem = '', email = '' } = feedback;

    // Validação do nome
    if (!nome.trim()) {
      errors.push('Nome é obrigatório');
    }

    // Validação da mensagem
    if (!mensagem.trim()) {
      errors.push('Mensagem é obrigatória');
    } else if (mensagem.length < 10) {
      errors.push('Mensagem deve ter pelo menos 10 caracteres');
    } else if (mensagem.length > FeedbackValidator.maxChars) {
      errors.push(`Mensagem deve ter no máximo ${FeedbackValidator.maxChars} caracteres`);
    }

    // Validação do email (opcional, mas se fornecido deve ser válido)
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.push('Email deve ter um formato válido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  sanitize(feedback) {
    return {
      nome: String(feedback.nome || '').trim(),
      email: String(feedback.email || '').trim(),
      mensagem: String(feedback.mensagem || '').trim().slice(0, FeedbackValidator.maxChars),
      origem: feedback.origem || 'pagina_inicial'
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
export async function getFeedbacks({ page = 1, limit = 10, origem = 'pagina_inicial' } = {}) {
  // Constrói a query string
  const params = new URLSearchParams({
    limit: limit.toString()
  });
  
  if (origem) {
    params.append('origem', origem);
  }

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

    // A API backend retorna um array de feedbacks diretamente
    const items = Array.isArray(responseBody) ? responseBody : [];
    console.log(`Recebidos ${items.length} feedbacks da API.`);

    // Simulamos a paginação aqui
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedItems = items.slice((page - 1) * limit, page * limit);

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages
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