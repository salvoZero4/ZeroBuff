from typing import Annotated
from sqlmodel import Session
from fastapi import Depends
from app.db import get_session

#Common dependency to get a database session for API endpoints
sessionDep = Annotated[Session, Depends(get_session)]