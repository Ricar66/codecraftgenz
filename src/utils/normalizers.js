// src/utils/normalizers.js
// Funções centralizadas de normalização de campos pt-BR (backend) ↔ en-US (frontend)
// Evita duplicação da lógica de mapeamento espalhada pelos services e hooks

// ──────────────────────────────────────────────────────────
// PROJETO
// ──────────────────────────────────────────────────────────

/** Converte objeto do backend para formato frontend */
export function normalizeProject(raw) {
  if (!raw) return raw;
  return {
    ...raw,
    title: raw.titulo ?? raw.title ?? raw.nome ?? '',
    description: raw.descricao ?? raw.description ?? '',
    createdAt: raw.created_at ?? raw.createdAt,
    updatedAt: raw.updated_at ?? raw.updatedAt,
    startDate: raw.data_inicio ?? raw.startDate,
    thumbUrl: raw.thumb_url ?? raw.thumbUrl,
    mentorId: raw.mentor_id ?? raw.mentorId,
    mentorName: raw.mentor_nome ?? raw.mentorName,
    mentorEmail: raw.mentor_email ?? raw.mentorEmail,
    price: raw.preco ?? raw.price,
    progress: raw.progresso ?? raw.progress,
  };
}

/** Converte array de projetos do backend para formato frontend */
export function normalizeProjects(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeProject);
}

/** Converte objeto frontend para payload do backend */
export function denormalizeProject(project) {
  if (!project) return project;
  return {
    titulo: project.titulo ?? project.title,
    owner: project.owner,
    descricao: project.descricao ?? project.description,
    data_inicio: project.data_inicio ?? project.startDate,
    status: project.status,
    preco: project.preco ?? project.price,
    progresso: project.progresso ?? project.progress,
    thumb_url: project.thumb_url ?? project.thumbUrl,
    tecnologias: project.tecnologias ?? project.tags ?? [],
  };
}

// ──────────────────────────────────────────────────────────
// USUÁRIO
// ──────────────────────────────────────────────────────────

/** Converte objeto do backend para formato frontend */
export function normalizeUser(raw) {
  if (!raw) return raw;
  return {
    id: String(raw.id ?? raw.user_id ?? ''),
    name: raw.nome ?? raw.name ?? '',
    email: raw.email ?? '',
    role: raw.role ?? 'viewer',
    status: (raw.status === 'ativo' || raw.status === 'active') ? 'active' : 'inactive',
  };
}

/** Converte array de usuários */
export function normalizeUsers(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeUser);
}

/** Converte objeto frontend para payload do backend */
export function denormalizeUser(user) {
  if (!user) return user;
  const payload = {
    email: user.email,
    role: user.role,
  };
  if (user.name !== undefined) payload.nome = user.name;
  if (user.password !== undefined) payload.senha = user.password;
  if (user.status !== undefined) {
    payload.status = user.status === 'active' ? 'ativo' : 'inativo';
  }
  return payload;
}

// ──────────────────────────────────────────────────────────
// MENTOR
// ──────────────────────────────────────────────────────────

/** Converte objeto do backend para formato frontend */
export function normalizeMentor(raw) {
  if (!raw) return raw;
  return {
    ...raw,
    name: raw.name ?? raw.nome ?? '',
    specialty: raw.specialty ?? raw.especialidade ?? '',
    bio: raw.bio ?? raw.descricao ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? raw.telefone ?? '',
    avatar_url: raw.avatar_url ?? raw.foto_url ?? raw.photo ?? '',
    photo: raw.photo ?? '',
    status: raw.status ?? 'published',
    visible: raw.visible !== false,
  };
}

/** Converte array de mentores */
export function normalizeMentors(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeMentor);
}

/** Converte objeto frontend para payload do backend */
export function denormalizeMentor(mentor) {
  if (!mentor) return mentor;
  return {
    nome: mentor.nome ?? mentor.name,
    especialidade: mentor.especialidade ?? mentor.specialty,
    bio: mentor.bio ?? mentor.descricao,
    email: mentor.email,
    telefone: mentor.telefone ?? mentor.phone,
    avatar_url: mentor.avatar_url ?? mentor.photo ?? '',
    status: mentor.status ?? 'published',
    visible: mentor.visible !== false,
  };
}

// ──────────────────────────────────────────────────────────
// CRAFTER / RANKING
// ──────────────────────────────────────────────────────────

/** Converte entrada top3 do backend para formato frontend */
export function normalizeTop3Entry(raw, fallbackIndex = 0) {
  if (!raw) return raw;
  return {
    crafter_id: raw.crafter_id ?? raw.crafterId ?? raw.id,
    position: raw.position ?? raw.posicao ?? fallbackIndex + 1,
    reward: raw.reward ?? raw.recompensa ?? '',
  };
}

/** Converte array de top3 */
export function normalizeTop3(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeTop3Entry);
}
