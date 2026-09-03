# Product Research & Content Automation Architecture

## 1. System shape

The application is a modular monolith with independently testable service boundaries:

- **React admin** submits URLs, polls job state, and provides draft review/conflict resolution.
- **FastAPI API** validates commands, exposes job/draft resources, and never waits for scraping or AI work.
- **Celery workers** run source scraping and product generation in the background.
- **MySQL** is the source of truth for jobs, source records, evidence, conflicts, drafts, and AI audit logs.
- **Redis** is the Celery broker/result backend and supports short-lived URL cache/rate-limit coordination.
- **Scraping services** fetch and extract facts without product-writing or persistence concerns.
- **Research services** normalize, compare, score evidence, and identify conflicts deterministically.
- **AI services** receive only normalized research and produce schema-constrained draft content.
- **Product services** validate, persist, review, approve, and publish drafts through a replaceable publisher adapter.

The first release uses polling. The API resource model permits SSE to be added later without changing jobs.

## 2. Data flow

1. `POST /api/v1/product-research/jobs` accepts 1-10 HTTP(S) URLs.
2. URLs are normalized, tracking parameters removed, duplicates discarded, and SSRF checks performed.
3. A job and one source row per unique URL are committed, then a Celery workflow is queued.
4. Sources are scraped concurrently with domain-aware throttling. Each source fails independently.
5. Raw extraction and a normalized source snapshot are stored separately.
6. Deterministic comparison produces field evidence and unresolved conflicts.
7. A generation command is allowed with at least one valid source and warns below three sources.
8. The LLM receives normalized sources, evidence, and conflicts—not full HTML—and returns strict JSON.
9. Pydantic validates output; unsupported facts and medical claims are rejected or flagged. One repair attempt is allowed.
10. The final record is stored as `DRAFT` or `REVIEW_REQUIRED` and shown in the admin review UI.
11. Human edits and conflict decisions are persisted before approval.
12. Publishing calls a configurable product-platform adapter; no external product is created before approval.

## 3. Repository structure

```text
backend/
  alembic/
  app/
    api/v1/
    ai/
    core/
    db/
    models/
    products/
    schemas/
    scraping/
    services/
    workers/
  tests/
  alembic.ini
  pyproject.toml
frontend/
  src/
    components/
    hooks/
    layouts/
    pages/
    services/
    types/
    utils/
  package.json
docs/
```

## 4. Database design

All identifiers are UUIDs. Timestamps are UTC. Dynamic facts use MySQL JSON columns while lifecycle data and queryable relationships remain relational.

| Table | Purpose | Important fields |
|---|---|---|
| `users` | Draft ownership and audit actor | email, display_name, is_active |
| `scraping_jobs` | Top-level workflow | user_id, status, URL counters, timestamps, error_summary |
| `scraping_sources` | Per-URL state and fetch metadata | job_id, url, normalized_url, normalized_url_hash, domain, status, HTTP status, method, attempts, error |
| `raw_scraped_products` | Bounded extracted payload, not arbitrary page HTML | source_id, extracted_data JSON, raw_json_ld JSON, content_hash |
| `normalized_product_sources` | Stable normalized research snapshot | source_id, schema_version, product_data JSON |
| `product_source_evidence` | Provenance for selected/candidate facts | job_id, field_path, value JSON, confidence, source_ids JSON |
| `product_conflicts` | Reviewable disagreements | job_id, field_path, values JSON, status, resolution JSON |
| `generated_products` | Editable generated draft | job_id, status, version, product_data JSON, confidence, warnings JSON |
| `generated_product_highlights` | Ordered, frequently edited highlights | product_id, name, value, position |
| `generated_product_images` | Reference/publishability metadata | product_id, URL, source URL, alt, reference_only, position |
| `generated_product_variations` | Structured variants | product_id, name, sku, price fields, attributes JSON |
| `generated_product_packs` | Pack choices | product_id, quantity, label, price fields, metadata JSON |
| `ai_generation_logs` | Reproducibility and cost audit | job_id, product_id, model, prompt_version, token counts, cost, latency, status, error |

