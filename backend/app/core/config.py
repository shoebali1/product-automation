from functools import lru_cache
from decimal import Decimal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Product Research Automation API"
    app_env: str = "development"
    database_url: str = (
        "mysql+pymysql://product_automation:product_automation"
        "@localhost:3306/product_automation?charset=utf8mb4"
    )
    redis_url: str = "redis://localhost:6379/0"
    openai_api_key: SecretStr | None = None
    openai_model: str = "gpt-5.6-sol"
    ai_credential_encryption_key: SecretStr | None = None
    openai_input_cost_per_million: Decimal = Decimal("4.00")
    openai_output_cost_per_million: Decimal = Decimal("20.00")
    scraping_cache_hours: int = 24
    scraping_max_attempts: int = 3
    browser_fallback_enabled: bool = True
    frontend_origin: str = "http://localhost:5173"
    surginatal_api_url: str = "https://surginatal.com/fastapi/api/v1/category/"
    surginatal_api_key: SecretStr | None = None
    surginatal_cache_ttl_seconds: int = 3600


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
