# Sobe arquivos PWA (sw.js, workbox-*, manifest, sw-push.js) direto pra public_html/
# Resolve o caso em que o deploy.py sincroniza só /nodejs/ mas o /sw.js da URL raiz
# fica servindo cópia antiga em public_html/.
import os, sys, paramiko
from pathlib import Path
from dotenv import load_dotenv

load_dotenv('.env.deploy')

HOST = os.getenv('SFTP_HOST')
PORT = int(os.getenv('SFTP_PORT', '22'))
USER = os.getenv('SFTP_USER')
PASS = os.getenv('SFTP_PASS')

REMOTE_PUBLIC = '/home/u984096926/domains/codecraftgenz.com.br/public_html'
LOCAL_DIST = Path(__file__).parent / 'dist'

# Arquivos PWA que precisam estar na raiz pra serem acessiveis em /
PWA_FILES = ['sw.js', 'sw-push.js', 'manifest.webmanifest', 'registerSW.js']
WORKBOX_GLOB = 'workbox-*.js'

t = paramiko.Transport((HOST, PORT))
t.connect(username=USER, password=PASS)
sftp = paramiko.SFTPClient.from_transport(t)
print(f"[+] Conectado: {HOST}:{PORT}")

# Lista antes
print("\n[i] sw.js no servidor antes:")
try:
    s = sftp.stat(f'{REMOTE_PUBLIC}/sw.js')
    print(f"    size={s.st_size} mtime={s.st_mtime}")
except FileNotFoundError:
    print("    (nao existe)")

uploaded = 0
for fname in PWA_FILES:
    local = LOCAL_DIST / fname
    if not local.exists():
        print(f"[-] skip (local nao existe): {fname}")
        continue
    remote = f'{REMOTE_PUBLIC}/{fname}'
    sftp.put(str(local), remote)
    uploaded += 1
    print(f"[OK] {fname} -> {remote}")

# workbox-XYZ.js
for local in LOCAL_DIST.glob(WORKBOX_GLOB):
    remote = f'{REMOTE_PUBLIC}/{local.name}'
    sftp.put(str(local), remote)
    uploaded += 1
    print(f"[OK] {local.name} -> {remote}")

print(f"\n[+] {uploaded} arquivos subidos")

# Confirma depois
print("\n[i] sw.js no servidor depois:")
s = sftp.stat(f'{REMOTE_PUBLIC}/sw.js')
print(f"    size={s.st_size} mtime={s.st_mtime}")

sftp.close()
t.close()
print("[+] Concluido")
