import io
import secrets
import uuid
import os
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import quote

from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import requests

try:
    from PIL import Image as PilImage
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False

try:
    from .rag_config import OFFLINE_MODE
except ImportError:
    from rag_config import OFFLINE_MODE

try:
    from .email_service import email_config_status, send_login_email, send_password_reset_email, send_registration_email
except ImportError:
    from email_service import email_config_status, send_login_email, send_password_reset_email, send_registration_email

try:
    from .auth import (
        authenticate_user,
        create_session,
        create_user,
        create_password_reset_token,
        delete_session,
        get_user_by_token,
        init_auth_db,
        record_auth_event,
        reset_password_with_token,
        update_user_profile,
    )
    from .rag_chatbot import RAGChatbot
except ImportError:
    from auth import (
        authenticate_user,
        create_session,
        create_user,
        create_password_reset_token,
        delete_session,
        get_user_by_token,
        init_auth_db,
        record_auth_event,
        reset_password_with_token,
        update_user_profile,
    )
    from rag_chatbot import RAGChatbot

sessions: dict[str, RAGChatbot] = {}
MAX_SESSIONS = 100
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
UPLOADS_DIR = BASE_DIR / "uploads"


@asynccontextmanager
async def lifespan(app: FastAPI):
    (UPLOADS_DIR / "profile_photos").mkdir(parents=True, exist_ok=True)
    init_auth_db()
    print("MuunganoHub RAG API starting...")
    yield
    sessions.clear()
    print("MuunganoHub RAG API stopped.")


app = FastAPI(
    title="MuunganoHub RAG Chatbot API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    session_id: str | None = None


class ChatResponse(BaseModel):
    answer: str
    session_id: str


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)


class PasswordResetRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)


