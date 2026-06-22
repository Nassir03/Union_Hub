import hashlib
import hmac
import os
import re
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone

import pymysql
from dotenv import load_dotenv

try:
    from .rag_config import (
        AUTH_DB_FILE,
        MYSQL_DATABASE,
        MYSQL_HOST,
        MYSQL_PASSWORD,
        MYSQL_PORT,
        MYSQL_USER,
        SESSION_TTL_HOURS,
    )
except ImportError:
    from rag_config import (
        AUTH_DB_FILE,
        MYSQL_DATABASE,
        MYSQL_HOST,
        MYSQL_PASSWORD,
        MYSQL_PORT,
        MYSQL_USER,
        SESSION_TTL_HOURS,
    )


load_dotenv()

PBKDF2_ITERATIONS = 260_000
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def auth_backend():
    return os.getenv("AUTH_BACKEND", "sqlite").strip().lower()


def use_sqlite():
    return auth_backend() == "sqlite"


def get_sqlite_connection():
    AUTH_DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(AUTH_DB_FILE)
    connection.row_factory = sqlite3.Row
    return connection


def get_connection(database=True):
    return pymysql.connect(
        host=os.getenv("MYSQL_HOST", MYSQL_HOST),
        port=int(os.getenv("MYSQL_PORT", MYSQL_PORT)),
        user=os.getenv("MYSQL_USER", MYSQL_USER),
        password=os.getenv("MYSQL_PASSWORD", MYSQL_PASSWORD),
        database=os.getenv("MYSQL_DATABASE", MYSQL_DATABASE) if database else None,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )


