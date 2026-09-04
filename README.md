# Product Research and Catalog Automation

A full-stack product research, AI catalog generation, human review, and publishing system. The application accepts product URLs, extracts structured evidence from multiple sources, compares conflicting facts, generates a schema-validated SEO catalog record, and provides an admin interface for review before publishing to Surginatal.

## Contents

- [Core capabilities](#core-capabilities)
- [System architecture](#system-architecture)
- [Complete product workflow](#complete-product-workflow)
- [AI content and SEO standards](#ai-content-and-seo-standards)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment configuration](#environment-configuration)
- [Installation](#installation)
- [Running the application](#running-the-application)
- [Using the application](#using-the-application)
- [API reference](#api-reference)
- [Database model](#database-model)
- [Testing and verification](#testing-and-verification)
- [Security and operational behavior](#security-and-operational-behavior)
- [Troubleshooting](#troubleshooting)

## Core capabilities

- Submit between 1 and 10 product URLs in one research job.
- Normalize URLs, remove tracking parameters, reject duplicates, and block unsafe network destinations.
- Scrape sources independently with retry support and browser fallback.
- Extract JSON-LD, DOM product data, specifications, pricing, images, variations, and packs.
- Store raw extraction separately from normalized product evidence.
- Compare multiple sources and calculate field-level confidence.
- Detect factual conflicts and preserve their supporting source IDs.
- Generate strict structured product data through configurable AI providers and models.
- Apply Surginatal category, subcategory, and brand taxonomy IDs.
- Generate human-quality, evidence-grounded SEO catalog content.
- Validate AI output and provide one automatic repair attempt when quality rules fail.
- Review and edit product content through a complete admin form.
- Select category, subcategory, and brand from linked dropdowns.
- Preview local images, edit image titles and alt text, and choose a primary image.
- Save drafts locally without publishing them.
- Approve reviewed records only after required conflicts are resolved.
- Submit the final product and binary images to Surginatal through a secure backend integration.

## System architecture

```text
Browser / React admin (5173)
          |
          | HTTP / JSON / multipart
          v
FastAPI application (8010)
          |
          +-------------------> MySQL
          |                     jobs, evidence, drafts, configuration
          |
          +-------------------> Redis
          |                     Celery broker and result backend
          |
          +-------------------> Celery worker
          |                     scraping, comparison, AI generation
          |
          +-------------------> Configured AI provider
          |                     structured product generation
          |
          +-------------------> Surginatal APIs
                                taxonomy and product submission
```

The browser never receives Surginatal credentials. It sends publishing data to the local FastAPI backend, which reads the remote URL, API key, and bearer token from `.env` and performs the server-to-server request.

### Main components

| Component | Responsibility |
|---|---|
| React and Vite | Research, progress, catalog, review, AI provider, and publishing UI |
| FastAPI | API validation, product lifecycle, taxonomy access, and secure publishing proxy |
| Celery | Long-running scraping and AI generation outside request processing |
| Redis | Celery message broker and task result backend |
| MySQL | Durable jobs, sources, evidence, conflicts, products, and AI audit data |
| Scraping layer | Safe HTTP fetching, structured extraction, browser fallback, and normalization |
| AI layer | Provider routing, strict structured output, evidence validation, SEO validation, and repair |
| Surginatal integration | Taxonomy lookup and multipart product/image submission |

## Complete product workflow

### 1. Create a research job

The user submits one or more public HTTP or HTTPS product URLs from `/research`.

The API immediately:

1. validates each URL;
2. normalizes it and removes known tracking parameters;
3. removes duplicate URLs;
4. creates a job and its source records;
5. queues background scraping; and
6. returns `202 Accepted` with a job ID and `PENDING` status.

`202 Accepted` means the task was successfully queued. It does not mean scraping has already completed.

### 2. Scrape and normalize sources

The Celery worker processes each URL independently. One failed source does not discard successful sources.

For each source, the application can collect:

- product identity and title;
- brand, manufacturer, model, SKU, GTIN, and product codes;
- category and subcategory;
- descriptions, features, benefits, instructions, and precautions;
- technical specifications and measurements;
- MRP, sale price, currency, and GST;
- image URLs and source metadata;
- selectable variations such as size, colour, model, or capacity; and
- purchasable pack configurations.

The original bounded extraction and normalized product snapshot are stored separately for traceability.

### 3. Compare evidence

After source processing, the application compares normalized facts across sources. It produces:

- selected values;
- alternative values;
- supporting source IDs;
- confidence levels; and
- conflicts requiring review.

Source authority, exact product identity, model, size, pack, and configuration are considered before conflicting values are combined.

### 4. Generate the product draft

When at least one source succeeds, the user can select **Generate draft**. The job enters `ANALYZING` while the worker:

1. sends normalized research—not arbitrary page HTML—to the configured AI model;
2. requests the `PRODUCT_ANALYSIS_V6_FINAL` structured catalog schema;
3. injects deterministic evidence, taxonomy IDs, images, variations, and packs;
4. rejects unsupported factual claims and sensitive medical claims;
5. validates SEO lengths, content richness, keyword duplication, and description HTML; and
6. gives the model one repair attempt when validation fails.

The resulting product is stored as `DRAFT` or `REVIEW_REQUIRED`.

### 5. Review and edit

The product review screen contains:

- consumer product title and B2B title;
- image gallery, local image selection, primary image selection, title, and alt text;
- highlights and full rich-text description;
- variations and packs;
- MRP, selling price, currency, and GST;
- quantity, step-up quantity, pieces, stock, and sales count;
- consumer and business SEO metadata;
- active, stock, delivery, COD, prescription, customization, return, and liquid flags;
- slug, rack ID, SKU, and GTIN;
- Surginatal category, subcategory, and brand dropdowns; and
- related product IDs.

**Save changes** updates only the local draft. It does not create or publish a Surginatal product.

Draft updates use optimistic versioning. If a newer version already exists, the API returns a conflict instead of silently overwriting it.

### 6. Resolve conflicts

Required factual conflicts must be resolved before approval. A reviewer can:

- accept one of the source-supported values;
- enter a manual value with an evidence note; or
- ignore a conflict when appropriate.

Approved and published products are immutable in the current workflow.

### 7. Approve

Approval confirms that the draft has passed human review. The application blocks approval while required conflicts remain open.

State transition:

```text
DRAFT or REVIEW_REQUIRED -> APPROVED
```

### 8. Publish to Surginatal

The **Publish product** action runs in this order:

1. Build the exact Surginatal multipart product payload.
2. Download stored product image URLs as validated binary image files.
3. Attach locally selected image files.
4. Send matching image titles, alt text, and the primary image index.
5. Add the configured `X-API-Key` and bearer token server-side.
6. Submit the product to the Surginatal product-add URL configured in `.env`.
7. Store the returned Surginatal numeric product ID in the product data.
8. Mark the approved local product as `PUBLISHED`.

If Surginatal submission fails, local publication does not continue. The product remains approved so the operation can be retried safely.

On later submissions, the stored Surginatal product ID is included when supported by the remote contract to avoid accidentally creating an unrelated duplicate.

## Product lifecycle

```text
PENDING
   -> SCRAPING
   -> SCRAPED
   -> ANALYZING
   -> DRAFT or REVIEW_REQUIRED
   -> APPROVED
   -> PUBLISHED

Any processing stage may become FAILED when no safe recovery is available.
```

Source records use their own lifecycle:

```text
PENDING -> PROCESSING -> COMPLETED
                      -> FAILED -> retry
```

## AI content and SEO standards

The current V6 prompt and generation validator prioritize accuracy before completeness or SEO. The model must not invent missing product facts merely to reach a word target.

### Generated content standards

| Field | Target behavior |
|---|---|
| Product title | Search-friendly brand, model, product type, and verified differentiator without repetition |
| Business title | Distinct B2B title emphasizing pack, capacity, compatibility, or procurement information |
| Slug | Concise lowercase, hyphen-separated product identity |
| Highlights | 8–12 meaningful fact-and-value pairs when evidence is rich enough |
| Short description | 80–120 words when evidence supports the target |
| Long description | 400–500 visible words when evidence supports the target |
| Description HTML | Properly nested `h2`, `h3`, `p`, `ul`, `ol`, `li`, and `strong` elements without attributes |
| Benefits | Verified feature connected to practical value without unsupported medical outcomes |
| Instructions | Ordered, evidence-supported steps without invented clinical directions |
| Precautions | Verified operating, safety, storage, cleaning, maintenance, and handling guidance |
| Meta title | 50–60 characters |
| Meta description | 140–160 characters |
| Meta keywords | 8–15 focused, unique search terms |
| Business metadata | Non-empty and distinct from consumer metadata |
| Image metadata | Unique, readable title and alt text without URLs or keyword stuffing |

For rich evidence, missing word counts, required description sections, insufficient highlights, invalid HTML, invalid metadata lengths, or duplicate keywords trigger the generation repair attempt. For sparse evidence, lower content-length requirements are relaxed so the model does not fabricate details. Maximum lengths and core SEO rules still apply.

## Project structure

```text
product-automation/
├── backend/
│   ├── alembic/                 # Database migrations
│   ├── app/
│   │   ├── ai/                  # Prompts, routing, validation, generation
│   │   ├── api/v1/              # FastAPI routes
│   │   ├── core/                # Settings and application configuration
│   │   ├── db/                  # SQLAlchemy session and base classes
│   │   ├── models/              # Relational database models
│   │   ├── products/            # Comparison and product-quality logic
│   │   ├── publishing/          # Local publishing abstraction
│   │   ├── schemas/             # Pydantic request/output contracts
│   │   ├── scraping/            # URL safety, clients, extraction, normalization
│   │   ├── services/            # Workflow and integration services
│   │   └── workers/             # Celery application and tasks
│   ├── tests/                   # Backend unit and service tests
│   ├── alembic.ini
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── services/
│   ├── package.json
│   └── vite.config.js
├── docs/
│   └── architecture.md
├── .env.example
├── run.py                       # Unified local launcher
└── README.md
```

## Prerequisites

- Windows, macOS, or Linux
- Python 3.11 or newer
- Node.js 22 or newer
- MySQL 8 or newer
- Redis 7 or newer
- An AI provider API key or configured provider/model in the admin UI
- Surginatal credentials when remote publishing is required

The current Windows launcher automatically uses `--pool=solo` for Celery compatibility.

## Environment configuration

Create the local environment file from the example:

```powershell
Copy-Item .env.example .env
```

Never commit `.env`. It contains database credentials, AI keys, encryption material, and remote publishing credentials.

### Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `APP_ENV` | Yes | Runtime environment name |
| `DATABASE_URL` | Yes | SQLAlchemy MySQL connection URL |
| `REDIS_URL` | Yes | Celery broker and result backend |
| `OPENAI_API_KEY` | Conditional | Default OpenAI credential when database provider routing is not used |
| `OPENAI_MODEL` | Yes | Default model identifier |
| `AI_CREDENTIAL_ENCRYPTION_KEY` | Recommended | Encryption key for credentials saved through AI provider administration |
| `FRONTEND_ORIGIN` | Yes | Primary allowed frontend origin |
| `SURGINATAL_API_URL` | Yes | Surginatal taxonomy endpoint |
| `SURGINATAL_API_KEY` | Conditional | Taxonomy API credential |
| `SURGINATAL_PRODUCT_ADD_URL` | For publishing | Surginatal product submission endpoint; keep it in `.env`, not source code |
| `SURGINATAL_ADMIN_API_KEY` | For publishing | Server-side `X-API-Key` for product submission |
| `SURGINATAL_ADMIN_TOKEN` | For publishing | Server-side bearer token; either raw token or `Bearer ...` is accepted |
| `SURGINATAL_SUBMISSION_TIMEOUT_SECONDS` | No | Remote publishing timeout; defaults to 60 seconds |

The product submission URL, API key, and token are intentionally blank in `.env.example`. Configure their real values only in the local `.env` file.

## Installation

Run these commands from the repository root.

### 1. Install backend packages

```powershell
python -m pip install -e ".\backend[scraping,dev]"
```

For runtime packages without development tools:

```powershell
python -m pip install -e ".\backend[scraping]"
```

### 2. Install frontend packages

```powershell
npm.cmd install --prefix frontend
```

Use `npm` instead of `npm.cmd` on macOS or Linux.

### 3. Prepare MySQL

Create the database and application user represented by `DATABASE_URL`. For the default example configuration, the database name is `product_automation`.

Use a strong password outside local development and grant only the permissions required by the application.

### 4. Start Redis

Redis must be reachable at `REDIS_URL` before the Celery worker starts.

### 5. Apply migrations

```powershell
Set-Location backend
python -m alembic upgrade head
Set-Location ..
```

`python run.py` also applies pending migrations before starting services.

## Running the application

### Start everything

From the repository root:

```powershell
python run.py
```

This starts:

- FastAPI on port `8010`;
- a Celery worker connected to Redis; and
- Vite on port `5173`.

It also applies database migrations before startup.

Stop all launched processes with `Ctrl+C` in the launcher terminal.

### Useful launcher options

```powershell
python run.py --no-worker
python run.py --no-reload
python run.py --host 0.0.0.0 --api-port 8010 --frontend-port 5173
```

Do not use `--no-worker` for research or AI generation. API requests can create jobs, but background processing cannot progress without a Celery worker.

### Run components separately

API:

```powershell
Set-Location backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload
```

Worker:

```powershell
Set-Location backend
python -m celery -A app.workers.celery_app:celery_app worker --loglevel=info --pool=solo
```

Frontend:

```powershell
Set-Location frontend
npm.cmd run dev -- --host 0.0.0.0 --port 5173
```

Use a separate terminal for each component.

## Accessing the application

### On the same computer

- Frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8010`
- API documentation: `http://127.0.0.1:8010/docs`
- Health check: `http://127.0.0.1:8010/health`

### From another device on the same network

1. Start the project with host `0.0.0.0`.
2. Run `ipconfig` on Windows and locate the computer's active IPv4 address.
3. Open `http://<computer-ip>:5173` on the other device.
4. Allow inbound TCP ports `5173` and `8010` through the Windows firewall for the private network profile.
5. Confirm both devices are on the same LAN and client isolation is disabled on the router/access point.

Do not use `127.0.0.1` from another device. It always refers to that device itself.

The development frontend automatically calls port `8010` on the same hostname used to open the frontend. For example, opening the UI through a LAN IP makes API requests through that LAN IP rather than `localhost`.

## Using the application

### Research

Open `/research`, enter product URLs, and select **Analyze products**. The application navigates to the job page and shows live workflow stages.

### Job progress

The job page polls active jobs approximately every two seconds. It displays source progress, successful and failed URLs, workflow stages, retry controls, and the **Generate draft** action when scraping is complete.

### Product catalog

Open `/catalog` or `/products` to view generated products grouped by review, approved, and published states.

### Product review

Open `/products/{product_id}` to review product content, quality context, conflicts, images, taxonomy, pricing, inventory, identifiers, and SEO metadata.

### AI providers

Open `/admin/ai` to configure supported providers, encrypted API keys, models, route priority, JSON-schema support, token limits, temperature, and model connectivity tests.

Restart the Celery worker after changing code-level prompts or generation validation. Existing generated drafts do not automatically regenerate when the prompt changes.

## API reference

Base path: `/api/v1`

### Research jobs

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/product-research/jobs` | Create and queue a research job |
| `GET` | `/product-research/jobs/{job_id}` | Read job state, stage progress, and latest product ID |
| `GET` | `/product-research/jobs/{job_id}/sources` | List individual source state and normalized summaries |
| `POST` | `/product-research/jobs/{job_id}/generate` | Queue AI comparison and product generation |
| `POST` | `/product-research/jobs/{job_id}/sources/{source_id}/retry` | Retry one failed source |

### Generated products

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/generated-products` | List products with optional status filtering |
| `GET` | `/generated-products/taxonomy/options` | Return Surginatal category/subcategory/brand options |
| `GET` | `/generated-products/{product_id}` | Read the complete product and quality context |
| `PUT` | `/generated-products/{product_id}` | Save an editable, versioned draft |
| `POST` | `/generated-products/{product_id}/approve` | Approve a reviewed product |
| `POST` | `/generated-products/{product_id}/surginatal` | Submit product fields and image files through the secure integration |
| `POST` | `/generated-products/{product_id}/publish` | Complete the approved local publishing transition |
| `GET` | `/generated-products/{product_id}/conflicts` | List product conflicts |
| `PUT` | `/generated-products/{product_id}/conflicts/{conflict_id}` | Resolve, override, or ignore a conflict |

The frontend **Publish product** action calls the Surginatal submission route first and the local publish route only after successful remote submission.

### AI administration

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/admin/ai/providers` | List configured AI providers and models |
| `PUT` | `/admin/ai/providers/{provider_id}` | Update provider settings or credentials |
| `POST` | `/admin/ai/providers/{provider_id}/models` | Add a provider model |
| `PUT` | `/admin/ai/models/{model_id}` | Update a model route |
| `DELETE` | `/admin/ai/models/{model_id}` | Remove a model route |
| `POST` | `/admin/ai/models/{model_id}/test` | Test provider/model connectivity |

## Database model

| Table | Stores |
|---|---|
| `users` | Product/job ownership information |
| `scraping_jobs` | Overall workflow state and URL counters |
| `scraping_sources` | Individual URL state, attempts, method, and errors |
| `raw_scraped_products` | Bounded raw extraction and JSON-LD |
| `normalized_product_sources` | Stable normalized product source records |
| `product_source_evidence` | Selected/candidate field values and source IDs |
| `product_conflicts` | Conflicting facts and review resolution |
| `generated_products` | Versioned product JSON, status, confidence, and warnings |
| `generated_product_highlights` | Ordered structured highlights |
| `generated_product_images` | Product image references and metadata |
| `generated_product_variations` | Selectable product variants |
| `generated_product_packs` | Purchasable quantity configurations |
| `ai_providers` | AI provider configuration and encrypted credentials |
| `ai_models` | Provider model routes and generation settings |
| `ai_generation_logs` | Prompt version, model, token, cost, status, and product audit data |

Database changes must be made through Alembic migrations. Avoid manually dropping or truncating tables in shared or production environments.

## Testing and verification

### Run all backend tests

```powershell
Set-Location backend
python -m pytest
```

### Run focused tests

```powershell
python -m pytest tests\test_product_generator.py tests\test_prompts.py
python -m pytest tests\test_surginatal.py tests\test_surginatal_submission.py
```

### Run backend linting

Install development dependencies, then run:

```powershell
Set-Location backend
python -m ruff check app tests
```

### Build the frontend

```powershell
Set-Location frontend
npm.cmd run build
```

The repository currently has 86 passing backend tests. The exact count can grow as coverage is added; the important condition is that the suite completes without failures.

## Security and operational behavior

- Only HTTP and HTTPS source URLs are accepted.
- Hostnames are resolved before requests and redirects are revalidated.
- Loopback, private, link-local, multicast, reserved, and cloud metadata destinations are blocked.
- Fetches use bounded redirects, response limits, and timeouts.
- Source failures are isolated and transient failures use controlled retry behavior.
- Competitor/scraped images remain marked `reference_only` in generated evidence. Review image rights before remote publication.
- AI credentials saved through provider administration are encrypted and never returned to the frontend.
- Surginatal product credentials remain in backend `.env` and are never included in frontend bundles.
- The browser calls the local backend during publishing; the remote server-to-server request does not appear as a separate browser Network entry.
- Remote image URLs are validated again before the backend downloads and forwards their binary content.
- Individual submitted images are limited to 15 MB and total submitted image content is limited to 60 MB.
- Unsupported AI facts and sensitive claims are rejected before a generated draft is accepted.
- Approval and publication are separate lifecycle actions.

For production, restrict CORS to known frontend origins, use TLS, rotate credentials, protect admin routes with authentication/authorization, run workers under a process supervisor, and use managed MySQL/Redis backups and monitoring.

## Troubleshooting

### `ngrok` is not recognized

Ngrok is not installed or its executable is not on `PATH`. Ngrok is not required for devices on the same network. Use the computer's LAN IPv4 address with ports `5173` and `8010` instead.

### Another LAN device cannot open the frontend

- Confirm the project was started with `--host 0.0.0.0`.
- Confirm the URL uses the server computer's current IPv4 address.
- Allow ports `5173` and `8010` through the private-network firewall.
- Confirm both devices use the same network.
- Check router client/AP isolation.

### Frontend calls port 5173 for `/api`

Restart the Vite development server and hard-refresh the page. In development, the configured API service should call port `8010` using the same hostname as the browser page. A Vite proxy remains available for relative `/api` requests.

### Research request returns `202 Accepted` but nothing progresses

`202` means queued. Check:

- Redis is running and matches `REDIS_URL`;
- the Celery worker is running;
- the worker terminal for connection or task errors; and
- the job status/source errors in the UI.

### Product generation fails after a repair attempt

The AI output failed schema, factual, HTML, content-length, or SEO validation twice. Review worker logs, verify the selected model supports the required structured output, increase the model token limit if necessary, and make sure the source evidence contains enough product detail.

### Save changes returns a version conflict

The draft changed after the page loaded. Refresh the product to load the latest version, reapply the intended edit, and save again.

### Publishing returns a credential configuration error

Set all required Surginatal publishing values in `.env`, then restart the FastAPI backend. Do not place credentials in React source files or `VITE_` variables.

### Publishing returns `400` while parsing multipart data

Hard-refresh the frontend to load the current bundle. The browser must generate the multipart content boundary automatically. The product request always includes form fields even when no new local image is selected.

### Publishing returns `502`

The local backend accepted the browser request but could not complete the Surginatal server-to-server operation. Read the JSON `detail`, then verify:

- product-add URL configuration;
- API key and bearer token;
- remote authentication permissions;
- selected category, subcategory, and brand IDs;
- remote image availability and content type; and
- remote API response details in backend logs.

### Prompt changes do not affect an existing draft

Prompt changes apply only to newly generated product drafts. Restart the Celery worker after changing prompt or generation code, then create or regenerate a draft.

## Additional architecture documentation

See [docs/architecture.md](docs/architecture.md) for lower-level architecture, data storage, security, and delivery notes.