class PasswordResetConfirmRequest(BaseModel):
    token: str = Field(..., min_length=8, max_length=32)
    new_password: str = Field(..., min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    profile_status: str = ""
    profile_photo_url: str = ""
    profile_photo_thumb_url: str = ""


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


class ProfileUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    profile_status: str | None = Field(default=None, max_length=160)
    profile_photo_url: str | None = Field(default=None, max_length=500)
    profile_photo_thumb_url: str | None = Field(default=None, max_length=500)
    current_password: str | None = Field(default=None, min_length=8, max_length=128)
    new_password: str | None = Field(default=None, min_length=8, max_length=128)


def get_bearer_token(authorization: str | None = Header(default=None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization token.")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header.")

    return token


def require_user(token: str = Depends(get_bearer_token)):
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return user


@app.get("/")
@app.head("/")
async def frontend_index():
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"status": "ok", "message": "Frontend files were not found."}


def frontend_file_response(relative_path: str, media_type: str | None = None):
    file_path = (FRONTEND_DIR / relative_path).resolve()
    if not str(file_path).startswith(str(FRONTEND_DIR.resolve())) or not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Frontend file was not found.")
    return FileResponse(file_path, media_type=media_type)


@app.get("/index.html")
@app.head("/index.html")
async def frontend_index_file():
    return frontend_file_response("index.html", "text/html")


@app.get("/app.js")
@app.head("/app.js")
async def frontend_app_script():
    return frontend_file_response("app.js", "application/javascript")


@app.get("/quiz-bank.js")
@app.head("/quiz-bank.js")
async def frontend_quiz_bank():
    return frontend_file_response("quiz-bank.js", "application/javascript")


@app.get("/styles.css")
@app.head("/styles.css")
async def frontend_stylesheet():
    return frontend_file_response("styles.css", "text/css")


@app.get("/manifest.webmanifest")
@app.head("/manifest.webmanifest")
async def frontend_manifest():
    return frontend_file_response("manifest.webmanifest", "application/manifest+json")


@app.get("/assets/{asset_path:path}")
@app.head("/assets/{asset_path:path}")
async def frontend_asset(asset_path: str):
    return frontend_file_response(f"assets/{asset_path}")


@app.get("/sw.js")
@app.head("/sw.js")
async def service_worker():
    sw_file = FRONTEND_DIR / "sw.js"
    if sw_file.exists():
        return FileResponse(
            sw_file,
            media_type="application/javascript",
            headers={
                "Cache-Control": "no-cache",
                "Service-Worker-Allowed": "/",
            },
        )
    raise HTTPException(status_code=404, detail="Service worker was not found.")


@app.post("/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    try:
        user = create_user(request.name, request.email, request.password)
        token = create_session(user["id"])
        record_auth_event(user, "register")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        send_registration_email(user)
    except Exception as exc:
        print(f"Could not send registration email to {user.get('email', '')}: {exc}")

    return AuthResponse(token=token, user=UserResponse(**user))


@app.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    user = authenticate_user(request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_session(user["id"])
    record_auth_event(user, "login")
    try:
        send_login_email(user)
    except Exception as exc:
        print(f"Could not send login email to {user.get('email', '')}: {exc}")
    return AuthResponse(token=token, user=UserResponse(**user))


@app.post("/auth/password-reset/request")
async def request_password_reset(request: PasswordResetRequest):
    reset = create_password_reset_token(request.email)
    response = {
        "status": "ok",
        "message": "If that email is registered, a password reset code has been sent.",
        "email_sent": False,
    }

    if not reset:
        return response

    sent = send_password_reset_email(reset["user"], reset["token"])
    response["email_sent"] = sent
    if not sent:
        response["dev_reset_token"] = reset["token"]
        response["email_config"] = email_config_status()
        response["message"] = "Email is not configured correctly. Use this development reset code to continue."

    return response


@app.get("/auth/email-status")
async def auth_email_status():
    return email_config_status()


@app.post("/auth/password-reset/confirm")
async def confirm_password_reset(request: PasswordResetConfirmRequest):
    try:
        reset_password_with_token(request.token, request.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"status": "ok", "message": "Password reset successfully. You can now log in."}


@app.get("/auth/me", response_model=UserResponse)
async def me(user=Depends(require_user)):
    return UserResponse(**user)


@app.patch("/auth/profile", response_model=UserResponse)
async def update_profile(request: ProfileUpdateRequest, user=Depends(require_user)):
    try:
        updated_user = update_user_profile(
            user_id=user["id"],
            name=request.name,
            profile_status=request.profile_status,
            profile_photo_url=request.profile_photo_url,
            profile_photo_thumb_url=request.profile_photo_thumb_url,
            current_password=request.current_password,
            new_password=request.new_password,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return UserResponse(**updated_user)


_ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_PHOTO_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
_THUMB_SIZE = (128, 128)


@app.post("/auth/profile/photo")
async def upload_profile_photo(file: UploadFile = File(...), user=Depends(require_user)):
    if file.content_type not in _ALLOWED_PHOTO_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WebP, or GIF images are allowed.")

    contents = await file.read()
    if len(contents) > _PHOTO_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Photo is too large. Maximum size is 5 MB.")

    ext = (file.content_type or "image/jpeg").split("/")[-1].replace("jpeg", "jpg")
    uid = secrets.token_hex(8)
    filename = f"{user['id']}_{uid}.{ext}"
    thumb_filename = f"{user['id']}_{uid}_thumb.{ext}"

    photos_dir = UPLOADS_DIR / "profile_photos"
    photos_dir.mkdir(parents=True, exist_ok=True)

    (photos_dir / filename).write_bytes(contents)

    if _PIL_AVAILABLE:
        try:
            img = PilImage.open(io.BytesIO(contents))
            img.thumbnail(_THUMB_SIZE)
            img.save(photos_dir / thumb_filename)
        except Exception:
            thumb_filename = filename
    else:
        thumb_filename = filename

    return {
        "profile_photo_url": f"/uploads/profile_photos/{filename}",
        "profile_photo_thumb_url": f"/uploads/profile_photos/{thumb_filename}",
    }


@app.post("/auth/logout")
async def logout(token: str = Depends(get_bearer_token)):
    delete_session(token)
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, user=Depends(require_user)):
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    session_id = request.session_id or f"{user['id']}:{uuid.uuid4()}"

    if session_id not in sessions:
        if len(sessions) >= MAX_SESSIONS:
            oldest_session_id = next(iter(sessions))
            sessions.pop(oldest_session_id, None)
        sessions[session_id] = RAGChatbot()

    try:
        answer = sessions[session_id].ask(question)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return ChatResponse(answer=answer, session_id=session_id)


@app.post("/ingest")
async def ingest_documents(user=Depends(require_user)):
    try:
        from .vector_db import load_documents, split_documents, create_vector_store
    except ImportError:
        from vector_db import load_documents, split_documents, create_vector_store

    documents = load_documents()
    chunks = split_documents(documents)
    create_vector_store(chunks)
    return {"status": "ok", "chunks": len(chunks)}


def whatsapp_config():
    return {
        "verify_token": os.getenv("WHATSAPP_VERIFY_TOKEN", "").strip(),
        "access_token": os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip(),
        "phone_number_id": os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip(),
        "graph_version": os.getenv("WHATSAPP_GRAPH_VERSION", "v20.0").strip() or "v20.0",
    }


def extract_whatsapp_messages(payload):
    messages = []
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for message in value.get("messages", []):
                text = message.get("text", {}).get("body", "").strip()
                sender = message.get("from", "").strip()
                message_id = message.get("id", "").strip()
                if sender and text:
                    messages.append({"from": sender, "text": text, "id": message_id})
    return messages


def send_whatsapp_text(to_number, text):
    config = whatsapp_config()
    if not config["access_token"] or not config["phone_number_id"]:
        return {"sent": False, "reason": "WhatsApp access token or phone number ID is not configured."}

    url = f"https://graph.facebook.com/{config['graph_version']}/{config['phone_number_id']}/messages"
    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {config['access_token']}",
            "Content-Type": "application/json",
        },
        json={
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "text",
            "text": {"preview_url": False, "body": text[:4000]},
        },
        timeout=20,
    )
    response.raise_for_status()
    return {"sent": True, "response": response.json()}


@app.get("/whatsapp/webhook")
async def verify_whatsapp_webhook(
    hub_mode: str | None = Query(default=None, alias="hub.mode"),
    hub_verify_token: str | None = Query(default=None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(default=None, alias="hub.challenge"),
):
    config = whatsapp_config()
    if hub_mode == "subscribe" and hub_verify_token and hub_verify_token == config["verify_token"]:
        return Response(content=hub_challenge or "", media_type="text/plain")
    raise HTTPException(status_code=403, detail="WhatsApp webhook verification failed.")


@app.post("/whatsapp/webhook")
async def receive_whatsapp_webhook(request: Request):
    payload = await request.json()
    messages = extract_whatsapp_messages(payload)
    replies = []

    for message in messages:
        session_id = f"whatsapp:{message['from']}"
        if session_id not in sessions:
            if len(sessions) >= MAX_SESSIONS:
                oldest_session_id = next(iter(sessions))
                sessions.pop(oldest_session_id, None)
            sessions[session_id] = RAGChatbot()

        answer = sessions[session_id].ask(message["text"])
        result = send_whatsapp_text(message["from"], answer)
        replies.append({"to": message["from"], "message_id": message["id"], **result})

    return {"status": "ok", "received": len(messages), "replies": replies}


@app.get("/whatsapp/status")
async def whatsapp_status():
    config = whatsapp_config()
    return {
        "ready": bool(config["verify_token"] and config["access_token"] and config["phone_number_id"]),
        "verify_token_set": bool(config["verify_token"]),
        "access_token_set": bool(config["access_token"]),
        "phone_number_id_set": bool(config["phone_number_id"]),
        "graph_version": config["graph_version"],
        "webhook_path": "/whatsapp/webhook",
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "offline_mode": OFFLINE_MODE}


@app.get("/tts")
async def text_to_speech(text: str, lang: str = "sw"):
    clean_text = " ".join(text.strip().split())
    language = lang.strip().lower()

    if language not in {"sw", "en"}:
        raise HTTPException(status_code=400, detail="Unsupported audio language.")
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text is required.")
    if len(clean_text) > 220:
        raise HTTPException(status_code=400, detail="Text chunk is too long.")

    google_tts_url = (
        "https://translate.google.com/translate_tts"
        f"?ie=UTF-8&client=tw-ob&tl={language}&q={quote(clean_text)}"
    )

    try:
        response = requests.get(
            google_tts_url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0 Safari/537.36"
                )
            },
            timeout=15,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Online {language} audio service is not available.") from exc

    return Response(content=response.content, media_type="audio/mpeg")
