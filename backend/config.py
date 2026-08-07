from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PORT: int = Field(default=8000, env="PORT")
    MONGODB_URI: str = Field(default="mongodb://127.0.0.1:27017/blast_safety", env="MONGODB_URI")
    DATABASE_URL: str = Field(default="sqlite:///./blast_safety.db", env="DATABASE_URL")
    GEMINI_API_KEY: str = Field(default="", env="GEMINI_API_KEY")
    GEMINI_MODEL: str = Field(default="gemini-3.1-flash-lite", env="GEMINI_MODEL")
    ANTHROPIC_API_KEY: str = Field(default="", env="ANTHROPIC_API_KEY")
    ANTHROPIC_MODEL: str = Field(default="claude-3-5-sonnet-latest", env="ANTHROPIC_MODEL")
    JWT_SECRET: str = Field(default="supersecretkey", env="JWT_SECRET")
    JWT_ALGORITHM: str = Field(default="HS256", env="JWT_ALGORITHM")
    ALLOWED_ORIGINS: str = Field(default="http://localhost:5173", env="ALLOWED_ORIGINS")
    SMTP_HOST: str = Field(default="smtp.gmail.com", env="SMTP_HOST")
    SMTP_PORT: int = Field(default=587, env="SMTP_PORT")
    SMTP_USER: str = Field(default="", env="SMTP_USER")
    SMTP_PASSWORD: str = Field(default="", env="SMTP_PASSWORD")
    SMTP_FROM: str = Field(default="", env="SMTP_FROM")
    TWILIO_ACCOUNT_SID: str = Field(default="", env="TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN: str = Field(default="", env="TWILIO_AUTH_TOKEN")
    TWILIO_PHONE_NUMBER: str = Field(default="", env="TWILIO_PHONE_NUMBER")

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
