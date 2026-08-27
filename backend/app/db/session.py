from app.db.engine import engine
from sqlmodel import Session

def get_session():
    with Session(engine) as session:
        try:
            yield session
        finally:
            session.close()