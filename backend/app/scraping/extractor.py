import re
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from urllib.parse import urljoin, urlsplit

from bs4 import BeautifulSoup, Tag

from app.schemas.common import Pricing, ProductImage, ProductPack, ProductVariation
from app.schemas.product_source import NormalizedProductSource
from app.scraping.jsonld import choose_product, extract_json_ld, find_products
from app.scraping.pricing import detect_currency, parse_price

SPACE_PATTERN = re.compile(r"\s+")
FEATURE_HEADINGS = {"features", "key features", "highlights", "product features"}
BENEFIT_HEADINGS = {"benefits", "product benefits"}
USAGE_HEADINGS = {"how to use", "directions", "usage", "instructions for use"}
PRECAUTION_HEADINGS = {"precautions", "warnings", "safety information"}
VARIATION_GROUPS = {"size", "colour", "color", "model", "capacity", "configuration"}
PACK_PATTERN = re.compile(r"(?:pack\s+of\s+|pack\s*[-x]?\s*|)(\d+)\s*(?:pack|pcs?|pieces?|units?)?", re.I)


class ProductExtractor:
    def extract(self, html: str, source_url: str, *, method: str = "scrapling_http") -> NormalizedProductSource:
        soup = BeautifulSoup(html, "lxml")
        json_documents = extract_json_ld(html)
        product = choose_product(find_products(json_documents)) or {}
        _remove_irrelevant_content(soup)
        content_root = _product_root(soup)
        offers = _choose_offer(product.get("offers"))

        title = _clean(product.get("name")) or _first_meta(soup, "og:title") or _first_text(
            soup, ("h1", "[itemprop='name']", "title")
        )
        description = _clean(product.get("description")) or _first_meta(
            soup, "og:description"
        ) or _meta_name(soup, "description")
        brand = _named_value(product.get("brand")) or _itemprop_text(soup, "brand")
        manufacturer = _named_value(product.get("manufacturer")) or _itemprop_text(
            soup, "manufacturer"
        )

        sale_price = parse_price(offers.get("price") or offers.get("lowPrice"))
        currency = _clean(offers.get("priceCurrency"))
        if sale_price is None:
            price_text = _first_text(
                soup,
                (
                    "[itemprop='price']",
                    "meta[property='product:price:amount']",
                    ".sale-price",
                    ".special-price",
                    ".price",
                ),
                attribute="content",
            )
            sale_price = parse_price(price_text)
            currency = currency or detect_currency(price_text)

        mrp_text = _first_text(soup, (".mrp", ".regular-price", ".list-price", "del", "s"))
        sections = _extract_sections(content_root)
        images = _extract_images(product.get("image"), content_root, source_url)
        variations, packs = _extract_choices(product, content_root)

        return NormalizedProductSource(
            source_url=source_url,
            domain=(urlsplit(source_url).hostname or "").lower(),
            product_title=title,
            brand=brand,
            manufacturer=manufacturer,
            generic_name=_clean(product.get("category")),
            product_code=_clean(product.get("productID") or product.get("model")),
            model=_clean(product.get("model")),
            sku=_clean(product.get("sku")),
            gtin=_first_value(product, "gtin", "gtin8", "gtin12", "gtin13", "gtin14"),
            mpn=_clean(product.get("mpn")),
            category=_clean(product.get("category")),
            description=description,
            features=sections["features"],
            benefits=sections["benefits"],
            how_to_use=sections["how_to_use"],
            precautions=sections["precautions"],
            specifications=_extract_specifications(content_root, product),
            pricing=Pricing(
                mrp=parse_price(mrp_text),
                sale_price=sale_price,
                currency=(currency or detect_currency(mrp_text)),
            ),
            variations=variations,
            packs=packs,
            images=images,
            raw_json_ld=product,
            extraction_method="json_ld+dom" if product else method + "+dom",
            scraped_at=datetime.now(UTC),
        )


def _choose_offer(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, list):
        return next((item for item in value if isinstance(item, dict)), {})
    return {}


def _named_value(value: Any) -> str | None:
    if isinstance(value, dict):
        return _clean(value.get("name"))
    return _clean(value)


def _first_value(product: dict[str, Any], *keys: str) -> str | None:
    return next((_clean(product.get(key)) for key in keys if _clean(product.get(key))), None)


def _clean(value: Any) -> str | None:
    if value is None or isinstance(value, (dict, list)):
        return None
    cleaned = SPACE_PATTERN.sub(" ", str(value)).strip()
    return cleaned or None


