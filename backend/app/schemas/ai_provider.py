from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import Field, HttpUrl, model_validator

from app.schemas.common import StrictSchema


class AIModelDetail(StrictSchema):
    id: UUID
    provider_id: UUID
    model_id: str
    display_name: str
    enabled: bool
    is_default: bool
    priority: int
    supports_json_schema: bool
    max_tokens: int
    temperature: Decimal
    input_cost_per_million: Decimal | None
    output_cost_per_million: Decimal | None


class AIProviderDetail(StrictSchema):
    id: UUID
    slug: str
    name: str
    base_url: str
    enabled: bool
    api_key_configured: bool
    api_key_hint: str | None
    custom_headers: dict[str, Any]
    last_test_status: str | None
    last_test_message: str | None
    last_tested_at: datetime | None
    models: list[AIModelDetail]


class AIProviderUpdate(StrictSchema):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    base_url: HttpUrl | None = None
    api_key: str | None = Field(default=None, min_length=1, max_length=2000)
    clear_api_key: bool = False
    enabled: bool | None = None
    custom_headers: dict[str, str] | None = None

    @model_validator(mode="after")
    def validate_key_action(self):
        if self.api_key and self.clear_api_key:
            raise ValueError("api_key and clear_api_key cannot be used together")
        return self


class AIModelCreate(StrictSchema):
    model_id: str = Field(min_length=1, max_length=255)
    display_name: str = Field(min_length=1, max_length=255)
    enabled: bool = True
    is_default: bool = False
    priority: int = Field(default=100, ge=0, le=10_000)
    supports_json_schema: bool = True
    max_tokens: int = Field(default=4096, ge=64, le=200_000)
    temperature: Decimal = Field(default=Decimal("0.20"), ge=0, le=2)
    input_cost_per_million: Decimal | None = Field(default=None, ge=0)
    output_cost_per_million: Decimal | None = Field(default=None, ge=0)


class AIModelUpdate(StrictSchema):
    model_id: str | None = Field(default=None, min_length=1, max_length=255)
    display_name: str | None = Field(default=None, min_length=1, max_length=255)
    enabled: bool | None = None
    is_default: bool | None = None
    priority: int | None = Field(default=None, ge=0, le=10_000)
    supports_json_schema: bool | None = None
    max_tokens: int | None = Field(default=None, ge=64, le=200_000)
    temperature: Decimal | None = Field(default=None, ge=0, le=2)
    input_cost_per_million: Decimal | None = Field(default=None, ge=0)
    output_cost_per_million: Decimal | None = Field(default=None, ge=0)


class AIModelTestResult(StrictSchema):
    ok: bool
    model: str
    provider: str
    latency_ms: int
    response_preview: str | None = None
    message: str
