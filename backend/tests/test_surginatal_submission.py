from decimal import Decimal

from app.schemas.common import Pricing, ProductImage
from app.schemas.generated_product import GeneratedProductData, Highlight, SEOData
from app.services.surginatal_submission import _form_fields


def test_maps_generated_product_to_surginatal_add_payload() -> None:
    product = GeneratedProductData(
        product_title="Example Product",
        business_product_title="Example Business Product",
        slug="example-product",
        surginatal_product_id=18441,
        brand_id=84,
        category_id=51,
        subcategory_id=224,
        sku="SKU-21",
        gtin="8901234567890",
        rack_id="QW",
        quantity=12,
        step_up_quantity=2,
        pieces=21,
        in_stock_quantity=20,
        sales_count=0,
        is_active=True,
        is_in_stock=True,
        is_fast_delivery=True,
        is_cod_available=True,
        customisation_available=True,
        is_prescription_required=True,
        is_returnble=True,
        is_liquid=True,
        highlights=[Highlight(name="Material", value="Soft fabric")],
        description="<p>Full description</p>",
        images=[
            ProductImage(
                url="https://example.com/image.jpg",
                title="Image title",
                alt="Image alt",
            )
        ],
        pricing=Pricing(
            mrp=Decimal("12"),
            sale_price=Decimal("2112"),
            gst=Decimal("15"),
            currency="INR",
        ),
        seo=SEOData(
            meta_title="Meta title",
            meta_keywords=["first", "second"],
            meta_description="Meta description",
            canonical_link="https://example.com/example-product",
            business_meta_title="Business meta title",
            business_meta_description="Business meta description",
            business_canonical_link="https://business.example.com/example-product",
        ),
        related_products="10, 20; invalid",
        overall_confidence=Decimal("0.9"),
    )

    fields = _form_fields(product, existing_product_id=product.surginatal_product_id)

    assert fields["product_id"] == "18441"
    assert fields["name"] == "Example Product"
    assert fields["business_name"] == "Example Business Product"
    assert fields["mrp"] == "12"
    assert fields["price"] == "2112"
    assert fields["brand"] == "84"
    assert fields["category"] == ["51"]
    assert fields["subcategory"] == ["224"]
    assert fields["related_products"] == ["10", "20"]
    assert fields["meta_keyword"] == "first, second"
    assert fields["customisation_available"] == "true"
    assert fields["action"] == "publish_product"
    assert fields["short_description"] == (
        "<ul><li><strong>Material:</strong> Soft fabric</li></ul>"
    )
