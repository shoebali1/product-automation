from __future__ import annotations

from dataclasses import dataclass
from html import escape
from pathlib import PurePosixPath
from typing import Any
from urllib.parse import urlsplit

import httpx

from app.core.config import settings
from app.schemas.generated_product import GeneratedProductData
from app.scraping.url_safety import UnsafeURLError, validate_public_url

MAX_IMAGE_BYTES = 15 * 1024 * 1024
MAX_TOTAL_IMAGE_BYTES = 60 * 1024 * 1024


class SurginatalSubmissionError(RuntimeError):
    pass


@dataclass(frozen=True)
class SubmissionImage:
    filename: str
    content: bytes
    content_type: str
    title: str
    alt: str
    primary: bool = False


def submit_product_to_surginatal(
    product: GeneratedProductData,
    *,
    local_images: list[SubmissionImage] | None = None,
    existing_product_id: int | None = None,
) -> int:
    headers = _authentication_headers()
    images = _download_product_images(product.images)
    images.extend(local_images or [])
    _validate_images(images)

    data = _form_fields(product, existing_product_id=existing_product_id)
    primary_index = next((index for index, image in enumerate(images) if image.primary), None)
    if primary_index is not None:
        data["primary_image_index"] = str(primary_index)
    data["image_titles"] = [image.title for image in images]
    data["image_alt"] = [image.alt for image in images]

    files = [
        ("images", (image.filename, image.content, image.content_type))
        for image in images
    ]
    try:
        with httpx.Client(
            timeout=settings.surginatal_submission_timeout_seconds,
            follow_redirects=True,
        ) as client:
            response = client.post(
                settings.surginatal_product_add_url,
                headers=headers,
                data=data,
                files=files,
            )
    except httpx.HTTPError as exc:
        raise SurginatalSubmissionError(
            "Could not reach the Surginatal product API"
        ) from exc

    if response.status_code >= 400:
        detail = _response_detail(response)
        raise SurginatalSubmissionError(
            f"Surginatal returned HTTP {response.status_code}: {detail}"
        )
    try:
        body = response.json()
        product_id = int(body["product_id"])
    except (KeyError, TypeError, ValueError) as exc:
        raise SurginatalSubmissionError(
            "Surginatal accepted the request but did not return a product_id"
        ) from exc
    return product_id


def _authentication_headers() -> dict[str, str]:
    if not settings.surginatal_product_add_url.strip():
        raise SurginatalSubmissionError(
            "Surginatal product API URL is not configured. Set "
            "SURGINATAL_PRODUCT_ADD_URL in .env."
        )
    headers = {"Accept": "application/json"}
    if settings.surginatal_admin_api_key:
        headers["X-API-Key"] = settings.surginatal_admin_api_key.get_secret_value()
    if settings.surginatal_admin_token:
        token = settings.surginatal_admin_token.get_secret_value().strip()
        headers["Authorization"] = token if token.lower().startswith("bearer ") else f"Bearer {token}"
    if len(headers) == 1:
        raise SurginatalSubmissionError(
            "Surginatal credentials are not configured. Set SURGINATAL_ADMIN_API_KEY "
            "and SURGINATAL_ADMIN_TOKEN in .env."
        )
    return headers


