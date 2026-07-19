import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PORT: int = Field(default=8000, env="PORT")
    MONGODB_URI: str = Field(default="mongodb://127.0.0.1:27017/blast_safety", env="MONGODB_URI")
    DATABASE_URL: str = Field(default="sqlite:///./blast_safety.db", env="DATABASE_URL")
    ANTHROPIC_API_KEY: str = Field(default="", env="ANTHROPIC_API_KEY")
    ANTHROPIC_MODEL: str = Field(default="claude-3-5-sonnet-latest", env="ANTHROPIC_MODEL")
    JWT_SECRET: str = Field(default="supersecretkey", env="JWT_SECRET")
    JWT_ALGORITHM: str = Field(default="HS256", env="JWT_ALGORITHM")
    ALLOWED_ORIGINS: str = Field(default="http://localhost:5173", env="ALLOWED_ORIGINS")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }

    def __init__(self, **values):
        super().__init__(**values)
        if not self.MONGODB_URI:
            self.MONGODB_URI = "mongodb://127.0.0.1:27017/blast_safety"
        if not self.DATABASE_URL:
            self.DATABASE_URL = "sqlite:///./blast_safety.db"

settings = Settings()