def init_auth_db():
    if use_sqlite():
        with get_sqlite_connection() as connection:
            cursor = connection.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    profile_status TEXT,
                    profile_photo_url TEXT,
                    profile_photo_thumb_url TEXT,
                    updated_at TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            ensure_sqlite_user_profile_columns(cursor)
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    token TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    expires_at TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
                """
            )
            ensure_sqlite_session_columns(cursor)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS auth_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    name TEXT,
                    email TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                )
                """
            )
            ensure_sqlite_auth_event_columns(cursor)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_auth_events_user_id ON auth_events(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_auth_events_email ON auth_events(email)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_auth_events_type_time ON auth_events(event_type, created_at)")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    token TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    expires_at TEXT NOT NULL,
                    used_at TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
                """
            )
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON password_reset_tokens(expires_at)")
            connection.commit()
        return

    database_name = os.getenv("MYSQL_DATABASE", MYSQL_DATABASE)

    try:
        with get_connection(database=False) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"CREATE DATABASE IF NOT EXISTS `{database_name}` "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )

        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(80) NOT NULL,
                        email VARCHAR(120) NOT NULL UNIQUE,
                        password_hash VARCHAR(255) NOT NULL,
                        profile_status VARCHAR(160) NULL,
                        profile_photo_url VARCHAR(500) NULL,
                        profile_photo_thumb_url VARCHAR(500) NULL,
                        updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """
                )
                ensure_user_profile_columns(cursor)
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS sessions (
                        token CHAR(64) PRIMARY KEY,
                        user_id INT NOT NULL,
                        expires_at DATETIME NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        INDEX idx_sessions_user_id (user_id),
                        INDEX idx_sessions_expires_at (expires_at)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """
                )
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS auth_events (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NULL,
                        name VARCHAR(80) NULL,
                        email VARCHAR(120) NOT NULL,
                        event_type ENUM('register', 'login') NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                        INDEX idx_auth_events_user_id (user_id),
                        INDEX idx_auth_events_email (email),
                        INDEX idx_auth_events_type_time (event_type, created_at)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """
                )
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS password_reset_tokens (
                        token CHAR(64) PRIMARY KEY,
                        user_id INT NOT NULL,
                        expires_at DATETIME NOT NULL,
                        used_at DATETIME NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        INDEX idx_password_reset_user_id (user_id),
                        INDEX idx_password_reset_expires_at (expires_at)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """
                )
    except pymysql.MySQLError as exc:
        print(f"MySQL auth database is not ready: {exc}")


def ensure_user_profile_columns(cursor):
    cursor.execute("SHOW COLUMNS FROM users LIKE 'profile_status'")
    if not cursor.fetchone():
        cursor.execute("ALTER TABLE users ADD COLUMN profile_status VARCHAR(160) NULL AFTER password_hash")

    # Migrate old MEDIUMTEXT profile_photo column to new URL columns
    cursor.execute("SHOW COLUMNS FROM users LIKE 'profile_photo'")
    if cursor.fetchone():
        cursor.execute("SHOW COLUMNS FROM users LIKE 'profile_photo_url'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE users ADD COLUMN profile_photo_url VARCHAR(500) NULL AFTER profile_status")
        cursor.execute("SHOW COLUMNS FROM users LIKE 'profile_photo_thumb_url'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE users ADD COLUMN profile_photo_thumb_url VARCHAR(500) NULL AFTER profile_photo_url")
        cursor.execute("ALTER TABLE users DROP COLUMN profile_photo")
    else:
        cursor.execute("SHOW COLUMNS FROM users LIKE 'profile_photo_url'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE users ADD COLUMN profile_photo_url VARCHAR(500) NULL AFTER profile_status")
        cursor.execute("SHOW COLUMNS FROM users LIKE 'profile_photo_thumb_url'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE users ADD COLUMN profile_photo_thumb_url VARCHAR(500) NULL AFTER profile_photo_url")

    cursor.execute("SHOW COLUMNS FROM users LIKE 'updated_at'")
    if not cursor.fetchone():
        cursor.execute(
            "ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL "
            "ON UPDATE CURRENT_TIMESTAMP AFTER profile_photo_thumb_url"
        )


def ensure_sqlite_user_profile_columns(cursor):
    cursor.execute("PRAGMA table_info(users)")
    columns = {row["name"] for row in cursor.fetchall()}

    if "profile_status" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN profile_status TEXT")
    if "profile_photo_url" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN profile_photo_url TEXT")
    if "profile_photo_thumb_url" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN profile_photo_thumb_url TEXT")
    if "updated_at" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN updated_at TEXT")


def ensure_sqlite_session_columns(cursor):
    cursor.execute("PRAGMA table_info(sessions)")
    columns = {row["name"] for row in cursor.fetchall()}

    if "user_id" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN user_id INTEGER")
    if "expires_at" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN expires_at TEXT")
    if "created_at" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP")


def ensure_sqlite_auth_event_columns(cursor):
    cursor.execute("PRAGMA table_info(auth_events)")
    columns = {row["name"] for row in cursor.fetchall()}

    if "user_id" not in columns:
        cursor.execute("ALTER TABLE auth_events ADD COLUMN user_id INTEGER")
    if "name" not in columns:
        cursor.execute("ALTER TABLE auth_events ADD COLUMN name TEXT")
    if "email" not in columns:
        cursor.execute("ALTER TABLE auth_events ADD COLUMN email TEXT")
    if "event_type" not in columns:
        cursor.execute("ALTER TABLE auth_events ADD COLUMN event_type TEXT")
    if "created_at" not in columns:
        cursor.execute("ALTER TABLE auth_events ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP")


def normalize_email(email):
    return email.strip().lower()


def hash_password(password):
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    ).hex()
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest}"


def verify_password(password, stored_hash):
    try:
        algorithm, iterations, salt, expected = stored_hash.split("$", 3)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        int(iterations),
    ).hex()
    return hmac.compare_digest(digest, expected)


def public_user(row):
    def getter(key, default=None):
        if hasattr(row, "get"):
            return row.get(key, default)
        return row[key] if key in row.keys() else default

    return {
        "id": getter("id"),
        "name": getter("name"),
        "email": getter("email"),
        "profile_status": getter("profile_status") or "",
        "profile_photo_url": getter("profile_photo_url") or "",
        "profile_photo_thumb_url": getter("profile_photo_thumb_url") or "",
    }


def create_user(name, email, password):
    email = normalize_email(email)
    password_hash = hash_password(password)

    if use_sqlite():
        try:
            with get_sqlite_connection() as connection:
                cursor = connection.cursor()
                created_at = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
                cursor.execute(
                    "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                    (name.strip(), email, password_hash, created_at),
                )
                user_id = cursor.lastrowid
                connection.commit()
                cursor.execute("SELECT id, name, email, profile_status, profile_photo_url, profile_photo_thumb_url FROM users WHERE id = ?", (user_id,))
                return public_user(cursor.fetchone())
        except sqlite3.IntegrityError as exc:
            raise ValueError("Email is already registered.") from exc
        except sqlite3.Error as exc:
            raise ValueError("SQLite auth database is not configured or not writable.") from exc

    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
                    (name.strip(), email, password_hash),
                )
                user_id = cursor.lastrowid
                cursor.execute("SELECT id, name, email, profile_status, profile_photo_url, profile_photo_thumb_url FROM users WHERE id = %s", (user_id,))
                return public_user(cursor.fetchone())
    except pymysql.err.IntegrityError as exc:
        raise ValueError("Email is already registered.") from exc
    except pymysql.MySQLError as exc:
        raise ValueError("MySQL database is not configured or not running.") from exc


def authenticate_user(email, password):
    email = normalize_email(email)

    if use_sqlite():
        try:
            with get_sqlite_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
                user = cursor.fetchone()
        except sqlite3.Error:
            return None

        if not user or not verify_password(password, user["password_hash"]):
            return None
        return public_user(user)

    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
                user = cursor.fetchone()
    except pymysql.MySQLError:
        return None

    if not user or not verify_password(password, user["password_hash"]):
        return None

    return public_user(user)


def find_user_by_email(email):
    email = normalize_email(email)

    if use_sqlite():
        try:
            with get_sqlite_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("SELECT id, name, email, profile_status, profile_photo_url, profile_photo_thumb_url FROM users WHERE email = ?", (email,))
                user = cursor.fetchone()
        except sqlite3.Error:
            return None
        return public_user(user) if user else None

    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT id, name, email, profile_status, profile_photo_url, profile_photo_thumb_url FROM users WHERE email = %s", (email,))
                user = cursor.fetchone()
    except pymysql.MySQLError:
        return None

    return public_user(user) if user else None


def create_password_reset_token(email, ttl_minutes=30):
    user = find_user_by_email(email)
    if not user:
        return None

    token = f"{secrets.randbelow(100_000_000):08d}"
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expires_at = now + timedelta(minutes=ttl_minutes)

    if use_sqlite():
        with get_sqlite_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at <= ?", (user["id"], now.isoformat(sep=" ")))
            cursor.execute(
                """
                INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (token, user["id"], expires_at.isoformat(sep=" "), now.isoformat(sep=" ")),
            )
            connection.commit()
        return {"token": token, "user": user, "expires_at": expires_at}

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM password_reset_tokens WHERE user_id = %s OR expires_at <= %s", (user["id"], now))
            cursor.execute(
                """
                INSERT INTO password_reset_tokens (token, user_id, expires_at)
                VALUES (%s, %s, %s)
                """,
                (token, user["id"], expires_at),
            )

    return {"token": token, "user": user, "expires_at": expires_at}


