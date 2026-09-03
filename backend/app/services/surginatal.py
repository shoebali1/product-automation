import difflib
import logging
import re
import time
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.generated_product import GeneratedProductData

logger = logging.getLogger(__name__)

_taxonomy_cache: dict[str, Any] | None = None
_taxonomy_cache_time: float = 0.0

NON_ALNUM_PATTERN = re.compile(r"[^a-z0-9]+")


def _clean_text(val: str | None) -> str:
    if not val:
        return ""
    return NON_ALNUM_PATTERN.sub(" ", str(val).casefold()).strip()


def fetch_surginatal_taxonomy(force_refresh: bool = False) -> dict[str, Any]:
    """Fetch category, subcategory, and brand taxonomy from Surginatal API with caching."""
    global _taxonomy_cache, _taxonomy_cache_time

    now = time.time()
    if (
        not force_refresh
        and _taxonomy_cache is not None
        and (now - _taxonomy_cache_time) < settings.surginatal_cache_ttl_seconds
    ):
        return _taxonomy_cache

    url = settings.surginatal_api_url
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }
    if settings.surginatal_api_key:
        headers["x-api-key"] = settings.surginatal_api_key.get_secret_value()

    try:
        with httpx.Client(timeout=15.0, follow_redirects=True) as client:
            response = client.get(url, headers=headers)
            if response.status_code == 200:
                body = response.json()
                data = body.get("data", {})
                if isinstance(data, dict):
                    _taxonomy_cache = data
                    _taxonomy_cache_time = now
                    logger.info(
                        "Successfully fetched Surginatal taxonomy (%d categories, %d brands)",
                        len(data.get("category_data", [])),
                        len(data.get("brand_data", [])),
                    )
                    return data
            logger.warning(
                "Surginatal API responded with status %d: %s",
                response.status_code,
                response.text[:200],
            )
    except Exception as exc:
        logger.warning("Failed to fetch Surginatal taxonomy: %s", exc)

    if _taxonomy_cache is not None:
        return _taxonomy_cache

    return {"category_data": [], "brand_data": []}


def match_brand(
    candidate_brand: str | None,
    taxonomy: dict[str, Any] | None = None,
) -> tuple[str | None, int | None]:
    """Match candidate brand against Surginatal master brands.

    Returns (official_brand_name, brand_id).
    """
    if not candidate_brand or not candidate_brand.strip():
        return (None, None)

    if taxonomy is None:
        taxonomy = fetch_surginatal_taxonomy()

    brands: list[dict[str, Any]] = taxonomy.get("brand_data", [])
    if not brands:
        return (candidate_brand.strip(), None)

    cand_cleaned = _clean_text(candidate_brand)
    cand_tokens = set(cand_cleaned.split())

    # 1. Exact case-insensitive match on name or slug
    for b in brands:
        b_name = b.get("name", "").strip()
        b_slug = b.get("slug", "").strip()
        b_id = b.get("id")
        if _clean_text(b_name) == cand_cleaned or _clean_text(b_slug) == cand_cleaned:
            return (b_name, b_id)

    # 2. Token / word boundary containment (e.g. 'Romsons Scientific' matches 'Romsons')
    best_token_match: tuple[str, int, int] | None = None  # (name, id, len of name)
    for b in brands:
        b_name = b.get("name", "").strip()
        b_cleaned = _clean_text(b_name)
        b_tokens = set(b_cleaned.split())
        b_id = b.get("id")

        if b_tokens and (b_tokens.issubset(cand_tokens) or cand_tokens.issubset(b_tokens)):
            # Pick the more specific or closest token match
            if best_token_match is None or len(b_cleaned) > best_token_match[2]:
                best_token_match = (b_name, b_id, len(b_cleaned))

    if best_token_match is not None:
        return (best_token_match[0], best_token_match[1])

    # 3. Fuzzy similarity matching with threshold 0.85
    best_fuzzy: tuple[str, int, float] | None = None
    for b in brands:
        b_name = b.get("name", "").strip()
        b_cleaned = _clean_text(b_name)
        b_id = b.get("id")
        ratio = difflib.SequenceMatcher(None, cand_cleaned, b_cleaned).ratio()
        if ratio >= 0.85:
            if best_fuzzy is None or ratio > best_fuzzy[2]:
                best_fuzzy = (b_name, b_id, ratio)

    if best_fuzzy is not None:
        return (best_fuzzy[0], best_fuzzy[1])

    return (candidate_brand.strip(), None)


