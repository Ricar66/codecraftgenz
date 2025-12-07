import 'dotenv/config';
import sql from 'mssql';

import { getConnectionPool } from '../src/lib/db.js';

async function run() {
  const pool = await getConnectionPool();
  const out = {};
  const q1 = await pool.request().query("SELECT a.id,a.name,a.owner_id FROM dbo.apps a WHERE a.owner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.users u WHERE u.id=a.owner_id)");
  out.apps_owner_missing = q1.recordset;
  const q2 = await pool.request().query("SELECT payment_id,app_id,user_id,payer_email,status FROM dbo.app_payments WHERE status='approved' AND user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.users u WHERE u.id=app_payments.user_id)");
  out.payments_bad_user = q2.recordset;
  const q3 = await pool.request().query("SELECT id,name,price,executable_url FROM dbo.apps WHERE ISNULL(price,0)>0 AND (executable_url IS NULL OR LTRIM(RTRIM(executable_url))='')");
  out.apps_missing_exec = q3.recordset;
  const q4 = await pool.request().query("SELECT TOP 50 id,user_id,app_id,email,hardware_id FROM dbo.user_licenses WHERE user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.users u WHERE u.id=user_licenses.user_id)");
  out.licenses_bad_user = q4.recordset;
  const q5 = await pool.request().query("SELECT TOP 50 app_id,email,hardware_id,status,message,created_at FROM dbo.license_activations WHERE status='denied' AND created_at>DATEADD(day,-7,SYSUTCDATETIME()) ORDER BY created_at DESC");
  out.recent_denied = q5.recordset;
  const appId = Number(process.env.APP_ID || 0);
  const email = String(process.env.EMAIL_CHECK || '').trim();
  if (appId > 0 && email) {
    const rq = pool.request().input('aid', sql.Int, appId).input('email', sql.NVarChar, email);
    const p = await rq.query("SELECT COUNT(*) AS total FROM dbo.app_payments WHERE app_id=@aid AND status='approved' AND payer_email=@email");
    const u = await rq.query("SELECT COUNT(*) AS total FROM dbo.user_licenses l JOIN dbo.users s ON l.user_id=s.id WHERE l.app_id=@aid AND s.email=@email AND l.hardware_id IS NOT NULL AND LTRIM(RTRIM(l.hardware_id))<>''");
    out.target_pair = { app_id: appId, email, approved_payments: p.recordset[0]?.total || 0, used_licenses: u.recordset[0]?.total || 0 };
    const list = await rq.query("SELECT id,user_id,email,hardware_id FROM dbo.user_licenses WHERE app_id=@aid AND email=@email ORDER BY id DESC");
    out.licenses_for_pair = list.recordset;
  }

  const relEmail = String(process.env.RELEASE_EMAIL || '').trim();
  const relAppId = Number(process.env.RELEASE_APP_ID || 0);
  const doRelease = String(process.env.DO_RELEASE || '').toLowerCase() === 'true';
  if (doRelease && relEmail && relAppId > 0) {
    const sel = await pool.request()
      .input('aid', sql.Int, relAppId)
      .input('email', sql.NVarChar, relEmail)
      .query("SELECT TOP 1 id, hardware_id FROM dbo.user_licenses WHERE app_id=@aid AND email=@email AND hardware_id IS NOT NULL AND LTRIM(RTRIM(hardware_id))<>'' ORDER BY updated_at DESC");
    const row = sel.recordset[0] || null;
    if (row) {
      const emptySlot = await pool.request()
        .input('aid', sql.Int, relAppId)
        .input('email', sql.NVarChar, relEmail)
        .query("SELECT TOP 1 id FROM dbo.user_licenses WHERE app_id=@aid AND email=@email AND LTRIM(RTRIM(hardware_id))='' ORDER BY id DESC");
      if (emptySlot.recordset[0]) {
        const eid = emptySlot.recordset[0].id;
        await pool.request().input('id', sql.Int, eid).query("DELETE FROM dbo.user_licenses WHERE id=@id");
      }
      await pool.request().input('id', sql.Int, row.id).query("UPDATE dbo.user_licenses SET hardware_id='', activated_at=NULL, updated_at=SYSUTCDATETIME() WHERE id=@id");
      out.release_result = { success: true, id: row.id };
    } else {
      out.release_result = { success: false, error: 'NO_BOUND_LICENSE' };
    }
  }

  const bindEmail = String(process.env.BIND_EMAIL || '').trim();
  const bindAppId = Number(process.env.BIND_APP_ID || 0);
  const bindHwid = String(process.env.BIND_HWID || '').trim();
  const doBind = String(process.env.DO_BIND || '').toLowerCase() === 'true';
  if (doBind && bindEmail && bindAppId > 0 && bindHwid) {
    const uRes = await pool.request().input('email', sql.NVarChar, bindEmail).query('SELECT TOP 1 id FROM dbo.users WHERE email=@email');
    let userId = uRes.recordset[0]?.id || null;
    if (!userId) {
      const newUser = await pool.request()
        .input('n', sql.NVarChar, bindEmail.split('@')[0])
        .input('e', sql.NVarChar, bindEmail)
        .query("INSERT INTO dbo.users (name, email, role, status, created_at) OUTPUT Inserted.id VALUES (@n, @e, 'viewer', 'ativo', SYSUTCDATETIME())");
      userId = newUser.recordset[0]?.id || null;
    }
    const appNameRes = await pool.request().input('id', sql.Int, bindAppId).query('SELECT name FROM dbo.apps WHERE id=@id');
    const appName = appNameRes.recordset[0]?.name || null;
    const upd = await pool.request()
      .input('aid', sql.Int, bindAppId)
      .input('email', sql.NVarChar, bindEmail)
      .input('hwid', sql.NVarChar, bindHwid)
      .input('appname', sql.NVarChar, appName)
      .input('key', sql.NVarChar, `LIC-${Date.now()}-${userId ?? 'anon'}`)
      .query("UPDATE dbo.user_licenses SET hardware_id=@hwid, license_key=@key, app_name=@appname, activated_at=ISNULL(activated_at, SYSUTCDATETIME()), updated_at=SYSUTCDATETIME() WHERE app_id=@aid AND email=@email AND LTRIM(RTRIM(hardware_id))='' ");
    if ((upd.rowsAffected?.[0] || 0) === 0) {
      await pool.request()
        .input('uid', sql.Int, userId)
        .input('aid', sql.Int, bindAppId)
        .input('appname', sql.NVarChar, appName)
        .input('email', sql.NVarChar, bindEmail)
        .input('hwid', sql.NVarChar, bindHwid)
        .input('key', sql.NVarChar, `LIC-${Date.now()}-${userId ?? 'anon'}`)
        .query('INSERT INTO dbo.user_licenses (user_id, app_id, app_name, email, hardware_id, license_key, activated_at, created_at) VALUES (@uid, @aid, @appname, @email, @hwid, @key, SYSUTCDATETIME(), SYSUTCDATETIME())');
    }
    out.bind_result = { success: true };
  }
  console.log(JSON.stringify(out));
  await sql.close();
}

run().catch(e => { console.error('DBCheckError:', e?.message || e); process.exit(1); });
