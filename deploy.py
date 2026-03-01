#!/usr/bin/env python3
"""
Deploy do CodeCraft Gen-Z para Hostinger.

Uso:
  python deploy.py              # Build + git push + deploy completo
  python deploy.py --skip-build # Pula o build (usa dist/ existente)
  python deploy.py --skip-git   # Pula o git push
  python deploy.py --fix-only   # Apenas corrige symlink + htaccess (sem sync)

Etapas:
  1. npm run build (gera dist/)
  2. git add + commit + push (dispara auto-deploy da Hostinger)
  3. Aguarda auto-deploy da Hostinger terminar (40s)
  4. Limpa assets antigos em nodejs/ no servidor
  5. Sincroniza dist/ -> nodejs/ via SFTP
  6. Garante symlink public_html/nodejs -> ../nodejs
  7. Atualiza public_html/.htaccess com versao correta

IMPORTANTE: Use SEMPRE este script para deploy.
            O auto-deploy da Hostinger sobrescreve o .htaccess e remove o symlink.
            Este script roda DEPOIS e corrige tudo.
"""

import os
import sys
import stat
import time
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

# Tempo para esperar o auto-deploy da Hostinger (segundos)
AUTO_DEPLOY_WAIT = 40

# Caminhos locais (relativos ao script)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_DIST = os.path.join(SCRIPT_DIR, 'dist')
LOCAL_HTACCESS = os.path.join(SCRIPT_DIR, 'hostinger', 'public_html.htaccess')

# Pastas a ignorar no sync (gerenciadas pelo backend/FTP)
SKIP_DIRS = {'downloads'}


def log(msg, level='INFO'):
    icons = {'INFO': '>', 'OK': '+', 'WARN': '!', 'ERR': 'X'}
    print(f"  [{icons.get(level, '>')}] {msg}")


def step(num, total, msg):
    print(f"\n{'='*60}")
    print(f"  {num}/{total}  {msg}")
    print(f"{'='*60}")


# ── 1. Build ──────────────────────────────────────────────────
def build(total):
    step(1, total, "Build do projeto (npm run build)")
    result = subprocess.run(['npm', 'run', 'build'], cwd=SCRIPT_DIR, shell=True)
    if result.returncode != 0:
        log("Build falhou!", 'ERR')
        sys.exit(1)
    log("Build concluido com sucesso", 'OK')


# ── 2. Git push ──────────────────────────────────────────────
def git_push(step_num, total):
    step(step_num, total, "Git commit + push")

    # Verifica se ha mudancas
    result = subprocess.run(
        ['git', 'status', '--porcelain'],
        cwd=SCRIPT_DIR, capture_output=True, text=True, shell=True
    )
    changes = result.stdout.strip()
    if not changes:
        log("Nenhuma mudanca para commitar", 'WARN')
        return False

    # Stage all tracked files + dist/
    subprocess.run(['git', 'add', '-u'], cwd=SCRIPT_DIR, shell=True)
    subprocess.run(['git', 'add', 'dist/'], cwd=SCRIPT_DIR, shell=True)

    # Commit
    result = subprocess.run(
        ['git', 'commit', '-m', 'deploy: update build'],
        cwd=SCRIPT_DIR, capture_output=True, text=True, shell=True
    )
    if result.returncode != 0:
        if 'nothing to commit' in result.stdout:
            log("Nada novo para commitar", 'WARN')
            return False
        log(f"Commit falhou: {result.stderr}", 'ERR')
        return False

    log("Commit criado", 'OK')

    # Push
    result = subprocess.run(
        ['git', 'push', 'origin', 'main'],
        cwd=SCRIPT_DIR, capture_output=True, text=True, shell=True
    )
    if result.returncode != 0:
        log(f"Push falhou: {result.stderr}", 'ERR')
        return False

    log("Push para origin/main concluido", 'OK')
    return True


# ── 3. Esperar auto-deploy ────────────────────────────────────
def wait_auto_deploy(step_num, total):
    step(step_num, total, f"Aguardando auto-deploy da Hostinger ({AUTO_DEPLOY_WAIT}s)")
    for i in range(AUTO_DEPLOY_WAIT, 0, -5):
        sys.stdout.write(f"\r  [>] {i}s restantes...")
        sys.stdout.flush()
        time.sleep(5)
    print(f"\r  [+] Auto-deploy deve ter finalizado    ")


# ── SFTP helpers ──────────────────────────────────────────────
def connect_sftp():
    transport = paramiko.Transport((SFTP_HOST, SFTP_PORT))
    transport.connect(username=SFTP_USER, password=SFTP_PASS)
    sftp = paramiko.SFTPClient.from_transport(transport)
    return sftp, transport


