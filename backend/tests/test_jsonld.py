from app.scraping.jsonld import choose_product, extract_json_ld, find_products


def test_finds_product_inside_graph_and_ignores_invalid_script() -> None:
    html = """
    <script type="application/ld+json">not-json</script>
    <script type="application/ld+json">
      {"@graph": [{"@type": "Organization"}, {"@type": "Product", "name": "Widget"}]}
    </script>
    """
    documents = extract_json_ld(html)
    product = choose_product(find_products(documents))
    assert len(documents) == 1
    assert product is not None
    assert product["name"] == "Widget"


def test_choose_product_prefers_more_complete_record() -> None:
    products = [
        {"@type": "Product", "name": "Sparse"},
        {"@type": "Product", "name": "Complete", "sku": "SKU-1", "offers": {"price": 1}},
    ]
    assert choose_product(products) == products[1]