def _form_fields(
    product: GeneratedProductData,
    *,
    existing_product_id: int | None,
) -> dict[str, str | list[str]]:
    pricing = product.pricing
    seo = product.seo
    highlights_html = _highlights_html(product)
    short_description = (
        product.short_description
        if "<" in product.short_description
        else highlights_html or product.short_description
    )
    values: dict[str, Any] = {
        "product_id": existing_product_id,
        "name": product.product_title,
        "business_name": product.business_product_title,
        "short_description": short_description,
        "description": product.description,
        "mrp": pricing.mrp,
        "price": pricing.sale_price,
        "gst": pricing.gst,
        "quantity": product.quantity,
        "step_up_quantity": product.step_up_quantity,
        "pieces": product.pieces,
        "in_stock_quantity": product.in_stock_quantity,
        "SKU": product.sku,
        "rack_id": product.rack_id,
        "is_active": product.is_active,
        "is_in_stock": product.is_in_stock,
        "is_fast_delivery": product.is_fast_delivery,
        "is_cod_available": product.is_cod_available,
        "customisation_available": product.customisation_available,
        "is_prescription_required": product.is_prescription_required,
        "is_returnble": product.is_returnble,
        "is_liquid": product.is_liquid,
        "brand": product.brand_id,
        "gtin": product.gtin,
        "canonical_link": seo.canonical_link,
        "meta_title": seo.meta_title,
        "meta_keyword": ", ".join(seo.meta_keywords),
        "meta_description": seo.meta_description,
        "bussiess_meta_title": seo.business_meta_title,
        "bussiess_meta_description": seo.business_meta_description,
        "bussiess_canonical_link": seo.business_canonical_link,
        "sales_count": product.sales_count,
        "action": "publish_product",
    }
    fields: dict[str, str | list[str]] = {
        key: _form_value(value) for key, value in values.items() if value is not None
    }
    if product.category_id is not None:
        fields["category"] = [str(product.category_id)]
    if product.subcategory_id is not None:
        fields["subcategory"] = [str(product.subcategory_id)]
    related_ids = _related_product_ids(product.related_products)
    if related_ids:
        fields["related_products"] = [str(product_id) for product_id in related_ids]
    return fields


def _highlights_html(product: GeneratedProductData) -> str:
    if not product.highlights:
        return ""
    items = "".join(
        f"<li><strong>{escape(item.name)}:</strong> {escape(item.value)}</li>"
        for item in product.highlights
    )
    return f"<ul>{items}</ul>"


def _related_product_ids(value: str | None) -> list[int]:
    if not value:
        return []
    result = []
    for item in value.replace(";", ",").split(","):
        candidate = item.strip()
        if candidate.isdigit():
            result.append(int(candidate))
    return result


def _form_value(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def _download_product_images(product_images: list[Any]) -> list[SubmissionImage]:
    downloaded = []
    with httpx.Client(timeout=30.0, follow_redirects=False) as client:
        for index, image in enumerate(product_images):
            url = str(image.url)
            try:
                response = _get_public_image(client, url)
            except (httpx.HTTPError, UnsafeURLError) as exc:
                raise SurginatalSubmissionError(
                    f"Could not download product image {index + 1}"
                ) from exc
            content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
            if not content_type.startswith("image/"):
                raise SurginatalSubmissionError(
                    f"Product image {index + 1} did not return an image content type"
                )
            filename = PurePosixPath(urlsplit(url).path).name or f"product-image-{index + 1}"
            downloaded.append(
                SubmissionImage(
                    filename=filename,
                    content=response.content,
                    content_type=content_type,
                    title=image.title or f"{product.product_title} - Image {index + 1}",
                    alt=image.alt or f"{product.product_title} product image {index + 1}",
                    primary=image.primary_candidate,
                )
            )
    return downloaded


def _get_public_image(client: httpx.Client, url: str) -> httpx.Response:
    current_url = validate_public_url(url)
    for _ in range(6):
        response = client.get(current_url)
        if response.is_redirect:
            location = response.headers.get("location")
            if not location:
                response.raise_for_status()
            current_url = validate_public_url(str(response.url.join(location)))
            continue
        response.raise_for_status()
        return response
    raise SurginatalSubmissionError("Product image redirected too many times")


def _validate_images(images: list[SubmissionImage]) -> None:
    total = 0
    for image in images:
        if not image.content_type.lower().startswith("image/"):
            raise SurginatalSubmissionError(f"{image.filename} is not an image")
        if not image.content:
            raise SurginatalSubmissionError(f"{image.filename} is empty")
        if len(image.content) > MAX_IMAGE_BYTES:
            raise SurginatalSubmissionError(f"{image.filename} exceeds the 15 MB image limit")
        total += len(image.content)
    if total > MAX_TOTAL_IMAGE_BYTES:
        raise SurginatalSubmissionError("Product images exceed the 60 MB total limit")


def _response_detail(response: httpx.Response) -> str:
    try:
        body = response.json()
        detail = body.get("detail") or body.get("message")
        if detail:
            return str(detail)[:500]
    except (TypeError, ValueError):
        pass
    return response.text.strip()[:500] or "request failed"
