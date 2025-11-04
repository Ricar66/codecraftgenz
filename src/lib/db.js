import dotenv from 'dotenv'
import sql from 'mssql'

// Carregar variáveis de ambiente
dotenv.config()

const dbConfig = {
  server: process.env.DB_SERVER || 'server-db-codegenz.database.windows.net',
  user: process.env.DB_USER || 'admin-gen',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
}

// Alternativa: usar DATABASE_URL completa
// const connectionString = process.env.DATABASE_URL

let pool = null
let poolPromise = null

/**
 * Retorna uma promessa que resolve para o pool de conexão global.
 * @returns {Promise<sql.ConnectionPool>}
 */
export function getConnectionPool() {
  if (pool) {
    return Promise.resolve(pool)
  }

  if (poolPromise) {
    return poolPromise
  }

  poolPromise = (async () => {
    try {
      // Se estiver usando a DATABASE_URL:
      // pool = new sql.ConnectionPool(connectionString)

      // Se estiver usando o dbConfig:
      if (!dbConfig.password || !dbConfig.database) {
        console.error('Variáveis de ambiente do banco (DB_PASSWORD, DB_DATABASE) não estão definidas.')
        // Fallback simples para tentar extrair da DATABASE_URL
        const url = process.env.DATABASE_URL || ''
        if (url) {
          try {
            // Extrai senha e database de uma connection string MSSQL típica
            // Ex.: mssql://user:password@host:1433/database?encrypt=true
            const afterProto = url.split('://')[1] || ''
            const creds = afterProto.split('@')[0] || ''
            const pwd = creds.split(':')[1]
            const path = afterProto.split('/')[1] || ''
            if (!dbConfig.password && pwd) dbConfig.password = pwd
            if (!dbConfig.database && path) dbConfig.database = path.split('?')[0]
          } catch (e) {
            console.warn('Não foi possível inferir dados da DATABASE_URL:', e)
          }
        }
      }

      pool = new sql.ConnectionPool(dbConfig)
      await pool.connect()
      console.log('✅ Conectado ao Azure SQL Database')

      pool.on('error', err => {
        console.error('Erro no pool do SQL Server', err)
        pool = null
        poolPromise = null
      })

      return pool
    } catch (err) {
      console.error('Falha ao conectar ao banco de dados', err)
      pool = null
      poolPromise = null
      throw err
    }
  })()

  return poolPromise
}

// Exportar o 'sql' para usar os tipos (ex: sql.NVarChar)
export const dbSql = sql