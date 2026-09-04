import json
import logging
import re
import unicodedata
from dataclasses import dataclass
from decimal import Decimal
from html.parser import HTMLParser
from typing import Any

import httpx
from pydantic import ValidationError

from app.ai.prompts import PRODUCT_ANALYSIS_PROMPT_VERSION, PRODUCT_GENERATION_SYSTEM_PROMPT
from app.ai.validator import factual_support_errors
from app.core.config import settings
from app.products.comparison import ResearchComparison
from app.schemas.common import ProductImage, ProductPack, ProductVariation
from app.schemas.generated_product import GeneratedProductData, Highlight
from app.schemas.product_source import NormalizedProductSource

logger = logging.getLogger(__name__)


class ProductGenerationError(RuntimeError):
    pass


AGENTROUTER_GENERATION_TIMEOUT_SECONDS = 120.0
DEFAULT_GENERATION_TIMEOUT_SECONDS = 45.0
MAX_GENERATION_ATTEMPTS = 3


@dataclass(frozen=True, slots=True)
class GenerationUsage:
    input_tokens: int | None = None
    output_tokens: int | None = None


@dataclass(frozen=True, slots=True)
class GenerationResult:
    product: GeneratedProductData
    usage: GenerationUsage
    model: str
    prompt_version: str = PRODUCT_ANALYSIS_PROMPT_VERSION
    input_cost_per_million: Decimal | None = None
    output_cost_per_million: Decimal | None = None


