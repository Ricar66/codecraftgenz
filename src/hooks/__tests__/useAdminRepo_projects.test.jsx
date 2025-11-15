import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/apiConfig.js', () => ({
  apiRequest: vi.fn(async (endpoint) => {
    if (endpoint.startsWith('/api/projetos?all=1')) {
      throw Object.assign(new Error('Resposta da API não é JSON'), { status: 200 });
    }
    if (endpoint.startsWith('/api/projetos')) {
      return { data: [ { id: 1, titulo: 'Público', status: 'finalizado' } ] };
    }
    return {};
  }),
  apiConfig: { baseURL: 'http://localhost:8080' },
}));

import { useProjects } from '../useAdminRepo.js';

describe('useProjects – fallback quando resposta não é JSON', () => {
  it('usa /api/projetos?visivel=true quando admin falhar com não-JSON', async () => {
    const original = import.meta.env.VITE_ADMIN_PUBLIC_FALLBACK;
    import.meta.env.VITE_ADMIN_PUBLIC_FALLBACK = 'true';
    const { result } = renderHook(() => useProjects());
    await act(async () => {});
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data[0].titulo).toBe('Público');
    import.meta.env.VITE_ADMIN_PUBLIC_FALLBACK = original;
  });
});