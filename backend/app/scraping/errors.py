class ScrapingError(RuntimeError):
    retryable = False


class TransientScrapingError(ScrapingError):
    retryable = True


class PermanentScrapingError(ScrapingError):
    pass

