import { getConnectionPool } from '../src/lib/db.js';
import process from 'process';

async function run() {
  try {
    console.log('Connecting to database...');
    const pool = await getConnectionPool();
    console.log('Connected. Altering dbo.mentores table...');
    
    // Alter avatar_url to NVARCHAR(MAX) to support large Data URLs
    await pool.request().query(`
      ALTER TABLE dbo.mentores
      ALTER COLUMN avatar_url NVARCHAR(MAX)
    `);
    
    console.log('Successfully altered avatar_url to NVARCHAR(MAX).');
    process.exit(0);
  } catch (err) {
    console.error('Error updating schema:', err);
    process.exit(1);
  }
}

run();
