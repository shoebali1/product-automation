from datetime import datetime
from typing import Any

from pydantic import Field, HttpUrl

from app.schemas.common import Pricing, ProductImage, ProductPack, ProductVariation, StrictSchema


class NormalizedProductSource(StrictSchema):
    source_url: HttpUrl
    domain: str
    product_title: str | None = None
    brand: str | None = None
    manufacturer: str | None = None
    generic_name: str | None = None
    product_code: str | None = None
    model: str | None = None
    sku: str | None = None
    gtin: str | None = None
    mpn: str | None = None
    category: str | None = None
    subcategory: str | None = None
    description: str | None = None
    features: list[str] = Field(default_factory=list)
    benefits: list[str] = Field(default_factory=list)
    how_to_use: list[str] = Field(default_factory=list)
    precautions: list[str] = Field(default_factory=list)
    specifications: dict[str, str] = Field(default_factory=dict)
    pricing: Pricing = Field(default_factory=Pricing)
    variations: list[ProductVariation] = Field(default_factory=list)
    packs: list[ProductPack] = Field(default_factory=list)
    images: list[ProductImage] = Field(default_factory=list)
    raw_json_ld: dict[str, Any] | list[Any] = Field(default_factory=dict)
    extraction_method: str
    scraped_at: datetime

