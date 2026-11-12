from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlmodel import Session


def commit_with_http_error_handling(
    session: Session, conflict_detail: str = "Conflict"
) -> None:
    """Commit and map database errors to the project's HTTP conventions."""
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, conflict_detail)
    except OperationalError:
        session.rollback()
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Database unavailable"
        )
