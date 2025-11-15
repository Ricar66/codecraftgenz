import { describe, it, expect, vi } from 'vitest'

vi.mock('../../lib/apiConfig.js', () => ({
  apiRequest: vi.fn(async () => ({
    data: [
      { id: 1, titulo: 'Projeto A', status: 'rascunho' },
      { id: 2, titulo: 'Projeto B', status: 'ongoing' },
      { id: 3, titulo: 'Projeto C', status: 'finalizado' },
      { id: 4, titulo: 'Projeto D', status: 'draft' }
    ]
  }))
}))

import { getProjects } from '../../services/projectsAPI.js'

describe('getProjects visibilidade pública', () => {

  it('filtra rascunho/draft quando publicOnly=true', async () => {
    const res = await getProjects({ publicOnly: true, useCache: false })
    const ids = res.data.map(p => p.id)
    expect(ids).toEqual([2, 3])
  })

  it('não filtra quando publicOnly=false', async () => {
    const res = await getProjects({ publicOnly: false, useCache: false })
    const ids = res.data.map(p => p.id)
    expect(ids).toEqual([1, 2, 3, 4])
  })
})