def reset_password_with_token(token, new_password):
    clean_token = re.sub(r"\s+", "", token.strip())
    if not re.fullmatch(r"\d{8}", clean_token):
        raise ValueError("Reset code is invalid or expired.")
    if len(new_password) < 8:
        raise ValueError("New password must contain at least 8 characters.")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    password_hash = hash_password(new_password)

    if use_sqlite():
        with get_sqlite_connection() as connection:
            cursor = connection.cursor()
            cursor.execute(
                """
                SELECT password_reset_tokens.token, password_reset_tokens.user_id
                FROM password_reset_tokens
                WHERE password_reset_tokens.token = ?
                  AND password_reset_tokens.expires_at > ?
                  AND password_reset_tokens.used_at IS NULL
                """,
                (clean_token, now.isoformat(sep=" ")),
            )
            reset_row = cursor.fetchone()
            if not reset_row:
                raise ValueError("Reset code is invalid or expired.")

            cursor.execute(
                "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
                (password_hash, now.isoformat(sep=" "), reset_row["user_id"]),
            )
            cursor.execute(
                "UPDATE password_reset_tokens SET used_at = ? WHERE token = ?",
                (now.isoformat(sep=" "), clean_token),
            )
            cursor.execute("DELETE FROM sessions WHERE user_id = ?", (reset_row["user_id"],))
            connection.commit()
        return True

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT token, user_id
                FROM password_reset_tokens
                WHERE token = %s
                  AND expires_at > %s
                  AND used_at IS NULL
                """,
                (clean_token, now),
            )
            reset_row = cursor.fetchone()
            if not reset_row:
                raise ValueError("Reset code is invalid or expired.")

            cursor.execute("UPDATE users SET password_hash = %s WHERE id = %s", (password_hash, reset_row["user_id"]))
            cursor.execute("UPDATE password_reset_tokens SET used_at = %s WHERE token = %s", (now, clean_token))
            cursor.execute("DELETE FROM sessions WHERE user_id = %s", (reset_row["user_id"],))

    return True


def create_session(user_id):
    token = secrets.token_hex(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS)
    expires_at_naive = expires_at.replace(tzinfo=None)

    if use_sqlite():
        created_at = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
        with get_sqlite_connection() as connection:
            cursor = connection.cursor()
            cursor.execute(
                "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
                (token, user_id, expires_at_naive.isoformat(sep=" "), created_at),
            )
            connection.commit()
        return token

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO sessions (token, user_id, expires_at) VALUES (%s, %s, %s)",
                (token, user_id, expires_at_naive),
            )

    return token


def record_auth_event(user, event_type):
    if event_type not in {"register", "login"}:
        raise ValueError("Invalid auth event type.")

    if use_sqlite():
        try:
            with get_sqlite_connection() as connection:
                cursor = connection.cursor()
                cursor.execute(
                    """
                    INSERT INTO auth_events (user_id, name, email, event_type, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        user.get("id"),
                        user.get("name"),
                        normalize_email(user.get("email", "")),
                        event_type,
                        datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" "),
                    ),
                )
                connection.commit()
        except sqlite3.Error as exc:
            print(f"Could not record auth event: {exc}")
        return

    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO auth_events (user_id, name, email, event_type)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (user.get("id"), user.get("name"), normalize_email(user.get("email", "")), event_type),
                )
    except pymysql.MySQLError as exc:
        print(f"Could not record auth event: {exc}")


