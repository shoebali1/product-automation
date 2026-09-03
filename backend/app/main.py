from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.generated_products import router as generated_products_router
from app.api.v1.admin_ai import router as admin_ai_router
from app.api.v1.product_research import router as product_research_router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(product_research_router, prefix="/api/v1")
    app.include_router(generated_products_router, prefix="/api/v1")
    app.include_router(admin_ai_router, prefix="/api/v1")

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
