# Sobe o index.html novo direto pra public_html/
# Necessário porque crawlers (WhatsApp, Discord, LinkedIn, Google) leem
# o HTML estatico do path raiz, e o deploy normal so sincroniza /nodejs/.
import os, paramiko
from pathlib import Path
from dotenv import load_dotenv

load_dotenv('.env.deploy')

HOST = os.getenv('SFTP_HOST')
PORT = int(os.getenv('SFTP_PORT', '22'))
USER = os.getenv('SFTP_USER')
PASS = os.getenv('SFTP_PASS')

REMOTE_PUBLIC = '/home/u984096926/domains/codecraftgenz.com.br/public_html'
LOCAL = Path(__file__).parent / 'dist' / 'index.html'

t = paramiko.Transport((HOST, PORT))
t.connect(username=USER, password=PASS)
sftp = paramiko.SFTPClient.from_transport(t)
print(f"[+] Conectado: {HOST}:{PORT}")

remote = f'{REMOTE_PUBLIC}/index.html'
try:
    s_before = sftp.stat(remote)
    print(f"[i] Antes: size={s_before.st_size}")
except FileNotFoundError:
    print("[i] Antes: (nao existe)")

sftp.put(str(LOCAL), remote)
s_after = sftp.stat(remote)
print(f"[OK] Subiu: {remote} size={s_after.st_size}")

sftp.close()
t.close()
print("[+] Concluido")