Key constraints: unique normalized URL hash per job, one raw and one normalized record per source, versioned generated drafts, cascade only for records wholly owned by their parent job/product, and indexes on statuses/foreign keys/timestamps. The SHA-256 URL hash avoids MySQL index-length limits while the full normalized URL remains stored for inspection.

## 5. API surface

Base path: `/api/v1`.

| Method | Path | Result |
|---|---|---|
| POST | `/product-research/jobs` | Validate URLs, create job, enqueue scraping, return `202` |
| GET | `/product-research/jobs/{job_id}` | Job summary and per-stage progress |
| GET | `/product-research/jobs/{job_id}/sources` | Per-source state and normalized summaries |
| POST | `/product-research/jobs/{job_id}/sources/{source_id}/retry` | Retry one failed source |
| POST | `/product-research/jobs/{job_id}/generate` | Enqueue comparison/generation |
| GET | `/generated-products/{product_id}` | Full editable draft and provenance summary |
| PUT | `/generated-products/{product_id}` | Optimistic-versioned draft update |
| POST | `/generated-products/{product_id}/approve` | Validate and approve reviewed draft |
| POST | `/generated-products/{product_id}/publish` | Publish an approved draft through an adapter |
| GET | `/generated-products/{product_id}/conflicts` | List unresolved/resolved conflicts |
| PUT | `/generated-products/{product_id}/conflicts/{conflict_id}` | Resolve, manually override, or ignore conflict |

Errors use one JSON envelope with a stable code, human-readable message, and optional field details. Authentication is an explicit integration boundary; development may use a seeded user, but ownership checks remain in services.

## 6. Security and reliability

- Resolve hostnames before fetch and after every redirect; reject loopback, private, link-local, multicast, reserved, and cloud metadata destinations for IPv4 and IPv6.
- Permit only HTTP/HTTPS, cap redirects and response bytes, and set connect/read/total timeouts.
- Revalidate DNS on redirects to reduce DNS-rebinding exposure.
- Never execute page scripts in the primary path. Browser fallback runs only when extraction coverage is insufficient.
- Enforce per-domain concurrency/rate limits, honor access restrictions, and do not bypass CAPTCHAs.
- Retry transient failures with exponential backoff and jitter; do not retry permanent 4xx responses except 408/409/425/429.
- Redact credentials, query secrets, and authorization headers from structured logs.
- Competitor images are `reference_only=true` by default.
- Publishing is idempotent and restricted to approved drafts.

## 7. Dependencies

Backend runtime: FastAPI, Uvicorn, Pydantic Settings, SQLAlchemy 2, Alembic, PyMySQL, Celery, Redis, Scrapling, HTTPX, Beautiful Soup/lxml, OpenAI SDK, python-json-logger, and tenacity. Backend tests use pytest, pytest-asyncio, and respx; database integration tests use a separately installed local/test MySQL database.

Frontend runtime: React, Vite, React Router, Axios, Tailwind CSS, TanStack Query, React Hook Form, Zod, and a small accessible component/toast layer. Tests use Vitest, Testing Library, and Playwright for critical flows.

Infrastructure: locally installed MySQL 8.0+ and Redis 7+, with API and workers run as normal host processes. Environment-specific secrets are supplied outside source control. Docker is not part of the project.

## 8. Delivery phases

1. Architecture and contracts (this document).
2. Backend/frontend scaffold, database models, and migrations.
3. Secure fetch, JSON-LD/DOM extraction, and source persistence.
4. Normalization, comparison, conflicts, and evidence.
5. Strict LLM generation and validation.
6. Background workflow, retry, caching, and observability.
7. Research/status UI.
8. Draft review, source viewer, and conflict UI.
9. Approval/publisher integration boundary.
10. Security, failure, build, and end-to-end verification.

## 9. Local environment note

The current machine has Python 3.11 and Node 22. MySQL and Redis command-line tools are not currently available. PowerShell blocks `npm.ps1`; commands can use `npm.cmd` without changing the machine execution policy.
