from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Pricing(StrictSchema):
    mrp: Decimal | None = Field(default=None, ge=0)
    sale_price: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    gst: Decimal | None = Field(default=None, ge=0)

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class ProductImage(StrictSchema):
    url: str
    source_url: str | None = None
    title: str | None = None
    alt: str | None = None
    primary_candidate: bool = False
    reference_only: bool = True


class ProductVariation(StrictSchema):
    name: str
    price: Decimal | None = Field(default=None, ge=0)
    mrp: Decimal | None = Field(default=None, ge=0)
    sku: str | None = None
    attributes: dict[str, str] = Field(default_factory=dict)


class ProductPack(StrictSchema):
    label: str
    quantity: int | None = Field(default=None, ge=1)
    price: Decimal | None = Field(default=None, ge=0)
    mrp: Decimal | None = Field(default=None, ge=0)
    sku: str | None = None