def _first_meta(soup: BeautifulSoup, property_name: str) -> str | None:
    element = soup.select_one(f'meta[property="{property_name}"]')
    return _clean(element.get("content")) if element else None


def _meta_name(soup: BeautifulSoup, name: str) -> str | None:
    element = soup.select_one(f'meta[name="{name}"]')
    return _clean(element.get("content")) if element else None


def _itemprop_text(soup: BeautifulSoup, itemprop: str) -> str | None:
    return _first_text(soup, (f"[itemprop='{itemprop}']",), attribute="content")


def _first_text(
    soup: BeautifulSoup, selectors: tuple[str, ...], *, attribute: str | None = None
) -> str | None:
    for selector in selectors:
        element = soup.select_one(selector)
        if not element:
            continue
        candidate = element.get(attribute) if attribute and element.has_attr(attribute) else element.get_text(" ")
        if cleaned := _clean(candidate):
            return cleaned
    return None


def _extract_specifications(soup: Tag | BeautifulSoup, product: dict[str, Any]) -> dict[str, str]:
    specs: dict[str, str] = {}
    for table in soup.select("table"):
        for row in table.select("tr"):
            cells = row.find_all(["th", "td"], recursive=False)
            if len(cells) == 2:
                _add_spec(specs, cells[0].get_text(" "), cells[1].get_text(" "))
    for definition_list in soup.select("dl"):
        for term in definition_list.find_all("dt", recursive=False):
            definition = term.find_next_sibling("dd")
            if definition:
                _add_spec(specs, term.get_text(" "), definition.get_text(" "))
    for property_item in product.get("additionalProperty", []) or []:
        if isinstance(property_item, dict):
            _add_spec(specs, property_item.get("name"), property_item.get("value"))
    return specs


def _add_spec(specs: dict[str, str], name: Any, value: Any) -> None:
    clean_name, clean_value = _clean(name), _clean(value)
    if clean_name and clean_value and clean_name.lower() not in {"specification", "details"}:
        specs.setdefault(clean_name.rstrip(":"), clean_value)


def _extract_sections(soup: Tag | BeautifulSoup) -> dict[str, list[str]]:
    result = {"features": [], "benefits": [], "how_to_use": [], "precautions": []}
    heading_groups = {
        "features": FEATURE_HEADINGS,
        "benefits": BENEFIT_HEADINGS,
        "how_to_use": USAGE_HEADINGS,
        "precautions": PRECAUTION_HEADINGS,
    }
    for heading in soup.find_all(re.compile(r"^h[2-6]$")):
        heading_text = (_clean(heading.get_text(" ")) or "").lower().rstrip(":")
        group = next((name for name, labels in heading_groups.items() if heading_text in labels), None)
        if not group:
            continue
        sibling = heading.find_next_sibling()
        while sibling and not (isinstance(sibling, Tag) and re.fullmatch(r"h[2-6]", sibling.name or "")):
            if isinstance(sibling, Tag):
                items = sibling.select("li")
                values = [item.get_text(" ") for item in items] if items else [sibling.get_text(" ")]
                for value in values:
                    cleaned = _clean(value)
                    if cleaned and cleaned not in result[group]:
                        result[group].append(cleaned)
            sibling = sibling.find_next_sibling()
    return result


def _extract_images(value: Any, soup: Tag | BeautifulSoup, source_url: str) -> list[ProductImage]:
    candidates: list[tuple[str, str | None, bool]] = []
    json_images = value if isinstance(value, list) else [value]
    for index, image in enumerate(json_images):
        image_url = image.get("url") or image.get("contentUrl") if isinstance(image, dict) else image
        if clean_url := _clean(image_url):
            candidates.append((clean_url, None, index == 0))
    og_image = _first_meta(soup, "og:image")
    if og_image:
        candidates.append((og_image, _first_meta(soup, "og:image:alt"), not candidates))
    for image in soup.select("img[itemprop='image'], .product img, .product-image img")[:20]:
        image_url = image.get("data-zoom-image") or image.get("data-src") or image.get("src")
        if clean_url := _clean(image_url):
            candidates.append((clean_url, _clean(image.get("alt")), not candidates))

    results: list[ProductImage] = []
    seen: set[str] = set()
    for image_url, alt, primary in candidates:
        absolute_url = urljoin(source_url, image_url)
        if absolute_url in seen or urlsplit(absolute_url).scheme not in {"http", "https"}:
            continue
        seen.add(absolute_url)
        results.append(
            ProductImage(
                url=absolute_url,
                source_url=source_url,
                alt=alt,
                primary_candidate=primary,
                reference_only=True,
            )
        )
    return results


