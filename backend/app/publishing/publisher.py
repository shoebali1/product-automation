from dataclasses import dataclass
from typing import Protocol

from app.schemas.generated_product import GeneratedProductData


@dataclass(frozen=True)
class PublishResult:
    external_id: str


class Publisher(Protocol):
    def publish(
        self,
        product: GeneratedProductData,
        *,
        idempotency_key: str,
    ) -> PublishResult: ...


class LocalCatalogPublisher:
    """Safe default adapter until a remote commerce connector is configured."""

    def publish(
        self,
        product: GeneratedProductData,
        *,
        idempotency_key: str,
    ) -> PublishResult:
        del product
        return PublishResult(external_id=f"local:{idempotency_key}")


_publisher = LocalCatalogPublisher()


def get_publisher() -> Publisher:
    return _publisher
