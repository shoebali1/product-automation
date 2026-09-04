import json
from collections.abc import Iterable
from typing import Any

from bs4 import BeautifulSoup


def extract_json_ld(html: str) -> list[Any]:
    soup = BeautifulSoup(html, "lxml")
    documents: list[Any] = []
    for script in soup.select('script[type="application/ld+json"]'):
        raw_value = script.string or script.get_text(strip=True)
        if not raw_value:
            continue
        cleaned = raw_value.strip().removeprefix("<!--").removesuffix("-->").strip()
        try:
            documents.append(json.loads(cleaned))
        except (json.JSONDecodeError, TypeError):
            continue
    return documents


def find_products(documents: Iterable[Any]) -> list[dict[str, Any]]:
    products: list[dict[str, Any]] = []
    for document in documents:
        for node in _walk_nodes(document):
            if _has_type(node, "Product") or _has_type(node, "ProductGroup"):
                products.append(node)
    return products


def choose_product(products: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not products:
        return None
    score_fields = ("name", "description", "image", "sku", "gtin", "brand", "offers")
    return max(
        products,
        key=lambda product: (
            10 * bool(product.get("hasVariant"))
            + 5 * _has_type(product, "ProductGroup")
            + sum(bool(product.get(field)) for field in score_fields)
        ),
    )


def _walk_nodes(value: Any):
    if isinstance(value, dict):
        yield value
        graph = value.get("@graph")
        if graph is not None:
            yield from _walk_nodes(graph)
        for key, child in value.items():
            if key != "@graph" and isinstance(child, (dict, list)):
                yield from _walk_nodes(child)
    elif isinstance(value, list):
        for item in value:
            yield from _walk_nodes(item)


def _has_type(node: dict[str, Any], expected: str) -> bool:
    node_type = node.get("@type")
    values = node_type if isinstance(node_type, list) else [node_type]
    return any(str(value).rsplit("/", 1)[-1].lower() == expected.lower() for value in values if value)
