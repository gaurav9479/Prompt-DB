from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv
from pathlib import Path


backend_env = Path(__file__).resolve().parent.parent / '.env'
if backend_env.exists():
    load_dotenv(dotenv_path=backend_env)
else:
    load_dotenv()

FERNET_KEY = os.environ.get("FERNET_SECRET_KEY")
if not FERNET_KEY:

    FERNET_KEY = Fernet.generate_key()
else:
    if isinstance(FERNET_KEY, str):
        FERNET_KEY = FERNET_KEY.encode()

fernet = Fernet(FERNET_KEY)

def encrypt_credential(plain_text: str) -> str:
    if not plain_text:
        return ""
    return fernet.encrypt(plain_text.encode()).decode()

def decrypt_credential(encrypted_text: str) -> str:
    if not encrypted_text:
        return ""
    return fernet.decrypt(encrypted_text.encode()).decode()
