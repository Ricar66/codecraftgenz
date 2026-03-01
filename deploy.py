#!/usr/bin/env python3
"""
Deploy do CodeCraft Gen-Z para Hostinger via SFTP.

Uso:
  python deploy.py          # Build + deploy completo
  python deploy.py --skip-build  # Apenas deploy (usa dist/ existente)

O que faz:
  1. npm run build (gera dist/)
  2. Limpa assets antigos em nodejs/ no servidor
  3. Sincroniza dist/ -> nodejs/ via SFTP
  4. Garante symlink public_html/nodejs -> ../nodejs
  5. Atualiza public_html/.htaccess com versao correta
"""

import os
import sys
import stat
import subprocess
import paramiko

# ── Configuracao ──────────────────────────────────────────────
SFTP_HOST = '147.93.37.67'
SFTP_PORT = 65002
SFTP_USER = 'u984096926'
SFTP_PASS = 'MafagafaGenZ@23'

BASE_DIR = '/home/u984096926/domains/codecraftgenz.com.br'
REMOTE_NODEJS = f'{BASE_DIR}/nodejs'
REMOTE_PUBLIC = f'{BASE_DIR}/public_html'

# Caminhos locais (relativos ao script)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_DIST = os.path.join(SCRIPT_DIR, 'dist')
LOCAL_HTACCESS = os.path.join(SCRIPT_DIR, 'hostinger', 'public_html.htaccess')


def log(msg, level='INFO'):
    icons = {'INFO': '>', 'OK': '+', 'WARN': '!', 'ERR': 'X'}
    print(f"  [{icons.get(level, '>')}] {msg}")


def step(msg):
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}")


def build():
    """Executa npm run build."""
    step("1/5  Build do projeto (npm run build)")
    result = subprocess.run(
        ['npm', 'run', 'build'],
        cwd=SCRIPT_DIR,
        shell=True,
    )
    if result.returncode != 0:
        log("Build falhou!", 'ERR')
        sys.exit(1)
    log("Build concluido com sucesso", 'OK')


def connect_sftp():
    """Conecta ao servidor via SFTP."""
    transport = paramiko.Transport((SFTP_HOST, SFTP_PORT))
    transport.connect(username=SFTP_USER, password=SFTP_PASS)
    sftp = paramiko.SFTPClient.from_transport(transport)
    return sftp, transport


def clean_remote_assets(sftp):
    """Remove assets antigos do servidor."""
    step("2/5  Limpando assets antigos no servidor")
    remote_assets = f'{REMOTE_NODEJS}/assets'
    try:
        files = sftp.listdir(remote_assets)
        for f in files:
            try:
                sftp.remove(f'{remote_assets}/{f}')
            except Exception:
                pass
        log(f"Removidos {len(files)} assets antigos", 'OK')
    except FileNotFoundError:
        log("Pasta assets/ nao existe ainda, sera criada", 'WARN')


def sync_dist(sftp):
    """Sincroniza dist/ local para nodejs/ no servidor."""
    step("3/5  Sincronizando dist/ -> nodejs/")

    if not os.path.isdir(LOCAL_DIST):
        log(f"Pasta dist/ nao encontrada em {LOCAL_DIST}", 'ERR')
        log("Execute 'npm run build' primeiro ou remova --skip-build", 'ERR')
        sys.exit(1)

    # Pastas a ignorar (gerenciadas pelo backend/FTP, nao pelo deploy frontend)
    skip_dirs = {'downloads'}

    uploaded = 0
    for root, dirs, files in os.walk(LOCAL_DIST):
        # Caminho relativo ao dist/
        rel = os.path.relpath(root, LOCAL_DIST).replace(os.sep, '/')

        # Pular pastas que nao devem ser sincronizadas
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        if any(part in skip_dirs for part in rel.split('/')):
            continue

        remote_path = REMOTE_NODEJS if rel == '.' else f'{REMOTE_NODEJS}/{rel}'

        # Garantir que o diretorio remoto existe
        try:
            sftp.stat(remote_path)
        except FileNotFoundError:
            sftp.mkdir(remote_path)
            log(f"Diretorio criado: {rel}/")

        for fname in files:
            local_file = os.path.join(root, fname)
            remote_file = f'{remote_path}/{fname}'
            sftp.put(local_file, remote_file)
            uploaded += 1

    log(f"Upload de {uploaded} arquivos concluido", 'OK')


