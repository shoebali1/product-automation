from decimal import Decimal

from app.schemas.generated_product import GeneratedProductData
from app.services.surginatal import (
    enrich_with_surginatal,
    match_brand,
    match_category_and_subcategory,
)

SAMPLE_TAXONOMY = {
    "category_data": [
        {
            "id": 50,
            "name": "Airway Management",
            "slug": "airway-management",
            "subcategories": [
                {
                    "id": 216,
                    "name": "Airway Adjuncts",
                    "slug": "airway-adjuncts",
                },
                {
                    "id": 218,
                    "name": "Endotracheal Tubes (ETT)",
                    "slug": "endotracheal-tubes-ett",
                },
            ],
        },
        {
            "id": 52,
            "name": "Catheters & Drainage",
            "slug": "catheters-drainage",
            "subcategories": [
                {
                    "id": 231,
                    "name": "Foley Catheters",
                    "slug": "foley-catheters",
                },
                {
                    "id": 234,
                    "name": "Urine Collection Bags & Urometers",
                    "slug": "urine-collection-bags-urometers",
                },
            ],
        },
    ],
    "brand_data": [
        {"id": 1, "name": "3M", "slug": "3m"},
        {"id": 49, "name": "Romsons", "slug": "romsons"},
        {"id": 105, "name": "B. Braun", "slug": "b-braun"},
    ],
}


def test_match_brand_exact() -> None:
    name, brand_id = match_brand("Romsons", SAMPLE_TAXONOMY)
    assert name == "Romsons"
    assert brand_id == 49


def test_match_brand_token_containment() -> None:
    name, brand_id = match_brand("Romsons Scientific & Surgical", SAMPLE_TAXONOMY)
    assert name == "Romsons"
    assert brand_id == 49


def test_match_brand_unknown() -> None:
    name, brand_id = match_brand("Unknown Brand Corp", SAMPLE_TAXONOMY)
    assert name == "Unknown Brand Corp"
    assert brand_id is None


def test_match_category_and_subcategory_direct() -> None:
    cat, cat_id, sub, sub_id = match_category_and_subcategory(
        "Catheters & Drainage",
        "Foley Catheters",
        taxonomy=SAMPLE_TAXONOMY,
    )
    assert cat == "Catheters & Drainage"
    assert cat_id == 52
    assert sub == "Foley Catheters"
    assert sub_id == 231


def test_match_category_by_product_title_fallback() -> None:
    cat, cat_id, sub, sub_id = match_category_and_subcategory(
        candidate_category=None,
        candidate_subcategory=None,
        product_title="Romsons 2L Uro Urine Collection Bags & Urometers",
        taxonomy=SAMPLE_TAXONOMY,
    )
    assert cat == "Catheters & Drainage"
    assert cat_id == 52
    assert sub == "Urine Collection Bags & Urometers"
    assert sub_id == 234


def test_enrich_with_surginatal() -> None:
    product = GeneratedProductData(
        product_title="Romsons 2L Uro Urine Bag",
        slug="romsons-2l-uro-urine-bag",
        business_product_title="Romsons 2L Uro Urine Bag",
        brand="Romsons Surgical",
        category="Catheters",
        subcategory="Urine Collection Bags",
        overall_confidence=Decimal("0.9"),
    )
    enriched = enrich_with_surginatal(product, SAMPLE_TAXONOMY)
    assert enriched.brand == "Romsons"
    assert enriched.brand_id == 49
    assert enriched.category == "Catheters & Drainage"
    assert enriched.category_id == 52
    assert enriched.subcategory == "Urine Collection Bags & Urometers"
    assert enriched.subcategory_id == 234
