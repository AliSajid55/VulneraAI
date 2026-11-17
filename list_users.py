"""Show users from the app's public.users table (custom auth)."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

from sqlalchemy import create_engine, text  # noqa: E402

engine = create_engine(os.environ["DATABASE_URL"])
with engine.connect() as conn:
    rows = conn.execute(
        text("SELECT id, name, email, email_verified, created_at FROM users ORDER BY id")
    ).fetchall()
    print(f"public.users table -> {len(rows)} row(s):")
    for r in rows:
        m = r._mapping
        print(
            f"  #{m['id']} | {m['name']} | {m['email']} | verified={m['email_verified']} | {m['created_at']}"
        )
