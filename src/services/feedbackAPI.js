// src/services/feedbackAPI.js

const FEEDBACK_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const MODERATION_ENABLED = (import.meta.env.VITE_FEEDBACK_MODERATION === 'true');
const STORAGE_KEY = 'cc_feedbacks_v1';

// Simple validation and sanitization
export const FeedbackValidator = {
  types: ['elogio', 'sugestao', 'critica'],
  maxChars: 500,
  validate(feedback) {
    const errors = [];
    if (!feedback) return { isValid: false, errors: ['Feedback ausente'] };
    const { author = '', company = '', message = '', rating, type, avatarUrl = '' } = feedback;
    if (author.trim().length === 0 && company.trim().length === 0) {
      errors.push('Informe seu nome ou a empresa');
    }
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
    // Optional avatar/logo URL validation
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
    const safeText = String(feedback.message || '')
      .replace(/<[^>]*>/g, '')
      .slice(0, FeedbackValidator.maxChars);
    const rawAvatar = String(feedback.avatarUrl || '').trim();
    let safeAvatar = '';
    if (rawAvatar) {
      try {
        const u = new URL(rawAvatar);
        if (u.protocol === 'http:' || u.protocol === 'https:') {
          safeAvatar = rawAvatar;
        }
      } catch {
        safeAvatar = '';
      }
    }
    return {
      id: feedback.id || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      author: String(feedback.author || '').trim(),
      company: String(feedback.company || '').trim(),
      avatarUrl: safeAvatar,
      message: safeText,
      rating: Number(feedback.rating || 5),
      type: feedback.type,
      createdAt: new Date().toISOString(),
      approved: MODERATION_ENABLED ? false : true,
    };
  }
};

// localStorage fallback store
function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function writeLocal(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// Basic rate-limit: 1 submission per 30s per browser
const RATE_LIMIT_MS = 30_000;
function canSubmitNow() {
  const last = Number(localStorage.getItem(`${STORAGE_KEY}:last_submit`) || 0);
  const now = Date.now();
  return now - last > RATE_LIMIT_MS;
}
function markSubmitted() {
  localStorage.setItem(`${STORAGE_KEY}:last_submit`, String(Date.now()));
}

// Honeypot check (pass a hidden field and verify it's empty)
export function isSpamSubmission(honeypotValue) {
  return Boolean(honeypotValue && String(honeypotValue).trim().length > 0);
}

export async function submitFeedback(feedback, { useMockData = true, honeypot = '' } = {}) {
  if (isSpamSubmission(honeypot)) {
    throw new Error('Submissão identificada como spam');
  }
  if (!canSubmitNow()) {
    throw new Error('Você enviou um feedback há pouco. Tente novamente em instantes.');
  }
  const { isValid, errors } = FeedbackValidator.validate(feedback);
  if (!isValid) {
    const err = new Error('Campos inválidos');
    err.details = errors;
    throw err;
  }

  const sanitized = FeedbackValidator.sanitize(feedback);

  // If backend available, send it there; otherwise store local
  if (!useMockData) {
    try {
      const res = await fetch(`${FEEDBACK_BASE_URL}/feedbacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(sanitized),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      markSubmitted();
      return data;
    } catch {
      // fallback local
      const list = readLocal();
      list.unshift(sanitized);
      writeLocal(list);
      markSubmitted();
      return sanitized;
    }
  } else {
    const list = readLocal();
    list.unshift(sanitized);
    writeLocal(list);
    markSubmitted();
    return sanitized;
  }
}

export async function getFeedbacks({ page = 1, limit = 10, type = 'all', minRating = 1, onlyApproved = true } = {}) {
  // Try API, fallback local
  let all = [];
  try {
    const res = await fetch(`${FEEDBACK_BASE_URL}/feedbacks?page=${page}&limit=${limit}&type=${type}&minRating=${minRating}&onlyApproved=${onlyApproved}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    all = Array.isArray(data.items) ? data.items : [];
  } catch {
    all = readLocal();
  }

  // Filter and moderation
  const filtered = all.filter(f => {
    const typeOk = type === 'all' ? true : f.type === type;
    const ratingOk = Number(f.rating || 0) >= Number(minRating || 1);
    const modOk = onlyApproved ? f.approved === true : true;
    return typeOk && ratingOk && modOk;
  });

  // Sort by date desc
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Pagination
  const total = filtered.length;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}