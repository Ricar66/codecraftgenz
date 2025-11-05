import React, { useState, useEffect } from 'react';
import './AdminIdeias.css';
import './AdminCommon.css';

// Simulação de API - será substituída por chamadas reais
const IdeiasRepo = {
  async getAll() {
    // Simular chamada API
    return [
      {
        id: 1,
        titulo: "Sistema de Gamificação para Aprendizado",
        descricao: "Desenvolver um sistema de gamificação com badges, níveis e recompensas para engajar os usuários no aprendizado.",
        autor: "Admin",
        data_criacao: "2024-01-15T10:30:00Z",
        votos: 12,
        comentarios: [
          { id: 1, autor: "Mentor 1", texto: "Excelente ideia! Podemos integrar com o sistema atual de pontos.", data: "2024-01-15T11:00:00Z" }
        ]
      },
      {
        id: 2,
        titulo: "Plataforma de Mentoria em Tempo Real",
        descricao: "Criar uma plataforma onde mentores possam oferecer sessões de mentoria em tempo real com agendamento integrado.",
        autor: "Admin",
        data_criacao: "2024-01-14T14:20:00Z",
        votos: 8,
        comentarios: []
      }
    ];
  },

  async create(ideia) {
    // Simular criação
    return { ...ideia, id: Date.now(), data_criacao: new Date().toISOString(), votos: 0, comentarios: [] };
  },

  async vote(ideiaId) { // eslint-disable-line no-unused-vars
    // Simular voto
    return { success: true };
  },

  async addComment(ideiaId, comentario) { // eslint-disable-line no-unused-vars
    // Simular comentário
    return { success: true };
  }
};

export default function AdminIdeias() {
  const [ideias, setIdeias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '' });
  const [comentarioAberto, setComentarioAberto] = useState(null);
  const [novoComentario, setNovoComentario] = useState('');

  const carregarIdeias = async () => {
    try {
      setLoading(true);
      setError('');
      const dados = await IdeiasRepo.getAll();
      setIdeias(dados);
    } catch (err) {
      setError('Erro ao carregar ideias: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarIdeias();
  }, []);

  const handleCriarIdeia = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.descricao.trim()) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const novaIdeia = await IdeiasRepo.create(form);
      setIdeias([novaIdeia, ...ideias]);
      setForm({ titulo: '', descricao: '' });
      setFormAberto(false);
      alert('Ideia criada com sucesso!');
    } catch (err) {
      alert('Erro ao criar ideia: ' + err.message);
    }
  };

  const handleVotar = async (ideiaId) => {
    try {
      await IdeiasRepo.vote(ideiaId);
      setIdeias(ideias.map(ideia => 
        ideia.id === ideiaId 
          ? { ...ideia, votos: ideia.votos + 1 } 
          : ideia
      ));
    } catch (err) {
      alert('Erro ao votar: ' + err.message);
    }
  };

  const handleAdicionarComentario = async (ideiaId) => {
    if (!novoComentario.trim()) {
      alert('Digite um comentário');
      return;
    }

    try {
      await IdeiasRepo.addComment(ideiaId, {
        autor: 'Admin', // Será substituído pelo usuário logado
        texto: novoComentario,
        data: new Date().toISOString()
      });

      setIdeias(ideias.map(ideia => 
        ideia.id === ideiaId 
          ? { 
              ...ideia, 
              comentarios: [
                ...ideia.comentarios,
                { 
                  id: Date.now(), 
                  autor: 'Admin', 
                  texto: novoComentario, 
                  data: new Date().toISOString() 
                }
              ] 
            } 
          : ideia
      ));

      setNovoComentario('');
      setComentarioAberto(null);
    } catch (err) {
      alert('Erro ao adicionar comentário: ' + err.message);
    }
  };

  const formatarData = (dataISO) => {
    return new Date(dataISO).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="admin-content">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Carregando ideias...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-content">
        <div className="error-state">
          <h3>Erro ao carregar ideias</h3>
          <p>{error}</p>
          <button onClick={carregarIdeias} className="retry-button">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-ideias-header">
        <h1 className="title">💡 Ideias de Projeto</h1>
        <p className="muted">Compartilhe e colabore em ideias para novos projetos</p>
      </div>

      <div className="filters-section">
        <button 
          className="btn btn-primary"
          onClick={() => setFormAberto(!formAberto)}
        >
          {formAberto ? '❌ Cancelar' : '➕ Nova Ideia'}
        </button>
      </div>

      {formAberto && (
        <div className="nova-ideia-form card">
          <h3>Adicionar Nova Ideia</h3>
          <form onSubmit={handleCriarIdeia}>
            <div className="form-group">
              <label htmlFor="titulo">Título *</label>
              <input
                id="titulo"
                type="text"
                placeholder="Título da ideia"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="descricao">Descrição Detalhada *</label>
              <textarea
                id="descricao"
                placeholder="Descreva sua ideia em detalhes..."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                rows="4"
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                💾 Salvar Ideia
              </button>
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={() => setFormAberto(false)}
              >
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="ideias-list">
        {ideias.length === 0 ? (
          <div className="no-ideias">
            <p>📭 Nenhuma ideia cadastrada ainda.</p>
            <p>Seja o primeiro a compartilhar uma ideia!</p>
          </div>
        ) : (
          ideias.map((ideia) => (
            <div key={ideia.id} className="ideia-card card">
              <div className="ideia-header">
                <h3>{ideia.titulo}</h3>
                <div className="ideia-meta">
                  <span className="autor">por {ideia.autor}</span>
                  <span className="data">{formatarData(ideia.data_criacao)}</span>
                </div>
              </div>

              <div className="ideia-content">
                <p>{ideia.descricao}</p>
              </div>

              <div className="ideia-actions">
                <button 
                  className="btn-vote"
                  onClick={() => handleVotar(ideia.id)}
                  title="Votar nesta ideia"
                >
                  👍 {ideia.votos}
                </button>

                <button 
                  className="btn-comment"
                  onClick={() => setComentarioAberto(comentarioAberto === ideia.id ? null : ideia.id)}
                >
                  💬 {ideia.comentarios.length}
                </button>
              </div>

              {comentarioAberto === ideia.id && (
                <div className="comentario-section">
                  <div className="comentario-form">
                    <textarea
                      placeholder="Deixe seu comentário..."
                      value={novoComentario}
                      onChange={(e) => setNovoComentario(e.target.value)}
                      rows="2"
                    />
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleAdicionarComentario(ideia.id)}
                    >
                      ➕ Adicionar Comentário
                    </button>
                  </div>

                  {ideia.comentarios.length > 0 && (
                    <div className="comentarios-list">
                      <h4>Comentários:</h4>
                      {ideia.comentarios.map((comentario) => (
                        <div key={comentario.id} className="comentario-item">
                          <div className="comentario-header">
                            <strong>{comentario.autor}</strong>
                            <span className="comentario-data">
                              {formatarData(comentario.data)}
                            </span>
                          </div>
                          <p>{comentario.texto}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}