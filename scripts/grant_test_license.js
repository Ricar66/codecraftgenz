import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConnectionPool, dbSql } from '../src/lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from root
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.development') });

const APP_ID = 103;
const EMAIL = process.argv[2] || 'codecraftgenz@gmail.com';

async function run() {
  try {
    const pool = await getConnectionPool();
    console.log(`Checking App ID ${APP_ID}...`);
    const appRes = await pool.request().input('id', dbSql.Int, APP_ID).query('SELECT id, name FROM dbo.apps WHERE id=@id');
    if (appRes.recordset.length === 0) {
      console.error(`App ID ${APP_ID} not found!`);
      process.exit(1);
    }
    const appName = appRes.recordset[0].name;
    console.log(`App found: ${appName}`);

    console.log(`Granting license to ${EMAIL}...`);
    
    // Check if already approved payment exists
    const checkRes = await pool.request()
      .input('aid', dbSql.Int, APP_ID)
      .input('email', dbSql.NVarChar, EMAIL)
      .query("SELECT payment_id FROM dbo.app_payments WHERE app_id=@aid AND payer_email=@email AND status='approved'");

    if (checkRes.recordset.length > 0) {
      console.log('License already granted (approved payment exists).');
    } else {
      await pool.request()
        .input('aid', dbSql.Int, APP_ID)
        .input('email', dbSql.NVarChar, EMAIL)
        .input('amount', dbSql.Decimal(10, 2), 0.00)
        .input('currency', dbSql.NVarChar, 'BRL')
        .input('pid', dbSql.NVarChar, `TEST-${Date.now()}`)
        .query("INSERT INTO dbo.app_payments (payment_id, app_id, payer_email, amount, currency, status, created_at, updated_at) VALUES (@pid, @aid, @email, @amount, @currency, 'approved', SYSUTCDATETIME(), SYSUTCDATETIME())");
      console.log('License granted successfully!');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
