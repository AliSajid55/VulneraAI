"""Central logging: console + rotating file (backend/logs/server.log).

Importing this module configures logging once for the whole app; the returned
`logger` should be used by application code. The handlers are attached to the
root logger, so Flask's own `app.logger` messages and request logs also end up
in the same console output and file.
"""
import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parent / "logs"
LOG_FORMAT = "%(asctime)s %(levelname)s [%(name)s] %(message)s"


def configure(level: str | None = None) -> logging.Logger:
    """Attach console + rotating-file handlers exactly once; return the app logger."""
    root = logging.getLogger()
    if getattr(root, "vulneraai_configured", False):
        return logging.getLogger("vulneraai")

    LOG_DIR.mkdir(exist_ok=True)
    formatter = logging.Formatter(LOG_FORMAT)

    console = logging.StreamHandler()
    console.setFormatter(formatter)

    file_handler = RotatingFileHandler(
        LOG_DIR / "server.log",
        maxBytes=2_000_000,  # 2 MB per file
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)

    root.setLevel(level or os.getenv("LOG_LEVEL", "INFO"))
    root.addHandler(console)
    root.addHandler(file_handler)
    root.vulneraai_configured = True  # type: ignore[attr-defined]
    return logging.getLogger("vulneraai")


logger = configure()