def clean_remote_assets(sftp, step_num, total):
    step(step_num, total, "Limpando assets antigos no servidor")
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


def sync_dist(sftp, step_num, total):
    step(step_num, total, "Sincronizando dist/ -> nodejs/")

    if not os.path.isdir(LOCAL_DIST):
        log(f"Pasta dist/ nao encontrada em {LOCAL_DIST}", 'ERR')
        log("Execute 'npm run build' primeiro ou remova --skip-build", 'ERR')
        sys.exit(1)

    uploaded = 0
    for root, dirs, files in os.walk(LOCAL_DIST):
        rel = os.path.relpath(root, LOCAL_DIST).replace(os.sep, '/')
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        if any(part in SKIP_DIRS for part in rel.split('/')):
            continue

        remote_path = REMOTE_NODEJS if rel == '.' else f'{REMOTE_NODEJS}/{rel}'
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


def ensure_symlink(sftp, step_num, total):
    step(step_num, total, "Garantindo symlink public_html/nodejs -> ../nodejs")

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

    try:
        resolved = sftp.readlink(symlink_path)
        log(f"Verificado: {symlink_path} -> {resolved}", 'OK')
    except Exception as e:
        log(f"Erro ao verificar symlink: {e}", 'ERR')


def upload_htaccess(sftp, step_num, total):
    step(step_num, total, "Atualizando public_html/.htaccess")

    if not os.path.isfile(LOCAL_HTACCESS):
        log(f"Arquivo nao encontrado: {LOCAL_HTACCESS}", 'ERR')
        return

    remote_htaccess = f'{REMOTE_PUBLIC}/.htaccess'
    sftp.put(LOCAL_HTACCESS, remote_htaccess)

    with sftp.open(remote_htaccess, 'r') as f:
        content = f.read().decode('utf-8')

    checks = {
        'FollowSymlinks': 'FollowSymlinks' in content,
        '/nodejs/index.html': '/nodejs/index.html' in content,
        '/nodejs/$1': '/nodejs/$1' in content,
    }

    all_ok = all(checks.values())
    for key, ok in checks.items():
        log(f"{key}: {'presente' if ok else 'AUSENTE!'}", 'OK' if ok else 'ERR')

    if all_ok:
        log(f".htaccess atualizado ({len(content)} bytes)", 'OK')
    else:
        log("ATENCAO: .htaccess pode estar incorreto!", 'ERR')


# ── Main ──────────────────────────────────────────────────────
def main():
    skip_build = '--skip-build' in sys.argv
    skip_git = '--skip-git' in sys.argv
    fix_only = '--fix-only' in sys.argv

    print("\n" + "=" * 60)
    print("  CodeCraft Gen-Z - Deploy para Hostinger")
    print("=" * 60)

    if fix_only:
        # Modo rapido: apenas corrige symlink + htaccess
        total = 2
        log(f"Conectando ao servidor {SFTP_HOST}:{SFTP_PORT}...")
        sftp, transport = connect_sftp()
        log("Conectado!", 'OK')
        try:
            ensure_symlink(sftp, 1, total)
            upload_htaccess(sftp, 2, total)
        finally:
            sftp.close()
            transport.close()
    else:
        # Deploy completo
        # Calcular total de etapas
        steps = []
        if not skip_build:
            steps.append('build')
        if not skip_git:
            steps.append('git')
            steps.append('wait')
        steps += ['clean', 'sync', 'symlink', 'htaccess']
        total = len(steps)
        s = 0

        # 1. Build
        if not skip_build:
            s += 1
            build(total)
        else:
            log("Build ignorado (--skip-build)")

        # 2. Git push
        did_push = False
        if not skip_git:
            s += 1
            did_push = git_push(s, total)
        else:
            log("Git push ignorado (--skip-git)")

        # 3. Esperar auto-deploy (so se fez push)
        if did_push:
            s += 1
            wait_auto_deploy(s, total)
        elif not skip_git:
            s += 1  # Count the step even if skipped
            log("Sem push, pulando espera do auto-deploy")

        # 4-7. SFTP
        log(f"Conectando ao servidor {SFTP_HOST}:{SFTP_PORT}...")
        sftp, transport = connect_sftp()
        log("Conectado!", 'OK')

        try:
            s += 1
            clean_remote_assets(sftp, s, total)
            s += 1
            sync_dist(sftp, s, total)
            s += 1
            ensure_symlink(sftp, s, total)
            s += 1
            upload_htaccess(sftp, s, total)
        finally:
            sftp.close()
            transport.close()

    print(f"\n{'='*60}")
    print("  Deploy concluido com sucesso!")
    print(f"  Site: https://codecraftgenz.com.br")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
