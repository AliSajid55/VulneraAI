"""Shared rate limiter instance.

Kept in its own module so both server.py and auth.py can import it without
circular imports. Limits on sensitive auth routes are declared in auth.py.
"""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Generous app-wide default so tests/batch scans don't trip it; the sensitive
# auth routes (login, signup, OTP, password reset) override it with tight limits.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["5000 per day", "500 per hour"],
    headers_enabled=True,
)
