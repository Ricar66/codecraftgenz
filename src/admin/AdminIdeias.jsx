// src/admin/AdminIdeias.jsx
// Refatorado para usar Design System CodeCraft + API real
import React, { useState, useEffect } from 'react';
import { FaLightbulb, FaPlus, FaThumbsUp, FaComment, FaTimes, FaSave } from 'react-icons/fa';

import { getIdeias, createIdeia, voteIdeia, addComentario } from '../services/ideiasAPI.js';
import AdminCard from './components/AdminCard';
import StatusBadge from './components/StatusBadge';
import styles from './AdminIdeias.module.css';

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
      const dados = await getIdeias();
      setIdeias(Array.isArray(dados) ? dados : []);
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
      await createIdeia(form);
      setForm({ titulo: '', descricao: '' });
      setFormAberto(false);
      await carregarIdeias();
    } catch (err) {
      alert('Erro ao criar ideia: ' + err.message);
    }
  };

  const handleVotar = async (ideiaId) => {
    try {
      await voteIdeia(ideiaId);
      setIdeias(ideias.map(ideia =>
        ideia.id === ideiaId
          ? { ...ideia, votos: (ideia.votos || 0) + 1 }
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
      await addComentario(ideiaId, novoComentario);
      setNovoComentario('');
      setComentarioAberto(null);
      await carregarIdeias();
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
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Carregando ideias...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <AdminCard variant="outlined">
          <div className={styles.errorState}>
            <h3>Erro ao carregar ideias</h3>
            <p>{error}</p>
            <button onClick={carregarIdeias} className={styles.retryBtn}>
              Tentar novamente
            </button>
          </div>
        </AdminCard>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <FaLightbulb className={styles.headerIcon} />
          <div>
            <h1>Ideias de Projeto</h1>
            <p>Compartilhe e colabore em ideias para novos projetos</p>
          </div>
        </div>
        <button
          className={styles.newIdeaBtn}
          onClick={() => setFormAberto(!formAberto)}
        >
          {formAberto ? <><FaTimes /> Cancelar</> : <><FaPlus /> Nova Ideia</>}
        </button>
      </header>

      {/* Formulário Nova Ideia */}
      {formAberto && (
        <AdminCard variant="elevated" className={styles.formCard}>
          <h3 className={styles.formTitle}>Adicionar Nova Ideia</h3>
          <form onSubmit={handleCriarIdeia} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="titulo">Título *</label>
              <input
                id="titulo"
                type="text"
                placeholder="Título da ideia"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="descricao">Descrição Detalhada *</label>
              <textarea
                id="descricao"
                placeholder="Descreva sua ideia em detalhes..."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className={styles.textarea}
                rows="4"
                required
              />
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn}>
                <FaSave /> Salvar Ideia
              </button>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setFormAberto(false)}
              >
                <FaTimes /> Cancelar
              </button>
            </div>
          </form>
        </AdminCard>
      )}

      {/* Lista de Ideias */}
      <div className={styles.ideiasList}>
        {ideias.length === 0 ? (
          <AdminCard variant="outlined" className={styles.emptyCard}>
            <div className={styles.emptyState}>
              <FaLightbulb className={styles.emptyIcon} />
              <p>Nenhuma ideia cadastrada ainda.</p>
              <p>Seja o primeiro a compartilhar uma ideia!</p>
            </div>
          </AdminCard>
        ) : (
          ideias.map((ideia) => (
            <AdminCard key={ideia.id} variant="elevated" className={styles.ideiaCard}>
              <div className={styles.ideiaHeader}>
                <h3 className={styles.ideiaTitulo}>{ideia.titulo}</h3>
                <div className={styles.ideiaMeta}>
                  <StatusBadge variant="info">por {ideia.autor}</StatusBadge>
                  <span className={styles.ideiaData}>{formatarData(ideia.data_criacao)}</span>
                </div>
              </div>

              <div className={styles.ideiaContent}>
                <p>{ideia.descricao}</p>
              </div>

              <div className={styles.ideiaActions}>
                <button
                  className={styles.voteBtn}
                  onClick={() => handleVotar(ideia.id)}
                  title="Votar nesta ideia"
                >
                  <FaThumbsUp /> {ideia.votos}
                </button>

                <button
                  className={`${styles.commentBtn} ${comentarioAberto === ideia.id ? styles.active : ''}`}
                  onClick={() => setComentarioAberto(comentarioAberto === ideia.id ? null : ideia.id)}
                >
                  <FaComment /> {ideia.comentarios.length}
                </button>
              </div>

              {comentarioAberto === ideia.id && (
                <div className={styles.comentarioSection}>
                  <div className={styles.comentarioForm}>
                    <textarea
                      placeholder="Deixe seu comentário..."
                      value={novoComentario}
                      onChange={(e) => setNovoComentario(e.target.value)}
                      className={styles.comentarioInput}
                      rows="2"
                    />
                    <button
                      className={styles.addCommentBtn}
                      onClick={() => handleAdicionarComentario(ideia.id)}
                    >
                      <FaPlus /> Adicionar
                    </button>
                  </div>

                  {ideia.comentarios.length > 0 && (
                    <div className={styles.comentariosList}>
                      <h4>Comentários:</h4>
                      {ideia.comentarios.map((comentario) => (
                        <div key={comentario.id} className={styles.comentarioItem}>
                          <div className={styles.comentarioHeader}>
                            <strong>{comentario.autor}</strong>
                            <span className={styles.comentarioData}>
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
            </AdminCard>
          ))
        )}
      </div>
    </div>
  );
}
