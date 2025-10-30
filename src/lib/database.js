import path from 'path';
import { fileURLToPath } from 'url';

import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho para o arquivo do banco de dados
const dbPath = path.join(__dirname, '../../database.sqlite');

// Criar conexão com o banco
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar com o banco SQLite:', err.message);
  } else {
    console.log('Conectado ao banco SQLite com sucesso');
    initializeTables();
  }
});

// Função para inicializar as tabelas
function initializeTables() {
  // Tabela mentores
  db.run(`
    CREATE TABLE IF NOT EXISTS mentores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      telefone TEXT,
      bio TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela projetos
  db.run(`
    CREATE TABLE IF NOT EXISTS projetos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descricao TEXT,
      data_inicio TEXT,
      status TEXT CHECK(status IN ('rascunho', 'ongoing', 'finalizado')) DEFAULT 'rascunho',
      preco REAL,
      visivel BOOLEAN DEFAULT 0,
      thumb_url TEXT,
      mentor_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mentor_id) REFERENCES mentores(id)
    )
  `);

  // Tabela crafters
  db.run(`
    CREATE TABLE IF NOT EXISTS crafters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      avatar_url TEXT,
      points INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela finanças
  db.run(`
    CREATE TABLE IF NOT EXISTS financas (
      id TEXT PRIMARY KEY,
      item TEXT NOT NULL,
      valor REAL NOT NULL,
      status TEXT CHECK(status IN ('pending', 'paid', 'discount', 'cancelled')) DEFAULT 'pending',
      date TEXT,
      type TEXT CHECK(type IN ('project', 'discount', 'other')) DEFAULT 'other',
      project_id TEXT,
      progress INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela equipes (relacionamento entre Mentor, Crafter e Projeto)
  db.run(`
    CREATE TABLE IF NOT EXISTS equipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mentor_id INTEGER,
      crafter_id INTEGER,
      projeto_id INTEGER,
      data_inscricao TEXT DEFAULT CURRENT_TIMESTAMP,
      status_inscricao TEXT CHECK(status_inscricao IN ('inscrito', 'confirmado', 'finalizado')) DEFAULT 'inscrito',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mentor_id) REFERENCES mentores(id),
      FOREIGN KEY (crafter_id) REFERENCES crafters(id),
      FOREIGN KEY (projeto_id) REFERENCES projetos(id),
      UNIQUE(crafter_id, projeto_id)
    )
  `);

  // Tabela inscricoes (dados de inscrição para os desafios/projetos)
  db.run(`
    CREATE TABLE IF NOT EXISTS inscricoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crafter_id INTEGER,
      projeto_id INTEGER,
      status TEXT CHECK(status IN ('pendente', 'confirmado', 'cancelado')) DEFAULT 'pendente',
      data_inscricao TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (crafter_id) REFERENCES crafters(id),
      FOREIGN KEY (projeto_id) REFERENCES projetos(id),
      UNIQUE(crafter_id, projeto_id)
    )
  `);

  // Tabela desafios
  db.run(`
    CREATE TABLE IF NOT EXISTS desafios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      objective TEXT NOT NULL,
      description TEXT,
      deadline TEXT,
      base_points INTEGER DEFAULT 0,
      reward TEXT,
      status TEXT CHECK(status IN ('draft', 'active', 'closed', 'archived')) DEFAULT 'draft',
      criteria TEXT, -- JSON array
      delivery_type TEXT CHECK(delivery_type IN ('github', 'link', 'file')) NOT NULL,
      visible BOOLEAN DEFAULT 0,
      difficulty TEXT CHECK(difficulty IN ('starter', 'intermediate', 'pro')) DEFAULT 'starter',
      tags TEXT, -- JSON array
      thumb_url TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela inscricoes_desafios
  db.run(`
    CREATE TABLE IF NOT EXISTS inscricoes_desafios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crafter_id INTEGER,
      desafio_id INTEGER,
      enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (crafter_id) REFERENCES crafters(id),
      FOREIGN KEY (desafio_id) REFERENCES desafios(id),
      UNIQUE(crafter_id, desafio_id)
    )
  `);

  // Tabela submissions (entregas de desafios)
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id INTEGER,
      crafter_id INTEGER,
      submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      delivery TEXT, -- JSON object with url, notes, etc
      score INTEGER,
      status TEXT CHECK(status IN ('submitted', 'reviewed', 'approved', 'rejected')) DEFAULT 'submitted',
      review TEXT, -- JSON object with feedback
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (challenge_id) REFERENCES desafios(id),
      FOREIGN KEY (crafter_id) REFERENCES crafters(id)
    )
  `);

  // Tabela logs (histórico de ações)
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      at TEXT DEFAULT CURRENT_TIMESTAMP,
      actor TEXT,
      challenge_id INTEGER,
      submission_id INTEGER,
      data TEXT, -- JSON object with additional data
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (challenge_id) REFERENCES desafios(id),
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    )
  `);

  // Tabela ranking_settings (configurações do ranking)
  db.run(`
    CREATE TABLE IF NOT EXISTS ranking_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_ref TEXT,
      min_points INTEGER DEFAULT 0,
      max_points INTEGER,
      active_only BOOLEAN DEFAULT 1,
      search TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT
    )
  `);

  // Tabela top3 (top 3 do ranking)
  db.run(`
    CREATE TABLE IF NOT EXISTS top3 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crafter_id INTEGER,
      position INTEGER,
      reward TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (crafter_id) REFERENCES crafters(id)
    )
  `);

  // Tabela ranking_history (histórico de mudanças no ranking)
  db.run(`
    CREATE TABLE IF NOT EXISTS ranking_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT DEFAULT CURRENT_TIMESTAMP,
      actor TEXT,
      action TEXT,
      crafter_id INTEGER,
      before_points INTEGER,
      after_points INTEGER,
      diff INTEGER,
      data TEXT, -- JSON object with additional data
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (crafter_id) REFERENCES crafters(id)
    )
  `);

  // Adicionar coluna points na tabela crafters se não existir
  db.run(`ALTER TABLE crafters ADD COLUMN points INTEGER DEFAULT 0`, () => {
    // Ignora erro se coluna já existir
  });

  // Adicionar coluna active na tabela crafters se não existir
  db.run(`ALTER TABLE crafters ADD COLUMN active BOOLEAN DEFAULT 1`, () => {
    // Ignora erro se coluna já existir
  });

  console.log('Tabelas do banco SQLite inicializadas com sucesso');
}

