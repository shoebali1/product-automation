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


def test_extracts_json_variants_radio_choices_and_button_packs() -> None:
    html = """
    <html><head><script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "ProductGroup",
      "name": "Acme Test Strip",
      "hasVariant": [
        {"@type": "Product", "name": "Large", "size": "Large", "sku": "L-1",
         "offers": {"price": "125", "highPrice": "150"}},
        {"@type": "Product", "name": "Pack of 5", "sku": "P-5",
         "offers": {"price": "500", "highPrice": "600"}}
      ]
    }
    </script></head><body><main class="product">
      <fieldset id="strength-options"><legend>Strength</legend>
        <input type="radio" id="strength-10" name="strength" value="10 mg"
               data-price="90" data-mrp="100" data-sku="S-10">
        <label for="strength-10">10 mg</label>
      </fieldset>
      <div class="pack-options" data-option-name="Pack Size">
        <button data-value="Pack of 1" data-price="110" data-sku="PACK-1">One</button>
        <button data-value="Box of 10" data-price="900" data-mrp="1000">Ten</button>
      </div>
    </main></body></html>
    """

    source = ProductExtractor().extract(html, "https://shop.example.com/test-strip")

    assert [item.name for item in source.variations] == ["Large", "10 mg"]
    assert source.variations[1].attributes == {"Strength": "10 mg"}
    assert source.variations[1].sku == "S-10"
    assert source.variations[1].price == Decimal("90")
    assert [item.quantity for item in source.packs] == [5, 1, 10]
    assert source.packs[0].sku == "P-5"
    assert source.packs[2].mrp == Decimal("1000")
