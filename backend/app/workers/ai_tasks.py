from uuid import UUID

from app.ai.product_generator import DatabaseRoutingProductGenerator
from app.db.session import SessionLocal
from app.models.enums import JobStatus
from app.models.scraping import ScrapingJob
from app.services.product_generation import generate_product_draft, safe_generation_error
from app.workers.celery_app import celery_app


@celery_app.task(name="product_research.generate_product")
def generate_product(job_id: str) -> dict[str, str]:
    with SessionLocal() as session:
        try:
            generator = DatabaseRoutingProductGenerator.from_session(session)
            product = generate_product_draft(session, UUID(job_id), generator)
            return {
                "job_id": job_id,
                "product_id": str(product.id),
                "status": product.status.value,
            }
        except Exception as exc:
            # Remote/configuration failures are terminal for this attempt, not worker crashes.
            # Persist a visible message and leave the research job available for another try.
            session.rollback()
            job = session.get(ScrapingJob, UUID(job_id))
            message = safe_generation_error(exc)
            if job is not None:
                if job.status == JobStatus.ANALYZING:
                    job.status = JobStatus.SCRAPED
                job.error_summary = message
                session.commit()
            return {"job_id": job_id, "status": "failed", "error": message}