// Funções auxiliares para operações no banco
const dbOperations = {
  // Mentores
  async createMentor(mentor) {
    return new Promise((resolve, reject) => {
      const { nome, email, telefone, bio } = mentor;
      db.run(
        'INSERT INTO mentores (nome, email, telefone, bio) VALUES (?, ?, ?, ?)',
        [nome, email, telefone, bio],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...mentor });
        }
      );
    });
  },

  async getMentores() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM mentores ORDER BY nome', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  async getMentorById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM mentores WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  async updateMentor(id, mentor) {
    return new Promise((resolve, reject) => {
      const { nome, email, telefone, bio } = mentor;
      db.run(
        'UPDATE mentores SET nome = ?, email = ?, telefone = ?, bio = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [nome, email, telefone, bio, id],
        function(err) {
          if (err) reject(err);
          else resolve({ id, ...mentor });
        }
      );
    });
  },

  // Projetos
  async createProjeto(projeto) {
    return new Promise((resolve, reject) => {
      const { titulo, descricao, data_inicio, status, preco, visivel, thumb_url, mentor_id } = projeto;
      db.run(
        'INSERT INTO projetos (titulo, descricao, data_inicio, status, preco, visivel, thumb_url, mentor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [titulo, descricao, data_inicio, status, preco, visivel, thumb_url, mentor_id],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...projeto });
        }
      );
    });
  },

  async getProjetos(filters = {}) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT p.*, m.nome as mentor_nome, m.email as mentor_email 
        FROM projetos p 
        LEFT JOIN mentores m ON p.mentor_id = m.id
      `;
      const params = [];
      const conditions = [];

      if (filters.visivel !== undefined) {
        conditions.push('p.visivel = ?');
        params.push(filters.visivel);
      }

      if (filters.status) {
        conditions.push('p.status = ?');
        params.push(filters.status);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY p.created_at DESC';

      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  async updateProjeto(id, updates) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });
      
      if (fields.length === 0) {
        return resolve({ id, ...updates });
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      const query = `UPDATE projetos SET ${fields.join(', ')} WHERE id = ?`;
      
      db.run(query, values, function(err) {
        if (err) reject(err);
        else {
          // Buscar o projeto atualizado
          db.get('SELECT * FROM projetos WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        }
      });
    });
  },

  async getProjetoById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT p.*, m.nome as mentor_nome, m.email as mentor_email 
         FROM projetos p 
         LEFT JOIN mentores m ON p.mentor_id = m.id 
         WHERE p.id = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  async associateMentorToProjeto(projetoId, mentorId) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE projetos SET mentor_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [mentorId, projetoId],
        function(err) {
          if (err) reject(err);
          else resolve({ projetoId, mentorId });
        }
      );
    });
  },

  // Crafters
  async createCrafter(crafter) {
    return new Promise((resolve, reject) => {
      const { nome, email, avatar_url } = crafter;
      db.run(
        'INSERT INTO crafters (nome, email, avatar_url) VALUES (?, ?, ?)',
        [nome, email, avatar_url],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...crafter });
        }
      );
    });
  },

  async getCrafters() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM crafters ORDER BY nome', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Equipes
  async createEquipe(equipe) {
    return new Promise((resolve, reject) => {
      const { mentor_id, crafter_id, projeto_id, status_inscricao } = equipe;
      db.run(
        'INSERT INTO equipes (mentor_id, crafter_id, projeto_id, status_inscricao) VALUES (?, ?, ?, ?)',
        [mentor_id, crafter_id, projeto_id, status_inscricao || 'inscrito'],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...equipe });
        }
      );
    });
  },

  async getEquipes() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT e.*, 
               c.nome as crafter_nome, c.email as crafter_email, c.avatar_url as crafter_avatar,
               m.nome as mentor_nome, m.email as mentor_email,
               p.titulo as projeto_titulo, p.status as projeto_status
        FROM equipes e
        LEFT JOIN crafters c ON e.crafter_id = c.id
        LEFT JOIN mentores m ON e.mentor_id = m.id
        LEFT JOIN projetos p ON e.projeto_id = p.id
        ORDER BY e.created_at DESC
      `;
      db.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  async updateEquipeStatus(id, status) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE equipes SET status_inscricao = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id],
        function(err) {
          if (err) reject(err);
          else resolve({ id, status });
        }
      );
    });
  },

  async getEquipesByCrafter(crafterId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT e.*, 
               m.nome as mentor_nome, m.email as mentor_email,
               p.titulo as projeto_titulo, p.descricao as projeto_descricao, p.status as projeto_status
        FROM equipes e
        LEFT JOIN mentores m ON e.mentor_id = m.id
        LEFT JOIN projetos p ON e.projeto_id = p.id
        WHERE e.crafter_id = ?
        ORDER BY e.created_at DESC
      `;
      db.all(query, [crafterId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Inscrições
  async createInscricao(inscricao) {
    return new Promise((resolve, reject) => {
      const { crafter_id, projeto_id, status } = inscricao;
      db.run(
        'INSERT INTO inscricoes (crafter_id, projeto_id, status) VALUES (?, ?, ?)',
        [crafter_id, projeto_id, status || 'pendente'],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...inscricao });
        }
      );
    });
  },

  // Desafios
  async createDesafio(desafio) {
    return new Promise((resolve, reject) => {
      const {
        name, objective, description, deadline, base_points, reward,
        status, criteria, delivery_type, visible, difficulty, tags,
        thumb_url, created_by
      } = desafio;
      
      db.run(
        `INSERT INTO desafios (
          name, objective, description, deadline, base_points, reward,
          status, criteria, delivery_type, visible, difficulty, tags,
          thumb_url, created_by, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name, objective, description || '', deadline, base_points || 0, reward || '',
          status || 'draft', JSON.stringify(criteria || []), delivery_type,
          visible ? 1 : 0, difficulty || 'starter', JSON.stringify(tags || []),
          thumb_url, created_by, new Date().toISOString()
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...desafio });
        }
      );
    });
  },

  async getDesafios(filters = {}) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM desafios';
      const conditions = [];
      const params = [];

      if (filters.visible !== undefined) {
        conditions.push('visible = ?');
        params.push(filters.visible ? 1 : 0);
      }

      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY deadline ASC';

      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else {
          // Parse JSON fields
          const desafios = rows.map(row => ({
            ...row,
            visible: Boolean(row.visible),
            criteria: JSON.parse(row.criteria || '[]'),
            tags: JSON.parse(row.tags || '[]')
          }));
          resolve(desafios);
        }
      });
    });
  },

  async getDesafioById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM desafios WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else {
          const desafio = {
            ...row,
            visible: Boolean(row.visible),
            criteria: JSON.parse(row.criteria || '[]'),
            tags: JSON.parse(row.tags || '[]')
          };
          resolve(desafio);
        }
      });
    });
  },

  async updateDesafio(id, updates) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const params = [];

      Object.keys(updates).forEach(key => {
        if (key === 'criteria' || key === 'tags') {
          fields.push(`${key} = ?`);
          params.push(JSON.stringify(updates[key]));
        } else if (key === 'visible') {
          fields.push(`${key} = ?`);
          params.push(updates[key] ? 1 : 0);
        } else {
          fields.push(`${key} = ?`);
          params.push(updates[key]);
        }
      });

      fields.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);

      const query = `UPDATE desafios SET ${fields.join(', ')} WHERE id = ?`;

      db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  // Inscrições em Desafios
  async createInscricaoDesafio(inscricao) {
    return new Promise((resolve, reject) => {
      const { crafter_id, desafio_id } = inscricao;
      db.run(
        'INSERT INTO inscricoes_desafios (crafter_id, desafio_id, enrolled_at) VALUES (?, ?, ?)',
        [crafter_id, desafio_id, new Date().toISOString()],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...inscricao });
        }
      );
    });
  },

  async getInscricoesDesafio(desafio_id) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM inscricoes_desafios WHERE desafio_id = ?',
        [desafio_id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  async checkInscricaoDesafio(crafter_id, desafio_id) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM inscricoes_desafios WHERE crafter_id = ? AND desafio_id = ?',
        [crafter_id, desafio_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Submissions (Entregas)
  async createSubmission(submission) {
    return new Promise((resolve, reject) => {
      const { challenge_id, crafter_id, delivery } = submission;
      db.run(
        'INSERT INTO submissions (challenge_id, crafter_id, submitted_at, delivery, status) VALUES (?, ?, ?, ?, ?)',
        [challenge_id, crafter_id, new Date().toISOString(), JSON.stringify(delivery), 'submitted'],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...submission });
        }
      );
    });
  },

  async getSubmissionsByChallenge(challenge_id) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM submissions WHERE challenge_id = ? ORDER BY submitted_at DESC',
        [challenge_id],
        (err, rows) => {
          if (err) reject(err);
          else {
            // Parse JSON fields
            const submissions = rows.map(row => ({
              ...row,
              delivery: row.delivery ? JSON.parse(row.delivery) : null,
              review: row.review ? JSON.parse(row.review) : null
            }));
            resolve(submissions);
          }
        }
      );
    });
  },

  async getSubmissionById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM submissions WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else if (row) {
            // Parse JSON fields
            const submission = {
              ...row,
              delivery: row.delivery ? JSON.parse(row.delivery) : null,
              review: row.review ? JSON.parse(row.review) : null
            };
            resolve(submission);
          } else {
            resolve(null);
          }
        }
      );
    });
  },

  async updateSubmission(id, updates) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          if (key === 'delivery' || key === 'review') {
            fields.push(`${key} = ?`);
            values.push(JSON.stringify(updates[key]));
          } else {
            fields.push(`${key} = ?`);
            values.push(updates[key]);
          }
        }
      });
      
      if (fields.length === 0) {
        return resolve({ id, ...updates });
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      const query = `UPDATE submissions SET ${fields.join(', ')} WHERE id = ?`;
      
      db.run(query, values, function(err) {
        if (err) reject(err);
        else {
          // Buscar a submission atualizada
          db.get('SELECT * FROM submissions WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else if (row) {
              const submission = {
                ...row,
                delivery: row.delivery ? JSON.parse(row.delivery) : null,
                review: row.review ? JSON.parse(row.review) : null
              };
              resolve(submission);
            } else {
              resolve(null);
            }
          });
        }
      });
    });
  },

  // Logs
  async createLog(log) {
    return new Promise((resolve, reject) => {
      const { type, actor, challenge_id, submission_id, data } = log;
      db.run(
        'INSERT INTO logs (type, at, actor, challenge_id, submission_id, data) VALUES (?, ?, ?, ?, ?, ?)',
        [type, new Date().toISOString(), actor, challenge_id, submission_id, data ? JSON.stringify(data) : null],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...log });
        }
      );
    });
  },

  // Ranking functions
  async getRankingData() {
    return new Promise((resolve, reject) => {
      // Buscar crafters ativos ordenados por pontos
      const activesQuery = `
        SELECT id, nome as name, points, avatar_url, active 
        FROM crafters 
        WHERE active = 1 
        ORDER BY points DESC
      `;
      
      // Buscar crafters inativos
      const inactivesQuery = `
        SELECT id, nome as name, points, avatar_url, active 
        FROM crafters 
        WHERE active = 0 
        ORDER BY points DESC
      `;
      
      // Buscar top3
      const top3Query = `
        SELECT t.crafter_id, t.position, t.reward, c.nome as name, c.points
        FROM top3 t
        LEFT JOIN crafters c ON t.crafter_id = c.id
        ORDER BY t.position
      `;
      
      // Buscar configurações
      const settingsQuery = `
        SELECT * FROM ranking_settings 
        ORDER BY id DESC 
        LIMIT 1
      `;
      
      Promise.all([
        new Promise((res, rej) => db.all(activesQuery, (err, rows) => err ? rej(err) : res(rows))),
        new Promise((res, rej) => db.all(inactivesQuery, (err, rows) => err ? rej(err) : res(rows))),
        new Promise((res, rej) => db.all(top3Query, (err, rows) => err ? rej(err) : res(rows))),
        new Promise((res, rej) => db.get(settingsQuery, (err, row) => err ? rej(err) : res(row)))
      ]).then(([actives, inactives, top3, settings]) => {
        const merged = [...actives, ...inactives];
        const table = merged.map(c => ({ 
          crafter_id: c.id, 
          name: c.name, 
          points: c.points, 
          last_update: settings?.updated_at || new Date().toISOString() 
        }));
        
        resolve({
          week_ref: settings?.week_ref || '',
          top3: top3 || [],
          table,
          updated_at: settings?.updated_at || new Date().toISOString(),
          updated_by: settings?.updated_by || 'system',
          filters: {
            min_points: settings?.min_points || 0,
            max_points: settings?.max_points || null,
            active_only: settings?.active_only !== 0,
            search: settings?.search || ''
          }
        });
      }).catch(reject);
    });
  },

  async updateCrafterPoints(crafterId, delta, actor) {
    return new Promise((resolve, reject) => {
      // Primeiro buscar o crafter atual
      db.get('SELECT * FROM crafters WHERE id = ?', [crafterId], (err, crafter) => {
        if (err) return reject(err);
        if (!crafter) return reject(new Error('Crafter não encontrado'));
        
        const before = crafter.points || 0;
        const after = Math.max(0, before + delta);
        
        // Atualizar pontos
        db.run(
          'UPDATE crafters SET points = ? WHERE id = ?',
          [after, crafterId],
          function(updateErr) {
            if (updateErr) return reject(updateErr);
            
            // Criar histórico
            db.run(
              'INSERT INTO ranking_history (at, actor, action, crafter_id, before_points, after_points, diff) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [new Date().toISOString(), actor, 'score_change', crafterId, before, after, delta],
              function(histErr) {
                if (histErr) console.warn('Erro ao criar histórico:', histErr);
                resolve({ before, after, diff: delta });
              }
            );
          }
        );
      });
    });
  },

  async updateTop3(top3Data, actor) {
    return new Promise((resolve, reject) => {
      // Limpar top3 atual
      db.run('DELETE FROM top3', (err) => {
        if (err) return reject(err);
        
        // Inserir novos dados
        const insertPromises = top3Data.map(item => 
          new Promise((res, rej) => {
            db.run(
              'INSERT INTO top3 (crafter_id, position, reward) VALUES (?, ?, ?)',
              [item.crafter_id, item.position, item.reward || ''],
              function(insertErr) {
                if (insertErr) rej(insertErr);
                else res(this.lastID);
              }
            );
          })
        );
        
        Promise.all(insertPromises).then(() => {
          // Atualizar configurações
          this.updateRankingSettings({ updated_at: new Date().toISOString(), updated_by: actor })
            .then(() => {
              // Criar histórico
              db.run(
                'INSERT INTO ranking_history (at, actor, action) VALUES (?, ?, ?)',
                [new Date().toISOString(), actor, 'top3_update'],
                () => resolve(top3Data)
              );
            })
            .catch(reject);
        }).catch(reject);
      });
    });
  },

  async updateRankingSettings(settings) {
    return new Promise((resolve, reject) => {
      // Verificar se já existe configuração
      db.get('SELECT id FROM ranking_settings ORDER BY id DESC LIMIT 1', (err, existing) => {
        if (err) return reject(err);
        
        if (existing) {
          // Atualizar existente
          const fields = [];
          const values = [];
          
          Object.keys(settings).forEach(key => {
            if (settings[key] !== undefined) {
              fields.push(`${key} = ?`);
              values.push(settings[key]);
            }
          });
          
          if (fields.length > 0) {
            values.push(existing.id);
            db.run(
              `UPDATE ranking_settings SET ${fields.join(', ')} WHERE id = ?`,
              values,
              function(updateErr) {
                if (updateErr) reject(updateErr);
                else resolve(settings);
              }
            );
          } else {
            resolve(settings);
          }
        } else {
          // Criar novo
          const keys = Object.keys(settings);
          const placeholders = keys.map(() => '?').join(', ');
          const values = keys.map(key => settings[key]);
          
          db.run(
            `INSERT INTO ranking_settings (${keys.join(', ')}) VALUES (${placeholders})`,
            values,
            function(insertErr) {
              if (insertErr) reject(insertErr);
              else resolve({ id: this.lastID, ...settings });
            }
          );
        }
      });
    });
  },

  async getRankingHistory() {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM ranking_history ORDER BY at DESC LIMIT 50',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  async updateCrafter(id, updates) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });
      
      if (fields.length === 0) {
        return resolve({ id, ...updates });
      }
      
      values.push(id);
      db.run(
        `UPDATE crafters SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else {
            // Buscar crafter atualizado
            db.get('SELECT * FROM crafters WHERE id = ?', [id], (getErr, row) => {
              if (getErr) reject(getErr);
              else resolve(row);
            });
          }
        }
      );
    });
  },

  // Finanças
  async getFinancas() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM financas ORDER BY date DESC', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  async createFinanca(financa) {
    return new Promise((resolve, reject) => {
      const { id, item, valor, status, date, type, project_id, progress } = financa;
      db.run(
        'INSERT INTO financas (id, item, valor, status, date, type, project_id, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, item, valor, status || 'pending', date || new Date().toISOString(), type || 'other', project_id, progress || 0],
        function(err) {
          if (err) reject(err);
          else resolve({ id, ...financa });
        }
      );
    });
  },

  async updateFinanca(id, updates) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });
      
      if (fields.length === 0) {
        return resolve({ id, ...updates });
      }
      
      values.push(id);
      db.run(
        `UPDATE financas SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else {
            // Buscar finança atualizada
            db.get('SELECT * FROM financas WHERE id = ?', [id], (getErr, row) => {
              if (getErr) reject(getErr);
              else resolve(row);
            });
          }
        }
      );
    });
  }
};

export { db, dbOperations };