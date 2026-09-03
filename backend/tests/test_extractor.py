from decimal import Decimal
from pathlib import Path

from app.scraping.extractor import ProductExtractor

FIXTURE = Path(__file__).parent / "fixtures" / "product_page.html"


def test_extracts_json_ld_and_dom_product_data() -> None:
    source = ProductExtractor().extract(
        FIXTURE.read_text(encoding="utf-8"),
        "https://shop.example.com/products/widget",
    )

    assert source.product_title == "Acme Clinical Widget W-100"
    assert source.brand == "Acme"
    assert source.manufacturer == "Acme Medical"
    assert source.sku == "W-100-12"
    assert source.gtin == "1234567890123"
    assert source.pricing.sale_price == Decimal("1249.50")
    assert source.pricing.mrp == Decimal("1499.00")
    assert source.pricing.currency == "INR"
    assert source.specifications == {
        "Material": "Medical grade silicone",
        "Pack Quantity": "1 unit",
        "Sterility": "Sterile",
    }
    assert "Support" not in source.specifications
    assert source.features == ["Single-use configuration", "Transparent body"]
    assert source.how_to_use == ["Follow the supplied product instructions."]
    assert source.precautions == ["Use only when the package is intact."]
    assert len(source.images) == 2
    assert all(image.reference_only for image in source.images)
    assert str(source.images[0].url) == "https://shop.example.com/images/widget-main.jpg"
    assert [variation.name for variation in source.variations] == ["12 FG", "14 FG"]
    assert [pack.quantity for pack in source.packs] == [1, 10]