class OpenAIProductGenerator:
    def __init__(self, *, client: Any | None = None, model: str | None = None) -> None:
        if client is None:
            if settings.openai_api_key is None:
                raise ProductGenerationError("OPENAI_API_KEY is not configured")
            from openai import OpenAI

            client = OpenAI(
                api_key=settings.openai_api_key.get_secret_value(),
                http_client=httpx.Client(timeout=30.0, follow_redirects=True),
                max_retries=2,
            )
        self.client = client
        self.model = model or settings.openai_model

    def generate(
        self,
        sources: list[NormalizedProductSource],
        comparison: ResearchComparison,
    ) -> GenerationResult:
        if not sources:
            raise ProductGenerationError("At least one normalized source is required")
        research_json = _research_json(sources, comparison)
        validation_feedback: list[str] = []
        previous_draft: str | None = None
        total_input_tokens = 0
        total_output_tokens = 0

        for attempt in range(MAX_GENERATION_ATTEMPTS):
            user_content = research_json
            if validation_feedback:
                user_content += "\n\nVALIDATION ERRORS FROM THE PREVIOUS ATTEMPT:\n- " + "\n- ".join(
                    validation_feedback
                )
                if previous_draft:
                    user_content += "\n\nPREVIOUS DRAFT TO REPAIR:\n" + previous_draft
                user_content += (
                    "\nCorrect every listed error in the previous draft without introducing new facts. "
                    "Recount visible words and metadata characters before returning the complete product."
                )
            try:
                response = self.client.responses.parse(
                    model=self.model,
                    reasoning={"effort": "medium"},
                    store=False,
                    input=[
                        {"role": "system", "content": PRODUCT_GENERATION_SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                    ],
                    text_format=GeneratedProductData,
                )
                usage = getattr(response, "usage", None)
                total_input_tokens += int(getattr(usage, "input_tokens", 0) or 0)
                total_output_tokens += int(getattr(usage, "output_tokens", 0) or 0)
                parsed = getattr(response, "output_parsed", None)
                if parsed is None:
                    raise ProductGenerationError("Model returned no parsed product output")
                product = (
                    parsed
                    if isinstance(parsed, GeneratedProductData)
                    else GeneratedProductData.model_validate(parsed)
                )
                product = _normalize_recoverable_draft(product)
                previous_draft = json.dumps(product.model_dump(mode="json"), ensure_ascii=False)
                verified_product = _inject_verified_research(product, sources, comparison)
                validation_feedback = _draft_quality_errors(
                    verified_product, sources
                ) + factual_support_errors(
                    verified_product, sources
                )
                if not validation_feedback:
                    return GenerationResult(
                        product=verified_product,
                        usage=GenerationUsage(total_input_tokens, total_output_tokens),
                        model=self.model,
                    )
            except ValidationError as exc:
                validation_feedback = [str(exc)]
            except ProductGenerationError as exc:
                validation_feedback = [str(exc)]

            if attempt == MAX_GENERATION_ATTEMPTS - 1:
                break
        raise ProductGenerationError(
            "Generated product failed validation after two repair attempts: "
            + "; ".join(validation_feedback)
        )


@dataclass(frozen=True, slots=True)
class CompatibleModelRoute:
    provider_name: str
    model_id: str
    client: Any
    supports_json_schema: bool
    max_tokens: int
    temperature: float
    input_cost_per_million: Decimal | None = None
    output_cost_per_million: Decimal | None = None


class CompatibleProductGenerator:
    """Product generator for OpenAI-compatible Chat Completions providers."""

    def __init__(self, route: CompatibleModelRoute) -> None:
        self.route = route
        self.model = f"{route.provider_name}:{route.model_id}"

    def generate(
        self,
        sources: list[NormalizedProductSource],
        comparison: ResearchComparison,
    ) -> GenerationResult:
        if not sources:
            raise ProductGenerationError("At least one normalized source is required")
        research_json = _research_json(sources, comparison)
        feedback: list[str] = []
        previous_draft: str | None = None
        input_tokens = 0
        output_tokens = 0
        schema = GeneratedProductData.model_json_schema()

        for attempt in range(MAX_GENERATION_ATTEMPTS):
            user_content = research_json
            if not self.route.supports_json_schema:
                user_content += (
                    "\n\nREQUIRED OUTPUT JSON SCHEMA (match these fields and types):\n"
                    + json.dumps(schema, ensure_ascii=False, separators=(",", ":"))
                )
            if feedback:
                user_content += "\n\nVALIDATION ERRORS FROM THE PREVIOUS ATTEMPT:\n- " + "\n- ".join(feedback)
                if previous_draft:
                    user_content += "\n\nPREVIOUS DRAFT TO REPAIR:\n" + previous_draft
                user_content += (
                    "\nReturn the complete corrected JSON. Fix every listed error without introducing "
                    "new facts, and recount visible words and metadata characters before responding."
                )
            response_format = (
                {"type": "json_schema", "json_schema": {"name": "generated_product", "strict": True, "schema": schema}}
                if self.route.supports_json_schema else {"type": "json_object"}
            )
            response = self.route.client.chat.completions.create(
                model=self.route.model_id,
                messages=[
                    {"role": "system", "content": PRODUCT_GENERATION_SYSTEM_PROMPT + "\nReturn only a JSON object."},
                    {"role": "user", "content": user_content},
                ],
                response_format=response_format,
                max_tokens=self.route.max_tokens,
                temperature=self.route.temperature,
            )
            usage = getattr(response, "usage", None)
            input_tokens += int(getattr(usage, "prompt_tokens", 0) or 0)
            output_tokens += int(getattr(usage, "completion_tokens", 0) or 0)
            content = response.choices[0].message.content
            try:
                product = _parse_generated_product(
                    content,
                    fallback_title=_fallback_product_title(sources),
                )
                product = _normalize_recoverable_draft(product)
                previous_draft = json.dumps(product.model_dump(mode="json"), ensure_ascii=False)
            except (json.JSONDecodeError, TypeError, ValidationError) as exc:
                feedback = [str(exc)]
            else:
                verified_product = _inject_verified_research(product, sources, comparison)
                feedback = _draft_quality_errors(verified_product, sources) + factual_support_errors(
                    verified_product, sources
                )
                if not feedback:
                    return GenerationResult(
                        product=verified_product,
                        usage=GenerationUsage(input_tokens, output_tokens),
                        model=self.model,
                        input_cost_per_million=self.route.input_cost_per_million,
                        output_cost_per_million=self.route.output_cost_per_million,
                    )
            if attempt == MAX_GENERATION_ATTEMPTS - 1:
                break
        raise ProductGenerationError(
            "Generated product failed validation after two repair attempts: " + "; ".join(feedback)
        )


class DatabaseRoutingProductGenerator:
    def __init__(self, routes: list[CompatibleModelRoute]) -> None:
        if not routes:
            raise ProductGenerationError(
                "No enabled AI model with a configured API key is available. Configure one in AI Providers."
            )
        self.routes = routes
        self.model = f"{routes[0].provider_name}:{routes[0].model_id}"

    @classmethod
    def from_session(cls, session) -> "DatabaseRoutingProductGenerator":
        from app.services.ai_providers import client_for_provider, enabled_ai_models

        routes = [
            CompatibleModelRoute(
                provider_name=model.provider.slug,
                model_id=model.model_id,
                client=client_for_provider(
                    model.provider,
                    timeout_seconds=(
                        AGENTROUTER_GENERATION_TIMEOUT_SECONDS
                        if model.provider.slug == "agentrouter"
                        else DEFAULT_GENERATION_TIMEOUT_SECONDS
                    ),
                    # Routing already falls back to the next enabled model. SDK-level
                    # retries make a slow thinking model look stuck and can duplicate cost.
                    max_retries=0,
                ),
                supports_json_schema=model.supports_json_schema,
                max_tokens=model.max_tokens,
                temperature=float(model.temperature),
                input_cost_per_million=model.input_cost_per_million,
                output_cost_per_million=model.output_cost_per_million,
            )
            for model in enabled_ai_models(session)
        ]
        return cls(routes)

    def generate(self, sources, comparison) -> GenerationResult:
        failures: list[str] = []
        for position, route in enumerate(self.routes, start=1):
            route_name = f"{route.provider_name}:{route.model_id}"
            logger.info(
                "Starting AI generation route %s (%s/%s)",
                route_name,
                position,
                len(self.routes),
            )
            try:
                result = CompatibleProductGenerator(route).generate(sources, comparison)
                logger.info("AI generation route %s completed successfully", route_name)
                return result
            except Exception as exc:
                safe_error = _safe_route_error(exc)
                failures.append(f"{route_name} ({safe_error})")
                logger.warning("AI generation route %s failed: %s", route_name, safe_error)
        raise ProductGenerationError("All enabled AI models failed: " + "; ".join(failures))


def _clean_json(content: str | None) -> str:
    if not content:
        raise ProductGenerationError("Model returned an empty response")
    clean = content.strip()
    if clean.startswith("```"):
        clean = clean.removeprefix("```json").removeprefix("```")
        clean = clean.removesuffix("```").strip()
    return clean


def _parse_generated_product(
    content: str | None,
    *,
    fallback_title: str = "",
) -> GeneratedProductData:
    payload = json.loads(_clean_json(content))
    if not isinstance(payload, dict):
        raise TypeError("Model response must be a JSON object")

    # Some OpenAI-compatible providers wrap structured output despite receiving a
    # response schema. Accept their common wrappers without weakening our schema.
    for _ in range(3):
        wrapped = next(
            (
                payload[wrapper]
                for wrapper in ("product", "generated_product", "data")
                if isinstance(payload.get(wrapper), dict)
            ),
            None,
        )
        if wrapped is None:
            break
        payload = wrapped

    payload = _normalize_model_payload(payload, fallback_title=fallback_title)

    # Confidence is calculated from source agreement in _inject_verified_research;
    # never trust or require a model's symbolic/numeric confidence assessment.
    payload["overall_confidence"] = 0
    return GeneratedProductData.model_validate(payload)


def _normalize_model_payload(
    payload: dict[str, Any],
    *,
    fallback_title: str = "",
) -> dict[str, Any]:
    normalized = dict(payload)
    title = normalized.get("product_title") or normalized.get("title") or fallback_title
    normalized["product_title"] = title
    normalized.setdefault("business_product_title", title)
    normalized.setdefault("slug", _slugify(str(title)))

    if not normalized.get("highlights") and isinstance(normalized.get("features"), list):
        normalized["highlights"] = [
            {"name": f"Feature {index}", "value": str(value)}
            for index, value in enumerate(normalized["features"], start=1)
            if value
        ]

    if isinstance(normalized.get("specifications"), dict):
        normalized["specifications"] = {
            str(key).strip(): str(value).strip()
            for key, value in normalized["specifications"].items()
            if str(key).strip() and value is not None and str(value).strip()
        }

    seo = normalized.get("seo")
    if isinstance(seo, dict):
        seo = dict(seo)
        seo["meta_title"] = seo.get("meta_title") or seo.get("title") or ""
        seo["meta_keywords"] = seo.get("meta_keywords") or seo.get("keywords") or []
        seo.setdefault("meta_description", "")
        seo.setdefault("business_meta_title", seo["meta_title"])
        seo.setdefault("business_meta_description", seo["meta_description"])
        seo["canonical_link"] = None
        seo["business_canonical_link"] = None
        allowed_seo = GeneratedProductData.model_fields["seo"].annotation.model_fields
        normalized["seo"] = {key: value for key, value in seo.items() if key in allowed_seo}

    normalized["packs"] = [
        _normalize_pack(item) for item in normalized.get("packs", []) if isinstance(item, dict)
    ]
    normalized["variations"] = [
        _normalize_variation(item)
        for item in normalized.get("variations", [])
        if isinstance(item, dict)
    ]
    normalized.setdefault("is_active", True)
    normalized.setdefault("is_in_stock", True)
    normalized.setdefault("is_fast_delivery", True)
    normalized.setdefault("is_cod_available", True)
    normalized.setdefault("customisation_available", False)
    normalized.setdefault("is_prescription_required", False)
    normalized.setdefault("is_returnble", True)
    normalized.setdefault("is_liquid", False)
    normalized.setdefault("quantity", 1)
    normalized.setdefault("step_up_quantity", 1)
    normalized.setdefault("pieces", 1)
    normalized.setdefault("in_stock_quantity", 100)
    normalized.setdefault("sales_count", 0)

    # These records are injected from deterministic comparison after validation.
    normalized["source_evidence"] = {}
    normalized["conflicts"] = []
    allowed = GeneratedProductData.model_fields
    return {key: value for key, value in normalized.items() if key in allowed}


def _normalize_recoverable_draft(product: GeneratedProductData) -> GeneratedProductData:
    """Correct harmless boundary misses without changing product facts."""
    meta_description = product.seo.meta_description.strip()
    if 135 <= len(meta_description) < 140:
        meta_description = meta_description.rstrip(" .!?") + ". View details."

    if meta_description == product.seo.meta_description:
        return product
    return product.model_copy(
        update={
            "seo": product.seo.model_copy(update={"meta_description": meta_description})
        }
    )


def _normalize_pack(item: dict[str, Any]) -> dict[str, Any]:
    pack = dict(item)
    pack["label"] = pack.get("label") or pack.get("pack_size") or pack.get("name") or ""
    allowed = {"label", "quantity", "price", "mrp", "sku"}
    return {key: value for key, value in pack.items() if key in allowed}


def _normalize_variation(item: dict[str, Any]) -> dict[str, Any]:
    variation = dict(item)
    variation["name"] = variation.get("name") or variation.get("variation_name") or ""
    variation.setdefault("attributes", {})
    allowed = {"name", "price", "mrp", "sku", "attributes"}
    return {key: value for key, value in variation.items() if key in allowed}


def _slugify(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value.casefold()).strip("-")
    return slug or "generated-product"


def _fallback_product_title(sources: list[NormalizedProductSource]) -> str:
    titles = [source.product_title.strip() for source in sources if source.product_title]
    return min(titles, key=len) if titles else ""


def _draft_quality_errors(
    product: GeneratedProductData,
    sources: list[NormalizedProductSource] | None = None,
) -> list[str]:
    errors = []
    if not product.product_title.strip():
        errors.append("product_title must not be empty")
    if not any(
        (
            product.short_description.strip(),
            product.description.strip(),
            product.highlights,
            product.specifications,
        )
    ):
        errors.append("draft must contain descriptive product content")
    rich_evidence = _has_rich_content_evidence(sources or [])

    short_words = _visible_word_count(product.short_description)
    if short_words > 120:
        errors.append(f"short_description must not exceed 120 words; received {short_words}")
    elif rich_evidence and short_words < 80:
        errors.append(
            f"short_description must contain 80-120 words for the supplied evidence; received {short_words}"
        )

    description_words = _visible_word_count(product.description)
    if description_words > 500:
        errors.append(f"description must not exceed 500 visible words; received {description_words}")
    elif rich_evidence and description_words < 400:
        missing_words = 400 - description_words
        errors.append(
            "description must contain 400-500 visible words for the supplied evidence; "
            f"received {description_words}. Add at least {missing_words} useful, evidence-backed "
            "visible words while keeping the total at or below 500"
        )
    if product.description:
        tags = {tag.casefold() for tag in re.findall(r"</?\s*([a-zA-Z][a-zA-Z0-9]*)", product.description)}
        unsupported_tags = sorted(tags - {"h2", "h3", "p", "ul", "ol", "li", "strong"})
        if unsupported_tags:
            errors.append(
                "description contains unsupported HTML tags: " + ", ".join(unsupported_tags)
            )
        if re.search(r"(?m)^\s{0,3}#{1,6}\s", product.description):
            errors.append("description must use semantic HTML headings, not Markdown headings")
        html_validator = _CatalogHTMLValidator()
        html_validator.feed(product.description)
        html_validator.close()
        if html_validator.invalid:
            errors.append("description must contain valid, properly nested, attribute-free HTML")
        if rich_evidence:
            lowered_description = product.description.casefold()
            if "<h2" not in lowered_description:
                errors.append("description must use semantic HTML section headings")
            for required_section in ("benefits", "how to use", "safety information"):
                if required_section not in lowered_description:
                    errors.append(f"description is missing the {required_section!r} section")

    highlight_count = len(product.highlights)
    if highlight_count > 12:
        errors.append(f"highlights must contain no more than 12 items; received {highlight_count}")
    elif rich_evidence and highlight_count < 8:
        errors.append(
            f"highlights must contain 8-12 evidence-backed items; received {highlight_count}"
        )

    meta_title_length = len(product.seo.meta_title.strip())
    if not 50 <= meta_title_length <= 60:
        errors.append(
            f"seo.meta_title must contain 50-60 characters; received {meta_title_length}"
        )
    meta_description_length = len(product.seo.meta_description.strip())
    if not 140 <= meta_description_length <= 160:
        errors.append(
            "seo.meta_description must contain 140-160 characters; "
            f"received {meta_description_length}"
        )

    keywords = [keyword.strip() for keyword in product.seo.meta_keywords if keyword.strip()]
    if not 8 <= len(keywords) <= 15:
        errors.append(f"seo.meta_keywords must contain 8-15 items; received {len(keywords)}")
    if len({keyword.casefold() for keyword in keywords}) != len(keywords):
        errors.append("seo.meta_keywords must not contain duplicate terms")
    if not product.seo.business_meta_title.strip():
        errors.append("seo.business_meta_title must not be empty")
    elif product.seo.business_meta_title.strip() == product.seo.meta_title.strip():
        errors.append("seo.business_meta_title must be distinct from seo.meta_title")
    if not product.seo.business_meta_description.strip():
        errors.append("seo.business_meta_description must not be empty")
    elif product.seo.business_meta_description.strip() == product.seo.meta_description.strip():
        errors.append(
            "seo.business_meta_description must be distinct from seo.meta_description"
        )
    return errors


class _CatalogHTMLValidator(HTMLParser):
    allowed_tags = {"h2", "h3", "p", "ul", "ol", "li", "strong"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.invalid = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        normalized = tag.casefold()
        if normalized not in self.allowed_tags or attrs:
            self.invalid = True
        self.stack.append(normalized)

    def handle_endtag(self, tag: str) -> None:
        normalized = tag.casefold()
        if not self.stack or self.stack[-1] != normalized:
            self.invalid = True
            return
        self.stack.pop()

    def close(self) -> None:
        super().close()
        if self.stack:
            self.invalid = True


def _visible_word_count(value: str) -> int:
    visible_text = re.sub(r"<[^>]*>", " ", value or "")
    return len(re.findall(r"\b[\w]+(?:[-'][\w]+)*\b", visible_text, flags=re.UNICODE))


def _has_rich_content_evidence(sources: list[NormalizedProductSource]) -> bool:
    facts: set[str] = set()
    description_words = 0
    for source in sources:
        description_words += _visible_word_count(source.description or "")
        for item in (
            *source.features,
            *source.benefits,
            *source.how_to_use,
            *source.precautions,
        ):
            if item.strip():
                facts.add(item.strip().casefold())
        for name, value in source.specifications.items():
            facts.add(f"{name.strip().casefold()}:{value.strip().casefold()}")
        for item in source.variations:
            facts.add(f"variation:{item.name.strip().casefold()}")
        for item in source.packs:
            facts.add(f"pack:{item.label.strip().casefold()}")
    evidence_score = len(facts) + min(description_words // 30, 10)
    return evidence_score >= 10


def _safe_route_error(error: Exception) -> str:
    if isinstance(error, (ProductGenerationError, ValidationError, ValueError)):
        return (str(error) or error.__class__.__name__)[:300]
    return error.__class__.__name__


def _research_json(
    sources: list[NormalizedProductSource], comparison: ResearchComparison
) -> str:
    source_payloads = []
    for index, source in enumerate(sources, start=1):
        payload = source.model_dump(mode="json")
        payload.pop("raw_json_ld", None)
        source_payloads.append({"source_number": index, "data": payload})

    surginatal_ref: dict[str, Any] = {}
    try:
        from app.services.surginatal import fetch_surginatal_taxonomy

        taxonomy = fetch_surginatal_taxonomy()
        if taxonomy:
            surginatal_ref = {
                "categories": [
                    {
                        "id": c.get("id"),
                        "name": c.get("name"),
                        "subcategories": [
                            {"id": sc.get("id"), "name": sc.get("name")}
                            for sc in c.get("subcategories", [])
                        ],
                    }
                    for c in taxonomy.get("category_data", [])
                ],
                "brands": [
                    {"id": b.get("id"), "name": b.get("name")}
                    for b in taxonomy.get("brand_data", [])
                ],
            }
    except Exception as exc:
        logger.debug("Could not attach Surginatal taxonomy reference to prompt: %s", exc)

    payload = {
        "normalized_sources": source_payloads,
        "comparison": comparison.model_dump(mode="json"),
    }
    if surginatal_ref:
        payload["surginatal_master_taxonomy"] = surginatal_ref

    return "PRODUCT RESEARCH EVIDENCE\n" + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def _inject_verified_research(
    product: GeneratedProductData,
    sources: list[NormalizedProductSource],
    comparison: ResearchComparison,
) -> GeneratedProductData:
    evidence = {
        field_path: field.model_dump(mode="json")
        for field_path, field in comparison.evidence.items()
    }
    warnings = list(product.warnings)
    if len(sources) < 3:
        warnings.append(
            f"Only {len(sources)} successful source{'s were' if len(sources) != 1 else ' was'} available."
        )

    confidence_scores = [
        field.confidence_score
        for field in comparison.evidence.values()
    ]
    overall_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
    source_quantity_cap = 0.4 if len(sources) == 1 else 0.7 if len(sources) == 2 else 1.0
    overall_confidence = min(overall_confidence, source_quantity_cap)
    seo = product.seo.model_copy(
        update={"canonical_link": None, "business_canonical_link": None}
    )

    verified_scalars = {}
    for field_name in (
        "product_title",
        "brand",
        "manufacturer",
        "generic_name",
        "product_code",
        "sku",
        "gtin",
        "category",
    ):
        field = comparison.evidence.get(field_name)
        if field is not None:
            if field.selected_value is not None:
                verified_scalars[field_name] = field.selected_value
            elif field_name != "product_title":
                ai_val = getattr(product, field_name)
                if ai_val is not None:
                    verified_scalars[field_name] = ai_val

    verified_specifications = dict(product.specifications)
    for field_path, field in comparison.evidence.items():
        if field_path.startswith("specifications.") and field.selected_value is not None:
            verified_specifications[field_path.removeprefix("specifications.")] = str(field.selected_value)

    verified_pricing = {}
    for field_path, field in comparison.evidence.items():
        if field_path.startswith("pricing.") and field.selected_value is not None:
            verified_pricing[field_path.removeprefix("pricing.")] = field.selected_value
    pricing = product.pricing.model_copy(update=verified_pricing)
    highlights = _merge_verified_highlights(product, sources, verified_specifications)
    variations = _merge_verified_variations(product, sources)
    packs = _merge_verified_packs(product, sources)
    images = _complete_image_metadata(product)

    resolved_conflicts = []
    for conflict in comparison.conflicts:
        c_dict = conflict.model_dump(mode="json")
        c_dict["status"] = "RESOLVED"
        c_dict["requires_review"] = False
        c_dict["resolution"] = {
            "action": "ai_resolve",
            "note": "Resolved by AI model based on multi-source evidence",
        }
        resolved_conflicts.append(c_dict)

    updated_product = product.model_copy(
        update={
            **verified_scalars,
            "specifications": verified_specifications,
            "pricing": pricing,
            "highlights": highlights,
            "variations": variations,
            "packs": packs,
            "images": images,
            "seo": seo,
            "source_evidence": evidence,
            "conflicts": resolved_conflicts,
            "warnings": sorted(set(warnings)),
            "overall_confidence": Decimal(str(round(overall_confidence, 4))),
        }
    )

    from app.services.surginatal import enrich_with_surginatal

    return enrich_with_surginatal(updated_product)


def _complete_image_metadata(product: GeneratedProductData) -> list[ProductImage]:
    title = product.product_title.strip() or product.business_product_title.strip() or "Product"
    completed = []
    for index, image in enumerate(product.images):
        primary = bool(image.primary_candidate)
        fallback_title = (
            f"{title} - Primary Image" if primary else f"{title} - Image {index + 1}"
        )
        fallback_alt = (
            f"{title} primary product image"
            if primary
            else f"{title} alternate product image {index + 1}"
        )
        completed.append(
            image.model_copy(
                update={
                    "title": image.title.strip() if image.title else fallback_title,
                    "alt": image.alt.strip() if image.alt else fallback_alt,
                }
            )
        )
    return completed


def _merge_verified_highlights(
    product: GeneratedProductData,
    sources: list[NormalizedProductSource],
    verified_specifications: dict[str, str],
) -> list[Highlight]:
    """Add useful scraped features/specifications without replacing AI-written highlights."""
    highlights = list(product.highlights)
    seen_values = {_normalized_choice_text(item.value) for item in highlights}

    candidates: list[tuple[str, str]] = []
    for source in sources:
        candidates.extend(("Key Feature", feature) for feature in source.features)
    candidates.extend(verified_specifications.items())

    for name, value in candidates:
        clean_name, clean_value = str(name).strip(), str(value).strip()
        value_key = _normalized_choice_text(clean_value)
        if not clean_name or not clean_value or value_key in seen_values:
            continue
        highlights.append(Highlight(name=clean_name, value=clean_value))
        seen_values.add(value_key)
        if len(highlights) >= 12:
            break
    return highlights


def _merge_verified_variations(
    product: GeneratedProductData,
    sources: list[NormalizedProductSource],
) -> list[ProductVariation]:
    variations = list(product.variations)
    positions = {_variation_key(item): index for index, item in enumerate(variations)}
    for source in sources:
        for item in source.variations:
            key = _variation_key(item)
            if key not in positions:
                positions[key] = len(variations)
                variations.append(item)
                continue
            index = positions[key]
            current = variations[index]
            variations[index] = current.model_copy(
                update={
                    "price": current.price if current.price is not None else item.price,
                    "mrp": current.mrp if current.mrp is not None else item.mrp,
                    "sku": current.sku or item.sku,
                    "attributes": {**item.attributes, **current.attributes},
                }
            )
    return variations


def _merge_verified_packs(
    product: GeneratedProductData,
    sources: list[NormalizedProductSource],
) -> list[ProductPack]:
    packs = list(product.packs)
    positions = {_pack_key(item): index for index, item in enumerate(packs)}
    for source in sources:
        for item in source.packs:
            key = _pack_key(item)
            if key not in positions:
                positions[key] = len(packs)
                packs.append(item)
                continue
            index = positions[key]
            current = packs[index]
            packs[index] = current.model_copy(
                update={
                    "quantity": current.quantity or item.quantity,
                    "price": current.price if current.price is not None else item.price,
                    "mrp": current.mrp if current.mrp is not None else item.mrp,
                    "sku": current.sku or item.sku,
                }
            )
    return packs


def _variation_key(item: ProductVariation) -> tuple[str, tuple[tuple[str, str], ...]]:
    attributes = tuple(
        sorted(
            (_normalized_choice_text(key), _normalized_choice_text(value))
            for key, value in item.attributes.items()
        )
    )
    return _normalized_choice_text(item.name), attributes


def _pack_key(item: ProductPack) -> tuple[str, int | None]:
    return _normalized_choice_text(item.label), item.quantity


def _normalized_choice_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value)).strip().casefold()
