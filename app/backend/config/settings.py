import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.environ["DATABASE_URL"]

SF_CLIENT_ID: str = os.getenv("SF_CLIENT_ID", "")
SF_CLIENT_SECRET: str = os.getenv("SF_CLIENT_SECRET", "")
SF_USERNAME: str = os.getenv("SF_USERNAME", "")
SF_PASSWORD: str = os.getenv("SF_PASSWORD", "")
SF_SECURITY_TOKEN: str = os.getenv("SF_SECURITY_TOKEN", "")
SF_INSTANCE_URL: str = os.getenv("SF_INSTANCE_URL", "")

APP_ENV: str = os.getenv("APP_ENV", "development")
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
