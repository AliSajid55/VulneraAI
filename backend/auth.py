"""
Authentication: signup, login, profile and password endpoints (JWT).
"""

import os
import re
import secrets
from datetime import timedelta
from functools import wraps

import jwt
from flask import Blueprint, g, jsonify, request
from sqlalchemy import func, select
from werkzeug.security import check_password_hash, generate_password_hash

from database import SessionLocal, User, utc_now

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

_env_secret = os.getenv("JWT_SECRET_KEY")
# Always a str so jwt.encode/jwt.decode type-check cleanly.
JWT_SECRET_KEY: str = _env_secret or secrets.token_hex(32)

if not _env_secret:
    # Works for local development, but every restart logs everyone out.
    print(
        "WARNING: JWT_SECRET_KEY is not set in .env. "
        "Using a temporary key; users will be logged out on restart."
    )

JWT_ALGORITHM = "HS256"
JWT_EXPIRES_HOURS = int(os.getenv("JWT_EXPIRES_HOURS", "24"))

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8


# --------------------------------------------------
# Helpers
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


def login_required(view):
    """Require a valid 'Authorization: Bearer <token>' header.

    Sets g.user to the logged-in User.
    """

    @wraps(view)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")

        if not header.startswith("Bearer "):
            return error("Please log in to continue.", 401)

        token = header[len("Bearer "):].strip()

        try:
            payload = jwt.decode(
                token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM]
            )
            user_id = int(payload["sub"])
        except jwt.ExpiredSignatureError:
            return error("Your session has expired. Please log in again.", 401)
        except (jwt.InvalidTokenError, KeyError, ValueError):
            return error("Invalid session. Please log in again.", 401)

        user = SessionLocal.get(User, user_id)

        if user is None:
            return error("Account not found. Please log in again.", 401)

        g.user = user
        return view(*args, **kwargs)

    return wrapper


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
# Routes
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
            f"Password must be at least {MIN_PASSWORD_LENGTH} characters.", 400
        )

    if email_taken(email):
        return error("An account with this email already exists.", 409)

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
    )
    SessionLocal.add(user)
    SessionLocal.commit()

    return jsonify({"token": create_token(user), "user": user.to_dict()}), 201


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

    return jsonify({"token": create_token(user), "user": user.to_dict()})


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
