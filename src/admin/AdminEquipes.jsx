// src/admin/AdminEquipes.jsx
// Refatorado para usar Design System CodeCraft
import React, { useState, useEffect, useMemo } from 'react';
import { FaUsers, FaUserTie, FaProjectDiagram, FaClipboardList, FaPlus, FaTrash, FaLink, FaDownload, FaCheck, FaSearch } from 'react-icons/fa';

import { apiRequest } from '../lib/apiConfig.js';
import { getAll as getAllProjects } from '../services/projectsAPI.js';

import AdminCard from './components/AdminCard';
import StatusBadge from './components/StatusBadge';
import styles from './AdminEquipes.module.css';

export default function AdminEquipes() {
  const [mentores, setMentores] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [crafters, setCrafters] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mentores');
  const [message, setMessage] = useState('');

  const [filtroMentor, setFiltroMentor] = useState('');
  const [filtroCrafter, setFiltroCrafter] = useState('');
  const [filtroStatusCrafter, setFiltroStatusCrafter] = useState('todos');

  const [novoCrafter, setNovoCrafter] = useState({ nome: '', email: '', avatar_url: '' });
  const [novaEquipe, setNovaEquipe] = useState({
    mentor_id: '',
    crafter_ids: [],
    projeto_id: '',
    status_inscricao: 'inscrito'
  });
  const [mentorProjeto, setMentorProjeto] = useState({ projeto_id: '', mentor_id: '' });

  const equipesAgrupadas = useMemo(() =>
    equipes.reduce((acc, equipe) => {
      if (!acc[equipe.projeto_id]) {
        acc[equipe.projeto_id] = [];
      }
      acc[equipe.projeto_id].push(equipe);
      return acc;
    }, {}), [equipes]
  );

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const preNome = params.get('prefill_nome');
      const preEmail = params.get('prefill_email');
      const preAvatar = params.get('prefill_avatar_url');
      const scrollTarget = params.get('scroll');

      if (preNome || preEmail || preAvatar) {
        setActiveTab('mentores');
        setNovoCrafter(prev => ({
          nome: preNome || prev.nome || '',
          email: preEmail || prev.email || '',
          avatar_url: preAvatar || prev.avatar_url || ''
        }));
        setMessage('Campos do crafter pré-preenchidos a partir da inscrição.');

        if (scrollTarget === 'create-crafter') {
          setTimeout(() => {
            const el = document.getElementById('create-crafter');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }
      }
    } catch {
      // silencioso
    }
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [mentoresData, projetosData, craftersData, equipesData] = await Promise.all([
        apiRequest('/api/mentores', { method: 'GET' }),
        getAllProjects(),
        apiRequest('/api/crafters', { method: 'GET' }),
        apiRequest('/api/equipes', { method: 'GET' })
      ]);

      const mentoresNormalizados = (mentoresData.data || []).map(mentor => ({
        id: mentor.id,
        nome: mentor.nome,
        email: mentor.email,
        telefone: mentor.telefone,
        bio: mentor.bio,
        avatar_url: mentor.avatar_url || mentor.foto_url || mentor.photo || '',
        visible: mentor.visible
      }));

      setMentores(mentoresNormalizados);
      setProjetos(Array.isArray(projetosData) ? projetosData : []);
      setCrafters(craftersData.data || []);
      setEquipes(equipesData.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const crafterTeamsMap = useMemo(() => {
    const map = {};
    equipes.forEach(equipe => {
      if (!map[equipe.crafter_id]) {
        map[equipe.crafter_id] = [];
      }
      map[equipe.crafter_id].push(equipe);
    });
    return map;
  }, [equipes]);

  // Auditoria de relacionamentos
  const mentoresSemProjeto = useMemo(() =>
    mentores.filter(m => !equipes.some(e => e.mentor_id === m.id)),
    [mentores, equipes]
  );

  const projetosSemMentor = useMemo(() =>
    projetos.filter(p => !equipes.some(e => e.projeto_id === p.id)),
    [projetos, equipes]
  );

  const projetosComMultMentores = useMemo(() =>
    projetos.filter(p => {
      const mentorsSet = new Set(
        equipes.filter(e => e.projeto_id === p.id).map(e => e.mentor_id)
      );
      return mentorsSet.size > 1;
    }),
    [projetos, equipes]
  );

  const craftersSemEquipe = useMemo(() =>
    crafters.filter(c => !equipes.some(e => e.crafter_id === c.id)),
    [crafters, equipes]
  );

  const craftersEmMultEquipes = useMemo(() => {
    const countMap = {};
    equipes.forEach(e => {
      countMap[e.crafter_id] = (countMap[e.crafter_id] || 0) + 1;
    });
    return crafters.filter(c => (countMap[c.id] || 0) > 1);
  }, [equipes, crafters]);

  const equipesRefsInvalidas = useMemo(() =>
    equipes.filter(e =>
      !mentores.find(m => m.id === e.mentor_id) ||
      !crafters.find(c => c.id === e.crafter_id) ||
      !projetos.find(p => p.id === e.projeto_id)
    ),
    [equipes, mentores, crafters, projetos]
  );

  const equipesDuplicadas = useMemo(() => {
    const seen = {};
    const dupes = [];
    equipes.forEach(e => {
      const key = `${e.mentor_id}-${e.crafter_id}-${e.projeto_id}`;
      if (seen[key]) {
        dupes.push(e);
      } else {
        seen[key] = true;
      }
    });
    return dupes;
  }, [equipes]);

  const mentoresFiltrados = useMemo(() =>
    mentores.filter(mentor =>
      mentor.nome.toLowerCase().includes(filtroMentor.toLowerCase()) ||
      mentor.email.toLowerCase().includes(filtroMentor.toLowerCase())
    ), [mentores, filtroMentor]
  );

  const craftersFiltrados = useMemo(() =>
    crafters.filter(crafter => {
      const matchesName = crafter.nome.toLowerCase().includes(filtroCrafter.toLowerCase()) ||
                         crafter.email.toLowerCase().includes(filtroCrafter.toLowerCase());

      if (filtroStatusCrafter === 'todos') return matchesName;

      const crafterTeams = crafterTeamsMap[crafter.id] || [];
      if (filtroStatusCrafter === 'disponivel') return matchesName && crafterTeams.length === 0;
      if (filtroStatusCrafter === 'ocupado') return matchesName && crafterTeams.length > 0;

      return matchesName;
    }), [crafters, filtroCrafter, filtroStatusCrafter, crafterTeamsMap]
  );

  const criarCrafter = async (e) => {
    e.preventDefault();
    try {
      const emailNorm = (novoCrafter.email || '').trim().toLowerCase();
      if (!emailNorm) {
        setMessage('Informe um email válido para criar o crafter.');
        return;
      }
      const jaExiste = crafters.some(c => (c.email || '').trim().toLowerCase() === emailNorm);
      if (jaExiste) {
        setMessage('Já existe um crafter com este email.');
        alert('Já existe um crafter com este email.');
        return;
      }

      const response = await apiRequest('/api/crafters', {
        method: 'POST',
        body: JSON.stringify(novoCrafter)
      });

      if (response) {
        setNovoCrafter({ nome: '', email: '', avatar_url: '' });
        carregarDados();
      }
    } catch (error) {
      console.error('Erro ao criar crafter:', error);
    }
  };

  const associarMentorProjeto = async (e) => {
    e.preventDefault();
    try {
      const response = await apiRequest(`/api/projetos/${mentorProjeto.projeto_id}/mentor`, {
        method: 'POST',
        body: JSON.stringify({ mentor_id: mentorProjeto.mentor_id })
      });

      if (response) {
        setMentorProjeto({ projeto_id: '', mentor_id: '' });
        carregarDados();
      }
    } catch (error) {
      console.error('Erro ao associar mentor ao projeto:', error);
    }
  };

  const criarEquipe = async (e) => {
    e.preventDefault();
    try {
      if (novaEquipe.crafter_ids.length === 0) {
        alert('Selecione pelo menos um crafter para a equipe');
        return;
      }

      const responses = await Promise.all(
        novaEquipe.crafter_ids.map(crafter_id =>
          apiRequest('/api/equipes', {
            method: 'POST',
            body: JSON.stringify({
              mentor_id: novaEquipe.mentor_id,
              crafter_id: crafter_id,
              projeto_id: novaEquipe.projeto_id,
              status_inscricao: novaEquipe.status_inscricao
            })
          })
        )
      );

      const allSuccessful = responses.every(Boolean);

      if (allSuccessful) {
        setNovaEquipe({
          mentor_id: '',
          crafter_ids: [],
          projeto_id: '',
          status_inscricao: 'inscrito'
        });
        carregarDados();
        alert(`Equipe criada com sucesso! ${novaEquipe.crafter_ids.length} crafter(s) adicionado(s).`);
      } else {
        throw new Error('Algumas equipes não puderam ser criadas');
      }
    } catch (error) {
      console.error('Erro ao criar equipe:', error);
      alert('Erro ao criar equipe: ' + error.message);
    }
  };

  const removerCrafterDaEquipe = async (equipeId) => {
    if (!window.confirm('Tem certeza que deseja remover este crafter da equipe?')) {
      return;
    }

    try {
      const response = await apiRequest(`/api/equipes/${equipeId}`, { method: 'DELETE' });

      if (response) {
        setMessage('Crafter removido da equipe com sucesso!');
        carregarDados();
      } else {
        throw new Error('Erro ao remover crafter da equipe');
      }
    } catch (error) {
      console.error('Erro ao remover crafter:', error);
      setMessage('Erro ao remover crafter da equipe');
    }
  };

  const adicionarCrafterNaEquipe = async (mentorId, projetoId, crafterId) => {
    if (!crafterId) return;

    try {
      const novaEquipeData = {
        mentor_id: mentorId,
        crafter_id: crafterId,
        projeto_id: projetoId,
        status_inscricao: 'inscrito'
      };

      const response = await apiRequest('/api/equipes', {
        method: 'POST',
        body: JSON.stringify(novaEquipeData)
      });

      if (response) {
        setMessage('Crafter adicionado à equipe com sucesso!');
        carregarDados();
      } else {
        throw new Error('Erro ao adicionar crafter à equipe');
      }
    } catch (error) {
      console.error('Erro ao adicionar crafter:', error);
      setMessage('Erro ao adicionar crafter à equipe');
    }
  };

  const alterarStatusEquipe = async (equipeId, novoStatus) => {
    try {
      const response = await apiRequest(`/api/equipes/${equipeId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status_inscricao: novoStatus })
      });
      if (response) {
        carregarDados();
      }
    } catch (error) {
      console.error('Erro ao alterar status da equipe:', error);
    }
  };

  const exportarAuditoria = () => {
    const headers = ['categoria','id','nome','email','titulo_projeto'];
    const rows = [];
    mentoresSemProjeto.forEach(m => rows.push(['mentor_sem_projeto', m.id, m.nome || '', m.email || '', '']));
    projetosSemMentor.forEach(p => rows.push(['projeto_sem_mentor', p.id, '', '', p.titulo || `Projeto #${p.id}`]));
    projetosComMultMentores.forEach(p => rows.push(['projeto_multiplos_mentores', p.id, '', '', p.titulo || `Projeto #${p.id}`]));
    craftersSemEquipe.forEach(c => rows.push(['crafter_sem_equipe', c.id, c.nome || '', c.email || '', '']));
    craftersEmMultEquipes.forEach(c => rows.push(['crafter_multiplas_equipes', c.id, c.nome || '', c.email || '', '']));
    equipesRefsInvalidas.forEach(e => rows.push(['equipe_ref_invalida', e.id, e.nome || '', '', '']));
    equipesDuplicadas.forEach(e => rows.push(['equipe_duplicada', e.id, e.nome || '', '', '']));
    const csv = [headers.join(','), ...rows.map(r => r.map(v => String(v).replace(/\n/g,' ').replace(/"/g,'"')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'auditoria_equipes.csv'; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Carregando dados de mentores, crafters e projetos...</p>
        </div>
      </div>
    );
  }

  const projetoSelecionado = projetos.find(p => p.id === novaEquipe.projeto_id);
  const mentorSelecionado = mentores.find(m => m.id === novaEquipe.mentor_id);

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <FaUsers className={styles.headerIcon} />
          <div>
            <h1>Gerenciamento de Equipes</h1>
            <p>{mentores.length} mentores | {crafters.length} crafters | {equipes.length} equipes</p>
          </div>
        </div>
      </header>

      {/* Mensagem de feedback */}
      {message && (
        <div className={`${styles.message} ${message.includes('Erro') ? styles.error : styles.success}`}>
          {message}
          <button onClick={() => setMessage('')} className={styles.closeMessage}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'mentores' ? styles.active : ''}`}
          onClick={() => setActiveTab('mentores')}
        >
          <FaUserTie /> Mentores
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'associacoes' ? styles.active : ''}`}
          onClick={() => setActiveTab('associacoes')}
        >
          <FaLink /> Associações
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'equipes' ? styles.active : ''}`}
          onClick={() => setActiveTab('equipes')}
        >
          <FaProjectDiagram /> Equipes
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'auditoria' ? styles.active : ''}`}
          onClick={() => setActiveTab('auditoria')}
        >
          <FaClipboardList /> Auditoria
        </button>
      </div>

      {/* Tab: Mentores */}
      {activeTab === 'mentores' && (
        <div className={styles.tabContent}>
          <AdminCard variant="elevated" className={styles.section}>
            <h2 className={styles.sectionTitle}>Mentores Disponíveis</h2>
            <p className={styles.infoText}>
              Os mentores são gerenciados na <strong>página de Mentores</strong> do sistema.
            </p>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Telefone</th>
                    <th>Status</th>
                    <th>Bio</th>
                  </tr>
                </thead>
                <tbody>
                  {mentores.map(mentor => (
                    <tr key={mentor.id}>
                      <td data-label="Nome">{mentor.nome}</td>
                      <td data-label="Email">{mentor.email}</td>
                      <td data-label="Telefone">{mentor.telefone || '-'}</td>
                      <td data-label="Status">
                        <StatusBadge variant={mentor.visible ? 'success' : 'neutral'}>
                          {mentor.visible ? 'Visível' : 'Oculto'}
                        </StatusBadge>
                      </td>
                      <td data-label="Bio">{mentor.bio ? mentor.bio.substring(0, 50) + '...' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>

          <AdminCard variant="elevated" className={styles.section} id="create-crafter">
            <h2 className={styles.sectionTitle}><FaPlus /> Criar Novo Crafter</h2>
            <form onSubmit={criarCrafter} className={styles.form}>
              <div className={styles.formRow}>
                <input
                  type="text"
                  placeholder="Nome"
                  value={novoCrafter.nome}
                  onChange={(e) => setNovoCrafter({...novoCrafter, nome: e.target.value})}
                  className={styles.input}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={novoCrafter.email}
                  onChange={(e) => setNovoCrafter({...novoCrafter, email: e.target.value})}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formRow}>
                <input
                  type="url"
                  placeholder="URL do Avatar"
                  value={novoCrafter.avatar_url}
                  onChange={(e) => setNovoCrafter({...novoCrafter, avatar_url: e.target.value})}
                  className={styles.input}
                />
              </div>
              <button type="submit" className={styles.primaryBtn}>
                <FaPlus /> Criar Crafter
              </button>
            </form>
          </AdminCard>

          <AdminCard variant="elevated" className={styles.section}>
            <h2 className={styles.sectionTitle}><FaProjectDiagram /> Equipes Existentes</h2>
            <p className={styles.infoText}>
              Visualize e edite as equipes já formadas.
            </p>

            {Object.keys(equipesAgrupadas).length === 0 ? (
              <div className={styles.emptyState}>
                <p>Nenhuma equipe criada ainda.</p>
              </div>
            ) : (
              <div className={styles.teamsList}>
                {Object.entries(equipesAgrupadas).map(([projetoId, projetos]) => (
                  <div key={projetoId} className={styles.projectGroup}>
                    <h3 className={styles.projectTitle}>
                      <FaProjectDiagram /> {projetos[0]?.projeto_titulo || 'Projeto sem título'}
                    </h3>

                    {Object.entries(projetos.reduce((acc, equipe) => {
                      const mentorKey = `${equipe.mentor_id}-${equipe.mentor_nome}`;
                      if (!acc[mentorKey]) acc[mentorKey] = [];
                      acc[mentorKey].push(equipe);
                      return acc;
                    }, {})).map(([mentorKey, equipesDoMentor]) => {
                      const [mentorId, mentorNome] = mentorKey.split('-');
                      return (
                        <div key={mentorKey} className={styles.mentorTeamGroup}>
                          <div className={styles.mentorHeader}>
                            <h4><FaUserTie /> {mentorNome}</h4>
                            <StatusBadge variant="info">
                              {equipesDoMentor.length} crafter{equipesDoMentor.length !== 1 ? 's' : ''}
                            </StatusBadge>
                          </div>

                          <div className={styles.teamMembers}>
                            {equipesDoMentor.map(equipe => (
                              <div key={equipe.id} className={styles.teamMemberCard}>
                                <div className={styles.memberInfo}>
                                  <div className={styles.memberAvatar}>
                                    {equipe.crafter_avatar_url ? (
                                      <img src={equipe.crafter_avatar_url} alt={equipe.crafter_nome} />
                                    ) : (
                                      <div className={styles.avatarPlaceholder}>
                                        {equipe.crafter_nome?.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className={styles.memberDetails}>
                                    <strong>{equipe.crafter_nome}</strong>
                                    <small>{equipe.crafter_email}</small>
                                    <StatusBadge
                                      variant={
                                        equipe.status_inscricao === 'finalizado' ? 'success' :
                                        equipe.status_inscricao === 'confirmado' ? 'info' : 'warning'
                                      }
                                      size="sm"
                                    >
                                      {equipe.status_inscricao === 'inscrito' && 'Inscrito'}
                                      {equipe.status_inscricao === 'confirmado' && 'Confirmado'}
                                      {equipe.status_inscricao === 'finalizado' && 'Finalizado'}
                                    </StatusBadge>
                                  </div>
                                </div>

                                <div className={styles.memberActions}>
                                  <select
                                    value={equipe.status_inscricao}
                                    onChange={(e) => alterarStatusEquipe(equipe.id, e.target.value)}
                                    className={styles.statusSelect}
                                  >
                                    <option value="inscrito">Inscrito</option>
                                    <option value="confirmado">Confirmado</option>
                                    <option value="finalizado">Finalizado</option>
                                  </select>

                                  <button
                                    onClick={() => removerCrafterDaEquipe(equipe.id)}
                                    className={styles.dangerBtn}
                                    title="Remover crafter da equipe"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className={styles.addCrafterSection}>
                            <h5><FaPlus /> Adicionar Crafter à Equipe</h5>
                            <select
                              value=""
                              onChange={(e) => adicionarCrafterNaEquipe(mentorId, projetoId, e.target.value)}
                              className={styles.select}
                            >
                              <option value="">Selecione um crafter para adicionar...</option>
                              {crafters
                                .filter(crafter => !equipesDoMentor.some(eq => eq.crafter_id === crafter.id))
                                .map(crafter => (
                                  <option key={crafter.id} value={crafter.id}>
                                    {crafter.nome} - {crafter.email}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>
      )}

      {/* Tab: Associações */}
      {activeTab === 'associacoes' && (
        <div className={styles.tabContent}>
          {/* Mentores Disponíveis */}
          <AdminCard variant="elevated" className={styles.section}>
            <h2 className={styles.sectionTitle}><FaUserTie /> Mentores Disponíveis</h2>
            <div className={styles.filterBar}>
              <div className={styles.searchBox}>
                <FaSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={filtroMentor}
                  onChange={(e) => setFiltroMentor(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </div>

            {mentoresFiltrados.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Nenhum mentor encontrado.</p>
              </div>
            ) : (
              <div className={styles.mentoresGrid}>
                {mentoresFiltrados.map(mentor => (
                  <div key={mentor.id} className={styles.mentorCard}>
                    <div className={styles.mentorCardHeader}>
                      <div className={styles.mentorAvatar}>
                        {mentor.avatar_url ? (
                          <img src={mentor.avatar_url} alt={mentor.nome} />
                        ) : (
                          <div className={styles.avatarPlaceholder}>
                            {mentor.nome.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className={styles.mentorInfo}>
                        <h4>{mentor.nome}</h4>
                        <p>{mentor.email}</p>
                        {mentor.telefone && <small>{mentor.telefone}</small>}
                      </div>
                    </div>

                    {mentor.bio && (
                      <div className={styles.mentorBio}>
                        <p>{mentor.bio}</p>
                      </div>
                    )}

                    <div className={styles.mentorProjects}>
                      <h5>Projetos Associados:</h5>
                      {projetos.filter(p =>
                        equipes.some(t => t.mentor_id === mentor.id && t.projeto_id === p.id)
                      ).length === 0 ? (
                        <span className={styles.noProjects}>Nenhum projeto associado</span>
                      ) : (
                        <div className={styles.projectsList}>
                          {projetos.filter(p =>
                            equipes.some(t => t.mentor_id === mentor.id && t.projeto_id === p.id)
                          ).map(projeto => (
                            <StatusBadge key={projeto.id} variant="primary" size="sm">
                              {projeto.titulo}
                            </StatusBadge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          {/* Crafters Cadastrados */}
          <AdminCard variant="elevated" className={styles.section}>
            <h2 className={styles.sectionTitle}><FaUsers /> Crafters Cadastrados</h2>
            <div className={styles.filterBar}>
              <div className={styles.searchBox}>
                <FaSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={filtroCrafter}
                  onChange={(e) => setFiltroCrafter(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
              <select
                value={filtroStatusCrafter}
                onChange={(e) => setFiltroStatusCrafter(e.target.value)}
                className={styles.select}
              >
                <option value="todos">Todos</option>
                <option value="disponivel">Disponíveis</option>
                <option value="ocupado">Em Equipes</option>
              </select>
            </div>

            {craftersFiltrados.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Nenhum crafter encontrado.</p>
              </div>
            ) : (
              <div className={styles.craftersGrid}>
                {craftersFiltrados.map(crafter => {
                  const crafterTeams = crafterTeamsMap[crafter.id] || [];
                  return (
                    <div key={crafter.id} className={styles.crafterCard}>
                      <div className={styles.crafterHeader}>
                        <div className={styles.crafterAvatar}>
                          {crafter.avatar_url ? (
                            <img src={crafter.avatar_url} alt={crafter.nome} />
                          ) : (
                            <div className={styles.avatarPlaceholder}>
                              {crafter.nome.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className={styles.crafterInfo}>
                          <h4>{crafter.nome}</h4>
                          <p>{crafter.email}</p>
                          <span className={styles.points}>{crafter.points || 0} pontos</span>
                        </div>
                      </div>

                      <div className={styles.crafterStatus}>
                        {crafterTeams.length === 0 ? (
                          <StatusBadge variant="success" dot>Disponível</StatusBadge>
                        ) : (
                          <div className={styles.currentTeams}>
                            <StatusBadge variant="info" dot>Em {crafterTeams.length} equipe(s)</StatusBadge>
                            {crafterTeams.map(team => {
                              const projeto = projetos.find(p => p.id === team.projeto_id);
                              const mentor = mentores.find(m => m.id === team.mentor_id);
                              return (
                                <div key={team.id} className={styles.teamInfo}>
                                  <small>
                                    {projeto?.titulo || 'Projeto'} - {mentor?.nome || 'Mentor'}
                                  </small>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AdminCard>

          {/* Criar Nova Equipe */}
          <AdminCard variant="elevated" className={styles.section}>
            <h2 className={styles.sectionTitle}><FaProjectDiagram /> Criar Nova Equipe</h2>
            <form onSubmit={criarEquipe} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label><FaProjectDiagram /> Projeto</label>
                  <select
                    value={novaEquipe.projeto_id}
                    onChange={(e) => setNovaEquipe({...novaEquipe, projeto_id: e.target.value})}
                    className={styles.select}
                    required
                  >
                    <option value="">Selecione um Projeto</option>
                    {projetos.map(projeto => (
                      <option key={projeto.id} value={projeto.id}>{projeto.titulo}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label><FaUserTie /> Mentor</label>
                  <select
                    value={novaEquipe.mentor_id}
                    onChange={(e) => setNovaEquipe({...novaEquipe, mentor_id: e.target.value})}
                    className={styles.select}
                    required
                  >
                    <option value="">Selecione um Mentor</option>
                    {mentores.map(mentor => (
                      <option key={mentor.id} value={mentor.id}>{mentor.nome} - {mentor.email}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label><FaUsers /> Crafters da Equipe</label>
                <div className={styles.craftersSelection}>
                  {crafters.map(crafter => (
                    <label key={crafter.id} className={`${styles.crafterCheckbox} ${novaEquipe.crafter_ids.includes(crafter.id) ? styles.selected : ''}`}>
                      <input
                        type="checkbox"
                        checked={novaEquipe.crafter_ids.includes(crafter.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNovaEquipe({...novaEquipe, crafter_ids: [...novaEquipe.crafter_ids, crafter.id]});
                          } else {
                            setNovaEquipe({...novaEquipe, crafter_ids: novaEquipe.crafter_ids.filter(id => id !== crafter.id)});
                          }
                        }}
                      />
                      <div className={styles.crafterCheckboxInfo}>
                        <strong>{crafter.nome}</strong>
                        <small>{crafter.email}</small>
                      </div>
                    </label>
                  ))}
                </div>
                <div className={styles.selectionSummary}>
                  <FaCheck /> {novaEquipe.crafter_ids.length} crafter(s) selecionado(s)
                </div>
              </div>

              <AdminCard variant="outlined" padding="sm" className={styles.previewCard}>
                <div className={styles.formRow}>
                  <div>
                    <strong>Nome da Equipe:</strong>
                    <p className={styles.muted}>
                      {(projetoSelecionado?.titulo || 'Projeto não selecionado')} — {(mentorSelecionado?.nome || 'Mentor não selecionado')}
                    </p>
                  </div>
                  <div>
                    <strong>Participantes:</strong>
                    <p className={styles.muted}>{novaEquipe.crafter_ids.length} selecionado(s)</p>
                  </div>
                </div>
              </AdminCard>

              <div className={styles.formGroup}>
                <label>Status Inicial</label>
                <select
                  value={novaEquipe.status_inscricao}
                  onChange={(e) => setNovaEquipe({...novaEquipe, status_inscricao: e.target.value})}
                  className={styles.select}
                >
                  <option value="inscrito">Inscrito</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="finalizado">Finalizado</option>
                </select>
              </div>

              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={novaEquipe.crafter_ids.length === 0}
              >
                <FaProjectDiagram /> Criar Equipe ({novaEquipe.crafter_ids.length} crafter{novaEquipe.crafter_ids.length !== 1 ? 's' : ''})
              </button>
            </form>
          </AdminCard>

          {/* Associar Mentor a Projeto */}
          <AdminCard variant="elevated" className={styles.section}>
            <h2 className={styles.sectionTitle}><FaLink /> Associar Mentor a Projeto</h2>
            <form onSubmit={associarMentorProjeto} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label><FaProjectDiagram /> Projeto</label>
                  <select
                    value={mentorProjeto.projeto_id}
                    onChange={(e) => setMentorProjeto({...mentorProjeto, projeto_id: e.target.value})}
                    className={styles.select}
                    required
                  >
                    <option value="">Selecione um Projeto</option>
                    {projetos.map(projeto => (
                      <option key={projeto.id} value={projeto.id}>{projeto.titulo}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label><FaUserTie /> Mentor</label>
                  <select
                    value={mentorProjeto.mentor_id}
                    onChange={(e) => setMentorProjeto({...mentorProjeto, mentor_id: e.target.value})}
                    className={styles.select}
                    required
                  >
                    <option value="">Selecione um Mentor</option>
                    {mentores.map(mentor => (
                      <option key={mentor.id} value={mentor.id}>{mentor.nome} - {mentor.email}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className={styles.secondaryBtn}>
                <FaLink /> Associar Mentor ao Projeto
              </button>
            </form>
          </AdminCard>
        </div>
      )}

      {/* Tab: Equipes */}
      {activeTab === 'equipes' && (
        <div className={styles.tabContent}>
          <AdminCard variant="elevated" className={styles.section}>
            <h2 className={styles.sectionTitle}>Equipes Ativas</h2>
            {Object.keys(equipesAgrupadas).length === 0 ? (
              <div className={styles.emptyState}>
                <p>Nenhuma equipe encontrada.</p>
              </div>
            ) : (
              Object.entries(equipesAgrupadas).map(([projetoId, equipes]) => (
                <div key={projetoId} className={styles.projectSection}>
                  <h3 className={styles.projectSectionTitle}>
                    <FaProjectDiagram /> {equipes[0]?.projeto_titulo || 'Projeto sem título'}
                  </h3>
                  <div className={styles.teamsGrid}>
                    {Object.entries(
                      equipes.reduce((acc, equipe) => {
                        const mentorKey = equipe.mentor_nome;
                        if (!acc[mentorKey]) acc[mentorKey] = [];
                        acc[mentorKey].push(equipe);
                        return acc;
                      }, {})
                    ).map(([mentorNome, equipesDoMentor]) => (
                      <AdminCard key={mentorNome} variant="outlined" className={styles.teamCard}>
                        <h4><FaUserTie /> {mentorNome}</h4>
                        <div className={styles.teamMembersList}>
                          {equipesDoMentor.map(equipe => (
                            <div key={equipe.id} className={styles.memberItem}>
                              <span>{equipe.crafter_nome}</span>
                              <select
                                value={equipe.status_inscricao}
                                onChange={(e) => alterarStatusEquipe(equipe.id, e.target.value)}
                                className={styles.statusSelectSmall}
                              >
                                <option value="inscrito">Inscrito</option>
                                <option value="confirmado">Confirmado</option>
                                <option value="finalizado">Finalizado</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </AdminCard>
                    ))}
                  </div>
                </div>
              ))
            )}
          </AdminCard>
        </div>
      )}

      {/* Tab: Auditoria */}
      {activeTab === 'auditoria' && (
        <div className={styles.tabContent}>
          <AdminCard variant="elevated" className={styles.section}>
            <h2 className={styles.sectionTitle}><FaClipboardList /> Auditoria de Relacionamentos</h2>
            <p className={styles.infoText}>
              Esta seção destaca inconsistências nas relações entre Mentores, Projetos, Crafters e Equipes.
            </p>
            <button onClick={exportarAuditoria} className={styles.secondaryBtn}>
              <FaDownload /> Exportar CSV das inconsistências
            </button>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Verificação</th>
                    <th>Quantidade</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Mentores sem equipes/projetos</td>
                    <td><StatusBadge variant={mentoresSemProjeto.length > 0 ? 'warning' : 'success'}>{mentoresSemProjeto.length}</StatusBadge></td>
                    <td><button className={styles.linkBtn} onClick={() => setActiveTab('associacoes')}>Ver Mentores</button></td>
                  </tr>
                  <tr>
                    <td>Projetos sem mentor/equipe</td>
                    <td><StatusBadge variant={projetosSemMentor.length > 0 ? 'warning' : 'success'}>{projetosSemMentor.length}</StatusBadge></td>
                    <td><button className={styles.linkBtn} onClick={() => setActiveTab('associacoes')}>Ver Projetos</button></td>
                  </tr>
                  <tr>
                    <td>Projetos com múltiplos mentores</td>
                    <td><StatusBadge variant={projetosComMultMentores.length > 0 ? 'info' : 'success'}>{projetosComMultMentores.length}</StatusBadge></td>
                    <td><button className={styles.linkBtn} onClick={() => setActiveTab('associacoes')}>Revisar</button></td>
                  </tr>
                  <tr>
                    <td>Crafters sem equipe</td>
                    <td><StatusBadge variant={craftersSemEquipe.length > 0 ? 'warning' : 'success'}>{craftersSemEquipe.length}</StatusBadge></td>
                    <td><button className={styles.linkBtn} onClick={() => setActiveTab('associacoes')}>Adicionar</button></td>
                  </tr>
                  <tr>
                    <td>Crafters em múltiplas equipes</td>
                    <td><StatusBadge variant={craftersEmMultEquipes.length > 0 ? 'info' : 'success'}>{craftersEmMultEquipes.length}</StatusBadge></td>
                    <td><button className={styles.linkBtn} onClick={() => setActiveTab('equipes')}>Ver Equipes</button></td>
                  </tr>
                  <tr>
                    <td>Equipes com referências inválidas</td>
                    <td><StatusBadge variant={equipesRefsInvalidas.length > 0 ? 'error' : 'success'}>{equipesRefsInvalidas.length}</StatusBadge></td>
                    <td><button className={styles.linkBtn} onClick={() => setActiveTab('equipes')}>Corrigir</button></td>
                  </tr>
                  <tr>
                    <td>Equipes duplicadas</td>
                    <td><StatusBadge variant={equipesDuplicadas.length > 0 ? 'error' : 'success'}>{equipesDuplicadas.length}</StatusBadge></td>
                    <td><button className={styles.linkBtn} onClick={() => setActiveTab('equipes')}>Remover</button></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {(mentoresSemProjeto.length > 0 || projetosSemMentor.length > 0 || craftersSemEquipe.length > 0) && (
              <AdminCard variant="outlined" className={styles.auditDetails}>
                <h3>Detalhes das Inconsistências</h3>
                <div className={styles.auditGrid}>
                  {mentoresSemProjeto.length > 0 && (
                    <div className={styles.auditItem}>
                      <h4>Mentores sem equipes</h4>
                      <ul>
                        {mentoresSemProjeto.map(m => (
                          <li key={m.id}>{m.nome} — {m.email}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {projetosSemMentor.length > 0 && (
                    <div className={styles.auditItem}>
                      <h4>Projetos sem mentor</h4>
                      <ul>
                        {projetosSemMentor.map(p => (
                          <li key={p.id}>{p.titulo || `Projeto #${p.id}`}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {craftersSemEquipe.length > 0 && (
                    <div className={styles.auditItem}>
                      <h4>Crafters sem equipe</h4>
                      <ul>
                        {craftersSemEquipe.map(c => (
                          <li key={c.id}>{c.nome} — {c.email}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AdminCard>
            )}

            {mentoresSemProjeto.length === 0 && projetosSemMentor.length === 0 && craftersSemEquipe.length === 0 &&
             craftersEmMultEquipes.length === 0 && equipesRefsInvalidas.length === 0 && equipesDuplicadas.length === 0 && (
              <div className={styles.successState}>
                <FaCheck className={styles.successIcon} />
                <p>Nenhuma inconsistência encontrada. Tudo certo!</p>
              </div>
            )}
          </AdminCard>
        </div>
      )}
    </div>
  );
}