def _extract_choices(
    product: dict[str, Any], soup: Tag | BeautifulSoup
) -> tuple[list[ProductVariation], list[ProductPack]]:
    variations: list[ProductVariation] = []
    packs: list[ProductPack] = []
    seen_variations: set[tuple[str, tuple[tuple[str, str], ...]]] = set()
    seen_packs: set[tuple[str, int | None]] = set()

    raw_variants = product.get("hasVariant") or []
    if isinstance(raw_variants, dict):
        raw_variants = [raw_variants]
    for variant in raw_variants if isinstance(raw_variants, list) else []:
        if not isinstance(variant, dict):
            continue
        attributes = {
            key.title(): clean_value
            for key in ("size", "color", "model")
            if (clean_value := _clean(variant.get(key)))
        }
        for prop in variant.get("additionalProperty", []) or []:
            if isinstance(prop, dict):
                name, prop_value = _clean(prop.get("name")), _clean(prop.get("value"))
                if name and prop_value:
                    attributes[name] = prop_value
        name = _clean(variant.get("name")) or " / ".join(attributes.values())
        if not name:
            continue
        offer = _choose_offer(variant.get("offers"))
        variation = ProductVariation(
            name=name,
            sku=_clean(variant.get("sku")),
            price=parse_price(offer.get("price") or offer.get("lowPrice")),
            mrp=parse_price(offer.get("highPrice")),
            attributes=attributes,
        )
        key = (variation.name.casefold(), tuple(sorted(variation.attributes.items())))
        if key not in seen_variations:
            seen_variations.add(key)
            variations.append(variation)

    for select in soup.select("select"):
        group_name = _choice_group_name(select, soup)
        group_key = group_name.casefold()
        is_pack = "pack" in group_key or "quantity" in group_key or "qty" in group_key
        is_variation = any(token in group_key for token in VARIATION_GROUPS)
        if not is_pack and not is_variation:
            continue
        for option in select.select("option"):
            label = _clean(option.get_text(" "))
            option_value = _clean(option.get("value"))
            if option.has_attr("disabled") or not label or not option_value:
                continue
            if label.casefold() in {"select", f"select {group_key}", f"choose {group_key}"}:
                continue
            if is_pack:
                quantity = _pack_quantity(label)
                key = (label.casefold(), quantity)
                if key not in seen_packs:
                    seen_packs.add(key)
                    packs.append(ProductPack(label=label, quantity=quantity))
            else:
                attributes = {group_name: label}
                key = (label.casefold(), tuple(attributes.items()))
                if key not in seen_variations:
                    seen_variations.add(key)
                    variations.append(ProductVariation(name=label, attributes=attributes))
    return variations, packs


def _choice_group_name(select: Tag, soup: Tag | BeautifulSoup) -> str:
    select_id = _clean(select.get("id"))
    if select_id:
        label = soup.select_one(f'label[for="{select_id}"]')
        if label and (label_text := _clean(label.get_text(" "))):
            return label_text.rstrip(":")
    return (_clean(select.get("name")) or _clean(select.get("aria-label")) or "Option").rstrip(":")


def _pack_quantity(label: str) -> int | None:
    match = PACK_PATTERN.search(label)
    if not match:
        return None
    quantity = int(match.group(1))
    return quantity if quantity > 0 else None


def _remove_irrelevant_content(soup: BeautifulSoup) -> None:
    selectors = (
        "script",
        "style",
        "noscript",
        "iframe",
        "svg",
        "nav",
        "footer",
        "aside",
        "[role='navigation']",
        ".cookie-banner",
        ".cookie-consent",
        ".recommendations",
        ".recommended-products",
        ".related-products",
        ".recently-viewed",
        ".advertisement",
    )
    for element in soup.select(",".join(selectors)):
        element.decompose()


def _product_root(soup: BeautifulSoup) -> Tag | BeautifulSoup:
    selectors = (
        "[itemtype$='/Product']",
        "[itemtype$='schema.org/Product']",
        "main .product-detail",
        "main .product",
        ".product-detail",
        "main",
    )
    return next((element for selector in selectors if (element := soup.select_one(selector))), soup)
