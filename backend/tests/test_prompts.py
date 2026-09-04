from app.ai.prompts import PRODUCT_ANALYSIS_PROMPT_VERSION, PRODUCT_GENERATION_SYSTEM_PROMPT


def test_product_prompt_requires_detailed_clean_seo_description() -> None:
    prompt = PRODUCT_GENERATION_SYSTEM_PROMPT

    assert PRODUCT_ANALYSIS_PROMPT_VERSION == "PRODUCT_ANALYSIS_V6_FINAL"
    assert "400" in prompt and "500 visible words" in prompt
    assert "<h2>Benefits of [Product Name]</h2>" in prompt
    assert "<h2>How to Use [Product Type]</h2>" in prompt
    assert "<h2>Safety Information</h2>" in prompt
    assert "Do not use:" in prompt
    assert "keyword-stuff" in prompt
    assert "experienced human catalog editor" in prompt
    assert "business_meta_title and business_meta_description" in prompt
