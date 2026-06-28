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

