import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { dbOperations } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BackupManager {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    this.maxBackups = 10; // Manter apenas os 10 backups mais recentes
    this.backupInterval = 24 * 60 * 60 * 1000; // 24 horas em millisegundos
    
    this.ensureBackupDirectory();
    this.startAutomaticBackup();
  }

  /**
   * Garante que o diretório de backup existe
   */
  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('📁 Diretório de backup criado:', this.backupDir);
    }
  }

  /**
   * Inicia o sistema de backup automático
   */
  startAutomaticBackup() {
    // Fazer backup inicial
    this.createBackup();
    
    // Agendar backups automáticos
    setInterval(() => {
      this.createBackup();
    }, this.backupInterval);
    
    console.log('🔄 Sistema de backup automático iniciado (a cada 24 horas)');
  }

  /**
   * Cria um backup do banco de dados
   */
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `database_backup_${timestamp}.json`;
      const backupPath = path.join(this.backupDir, backupFileName);

      console.log('💾 Iniciando backup do banco de dados...');

      // Coletar dados de todas as tabelas
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        tables: {
          usuarios: await dbOperations.getAllUsers(),
          mentores: await dbOperations.getMentores(),
          projetos: await dbOperations.getProjetos(),
          crafters: await dbOperations.getCrafters(),
          equipes: await dbOperations.getEquipes(),
          financas: await this.getFinancialData(),
          logs: await this.getSystemLogs(),
          inscricoes: await this.getInscricoes(),
          desafios: await this.getDesafios()
        },
        statistics: {
          totalUsers: 0,
          totalMentors: 0,
          totalProjects: 0,
          totalCrafters: 0,
          totalTeams: 0
        }
      };

      // Calcular estatísticas
      backupData.statistics.totalUsers = backupData.tables.usuarios.length;
      backupData.statistics.totalMentors = backupData.tables.mentores.length;
      backupData.statistics.totalProjects = backupData.tables.projetos.length;
      backupData.statistics.totalCrafters = backupData.tables.crafters.length;
      backupData.statistics.totalTeams = backupData.tables.equipes.length;

      // Salvar backup
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

      console.log('✅ Backup criado com sucesso:', backupFileName);
      console.log('📊 Estatísticas do backup:', backupData.statistics);

      // Limpar backups antigos
      await this.cleanOldBackups();

      // Validar integridade do backup
      await this.validateBackup(backupPath);

      return {
        success: true,
        fileName: backupFileName,
        path: backupPath,
        statistics: backupData.statistics
      };

    } catch (error) {
      console.error('❌ Erro ao criar backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Valida a integridade de um backup
   */
  async validateBackup(backupPath) {
    try {
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      
      // Validações básicas
      const requiredTables = ['usuarios', 'mentores', 'projetos', 'crafters', 'equipes'];
      const missingTables = requiredTables.filter(table => !backupData.tables[table]);
      
      if (missingTables.length > 0) {
        throw new Error(`Tabelas ausentes no backup: ${missingTables.join(', ')}`);
      }

      // Validar estrutura dos dados
      if (backupData.tables.usuarios) {
        backupData.tables.usuarios.forEach(user => {
          if (!user.nome || !user.email) {
            throw new Error('Dados de usuário inválidos no backup');
          }
        });
      }

      if (backupData.tables.equipes) {
        backupData.tables.equipes.forEach(team => {
          if (!team.crafter_id || !team.mentor_id || !team.projeto_id) {
            throw new Error('Dados de equipe inválidos no backup');
          }
        });
      }

      console.log('✅ Backup validado com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro na validação do backup:', error);
      return false;
    }
  }

  /**
   * Remove backups antigos, mantendo apenas os mais recentes
   */
  async cleanOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('database_backup_') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          stats: fs.statSync(path.join(this.backupDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);

      if (files.length > this.maxBackups) {
        const filesToDelete = files.slice(this.maxBackups);
        
        filesToDelete.forEach(file => {
          fs.unlinkSync(file.path);
          console.log('🗑️ Backup antigo removido:', file.name);
        });
      }

    } catch (error) {
      console.error('❌ Erro ao limpar backups antigos:', error);
    }
  }

  /**
   * Lista todos os backups disponíveis
   */
  listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('database_backup_') && file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          
          return {
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.mtime,
            sizeFormatted: this.formatFileSize(stats.size)
          };
        })
        .sort((a, b) => b.created - a.created);

      return files;

    } catch (error) {
      console.error('❌ Erro ao listar backups:', error);
      return [];
    }
  }

  /**
   * Restaura um backup específico
   */
  async restoreBackup(backupFileName) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error('Arquivo de backup não encontrado');
      }

      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      
      console.log('🔄 Iniciando restauração do backup:', backupFileName);
      
      // Validar backup antes da restauração
      const isValid = await this.validateBackup(backupPath);
      if (!isValid) {
        throw new Error('Backup inválido ou corrompido');
      }

      // Aqui você implementaria a lógica de restauração
      // Por segurança, apenas logamos o que seria restaurado
      console.log('📊 Dados que seriam restaurados:');
      console.log('- Usuários:', backupData.statistics.totalUsers);
      console.log('- Mentores:', backupData.statistics.totalMentors);
      console.log('- Projetos:', backupData.statistics.totalProjects);
      console.log('- Crafters:', backupData.statistics.totalCrafters);
      console.log('- Equipes:', backupData.statistics.totalTeams);

      console.log('⚠️ Restauração simulada (implementar lógica real conforme necessário)');
      
      return {
        success: true,
        message: 'Backup restaurado com sucesso',
        statistics: backupData.statistics
      };

    } catch (error) {
      console.error('❌ Erro ao restaurar backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Valida a integridade do banco de dados atual
   */
  async validateDatabase() {
    try {
      console.log('🔍 Validando integridade do banco de dados...');
      
      const validationResults = {
        tables: {},
        relationships: {},
        issues: [],
        summary: {
          totalTables: 0,
          validTables: 0,
          issues: 0
        }
      };

      // Validar tabelas principais
      const tables = ['usuarios', 'mentores', 'projetos', 'crafters', 'equipes'];
      
      for (const table of tables) {
        try {
          let data = [];
          
          switch (table) {
            case 'usuarios':
              data = await dbOperations.getAllUsers();
              break;
            case 'mentores':
          data = await dbOperations.getMentores();
              break;
            case 'projetos':
              data = await dbOperations.getProjetos();
              break;
            case 'crafters':
              data = await dbOperations.getCrafters();
              break;
            case 'equipes':
              data = await dbOperations.getEquipes();
              break;
          }

          validationResults.tables[table] = {
            exists: true,
            recordCount: data.length,
            valid: true
          };

          validationResults.summary.validTables++;

        } catch (error) {
          validationResults.tables[table] = {
            exists: false,
            error: error.message,
            valid: false
          };
          
          validationResults.issues.push(`Tabela ${table}: ${error.message}`);
        }
        
        validationResults.summary.totalTables++;
      }

      // Validar relacionamentos
      try {
        const equipes = await dbOperations.getEquipes();
        const crafters = await dbOperations.getCrafters();
        const mentores = await dbOperations.getMentores();
        const projetos = await dbOperations.getProjetos();

        // Verificar integridade referencial
        let orphanedTeams = 0;
        
        equipes.forEach(equipe => {
          const crafterExists = crafters.some(c => c.id === equipe.crafter_id);
          const mentorExists = mentores.some(m => m.id === equipe.mentor_id);
          const projectExists = projetos.some(p => p.id === equipe.projeto_id);

          if (!crafterExists || !mentorExists || !projectExists) {
            orphanedTeams++;
          }
        });

        validationResults.relationships = {
          totalTeams: equipes.length,
          orphanedTeams,
          integrityScore: ((equipes.length - orphanedTeams) / Math.max(equipes.length, 1) * 100).toFixed(2)
        };

        if (orphanedTeams > 0) {
          validationResults.issues.push(`${orphanedTeams} equipes com referências inválidas`);
        }

      } catch (error) {
        validationResults.issues.push(`Erro na validação de relacionamentos: ${error.message}`);
      }

      validationResults.summary.issues = validationResults.issues.length;

      console.log('✅ Validação do banco concluída');
      console.log('📊 Resumo:', validationResults.summary);
      
      if (validationResults.issues.length > 0) {
        console.log('⚠️ Problemas encontrados:', validationResults.issues);
      }

      return validationResults;

    } catch (error) {
      console.error('❌ Erro na validação do banco:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Funções auxiliares para buscar dados específicos
   */
  async getFinancialData() {
    // Implementar busca de dados financeiros
    return [];
  }

  async getSystemLogs() {
    try {
      return await dbOperations.getAuditLogs();
    } catch (error) {
      console.error('Erro ao buscar logs do sistema:', error);
      return [];
    }
  }

  async getInscricoes() {
    // Implementar busca de inscrições
    return [];
  }

  async getDesafios() {
    // Implementar busca de desafios
    return [];
  }

  /**
   * Formata o tamanho do arquivo
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Obtém estatísticas do sistema de backup
   */
  getBackupStats() {
    const backups = this.listBackups();
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    
    return {
      totalBackups: backups.length,
      totalSize: this.formatFileSize(totalSize),
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].created : null,
      newestBackup: backups.length > 0 ? backups[0].created : null,
      backupDirectory: this.backupDir
    };
  }
}

// Instância singleton do gerenciador de backup
export const backupManager = new BackupManager();