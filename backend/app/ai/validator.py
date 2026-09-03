import json
import re
from collections import defaultdict
from decimal import Decimal
from typing import Any

from app.schemas.generated_product import GeneratedProductData
from app.schemas.product_source import NormalizedProductSource

SPACE_PATTERN = re.compile(r"\s+")
NON_ALNUM_PATTERN = re.compile(r"[^A-Z0-9]")
NUMBER_PATTERN = re.compile(r"(?<![A-Za-z])\d+(?:[.,]\d+)?")
IDENTIFIER_FIELDS = {"product_code", "sku", "gtin"}
FACTUAL_FIELDS = (
    "brand",
    "manufacturer",
    "generic_name",
    "product_code",
    "sku",
    "gtin",
    "category",
)
SENSITIVE_PHRASES = (
    "fda approved",
    "ce certified",
    "clinically proven",
    "clinically effective",
    "guaranteed safe",
    "sterile",
    "non-toxic",
    "contraindicated",
)


def factual_support_errors(
    product: GeneratedProductData,
    sources: list[NormalizedProductSource],
) -> list[str]:
    errors: list[str] = []
    for field_name in FACTUAL_FIELDS:
        generated_value = getattr(product, field_name)
        if generated_value is None:
            continue
        supported = {
            _canonical(field_name, getattr(source, field_name))
            for source in sources
            if getattr(source, field_name) is not None
        }
        if _canonical(field_name, generated_value) not in supported:
            if field_name == "brand" and product.brand_id is not None:
                gen_clean = _canonical("brand", generated_value)
                if any(gen_clean in s or s in gen_clean for s in supported):
                    continue
            if field_name == "category" and product.category_id is not None:
                continue
            errors.append(f"{field_name} is unsupported: {generated_value}")

    supported_specs: dict[str, set[str]] = defaultdict(set)
    for source in sources:
        for name, value in source.specifications.items():
            supported_specs[_text(name).casefold()].add(_text(value).casefold())
    for name, value in product.specifications.items():
        values = supported_specs.get(_text(name).casefold(), set())
        if _text(value).casefold() not in values:
            errors.append(f"specifications.{name} is unsupported: {value}")

    for price_field in ("mrp", "sale_price", "currency", "gst"):
        generated_value = getattr(product.pricing, price_field)
        if generated_value is None:
            continue
        supported = {
            _comparable_price(getattr(source.pricing, price_field))
            for source in sources
            if getattr(source.pricing, price_field) is not None
        }
        if _comparable_price(generated_value) not in supported:
            errors.append(f"pricing.{price_field} is unsupported: {generated_value}")

    supported_images = {str(image.url) for source in sources for image in source.images}
    for image in product.images:
        if str(image.url) not in supported_images:
            errors.append(f"image URL is unsupported: {image.url}")
        if not image.reference_only:
            errors.append(f"competitor image must remain reference-only: {image.url}")

    source_corpus = " ".join(
        json.dumps(_source_payload(source), ensure_ascii=False).casefold() for source in sources
    )
    generated_corpus = " ".join(
        (
            product.product_title,
            product.business_product_title,
            product.short_description,
            product.description,
            *product.benefits,
            *product.how_to_use,
            *product.precautions,
        )
    ).casefold()
    for phrase in SENSITIVE_PHRASES:
        if phrase in generated_corpus and phrase not in source_corpus:
            errors.append(f"unsupported sensitive claim: {phrase}")
    for number in set(NUMBER_PATTERN.findall(generated_corpus)):
        if number not in source_corpus:
            errors.append(f"generated prose contains unsupported numeric fact: {number}")
    return sorted(set(errors))


def _source_payload(source: NormalizedProductSource) -> dict[str, Any]:
    payload = source.model_dump(mode="json")
    for metadata_field in (
        "raw_json_ld",
        "source_url",
        "domain",
        "extraction_method",
        "scraped_at",
    ):
        payload.pop(metadata_field, None)
    return payload


def _canonical(field_name: str, value: Any) -> str:
    text = _text(value)
    if field_name in IDENTIFIER_FIELDS:
        return NON_ALNUM_PATTERN.sub("", text.upper())
    return text.casefold()


def _text(value: Any) -> str:
    return SPACE_PATTERN.sub(" ", str(value)).strip()


def _comparable_price(value: Any) -> str:
    if isinstance(value, Decimal):
        return format(value.normalize(), "f")
    return str(value).upper()
