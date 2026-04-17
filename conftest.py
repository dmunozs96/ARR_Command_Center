"""Root conftest: set required env vars before any module is imported."""
import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
