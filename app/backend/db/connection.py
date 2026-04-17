from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.backend.config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
_engine_kwargs = {} if _is_sqlite else {"pool_pre_ping": True, "pool_size": 5, "max_overflow": 10}
engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