def get_user_by_token(token):
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if use_sqlite():
        with get_sqlite_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("DELETE FROM sessions WHERE expires_at <= ?", (now.isoformat(sep=" "),))
            cursor.execute(
                """
                SELECT users.id, users.name, users.email, users.profile_status, users.profile_photo_url, users.profile_photo_thumb_url
                FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE sessions.token = ? AND sessions.expires_at > ?
                """,
                (token, now.isoformat(sep=" ")),
            )
            user = cursor.fetchone()
            connection.commit()
        return public_user(user) if user else None

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM sessions WHERE expires_at <= %s", (now,))
            cursor.execute(
                """
                SELECT users.id, users.name, users.email, users.profile_status, users.profile_photo_url, users.profile_photo_thumb_url
                FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE sessions.token = %s AND sessions.expires_at > %s
                """,
                (token, now),
            )
            user = cursor.fetchone()

    return public_user(user) if user else None


def delete_session(token):
    if use_sqlite():
        with get_sqlite_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
            connection.commit()
        return

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM sessions WHERE token = %s", (token,))


def update_user_profile(user_id, name=None, profile_status=None, profile_photo_url=None, profile_photo_thumb_url=None, current_password=None, new_password=None):
    if name is not None and len(name.strip()) < 2:
        raise ValueError("Name must contain at least 2 characters.")

    if profile_status is not None and len(profile_status.strip()) > 160:
        raise ValueError("Profile status cannot exceed 160 characters.")

    if profile_photo_url is not None:
        cleaned_url = profile_photo_url.strip()
        if cleaned_url and not cleaned_url.startswith("/uploads/"):
            raise ValueError("Invalid profile photo URL.")
        if len(cleaned_url) > 500:
            raise ValueError("Profile photo URL is too long.")

    if new_password is not None:
        if len(new_password) < 8:
            raise ValueError("New password must contain at least 8 characters.")
        if not current_password:
            raise ValueError("Current password is required to change password.")

    if use_sqlite():
        try:
            with get_sqlite_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
                user = cursor.fetchone()
                if not user:
                    raise ValueError("User was not found.")

                updates = []
                values = []

                if name is not None:
                    updates.append("name = ?")
                    values.append(name.strip())

                if profile_status is not None:
                    updates.append("profile_status = ?")
                    cleaned_status = profile_status.strip()
                    values.append("" if EMAIL_PATTERN.match(cleaned_status) else cleaned_status)

                if profile_photo_url is not None:
                    updates.append("profile_photo_url = ?")
                    values.append(profile_photo_url.strip())
                    updates.append("profile_photo_thumb_url = ?")
                    values.append((profile_photo_thumb_url or profile_photo_url).strip())

                if new_password is not None:
                    if not verify_password(current_password, user["password_hash"]):
                        raise ValueError("Current password is not correct.")
                    updates.append("password_hash = ?")
                    values.append(hash_password(new_password))

                if updates:
                    updates.append("updated_at = ?")
                    values.append(datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" "))
                    values.append(user_id)
                    cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values)
                    connection.commit()

                cursor.execute("SELECT id, name, email, profile_status, profile_photo_url, profile_photo_thumb_url FROM users WHERE id = ?", (user_id,))
                return public_user(cursor.fetchone())
        except sqlite3.Error as exc:
            raise ValueError("SQLite auth database is not configured or not writable.") from exc

    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                user = cursor.fetchone()
                if not user:
                    raise ValueError("User was not found.")

                updates = []
                values = []

                if name is not None:
                    updates.append("name = %s")
                    values.append(name.strip())

                if profile_status is not None:
                    updates.append("profile_status = %s")
                    cleaned_status = profile_status.strip()
                    values.append("" if EMAIL_PATTERN.match(cleaned_status) else cleaned_status)

                if profile_photo_url is not None:
                    updates.append("profile_photo_url = %s")
                    values.append(profile_photo_url.strip())
                    updates.append("profile_photo_thumb_url = %s")
                    values.append((profile_photo_thumb_url or profile_photo_url).strip())

                if new_password is not None:
                    if not verify_password(current_password, user["password_hash"]):
                        raise ValueError("Current password is not correct.")
                    updates.append("password_hash = %s")
                    values.append(hash_password(new_password))

                if updates:
                    values.append(user_id)
                    cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = %s", values)

                cursor.execute("SELECT id, name, email, profile_status, profile_photo_url, profile_photo_thumb_url FROM users WHERE id = %s", (user_id,))
                return public_user(cursor.fetchone())
    except pymysql.MySQLError as exc:
        raise ValueError("MySQL database is not configured or not running.") from exc
