import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv

load_dotenv()

APP_NAME = "MuunganoHub"
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()


# ── provider detection ────────────────────────────────────────────────────────

def _smtp_cfg():
    smtp_email = os.getenv("SMTP_EMAIL", "").strip()
    legacy_username = os.getenv("SMTP_USERNAME", "").strip()
    username = smtp_email or legacy_username
    return {
        "host": os.getenv("SMTP_HOST", "smtp.gmail.com").strip() or "smtp.gmail.com",
        "port": int(os.getenv("SMTP_PORT", "587")),
        "username": username,
        "email": smtp_email,
        "password": os.getenv("SMTP_PASSWORD", "").strip(),
        "from_email": os.getenv("SMTP_FROM_EMAIL", "").strip() or username,
        "from_name": os.getenv("SMTP_FROM_NAME", APP_NAME).strip(),
    }


def _smtp_ready(cfg=None):
    c = cfg or _smtp_cfg()
    bad = {"your_", "put_", "your_gmail_app_password_here",
           "your_app_password", "app_password_here"}
    def placeholder(v):
        v = v.lower()
        return not v or any(v.startswith(b) or v == b for b in bad)
    return not placeholder(c["host"]) and not placeholder(c["username"]) and not placeholder(c["password"])


def _resend_ready():
    k = RESEND_API_KEY
    return bool(k and not k.startswith("your_") and not k.startswith("re_xxx"))


def _active_provider():
    """Return 'resend' or 'smtp' — whichever is configured. SMTP wins when both ready."""
    if _smtp_ready():
        return "smtp"
    if _resend_ready():
        return "resend"
    return "none"


# ── status (used by /auth/email-status endpoint) ──────────────────────────────

def email_config_status():
    provider = _active_provider()
    cfg = _smtp_cfg()
    problems = []
    if provider == "none":
        problems.append("Neither SMTP nor Resend is fully configured.")
        if not _smtp_ready(cfg):
            if not cfg["username"]:
                problems.append("SMTP_EMAIL is missing.")
            if not cfg["password"] or cfg["password"].lower().startswith("put_"):
                problems.append("SMTP_PASSWORD is missing or still a placeholder — set your Gmail App Password.")
        if not _resend_ready():
            problems.append("RESEND_API_KEY is missing or placeholder.")
    return {
        "enabled": provider != "none",
        "ready": provider != "none",
        "provider": provider,
        "smtp_ready": _smtp_ready(cfg),
        "resend_ready": _resend_ready(),
        "problems": problems,
    }


# ── low-level send ────────────────────────────────────────────────────────────

def _send_smtp(to_email: str, subject: str, html: str) -> bool:
    cfg = _smtp_cfg()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{cfg['from_name']} <{cfg['from_email'] or cfg['username']}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))
    try:
        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(cfg["username"], cfg["password"])
            server.sendmail(cfg["from_email"] or cfg["username"], to_email, msg.as_string())
        print(f"[email/smtp] sent: {subject} -> {to_email}")
        return True
    except Exception as exc:
        print(f"[email/smtp] failed ({subject} -> {to_email}): {exc}")
        return False


def _send_resend(to_email: str, subject: str, html: str) -> bool:
    try:
        import resend
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({
            "from": f"{APP_NAME} <onboarding@resend.dev>",
            "to": [to_email],
            "subject": subject,
            "html": html,
        })
        print(f"[email/resend] sent: {subject} -> {to_email}")
        return True
    except Exception as exc:
        print(f"[email/resend] failed ({subject} -> {to_email}): {exc}")
        return False


def _send(to_email: str, subject: str, html: str) -> bool:
    if not to_email:
        return False
    provider = _active_provider()
    if provider == "smtp":
        return _send_smtp(to_email, subject, html)
    if provider == "resend":
        return _send_resend(to_email, subject, html)
    return False


# ── HTML template ─────────────────────────────────────────────────────────────

def _card(title: str, subtitle: str, body: str) -> str:
    url = os.getenv("APP_URL", "http://127.0.0.1:8001").rstrip("/")
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">
        <tr><td align="center" style="padding-bottom:24px">
          <div style="display:inline-block;background:linear-gradient(135deg,#0d9488,#2563eb);color:#fff;font-size:22px;font-weight:900;padding:12px 22px;border-radius:10px;letter-spacing:.04em">MH</div>
          <h1 style="color:#102a43;font-size:20px;margin:14px 0 4px">{title}</h1>
          <p style="color:#64748b;font-size:14px;margin:0">{subtitle}</p>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:12px;padding:30px 32px;border:1px solid #e2e8f0">
          {body}
          <div style="text-align:center;margin-top:24px">
            <a href="{url}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:12px 30px;border-radius:8px;font-weight:700;font-size:15px">Open MuunganoHub</a>
          </div>
        </td></tr>
        <tr><td align="center" style="padding-top:20px">
          <p style="color:#94a3b8;font-size:12px;margin:0">{APP_NAME} &mdash; Jifunze. Elewa. Shiriki.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ── public API (called by api.py) ─────────────────────────────────────────────

def send_registration_email(user: dict) -> bool:
    name = user.get("name", "there")
    email = user.get("email", "")
    body = f"""
      <p style="color:#334155;margin:0 0 14px">Hello <strong>{name}</strong>,</p>
      <p style="color:#334155;margin:0 0 14px">Your MuunganoHub account has been created successfully.</p>
      <p style="color:#334155;margin:0">Start exploring the history of the Union of Tanganyika and Zanzibar &mdash;
      take quizzes, earn badges, and build your knowledge passport.</p>
    """
    return _send(email, f"Welcome to {APP_NAME}!", _card(f"Welcome to {APP_NAME}!", "Your Union learning journey begins.", body))


def send_login_email(user: dict) -> bool:
    name = user.get("name", "there")
    email = user.get("email", "")
    body = f"""
      <p style="color:#334155;margin:0 0 14px">Hello <strong>{name}</strong>,</p>
      <p style="color:#334155;margin:0 0 16px">Your {APP_NAME} account was just logged into.</p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px 18px;margin:0 0 16px">
        <p style="color:#166534;font-size:14px;margin:0">If this was you, no action is needed. Continue learning!</p>
      </div>
      <p style="color:#64748b;font-size:13px;margin:0">If you did not log in, please change your password immediately.</p>
    """
    return _send(email, f"New login to your {APP_NAME} account", _card("New Login Detected", f"{APP_NAME} account activity.", body))


def send_password_reset_email(user: dict, reset_token: str) -> bool:
    name = user.get("name", "there")
    email = user.get("email", "")
    body = f"""
      <p style="color:#334155;margin:0 0 14px">Hello <strong>{name}</strong>,</p>
      <p style="color:#334155;margin:0 0 18px">Use this 8-digit code to reset your {APP_NAME} password:</p>
      <div style="background:#f8fafc;border:2px solid #0d9488;border-radius:10px;padding:22px;text-align:center;
                  font-size:36px;font-weight:900;letter-spacing:.18em;color:#0f766e;margin:0 0 18px">{reset_token}</div>
      <p style="color:#64748b;font-size:13px;margin:0">This code expires in 30 minutes. If you did not request a reset, ignore this email.</p>
    """
    return _send(email, f"Reset your {APP_NAME} password", _card("Password Reset", "Use the code below to create a new password.", body))
