import os
from pathlib import Path

from dotenv import load_dotenv


load_dotenv()


def env_bool(name, default):
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}

BASE_DIR = Path(__file__).resolve().parent.parent
DOCUMENTS_DIR = BASE_DIR / "Documents"
RAW_DIR = DOCUMENTS_DIR / "raw"
CLEANED_DIR = DOCUMENTS_DIR / "cleaned"
CHUNKS_DIR = DOCUMENTS_DIR / "chunks"
CHUNKS_FILE = CHUNKS_DIR / "muungano_chunks.json"
CHROMA_DIR = BASE_DIR / "vector_db"
AUTH_DB_FILE = BASE_DIR / "muunganohub_auth.sqlite3"
DATABASE_DIR = BASE_DIR / "database"

COLLECTION_NAME = "muungano_documents"

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "800"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))
TOP_K = int(os.getenv("TOP_K", "8"))
FETCH_K = int(os.getenv("FETCH_K", "60"))

USE_LLM = env_bool("USE_LLM", True)
LLM_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
MAX_CONTEXT_CHARS = int(os.getenv("MAX_CONTEXT_CHARS", "12000"))

# Offline mode is the default for demos and school/competition use.
# It keeps the app on local documents, local embeddings, ChromaDB, and the
# local backend. Online-only services such as OpenAI and registration SMTP are skipped.
OFFLINE_MODE = env_bool("OFFLINE_MODE", True)

LOCAL_EMBEDDING_MODEL = os.getenv(
    "LOCAL_EMBEDDING_MODEL",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
).strip() or "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1").strip() or "127.0.0.1"
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "root").strip() or "root"
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "muunganohub").strip() or "muunganohub"
SESSION_TTL_HOURS = int(os.getenv("SESSION_TTL_HOURS", "24"))

SEND_REGISTRATION_EMAILS = env_bool("SEND_AUTH_EMAILS", False)
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", os.getenv("SMTP_EMAIL", "")).strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "").strip()
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "MuunganoHub").strip() or "MuunganoHub"
APP_URL = os.getenv("APP_URL", "http://127.0.0.1:8001").strip() or "http://127.0.0.1:8001"

ADMIN_EMAILS = [e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()]
