const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Função para criar hash da senha
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Criando usuário admin...');

// Dados do admin
const adminData = {
  nome: 'Admin',
  email: 'admin@codecraft.dev',
  senha: 'Admin!123',
  role: 'admin',
  status: 'active'
};

// Criar hash da senha
const senhaHash = hashPassword(adminData.senha);

// Primeiro, verificar se o usuário já existe
db.get('SELECT * FROM usuarios WHERE email = ?', [adminData.email], (err, existingUser) => {
  if (err) {
    console.error('Erro ao verificar usuário existente:', err);
    db.close();
    return;
  }

  if (existingUser) {
    console.log('Usuário admin já existe. Atualizando senha...');
    // Atualizar senha do usuário existente
    db.run(
      'UPDATE usuarios SET senha_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
      [senhaHash, adminData.email],
      function(updateErr) {
        if (updateErr) {
          console.error('Erro ao atualizar usuário:', updateErr);
        } else {
          console.log('✅ Senha do admin atualizada com sucesso!');
          console.log('📧 Email:', adminData.email);
          console.log('🔑 Senha:', adminData.senha);
        }
        db.close();
      }
    );
  } else {
    console.log('Criando novo usuário admin...');
    // Criar novo usuário
    db.run(
      'INSERT INTO usuarios (nome, email, senha_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [adminData.nome, adminData.email, senhaHash, adminData.role, adminData.status],
      function(insertErr) {
        if (insertErr) {
          console.error('Erro ao criar usuário:', insertErr);
        } else {
          console.log('✅ Usuário admin criado com sucesso!');
          console.log('🆔 ID:', this.lastID);
          console.log('📧 Email:', adminData.email);
          console.log('🔑 Senha:', adminData.senha);
          console.log('👤 Role:', adminData.role);
        }
        db.close();
      }
    );
  }
});