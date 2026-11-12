from typing import Annotated

from fastapi import Depends
from sqlmodel import Session

from app.db.engine import engine


def get_session():
    with Session(engine) as session:
        try:
            yield session
        finally:
            session.close()


sessionDep = Annotated[Session, Depends(get_session)]
