
"""
Authentication: signup, email verification, login,
profile and password endpoints (JWT).
"""

import os
import re
import secrets
import smtplib
from datetime import timedelta
from email.message import EmailMessage
from functools import wraps
from hmac import compare_digest
from hashlib import sha256

import jwt
from flask import Blueprint, g, jsonify, request
from sqlalchemy import func, select
from werkzeug.security import check_password_hash, generate_password_hash

from database import (
    EmailVerification,
    SessionLocal,
    User,
    utc_now,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

_env_secret = os.getenv("JWT_SECRET_KEY")
JWT_SECRET_KEY: str = _env_secret or secrets.token_hex(32)

if not _env_secret:
    print(
        "WARNING: JWT_SECRET_KEY is not set in .env. "
        "Using a temporary key; users will be logged out on restart."
    )

JWT_ALGORITHM = "HS256"
JWT_EXPIRES_HOURS = int(os.getenv("JWT_EXPIRES_HOURS", "24"))

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8

OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_SECONDS = 60

# Temporary password reset OTP storage.
# Use a database table or Redis for production.
password_reset_otps = {}

PASSWORD_RESET_EXPIRY_MINUTES = 5
PASSWORD_RESET_MAX_ATTEMPTS = 5
PASSWORD_RESET_RESEND_SECONDS = 60


# --------------------------------------------------
# General helpers
# --------------------------------------------------

def error(message, status):
    return jsonify({"error": message}), status


def create_token(user: User) -> str:
    now = utc_now()
    payload = {
        "sub": str(user.id),
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRES_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def read_json():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def clean_email(value) -> str:
    return str(value or "").strip().lower()


def email_taken(email: str, exclude_user_id: int | None = None) -> bool:
    query = select(User.id).where(func.lower(User.email) == email)

    if exclude_user_id is not None:
        query = query.where(User.id != exclude_user_id)

    return SessionLocal.execute(query).first() is not None


# --------------------------------------------------
# Email OTP helpers
# --------------------------------------------------

def _otp_digest(code: str) -> str:
    """Store a keyed digest instead of storing the OTP itself."""
    secret = os.getenv("OTP_SECRET_KEY") or JWT_SECRET_KEY
    value = f"{secret}:{code}".encode("utf-8")
    return sha256(value).hexdigest()


def _send_email(to_email: str, code: str) -> None:
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_email = os.getenv("SMTP_EMAIL", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()

    if not smtp_email or not smtp_password:
        raise RuntimeError(
            "SMTP_EMAIL or SMTP_PASSWORD is missing from the root .env file."
        )

    message = EmailMessage()
    message["Subject"] = "Verify your PolyGuard account"
    message["From"] = smtp_email
    message["To"] = to_email

    message.set_content(
        f"""Hello,

Thank you for signing up for PolyGuard.

Your email verification code is:

{code}

This code expires in {OTP_EXPIRY_MINUTES} minutes.

If you did not create this account, you can ignore this email.

PolyGuard Security Team
"""
    )

    with smtplib.SMTP(smtp_server, smtp_port, timeout=20) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(smtp_email, smtp_password)
        server.send_message(message)


def issue_verification_code(user: User):
    """
    Create and email a new OTP.

    Returns:
        (success, message, status_code)
    """
    now = utc_now()

    verification = SessionLocal.execute(
        select(EmailVerification).where(
            EmailVerification.user_id == user.id
        )
    ).scalar_one_or_none()

    if verification is not None:
        elapsed = (now - verification.sent_at).total_seconds()
        remaining = OTP_RESEND_SECONDS - int(elapsed)

        if remaining > 0:
            return (
                False,
                f"Please wait {remaining} seconds before requesting another code.",
                429,
            )

    code = f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"

    if verification is None:
        verification = EmailVerification(
            user_id=user.id,
            otp_hash=_otp_digest(code),
            expires_at=now + timedelta(minutes=OTP_EXPIRY_MINUTES),
            sent_at=now,
            attempts=0,
        )
        SessionLocal.add(verification)
    else:
        verification.otp_hash = _otp_digest(code)
        verification.expires_at = now + timedelta(minutes=OTP_EXPIRY_MINUTES)
        verification.sent_at = now
        verification.attempts = 0

    SessionLocal.commit()

    try:
        _send_email(user.email, code)
    except Exception:
        SessionLocal.delete(verification)
        SessionLocal.commit()

        print("PolyGuard verification email could not be sent.")
        return (
            False,
            "We could not send the verification email. Check SMTP settings and try again.",
            503,
        )

    return True, "Verification code sent successfully.", 200


# --------------------------------------------------
# Password reset email helper
# --------------------------------------------------

def _send_password_reset_email(to_email: str, code: str) -> None:
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_email = os.getenv("SMTP_EMAIL", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()

    if not smtp_email or not smtp_password:
        raise RuntimeError(
            "SMTP_EMAIL or SMTP_PASSWORD is missing from the root .env file."
        )

    message = EmailMessage()
    message["Subject"] = "PolyGuard Password Reset Code"
    message["From"] = smtp_email
    message["To"] = to_email

    message.set_content(
        f"""Hello,

We received a request to reset your PolyGuard password.

Your password reset code is:

{code}

This code expires in {PASSWORD_RESET_EXPIRY_MINUTES} minutes.

If you did not request this reset, please ignore this email.

PolyGuard Security Team
"""
    )

    with smtplib.SMTP(smtp_server, smtp_port, timeout=20) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(smtp_email, smtp_password)
        server.send_message(message)


# --------------------------------------------------
# JWT authentication decorator
# --------------------------------------------------

def login_required(view):
    """Require a valid Authorization: Bearer <token> header."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")

        if not header.startswith("Bearer "):
            return error("Please log in to continue.", 401)

        token = header[len("Bearer "):].strip()

        try:
            payload = jwt.decode(
                token,
                JWT_SECRET_KEY,
                algorithms=[JWT_ALGORITHM],
            )
            user_id = int(payload["sub"])

        except jwt.ExpiredSignatureError:
            return error("Your session has expired. Please log in again.", 401)

        except (jwt.InvalidTokenError, KeyError, ValueError):
            return error("Invalid session. Please log in again.", 401)

        user = SessionLocal.get(User, user_id)

        if user is None:
            return error("Account not found. Please log in again.", 401)

        if not user.email_verified:
            return error("Please verify your email to continue.", 403)

        g.user = user
        return view(*args, **kwargs)

    return wrapper


# --------------------------------------------------
# Signup
# --------------------------------------------------

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = read_json()

    name = str(data.get("name") or "").strip()
    email = clean_email(data.get("email"))
    password = str(data.get("password") or "")

    if not name:
        return error("Please enter your name.", 400)

    if len(name) > 120:
        return error("Name must be 120 characters or fewer.", 400)

    if not EMAIL_PATTERN.match(email):
        return error("Please enter a valid email address.", 400)

    if len(password) < MIN_PASSWORD_LENGTH:
        return error(
            f"Password must be at least {MIN_PASSWORD_LENGTH} characters.",
            400,
        )

    existing_user = SessionLocal.execute(
        select(User).where(func.lower(User.email) == email)
    ).scalar_one_or_none()

    if existing_user is not None:
        if existing_user.email_verified:
            return error("An account with this email already exists.", 409)

        if not check_password_hash(existing_user.password_hash, password):
            return error(
                "An unverified account already exists with this email. "
                "Use the original password or contact support.",
                409,
            )

        success, message, status = issue_verification_code(existing_user)

        if not success:
            return error(message, status)

        return jsonify({
            "message": message,
            "email": existing_user.email,
        }), 200

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
        email_verified=False,
    )

    SessionLocal.add(user)
    SessionLocal.commit()

    success, message, status = issue_verification_code(user)

    if not success:
        return error(message, status)

    return jsonify({
        "message": message,
        "email": user.email,
    }), 201


# --------------------------------------------------
# Verify email
# --------------------------------------------------

@auth_bp.route("/verify-email", methods=["POST"])
def verify_email():
    data = read_json()

    email = clean_email(data.get("email"))
    code = str(data.get("code") or "").strip()

    if not EMAIL_PATTERN.match(email):
        return error("Please enter a valid email address.", 400)

    if not re.fullmatch(r"\d{6}", code):
        return error("Please enter the 6-digit verification code.", 400)

    user = SessionLocal.execute(
        select(User).where(func.lower(User.email) == email)
    ).scalar_one_or_none()

    if user is None:
        return error("Invalid email or verification code.", 400)

    if user.email_verified:
        return error("This email address is already verified.", 400)

    verification = SessionLocal.execute(
        select(EmailVerification).where(
            EmailVerification.user_id == user.id
        )
    ).scalar_one_or_none()

    if verification is None:
        return error(
            "No active verification code. Please request a new code.",
            400,
        )

    now = utc_now()

    if now > verification.expires_at:
        SessionLocal.delete(verification)
        SessionLocal.commit()
        return error("Verification code has expired. Request a new one.", 400)

    if verification.attempts >= OTP_MAX_ATTEMPTS:
        SessionLocal.delete(verification)
        SessionLocal.commit()
        return error(
            "Maximum attempts reached. Please request a new code.",
            429,
        )

    submitted_digest = _otp_digest(code)

    if not compare_digest(submitted_digest, verification.otp_hash):
        verification.attempts += 1
        SessionLocal.commit()

        remaining = OTP_MAX_ATTEMPTS - verification.attempts

        if remaining <= 0:
            SessionLocal.delete(verification)
            SessionLocal.commit()
            return error(
                "Maximum attempts reached. Please request a new code.",
                429,
            )

        return error(
            f"Incorrect verification code. {remaining} attempts remaining.",
            400,
        )

    user.email_verified = True
    SessionLocal.delete(verification)
    SessionLocal.commit()

    return jsonify({
        "message": "Email verified successfully.",
        "token": create_token(user),
        "user": user.to_dict(),
    }), 200


# --------------------------------------------------
# Resend verification code
# --------------------------------------------------

@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    data = read_json()
    email = clean_email(data.get("email"))

    if not EMAIL_PATTERN.match(email):
        return error("Please enter a valid email address.", 400)

    user = SessionLocal.execute(
        select(User).where(func.lower(User.email) == email)
    ).scalar_one_or_none()

    if user is None:
        return error(
            "No unverified account was found for this email.",
            404,
        )

    if user.email_verified:
        return error("This email address is already verified.", 400)

    success, message, status = issue_verification_code(user)

    if not success:
        return error(message, status)

    return jsonify({"message": message}), 200


# --------------------------------------------------
# Login
# --------------------------------------------------

@auth_bp.route("/login", methods=["POST"])
def login():
    data = read_json()

    email = clean_email(data.get("email"))
    password = str(data.get("password") or "")

    user = SessionLocal.execute(
        select(User).where(func.lower(User.email) == email)
    ).scalar_one_or_none()

    if user is None or not check_password_hash(user.password_hash, password):
        return error("Incorrect email or password.", 401)

    if not user.email_verified:
        return error(
            "Please verify your email before logging in. "
            "Return to signup to request a new verification code.",
            403,
        )

    return jsonify({
        "token": create_token(user),
        "user": user.to_dict(),
    })


# --------------------------------------------------
# Profile
# --------------------------------------------------

@auth_bp.route("/me", methods=["GET"])
@login_required
def get_me():
    return jsonify({"user": g.user.to_dict()})


@auth_bp.route("/me", methods=["PATCH"])
@login_required
def update_me():
    data = read_json()
    user = g.user

    if "name" in data:
        name = str(data.get("name") or "").strip()

        if not name:
            return error("Name cannot be empty.", 400)

        if len(name) > 120:
            return error("Name must be 120 characters or fewer.", 400)

        user.name = name

    if "email" in data:
        email = clean_email(data.get("email"))

        if not EMAIL_PATTERN.match(email):
            return error("Please enter a valid email address.", 400)

        if email_taken(email, exclude_user_id=user.id):
            return error("Another account already uses this email.", 409)

        user.email = email

    SessionLocal.commit()
    return jsonify({"user": user.to_dict()})


# --------------------------------------------------
# Change password
# --------------------------------------------------

@auth_bp.route("/change-password", methods=["POST"])
@login_required
def change_password():
    data = read_json()

    current_password = str(data.get("current_password") or "")
    new_password = str(data.get("new_password") or "")

    if not check_password_hash(g.user.password_hash, current_password):
        return error("Current password is incorrect.", 400)

    if len(new_password) < MIN_PASSWORD_LENGTH:
        return error(
            f"New password must be at least {MIN_PASSWORD_LENGTH} characters.",
            400,
        )

    g.user.password_hash = generate_password_hash(new_password)
    SessionLocal.commit()

    return jsonify({"message": "Password updated successfully."})


# --------------------------------------------------
# Delete account
# --------------------------------------------------

@auth_bp.route("/me", methods=["DELETE"])
@login_required
def delete_me():
    data = read_json()
    password = str(data.get("password") or "")

    if not check_password_hash(g.user.password_hash, password):
        return error("Password is incorrect.", 400)

    SessionLocal.delete(g.user)
    SessionLocal.commit()

    return jsonify({"message": "Account deleted."})


# --------------------------------------------------
# Forgot password: request OTP
# --------------------------------------------------

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = read_json()
    email = clean_email(data.get("email"))

    if not EMAIL_PATTERN.match(email):
        return error("Please enter a valid email address.", 400)

    user = SessionLocal.execute(
        select(User).where(func.lower(User.email) == email)
    ).scalar_one_or_none()

    # Do not reveal whether an account exists.
    generic_message = (
        "If an account exists with this email, a reset code has been sent."
    )

    if user is None or not user.email_verified:
        return jsonify({"message": generic_message}), 200

    now = utc_now()
    existing = password_reset_otps.get(email)

    if existing:
        elapsed = (now - existing["sent_at"]).total_seconds()
        remaining = PASSWORD_RESET_RESEND_SECONDS - int(elapsed)

        if remaining > 0:
            return error(
                f"Please wait {remaining} seconds before requesting another code.",
                429,
            )

    code = f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"

    password_reset_otps[email] = {
        "otp_hash": _otp_digest(code),
        "expires_at": now + timedelta(
            minutes=PASSWORD_RESET_EXPIRY_MINUTES
        ),
        "sent_at": now,
        "attempts": 0,
        "verified": False,
    }

    try:
        _send_password_reset_email(user.email, code)
    except Exception:
        password_reset_otps.pop(email, None)
        print("PolyGuard password reset email could not be sent.")
        return error(
            "We could not send the reset email. Please try again later.",
            503,
        )

    return jsonify({"message": generic_message}), 200


# --------------------------------------------------
# Forgot password: verify OTP
# --------------------------------------------------

@auth_bp.route("/verify-reset-otp", methods=["POST"])
def verify_reset_otp():
    data = read_json()

    email = clean_email(data.get("email"))
    code = str(data.get("code") or "").strip()

    if not EMAIL_PATTERN.match(email):
        return error("Please enter a valid email address.", 400)

    if not re.fullmatch(r"\d{6}", code):
        return error("Please enter the 6-digit reset code.", 400)

    record = password_reset_otps.get(email)

    if record is None:
        return error("No active reset code. Please request a new one.", 400)

    if utc_now() > record["expires_at"]:
        password_reset_otps.pop(email, None)
        return error("Reset code has expired. Request a new one.", 400)

    if record["attempts"] >= PASSWORD_RESET_MAX_ATTEMPTS:
        password_reset_otps.pop(email, None)
        return error(
            "Maximum attempts reached. Please request a new code.",
            429,
        )

    if not compare_digest(_otp_digest(code), record["otp_hash"]):
        record["attempts"] += 1
        remaining = PASSWORD_RESET_MAX_ATTEMPTS - record["attempts"]

        if remaining <= 0:
            password_reset_otps.pop(email, None)
            return error(
                "Maximum attempts reached. Please request a new code.",
                429,
            )

        return error(
            f"Incorrect reset code. {remaining} attempts remaining.",
            400,
        )

    record["verified"] = True

    return jsonify({
        "message": "Reset code verified successfully."
    }), 200


# --------------------------------------------------
# Forgot password: set new password
# --------------------------------------------------

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = read_json()

    email = clean_email(data.get("email"))
    code = str(data.get("code") or "").strip()
    new_password = str(data.get("new_password") or "")

    if not EMAIL_PATTERN.match(email):
        return error("Please enter a valid email address.", 400)

    if not re.fullmatch(r"\d{6}", code):
        return error("Please enter the 6-digit reset code.", 400)

    if len(new_password) < MIN_PASSWORD_LENGTH:
        return error(
            f"Password must be at least {MIN_PASSWORD_LENGTH} characters.",
            400,
        )

    record = password_reset_otps.get(email)

    if record is None:
        return error("Please request a new password reset code.", 400)

    if utc_now() > record["expires_at"]:
        password_reset_otps.pop(email, None)
        return error("Reset code has expired. Request a new one.", 400)

    if not record["verified"]:
        return error("Please verify your reset code first.", 403)

    if not compare_digest(_otp_digest(code), record["otp_hash"]):
        return error("Invalid reset code.", 400)

    user = SessionLocal.execute(
        select(User).where(func.lower(User.email) == email)
    ).scalar_one_or_none()

    if user is None or not user.email_verified:
        password_reset_otps.pop(email, None)
        return error("Unable to reset password for this account.", 400)

    user.password_hash = generate_password_hash(new_password)
    SessionLocal.commit()

    password_reset_otps.pop(email, None)

    return jsonify({
        "message": "Password reset successfully. Please log in."
    }), 200
