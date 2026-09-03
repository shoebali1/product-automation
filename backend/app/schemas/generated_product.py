from decimal import Decimal
from typing import Any

from pydantic import Field, HttpUrl, field_validator

from app.schemas.common import Pricing, ProductImage, ProductPack, ProductVariation, StrictSchema


class Highlight(StrictSchema):
    name: str
    value: str


class SEOData(StrictSchema):
    meta_title: str = ""
    meta_keywords: list[str] = Field(default_factory=list)
    meta_description: str = ""
    canonical_link: str | None = None
    business_meta_title: str = ""
    business_meta_description: str = ""
    business_canonical_link: str | None = None


class GeneratedProductData(StrictSchema):
    product_title: str
    slug: str
    business_product_title: str
    brand: str | None = None
    brand_id: int | None = None
    manufacturer: str | None = None
    generic_name: str | None = None
    product_code: str | None = None
    sku: str | None = None
    gtin: str | None = None
    category: str | None = None
    category_id: int | None = None
    subcategory: str | None = None
    subcategory_id: int | None = None
    rack_id: str | None = None
    related_products: str | None = None
    is_active: bool = True
    is_in_stock: bool = True
    is_fast_delivery: bool = True
    is_cod_available: bool = True
    customisation_available: bool = False
    is_prescription_required: bool = False
    is_returnble: bool = True
    is_liquid: bool = False
    quantity: int | None = 1
    step_up_quantity: int | None = 1
    pieces: int | None = 1
    in_stock_quantity: int | None = 100
    sales_count: int | None = 0
    highlights: list[Highlight] = Field(default_factory=list)
    short_description: str = ""
    description: str = ""
    benefits: list[str] = Field(default_factory=list)
    how_to_use: list[str] = Field(default_factory=list)
    precautions: list[str] = Field(default_factory=list)
    specifications: dict[str, str] = Field(default_factory=dict)
    images: list[ProductImage] = Field(default_factory=list)
    variations: list[ProductVariation] = Field(default_factory=list)
    packs: list[ProductPack] = Field(default_factory=list)
    pricing: Pricing = Field(default_factory=Pricing)
    seo: SEOData = Field(default_factory=SEOData)
    source_evidence: dict[str, Any] = Field(default_factory=dict)
    conflicts: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    overall_confidence: Decimal = Field(ge=0, le=1)

    @field_validator("specifications", mode="before")
    @classmethod
    def clean_specifications(cls, value: Any) -> dict[str, str]:
        if not isinstance(value, dict):
            return {}
        return {
            str(k).strip(): str(v).strip()
            for k, v in value.items()
            if str(k).strip() and v is not None and str(v).strip()
        }

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str) -> str:
        if not value or value.strip("abcdefghijklmnopqrstuvwxyz0123456789-"):
            raise ValueError("slug must contain only lowercase letters, digits, and hyphens")
        if "--" in value or value.startswith("-") or value.endswith("-"):
            raise ValueError("slug must use single hyphens between words")
        return value

