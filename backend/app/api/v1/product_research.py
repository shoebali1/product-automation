from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.models.enums import JobStatus, SourceStatus
from app.schemas.research_job import (
    CreateResearchJobRequest,
    CreateResearchJobResponse,
    ResearchJobDetail,
    ResearchSourceSummary,
)
from app.services.research_jobs import (
    create_research_job,
    get_research_job,
    prepare_source_retry,
    to_job_detail,
    to_source_summary,
)
from app.services.ai_providers import enabled_ai_models
from app.workers.scraping_tasks import scrape_source, start_scraping_job
from app.workers.ai_tasks import generate_product

router = APIRouter(prefix="/product-research", tags=["product research"])


@router.post("/jobs", response_model=CreateResearchJobResponse, status_code=status.HTTP_202_ACCEPTED)
def create_job(
    request: CreateResearchJobRequest,
    response: Response,
    session: Session = Depends(get_db_session),
) -> CreateResearchJobResponse:
    job = create_research_job(session, request)
    try:
        start_scraping_job.delay(str(job.id), request.force_refresh)
    except Exception:
        job.status = JobStatus.FAILED
        job.error_summary = "The background worker could not be reached."
        session.commit()
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return CreateResearchJobResponse(
        job_id=job.id,
        submitted_urls=len(request.urls),
        unique_urls=job.total_urls,
        status=job.status,
    )


@router.get("/jobs/{job_id}", response_model=ResearchJobDetail)
def get_job(job_id: UUID, session: Session = Depends(get_db_session)) -> ResearchJobDetail:
    job = get_research_job(session, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Research job was not found")
    return to_job_detail(job)


@router.get("/jobs/{job_id}/sources", response_model=list[ResearchSourceSummary])
def get_sources(
    job_id: UUID, session: Session = Depends(get_db_session)
) -> list[ResearchSourceSummary]:
    job = get_research_job(session, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Research job was not found")
    return [to_source_summary(source) for source in job.sources]


@router.post("/jobs/{job_id}/generate", status_code=status.HTTP_202_ACCEPTED)
def generate_job_product(
    job_id: UUID,
    session: Session = Depends(get_db_session),
) -> dict[str, str]:
    job = get_research_job(session, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Research job was not found")
    if job.status not in {JobStatus.SCRAPED, JobStatus.DRAFT, JobStatus.REVIEW_REQUIRED}:
        raise HTTPException(status_code=409, detail="Research job is not ready for generation")
    if not enabled_ai_models(session):
        raise HTTPException(
            status_code=409,
            detail=(
                "No enabled AI model with a configured API key is available. "
                "Enable a provider and model in AI Providers first."
            ),
        )
    previous_status = job.status
    job.status = JobStatus.ANALYZING
    session.commit()
    try:
        generate_product.delay(str(job.id))
    except Exception as exc:
        job.status = previous_status
        session.commit()
        raise HTTPException(
            status_code=503, detail="The background worker could not be reached."
        ) from exc
    return {"job_id": str(job.id), "status": "ANALYZING_QUEUED"}


@router.post(
    "/jobs/{job_id}/sources/{source_id}/retry",
    response_model=ResearchSourceSummary,
    status_code=status.HTTP_202_ACCEPTED,
)
def retry_source(
    job_id: UUID,
    source_id: UUID,
    session: Session = Depends(get_db_session),
) -> ResearchSourceSummary:
    job = get_research_job(session, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Research job was not found")
    source = next((item for item in job.sources if item.id == source_id), None)
    if source is None:
        raise HTTPException(status_code=404, detail="Research source was not found")
    if source.status != SourceStatus.FAILED:
        raise HTTPException(status_code=409, detail="Only failed sources can be retried")
    prepare_source_retry(job, source)
    session.commit()
    try:
        scrape_source.delay(str(source.id), True)
    except Exception as exc:
        source.status = SourceStatus.FAILED
        source.error = "The background worker could not be reached."
        session.commit()
        raise HTTPException(status_code=503, detail=source.error) from exc
    return to_source_summary(source)