def ensure_symlink(sftp):
    """Garante que public_html/nodejs aponta para ../nodejs."""
    step("4/5  Verificando symlink public_html/nodejs -> ../nodejs")

    symlink_path = f'{REMOTE_PUBLIC}/nodejs'
    target = '../nodejs'

    needs_create = False

    try:
        attr = sftp.lstat(symlink_path)
        if stat.S_ISLNK(attr.st_mode):
            current_target = sftp.readlink(symlink_path)
            if current_target == target:
                log("Symlink ja existe e esta correto", 'OK')
                return
            else:
                log(f"Symlink aponta para '{current_target}', corrigindo...", 'WARN')
                sftp.remove(symlink_path)
                needs_create = True
        elif stat.S_ISDIR(attr.st_mode):
            log("Existe diretorio real nodejs/ em public_html, removendo...", 'WARN')
            # Tenta remover diretorio (se vazio)
            try:
                sftp.rmdir(symlink_path)
            except Exception:
                log("Nao foi possivel remover diretorio nodejs/ (nao vazio)", 'ERR')
                log("Remova manualmente via painel Hostinger", 'ERR')
                return
            needs_create = True
        else:
            sftp.remove(symlink_path)
            needs_create = True
    except FileNotFoundError:
        needs_create = True

    if needs_create:
        sftp.symlink(target, symlink_path)
        log(f"Symlink criado: public_html/nodejs -> {target}", 'OK')

    # Verificar
    try:
        resolved = sftp.readlink(symlink_path)
        log(f"Verificado: {symlink_path} -> {resolved}", 'OK')
    except Exception as e:
        log(f"Erro ao verificar symlink: {e}", 'ERR')


def upload_htaccess(sftp):
    """Envia o .htaccess correto para public_html/."""
    step("5/5  Atualizando public_html/.htaccess")

    if not os.path.isfile(LOCAL_HTACCESS):
        log(f"Arquivo nao encontrado: {LOCAL_HTACCESS}", 'ERR')
        return

    remote_htaccess = f'{REMOTE_PUBLIC}/.htaccess'
    sftp.put(LOCAL_HTACCESS, remote_htaccess)

    # Verificar
    with sftp.open(remote_htaccess, 'r') as f:
        content = f.read().decode('utf-8')

    checks = {
        'FollowSymlinks': 'FollowSymlinks' in content,
        '/nodejs/index.html': '/nodejs/index.html' in content,
        '/nodejs/$1': '/nodejs/$1' in content,
    }

    all_ok = all(checks.values())
    for key, ok in checks.items():
        status = 'OK' if ok else 'ERR'
        log(f"{key}: {'presente' if ok else 'AUSENTE!'}", status)

    if all_ok:
        log(f".htaccess atualizado ({len(content)} bytes)", 'OK')
    else:
        log("ATENCAO: .htaccess pode estar incorreto!", 'ERR')


def main():
    skip_build = '--skip-build' in sys.argv

    print("\n" + "=" * 60)
    print("  CodeCraft Gen-Z - Deploy para Hostinger")
    print("=" * 60)

    # 1. Build
    if not skip_build:
        build()
    else:
        log("Build ignorado (--skip-build)")

    # 2-5. SFTP
    log(f"Conectando ao servidor {SFTP_HOST}:{SFTP_PORT}...")
    sftp, transport = connect_sftp()
    log("Conectado!", 'OK')

    try:
        clean_remote_assets(sftp)  # 2
        sync_dist(sftp)            # 3
        ensure_symlink(sftp)       # 4
        upload_htaccess(sftp)      # 5
    finally:
        sftp.close()
        transport.close()

    print(f"\n{'='*60}")
    print("  Deploy concluido com sucesso!")
    print(f"  Site: https://codecraftgenz.com.br")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