def match_category_and_subcategory(
    candidate_category: str | None,
    candidate_subcategory: str | None = None,
    product_title: str | None = None,
    taxonomy: dict[str, Any] | None = None,
) -> tuple[str | None, int | None, str | None, int | None]:
    """Match category and subcategory against Surginatal master categories.

    Returns (category_name, category_id, subcategory_name, subcategory_id).
    """
    if taxonomy is None:
        taxonomy = fetch_surginatal_taxonomy()

    categories: list[dict[str, Any]] = taxonomy.get("category_data", [])
    if not categories:
        return (
            candidate_category.strip() if candidate_category else None,
            None,
            candidate_subcategory.strip() if candidate_subcategory else None,
            None,
        )

    cand_cat_clean = _clean_text(candidate_category)
    cand_sub_clean = _clean_text(candidate_subcategory)
    cand_title_clean = _clean_text(product_title)

    matched_cat: dict[str, Any] | None = None

    # Step 1: Match Category directly
    if cand_cat_clean:
        # Exact match
        for cat in categories:
            if _clean_text(cat.get("name")) == cand_cat_clean or _clean_text(cat.get("slug")) == cand_cat_clean:
                matched_cat = cat
                break

        # Token overlap
        if matched_cat is None:
            cand_cat_tokens = set(cand_cat_clean.split())
            for cat in categories:
                cat_tokens = set(_clean_text(cat.get("name")).split())
                if cat_tokens and (cat_tokens.issubset(cand_cat_tokens) or cand_cat_tokens.issubset(cat_tokens)):
                    matched_cat = cat
                    break

        # Fuzzy match (ratio >= 0.8)
        if matched_cat is None:
            best_ratio = 0.0
            for cat in categories:
                ratio = difflib.SequenceMatcher(None, cand_cat_clean, _clean_text(cat.get("name"))).ratio()
                if ratio >= 0.8 and ratio > best_ratio:
                    best_ratio = ratio
                    matched_cat = cat

    # Step 2: Match Subcategory
    matched_sub: dict[str, Any] | None = None

    # If we have a matched category, first look in its subcategories
    if matched_cat:
        subcats = matched_cat.get("subcategories", [])
        matched_sub = _find_best_subcategory(subcats, cand_sub_clean, cand_title_clean)

    # If no category or no subcategory found yet, search across all subcategories globally
    if matched_sub is None and (cand_sub_clean or cand_title_clean):
        for cat in categories:
            subcats = cat.get("subcategories", [])
            candidate_sub = _find_best_subcategory(subcats, cand_sub_clean, cand_title_clean)
            if candidate_sub is not None:
                matched_sub = candidate_sub
                if matched_cat is None:
                    matched_cat = cat
                break

    cat_name = matched_cat.get("name") if matched_cat else (candidate_category.strip() if candidate_category else None)
    cat_id = matched_cat.get("id") if matched_cat else None
    sub_name = matched_sub.get("name") if matched_sub else (candidate_subcategory.strip() if candidate_subcategory else None)
    sub_id = matched_sub.get("id") if matched_sub else None

    return (cat_name, cat_id, sub_name, sub_id)


def _find_best_subcategory(
    subcategories: list[dict[str, Any]],
    cand_sub_clean: str,
    cand_title_clean: str,
) -> dict[str, Any] | None:
    if not subcategories:
        return None

    # Try matching cand_sub_clean first
    if cand_sub_clean:
        for sub in subcategories:
            sub_name_clean = _clean_text(sub.get("name"))
            sub_slug_clean = _clean_text(sub.get("slug"))
            if sub_name_clean == cand_sub_clean or sub_slug_clean == cand_sub_clean:
                return sub

        cand_sub_tokens = set(cand_sub_clean.split())
        for sub in subcategories:
            sub_tokens = set(_clean_text(sub.get("name")).split())
            if sub_tokens and (sub_tokens.issubset(cand_sub_tokens) or cand_sub_tokens.issubset(sub_tokens)):
                return sub

        best_sub = None
        best_ratio = 0.0
        for sub in subcategories:
            ratio = difflib.SequenceMatcher(None, cand_sub_clean, _clean_text(sub.get("name"))).ratio()
            if ratio >= 0.8 and ratio > best_ratio:
                best_ratio = ratio
                best_sub = sub
        if best_sub is not None:
            return best_sub

    # Try matching key terms against product_title
    if cand_title_clean:
        title_tokens = set(cand_title_clean.split())
        for sub in subcategories:
            sub_name_clean = _clean_text(sub.get("name"))
            sub_tokens = set(sub_name_clean.split())
            # Ignore very common stop words
            significant_sub_tokens = {t for t in sub_tokens if len(t) > 3 and t not in {"tubes", "sets", "care"}}
            if significant_sub_tokens and significant_sub_tokens.issubset(title_tokens):
                return sub

    return None


def enrich_with_surginatal(
    product_data: GeneratedProductData,
    taxonomy: dict[str, Any] | None = None,
) -> GeneratedProductData:
    """Standardize brand, category, and subcategory and attach their Surginatal IDs."""
    if taxonomy is None:
        taxonomy = fetch_surginatal_taxonomy()

    # Match brand
    matched_brand, brand_id = match_brand(product_data.brand, taxonomy)
    if matched_brand:
        product_data.brand = matched_brand
    if brand_id is not None:
        product_data.brand_id = brand_id

    # Match category and subcategory
    cat_name, cat_id, sub_name, sub_id = match_category_and_subcategory(
        product_data.category,
        product_data.subcategory,
        product_title=product_data.product_title,
        taxonomy=taxonomy,
    )
    if cat_name:
        product_data.category = cat_name
    if cat_id is not None:
        product_data.category_id = cat_id
    if sub_name:
        product_data.subcategory = sub_name
    if sub_id is not None:
        product_data.subcategory_id = sub_id

    return product_data
