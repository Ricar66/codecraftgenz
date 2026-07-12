import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock da apiRequest central. Guardamos a URL chamada para validar o contrato
// com o backend (o backend e quem filtra rascunhos via ?visivel=true — confirmado
// ao vivo em producao: /api/projetos?visivel=true retorna apenas status publicaveis).
const calls = []
vi.mock('../../lib/apiConfig.js', () => ({
  apiRequest: vi.fn(async (url) => {
    calls.push(url)
    return {
      data: [
        { id: 1, nome: 'Projeto A', status: 'ongoing' },
        { id: 2, nome: 'Projeto B', status: 'finalizado' },
        // aguardando_start deve ser removido no front mesmo que o backend devolva
        { id: 3, nome: 'Projeto C', status: 'aguardando_start' },
      ],
    }
  }),
}))

import { getProjects } from '../../services/projectsAPI.js'

describe('getProjects visibilidade publica', () => {
  beforeEach(() => {
    calls.length = 0
  })

  it('passa visivel=true ao backend quando publicOnly=true', async () => {
    await getProjects({ publicOnly: true, useCache: false })
    expect(calls[0]).toContain('visivel=true')
  })

  it('remove projetos aguardando_start no front quando publicOnly=true', async () => {
    const res = await getProjects({ publicOnly: true, useCache: false })
    const ids = res.data.map(p => p.id)
    expect(ids).not.toContain(3)
    expect(ids).toEqual([1, 2])
  })

  it('nao envia visivel nem filtra quando publicOnly=false', async () => {
    const res = await getProjects({ publicOnly: false, useCache: false })
    expect(calls[0]).not.toContain('visivel=true')
    const ids = res.data.map(p => p.id)
    expect(ids).toEqual([1, 2, 3])
  })
})
