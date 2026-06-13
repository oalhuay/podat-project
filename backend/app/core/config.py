from dataclasses import dataclass
from os import getenv

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    supabase_url: str | None = getenv("SUPABASE_URL")
    supabase_key: str | None = getenv("SUPABASE_KEY")


settings = Settings()