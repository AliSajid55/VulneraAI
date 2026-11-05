"""
Database setup and models (PostgreSQL via SQLAlchemy).
"""

import os
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    text,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
    scoped_session,
    sessionmaker,
)

DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/polyguard"


def _normalize_database_url(url: str) -> str:
    """Use the psycopg (v3) driver for plain postgresql:// URLs."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]

    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]

    return url


DATABASE_URL = _normalize_database_url(
    os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)

SessionLocal = scoped_session(
    sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Python default False applies to newly-created ORM users.
    # Database default TRUE preserves existing users during migration.
    email_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("true"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    scans: Mapped[list["Scan"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    email_verification: Mapped["EmailVerification | None"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
        passive_deletes=True,
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "email_verified": self.email_verified,
            "created_at": self.created_at.isoformat(),
        }


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )

    otp_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    attempts: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )

    user: Mapped[User] = relationship(back_populates="email_verification")


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, index=True, nullable=False
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    language: Mapped[str] = mapped_column(String(40), nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    total_lines: Mapped[int] = mapped_column(Integer, nullable=False)

    prediction: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    vulnerable_probability: Mapped[float] = mapped_column(Float, nullable=False)
    overall_risk: Mapped[str] = mapped_column(String(20), nullable=False)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False)

    threshold: Mapped[float | None] = mapped_column(Float, nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(120), nullable=True)

    ai_available: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ai_model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    ai_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship(back_populates="scans")

    def to_summary(self) -> dict:
        """Short version for lists and tables."""
        first_line = next(
            (line.strip() for line in self.code.splitlines() if line.strip()),
            "",
        )

        return {
            "id": self.id,
            "title": self.title,
            "created_at": self.created_at.isoformat(),
            "language": self.language,
            "total_lines": self.total_lines,
            "prediction": self.prediction,
            "confidence": self.confidence,
            "vulnerable_probability": self.vulnerable_probability,
            "overall_risk": self.overall_risk,
            "threshold": self.threshold if self.threshold is not None else 0.5,
            "model_version": self.model_version,
            "ai_available": self.ai_available,
            "code_preview": first_line[:120],
        }

    def to_detail(self) -> dict:
        """Full version, shaped like the /api/scan response."""
        data = self.to_summary()
        data.update({
            "code": self.code,
            "chunk_count": self.chunk_count,
            "ai_explanation": {
                "available": self.ai_available,
                "model": self.ai_model,
                "explanation": self.ai_explanation or "",
            },
        })
        return data


def init_db() -> None:
    """Create tables and migrate older databases."""
    Base.metadata.create_all(engine)

    if engine.dialect.name == "postgresql":
        with engine.begin() as connection:
            connection.execute(text(
                "ALTER TABLE scans "
                "ADD COLUMN IF NOT EXISTS threshold DOUBLE PRECISION"
            ))

            connection.execute(text(
                "ALTER TABLE scans "
                "ADD COLUMN IF NOT EXISTS model_version VARCHAR(120)"
            ))

            # Existing accounts stay verified.
            connection.execute(text(
                "ALTER TABLE users "
                "ADD COLUMN IF NOT EXISTS email_verified "
                "BOOLEAN NOT NULL DEFAULT TRUE"
            ))