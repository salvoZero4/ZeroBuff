from app.core.config import settings
from sqlmodel import SQLModel, create_engine

engine = create_engine(
    settings.database_url
    )

def init_db() -> None:
    SQLModel.metadata.create_all(engine)